/**
 * @file lib/storage/unified-storage.ts
 * @description Unified storage layer with localStorage fallback and Supabase cloud sync
 * 
 * This module provides a seamless storage interface that:
 * 1. Uses Supabase when available for cloud persistence
 * 2. Falls back to localStorage when offline or Supabase unavailable
 * 3. Provides migration utilities for existing users
 * 4. Handles sync conflicts gracefully
 * 
 * PRIORITY: Supabase (cloud) > localStorage (fallback)
 */

'use client';

import type { Project, Persona, Folder, ProjectDocument } from '@/lib/types/project';
import type { BrandVoice } from '@/lib/types/brand';
import type { Snippet, CreateSnippetInput, UpdateSnippetInput } from '@/lib/types/snippet';

// Import localStorage-based storage (existing)
import * as localProjectStorage from './project-storage';
import * as localDocumentStorage from './document-storage';
import * as localPersonaStorage from './persona-storage';
import * as localFolderStorage from './folder-storage';
import * as localSnippetStorage from './snippet-storage';

// Import Supabase-based storage (new)
import * as cloudStorage from './supabase-storage';

import { logger } from '@/lib/utils/logger';

// ============================================================================
// Storage Mode Configuration
// ============================================================================

/** Storage mode - determines where data is saved/loaded */
type StorageMode = 'cloud' | 'local' | 'hybrid';

/** Current storage mode */
let currentMode: StorageMode = 'hybrid';

/** Flag to track if migration has been checked */
let migrationChecked = false;

/** Local storage key for migration status */
const MIGRATION_STATUS_KEY = 'copyworx_supabase_migrated';

/**
 * Check if cloud storage is available and configured
 */
export function isCloudAvailable(): boolean {
  return cloudStorage.isCloudStorageAvailable();
}

/**
 * Check if migration to cloud has been completed
 */
export function isMigrationComplete(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MIGRATION_STATUS_KEY) === 'true';
}

/**
 * Mark migration as complete
 */
export function markMigrationComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MIGRATION_STATUS_KEY, 'true');
}

/**
 * Set the storage mode
 */
export function setStorageMode(mode: StorageMode): void {
  currentMode = mode;
  logger.log(`📦 Storage mode set to: ${mode}`);
}

/**
 * Get the current storage mode
 */
export function getStorageMode(): StorageMode {
  return currentMode;
}

// ============================================================================
// Migration Utilities
// ============================================================================

/**
 * Check if there's localStorage data that needs migration
 */
export function hasLocalDataToMigrate(): boolean {
  if (typeof window === 'undefined') return false;
  
  const localProjects = localProjectStorage.getAllProjects();
  return localProjects.length > 0 && !isMigrationComplete();
}

/**
 * Migrate localStorage data to Supabase
 * This is a one-time operation for existing users
 */
export async function migrateLocalToCloud(): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
}> {
  if (!isCloudAvailable()) {
    return { success: false, migrated: 0, errors: ['Cloud storage not configured'] };
  }

  if (isMigrationComplete()) {
    return { success: true, migrated: 0, errors: [] };
  }

  try {
    // Get all local projects with their data
    const localProjects = localProjectStorage.getAllProjects();
    const activeProjectId = localProjectStorage.getActiveProjectId();

    if (localProjects.length === 0) {
      markMigrationComplete();
      return { success: true, migrated: 0, errors: [] };
    }

    logger.log('🔄 Starting migration of', localProjects.length, 'projects');

    // Call the migration API
    const result = await cloudStorage.migrateToCloud(localProjects, activeProjectId || undefined);

    if (result.success) {
      markMigrationComplete();
      logger.log('✅ Migration completed successfully');
    } else {
      logger.warn('⚠️ Migration completed with errors:', result.errors);
    }

    return {
      success: result.success,
      migrated: result.migrated.projects,
      errors: result.errors,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Migration failed:', errorMessage);
    return { success: false, migrated: 0, errors: [errorMessage] };
  }
}

// ============================================================================
// Unified Project Operations
// ============================================================================

/**
 * Get all projects (from cloud or local)
 */
export async function getAllProjects(): Promise<Project[]> {
  // If cloud is available and we should use it
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      const { projects } = await cloudStorage.syncAllProjects();
      logger.log('☁️ Loaded', projects.length, 'projects from cloud');
      
      // FIX: Sync projects to localStorage so other storage layers can access them
      // This prevents "Project not found" errors from snippet-storage, folder-storage, etc.
      if (typeof window !== 'undefined' && projects.length > 0) {
        try {
          localStorage.setItem('copyworx_projects', JSON.stringify(projects));
          logger.log('💾 Synced projects to localStorage for compatibility');
        } catch (error) {
          logger.warn('⚠️ Failed to sync projects to localStorage:', error);
        }
      }
      
      return projects;
    } catch (error) {
      logger.warn('⚠️ Cloud fetch failed, falling back to local:', error);
      // Fall through to local storage
    }
  }

  // Fallback to local storage
  const projects = localProjectStorage.getAllProjects();
  logger.log('💾 Loaded', projects.length, 'projects from localStorage');
  return projects;
}

/**
 * Create a new project
 */
export async function createProject(name: string): Promise<Project> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      const project = await cloudStorage.cloudCreateProject(name);
      logger.log('☁️ Project created in cloud:', project.id);
      return project;
    } catch (error) {
      logger.warn('⚠️ Cloud create failed, falling back to local:', error);
    }
  }

  // Fallback to local
  const project = localProjectStorage.createProject(name);
  logger.log('💾 Project created locally:', project.id);
  return project;
}

/**
 * Update a project
 */
export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudUpdateProject(id, { name: updates.name });
      logger.log('☁️ Project updated in cloud:', id);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud update failed, falling back to local:', error);
    }
  }

  // Fallback to local
  localProjectStorage.updateProject(id, updates);
  logger.log('💾 Project updated locally:', id);
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudDeleteProject(id);
      logger.log('☁️ Project deleted from cloud:', id);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud delete failed, falling back to local:', error);
    }
  }

  // Fallback to local
  localProjectStorage.deleteProject(id);
  logger.log('💾 Project deleted locally:', id);
}

/**
 * Get active project ID
 */
export async function getActiveProjectId(): Promise<string | null> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      const { activeProjectId } = await cloudStorage.cloudGetUserSettings();
      return activeProjectId;
    } catch (error) {
      logger.warn('⚠️ Cloud settings fetch failed, falling back to local:', error);
    }
  }

  return localProjectStorage.getActiveProjectId();
}

/**
 * Set active project ID
 */
export async function setActiveProjectId(id: string): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudUpdateUserSettings({ activeProjectId: id });
      logger.log('☁️ Active project set in cloud:', id);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud settings update failed, falling back to local:', error);
    }
  }

  localProjectStorage.setActiveProjectId(id);
  logger.log('💾 Active project set locally:', id);
}

// ============================================================================
// Unified Document Operations
// Re-export from document-storage.ts which now handles API + localStorage internally
// ============================================================================

export {
  createDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  getAllDocuments,
  getDocumentVersions,
  renameDocument,
  createDocumentVersion,
  getLatestVersion,
} from './document-storage';

// ============================================================================
// Unified Brand Voice Operations
// ============================================================================

/**
 * Save brand voice to project
 */
export async function saveBrandVoice(projectId: string, brandVoice: BrandVoice): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudSaveBrandVoice(projectId, brandVoice);
      logger.log('☁️ Brand voice saved to cloud');
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud save failed, falling back to local:', error);
    }
  }

  localProjectStorage.saveBrandVoiceToProject(projectId, brandVoice);
  logger.log('💾 Brand voice saved locally');
}

/**
 * Delete brand voice from project
 */
export async function deleteBrandVoice(projectId: string): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudDeleteBrandVoice(projectId);
      logger.log('☁️ Brand voice deleted from cloud');
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud delete failed, falling back to local:', error);
    }
  }

  localProjectStorage.deleteBrandVoiceFromProject(projectId);
  logger.log('💾 Brand voice deleted locally');
}

// ============================================================================
// Unified Persona Operations
// Re-export from persona-storage.ts which now handles API + localStorage internally
// ============================================================================

export {
  createPersona,
  updatePersona,
  deletePersona,
  getProjectPersonas,
  getPersona,
} from './persona-storage';

// ============================================================================
// Unified Folder Operations
// ============================================================================

/**
 * Create a new folder
 */
export async function createFolder(
  projectId: string,
  name: string,
  parentFolderId?: string
): Promise<Folder> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      const folder = await cloudStorage.cloudCreateFolder(projectId, name, parentFolderId);
      logger.log('☁️ Folder created in cloud:', folder.id);
      return folder;
    } catch (error) {
      logger.warn('⚠️ Cloud create failed, falling back to local:', error);
    }
  }

  const folder = localFolderStorage.createFolder(projectId, name, parentFolderId);
  logger.log('💾 Folder created locally:', folder.id);
  return folder;
}

/**
 * Update a folder
 */
export async function updateFolder(
  projectId: string,
  folderId: string,
  updates: Partial<Pick<Folder, 'name'>>
): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudUpdateFolder(folderId, updates);
      logger.log('☁️ Folder updated in cloud:', folderId);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud update failed, falling back to local:', error);
    }
  }

  localFolderStorage.updateFolder(projectId, folderId, updates);
  logger.log('💾 Folder updated locally:', folderId);
}

/**
 * Delete a folder
 */
export async function deleteFolder(projectId: string, folderId: string): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudDeleteFolder(folderId);
      logger.log('☁️ Folder deleted from cloud:', folderId);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud delete failed, falling back to local:', error);
    }
  }

  localFolderStorage.deleteFolder(projectId, folderId);
  logger.log('💾 Folder deleted locally:', folderId);
}

/**
 * Get all folders for a project
 */
export async function getAllFolders(projectId: string): Promise<Folder[]> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      const { projects } = await cloudStorage.syncAllProjects();
      const project = projects.find(p => p.id === projectId);
      const folders = project?.folders || [];
      logger.log('☁️ Loaded', folders.length, 'folders from cloud');
      return folders;
    } catch (error) {
      logger.warn('⚠️ Cloud fetch failed, falling back to local:', error);
    }
  }

  const folders = localFolderStorage.getAllFolders(projectId);
  logger.log('💾 Loaded', folders.length, 'folders locally');
  return folders;
}

/**
 * Move a folder to a new parent
 */
export async function moveFolder(
  projectId: string,
  folderId: string,
  newParentFolderId: string | null
): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudUpdateFolder(folderId, { parentFolderId: newParentFolderId || undefined });
      logger.log('☁️ Folder moved in cloud:', folderId);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud move failed, falling back to local:', error);
    }
  }

  localFolderStorage.moveFolder(projectId, folderId, newParentFolderId);
  logger.log('💾 Folder moved locally:', folderId);
}

// ============================================================================
// Brand Voice Aliases (for backward compatibility)
// ============================================================================

/**
 * Alias for saveBrandVoice (matches project-storage API)
 */
export const saveBrandVoiceToProject = saveBrandVoice;

/**
 * Alias for deleteBrandVoice (matches project-storage API)
 */
export const deleteBrandVoiceFromProject = deleteBrandVoice;

// ============================================================================
// Unified Snippet Operations
// ============================================================================

/**
 * Sync a cloud snippet into localStorage for immediate read availability.
 * This prevents data loss when refreshProjects() overwrites localStorage
 * with Supabase data before the next full sync includes the new snippet.
 */
function syncSnippetToLocalStorage(projectId: string, snippet: Snippet): void {
  try {
    const projects = localProjectStorage.getAllProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      logger.warn('⚠️ Cannot sync snippet to localStorage: project not found', projectId);
      return;
    }

    const project = projects[projectIndex];
    const existingSnippets: Snippet[] = Array.isArray(project.snippets) ? project.snippets : [];

    // Avoid duplicates - replace if same ID exists, otherwise append
    const snippetIndex = existingSnippets.findIndex(s => s.id === snippet.id);
    const updatedSnippets = [...existingSnippets];
    if (snippetIndex >= 0) {
      updatedSnippets[snippetIndex] = snippet;
    } else {
      updatedSnippets.push(snippet);
    }

    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = { ...project, snippets: updatedSnippets };
    localStorage.setItem('copyworx_projects', JSON.stringify(updatedProjects));
    logger.log('💾 Snippet synced to localStorage for immediate access:', snippet.id);
  } catch (error) {
    logger.warn('⚠️ Failed to sync snippet to localStorage:', error);
  }
}

/**
 * Remove a snippet from localStorage after a cloud delete.
 */
function removeSnippetFromLocalStorage(projectId: string, snippetId: string): void {
  try {
    const projects = localProjectStorage.getAllProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;

    const project = projects[projectIndex];
    const existingSnippets: Snippet[] = Array.isArray(project.snippets) ? project.snippets : [];
    const updatedSnippets = existingSnippets.filter(s => s.id !== snippetId);

    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = { ...project, snippets: updatedSnippets };
    localStorage.setItem('copyworx_projects', JSON.stringify(updatedProjects));
    logger.log('💾 Snippet removed from localStorage:', snippetId);
  } catch (error) {
    logger.warn('⚠️ Failed to remove snippet from localStorage:', error);
  }
}

/**
 * Create a new snippet (cloud + localStorage dual write)
 */
export async function createSnippet(
  projectId: string,
  input: CreateSnippetInput
): Promise<Snippet> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      const snippet = await cloudStorage.cloudCreateSnippet(projectId, input);
      // Dual write: also save to localStorage for immediate read availability
      syncSnippetToLocalStorage(projectId, snippet);
      logger.log('☁️ Snippet created in cloud:', snippet.id);
      return snippet;
    } catch (error) {
      logger.warn('⚠️ Cloud create failed, falling back to local:', error);
    }
  }

  const snippet = localSnippetStorage.createSnippet(projectId, input);
  logger.log('💾 Snippet created locally:', snippet.id);
  return snippet;
}

/**
 * Update a snippet (cloud + localStorage dual write)
 */
export async function updateSnippet(
  projectId: string,
  snippetId: string,
  updates: UpdateSnippetInput
): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudUpdateSnippet(snippetId, updates);
      // Dual write: also update in localStorage
      localSnippetStorage.updateSnippet(projectId, snippetId, updates);
      logger.log('☁️ Snippet updated in cloud + localStorage:', snippetId);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud update failed, falling back to local:', error);
    }
  }

  localSnippetStorage.updateSnippet(projectId, snippetId, updates);
  logger.log('💾 Snippet updated locally:', snippetId);
}

/**
 * Delete a snippet (cloud + localStorage dual delete)
 */
export async function deleteSnippet(projectId: string, snippetId: string): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudDeleteSnippet(snippetId);
      // Dual write: also remove from localStorage
      removeSnippetFromLocalStorage(projectId, snippetId);
      logger.log('☁️ Snippet deleted from cloud + localStorage:', snippetId);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud delete failed, falling back to local:', error);
    }
  }

  localSnippetStorage.deleteSnippet(projectId, snippetId);
  logger.log('💾 Snippet deleted locally:', snippetId);
}

/**
 * Increment snippet usage (cloud + localStorage dual write)
 */
export async function incrementSnippetUsage(projectId: string, snippetId: string): Promise<void> {
  if (isCloudAvailable() && currentMode !== 'local') {
    try {
      await cloudStorage.cloudIncrementSnippetUsage(snippetId);
      // Dual write: also increment in localStorage
      localSnippetStorage.incrementSnippetUsage(projectId, snippetId);
      return;
    } catch (error) {
      logger.warn('⚠️ Cloud increment failed, falling back to local:', error);
    }
  }

  localSnippetStorage.incrementSnippetUsage(projectId, snippetId);
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize unified storage
 * Call this on app startup to check migration status and configure storage
 */
export async function initializeStorage(): Promise<{
  mode: StorageMode;
  migrationNeeded: boolean;
  migrationComplete: boolean;
}> {
  const cloudAvailable = isCloudAvailable();
  const migrationComplete = isMigrationComplete();
  const localDataExists = hasLocalDataToMigrate();

  logger.log('🔧 Storage initialization:', {
    cloudAvailable,
    migrationComplete,
    localDataExists,
  });

  // Determine mode
  if (cloudAvailable) {
    currentMode = 'hybrid'; // Use cloud with local fallback
  } else {
    currentMode = 'local'; // Local only
  }

  return {
    mode: currentMode,
    migrationNeeded: cloudAvailable && localDataExists && !migrationComplete,
    migrationComplete,
  };
}
