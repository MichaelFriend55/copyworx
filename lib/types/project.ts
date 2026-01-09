/**
 * @file lib/types/project.ts
 * @description TypeScript type definitions for project-based architecture
 * 
 * Projects are the top-level organizational unit in CopyWorx.
 * Each project contains:
 * - Brand voice configuration
 * - Personas (target audience profiles)
 * - Documents (copywriting content)
 */

import type { BrandVoice } from './brand';

/**
 * Project interface - Top-level organizational unit
 */
export interface Project {
  /** Unique identifier (UUID format) */
  id: string;
  
  /** Project name (user-defined) */
  name: string;
  
  /** Brand voice configuration for this project */
  brandVoice: BrandVoice | null;
  
  /** Array of personas (target audience profiles) */
  personas: Persona[];
  
  /** Array of documents (copywriting content) */
  documents: ProjectDocument[];
  
  /** ISO date string when project was created */
  createdAt: string;
  
  /** ISO date string when project was last updated */
  updatedAt: string;
}

/**
 * Persona interface - Target audience profile
 * Represents a detailed persona for targeting specific audiences
 */
export interface Persona {
  /** Unique identifier */
  id: string;
  
  /** Persona name and title (e.g., "Sarah, the Startup Founder") */
  name: string;
  
  /** Optional photo URL or base64 encoded image */
  photoUrl?: string;
  
  /** Demographics: Age, income, location, job title */
  demographics: string;
  
  /** Psychographics: Values, interests, lifestyle, personality traits */
  psychographics: string;
  
  /** Pain points: Problems and frustrations they face */
  painPoints: string;
  
  /** Language patterns: Words and phrases they use and respond to */
  languagePatterns: string;
  
  /** Goals and aspirations: What they want to achieve */
  goals: string;
  
  /** ISO date string when created */
  createdAt: string;
  
  /** ISO date string when last updated */
  updatedAt: string;
}

/**
 * Project Document interface - Copywriting content
 * (Extends base Document with project-specific fields)
 */
export interface ProjectDocument {
  /** Unique identifier */
  id: string;
  
  /** Document title */
  title: string;
  
  /** Document content (HTML from TipTap editor) */
  content: string;
  
  /** ISO date string when created */
  createdAt: string;
  
  /** ISO date string when last modified */
  modifiedAt: string;
  
  /** Optional metadata */
  metadata?: {
    /** Word count */
    wordCount?: number;
    
    /** Character count */
    charCount?: number;
    
    /** Associated template ID */
    templateId?: string;
    
    /** Tags for organization */
    tags?: string[];
  };
}

/**
 * Type guard to check if a value is a valid Project
 */
export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    (obj.brandVoice === null || typeof obj.brandVoice === 'object') &&
    Array.isArray(obj.personas) &&
    Array.isArray(obj.documents) &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}
