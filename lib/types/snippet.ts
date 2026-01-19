/**
 * @file lib/types/snippet.ts
 * @description TypeScript type definitions for project-scoped snippets
 * 
 * Snippets are reusable copy elements that belong to a specific project.
 * Users can save frequently used text (taglines, CTAs, boilerplate, etc.)
 * and quickly insert them into documents.
 */

/**
 * Snippet interface - Reusable copy element
 * 
 * Snippets are project-scoped, meaning each project has its own set of snippets.
 * They are stored within the project's data structure in localStorage.
 */
export interface Snippet {
  /** Unique identifier (UUID format) */
  id: string;
  
  /** Project ID this snippet belongs to */
  projectId: string;
  
  /** User-defined name/title for the snippet (e.g., "Hero CTA", "Email Sign-off") */
  name: string;
  
  /** The actual copy text content (can include HTML formatting) */
  content: string;
  
  /** Optional description/notes about when to use this snippet */
  description?: string;
  
  /** Optional tags for organization and filtering */
  tags?: string[];
  
  /** ISO date string when snippet was created */
  createdAt: string;
  
  /** ISO date string when snippet was last modified */
  modifiedAt: string;
  
  /** Number of times this snippet has been used/inserted */
  usageCount: number;
}

/**
 * Snippet creation input - Fields required to create a new snippet
 */
export interface CreateSnippetInput {
  /** User-defined name/title for the snippet */
  name: string;
  
  /** The actual copy text content */
  content: string;
  
  /** Optional description/notes */
  description?: string;
  
  /** Optional tags for organization */
  tags?: string[];
}

/**
 * Snippet update input - Fields that can be updated
 */
export interface UpdateSnippetInput {
  /** Updated name (optional) */
  name?: string;
  
  /** Updated content (optional) */
  content?: string;
  
  /** Updated description (optional) */
  description?: string;
  
  /** Updated tags (optional) */
  tags?: string[];
}

/**
 * Type guard to check if a value is a valid Snippet
 */
export function isSnippet(value: unknown): value is Snippet {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.projectId === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.modifiedAt === 'string' &&
    typeof obj.usageCount === 'number'
  );
}

/**
 * Validate snippet name
 * @throws Error if name is invalid
 */
export function validateSnippetName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Snippet name cannot be empty');
  }
  
  if (name.trim().length > 100) {
    throw new Error('Snippet name cannot exceed 100 characters');
  }
}

/**
 * Validate snippet content
 * @throws Error if content is invalid
 */
export function validateSnippetContent(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new Error('Snippet content cannot be empty');
  }
  
  if (content.length > 50000) {
    throw new Error('Snippet content is too long (max 50,000 characters)');
  }
}
