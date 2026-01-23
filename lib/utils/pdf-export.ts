/**
 * @file lib/utils/pdf-export.ts
 * @description PDF export utilities for setting document title and filename
 * 
 * When window.print() is called, browsers use the HTML <title> tag
 * as the default filename for "Save as PDF". This utility helps
 * set the title dynamically based on document name.
 */

/**
 * Sanitize a string for use as a filename
 * - Removes or replaces invalid filename characters
 * - Limits length to reasonable size
 * - Handles edge cases
 * 
 * @param title - The document title to sanitize
 * @returns Sanitized filename (without extension)
 * 
 * @example
 * sanitizeFilename("CoffeeWorx Coffee Brochure") => "CoffeeWorx-Coffee-Brochure"
 * sanitizeFilename("My Doc (v2)") => "My-Doc-v2"
 * sanitizeFilename("") => "untitled"
 */
export function sanitizeFilename(title: string): string {
  if (!title || title.trim() === '') {
    return 'untitled';
  }

  return title
    .trim()
    // Replace special characters with hyphens
    .replace(/[^a-zA-Z0-9\s-]/g, '-')
    // Replace multiple spaces with single hyphen
    .replace(/\s+/g, '-')
    // Replace multiple hyphens with single hyphen
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50)
    // Remove trailing hyphen if truncation created one
    .replace(/-+$/, '')
    // If empty after sanitization, use fallback
    || 'untitled';
}

/**
 * Set document title for PDF export
 * Temporarily changes the HTML <title> tag to control PDF filename
 * 
 * @param documentTitle - The document title to use for PDF filename
 * @returns Cleanup function to restore original title
 * 
 * @example
 * const restore = setDocumentTitleForPDF("My Document");
 * window.print();
 * restore(); // Call after print dialog opens
 */
export function setDocumentTitleForPDF(documentTitle?: string): () => void {
  // Save original title
  const originalTitle = document.title;
  
  // Set new title (sanitized)
  const newTitle = documentTitle 
    ? sanitizeFilename(documentTitle)
    : 'document';
  
  document.title = newTitle;
  
  // Return cleanup function to restore original title
  return () => {
    document.title = originalTitle;
  };
}

/**
 * Execute window.print() with proper document title
 * Sets the document title, opens print dialog, then restores original title
 * 
 * @param documentTitle - Optional document title for PDF filename
 * 
 * @example
 * printWithTitle("CoffeeWorx Brochure");
 * // Opens print dialog with filename "CoffeeWorx-Brochure.pdf"
 */
export function printWithTitle(documentTitle?: string): void {
  // Set document title
  const restore = setDocumentTitleForPDF(documentTitle);
  
  // Open print dialog
  window.print();
  
  // Restore original title after a short delay
  // This allows the browser to capture the new title for the PDF
  setTimeout(restore, 100);
}
