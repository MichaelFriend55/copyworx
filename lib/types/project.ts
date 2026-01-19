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
import type { Snippet } from './snippet';

/**
 * Folder interface - Organizational container for documents
 * 
 * Folder Hierarchy:
 * - Top-level folders: parentFolderId is undefined/null (sits at project root)
 * - Nested folders: parentFolderId points to another folder (subfolder)
 * 
 * Example structure:
 * Project: EFI
 * ├── folders: [
 * │     { id: "f1", name: "Website Copy", parentFolderId: null },
 * │     { id: "f2", name: "Email Campaigns", parentFolderId: null },
 * │     { id: "f3", name: "Q1 Launch", parentFolderId: "f2" }  ← nested under Email
 * │   ]
 */
export interface Folder {
  /** Unique identifier (UUID format) */
  id: string;
  
  /** Folder name (e.g., "Website Copy") */
  name: string;
  
  /** Project ID this folder belongs to */
  projectId: string;
  
  /** Parent folder ID for nested folders (undefined/null for top-level) */
  parentFolderId?: string;
  
  /** ISO date string when folder was created */
  createdAt: string;
  
  /** ISO date string when folder was last updated */
  updatedAt: string;
}

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
  
  /** Array of folders for document organization */
  folders: Folder[];
  
  /** Array of documents (copywriting content) */
  documents: ProjectDocument[];
  
  /** Array of reusable copy snippets */
  snippets: Snippet[];
  
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
 * Project Document interface - Copywriting content with version control
 * 
 * Version Control Model:
 * - baseTitle: Root name without version (e.g., "EFI Homepage Hero")
 * - title: Computed as "{baseTitle} v{version}" (e.g., "EFI Homepage Hero v2")
 * - version: Sequential number (1, 2, 3, etc.)
 * - parentVersionId: Links to the original version this was created from
 * 
 * This enables:
 * 1. Tracking document versions (v1, v2, v3)
 * 2. Creating new versions while preserving originals
 * 3. Linking versions together via parentVersionId
 * 4. Grouping versions in the UI by baseTitle
 */
export interface ProjectDocument {
  /** Unique identifier (UUID format) */
  id: string;
  
  /** Project this document belongs to */
  projectId: string;
  
  /** Base title without version number (e.g., "EFI Homepage Hero") */
  baseTitle: string;
  
  /** Full document title, computed as "{baseTitle} v{version}" */
  title: string;
  
  /** Version number (1, 2, 3, etc.) */
  version: number;
  
  /** ID of the parent version this was created from (optional) */
  parentVersionId?: string;
  
  /** Folder ID for future folder organization support (optional) */
  folderId?: string;
  
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
 * Type guard to check if a value is a valid Folder
 */
export function isFolder(value: unknown): value is Folder {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.projectId === 'string' &&
    (obj.parentFolderId === undefined || obj.parentFolderId === null || typeof obj.parentFolderId === 'string') &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
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
    Array.isArray(obj.folders) &&
    Array.isArray(obj.documents) &&
    // snippets is optional for backward compatibility
    (obj.snippets === undefined || Array.isArray(obj.snippets)) &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}
