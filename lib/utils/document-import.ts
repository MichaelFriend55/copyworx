/**
 * @file lib/utils/document-import.ts
 * @description Document import utilities for Plain Text, Markdown, and Word Document formats
 * 
 * Features:
 * - Import .txt (plain text) files into TipTap editor with preserved line breaks
 * - Import .md (Markdown) files with full formatting conversion via markdown-it
 * - Import .docx (Word Document) files with formatting preservation via mammoth
 * - File validation and error handling
 * 
 * Dependencies:
 * - mammoth: DOCX to HTML conversion (for .docx files)
 * - markdown-it: Markdown to HTML parsing (for .md files)
 * 
 * Formatting Preserved:
 * - Headings (H1-H6)
 * - Bold, italic, underline, strikethrough
 * - Ordered and unordered lists (including nested)
 * - Links
 * - Code blocks and inline code
 * - Blockquotes
 * - Text alignment (from Word documents)
 * - Paragraph spacing and line breaks
 */

'use client';

import type { Editor } from '@tiptap/react';
import MarkdownIt from 'markdown-it';

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
// Markdown Parser Instance
// ============================================================================

/**
 * Configured markdown-it instance for parsing Markdown to HTML
 * 
 * Configuration:
 * - html: true - Allow HTML tags in source (passthrough)
 * - breaks: true - Convert \n to <br> in paragraphs
 * - linkify: true - Auto-convert URL-like text to links
 */
const markdownParser = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true, // Smart quotes, dashes, etc.
});

// ============================================================================
// Markdown to HTML Conversion
// ============================================================================

/**
 * Convert Markdown to HTML using markdown-it parser
 * 
 * Supports all standard Markdown features:
 * - Headings (# ## ### etc.)
 * - Bold (**text** or __text__)
 * - Italic (*text* or _text_)
 * - Strikethrough (~~text~~)
 * - Links [text](url)
 * - Unordered lists (- or * or +)
 * - Ordered lists (1. 2. 3.)
 * - Nested lists
 * - Blockquotes (>)
 * - Code blocks (``` or indented)
 * - Inline code (`code`)
 * - Horizontal rules (--- or ***)
 * 
 * @param markdown - Markdown content
 * @returns HTML content compatible with TipTap editor
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Normalize line endings (CRLF → LF)
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Parse markdown to HTML
  let html = markdownParser.render(normalized);

  // Post-process: Convert <del> to <s> for TipTap strikethrough compatibility
  // (markdown-it uses <del> by default, TipTap expects <s>)
  html = html.replace(/<del>/g, '<s>').replace(/<\/del>/g, '</s>');

  // Post-process: Ensure empty paragraphs are preserved
  html = html.replace(/<p><\/p>/g, '<p>&nbsp;</p>');

  return html.trim();
}

// ============================================================================
// Plain Text Conversion
// ============================================================================

/**
 * Convert plain text to HTML with preserved formatting
 * 
 * Preserves:
 * - Paragraph breaks (double newlines)
 * - Single line breaks (converted to <br>)
 * - Leading/trailing whitespace within paragraphs
 * 
 * Handles:
 * - Windows line endings (CRLF → LF)
 * - Mac Classic line endings (CR → LF)
 * - Multiple consecutive blank lines (collapsed to single paragraph break)
 * 
 * @param plainText - Plain text content
 * @returns HTML content with paragraphs
 */
export function plainTextToHtml(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') {
    return '';
  }

  // Step 1: Normalize line endings (CRLF → LF, CR → LF)
  const normalized = plainText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 2: Split by double line breaks (paragraphs)
  // Using \n\n+ to collapse multiple blank lines as requested
  const paragraphs = normalized.split(/\n\n+/);

  // Step 3: Convert each paragraph
  const htmlParagraphs = paragraphs.map(paragraph => {
    // Trim the paragraph but preserve internal formatting
    const trimmed = paragraph.trim();
    
    // Handle empty paragraphs (shouldn't happen after split, but safe guard)
    if (!trimmed) {
      return '';
    }

    // Escape HTML special characters for safety
    const escaped = escapeHtml(trimmed);

    // Convert single newlines within paragraph to <br>
    const withBreaks = escaped.replace(/\n/g, '<br>');

    return `<p>${withBreaks}</p>`;
  });

  // Filter out empty strings and join
  return htmlParagraphs.filter(p => p.length > 0).join('\n');
}

/**
 * Escape HTML special characters to prevent XSS and ensure proper rendering
 * 
 * @param text - Raw text to escape
 * @returns Text with HTML entities escaped
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

// ============================================================================
// DOCX Conversion
// ============================================================================

/**
 * Style mapping for mammoth DOCX conversion
 * Maps Word styles to HTML elements with proper formatting
 * 
 * Key mappings:
 * - Headings: Word heading styles → HTML h1-h6
 * - Text formatting: bold, italic, underline, strikethrough
 * - Alignment: Center/Right aligned paragraphs get CSS classes
 */
const MAMMOTH_STYLE_MAP = [
  // Heading mappings (various Word style names)
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  
  // Text formatting (explicit run-level formatting)
  "b => strong",
  "i => em",
  "u => u",              // Preserve underline (mammoth ignores by default)
  "strike => s",         // Strikethrough
  
  // Alignment classes (used with transforms below)
  "p[style-name='Center'] => p.text-center:fresh",
  "p[style-name='Right'] => p.text-right:fresh",
  "p[style-name='Justify'] => p.text-justify:fresh",
];

/**
 * Convert DOCX to HTML using mammoth with full formatting preservation
 * 
 * Preserves:
 * - Headings (H1-H6)
 * - Bold, italic, underline, strikethrough
 * - Ordered and unordered lists
 * - Text alignment (center, right, justify)
 * - Links
 * - Tables
 * 
 * Does NOT preserve (by design):
 * - Images (as requested)
 * - Exact font sizes/colors (mammoth limitation)
 * - Page margins/layout
 * 
 * @param arrayBuffer - DOCX file content as ArrayBuffer
 * @returns Promise<string> - HTML content compatible with TipTap
 */
export async function docxToHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamically import mammoth to avoid SSR issues
    const mammoth = await import('mammoth');
    
    // Access transforms helper (not in TypeScript types but exists at runtime)
    // The transforms API exists at runtime but isn't in @types/mammoth
    const mammothWithTransforms = mammoth as unknown as MammothWithTransforms;
    
    // Build transform function if transforms helper is available
    let transformDocument: ((element: unknown) => unknown) | undefined;
    
    if (mammothWithTransforms.transforms?.paragraph) {
      // Use mammoth's transform helper to capture alignment
      transformDocument = mammothWithTransforms.transforms.paragraph(
        (paragraph: MammothParagraph) => {
          // Check paragraph alignment and assign style names for CSS class mapping
          if (paragraph.alignment === 'center' && !paragraph.styleName) {
            return { ...paragraph, styleName: 'Center' };
          }
          if (paragraph.alignment === 'right' && !paragraph.styleName) {
            return { ...paragraph, styleName: 'Right' };
          }
          if (paragraph.alignment === 'both' && !paragraph.styleName) {
            // 'both' is justify in Word
            return { ...paragraph, styleName: 'Justify' };
          }
          return paragraph;
        }
      );
    }
    
    // Configure mammoth options for maximum formatting preservation
    const options: Parameters<typeof mammoth.convertToHtml>[1] = {
      styleMap: MAMMOTH_STYLE_MAP,
      
      // Transform document for alignment (if available)
      ...(transformDocument && { transformDocument }),
      
      // Ignore images as requested
      convertImage: mammoth.images.imgElement(() => {
        // Return empty to skip images
        return Promise.resolve({ src: '' });
      }),
    };
    
    // Convert DOCX to HTML
    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    
    if (result.messages && result.messages.length > 0) {
      // Log warnings but don't fail (e.g., unsupported features)
      console.warn('⚠️ DOCX conversion warnings:', result.messages);
    }
    
    // Post-process: Convert alignment classes to TipTap-compatible format
    let html = result.value;
    
    // TipTap's TextAlign extension uses data attributes, but inline styles work too
    // Convert our classes to inline styles for TipTap compatibility
    html = html.replace(/class="text-center"/g, 'style="text-align: center"');
    html = html.replace(/class="text-right"/g, 'style="text-align: right"');
    html = html.replace(/class="text-justify"/g, 'style="text-align: justify"');
    
    // Remove empty image tags that were skipped
    html = html.replace(/<img[^>]*src=""[^>]*>/g, '');
    
    return html;
  } catch (error) {
    console.error('❌ Error converting DOCX to HTML:', error);
    throw new Error('Failed to convert Word document. The file may be corrupted or in an unsupported format.');
  }
}

/**
 * Extended mammoth type that includes the transforms helper
 * The transforms API exists at runtime but isn't in @types/mammoth
 */
interface MammothWithTransforms {
  transforms?: {
    paragraph: (fn: (p: MammothParagraph) => MammothParagraph) => (element: unknown) => unknown;
  };
}

/**
 * Mammoth paragraph type for transform function
 * Simplified type for the paragraph properties we use
 */
interface MammothParagraph {
  alignment?: 'left' | 'center' | 'right' | 'both';
  styleName?: string;
  [key: string]: unknown;
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
