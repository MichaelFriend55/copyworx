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
 * Safely parse JSON from localStorage
 */
function safeParseJSON<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('❌ Failed to parse JSON from localStorage:', error);
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
 */
export function getAllProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    const projects = safeParseJSON<Project[]>(stored, []);
    
    console.log(`📂 Loaded ${projects.length} project(s) from storage`);
    return projects;
  } catch (error) {
    console.error('❌ Failed to get projects:', error);
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
    console.error('❌ Failed to save projects:', error);
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
    documents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Get existing projects
  const projects = getAllProjects();
  
  // Add new project
  projects.push(newProject);
  
  // Save to localStorage (may throw error if quota exceeded)
  saveProjects(projects);
  
  console.log('✅ Project created:', {
    id: newProject.id,
    name: newProject.name,
  });
  
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
    console.warn(`⚠️ Project not found: ${id}`);
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
  
  console.log('✅ Project updated:', {
    id: projects[index].id,
    name: projects[index].name,
  });
}

/**
 * Delete project
 * Prevents deletion if it's the last project
 */
export function deleteProject(id: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete project in non-browser environment');
  }
  
  const projects = getAllProjects();
  
  // Prevent deletion of last project
  if (projects.length <= 1) {
    throw new Error('Cannot delete the last project. At least one project must exist.');
  }
  
  const index = projects.findIndex((p) => p.id === id);
  
  if (index === -1) {
    throw new Error(`Project not found: ${id}`);
  }
  
  // Remove project
  const deletedProject = projects[index];
  projects.splice(index, 1);
  
  // Save to localStorage
  const saved = saveProjects(projects);
  
  if (saved) {
    console.log('🗑️ Project deleted:', {
      id: deletedProject.id,
      name: deletedProject.name,
    });
  }
  
  // If deleted project was active, switch to first available project
  const activeId = getActiveProjectId();
  if (activeId === id && projects.length > 0) {
    setActiveProjectId(projects[0].id);
    console.log('🔄 Switched to project:', projects[0].name);
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
    console.error('❌ Failed to get active project ID:', error);
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
    console.log('✅ Active project set:', {
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
  
  // Update project (validation happens in updateProject)
  updateProject(projectId, { brandVoice });
  
  console.log('✅ Brand voice saved to project:', {
    projectId,
    brandName: brandVoice.brandName,
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
    console.log('🆕 No projects found. Creating default project...');
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
