/**
 * @file lib/storage/persona-storage.ts
 * @description Persona storage layer with Supabase API + localStorage fallback
 * 
 * Provides CRUD operations for personas within projects.
 * Uses Supabase API calls for cloud storage with localStorage fallback.
 */

'use client';

import type { Persona } from '@/lib/types/project';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = '/api/db/personas';

// ============================================================================
// Helper Functions
// ============================================================================

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
 * Convert API response (snake_case) to frontend format (camelCase)
 */
function mapApiToPersona(apiPersona: Record<string, unknown>): Persona {
  return {
    id: apiPersona.id as string,
    name: apiPersona.name as string,
    photoUrl: apiPersona.photo_url as string | undefined,
    demographics: apiPersona.demographics as string,
    psychographics: apiPersona.psychographics as string,
    painPoints: apiPersona.pain_points as string,
    languagePatterns: apiPersona.language_patterns as string,
    goals: apiPersona.goals as string,
    createdAt: apiPersona.created_at as string,
    updatedAt: apiPersona.updated_at as string,
  };
}

/**
 * Convert frontend persona to API format (snake_case)
 */
function mapPersonaToApi(persona: Partial<Persona>): Record<string, unknown> {
  const apiPersona: Record<string, unknown> = {};
  
  if (persona.name !== undefined) apiPersona.name = persona.name;
  if (persona.photoUrl !== undefined) apiPersona.photo_url = persona.photoUrl;
  if (persona.demographics !== undefined) apiPersona.demographics = persona.demographics;
  if (persona.psychographics !== undefined) apiPersona.psychographics = persona.psychographics;
  if (persona.painPoints !== undefined) apiPersona.pain_points = persona.painPoints;
  if (persona.languagePatterns !== undefined) apiPersona.language_patterns = persona.languagePatterns;
  if (persona.goals !== undefined) apiPersona.goals = persona.goals;
  
  return apiPersona;
}

/**
 * Validate persona name
 */
function validatePersonaName(name: string): string {
  if (!name || name.trim().length === 0) {
    throw new Error('Persona name is required');
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length > 100) {
    throw new Error('Persona name cannot exceed 100 characters');
  }
  
  return trimmed;
}

/**
 * Validate photo URL size for base64 data URLs
 */
function validatePhotoUrl(photoUrl?: string): void {
  if (!photoUrl) return;
  
  if (photoUrl.startsWith('data:image/')) {
    const base64Data = photoUrl.split(',')[1];
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    
    if (sizeInBytes > 2 * 1024 * 1024) { // 2MB limit
      throw new Error('Photo size too large. Please use an image smaller than 2MB.');
    }
  }
}

// ============================================================================
// localStorage Fallback Functions
// ============================================================================

const STORAGE_KEY = 'copyworx_personas';

function getLocalPersonas(projectId: string): Persona[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const allPersonas = JSON.parse(data) as (Persona & { projectId: string })[];
    return allPersonas.filter(p => p.projectId === projectId);
  } catch {
    return [];
  }
}

function saveLocalPersona(projectId: string, persona: Persona): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const allPersonas = data ? JSON.parse(data) as (Persona & { projectId: string })[] : [];
    const existingIndex = allPersonas.findIndex(p => p.id === persona.id);
    const personaWithProject = { ...persona, projectId };
    
    if (existingIndex >= 0) {
      allPersonas[existingIndex] = personaWithProject;
    } else {
      allPersonas.push(personaWithProject);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPersonas));
  } catch (error) {
    logger.error('❌ Failed to save persona to localStorage:', error);
  }
}

function deleteLocalPersona(personaId: string): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    const allPersonas = JSON.parse(data) as (Persona & { projectId: string })[];
    const filtered = allPersonas.filter(p => p.id !== personaId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('❌ Failed to delete persona from localStorage:', error);
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
 * Create a new persona in the specified project
 */
export async function createPersona(
  projectId: string,
  personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Persona> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot create persona in non-browser environment');
  }
  
  // Validate
  const validatedName = validatePersonaName(personaData.name);
  validatePhotoUrl(personaData.photoUrl);
  
  const now = new Date().toISOString();
  
  const apiData = {
    project_id: projectId,
    name: validatedName,
    photo_url: personaData.photoUrl,
    demographics: personaData.demographics?.trim() || '',
    psychographics: personaData.psychographics?.trim() || '',
    pain_points: personaData.painPoints?.trim() || '',
    language_patterns: personaData.languagePatterns?.trim() || '',
    goals: personaData.goals?.trim() || '',
  };
  
  try {
    const apiResponse = await apiCall<Record<string, unknown>>(API_BASE, {
      method: 'POST',
      body: JSON.stringify(apiData),
    });
    
    const newPersona = mapApiToPersona(apiResponse);
    logger.log('☁️ Persona created in cloud:', newPersona.id);
    
    // Also save to localStorage for offline access
    saveLocalPersona(projectId, newPersona);
    
    return newPersona;
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    // Fallback: create locally
    const newPersona: Persona = {
      id: generateId(),
      name: validatedName,
      photoUrl: personaData.photoUrl,
      demographics: personaData.demographics?.trim() || '',
      psychographics: personaData.psychographics?.trim() || '',
      painPoints: personaData.painPoints?.trim() || '',
      languagePatterns: personaData.languagePatterns?.trim() || '',
      goals: personaData.goals?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    
    saveLocalPersona(projectId, newPersona);
    logger.log('💾 Persona created locally:', newPersona.id);
    
    return newPersona;
  }
}

/**
 * Get all personas for a project
 */
export async function getProjectPersonas(projectId: string): Promise<Persona[]> {
  if (typeof window === 'undefined') return [];
  
  try {
    const apiResponse = await apiCall<Record<string, unknown>[]>(
      `${API_BASE}?project_id=${encodeURIComponent(projectId)}`
    );
    
    const personas = apiResponse.map(mapApiToPersona);
    logger.log(`☁️ Fetched ${personas.length} personas from cloud`);
    
    // Update localStorage with latest data
    personas.forEach(persona => saveLocalPersona(projectId, persona));
    
    return personas;
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    const localPersonas = getLocalPersonas(projectId);
    logger.log(`💾 Loaded ${localPersonas.length} personas from localStorage`);
    
    return localPersonas;
  }
}

/**
 * Get a single persona by ID
 */
export async function getPersona(
  projectId: string,
  personaId: string
): Promise<Persona | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const apiResponse = await apiCall<Record<string, unknown>>(
      `${API_BASE}?id=${encodeURIComponent(personaId)}`
    );
    
    const persona = mapApiToPersona(apiResponse);
    logger.log('☁️ Persona fetched from cloud:', persona.id);
    saveLocalPersona(projectId, persona);
    
    return persona;
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    const localPersonas = getLocalPersonas(projectId);
    const persona = localPersonas.find(p => p.id === personaId) || null;
    
    if (persona) {
      logger.log('💾 Persona loaded from localStorage:', persona.id);
    } else {
      logger.warn(`⚠️ Persona not found: ${personaId}`);
    }
    
    return persona;
  }
}

/**
 * Update an existing persona
 */
export async function updatePersona(
  projectId: string,
  personaId: string,
  updates: Partial<Omit<Persona, 'id' | 'createdAt'>>
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot update persona in non-browser environment');
  }
  
  // Validate if name is being updated
  if (updates.name !== undefined) {
    updates.name = validatePersonaName(updates.name);
  }
  
  // Validate photo if being updated
  validatePhotoUrl(updates.photoUrl);
  
  try {
    await apiCall(API_BASE, {
      method: 'PUT',
      body: JSON.stringify({
        id: personaId,
        ...mapPersonaToApi(updates),
      }),
    });
    
    logger.log('☁️ Persona updated in cloud:', personaId);
    
    // Update localStorage
    const existingPersona = await getPersona(projectId, personaId);
    if (existingPersona) {
      const updatedPersona = { ...existingPersona, ...updates, updatedAt: new Date().toISOString() };
      saveLocalPersona(projectId, updatedPersona);
    }
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    // Fallback: update locally
    const localPersonas = getLocalPersonas(projectId);
    const personaIndex = localPersonas.findIndex(p => p.id === personaId);
    
    if (personaIndex === -1) {
      throw new Error(`Persona not found: ${personaId}`);
    }
    
    const updatedPersona = {
      ...localPersonas[personaIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    saveLocalPersona(projectId, updatedPersona);
    logger.log('💾 Persona updated locally:', personaId);
  }
}

/**
 * Delete a persona
 */
export async function deletePersona(
  projectId: string,
  personaId: string
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Cannot delete persona in non-browser environment');
  }
  
  try {
    await apiCall(`${API_BASE}?id=${encodeURIComponent(personaId)}`, {
      method: 'DELETE',
    });
    
    logger.log('☁️ Persona deleted from cloud:', personaId);
    deleteLocalPersona(personaId);
  } catch (error) {
    logger.warn('⚠️ API failed, falling back to localStorage:', error);
    
    deleteLocalPersona(personaId);
    logger.log('💾 Persona deleted locally:', personaId);
  }
}

/**
 * Validate image file before upload
 * This function should be called from components before creating persona with photo
 */
export function validatePersonaPhoto(file: File): void {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid image type. Please use JPEG, PNG, GIF, or WebP.');
  }
  
  // Check file size (2MB limit)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Photo size too large. Please use an image smaller than 2MB.');
  }
}
