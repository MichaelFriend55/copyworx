/**
 * @file lib/types/template.ts
 * @description TypeScript types for template generation system
 * 
 * Templates provide structured forms for generating specific types of copy
 * like sales emails, landing pages, social media posts, etc.
 */

import type { BrandVoice } from './brand';
import type { Persona } from './project';

/**
 * Template category types
 */
export type TemplateCategory = 
  | 'email' 
  | 'advertising' 
  | 'landing-page' 
  | 'social' 
  | 'collateral' 
  | 'website' 
  | 'blog' 
  | 'other';

/**
 * Field types for template forms
 */
export type FieldType = 'text' | 'textarea' | 'select' | 'number';

/**
 * Template field definition
 * Describes a single form field in a template
 */
export interface TemplateField {
  /** Unique field identifier */
  id: string;
  
  /** Human-readable label */
  label: string;
  
  /** Field input type */
  type: FieldType;
  
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
}

/**
 * Template definition
 * Complete specification for a copywriting template
 */
export interface Template {
  /** Unique template identifier */
  id: string;
  
  /** Template name displayed to user */
  name: string;
  
  /** Category this template belongs to */
  category: TemplateCategory;
  
  /** Short description of what this template creates */
  description: string;
  
  /** Difficulty level for user guidance */
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  
  /** Estimated time to complete (e.g., "15-20 min") */
  estimatedTime: string;
  
  /** Lucide-react icon name */
  icon: string;
  
  /** Form fields for this template */
  fields: TemplateField[];
  
  /** 
   * Claude system prompt template with placeholders
   * Placeholders use {fieldId} format and special ones:
   * - {brandVoiceInstructions} - Auto-injected if brand voice enabled
   * - {personaInstructions} - Auto-injected if persona selected
   */
  systemPrompt: string;
}

/**
 * Form data collected from user
 * Maps field IDs to their values
 */
export interface TemplateFormData {
  [fieldId: string]: string;
}

/**
 * Template generation request
 */
export interface TemplateGenerationRequest {
  /** Template ID being used */
  templateId: string;
  
  /** Form data from user */
  formData: TemplateFormData;
  
  /** Whether to apply brand voice */
  applyBrandVoice?: boolean;
  
  /** Brand voice configuration if applying */
  brandVoice?: BrandVoice;
  
  /** Persona ID if selected */
  personaId?: string;
  
  /** Persona data if selected */
  persona?: Persona;
}

/**
 * Template generation response
 */
export interface TemplateGenerationResponse {
  /** Generated copy */
  generatedCopy: string;
  
  /** Original prompt sent to Claude */
  prompt?: string;
  
  /** Metadata about generation */
  metadata?: {
    textLength: number;
    templateUsed: string;
    brandVoiceApplied: boolean;
    personaUsed: boolean;
  };
}
