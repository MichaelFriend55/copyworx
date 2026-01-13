/**
 * @file lib/storage/document-storage.ts
 * @description Document storage layer with version control
 * 
 * Provides CRUD operations for documents within projects.
 * Supports version control with linked versions via parentVersionId.
 * Persists through project-storage layer to localStorage.
 */

'use client';

import type { ProjectDocument } from '@/lib/types/project';
import { getProject, updateProject } from './project-storage';
import { 
  validateNotEmpty,
  logError,
  logWarning
} from '@/lib/utils/error-handling';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for documents
 * Uses crypto.randomUUID() if available, falls back to timestamp-based ID
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Calculate word count from content string
 * Strips HTML tags and counts whitespace-separated words
 */
function calculateWordCount(content: string): number {
  if (!content) return 0;
  
  // Strip HTML tags
  const textOnly = content.replace(/<[^>]*>/g, ' ');
  
  // Split by whitespace and filter empty strings
  const words = textOnly
    .split(/\s+/)
    .filter(word => word.trim().length > 0);
  
  return words.length;
}

/**
 * Calculate character count from content string
 * Strips HTML tags for accurate count
 */
function calculateCharCount(content: string): number {
  if (!content) return 0;
  
  // Strip HTML tags
  const textOnly = content.replace(/<[^>]*>/g, '');
  
  return textOnly.length;
}

/**
 * Validate and sanitize base title
 * @throws Error if baseTitle is empty
 */
function validateBaseTitle(baseTitle: string): string {
  // Validate not empty
  validateNotEmpty(baseTitle, 'Document title');
  
  // Trim whitespace
  const trimmed = baseTitle.trim();
  
  // Sanitize: remove < > characters (prevent XSS)
  const sanitized = trimmed.replace(/[<>]/g, '');
  
  // Validate length
  if (sanitized.length > 200) {
    throw new Error('Document title cannot exceed 200 characters.');
  }
  
  return sanitized;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new document with version 1
 * 
 * @param projectId - ID of the project to add document to
 * @param baseTitle - Base title for the document (without version number)
 * @param content - Initial content (optional, defaults to empty)
 * @returns The newly created document
 * @throws Error if project not found or validation fails
 */
export function createDocument(
  projectId: string,
  baseTitle: string,
  content: string = ''
): ProjectDocument {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create document in non-browser environment');
  }
  
  // Validate and sanitize baseTitle
  const sanitizedTitle = validateBaseTitle(baseTitle);
  
  // Get project (throws if not found)
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Create timestamp
  const now = new Date().toISOString();
  
  // Create new document with version 1
  const newDocument: ProjectDocument = {
    id: generateId(),
    projectId,
    baseTitle: sanitizedTitle,
    title: `${sanitizedTitle} v1`,
    version: 1,
    content,
    createdAt: now,
    modifiedAt: now,
    metadata: {
      wordCount: calculateWordCount(content),
      charCount: calculateCharCount(content),
      tags: [],
    },
  };
  
  // Add to project's documents array
  const updatedDocuments = [...project.documents, newDocument];
  
  // Update project (persists to localStorage)
  updateProject(projectId, { documents: updatedDocuments });
  
  console.log('✅ Document created:', {
    id: newDocument.id,
    title: newDocument.title,
    projectId,
  });
  
  return newDocument;
}

/**
 * Create a new version of an existing document
 * 
 * @param projectId - ID of the project
 * @param sourceDocId - ID of the source document to version from
 * @param newContent - Optional new content (copies from source if not provided)
 * @returns The newly created document version
 * @throws Error if project or source document not found
 */
export function createDocumentVersion(
  projectId: string,
  sourceDocId: string,
  newContent?: string
): ProjectDocument {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create document version in non-browser environment');
  }
  
  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Find source document
  const sourceDocument = project.documents.find(doc => doc.id === sourceDocId);
  if (!sourceDocument) {
    throw new Error(`Source document not found: ${sourceDocId}`);
  }
  
  // Find the highest version number for this baseTitle
  const relatedVersions = project.documents.filter(
    doc => doc.baseTitle === sourceDocument.baseTitle
  );
  const highestVersion = Math.max(...relatedVersions.map(doc => doc.version));
  const newVersion = highestVersion + 1;
  
  // Determine content
  const content = newContent !== undefined ? newContent : sourceDocument.content;
  
  // Create timestamp
  const now = new Date().toISOString();
  
  // Create new document version
  const newDocument: ProjectDocument = {
    id: generateId(),
    projectId,
    baseTitle: sourceDocument.baseTitle,
    title: `${sourceDocument.baseTitle} v${newVersion}`,
    version: newVersion,
    parentVersionId: sourceDocument.id,
    content,
    createdAt: now,
    modifiedAt: now,
    metadata: {
      wordCount: calculateWordCount(content),
      charCount: calculateCharCount(content),
      templateId: sourceDocument.metadata?.templateId,
      tags: sourceDocument.metadata?.tags ? [...sourceDocument.metadata.tags] : [],
    },
  };
  
  // Add to project's documents array
  const updatedDocuments = [...project.documents, newDocument];
  
  // Update project (persists to localStorage)
  updateProject(projectId, { documents: updatedDocuments });
  
  console.log('✅ Document version created:', {
    id: newDocument.id,
    title: newDocument.title,
    version: newVersion,
    parentVersionId: sourceDocument.id,
    projectId,
  });
  
  return newDocument;
}

/**
 * Get all documents for a project
 * 
 * @param projectId - ID of the project
 * @returns Array of documents sorted by modifiedAt (newest first)
 */
export function getAllDocuments(projectId: string): ProjectDocument[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const project = getProject(projectId);
    if (!project) {
      logWarning(`Project not found when getting documents: ${projectId}`);
      return [];
    }
    
    // Ensure documents is an array
    const documents = Array.isArray(project.documents) ? project.documents : [];
    
    // Sort by modifiedAt (newest first)
    const sorted = [...documents].sort((a, b) => {
      const dateA = new Date(a.modifiedAt).getTime();
      const dateB = new Date(b.modifiedAt).getTime();
      return dateB - dateA;
    });
    
    console.log(`📄 Loaded ${sorted.length} document(s) for project ${projectId}`);
    
    return sorted;
  } catch (error) {
    logError(error, `Failed to get documents for project ${projectId}`);
    return [];
  }
}

/**
 * Get a single document by ID
 * 
 * @param projectId - ID of the project
 * @param docId - ID of the document
 * @returns The document or null if not found
 */
export function getDocument(
  projectId: string,
  docId: string
): ProjectDocument | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const documents = getAllDocuments(projectId);
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      console.warn(`⚠️ Document not found: ${docId} in project ${projectId}`);
      return null;
    }
    
    return document;
  } catch (error) {
    logError(error, `Failed to get document ${docId}`);
    return null;
  }
}

/**
 * Get all versions of a document by baseTitle
 * 
 * @param projectId - ID of the project
 * @param baseTitle - Base title to search for
 * @returns Array of document versions sorted by version number (ascending)
 */
export function getDocumentVersions(
  projectId: string,
  baseTitle: string
): ProjectDocument[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const documents = getAllDocuments(projectId);
    
    // Filter by matching baseTitle
    const versions = documents.filter(doc => doc.baseTitle === baseTitle);
    
    // Sort by version number (ascending)
    const sorted = [...versions].sort((a, b) => a.version - b.version);
    
    console.log(`📚 Found ${sorted.length} version(s) for "${baseTitle}"`);
    
    return sorted;
  } catch (error) {
    logError(error, `Failed to get document versions for "${baseTitle}"`);
    return [];
  }
}

/**
 * Update a document
 * 
 * @param projectId - ID of the project
 * @param docId - ID of the document to update
 * @param updates - Partial document updates (some fields are protected)
 * @throws Error if project or document not found
 */
export function updateDocument(
  projectId: string,
  docId: string,
  updates: Partial<ProjectDocument>
): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update document in non-browser environment');
  }
  
  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Find document index
  const docIndex = project.documents.findIndex(doc => doc.id === docId);
  if (docIndex === -1) {
    throw new Error(`Document not found: ${docId}`);
  }
  
  const existingDoc = project.documents[docIndex];
  
  // Determine if content changed
  const contentChanged = updates.content !== undefined && 
                         updates.content !== existingDoc.content;
  
  // Calculate new metadata if content changed
  let updatedMetadata = existingDoc.metadata || {};
  if (contentChanged && updates.content !== undefined) {
    updatedMetadata = {
      ...updatedMetadata,
      wordCount: calculateWordCount(updates.content),
      charCount: calculateCharCount(updates.content),
    };
  }
  
  // Merge updates with existing document, protecting immutable fields
  const updatedDoc: ProjectDocument = {
    ...existingDoc,
    ...updates,
    // Protected fields - cannot be changed
    id: existingDoc.id,
    projectId: existingDoc.projectId,
    version: existingDoc.version,
    parentVersionId: existingDoc.parentVersionId,
    baseTitle: existingDoc.baseTitle,
    // Always update modifiedAt
    modifiedAt: new Date().toISOString(),
    // Updated metadata (with recalculated counts if content changed)
    metadata: {
      ...updatedMetadata,
      ...(updates.metadata || {}),
    },
  };
  
  // Update the documents array
  const updatedDocuments = [...project.documents];
  updatedDocuments[docIndex] = updatedDoc;
  
  // Update project (persists to localStorage)
  updateProject(projectId, { documents: updatedDocuments });
  
  console.log('✅ Document updated:', {
    id: updatedDoc.id,
    title: updatedDoc.title,
    projectId,
    contentChanged,
  });
}

/**
 * Delete a document
 * 
 * @param projectId - ID of the project
 * @param docId - ID of the document to delete
 * @throws Error if project or document not found
 */
export function deleteDocument(projectId: string, docId: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete document in non-browser environment');
  }
  
  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Find document
  const docIndex = project.documents.findIndex(doc => doc.id === docId);
  if (docIndex === -1) {
    throw new Error(`Document not found: ${docId}`);
  }
  
  const deletedDoc = project.documents[docIndex];
  
  // Remove document from array
  const updatedDocuments = project.documents.filter(doc => doc.id !== docId);
  
  // Update project (persists to localStorage)
  updateProject(projectId, { documents: updatedDocuments });
  
  console.log('🗑️ Document deleted:', {
    id: deletedDoc.id,
    title: deletedDoc.title,
    projectId,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the latest version of a document by baseTitle
 * 
 * @param projectId - ID of the project
 * @param baseTitle - Base title to search for
 * @returns The latest version or null if none found
 */
export function getLatestVersion(
  projectId: string,
  baseTitle: string
): ProjectDocument | null {
  const versions = getDocumentVersions(projectId, baseTitle);
  
  if (versions.length === 0) {
    return null;
  }
  
  // Versions are sorted ascending, so last one is latest
  return versions[versions.length - 1];
}

/**
 * Check if a document has multiple versions
 * 
 * @param projectId - ID of the project
 * @param baseTitle - Base title to check
 * @returns True if there are multiple versions
 */
export function hasMultipleVersions(
  projectId: string,
  baseTitle: string
): boolean {
  const versions = getDocumentVersions(projectId, baseTitle);
  return versions.length > 1;
}

/**
 * Get unique base titles (document groups) for a project
 * 
 * @param projectId - ID of the project
 * @returns Array of unique base titles
 */
export function getUniqueBaseTitles(projectId: string): string[] {
  const documents = getAllDocuments(projectId);
  const baseTitles = new Set(documents.map(doc => doc.baseTitle));
  return Array.from(baseTitles);
}
