/**
 * @file lib/storage/snippet-storage.ts
 * @description Snippet storage layer using localStorage
 * 
 * Provides CRUD operations for project-scoped snippets.
 * Snippets are stored within the project's data structure,
 * similar to how documents are stored.
 */

'use client';

import type { Snippet, CreateSnippetInput, UpdateSnippetInput } from '@/lib/types/snippet';
import { validateSnippetName, validateSnippetContent } from '@/lib/types/snippet';
import { getProject, updateProject } from './project-storage';
import { logError, logWarning } from '@/lib/utils/error-handling';

// ============================================================================
// Types
// ============================================================================

/**
 * Extended Project interface with snippets
 * This extends the base Project type to include snippets array
 */
interface ProjectWithSnippets {
  id: string;
  name: string;
  snippets?: Snippet[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for snippets
 * Uses crypto.randomUUID() if available, falls back to timestamp-based ID
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `snippet-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sanitize text to prevent XSS
 * Removes < and > characters from names/descriptions
 */
function sanitizeText(text: string): string {
  return text.trim().replace(/[<>]/g, '');
}

/**
 * Get snippets array from project, initializing if needed
 */
function getProjectSnippets(projectId: string): Snippet[] {
  const project = getProject(projectId) as ProjectWithSnippets | null;
  if (!project) {
    logWarning(`Project not found when getting snippets: ${projectId}`);
    return [];
  }
  
  // Ensure snippets array exists
  if (!Array.isArray(project.snippets)) {
    return [];
  }
  
  return project.snippets;
}

/**
 * Save snippets array to project
 */
function saveProjectSnippets(projectId: string, snippets: Snippet[]): void {
  updateProject(projectId, { snippets } as unknown as Partial<ProjectWithSnippets>);
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new snippet in a project
 * 
 * @param projectId - ID of the project to add snippet to
 * @param input - Snippet creation input (name, content, etc.)
 * @returns The newly created snippet
 * @throws Error if project not found or validation fails
 */
export function createSnippet(
  projectId: string,
  input: CreateSnippetInput
): Snippet {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create snippet in non-browser environment');
  }
  
  // Validate inputs
  validateSnippetName(input.name);
  validateSnippetContent(input.content);
  
  // Get project to verify it exists
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Create timestamp
  const now = new Date().toISOString();
  
  // Create new snippet
  const newSnippet: Snippet = {
    id: generateId(),
    projectId,
    name: sanitizeText(input.name),
    content: input.content, // Don't sanitize content - may have valid HTML
    description: input.description ? sanitizeText(input.description) : undefined,
    tags: input.tags?.map(tag => sanitizeText(tag)),
    createdAt: now,
    modifiedAt: now,
    usageCount: 0,
  };
  
  // Get existing snippets and add new one
  const snippets = getProjectSnippets(projectId);
  const updatedSnippets = [...snippets, newSnippet];
  
  // Save to project
  saveProjectSnippets(projectId, updatedSnippets);
  
  console.log('✅ Snippet created:', {
    id: newSnippet.id,
    name: newSnippet.name,
    projectId,
  });
  
  return newSnippet;
}

/**
 * Get all snippets for a project
 * 
 * @param projectId - ID of the project
 * @returns Array of snippets sorted by modifiedAt (newest first)
 */
export function getAllSnippets(projectId: string): Snippet[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const snippets = getProjectSnippets(projectId);
    
    // Sort by modifiedAt (newest first)
    const sorted = [...snippets].sort((a, b) => {
      const dateA = new Date(a.modifiedAt).getTime();
      const dateB = new Date(b.modifiedAt).getTime();
      return dateB - dateA;
    });
    
    console.log(`📎 Loaded ${sorted.length} snippet(s) for project ${projectId}`);
    
    return sorted;
  } catch (error) {
    logError(error, `Failed to get snippets for project ${projectId}`);
    return [];
  }
}

/**
 * Get a single snippet by ID
 * 
 * @param projectId - ID of the project
 * @param snippetId - ID of the snippet
 * @returns The snippet or null if not found
 */
export function getSnippet(
  projectId: string,
  snippetId: string
): Snippet | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const snippets = getProjectSnippets(projectId);
    const snippet = snippets.find(s => s.id === snippetId);
    
    if (!snippet) {
      console.warn(`⚠️ Snippet not found: ${snippetId} in project ${projectId}`);
      return null;
    }
    
    return snippet;
  } catch (error) {
    logError(error, `Failed to get snippet ${snippetId}`);
    return null;
  }
}

/**
 * Update a snippet
 * 
 * @param projectId - ID of the project
 * @param snippetId - ID of the snippet to update
 * @param updates - Partial snippet updates
 * @returns The updated snippet
 * @throws Error if project or snippet not found, or validation fails
 */
export function updateSnippet(
  projectId: string,
  snippetId: string,
  updates: UpdateSnippetInput
): Snippet {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update snippet in non-browser environment');
  }
  
  // Validate updates if provided
  if (updates.name !== undefined) {
    validateSnippetName(updates.name);
  }
  if (updates.content !== undefined) {
    validateSnippetContent(updates.content);
  }
  
  // Get existing snippets
  const snippets = getProjectSnippets(projectId);
  const snippetIndex = snippets.findIndex(s => s.id === snippetId);
  
  if (snippetIndex === -1) {
    throw new Error(`Snippet not found: ${snippetId}`);
  }
  
  const existingSnippet = snippets[snippetIndex];
  
  // Merge updates with existing snippet
  const updatedSnippet: Snippet = {
    ...existingSnippet,
    name: updates.name !== undefined ? sanitizeText(updates.name) : existingSnippet.name,
    content: updates.content !== undefined ? updates.content : existingSnippet.content,
    description: updates.description !== undefined 
      ? sanitizeText(updates.description) 
      : existingSnippet.description,
    tags: updates.tags !== undefined 
      ? updates.tags.map(tag => sanitizeText(tag)) 
      : existingSnippet.tags,
    modifiedAt: new Date().toISOString(),
  };
  
  // Update snippets array
  const updatedSnippets = [...snippets];
  updatedSnippets[snippetIndex] = updatedSnippet;
  
  // Save to project
  saveProjectSnippets(projectId, updatedSnippets);
  
  console.log('✅ Snippet updated:', {
    id: updatedSnippet.id,
    name: updatedSnippet.name,
    projectId,
  });
  
  return updatedSnippet;
}

/**
 * Delete a snippet
 * 
 * @param projectId - ID of the project
 * @param snippetId - ID of the snippet to delete
 * @throws Error if project or snippet not found
 */
export function deleteSnippet(projectId: string, snippetId: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete snippet in non-browser environment');
  }
  
  // Get existing snippets
  const snippets = getProjectSnippets(projectId);
  const snippetIndex = snippets.findIndex(s => s.id === snippetId);
  
  if (snippetIndex === -1) {
    throw new Error(`Snippet not found: ${snippetId}`);
  }
  
  const deletedSnippet = snippets[snippetIndex];
  
  // Remove snippet from array
  const updatedSnippets = snippets.filter(s => s.id !== snippetId);
  
  // Save to project
  saveProjectSnippets(projectId, updatedSnippets);
  
  console.log('🗑️ Snippet deleted:', {
    id: deletedSnippet.id,
    name: deletedSnippet.name,
    projectId,
  });
}

/**
 * Increment usage count for a snippet
 * Called when snippet is inserted into a document
 * 
 * @param projectId - ID of the project
 * @param snippetId - ID of the snippet
 */
export function incrementSnippetUsage(projectId: string, snippetId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const snippets = getProjectSnippets(projectId);
    const snippetIndex = snippets.findIndex(s => s.id === snippetId);
    
    if (snippetIndex === -1) {
      console.warn(`⚠️ Snippet not found for usage increment: ${snippetId}`);
      return;
    }
    
    // Increment usage count
    const updatedSnippets = [...snippets];
    updatedSnippets[snippetIndex] = {
      ...updatedSnippets[snippetIndex],
      usageCount: (updatedSnippets[snippetIndex].usageCount || 0) + 1,
    };
    
    // Save to project
    saveProjectSnippets(projectId, updatedSnippets);
    
    console.log('📊 Snippet usage incremented:', {
      id: snippetId,
      newCount: updatedSnippets[snippetIndex].usageCount,
    });
  } catch (error) {
    logError(error, `Failed to increment snippet usage: ${snippetId}`);
  }
}

// ============================================================================
// Search & Filter Functions
// ============================================================================

/**
 * Search snippets by name or content
 * 
 * @param projectId - ID of the project
 * @param query - Search query string
 * @returns Filtered array of snippets matching the query
 */
export function searchSnippets(projectId: string, query: string): Snippet[] {
  if (!query || query.trim().length === 0) {
    return getAllSnippets(projectId);
  }
  
  const snippets = getAllSnippets(projectId);
  const lowerQuery = query.toLowerCase().trim();
  
  return snippets.filter(snippet => {
    const nameMatch = snippet.name.toLowerCase().includes(lowerQuery);
    const contentMatch = snippet.content.toLowerCase().includes(lowerQuery);
    const descriptionMatch = snippet.description?.toLowerCase().includes(lowerQuery);
    const tagMatch = snippet.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    
    return nameMatch || contentMatch || descriptionMatch || tagMatch;
  });
}

/**
 * Get snippets by tag
 * 
 * @param projectId - ID of the project
 * @param tag - Tag to filter by
 * @returns Filtered array of snippets with the specified tag
 */
export function getSnippetsByTag(projectId: string, tag: string): Snippet[] {
  const snippets = getAllSnippets(projectId);
  const lowerTag = tag.toLowerCase().trim();
  
  return snippets.filter(snippet => 
    snippet.tags?.some(t => t.toLowerCase() === lowerTag)
  );
}

/**
 * Get all unique tags used in project snippets
 * 
 * @param projectId - ID of the project
 * @returns Array of unique tags sorted alphabetically
 */
export function getAllSnippetTags(projectId: string): string[] {
  const snippets = getAllSnippets(projectId);
  const tagSet = new Set<string>();
  
  snippets.forEach(snippet => {
    snippet.tags?.forEach(tag => tagSet.add(tag));
  });
  
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Get most frequently used snippets
 * 
 * @param projectId - ID of the project
 * @param limit - Maximum number of snippets to return (default 5)
 * @returns Array of snippets sorted by usage count (highest first)
 */
export function getMostUsedSnippets(projectId: string, limit: number = 5): Snippet[] {
  const snippets = getAllSnippets(projectId);
  
  return [...snippets]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, limit);
}
