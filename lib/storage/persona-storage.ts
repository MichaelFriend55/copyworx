/**
 * @file lib/storage/persona-storage.ts
 * @description Persona storage layer - manages personas within projects
 * 
 * All persona operations work with the project's personas array.
 * Changes persist through project storage to localStorage.
 */

'use client';

import type { Persona } from '@/lib/types/project';
import { getProject, updateProject } from './project-storage';
import { 
  ensureStorageAvailable, 
  validatePersona,
  validateImage,
  logError,
  logWarning
} from '@/lib/utils/error-handling';
import { logger } from '@/lib/utils/logger';

/**
 * Generate a unique ID for personas
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `persona-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new persona in the specified project
 * @throws Error if validation fails or project not found
 */
export function createPersona(
  projectId: string,
  personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>
): Persona {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create persona in non-browser environment');
  }

  // Ensure storage is available
  ensureStorageAvailable();

  // Validate project exists
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Validate persona name
  validatePersona(personaData.name);

  // Validate photo URL if provided (base64 data URL)
  if (personaData.photoUrl) {
    // Check if it's a data URL
    if (personaData.photoUrl.startsWith('data:image/')) {
      // Extract size (rough estimate)
      const base64Data = personaData.photoUrl.split(',')[1];
      const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
      
      if (sizeInBytes > 2 * 1024 * 1024) { // 2MB limit
        throw new Error(
          'Photo size too large. Please use an image smaller than 2MB.'
        );
      }
    }
  }

  // Create new persona
  const newPersona: Persona = {
    id: generateId(),
    name: personaData.name.trim(),
    photoUrl: personaData.photoUrl,
    demographics: personaData.demographics.trim(),
    psychographics: personaData.psychographics.trim(),
    painPoints: personaData.painPoints.trim(),
    languagePatterns: personaData.languagePatterns.trim(),
    goals: personaData.goals.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to project's personas array
  const updatedPersonas = [...project.personas, newPersona];

  // Update project (may throw error if quota exceeded)
  updateProject(projectId, { personas: updatedPersonas });

  logger.log('✅ Persona created:', {
    projectId,
    personaId: newPersona.id,
    name: newPersona.name,
  });

  return newPersona;
}

/**
 * Get all personas for a project
 */
export function getProjectPersonas(projectId: string): Persona[] {
  if (typeof window === 'undefined') return [];

  const project = getProject(projectId);
  if (!project) {
    logger.warn(`⚠️ Project not found: ${projectId}`);
    return [];
  }

  return project.personas || [];
}

/**
 * Get a single persona by ID
 */
export function getPersona(projectId: string, personaId: string): Persona | null {
  if (typeof window === 'undefined') return null;

  const personas = getProjectPersonas(projectId);
  const persona = personas.find((p) => p.id === personaId);

  if (!persona) {
    logger.warn(`⚠️ Persona not found: ${personaId}`);
    return null;
  }

  return persona;
}

/**
 * Update an existing persona
 * @throws Error if validation fails or persona not found
 */
export function updatePersona(
  projectId: string,
  personaId: string,
  updates: Partial<Omit<Persona, 'id' | 'createdAt'>>
): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update persona in non-browser environment');
  }

  // Ensure storage is available
  ensureStorageAvailable();

  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Find persona index
  const personaIndex = project.personas.findIndex((p) => p.id === personaId);
  if (personaIndex === -1) {
    throw new Error(`Persona not found: ${personaId}`);
  }

  // Validate name if it's being updated
  if (updates.name !== undefined) {
    validatePersona(updates.name);
  }

  // Validate photo if it's being updated
  if (updates.photoUrl && updates.photoUrl.startsWith('data:image/')) {
    const base64Data = updates.photoUrl.split(',')[1];
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    
    if (sizeInBytes > 2 * 1024 * 1024) { // 2MB limit
      throw new Error(
        'Photo size too large. Please use an image smaller than 2MB.'
      );
    }
  }

  // Update persona
  const updatedPersonas = [...project.personas];
  updatedPersonas[personaIndex] = {
    ...updatedPersonas[personaIndex],
    ...updates,
    id: personaId, // Prevent ID change
    updatedAt: new Date().toISOString(),
  };

  // Update project (may throw error if quota exceeded)
  updateProject(projectId, { personas: updatedPersonas });

  logger.log('✅ Persona updated:', {
    projectId,
    personaId,
    name: updatedPersonas[personaIndex].name,
  });
}

/**
 * Delete a persona
 */
export function deletePersona(projectId: string, personaId: string): void {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete persona in non-browser environment');
  }

  // Get project
  const project = getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Find persona
  const personaIndex = project.personas.findIndex((p) => p.id === personaId);
  if (personaIndex === -1) {
    throw new Error(`Persona not found: ${personaId}`);
  }

  // Remove persona
  const updatedPersonas = project.personas.filter((p) => p.id !== personaId);

  // Update project
  updateProject(projectId, { personas: updatedPersonas });

  logger.log('🗑️ Persona deleted:', {
    projectId,
    personaId,
  });
}

/**
 * Validate image file before upload
 * This function should be called from components before creating persona with photo
 * @throws Error if image is invalid
 */
export function validatePersonaPhoto(file: File): void {
  validateImage(file);
}
