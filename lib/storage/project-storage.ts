/**
 * @file lib/storage/project-storage.ts
 * @description Project storage layer using localStorage
 * 
 * Provides CRUD operations for projects with automatic persistence.
 * Handles serialization, error handling, and default project creation.
 */

'use client';

import type { Project } from '@/lib/types/project';
import type { BrandVoice } from '@/lib/types/brand';
import { 
  ensureStorageAvailable, 
  checkStorageQuota, 
  validateProjectName,
  logError,
  logWarning
} from '@/lib/utils/error-handling';
import { logger } from '@/lib/utils/logger';

/** localStorage key for projects array */
const PROJECTS_KEY = 'copyworx_projects';

/** localStorage key for active project ID */
const ACTIVE_PROJECT_KEY = 'copyworx_active_project_id';

/** Default project name for first-time users */
const DEFAULT_PROJECT_NAME = 'My First Project';

/**
 * Generate a unique ID for projects
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
 * Safely parse JSON from localStorage with array validation
 * CRITICAL: Validates that parsed data is actually an array
 */
function safeParseJSON<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  
  try {
    const parsed = JSON.parse(json);
    
    // CRITICAL FIX: Validate that parsed data is an array if fallback is an array
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      logger.warn('⚠️ localStorage data is not an array, resetting to empty array');
      return fallback;
    }
    
    return parsed as T;
  } catch (error) {
    logger.error('❌ Failed to parse JSON from localStorage:', error);
    return fallback;
  }
}

/**
 * Safely write to localStorage
 * @throws Error if storage quota exceeded
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    // Check storage quota before writing
    const usage = checkStorageQuota();
    if (usage > 90) {
      logWarning(`Storage is ${usage.toFixed(1)}% full. Consider clearing old data.`);
    }
    
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Handle quota exceeded error specifically
    if (error instanceof DOMException && error.code === 22) {
      logError(error, 'localStorage quota exceeded');
      throw new Error(
        'Storage quota exceeded. Please clear some data to continue. ' +
        'You can delete old projects or brand voice data to free up space.'
      );
    }
    
    logError(error, `Failed to write to localStorage (${key})`);
    throw new Error('Failed to save data. Please try again.');
  }
}

/**
 * Get all projects from localStorage
 * CRITICAL: Always returns an array, even if localStorage is corrupted
 * CRITICAL: Ensures each project has proper array fields to prevent ".find is not a function" errors
 */
export function getAllProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    const projects = safeParseJSON<Project[]>(stored, []);
    
    // EXTRA SAFETY: Double-check it's an array
    if (!Array.isArray(projects)) {
      logger.error('❌ Projects data corrupted, resetting to empty array');
      localStorage.setItem(PROJECTS_KEY, JSON.stringify([]));
      return [];
    }
    
    // CRITICAL FIX: Ensure each project has required array fields
    // This prevents ".find is not a function" errors from legacy/corrupted data
    const sanitizedProjects = projects.map((project) => ({
      ...project,
      personas: Array.isArray(project.personas) ? project.personas : [],
      folders: Array.isArray(project.folders) ? project.folders : [],
      documents: Array.isArray(project.documents) ? project.documents : [],
      snippets: Array.isArray(project.snippets) ? project.snippets : [],
    }));
    
    return sanitizedProjects;
  } catch (error) {
    logger.error('❌ Failed to get projects:', error);
    // Reset corrupted data
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify([]));
    } catch (e) {
      // Ignore if we can't even write
    }
    return [];
  }
}

/**
 * Save projects array to localStorage
 */
function saveProjects(projects: Project[]): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const json = JSON.stringify(projects);
    return safeSetItem(PROJECTS_KEY, json);
  } catch (error) {
    logger.error('❌ Failed to save projects:', error);
    return false;
  }
}

/**
 * Create a new project
 * @throws Error if validation fails or storage unavailable
 */
export function createProject(name: string): Project {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create project in non-browser environment');
  }
  
  // Ensure storage is available
  ensureStorageAvailable();
  
  // Validate project name
  validateProjectName(name);
  const trimmedName = name.trim();
  
  // Sanitize project name (prevent XSS)
  const sanitizedName = trimmedName.replace(/[<>]/g, '');
  
  // Create new project
  const newProject: Project = {
    id: generateId(),
    name: sanitizedName,
    brandVoice: null,
    personas: [],
    folders: [],
    documents: [],
    snippets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Get existing projects
  const projects = getAllProjects();
  
  // Add new project
  projects.push(newProject);
  
  // Save to localStorage (may throw error if quota exceeded)
  saveProjects(projects);
  
  return newProject;
}

/**
 * Get project by ID
 */
export function getProject(id: string): Project | null {
  if (typeof window === 'undefined') return null;
  
  const projects = getAllProjects();
  const project = projects.find((p) => p.id === id);
  
  if (!project) {
    logger.warn(`⚠️ Project not found: ${id}`);
    return null;
  }
  
  return project;
}

/**
 * Update project
 * @throws Error if project not found or validation fails
 */
export function updateProject(id: string, updates: Partial<Project>): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update project in non-browser environment');
  }
  
  // Ensure storage is available
  ensureStorageAvailable();
  
  const projects = getAllProjects();
  const index = projects.findIndex((p) => p.id === id);
  
  if (index === -1) {
    throw new Error(`Project not found: ${id}`);
  }
  
  // Validate name if it's being updated
  if (updates.name !== undefined) {
    validateProjectName(updates.name);
  }
  
  // Update project
  projects[index] = {
    ...projects[index],
    ...updates,
    id: projects[index].id, // Prevent ID change
    updatedAt: new Date().toISOString(),
  };
  
  // Save to localStorage (may throw error if quota exceeded)
  saveProjects(projects);
  
}

/**
 * Delete project
 * Note: Caller is responsible for ensuring at least one project exists
 * (e.g., create a default project first if deleting the last one)
 */
export function deleteProject(id: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete project in non-browser environment');
  }
  
  const projects = getAllProjects();
  
  const index = projects.findIndex((p) => p.id === id);
  
  if (index === -1) {
    throw new Error(`Project not found: ${id}`);
  }
  
  // Remove project
  const deletedProject = projects[index];
  projects.splice(index, 1);
  
  // Save to localStorage
  const saved = saveProjects(projects);
  
  // If deleted project was active, switch to first available project
  const activeId = getActiveProjectId();
  if (activeId === id && projects.length > 0) {
    setActiveProjectId(projects[0].id);
  }
}

/**
 * Get active project ID
 */
export function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch (error) {
    logger.error('❌ Failed to get active project ID:', error);
    return null;
  }
}

/**
 * Set active project ID
 */
export function setActiveProjectId(id: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot set active project in non-browser environment');
  }
  
  // Verify project exists
  const project = getProject(id);
  if (!project) {
    throw new Error(`Cannot set active project: Project not found (${id})`);
  }
  
  // Save to localStorage
  const saved = safeSetItem(ACTIVE_PROJECT_KEY, id);
  
  if (saved) {
    logger.log('✅ Active project set:', {
      id: project.id,
      name: project.name,
    });
  }
}

/**
 * Save brand voice to project
 * @throws Error if validation fails or storage unavailable
 */
export function saveBrandVoiceToProject(projectId: string, brandVoice: BrandVoice): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot save brand voice in non-browser environment');
  }
  
  // Ensure storage is available
  ensureStorageAvailable();
  
  // Get project to verify it exists
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Update localStorage directly (don't call updateProject - it tries to sync to Supabase)
  const projects = getAllProjects();
  const updatedProjects = projects.map(p => 
    p.id === projectId ? { ...p, brandVoice } : p
  );
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
  
  logger.log('✅ Brand voice saved to project (localStorage):', {
    projectId,
    brandName: brandVoice.brandName,
  });
}

/**
 * Delete brand voice from project
 * @throws Error if project not found or storage unavailable
 */
export function deleteBrandVoiceFromProject(projectId: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete brand voice in non-browser environment');
  }
  
  // Ensure storage is available
  ensureStorageAvailable();
  
  // Get project to verify it exists
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }
  
  // Update localStorage directly (don't call updateProject - it tries to sync to Supabase)
  const projects = getAllProjects();
  const updatedProjects = projects.map(p => 
    p.id === projectId ? { ...p, brandVoice: undefined } : p
  );
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjects));
  
  logger.log('🗑️ Brand voice deleted from project (localStorage):', {
    projectId,
  });
}

/**
 * Initialize default project if none exist
 * Called on first app load
 */
export function ensureDefaultProject(): void {
  if (typeof window === 'undefined') return;
  
  const projects = getAllProjects();
  
  if (projects.length === 0) {
    logger.log('🆕 No projects found. Creating default project...');
    const defaultProject = createProject(DEFAULT_PROJECT_NAME);
    setActiveProjectId(defaultProject.id);
  }
}

/**
 * Get current active project
 * Returns null if no active project or project not found
 */
export function getCurrentProject(): Project | null {
  const activeId = getActiveProjectId();
  if (!activeId) return null;
  
  return getProject(activeId);
}
