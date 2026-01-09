/**
 * @file lib/utils/content-formatting.ts
 * @description Utilities for sanitizing and processing HTML output from Claude API
 * 
 * Claude now outputs HTML directly, so we just need to:
 * - Sanitize for security (remove scripts, event handlers)
 * - Validate structure
 * - Handle edge cases
 */

/**
 * Sanitize HTML from Claude
 * Removes potentially dangerous content while preserving formatting
 * 
 * @param html - Raw HTML from Claude
 * @returns Sanitized HTML safe for TipTap editor
 */
export function sanitizeGeneratedHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    console.warn('⚠️ sanitizeGeneratedHTML received invalid input:', html);
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
    console.error('❌ Content was empty after sanitization');
    return '<p>Error: Generated content was empty</p>';
  }
  
  console.log('✅ HTML sanitized:', {
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
    console.warn('⚠️ processEmailHTML received invalid input:', html);
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
    console.log('📧 Email subject converted to heading:', subject.substring(0, 50));
  }
  
  return sanitizeGeneratedHTML(processed);
}

/**
 * Main entry point for formatting generated content
 * Routes to appropriate processor based on content type
 * 
 * @param html - HTML from Claude API
 * @param isEmail - Whether this is email content
 * @returns Sanitized and processed HTML
 */
export function formatGeneratedContent(html: string, isEmail: boolean = false): string {
  try {
    const processed = isEmail ? processEmailHTML(html) : sanitizeGeneratedHTML(html);
    
    // Validate result
    if (!processed || processed.trim().length === 0) {
      throw new Error('Empty content after processing');
    }
    
    return processed;
    
  } catch (error) {
    console.error('❌ Error processing generated content:', error);
    
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
 * Count words in text (strips HTML first)
 * 
 * @param text - Text or HTML to count
 * @returns Word count
 */
export function countWords(text: string): number {
  const plain = stripHtml(text);
  return plain.trim().split(/\s+/).filter(Boolean).length;
}
