/**
 * @file lib/storage/supabase-storage.ts
 * @description Supabase-based storage layer for CopyWorx
 * 
 * This module provides an abstraction layer over the Supabase API routes,
 * offering a similar interface to the localStorage-based storage while
 * enabling cloud persistence and cross-device sync.
 * 
 * ARCHITECTURE:
 * - Browser calls these functions
 * - Functions call API routes (/api/db/*)
 * - API routes interact with Supabase
 * - Data syncs across devices
 */

'use client';

import { isSupabaseConfigured } from '@/lib/supabase';
import type { Project, Persona, Folder, ProjectDocument } from '@/lib/types/project';
import type { BrandVoice } from '@/lib/types/brand';
import type { Snippet, CreateSnippetInput, UpdateSnippetInput } from '@/lib/types/snippet';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

interface ApiError {
  error: string;
  details?: string;
}

interface SyncedProject {
  id: string;
  name: string;
  brandVoice: BrandVoice | null;
  personas: Persona[];
  folders: Folder[];
  documents: ProjectDocument[];
  snippets: Snippet[];
  createdAt: string;
  updatedAt: string;
}

interface SyncResponse {
  projects: SyncedProject[];
  activeProjectId: string | null;
  lastSyncedAt: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if Supabase storage is available
 */
export function isCloudStorageAvailable(): boolean {
  return isSupabaseConfigured();
}

/**
 * Generic API call wrapper with error handling
 */
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
    const errorData: ApiError = await response.json().catch(() => ({
      error: 'Request failed',
      details: `Status: ${response.status}`,
    }));
    throw new Error(errorData.details || errorData.error);
  }

  return response.json();
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Fetch all projects with nested data from Supabase
 * Returns data in the format expected by the application
 */
export async function syncAllProjects(): Promise<{
  projects: Project[];
  activeProjectId: string | null;
}> {
  if (!isCloudStorageAvailable()) {
    throw new Error('Cloud storage is not configured');
  }

  const data = await apiCall<SyncResponse>('/api/db/sync');

  // Convert synced projects to the Project format
  const projects: Project[] = data.projects.map(sp => ({
    id: sp.id,
    name: sp.name,
    brandVoice: sp.brandVoice,
    personas: sp.personas,
    folders: sp.folders,
    documents: sp.documents,
    snippets: sp.snippets,
    createdAt: sp.createdAt,
    updatedAt: sp.updatedAt,
  }));

  return {
    projects,
    activeProjectId: data.activeProjectId,
  };
}

// ============================================================================
// Project Operations
// ============================================================================

/**
 * Create a new project in Supabase
 */
export async function cloudCreateProject(name: string): Promise<Project> {
  const data = await apiCall<{ id: string; name: string; created_at: string; updated_at: string }>(
    '/api/db/projects',
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    }
  );

  // Return in Project format with empty arrays for nested data
  return {
    id: data.id,
    name: data.name,
    brandVoice: null,
    personas: [],
    folders: [],
    documents: [],
    snippets: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Update a project in Supabase
 */
export async function cloudUpdateProject(
  id: string,
  updates: Partial<Pick<Project, 'name'>>
): Promise<void> {
  await apiCall('/api/db/projects', {
    method: 'PUT',
    body: JSON.stringify({ id, ...updates }),
  });
}

/**
 * Delete a project from Supabase
 */
export async function cloudDeleteProject(id: string): Promise<void> {
  await apiCall(`/api/db/projects?id=${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Document Operations
// ============================================================================

/**
 * Create a new document in Supabase
 */
export async function cloudCreateDocument(
  projectId: string,
  baseTitle: string,
  content: string = '',
  options?: {
    version?: number;
    parentVersionId?: string;
    folderId?: string;
    metadata?: Record<string, unknown>;
    templateProgress?: unknown;
  }
): Promise<ProjectDocument> {
  const data = await apiCall<Record<string, unknown>>('/api/db/documents', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      base_title: baseTitle,
      title: options?.version && options.version > 1 
        ? `${baseTitle} v${options.version}` 
        : baseTitle,
      content,
      version: options?.version || 1,
      parent_version_id: options?.parentVersionId,
      folder_id: options?.folderId,
      metadata: options?.metadata || {},
      template_progress: options?.templateProgress,
    }),
  });

  return {
    id: data.id as string,
    projectId: data.project_id as string,
    baseTitle: data.base_title as string,
    title: data.title as string,
    version: data.version as number,
    parentVersionId: data.parent_version_id as string | undefined,
    folderId: data.folder_id as string | undefined,
    content: data.content as string,
    createdAt: data.created_at as string,
    modifiedAt: data.modified_at as string,
    metadata: data.metadata as ProjectDocument['metadata'],
    templateProgress: data.template_progress as ProjectDocument['templateProgress'],
  };
}

/**
 * Update a document in Supabase
 */
export async function cloudUpdateDocument(
  id: string,
  updates: Partial<Pick<ProjectDocument, 'baseTitle' | 'title' | 'content' | 'folderId' | 'metadata' | 'templateProgress'>>
): Promise<void> {
  const apiUpdates: Record<string, unknown> = {};
  
  if (updates.baseTitle !== undefined) apiUpdates.base_title = updates.baseTitle;
  if (updates.title !== undefined) apiUpdates.title = updates.title;
  if (updates.content !== undefined) apiUpdates.content = updates.content;
  if (updates.folderId !== undefined) apiUpdates.folder_id = updates.folderId;
  if (updates.metadata !== undefined) apiUpdates.metadata = updates.metadata;
  if (updates.templateProgress !== undefined) apiUpdates.template_progress = updates.templateProgress;

  await apiCall('/api/db/documents', {
    method: 'PUT',
    body: JSON.stringify({ id, ...apiUpdates }),
  });
}

/**
 * Delete a document from Supabase
 */
export async function cloudDeleteDocument(id: string): Promise<void> {
  await apiCall(`/api/db/documents?id=${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get a single document by ID from Supabase
 */
export async function cloudGetDocument(id: string): Promise<ProjectDocument | null> {
  try {
    const data = await apiCall<Record<string, unknown>>(`/api/db/documents?id=${id}`);
    
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      baseTitle: data.base_title as string,
      title: data.title as string,
      version: data.version as number,
      parentVersionId: data.parent_version_id as string | undefined,
      folderId: data.folder_id as string | undefined,
      content: data.content as string,
      createdAt: data.created_at as string,
      modifiedAt: data.modified_at as string,
      metadata: data.metadata as ProjectDocument['metadata'],
      templateProgress: data.template_progress as ProjectDocument['templateProgress'],
    };
  } catch (error) {
    // Return null if document not found
    if (error instanceof Error && error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get all documents for a project from Supabase
 */
export async function cloudGetAllDocuments(projectId: string): Promise<ProjectDocument[]> {
  const data = await apiCall<Array<Record<string, unknown>>>(`/api/db/documents?project_id=${projectId}`);
  
  return data.map(doc => ({
    id: doc.id as string,
    projectId: doc.project_id as string,
    baseTitle: doc.base_title as string,
    title: doc.title as string,
    version: doc.version as number,
    parentVersionId: doc.parent_version_id as string | undefined,
    folderId: doc.folder_id as string | undefined,
    content: doc.content as string,
    createdAt: doc.created_at as string,
    modifiedAt: doc.modified_at as string,
    metadata: doc.metadata as ProjectDocument['metadata'],
    templateProgress: doc.template_progress as ProjectDocument['templateProgress'],
  }));
}

/**
 * Get document versions by base title from Supabase
 */
export async function cloudGetDocumentVersions(
  projectId: string,
  baseTitle: string
): Promise<ProjectDocument[]> {
  const data = await apiCall<Array<Record<string, unknown>>>(
    `/api/db/documents?project_id=${projectId}&base_title=${encodeURIComponent(baseTitle)}`
  );
  
  // Sort by version number ascending
  const docs = data.map(doc => ({
    id: doc.id as string,
    projectId: doc.project_id as string,
    baseTitle: doc.base_title as string,
    title: doc.title as string,
    version: doc.version as number,
    parentVersionId: doc.parent_version_id as string | undefined,
    folderId: doc.folder_id as string | undefined,
    content: doc.content as string,
    createdAt: doc.created_at as string,
    modifiedAt: doc.modified_at as string,
    metadata: doc.metadata as ProjectDocument['metadata'],
    templateProgress: doc.template_progress as ProjectDocument['templateProgress'],
  }));
  
  return docs.sort((a, b) => a.version - b.version);
}

/**
 * Rename a document in Supabase (creates new document family)
 */
export async function cloudRenameDocument(
  id: string,
  newBaseTitle: string
): Promise<ProjectDocument> {
  // Rename by updating base_title, title, resetting version to 1, and clearing parent
  const data = await apiCall<Record<string, unknown>>('/api/db/documents', {
    method: 'PUT',
    body: JSON.stringify({
      id,
      base_title: newBaseTitle.trim(),
      title: newBaseTitle.trim(),
      // Note: version and parent_version_id reset is handled server-side for rename operations
    }),
  });

  return {
    id: data.id as string,
    projectId: data.project_id as string,
    baseTitle: data.base_title as string,
    title: data.title as string,
    version: data.version as number,
    parentVersionId: data.parent_version_id as string | undefined,
    folderId: data.folder_id as string | undefined,
    content: data.content as string,
    createdAt: data.created_at as string,
    modifiedAt: data.modified_at as string,
    metadata: data.metadata as ProjectDocument['metadata'],
    templateProgress: data.template_progress as ProjectDocument['templateProgress'],
  };
}

/**
 * Create a new document version in Supabase
 */
export async function cloudCreateDocumentVersion(
  projectId: string,
  sourceDocId: string,
  newContent?: string
): Promise<ProjectDocument> {
  // First, get the source document to find baseTitle and current highest version
  const sourceDoc = await cloudGetDocument(sourceDocId);
  if (!sourceDoc) {
    throw new Error(`Source document not found: ${sourceDocId}`);
  }

  // Get all versions to find the highest version number
  const versions = await cloudGetDocumentVersions(projectId, sourceDoc.baseTitle);
  const highestVersion = versions.length > 0 
    ? Math.max(...versions.map(v => v.version))
    : 1;
  const newVersion = highestVersion + 1;

  // Create the new version
  return cloudCreateDocument(projectId, sourceDoc.baseTitle, newContent ?? sourceDoc.content, {
    version: newVersion,
    parentVersionId: sourceDocId,
    folderId: sourceDoc.folderId,
    metadata: sourceDoc.metadata,
    templateProgress: sourceDoc.templateProgress,
  });
}

// ============================================================================
// Brand Voice Operations
// ============================================================================

/**
 * Save brand voice to Supabase (creates or updates)
 */
export async function cloudSaveBrandVoice(
  projectId: string,
  brandVoice: BrandVoice
): Promise<void> {
  await apiCall('/api/db/brand-voices', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      brand_name: brandVoice.brandName,
      brand_tone: brandVoice.brandTone,
      approved_phrases: brandVoice.approvedPhrases,
      forbidden_words: brandVoice.forbiddenWords,
      brand_values: brandVoice.brandValues,
      mission_statement: brandVoice.missionStatement,
    }),
  });
}

/**
 * Delete brand voice from Supabase
 */
export async function cloudDeleteBrandVoice(projectId: string): Promise<void> {
  await apiCall(`/api/db/brand-voices?project_id=${projectId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Persona Operations
// ============================================================================

/**
 * Create a new persona in Supabase
 */
export async function cloudCreatePersona(
  projectId: string,
  personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Persona> {
  const data = await apiCall<Record<string, unknown>>('/api/db/personas', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      name: personaData.name,
      photo_url: personaData.photoUrl,
      demographics: personaData.demographics,
      psychographics: personaData.psychographics,
      pain_points: personaData.painPoints,
      language_patterns: personaData.languagePatterns,
      goals: personaData.goals,
    }),
  });

  return {
    id: data.id as string,
    name: data.name as string,
    photoUrl: data.photo_url as string | undefined,
    demographics: data.demographics as string,
    psychographics: data.psychographics as string,
    painPoints: data.pain_points as string,
    languagePatterns: data.language_patterns as string,
    goals: data.goals as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Update a persona in Supabase
 */
export async function cloudUpdatePersona(
  id: string,
  updates: Partial<Omit<Persona, 'id' | 'createdAt'>>
): Promise<void> {
  const apiUpdates: Record<string, unknown> = {};
  
  if (updates.name !== undefined) apiUpdates.name = updates.name;
  if (updates.photoUrl !== undefined) apiUpdates.photo_url = updates.photoUrl;
  if (updates.demographics !== undefined) apiUpdates.demographics = updates.demographics;
  if (updates.psychographics !== undefined) apiUpdates.psychographics = updates.psychographics;
  if (updates.painPoints !== undefined) apiUpdates.pain_points = updates.painPoints;
  if (updates.languagePatterns !== undefined) apiUpdates.language_patterns = updates.languagePatterns;
  if (updates.goals !== undefined) apiUpdates.goals = updates.goals;

  await apiCall('/api/db/personas', {
    method: 'PUT',
    body: JSON.stringify({ id, ...apiUpdates }),
  });
}

/**
 * Delete a persona from Supabase
 */
export async function cloudDeletePersona(id: string): Promise<void> {
  await apiCall(`/api/db/personas?id=${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Folder Operations
// ============================================================================

/**
 * Create a new folder in Supabase
 */
export async function cloudCreateFolder(
  projectId: string,
  name: string,
  parentFolderId?: string
): Promise<Folder> {
  const data = await apiCall<Record<string, unknown>>('/api/db/folders', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      name,
      parent_folder_id: parentFolderId,
    }),
  });

  return {
    id: data.id as string,
    name: data.name as string,
    projectId: data.project_id as string,
    parentFolderId: data.parent_folder_id as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Update a folder in Supabase
 */
export async function cloudUpdateFolder(
  id: string,
  updates: Partial<Pick<Folder, 'name' | 'parentFolderId'>>
): Promise<void> {
  const apiUpdates: Record<string, unknown> = {};
  
  if (updates.name !== undefined) apiUpdates.name = updates.name;
  if (updates.parentFolderId !== undefined) apiUpdates.parent_folder_id = updates.parentFolderId;

  await apiCall('/api/db/folders', {
    method: 'PUT',
    body: JSON.stringify({ id, ...apiUpdates }),
  });
}

/**
 * Delete a folder from Supabase
 */
export async function cloudDeleteFolder(id: string, force: boolean = false): Promise<void> {
  await apiCall(`/api/db/folders?id=${id}${force ? '&force=true' : ''}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Snippet Operations
// ============================================================================

/**
 * Create a new snippet in Supabase
 */
export async function cloudCreateSnippet(
  projectId: string,
  input: CreateSnippetInput
): Promise<Snippet> {
  const data = await apiCall<Record<string, unknown>>('/api/db/snippets', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      name: input.name,
      content: input.content,
      description: input.description,
      tags: input.tags,
    }),
  });

  return {
    id: data.id as string,
    projectId: data.project_id as string,
    name: data.name as string,
    content: data.content as string,
    description: data.description as string | undefined,
    tags: data.tags as string[] | undefined,
    createdAt: data.created_at as string,
    modifiedAt: data.modified_at as string,
    usageCount: data.usage_count as number,
  };
}

/**
 * Update a snippet in Supabase
 */
export async function cloudUpdateSnippet(
  id: string,
  updates: UpdateSnippetInput
): Promise<void> {
  await apiCall('/api/db/snippets', {
    method: 'PUT',
    body: JSON.stringify({ id, ...updates }),
  });
}

/**
 * Increment snippet usage count
 */
export async function cloudIncrementSnippetUsage(id: string): Promise<void> {
  await apiCall(`/api/db/snippets?id=${id}`, {
    method: 'PATCH',
  });
}

/**
 * Delete a snippet from Supabase
 */
export async function cloudDeleteSnippet(id: string): Promise<void> {
  await apiCall(`/api/db/snippets?id=${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// User Settings Operations
// ============================================================================

/**
 * Get user settings from Supabase
 */
export async function cloudGetUserSettings(): Promise<{
  activeProjectId: string | null;
  settings: Record<string, unknown>;
}> {
  const data = await apiCall<{
    active_project_id: string | null;
    settings: Record<string, unknown>;
  }>('/api/db/user-settings');

  return {
    activeProjectId: data.active_project_id,
    settings: data.settings,
  };
}

/**
 * Update user settings in Supabase
 */
export async function cloudUpdateUserSettings(updates: {
  activeProjectId?: string | null;
  settings?: Record<string, unknown>;
}): Promise<void> {
  await apiCall('/api/db/user-settings', {
    method: 'POST',
    body: JSON.stringify({
      active_project_id: updates.activeProjectId,
      settings: updates.settings,
    }),
  });
}

// ============================================================================
// Migration Operations
// ============================================================================

interface MigrationResult {
  success: boolean;
  migrated: {
    projects: number;
    brandVoices: number;
    personas: number;
    folders: number;
    documents: number;
    snippets: number;
  };
  errors: string[];
  idMapping: Record<string, string>;
}

/**
 * Migrate localStorage data to Supabase
 */
export async function migrateToCloud(
  projects: Project[],
  activeProjectId?: string
): Promise<MigrationResult> {
  // Transform projects to migration format
  const migrationProjects = projects.map(p => ({
    id: p.id,
    name: p.name,
    brandVoice: p.brandVoice,
    personas: p.personas,
    folders: p.folders,
    documents: p.documents,
    snippets: p.snippets,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const result = await apiCall<MigrationResult>('/api/db/migrate', {
    method: 'POST',
    body: JSON.stringify({
      projects: migrationProjects,
      activeProjectId,
    }),
  });

  logger.log('📤 Migration result:', result);

  return result;
}
