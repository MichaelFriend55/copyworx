/**
 * @file lib/utils/document-export.ts
 * @description Document export utilities for Plain Text, Markdown, and Word Document formats
 * 
 * Features:
 * - Export TipTap editor content to .txt (plain text)
 * - Export TipTap editor content to .md (Markdown)
 * - Export TipTap editor content to .docx (Word Document)
 * - Sanitized filenames with special character handling
 * - Browser download trigger functionality
 * 
 * Dependencies:
 * - turndown: HTML to Markdown conversion
 * - docshift: HTML to DOCX conversion (client-side)
 */

'use client';

import type { Editor } from '@tiptap/react';
import TurndownService from 'turndown';

// ============================================================================
// Types
// ============================================================================

/**
 * Export format types supported by the application
 */
export type ExportFormat = 'txt' | 'md' | 'docx';

/**
 * Export result containing success status and optional error message
 */
export interface ExportResult {
  success: boolean;
  error?: string;
  filename?: string;
}

/**
 * Export options for customizing export behavior
 */
export interface ExportOptions {
  /** Custom filename (without extension) */
  filename?: string;
  /** Fallback filename if none provided */
  fallbackFilename?: string;
}

// ============================================================================
// Filename Utilities
// ============================================================================

/**
 * Sanitize a filename by removing or replacing invalid characters
 * 
 * Handles:
 * - Control characters
 * - File system reserved characters (/ \ : * ? " < > |)
 * - Leading/trailing whitespace and dots
 * - Empty strings (returns fallback)
 * 
 * @param filename - Raw filename string
 * @param fallback - Fallback name if sanitization results in empty string
 * @returns Sanitized filename safe for most file systems
 */
export function sanitizeFilename(
  filename: string,
  fallback: string = 'Untitled Document'
): string {
  if (!filename || typeof filename !== 'string') {
    return fallback;
  }

  // Remove control characters and file system reserved characters
  let sanitized = filename
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Control characters
    .replace(/[/\\:*?"<>|]/g, '-')        // File system reserved
    .replace(/\s+/g, ' ')                  // Multiple spaces to single
    .trim();

  // Remove leading/trailing dots (invalid on Windows)
  sanitized = sanitized.replace(/^\.+|\.+$/g, '');

  // Limit length (most file systems have 255 char limit)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200).trim();
  }

  // Return fallback if empty after sanitization
  return sanitized || fallback;
}

/**
 * Generate a timestamped filename for exports
 * 
 * @param baseName - Base name for the file
 * @param extension - File extension (without dot)
 * @returns Formatted filename with timestamp
 */
export function generateExportFilename(
  baseName: string,
  extension: ExportFormat
): string {
  const sanitized = sanitizeFilename(baseName);
  return `${sanitized}.${extension}`;
}

// ============================================================================
// Browser Download Utilities
// ============================================================================

/**
 * Trigger a browser download for a Blob
 * 
 * @param blob - File content as Blob
 * @param filename - Filename for download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Create object URL for the blob
  const url = URL.createObjectURL(blob);

  // Create temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to body, click, and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke object URL to free memory
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Download text content as a file
 * 
 * @param content - Text content to download
 * @param filename - Filename for download
 * @param mimeType - MIME type for the file (default: text/plain)
 */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  downloadBlob(blob, filename);
}

// ============================================================================
// Content Extraction
// ============================================================================

/**
 * Get plain text content from TipTap editor
 * Preserves paragraph structure with double line breaks
 * 
 * @param editor - TipTap editor instance
 * @returns Plain text content with preserved paragraph structure
 */
export function getPlainTextFromEditor(editor: Editor): string {
  if (!editor) {
    return '';
  }

  // TipTap's getText method with block separator
  // This preserves paragraph breaks as double newlines
  const text = editor.getText({ blockSeparator: '\n\n' });
  
  // Clean up excessive whitespace while preserving paragraph breaks
  return text
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .join('\n\n');
}

/**
 * Get HTML content from TipTap editor
 * 
 * @param editor - TipTap editor instance
 * @returns HTML content string
 */
export function getHTMLFromEditor(editor: Editor): string {
  if (!editor) {
    return '';
  }

  return editor.getHTML();
}

/**
 * Check if editor has meaningful content (not just empty paragraphs)
 * 
 * @param editor - TipTap editor instance
 * @returns True if editor has content
 */
export function hasEditorContent(editor: Editor): boolean {
  if (!editor) {
    return false;
  }

  const text = editor.getText().trim();
  return text.length > 0;
}

// ============================================================================
// Markdown Conversion
// ============================================================================

/**
 * Configure Turndown service with appropriate options for TipTap HTML
 */
function createTurndownService(): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx',           // Use # for headings
    bulletListMarker: '-',          // Use - for bullet lists
    codeBlockStyle: 'fenced',       // Use ``` for code blocks
    emDelimiter: '*',               // Use * for italics
    strongDelimiter: '**',          // Use ** for bold
    linkStyle: 'inlined',           // Use inline links [text](url)
    hr: '---',                      // Use --- for horizontal rules
  });

  // Add rule for underline (TipTap uses <u> tag)
  // Markdown doesn't have native underline, use emphasis as fallback
  turndownService.addRule('underline', {
    filter: ['u'],
    replacement: function(content) {
      return `_${content}_`;
    }
  });

  // Add rule for text alignment (preserve as comment)
  turndownService.addRule('textAlign', {
    filter: function(node) {
      const style = node.getAttribute && node.getAttribute('style');
      return !!style && style.includes('text-align');
    },
    replacement: function(content, node) {
      // Just return content without alignment (Markdown doesn't support alignment)
      return content;
    }
  });

  // Add rule for highlight/mark
  turndownService.addRule('highlight', {
    filter: ['mark'],
    replacement: function(content) {
      return `==${content}==`;
    }
  });

  // Add rule for strikethrough
  turndownService.addRule('strikethrough', {
    filter: ['s', 'del'],
    replacement: function(content) {
      return `~~${content}~~`;
    }
  });

  return turndownService;
}

/**
 * Convert HTML content to Markdown format
 * 
 * Preserves:
 * - Headings (#, ##, ###)
 * - Bold (**text**)
 * - Italic (*text*)
 * - Strikethrough (~~text~~)
 * - Links [text](url)
 * - Lists (bullet and numbered)
 * - Code blocks
 * 
 * @param html - HTML content to convert
 * @returns Markdown formatted string
 */
export function htmlToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const turndownService = createTurndownService();
  
  try {
    const markdown = turndownService.turndown(html);
    
    // Clean up excessive blank lines
    return markdown
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (error) {
    console.error('❌ Error converting HTML to Markdown:', error);
    throw new Error('Failed to convert document to Markdown format');
  }
}

// ============================================================================
// DOCX Conversion
// ============================================================================

/**
 * Convert HTML content to DOCX format using DocShift
 * 
 * Preserves:
 * - Fonts, colors, sizes
 * - Bold, italic, underline
 * - Headings (H1, H2, H3)
 * - Lists (bullet and numbered)
 * - Text alignment
 * 
 * @param html - HTML content to convert
 * @returns Promise<Blob> - DOCX file as Blob
 */
export async function htmlToDocx(html: string): Promise<Blob> {
  if (!html || typeof html !== 'string') {
    throw new Error('No content to export');
  }

  try {
    // Dynamically import DocShift to avoid SSR issues
    const { toDocx } = await import('docshift');

    // Wrap HTML in proper document structure for better conversion
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
    }
    h1 { font-size: 24pt; font-weight: bold; margin-bottom: 12pt; }
    h2 { font-size: 18pt; font-weight: bold; margin-bottom: 10pt; }
    h3 { font-size: 14pt; font-weight: bold; margin-bottom: 8pt; }
    p { margin-bottom: 8pt; }
    ul, ol { margin-left: 20pt; margin-bottom: 8pt; }
    li { margin-bottom: 4pt; }
  </style>
</head>
<body>
${html}
</body>
</html>
    `.trim();

    // Convert to DOCX
    const docxBlob = await toDocx(fullHtml);
    
    return docxBlob;
  } catch (error) {
    console.error('❌ Error converting HTML to DOCX:', error);
    throw new Error('Failed to create Word document. Please try again.');
  }
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export editor content as Plain Text (.txt)
 * 
 * @param editor - TipTap editor instance
 * @param documentTitle - Document title for filename
 * @returns ExportResult with success status
 */
export async function exportToPlainText(
  editor: Editor,
  documentTitle?: string
): Promise<ExportResult> {
  try {
    // Validate editor has content
    if (!hasEditorContent(editor)) {
      return {
        success: false,
        error: 'Document is empty. Add some content before exporting.',
      };
    }

    // Get plain text content
    const plainText = getPlainTextFromEditor(editor);

    // Generate filename
    const filename = generateExportFilename(
      documentTitle || 'Untitled Document',
      'txt'
    );

    // Download file
    downloadTextFile(plainText, filename, 'text/plain');

    console.log('✅ Exported to Plain Text:', filename);
    
    return {
      success: true,
      filename,
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to export as Plain Text';
    
    console.error('❌ Plain Text export error:', error);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Export editor content as Markdown (.md)
 * 
 * @param editor - TipTap editor instance
 * @param documentTitle - Document title for filename
 * @returns ExportResult with success status
 */
export async function exportToMarkdown(
  editor: Editor,
  documentTitle?: string
): Promise<ExportResult> {
  try {
    // Validate editor has content
    if (!hasEditorContent(editor)) {
      return {
        success: false,
        error: 'Document is empty. Add some content before exporting.',
      };
    }

    // Get HTML and convert to Markdown
    const html = getHTMLFromEditor(editor);
    const markdown = htmlToMarkdown(html);

    // Generate filename
    const filename = generateExportFilename(
      documentTitle || 'Untitled Document',
      'md'
    );

    // Download file
    downloadTextFile(markdown, filename, 'text/markdown');

    console.log('✅ Exported to Markdown:', filename);
    
    return {
      success: true,
      filename,
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to export as Markdown';
    
    console.error('❌ Markdown export error:', error);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Export editor content as Word Document (.docx)
 * 
 * @param editor - TipTap editor instance
 * @param documentTitle - Document title for filename
 * @returns ExportResult with success status
 */
export async function exportToDocx(
  editor: Editor,
  documentTitle?: string
): Promise<ExportResult> {
  try {
    // Validate editor has content
    if (!hasEditorContent(editor)) {
      return {
        success: false,
        error: 'Document is empty. Add some content before exporting.',
      };
    }

    // Get HTML content
    const html = getHTMLFromEditor(editor);

    // Convert to DOCX (async operation)
    const docxBlob = await htmlToDocx(html);

    // Generate filename
    const filename = generateExportFilename(
      documentTitle || 'Untitled Document',
      'docx'
    );

    // Download file
    downloadBlob(docxBlob, filename);

    console.log('✅ Exported to Word Document:', filename);
    
    return {
      success: true,
      filename,
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to export as Word Document';
    
    console.error('❌ DOCX export error:', error);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Export document in specified format
 * Unified export function that dispatches to format-specific handlers
 * 
 * @param editor - TipTap editor instance
 * @param format - Export format ('txt', 'md', 'docx')
 * @param documentTitle - Document title for filename
 * @returns ExportResult with success status
 */
export async function exportDocument(
  editor: Editor,
  format: ExportFormat,
  documentTitle?: string
): Promise<ExportResult> {
  if (!editor) {
    return {
      success: false,
      error: 'No editor instance available',
    };
  }

  switch (format) {
    case 'txt':
      return exportToPlainText(editor, documentTitle);
    case 'md':
      return exportToMarkdown(editor, documentTitle);
    case 'docx':
      return exportToDocx(editor, documentTitle);
    default:
      return {
        success: false,
        error: `Unsupported export format: ${format}`,
      };
  }
}
