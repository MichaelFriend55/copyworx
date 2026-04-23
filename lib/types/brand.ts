/**
 * @file lib/types/brand.ts
 * @description TypeScript types for Brand Voice feature
 */

/**
 * Brand Voice configuration interface
 */
export interface BrandVoice {
  /** Brand name (required) */
  brandName: string;
  
  /** Description of brand tone and personality */
  brandTone: string;
  
  /** List of approved phrases that align with brand voice */
  approvedPhrases: string[];
  
  /** List of forbidden words/phrases to avoid */
  forbiddenWords: string[];
  
  /** Core brand values */
  brandValues: string[];
  
  /** Mission statement */
  missionStatement: string;

  /**
   * Writing Samples — 0 to 5 pieces of existing brand copy.
   *
   * Each entry is a non-empty string of at least 20 characters (validated on
   * write). Samples are injected into every AI prompt that uses this brand
   * voice; the model learns voice from examples more reliably than from
   * abstract rules. An empty array is valid and means "no samples provided".
   */
  writing_samples: string[];

  /** Timestamp when saved */
  savedAt?: Date;
}

