/**
 * @file lib/storage/document-storage.ts
 * @description Document storage layer with Supabase API + localStorage fallback
 * 
 * Provides CRUD operations for documents within projects.
 * Uses Supabase API calls for cloud storage with localStorage fallback.
 * Supports version control with linked versions via parentVersionId.
 */

'use client';

import type { ProjectDocument } from '@/lib/types/project';
import type { WorxDeskMetadata } from '@/lib/types/worxdesk';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = '/api/db/documents';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for documents
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Calculate word count from content string
 */
function calculateWordCount(content: string): number {
  if (!content) return 0;
  const textOnly = content.replace(/<[^>]*>/g, ' ');
  const words = textOnly.split(/\s+/).filter(word => word.trim().length > 0);
  return words.length;
}

/**
 * Calculate character count from content string
 */
function calculateCharCount(content: string): number {
  if (!content) return 0;
  const textOnly = content.replace(/<[^>]*>/g, '');
  return textOnly.length;
}

/**
 * Validate and sanitize base title
 */
function validateBaseTitle(baseTitle: string): string {
  if (!baseTitle || baseTitle.trim().length === 0) {
    throw new Error('Document title cannot be empty');
  }
  
  const trimmed = baseTitle.trim();
  const sanitized = trimmed.replace(/[<>]/g, '');
  
  if (sanitized.length > 200) {
    throw new Error('Document title cannot exceed 200 characters');
  }
  
  return sanitized;
}

/**
 * Convert API response (snake_case) to frontend format (camelCase)
 */
function mapApiToDocument(apiDoc: Record<string, unknown>): ProjectDocument {
  return {
    id: apiDoc.id as string,
    projectId: apiDoc.project_id as string,
    baseTitle: apiDoc.base_title as string,
    title: apiDoc.title as string,
    version: apiDoc.version as number,
    parentVersionId: apiDoc.parent_version_id as string | undefined,
    folderId: apiDoc.folder_id as string | undefined,
    content: apiDoc.content as string,
    createdAt: apiDoc.created_at as string,
    modifiedAt: apiDoc.modified_at as string,
    metadata: apiDoc.metadata as ProjectDocument['metadata'],
    templateProgress: apiDoc.template_progress as ProjectDocument['templateProgress'],
    // Always coerce missing values to `null` (never undefined) so callers that
    // narrow on `=== null` see a stable shape regardless of whether the row
    // came from before or after migration 005.
    worxdeskMetadata:
      (apiDoc.worxdesk_metadata as WorxDeskMetadata | null | undefined) ?? null,
  };
}

/**
 * Convert frontend document to API format (snake_case)
 *
 * Used for both inserts (full document) and partial updates. Each branch is
 * conditional on `!== undefined` so partial updates never accidentally clear
 * a column the caller did not intend to touch — for example, an autosave that
 * only sets `content` must leave `worxdesk_metadata` alone in the database.
 *
 * To explicitly clear a column, the caller must pass `null` (which is
 * preserved as `null` in the API body); omitting the field leaves it intact.
 */
function mapDocumentToApi(doc: Partial<ProjectDocument>): Record<string, unknown> {
  const apiDoc: Record<string, unknown> = {};
  
  if (doc.projectId !== undefined) apiDoc.project_id = doc.projectId;
  if (doc.baseTitle !== undefined) apiDoc.base_title = doc.baseTitle;
  if (doc.title !== undefined) apiDoc.title = doc.title;
  if (doc.version !== undefined) apiDoc.version = doc.version;
  if (doc.parentVersionId !== undefined) apiDoc.parent_version_id = doc.parentVersionId;
  if (doc.folderId !== undefined) apiDoc.folder_id = doc.folderId;
  if (doc.content !== undefined) apiDoc.content = doc.content;
  if (doc.metadata !== undefined) apiDoc.metadata = doc.metadata;
  if (doc.templateProgress !== undefined) apiDoc.template_progress = doc.templateProgress;
  if (doc.worxdeskMetadata !== undefined) apiDoc.worxdesk_metadata = doc.worxdeskMetadata;
  
  return apiDoc;
}

// ============================================================================
// localStorage Fallback Functions
// ============================================================================

const STORAGE_KEY = 'copyworx_documents';

function getLocalDocuments(projectId: string): ProjectDocument[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const allDocs = JSON.parse(data) as ProjectDocument[];
    return allDocs.filter(doc => doc.projectId === projectId);
  } catch {
    return [];
  }
}

function saveLocalDocument(doc: ProjectDocument): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const allDocs = data ? JSON.parse(data) as ProjectDocument[] : [];
    const existingIndex = allDocs.findIndex(d => d.id === doc.id);
    if (existingIndex >= 0) {
      allDocs[existingIndex] = doc;
    } else {
      allDocs.push(doc);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allDocs));
  } catch (error) {
    logger.error('❌ Failed to save to localStorage:', error);
  }
}

function deleteLocalDocument(docId: string): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    const allDocs = JSON.parse(data) as ProjectDocument[];
    const filtered = allDocs.filter(d => d.id !== docId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('❌ Failed to delete from localStorage:', error);
  }
}

// ============================================================================
// API Call Wrapper
// ============================================================================

async function apiCall<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }
  
  return response.json();
}

// ============================================================================
// CRUD Operations (API-first with localStorage fallback)
// ============================================================================

/**
 * Create a new document with version 1.
 *
 * @param projectId           Project this document belongs to.
 * @param baseTitle           Root document title (no version suffix). Must be
 *                            1-200 characters after trimming; sanitized to
 *                            strip `<` and `>`.
 * @param content             Initial HTML content from the editor. Defaults
 *                            to an empty string.
 * @param worxdeskMetadata    Optional WORX DESK provenance metadata to
 *                            persist in the `worxdesk_metadata` jsonb column.
 *                            Pass a `WorxDeskMetadata` object only for
 *                            documents created through the WORX DESK on-ramp;
 *                            leave as the default `null` for every other
 *                            creation path (blank, template form, AI@Worx
 *                            tools). Backward compatible — existing call
 *                            sites that omit the parameter behave identically
 *                            to before.
 * @returns The created `ProjectDocument` with `worxdeskMetadata` round-
 *          tripped from the database row (null when not provided).
 */
export async function createDocument(
  projectId: string,
  baseTitle: string,
  content: string = '',
  worxdeskMetadata: WorxDeskMetadata | null = null
): Promise<ProjectDocument> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create document in non-browser environment');
  }
  
  const sanitizedTitle = validateBaseTitle(baseTitle);
  const now = new Date().toISOString();
  
  // Prepare document data
  const docData = {
    project_id: projectId,
    base_title: sanitizedTitle,
    title: sanitizedTitle,
    version: 1,
    content,
    metadata: {
      wordCount: calculateWordCount(content),
      charCount: calculateCharCount(content),
      tags: [],
    },
    worxdesk_metadata: worxdeskMetadata,
  };
  
  try {
    // Try API first
    const apiResponse = await apiCall<Record<string, unknown>>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(docData),
    });
    
    const newDoc = mapApiToDocument(apiResponse);
    logger.log('☁️ Document created in cloud:', newDoc.id);
    
    // Also save to localStorage for offline access
    saveLocalDocument(newDoc);
    
    return newDoc;
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    // Fallback: create locally
    const newDoc: ProjectDocument = {
      id: generateId(),
      projectId,
      baseTitle: sanitizedTitle,
      title: sanitizedTitle,
      version: 1,
      content,
      createdAt: now,
      modifiedAt: now,
      metadata: {
        wordCount: calculateWordCount(content),
        charCount: calculateCharCount(content),
        tags: [],
      },
      worxdeskMetadata,
    };
    
    saveLocalDocument(newDoc);
    logger.log('💾 Document created locally:', newDoc.id);
    
    return newDoc;
  }
}

/**
 * Create a new version of an existing document
 */
export async function createDocumentVersion(
  projectId: string,
  sourceDocId: string,
  newContent?: string
): Promise<ProjectDocument> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create document version in non-browser environment');
  }
  
  // Get source document
  const sourceDoc = await getDocument(projectId, sourceDocId);
  if (!sourceDoc) {
    throw new Error(`Source document not found: ${sourceDocId}`);
  }
  
  // Find highest version for this baseTitle
  const versions = await getDocumentVersions(projectId, sourceDoc.baseTitle);
  const highestVersion = Math.max(...versions.map(doc => doc.version), 0);
  const newVersion = highestVersion + 1;
  
  const content = newContent !== undefined ? newContent : sourceDoc.content;
  const now = new Date().toISOString();
  
  // Inherit WORX DESK metadata from the source document so v2/v3/... of a
  // WORX DESK doc preserve their full creation provenance. Documents created
  // outside the WORX DESK flow have `null` here, and `null` propagates.
  const inheritedWorxdeskMetadata: WorxDeskMetadata | null =
    sourceDoc.worxdeskMetadata ?? null;

  const docData = {
    project_id: projectId,
    base_title: sourceDoc.baseTitle,
    title: `${sourceDoc.baseTitle} v${newVersion}`,
    version: newVersion,
    parent_version_id: sourceDoc.id,
    content,
    metadata: {
      wordCount: calculateWordCount(content),
      charCount: calculateCharCount(content),
      templateId: sourceDoc.metadata?.templateId,
      tags: sourceDoc.metadata?.tags ? [...sourceDoc.metadata.tags] : [],
    },
    worxdesk_metadata: inheritedWorxdeskMetadata,
  };
  
  try {
    const apiResponse = await apiCall<Record<string, unknown>>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(docData),
    });
    
    const newDoc = mapApiToDocument(apiResponse);
    logger.log('☁️ Document version created in cloud:', newDoc.id);
    saveLocalDocument(newDoc);
    
    return newDoc;
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    const newDoc: ProjectDocument = {
      id: generateId(),
      projectId,
      baseTitle: sourceDoc.baseTitle,
      title: `${sourceDoc.baseTitle} v${newVersion}`,
      version: newVersion,
      parentVersionId: sourceDoc.id,
      content,
      createdAt: now,
      modifiedAt: now,
      metadata: {
        wordCount: calculateWordCount(content),
        charCount: calculateCharCount(content),
        templateId: sourceDoc.metadata?.templateId,
        tags: sourceDoc.metadata?.tags ? [...sourceDoc.metadata.tags] : [],
      },
      worxdeskMetadata: inheritedWorxdeskMetadata,
    };
    
    saveLocalDocument(newDoc);
    logger.log('💾 Document version created locally:', newDoc.id);
    
    return newDoc;
  }
}

/**
 * Get all documents for a project
 */
export async function getAllDocuments(projectId: string): Promise<ProjectDocument[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    const apiResponse = await apiCall<Record<string, unknown>[]>(
      `${API_BASE}?project_id=${encodeURIComponent(projectId)}`
    );
    
    const docs = apiResponse.map(mapApiToDocument);
    logger.log(`☁️ Fetched ${docs.length} documents from cloud`);
    
    // Update localStorage with latest data
    docs.forEach(doc => saveLocalDocument(doc));
    
    return docs;
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    const localDocs = getLocalDocuments(projectId);
    logger.log(`💾 Loaded ${localDocs.length} documents from localStorage`);
    
    return localDocs.sort((a, b) => 
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );
  }
}

/**
 * Get a single document by ID
 */
export async function getDocument(
  projectId: string,
  docId: string
): Promise<ProjectDocument | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const apiResponse = await apiCall<Record<string, unknown>>(
      `${API_BASE}?id=${encodeURIComponent(docId)}`
    );
    
    const doc = mapApiToDocument(apiResponse);
    logger.log('☁️ Document fetched from cloud:', doc.id);
    saveLocalDocument(doc);
    
    return doc;
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    const localDocs = getLocalDocuments(projectId);
    const doc = localDocs.find(d => d.id === docId) || null;
    
    if (doc) {
      logger.log('💾 Document loaded from localStorage:', doc.id);
    } else {
      logger.warn(`⚠️ Document not found: ${docId}`);
    }
    
    return doc;
  }
}

/**
 * Get all versions of a document by baseTitle
 */
export async function getDocumentVersions(
  projectId: string,
  baseTitle: string
): Promise<ProjectDocument[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    const apiResponse = await apiCall<Record<string, unknown>[]>(
      `${API_BASE}?project_id=${encodeURIComponent(projectId)}&base_title=${encodeURIComponent(baseTitle)}`
    );
    
    const docs = apiResponse.map(mapApiToDocument);
    logger.log(`☁️ Fetched ${docs.length} versions for "${baseTitle}"`);
    
    return docs.sort((a, b) => a.version - b.version);
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    const localDocs = getLocalDocuments(projectId);
    const versions = localDocs.filter(doc => doc.baseTitle === baseTitle);
    
    logger.log(`💾 Found ${versions.length} versions locally for "${baseTitle}"`);
    
    return versions.sort((a, b) => a.version - b.version);
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  projectId: string,
  docId: string,
  updates: Partial<ProjectDocument>
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update document in non-browser environment');
  }
  
  // Calculate metadata if content changed
  if (updates.content !== undefined) {
    updates.metadata = {
      ...updates.metadata,
      wordCount: calculateWordCount(updates.content),
      charCount: calculateCharCount(updates.content),
    };
  }
  
  // Validate baseTitle if being updated
  if (updates.baseTitle !== undefined) {
    updates.baseTitle = validateBaseTitle(updates.baseTitle);
  }
  
  // FIX: Get existing document BEFORE API call to avoid race condition
  // If we fetch AFTER the API call, we might get stale cached data
  const localDocs = getLocalDocuments(projectId);
  const docIndex = localDocs.findIndex(d => d.id === docId);
  
  if (docIndex === -1) {
    throw new Error(`Document not found: ${docId}`);
  }
  
  const existingDoc = localDocs[docIndex];
  
  try {
    await apiCall(API_BASE, {
      method: 'PUT',
      body: JSON.stringify({
        id: docId,
        ...mapDocumentToApi(updates),
      }),
    });
    
    logger.log('☁️ Document updated in cloud:', docId);
    
    // FIX: Update localStorage with known updates, not by re-fetching
    // This prevents race conditions where the API returns stale data
    const updatedDoc = { 
      ...existingDoc, 
      ...updates, 
      modifiedAt: new Date().toISOString() 
    };
    saveLocalDocument(updatedDoc);
    logger.log('💾 Document also updated in localStorage:', docId);
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    // Fallback: update locally only
    const updatedDoc = {
      ...existingDoc,
      ...updates,
      modifiedAt: new Date().toISOString(),
    };
    
    saveLocalDocument(updatedDoc);
    logger.log('💾 Document updated locally (offline mode):', docId);
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(
  projectId: string,
  docId: string
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete document in non-browser environment');
  }
  
  try {
    await apiCall(`${API_BASE}?id=${encodeURIComponent(docId)}`, {
      method: 'DELETE',
    });
    
    logger.log('☁️ Document deleted from cloud:', docId);
    deleteLocalDocument(docId);
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    deleteLocalDocument(docId);
    logger.log('💾 Document deleted locally:', docId);
  }
}

/**
 * Rename a document to a new document family
 */
export async function renameDocument(
  projectId: string,
  docId: string,
  newBaseTitle: string
): Promise<ProjectDocument> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot rename document in non-browser environment');
  }
  
  const sanitizedTitle = validateBaseTitle(newBaseTitle);
  
  try {
    const apiResponse = await apiCall<Record<string, unknown>>(API_BASE, {
      method: 'PUT',
      body: JSON.stringify({
        id: docId,
        base_title: sanitizedTitle,
        title: sanitizedTitle,
      }),
    });
    
    const renamedDoc = mapApiToDocument(apiResponse);
    logger.log('☁️ Document renamed in cloud:', renamedDoc.id);
    saveLocalDocument(renamedDoc);
    
    return renamedDoc;
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    const localDocs = getLocalDocuments(projectId);
    const docIndex = localDocs.findIndex(d => d.id === docId);
    
    if (docIndex === -1) {
      throw new Error(`Document not found: ${docId}`);
    }
    
    const existingDoc = localDocs[docIndex];
    const renamedDoc: ProjectDocument = {
      ...existingDoc,
      baseTitle: sanitizedTitle,
      title: sanitizedTitle,
      version: 1,
      parentVersionId: undefined,
      modifiedAt: new Date().toISOString(),
    };
    
    saveLocalDocument(renamedDoc);
    logger.log('💾 Document renamed locally:', renamedDoc.id);
    
    return renamedDoc;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the latest version of a document by baseTitle
 */
export async function getLatestVersion(
  projectId: string,
  baseTitle: string
): Promise<ProjectDocument | null> {
  const versions = await getDocumentVersions(projectId, baseTitle);
  
  if (versions.length === 0) {
    return null;
  }
  
  return versions[versions.length - 1];
}

/**
 * Check if a document has multiple versions
 */
export async function hasMultipleVersions(
  projectId: string,
  baseTitle: string
): Promise<boolean> {
  const versions = await getDocumentVersions(projectId, baseTitle);
  return versions.length > 1;
}

/**
 * Get unique base titles (document groups) for a project
 */
export async function getUniqueBaseTitles(projectId: string): Promise<string[]> {
  const documents = await getAllDocuments(projectId);
  const baseTitles = new Set(documents.map(doc => doc.baseTitle));
  return Array.from(baseTitles);
}
