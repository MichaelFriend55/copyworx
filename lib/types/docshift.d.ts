/**
 * @file lib/types/docshift.d.ts
 * @description Type declarations for the docshift module
 * 
 * DocShift is a client-side library for converting between HTML and DOCX formats.
 * @see https://github.com/ducbao414/docshift
 */

declare module 'docshift' {
  /**
   * Convert HTML content to DOCX format
   * 
   * @param html - HTML string to convert
   * @returns Promise<Blob> - The DOCX file as a Blob
   */
  export function toDocx(html: string): Promise<Blob>;

  /**
   * Convert DOCX file to HTML format
   * 
   * @param docx - DOCX file as Blob or ArrayBuffer
   * @returns Promise<string> - The HTML string
   */
  export function toHtml(docx: Blob | ArrayBuffer): Promise<string>;
}
