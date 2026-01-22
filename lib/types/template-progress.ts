/**
 * @file lib/types/template-progress.ts
 * @description TypeScript type definitions for multi-section template progress tracking
 * 
 * Used to persist progress across sessions for complex templates like
 * multi-section brochures that generate content section by section.
 */

/**
 * Section status for tracking completion
 */
export type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'modified';

/**
 * Individual section definition within a multi-section template
 */
export interface TemplateSection {
  /** Unique section identifier (e.g., 'cover', 'hero', 'solutions') */
  id: string;
  
  /** Display name (e.g., 'Cover/Title', 'Hero/Introduction/Benefits') */
  name: string;
  
  /** Form fields specific to this section */
  fields: TemplateSectionField[];
  
  /** Optional description shown to user */
  description?: string;
}

/**
 * Field definition for section forms
 * Extends the base template field with section-specific options
 */
export interface TemplateSectionField {
  /** Unique field identifier within the section */
  id: string;
  
  /** Human-readable label */
  label: string;
  
  /** Field input type */
  type: 'text' | 'textarea' | 'select' | 'number';
  
  /** Placeholder text for input */
  placeholder?: string;
  
  /** Helper text shown below field */
  helperText?: string;
  
  /** Whether field is required */
  required: boolean;
  
  /** Maximum character length (for text/textarea) */
  maxLength?: number;
  
  /** Options for select fields */
  options?: string[];
  
  /** Conditional visibility based on another field's value */
  conditionalOn?: {
    fieldId: string;
    value: string | string[];
  };
}

/**
 * Completed section with stored data and generated content
 */
export interface CompletedSection {
  /** Section ID */
  sectionId: string;
  
  /** Form data submitted for this section */
  formData: Record<string, string>;
  
  /** Generated content for this section */
  generatedContent: string;
  
  /** Timestamp when section was completed */
  completedAt: string;
  
  /** Whether user manually edited the generated content */
  wasModified: boolean;
  
  /** Content hash to detect manual edits */
  contentHash?: string;
}

/**
 * Template progress state stored in document
 * Tracks multi-section template generation progress
 */
export interface TemplateProgress {
  /** Template identifier (e.g., 'brochure-multi-section') */
  templateId: string;
  
  /** Current section index (0-based) */
  currentSection: number;
  
  /** Total number of sections */
  totalSections: number;
  
  /** Array of completed section IDs (in order of completion) */
  completedSections: string[];
  
  /** Detailed data for each completed section */
  sectionData: Record<string, CompletedSection>;
  
  /** Whether the entire template is complete */
  isComplete: boolean;
  
  /** Timestamp when template was started */
  startedAt: string;
  
  /** Timestamp when template was completed (if isComplete) */
  completedAt?: string;
  
  /** Brand voice enabled for this template session */
  applyBrandVoice?: boolean;
  
  /** Selected persona ID for this template session */
  selectedPersonaId?: string;
}

/**
 * Multi-section template definition
 * Extended template type for sequential section generation
 */
export interface MultiSectionTemplate {
  /** Unique template identifier */
  id: string;
  
  /** Template display name */
  name: string;
  
  /** Category (should be 'advanced') */
  category: 'advanced';
  
  /** Template description */
  description: string;
  
  /** Difficulty level */
  complexity: 'Advanced';
  
  /** Estimated time (e.g., '30-45 min') */
  estimatedTime: string;
  
  /** Lucide-react icon name */
  icon: string;
  
  /** Array of sections in order */
  sections: TemplateSection[];
  
  /** Separator to use between sections in final document */
  sectionSeparator: string;
  
  /** System prompt prefix used for all sections */
  systemPromptPrefix: string;
}

/**
 * Section generation request sent to API
 */
export interface SectionGenerationRequest {
  /** Template ID */
  templateId: string;
  
  /** Section ID being generated */
  sectionId: string;
  
  /** Section index (0-based) */
  sectionIndex: number;
  
  /** Form data for this section */
  formData: Record<string, string>;
  
  /** Previous document content for context */
  previousContent?: string;
  
  /** Apply brand voice */
  applyBrandVoice?: boolean;
  
  /** Brand voice data if applying */
  brandVoice?: {
    brandName: string;
    brandTone: string;
    approvedPhrases: string[];
    forbiddenWords: string[];
    brandValues: string[];
    missionStatement: string;
  };
  
  /** Persona data if selected */
  persona?: {
    name: string;
    demographics: string;
    psychographics: string;
    painPoints: string;
    languagePatterns: string;
    goals: string;
  };
}

/**
 * Section generation response from API
 */
export interface SectionGenerationResponse {
  /** Generated section content */
  generatedContent: string;
  
  /** Section ID */
  sectionId: string;
  
  /** Metadata about generation */
  metadata?: {
    textLength: number;
    sectionName: string;
    brandVoiceApplied: boolean;
    personaUsed: boolean;
  };
}

/**
 * Type guard to check if templateProgress is valid
 */
export function isValidTemplateProgress(value: unknown): value is TemplateProgress {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.templateId === 'string' &&
    typeof obj.currentSection === 'number' &&
    typeof obj.totalSections === 'number' &&
    Array.isArray(obj.completedSections) &&
    typeof obj.sectionData === 'object' &&
    typeof obj.isComplete === 'boolean' &&
    typeof obj.startedAt === 'string'
  );
}

/**
 * Create initial template progress state
 */
export function createInitialProgress(
  templateId: string,
  totalSections: number,
  applyBrandVoice?: boolean,
  selectedPersonaId?: string
): TemplateProgress {
  return {
    templateId,
    currentSection: 0,
    totalSections,
    completedSections: [],
    sectionData: {},
    isComplete: false,
    startedAt: new Date().toISOString(),
    applyBrandVoice,
    selectedPersonaId,
  };
}

/**
 * Generate a simple hash of content for modification detection
 */
export function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
