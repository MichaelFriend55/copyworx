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
  
  /** Timestamp when saved */
  savedAt?: Date;
}

/**
 * Brand alignment check result
 */
export interface BrandAlignmentResult {
  /** Overall alignment score (0-100) */
  score: number;
  
  /** Overall assessment text */
  assessment: string;
  
  /** What matches brand voice well */
  matches: string[];
  
  /** What violates brand voice */
  violations: string[];
  
  /** Specific recommendations for improvement */
  recommendations: string[];
}

/**
 * Brand alignment check request
 */
export interface BrandAlignmentRequest {
  /** Text to check */
  text: string;
  
  /** Brand voice configuration */
  brandVoice: BrandVoice;
}

/**
 * Brand alignment check response
 */
export interface BrandAlignmentResponse {
  result: BrandAlignmentResult;
  textLength: number;
  /** Brand name that was analyzed against */
  brandName: string;
}
