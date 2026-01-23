/**
 * @file lib/utils/project-utils.ts
 * @description Project utility functions and system initialization
 * 
 * Provides high-level functions for:
 * - Project system initialization
 * - Data migration from legacy brand voice storage
 * - Common project operations
 */

'use client';

import type { Project } from '@/lib/types/project';
import type { BrandVoice } from '@/lib/types/brand';
import {
  getAllProjects,
  getActiveProjectId,
  setActiveProjectId,
  createProject,
  saveBrandVoiceToProject,
} from '@/lib/storage/unified-storage';
// Use local storage for sync initialization
import * as localProjectStorage from '@/lib/storage/project-storage';
import { logger } from './logger';

/** Legacy brand voice localStorage key */
const LEGACY_BRAND_VOICE_KEY = 'copyworx-brand-voice';

/** Migration flag to ensure migration only runs once */
const MIGRATION_COMPLETE_KEY = 'copyworx_project_migration_complete';

/**
 * Check if migration has already been completed
 */
function isMigrationComplete(): boolean {
  if (typeof window === 'undefined') return true;
  
  try {
    return localStorage.getItem(MIGRATION_COMPLETE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(MIGRATION_COMPLETE_KEY, 'true');
  } catch (error) {
    logger.error('❌ Failed to mark migration complete:', error);
  }
}

/**
 * Migrate legacy brand voice data to project system
 * Uses local storage directly for sync operation during initialization
 * 
 * This function:
 * 1. Checks for old brand voice in localStorage
 * 2. Creates default project if needed
 * 3. Moves brand voice to that project
 * 4. Removes old localStorage key
 */
function migrateLegacyBrandVoice(): void {
  if (typeof window === 'undefined') return;
  
  // Skip if migration already complete
  if (isMigrationComplete()) {
    logger.log('✅ Migration already complete');
    return;
  }
  
  logger.log('🔄 Checking for legacy brand voice data...');
  
  try {
    // Check for legacy brand voice
    const legacyBrandVoiceJson = localStorage.getItem(LEGACY_BRAND_VOICE_KEY);
    
    if (!legacyBrandVoiceJson) {
      logger.log('ℹ️ No legacy brand voice found');
      markMigrationComplete();
      return;
    }
    
    // Parse legacy brand voice
    const legacyBrandVoice: BrandVoice = JSON.parse(legacyBrandVoiceJson);
    logger.log('📦 Found legacy brand voice:', legacyBrandVoice.brandName);
    
    // Get current projects (use local storage for sync operation)
    const projects = localProjectStorage.getAllProjects();
    
    if (projects.length === 0) {
      // No projects exist - create default project with brand voice
      logger.log('🆕 Creating default project with legacy brand voice...');
      const defaultProject = localProjectStorage.createProject('My First Project');
      localProjectStorage.saveBrandVoiceToProject(defaultProject.id, legacyBrandVoice);
      localProjectStorage.setActiveProjectId(defaultProject.id);
      logger.log('✅ Legacy brand voice migrated to new project');
    } else {
      // Projects exist - add to active project (or first project if no active)
      const activeId = localProjectStorage.getActiveProjectId();
      const targetProject = activeId 
        ? projects.find(p => p.id === activeId) || projects[0]
        : projects[0];
      
      logger.log(`🔄 Migrating brand voice to project: ${targetProject.name}`);
      localProjectStorage.saveBrandVoiceToProject(targetProject.id, legacyBrandVoice);
      logger.log('✅ Legacy brand voice migrated to existing project');
    }
    
    // Remove legacy key
    localStorage.removeItem(LEGACY_BRAND_VOICE_KEY);
    logger.log('🗑️ Removed legacy brand voice key');
    
    // Mark migration as complete
    markMigrationComplete();
    logger.log('✅ Migration complete');
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    // Mark as complete anyway to prevent infinite retry loops
    markMigrationComplete();
  }
}

/**
 * Initialize project system
 * Uses local storage directly for sync initialization
 * 
 * This function should be called once when the app loads.
 * It:
 * 1. Ensures at least one project exists
 * 2. Migrates legacy brand voice data
 * 3. Verifies active project is valid
 */
export function initializeProjectSystem(): void {
  if (typeof window === 'undefined') {
    logger.warn('⚠️ Cannot initialize project system on server');
    return;
  }
  
  logger.log('🚀 Initializing project system...');
  
  try {
    // Ensure at least one project exists (use local storage for sync operation)
    localProjectStorage.ensureDefaultProject();
    
    // Migrate legacy data
    migrateLegacyBrandVoice();
    
    // Verify active project (use local storage for sync operation)
    const activeId = localProjectStorage.getActiveProjectId();
    const projects = localProjectStorage.getAllProjects();
    
    if (!activeId && projects.length > 0) {
      // No active project set - set first project as active
      localProjectStorage.setActiveProjectId(projects[0].id);
      logger.log('✅ Set first project as active');
    } else if (activeId) {
      // Verify active project exists
      const activeProject = projects.find(p => p.id === activeId);
      if (!activeProject && projects.length > 0) {
        // Active project doesn't exist - set first project as active
        localProjectStorage.setActiveProjectId(projects[0].id);
        logger.warn('⚠️ Active project not found. Switched to first project.');
      }
    }
    
    logger.log('✅ Project system initialized');
    
  } catch (error) {
    logger.error('❌ Failed to initialize project system:', error);
  }
}

/**
 * Get current active project (sync - uses local storage)
 * Returns null if no active project exists
 */
export function getCurrentProject(): Project | null {
  return localProjectStorage.getCurrentProject();
}

/**
 * Create new project and set as active
 * Returns the created project (async for cloud support)
 */
export async function createAndActivateProject(name: string): Promise<Project> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create project in non-browser environment');
  }
  
  // Create project
  const newProject = await createProject(name);
  
  // Set as active
  await setActiveProjectId(newProject.id);
  
  logger.log('✅ Created and activated project:', {
    id: newProject.id,
    name: newProject.name,
  });
  
  return newProject;
}

/**
 * Re-export unified storage functions for convenience
 */
export { getAllProjects, getActiveProjectId, setActiveProjectId } from '@/lib/storage/unified-storage';
