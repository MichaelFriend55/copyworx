/**
 * @file lib/storage/folder-storage.ts
 * @description Folder storage layer for document organization
 * 
 * Provides CRUD operations for folders within projects.
 * Folders support hierarchical nesting via parentFolderId.
 * 
 * Folder Hierarchy:
 * - Top-level folders: parentFolderId is undefined/null (sits at project root)
 * - Nested folders: parentFolderId points to another folder (subfolder)
 */

'use client';

import type { Folder, ProjectDocument } from '@/lib/types/project';
import { getProject, updateProject } from './project-storage';
import {
  ensureStorageAvailable,
  validateNotEmpty,
  logError,
  logWarning,
} from '@/lib/utils/error-handling';

// ============================================================================
// Constants
// ============================================================================

/** Maximum folder name length */
const MAX_FOLDER_NAME_LENGTH = 100;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for folders
 * Uses crypto.randomUUID() if available, falls back to timestamp-based ID
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `folder-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validate folder name
 * @throws Error if name is invalid
 */
function validateFolderName(name: string): void {
  validateNotEmpty(name, 'Folder name');
  
  const trimmed = name.trim();
  
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    throw new Error(`Folder name cannot exceed ${MAX_FOLDER_NAME_LENGTH} characters.`);
  }
}

/**
 * Sanitize folder name (trim and remove unsafe characters)
 */
function sanitizeFolderName(name: string): string {
  return name.trim().replace(/[<>]/g, '');
}

/**
 * Check if moving a folder would create a circular reference
 * A circular reference occurs when:
 * - newParentId is the same as folderId (moving into itself)
 * - newParentId is a descendant of folderId (moving into a child/grandchild)
 * 
 * @param folders - All folders in the project
 * @param folderId - ID of the folder being moved
 * @param newParentId - ID of the new parent folder
 * @returns true if circular reference would be created
 */
function isCircularReference(
  folders: Folder[],
  folderId: string,
  newParentId: string
): boolean {
  // Can't move folder into itself
  if (folderId === newParentId) {
    return true;
  }
  
  // Walk up the parent chain from newParentId
  // If we find folderId, it's a circular reference
  let currentId: string | undefined = newParentId;
  const visited = new Set<string>();
  
  while (currentId) {
    // Prevent infinite loop from corrupted data
    if (visited.has(currentId)) {
      logWarning('Detected existing circular reference in folder structure', { currentId });
      return true;
    }
    visited.add(currentId);
    
    // If we reached the folder being moved, it's circular
    if (currentId === folderId) {
      return true;
    }
    
    // Find parent of current folder
    const currentFolder = folders.find(f => f.id === currentId);
    currentId = currentFolder?.parentFolderId;
  }
  
  return false;
}

/**
 * Sort folders alphabetically by name
 */
function sortFoldersByName(folders: Folder[]): Folder[] {
  return [...folders].sort((a, b) => 
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new folder in a project
 * 
 * @param projectId - Project to add folder to
 * @param name - Folder name
 * @param parentFolderId - Optional parent folder ID for nesting
 * @returns The newly created folder
 * @throws Error if project not found, validation fails, or parent folder not found
 */
export function createFolder(
  projectId: string,
  name: string,
  parentFolderId?: string
): Folder {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create folder in non-browser environment');
  }
  
  // Ensure storage is available
  ensureStorageAvailable();
  
  // Validate folder name
  validateFolderName(name);
  const sanitizedName = sanitizeFolderName(name);
  
  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Ensure folders array exists (handle legacy projects without folders)
  const folders = project.folders || [];
  
  // If parentFolderId provided, verify it exists
  if (parentFolderId) {
    const parentFolder = folders.find(f => f.id === parentFolderId);
    if (!parentFolder) {
      throw new Error(`Parent folder not found: ${parentFolderId}`);
    }
  }
  
  // Create new folder
  const now = new Date().toISOString();
  const newFolder: Folder = {
    id: generateId(),
    name: sanitizedName,
    projectId,
    parentFolderId: parentFolderId || undefined,
    createdAt: now,
    updatedAt: now,
  };
  
  // Add to project's folders array
  const updatedFolders = [...folders, newFolder];
  
  // Save via updateProject
  updateProject(projectId, { folders: updatedFolders });
  
  return newFolder;
}

/**
 * Get all folders for a project
 * 
 * @param projectId - Project ID
 * @returns Array of folders sorted by name, or empty array if none
 */
export function getAllFolders(projectId: string): Folder[] {
  if (typeof window === 'undefined') return [];
  
  const project = getProject(projectId);
  if (!project) {
    logWarning(`Project not found when getting folders: ${projectId}`);
    return [];
  }
  
  // Handle legacy projects without folders array
  const folders = project.folders || [];
  
  return sortFoldersByName(folders);
}

/**
 * Get a single folder by ID
 * 
 * @param projectId - Project ID
 * @param folderId - Folder ID
 * @returns Folder or null if not found
 */
export function getFolder(projectId: string, folderId: string): Folder | null {
  if (typeof window === 'undefined') return null;
  
  const folders = getAllFolders(projectId);
  const folder = folders.find(f => f.id === folderId);
  
  if (!folder) {
    logWarning(`Folder not found: ${folderId} in project ${projectId}`);
    return null;
  }
  
  return folder;
}

/**
 * Get immediate children of a folder (or root-level folders)
 * 
 * @param projectId - Project ID
 * @param parentFolderId - Parent folder ID, or null for root-level folders
 * @returns Array of child folders sorted by name
 */
export function getFolderChildren(
  projectId: string,
  parentFolderId: string | null
): Folder[] {
  if (typeof window === 'undefined') return [];
  
  const folders = getAllFolders(projectId);
  
  // Filter by parentFolderId
  // null/undefined parentFolderId means root level
  const children = folders.filter(f => {
    if (parentFolderId === null) {
      // Root level: no parent or explicitly null/undefined
      return !f.parentFolderId;
    }
    return f.parentFolderId === parentFolderId;
  });
  
  return sortFoldersByName(children);
}

/**
 * Update a folder's properties
 * 
 * @param projectId - Project ID
 * @param folderId - Folder ID to update
 * @param updates - Partial folder updates (name only - id, projectId, createdAt protected)
 * @throws Error if folder not found or validation fails
 */
export function updateFolder(
  projectId: string,
  folderId: string,
  updates: Partial<Pick<Folder, 'name'>>
): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update folder in non-browser environment');
  }
  
  // Ensure storage is available
  ensureStorageAvailable();
  
  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Find folder
  const folders = project.folders || [];
  const folderIndex = folders.findIndex(f => f.id === folderId);
  
  if (folderIndex === -1) {
    throw new Error(`Folder not found: ${folderId}`);
  }
  
  // Validate name if being updated
  if (updates.name !== undefined) {
    validateFolderName(updates.name);
  }
  
  // Update folder (protect id, projectId, createdAt)
  const existingFolder = folders[folderIndex];
  const updatedFolder: Folder = {
    ...existingFolder,
    name: updates.name !== undefined ? sanitizeFolderName(updates.name) : existingFolder.name,
    // Protected fields - always keep original values
    id: existingFolder.id,
    projectId: existingFolder.projectId,
    createdAt: existingFolder.createdAt,
    // Update timestamp
    updatedAt: new Date().toISOString(),
  };
  
  // Replace in array
  const updatedFolders = [...folders];
  updatedFolders[folderIndex] = updatedFolder;
  
  // Save via updateProject
  updateProject(projectId, { folders: updatedFolders });
  
}

/**
 * Delete a folder
 * 
 * @param projectId - Project ID
 * @param folderId - Folder ID to delete
 * @throws Error if folder not found, has subfolders, or has documents
 */
export function deleteFolder(projectId: string, folderId: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete folder in non-browser environment');
  }
  
  // Ensure storage is available
  ensureStorageAvailable();
  
  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Find folder
  const folders = project.folders || [];
  const folderIndex = folders.findIndex(f => f.id === folderId);
  
  if (folderIndex === -1) {
    throw new Error(`Folder not found: ${folderId}`);
  }
  
  const folderToDelete = folders[folderIndex];
  
  // Check for subfolders (prevent orphans)
  const hasSubfolders = folders.some(f => f.parentFolderId === folderId);
  if (hasSubfolders) {
    throw new Error(
      `Cannot delete folder "${folderToDelete.name}" because it contains subfolders. ` +
      `Please delete or move subfolders first.`
    );
  }
  
  // Check for documents in folder (prevent data loss)
  const documents = project.documents || [];
  const hasDocuments = documents.some((d: ProjectDocument) => d.folderId === folderId);
  if (hasDocuments) {
    throw new Error(
      `Cannot delete folder "${folderToDelete.name}" because it contains documents. ` +
      `Please delete or move documents first.`
    );
  }
  
  // Remove folder from array
  const updatedFolders = folders.filter(f => f.id !== folderId);
  
  // Save via updateProject
  updateProject(projectId, { folders: updatedFolders });
  
}

/**
 * Move a folder to a new parent
 * 
 * @param projectId - Project ID
 * @param folderId - Folder ID to move
 * @param newParentFolderId - New parent folder ID, or null for root level
 * @throws Error if folder not found, parent not found, or circular reference
 */
export function moveFolder(
  projectId: string,
  folderId: string,
  newParentFolderId: string | null
): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot move folder in non-browser environment');
  }
  
  // Ensure storage is available
  ensureStorageAvailable();
  
  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Find folder
  const folders = project.folders || [];
  const folderIndex = folders.findIndex(f => f.id === folderId);
  
  if (folderIndex === -1) {
    throw new Error(`Folder not found: ${folderId}`);
  }
  
  const folderToMove = folders[folderIndex];
  
  // Validate new parent exists (if provided)
  if (newParentFolderId !== null) {
    const newParent = folders.find(f => f.id === newParentFolderId);
    if (!newParent) {
      throw new Error(`New parent folder not found: ${newParentFolderId}`);
    }
    
    // Check for circular reference
    if (isCircularReference(folders, folderId, newParentFolderId)) {
      throw new Error(
        `Cannot move folder "${folderToMove.name}" into itself or one of its subfolders.`
      );
    }
  }
  
  // Update folder's parentFolderId
  const updatedFolder: Folder = {
    ...folderToMove,
    parentFolderId: newParentFolderId || undefined,
    updatedAt: new Date().toISOString(),
  };
  
  // Replace in array
  const updatedFolders = [...folders];
  updatedFolders[folderIndex] = updatedFolder;
  
  // Save via updateProject
  updateProject(projectId, { folders: updatedFolders });
}

/**
 * Get the path from root to a folder (breadcrumb)
 * 
 * @param projectId - Project ID
 * @param folderId - Folder ID
 * @returns Array of folder names from root to the specified folder
 * 
 * @example
 * // For folder structure: Email Campaigns > Q1 Launch
 * getFolderPath(projectId, 'q1-launch-id')
 * // Returns: ["Email Campaigns", "Q1 Launch"]
 */
export function getFolderPath(projectId: string, folderId: string): string[] {
  if (typeof window === 'undefined') return [];
  
  const project = getProject(projectId);
  if (!project) {
    logWarning(`Project not found when getting folder path: ${projectId}`);
    return [];
  }
  
  const folders = project.folders || [];
  const path: string[] = [];
  const visited = new Set<string>();
  
  // Walk up the parent chain
  let currentId: string | undefined = folderId;
  
  while (currentId) {
    // Prevent infinite loop from corrupted data
    if (visited.has(currentId)) {
      logWarning('Detected circular reference in folder path', { currentId });
      break;
    }
    visited.add(currentId);
    
    const currentFolder = folders.find(f => f.id === currentId);
    if (!currentFolder) {
      // Folder not found in chain - stop walking
      break;
    }
    
    // Add to beginning of path (we're walking backward)
    path.unshift(currentFolder.name);
    
    // Move to parent
    currentId = currentFolder.parentFolderId;
  }
  
  return path;
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Check if a folder exists
 */
export function folderExists(projectId: string, folderId: string): boolean {
  return getFolder(projectId, folderId) !== null;
}

/**
 * Get folder count for a project
 */
export function getFolderCount(projectId: string): number {
  if (typeof window === 'undefined') return 0;
  
  const project = getProject(projectId);
  return project?.folders?.length || 0;
}

/**
 * Get all descendant folder IDs for a folder (children, grandchildren, etc.)
 * Useful for operations that need to affect a folder and all its descendants
 */
export function getAllDescendantIds(projectId: string, folderId: string): string[] {
  if (typeof window === 'undefined') return [];
  
  const project = getProject(projectId);
  if (!project) return [];
  
  const folders = project.folders || [];
  const descendants: string[] = [];
  
  // Use BFS to find all descendants
  const queue: string[] = [folderId];
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    
    // Find all children of current folder
    const children = folders.filter(f => f.parentFolderId === currentId);
    
    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }
  
  return descendants;
}
