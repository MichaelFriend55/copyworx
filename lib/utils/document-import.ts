/**
 * @file lib/utils/document-import.ts
 * @description Document import utilities for Plain Text, Markdown, and Word Document formats
 * 
 * Features:
 * - Import .txt (plain text) files into TipTap editor
 * - Import .md (Markdown) files and convert to HTML
 * - Import .docx (Word Document) files and convert to HTML
 * - File validation and error handling
 * 
 * Dependencies:
 * - mammoth: DOCX to HTML conversion (for .docx files)
 */

'use client';

import type { Editor } from '@tiptap/react';

// ============================================================================
// Types
// ============================================================================

/**
 * Import format types supported by the application
 */
export type ImportFormat = 'txt' | 'md' | 'docx';

/**
 * Import result containing success status and optional error message
 */
export interface ImportResult {
  success: boolean;
  error?: string;
  format?: ImportFormat;
}

// ============================================================================
// File Reading Utilities
// ============================================================================

/**
 * Read a file as text
 * 
 * @param file - File object to read
 * @returns Promise<string> - File content as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Read a file as ArrayBuffer (for binary files like .docx)
 * 
 * @param file - File object to read
 * @returns Promise<ArrayBuffer> - File content as ArrayBuffer
 */
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result;
      if (content instanceof ArrayBuffer) {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================================
// File Validation
// ============================================================================

/**
 * Validate file type and size
 * 
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types or extensions
 * @param maxSizeMB - Maximum file size in megabytes (default: 10MB)
 * @returns Error message if invalid, null if valid
 */
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSizeMB: number = 10
): string | null {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size exceeds ${maxSizeMB}MB limit`;
  }

  // Check file type
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
  
  const isValidType = allowedTypes.some(type => {
    if (type.startsWith('.')) {
      return fileExtension === type;
    }
    return file.type === type;
  });

  if (!isValidType) {
    return `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`;
  }

  return null;
}

// ============================================================================
// Markdown to HTML Conversion
// ============================================================================

/**
 * Convert Markdown to HTML
 * This is a simple conversion - for production, consider using marked.js or similar
 * 
 * @param markdown - Markdown content
 * @returns HTML content
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let html = markdown;

  // Convert headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Convert italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Convert strikethrough
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert unordered lists
  html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Convert ordered lists
  html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');

  // Convert paragraphs (double line breaks)
  const paragraphs = html.split('\n\n');
  html = paragraphs
    .map(p => {
      // Don't wrap if it's already wrapped in a block element
      if (p.match(/^<(h[1-6]|ul|ol|li)/)) {
        return p;
      }
      // Wrap in paragraph tag
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

// ============================================================================
// Plain Text Conversion
// ============================================================================

/**
 * Convert plain text to HTML with preserved formatting
 * 
 * @param plainText - Plain text content
 * @returns HTML content with paragraphs
 */
export function plainTextToHtml(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') {
    return '';
  }

  // Split by double line breaks (paragraphs)
  const paragraphs = plainText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Wrap each paragraph in <p> tags
  return paragraphs
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

// ============================================================================
// DOCX Conversion
// ============================================================================

/**
 * Convert DOCX to HTML using mammoth
 * 
 * @param arrayBuffer - DOCX file content as ArrayBuffer
 * @returns Promise<string> - HTML content
 */
export async function docxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamically import mammoth to avoid SSR issues
    const mammoth = await import('mammoth');
    
    // Convert DOCX to HTML
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    if (result.messages && result.messages.length > 0) {
      console.warn('⚠️ DOCX conversion warnings:', result.messages);
    }
    
    return result.value;
  } catch (error) {
    console.error('❌ Error converting DOCX to HTML:', error);
    throw new Error('Failed to convert Word document. The file may be corrupted or in an unsupported format.');
  }
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Import plain text file into editor
 * 
 * @param editor - TipTap editor instance
 * @param file - File object to import
 * @returns ImportResult with success status
 */
export async function importPlainText(
  editor: Editor,
  file: File
): Promise<ImportResult> {
  try {
    // Validate file
    const validationError = validateFile(file, ['.txt', 'text/plain']);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    // Read file content
    const plainText = await readFileAsText(file);

    if (!plainText.trim()) {
      return {
        success: false,
        error: 'File is empty',
      };
    }

    // Convert to HTML
    const html = plainTextToHtml(plainText);

    // Insert into editor (replaces current content)
    editor.commands.setContent(html);

    console.log('✅ Imported plain text file:', file.name);

    return {
      success: true,
      format: 'txt',
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to import plain text file';
    
    console.error('❌ Plain text import error:', error);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Import Markdown file into editor
 * 
 * @param editor - TipTap editor instance
 * @param file - File object to import
 * @returns ImportResult with success status
 */
export async function importMarkdown(
  editor: Editor,
  file: File
): Promise<ImportResult> {
  try {
    // Validate file
    const validationError = validateFile(file, ['.md', 'text/markdown', 'text/x-markdown']);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    // Read file content
    const markdown = await readFileAsText(file);

    if (!markdown.trim()) {
      return {
        success: false,
        error: 'File is empty',
      };
    }

    // Convert Markdown to HTML
    const html = markdownToHtml(markdown);

    // Insert into editor (replaces current content)
    editor.commands.setContent(html);

    console.log('✅ Imported Markdown file:', file.name);

    return {
      success: true,
      format: 'md',
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to import Markdown file';
    
    console.error('❌ Markdown import error:', error);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Import Word Document (.docx) into editor
 * 
 * @param editor - TipTap editor instance
 * @param file - File object to import
 * @returns ImportResult with success status
 */
export async function importDocx(
  editor: Editor,
  file: File
): Promise<ImportResult> {
  try {
    // Validate file
    const validationError = validateFile(file, [
      '.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);

    // Convert DOCX to HTML
    const html = await docxToHtml(arrayBuffer);

    if (!html.trim()) {
      return {
        success: false,
        error: 'File appears to be empty',
      };
    }

    // Insert into editor (replaces current content)
    editor.commands.setContent(html);

    console.log('✅ Imported Word Document:', file.name);

    return {
      success: true,
      format: 'docx',
    };
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to import Word Document';
    
    console.error('❌ DOCX import error:', error);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Import document in any supported format
 * Unified import function that dispatches to format-specific handlers
 * 
 * @param editor - TipTap editor instance
 * @param file - File object to import
 * @returns ImportResult with success status
 */
export async function importDocument(
  editor: Editor,
  file: File
): Promise<ImportResult> {
  if (!editor) {
    return {
      success: false,
      error: 'No editor instance available',
    };
  }

  if (!file) {
    return {
      success: false,
      error: 'No file selected',
    };
  }

  // Determine file type by extension
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.txt')) {
    return importPlainText(editor, file);
  } else if (fileName.endsWith('.md')) {
    return importMarkdown(editor, file);
  } else if (fileName.endsWith('.docx')) {
    return importDocx(editor, file);
  } else {
    return {
      success: false,
      error: 'Unsupported file type. Please use .txt, .md, or .docx files.',
    };
  }
}
