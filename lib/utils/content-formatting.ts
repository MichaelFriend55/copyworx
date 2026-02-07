/**
 * @file lib/utils/content-formatting.ts
 * @description Utilities for sanitizing and processing HTML output from Claude API
 * 
 * Claude now outputs HTML directly, so we just need to:
 * - Sanitize for security (remove scripts, event handlers)
 * - Validate structure
 * - Handle edge cases
 */

import { logger } from './logger';

/**
 * Sanitize HTML from Claude
 * Removes potentially dangerous content while preserving formatting
 * 
 * @param html - Raw HTML from Claude
 * @returns Sanitized HTML safe for TipTap editor
 */
export function sanitizeGeneratedHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    logger.warn('⚠️ sanitizeGeneratedHTML received invalid input:', html);
    return '<p>Error: No content generated</p>';
  }
  
  // Remove script tags and dangerous content
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // Remove inline event handlers like onclick
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // REMOVE EXCESSIVE WHITESPACE BETWEEN TAGS
  // This prevents double or triple spacing between paragraphs
  cleaned = cleaned.replace(/>\s+</g, '><');
  
  // Trim overall whitespace
  cleaned = cleaned.trim();
  
  // If content doesn't start with HTML tag, wrap it
  if (cleaned && !cleaned.startsWith('<')) {
    cleaned = `<p>${cleaned}</p>`;
  }
  
  // Validate it's not empty after sanitization
  if (!cleaned || cleaned.trim().length === 0) {
    logger.error('❌ Content was empty after sanitization');
    return '<p>Error: Generated content was empty</p>';
  }
  
  logger.log('✅ HTML sanitized:', {
    originalLength: html.length,
    cleanedLength: cleaned.length,
    hasParagraphs: cleaned.includes('<p>'),
    hasHeadings: cleaned.includes('<h'),
    hasLists: cleaned.includes('<ul>'),
    hasBold: cleaned.includes('<strong>'),
  });
  
  return cleaned;
}

/**
 * Process HTML for email templates
 * Ensures Subject: line is properly formatted as heading
 * 
 * @param html - HTML from Claude (email template)
 * @returns Processed HTML with Subject line as heading
 */
export function processEmailHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    logger.warn('⚠️ processEmailHTML received invalid input:', html);
    return '<p>Error: No content generated</p>';
  }
  
  let processed = html;
  
  // Check if Subject: line exists as plain text (not already wrapped in heading)
  const subjectMatch = processed.match(/^Subject:\s*(.+?)(?:<|$)/m);
  
  if (subjectMatch && !processed.includes('<h3>Subject:')) {
    const subject = subjectMatch[1].trim();
    processed = processed.replace(
      /^Subject:\s*.+?$/m,
      `<h3>Subject: ${subject}</h3>`
    );
    logger.log('📧 Email subject converted to heading:', subject.substring(0, 50));
  }
  
  return sanitizeGeneratedHTML(processed);
}

/**
 * Process HTML for email sequence templates
 * Ensures proper formatting and visual separation between multiple emails
 * 
 * @param html - HTML from Claude (email sequence)
 * @returns Processed HTML with proper email separators and styling
 */
export function processEmailSequenceHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    logger.warn('⚠️ processEmailSequenceHTML received invalid input:', html);
    return '<p>Error: No content generated</p>';
  }
  
  let processed = html;
  
  // Count emails in the sequence for logging
  const emailCount = (processed.match(/═══\s*EMAIL\s*\d+/gi) || []).length;
  logger.log(`📧 Processing email sequence with ${emailCount} emails`);
  
  // Ensure horizontal rules are properly formatted for TipTap
  // TipTap uses <hr> tags which render as horizontal dividers
  processed = processed.replace(/<hr\s*\/?>/gi, '<hr>');
  
  // Add visual spacing around email headers if they exist as plain text
  // Pattern: === EMAIL X of Y: TITLE ===
  processed = processed.replace(
    /═{3,}\s*(EMAIL\s*\d+[^═]*?)═{3,}/gi,
    (match, content) => {
      // Keep it as-is if already in h2 tags, otherwise the h2 should handle it
      return match;
    }
  );
  
  // Ensure all Subject: lines are h3 headings
  processed = processed.replace(
    /<p>\s*Subject:\s*([^<]+)<\/p>/gi,
    '<h3>Subject: $1</h3>'
  );
  
  // Also handle Subject: that may be wrapped directly (not in p tags)
  processed = processed.replace(
    /(?<![<h3>])Subject:\s*([^\n<]+)(?=\n|<)/gi,
    (match, subject) => {
      // Only replace if not already in an h3
      if (!match.includes('<h3>')) {
        return `<h3>Subject: ${subject.trim()}</h3>`;
      }
      return match;
    }
  );
  
  return sanitizeGeneratedHTML(processed);
}

/**
 * Check if content appears to be an email sequence (multiple emails)
 * 
 * @param html - HTML content to check
 * @returns True if content contains multiple email markers
 */
export function isEmailSequence(html: string): boolean {
  if (!html) return false;
  
  // Check for email sequence markers (EMAIL 1, EMAIL 2, etc.)
  const emailMarkers = html.match(/EMAIL\s*\d+/gi);
  return emailMarkers !== null && emailMarkers.length > 1;
}

/**
 * Main entry point for formatting generated content
 * Routes to appropriate processor based on content type
 * 
 * @param html - HTML from Claude API
 * @param isEmail - Whether this is email content (single email)
 * @returns Sanitized and processed HTML
 */
export function formatGeneratedContent(html: string, isEmail: boolean = false): string {
  try {
    let processed: string;
    
    // Auto-detect email sequences (multiple emails in one generation)
    if (isEmailSequence(html)) {
      logger.log('📧 Detected email sequence, using sequence processor');
      processed = processEmailSequenceHTML(html);
    } else if (isEmail) {
      processed = processEmailHTML(html);
    } else {
      processed = sanitizeGeneratedHTML(html);
    }
    
    // Validate result
    if (!processed || processed.trim().length === 0) {
      throw new Error('Empty content after processing');
    }
    
    return processed;
    
  } catch (error) {
    logger.error('❌ Error processing generated content:', error);
    
    // Fallback: Basic paragraph wrapping
    const fallback = html
      .split(/\n\n+/)
      .map(para => para.trim())
      .filter(Boolean)
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('');
    
    return fallback || '<p>Error: Unable to process generated content</p>';
  }
}

/**
 * Strip HTML tags for plain text display
 * Useful for previews or character counting
 * 
 * @param html - HTML string
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Copy HTML content to clipboard with both text/html and text/plain MIME types
 * 
 * This ensures that pasting into rich text editors (like TipTap) renders
 * proper formatting (bold, headings, bullets, etc.) instead of raw HTML tags.
 * Plain text editors receive a clean, tag-free fallback.
 * 
 * @param html - HTML string to copy (e.g. AI-generated result)
 * @returns Promise that resolves to true on success, false on failure
 * 
 * @example
 * ```ts
 * const success = await copyFormattedHtmlToClipboard('<p><strong>Bold text</strong></p>');
 * if (success) {
 *   // User can now paste with formatting preserved
 * }
 * ```
 */
export async function copyFormattedHtmlToClipboard(html: string): Promise<boolean> {
  if (!html || typeof html !== 'string') {
    logger.warn('⚠️ copyFormattedHtmlToClipboard: No content to copy');
    return false;
  }

  try {
    // Sanitize the HTML for safe clipboard content
    const sanitizedHtml = sanitizeGeneratedHTML(html);
    
    // Generate plain text fallback by stripping HTML tags
    const plainText = stripHtml(sanitizedHtml);

    // Use the Clipboard API with both MIME types so rich text editors
    // pick up text/html and plain text editors fall back to text/plain
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([sanitizedHtml], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      }),
    ]);

    logger.log('✅ Copied to clipboard with HTML formatting:', {
      htmlLength: sanitizedHtml.length,
      plainTextLength: plainText.length,
    });

    return true;
  } catch (error) {
    logger.error('❌ Failed to copy formatted HTML to clipboard:', error);

    // Fallback: try writeText with plain text if ClipboardItem is unsupported
    try {
      const plainText = stripHtml(html);
      await navigator.clipboard.writeText(plainText);
      logger.warn('⚠️ Fell back to plain text clipboard copy');
      return true;
    } catch (fallbackError) {
      logger.error('❌ Fallback clipboard copy also failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Count words in text (strips HTML first)
 * 
 * @param text - Text or HTML to count
 * @returns Word count
 */
export function countWords(text: string): number {
  const plain = stripHtml(text);
  return plain.trim().split(/\s+/).filter(Boolean).length;
}
