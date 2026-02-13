/**
 * @file lib/types/index.ts
 * @description Core TypeScript type definitions for CopyWorx v2
 * 
 * Exports all shared types used across the application including:
 * - Document models
 * - Tool categories
 * - AI analysis modes
 * - Workspace state
 * - Project types
 */

// Re-export project types
export type { Project, Persona, ProjectDocument, Folder } from './project';
export { isProject, isFolder } from './project';

// Re-export snippet types
export type { Snippet, CreateSnippetInput, UpdateSnippetInput } from './snippet';
export { isSnippet, validateSnippetName, validateSnippetContent } from './snippet';

// Re-export brand types
export type { BrandVoice, BrandAlignmentResult, BrandAlignmentRequest, BrandAlignmentResponse } from './brand';

// Re-export template types
export type { 
  Template as TemplateDefinition,
  TemplateCategory,
  TemplateCategoryConfig,
  TemplateField,
  TemplateFormData,
  TemplateGenerationRequest,
  TemplateGenerationResponse
} from './template';

// Re-export template progress types for multi-section templates
export type {
  TemplateProgress,
  TemplateSection,
  TemplateSectionField,
  CompletedSection,
  MultiSectionTemplate,
  SectionGenerationRequest,
  SectionGenerationResponse,
  SectionStatus
} from './template-progress';
export {
  isValidTemplateProgress,
  createInitialProgress,
  generateContentHash
} from './template-progress';

/**
 * Represents a copywriting document in the workspace
 */
export interface Document {
  /** Unique identifier for the document */
  id: string;
  
  /** Document title/name */
  title: string;
  
  /** Raw text content of the document */
  content: string;
  
  /** Timestamp when document was first created */
  createdAt: Date;
  
  /** Timestamp when document was last modified */
  modifiedAt: Date;
  
  /** Optional metadata for document */
  metadata?: {
    /** Word count */
    wordCount?: number;
    
    /** Character count */
    charCount?: number;
    
    /** Associated template ID if created from template */
    templateId?: string;
    
    /** Tags for organization */
    tags?: string[];
  };
}

/**
 * Categories of tools available in the left sidebar
 */
export type ToolCategory = 
  | 'optimizer'   // Text optimization tools
  | 'templates'   // Copywriting templates
  | 'brand'       // Brand voice tools
  | 'insights';   // Analytics and insights

/**
 * AI analysis modes for the right sidebar
 */
export type AIAnalysisMode = 
  | 'emotional'   // Emotional tone analysis
  | 'persona'     // Target persona analysis
  | 'brand'       // Brand voice consistency
  | null;         // No analysis active

/**
 * Sidebar position identifier
 */
export type SidebarPosition = 'left' | 'right';

/**
 * Workspace action types for routing
 */
export type WorkspaceAction = 
  | 'new'         // Create new blank document
  | 'template'    // Start from template
  | 'import';     // Import text file

/**
 * @deprecated Use TemplateDefinition from './template' instead
 * Legacy Template interface maintained for backwards compatibility
 */
export interface Template {
  /** Template unique identifier */
  id: string;
  
  /** Template display name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Template category */
  category: string;
  
  /** Template content structure */
  structure: string;
  
  /** Example/placeholder content */
  example?: string;
}

/**
 * AI analysis result
 */
export interface AnalysisResult {
  /** Analysis type */
  type: AIAnalysisMode;
  
  /** Timestamp of analysis */
  timestamp: Date;
  
  /** Analysis data */
  data: Record<string, unknown>;
  
  /** Confidence score (0-1) */
  confidence?: number;
}

/**
 * Editor content representation
 */
export interface EditorContent {
  /** HTML content from TipTap editor */
  html: string;
  
  /** Plain text content (stripped of HTML) */
  text: string;
  
  /** Word count */
  wordCount: number;
  
  /** Character count (including spaces) */
  characterCount: number;
}

/**
 * Auto-save status indicator
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Editor view mode options
 * - scrolling: Continuous scroll mode (default)
 * - focus: Distraction-free writing mode
 */
export type ViewMode = 'scrolling' | 'focus';