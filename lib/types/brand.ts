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

// ============================================================================
// Optimize Alignment Types
// ============================================================================

/**
 * Type of alignment optimization
 */
export type OptimizeAlignmentType = 'persona' | 'brand';

/**
 * Analysis results used for optimization context
 */
export interface OptimizeAnalysisContext {
  /** Alignment score from analysis */
  score: number;
  /** Assessment summary */
  assessment: string;
  /** Strengths/matches to preserve */
  strengths: string[];
  /** Issues/violations to fix */
  issues: string[];
  /** Recommendations to implement */
  recommendations: string[];
}

/**
 * Persona context for optimization
 */
export interface OptimizePersonaContext {
  name: string;
  demographics?: string;
  psychographics?: string;
  painPoints?: string;
  goals?: string;
}

/**
 * Brand context for optimization
 */
export interface OptimizeBrandContext {
  brandName: string;
  brandTone?: string;
  missionStatement?: string;
  brandValues?: string[];
  approvedPhrases?: string[];
  forbiddenWords?: string[];
}

/**
 * Request body for optimize alignment API
 */
export interface OptimizeAlignmentRequest {
  /** Original copy text to rewrite */
  text: string;
  /** Type of alignment optimization */
  type: OptimizeAlignmentType;
  /** Analysis results for context */
  analysisContext: OptimizeAnalysisContext;
  /** Persona context (required if type is 'persona') */
  personaContext?: OptimizePersonaContext;
  /** Brand context (required if type is 'brand') */
  brandContext?: OptimizeBrandContext;
}

/**
 * Response from optimize alignment API
 */
export interface OptimizeAlignmentResponse {
  /** Rewritten copy optimized for alignment */
  rewrittenText: string;
  /** Brief summary of changes made */
  changesSummary: string[];
  /** Original text length */
  originalLength: number;
  /** New text length */
  newLength: number;
  /** Target name (persona or brand) */
  targetName: string;
}
