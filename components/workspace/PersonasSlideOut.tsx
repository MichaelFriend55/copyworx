/**
 * @file components/workspace/PersonasSlideOut.tsx
 * @description Personas management slide-out panel
 * 
 * Features:
 * - 550px wide right slide-out panel
 * - List view with existing personas
 * - Create/Edit persona form
 * - Full CRUD operations
 * - Project-scoped personas
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  ArrowLeft,
  Save,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Folder,
  User,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { Button } from '@/components/ui/button';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import {
  getProjectPersonas,
  createPersona,
  updatePersona,
  deletePersona,
} from '@/lib/storage/persona-storage';
import type { Persona } from '@/lib/types/project';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Unique ID for the personas slide-out panel */
export const PERSONAS_PANEL_ID = 'personas-manager';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface PersonasSlideOutProps {
  /** Whether the slide-out is open */
  isOpen: boolean;
  
  /** Callback when slide-out should close */
  onClose: () => void;
}

type ViewMode = 'list' | 'create' | 'edit';

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Persona Card Component for List View
 */
function PersonaCard({
  persona,
  onEdit,
  onDelete,
}: {
  persona: Persona;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-apple-blue transition-colors duration-200 group">
      <div className="flex items-start gap-3">
        {/* Avatar/Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-apple-blue/10 flex items-center justify-center">
          {persona.photoUrl ? (
            <img
              src={persona.photoUrl}
              alt={persona.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-apple-blue" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {persona.name}
          </h4>
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {persona.demographics || 'No demographics specified'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="text-xs text-apple-blue hover:text-apple-blue/80 font-medium flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function PersonasSlideOut({
  isOpen,
  onClose,
}: PersonasSlideOutProps) {
  // Store state
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  // Get active project
  const activeProject = React.useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [demographics, setDemographics] = useState('');
  const [psychographics, setPsychographics] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [languagePatterns, setLanguagePatterns] = useState('');
  const [goals, setGoals] = useState('');
  
  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Load personas when project changes or panel opens
  useEffect(() => {
    if (!isOpen || !activeProjectId) {
      setPersonas([]);
      return;
    }
    
    loadPersonas();
  }, [isOpen, activeProjectId]);
  
  /**
   * Load personas from storage
   */
  const loadPersonas = useCallback(() => {
    if (!activeProjectId) return;
    
    const projectPersonas = getProjectPersonas(activeProjectId);
    setPersonas(projectPersonas);
    console.log(`📋 Loaded ${projectPersonas.length} persona(s)`);
  }, [activeProjectId]);
  
  /**
   * Handle create new persona
   */
  const handleCreateNew = useCallback(() => {
    setEditingPersona(null);
    setName('');
    setDemographics('');
    setPsychographics('');
    setPainPoints('');
    setLanguagePatterns('');
    setGoals('');
    setSaveError(null);
    setSaveSuccess(false);
    setViewMode('create');
  }, []);
  
  /**
   * Handle edit persona
   */
  const handleEdit = useCallback((persona: Persona) => {
    setEditingPersona(persona);
    setName(persona.name);
    setDemographics(persona.demographics);
    setPsychographics(persona.psychographics);
    setPainPoints(persona.painPoints);
    setLanguagePatterns(persona.languagePatterns);
    setGoals(persona.goals);
    setSaveError(null);
    setSaveSuccess(false);
    setViewMode('edit');
  }, []);
  
  /**
   * Handle back to list
   */
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setEditingPersona(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);
  
  /**
   * Handle save persona
   */
  const handleSave = useCallback(() => {
    setSaveError(null);
    setSaveSuccess(false);
    
    // Check if project exists
    if (!activeProject || !activeProjectId) {
      setSaveError('No active project. Please create a project first.');
      return;
    }
    
    // Validate required fields
    if (!name.trim()) {
      setSaveError('Persona name is required');
      return;
    }
    
    // Create persona data
    const personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      demographics: demographics.trim(),
      psychographics: psychographics.trim(),
      painPoints: painPoints.trim(),
      languagePatterns: languagePatterns.trim(),
      goals: goals.trim(),
    };
    
    try {
      if (viewMode === 'edit' && editingPersona) {
        // Update existing persona
        updatePersona(activeProjectId, editingPersona.id, personaData);
        console.log('✅ Persona updated');
      } else {
        // Create new persona
        createPersona(activeProjectId, personaData);
        console.log('✅ Persona created');
      }
      
      setSaveSuccess(true);
      
      // Reload personas and return to list after delay
      setTimeout(() => {
        loadPersonas();
        handleBackToList();
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save persona. Please try again.';
      setSaveError(errorMessage);
      console.error('❌ Failed to save persona:', error);
    }
  }, [activeProject, activeProjectId, name, demographics, psychographics, painPoints, languagePatterns, goals, viewMode, editingPersona, loadPersonas, handleBackToList]);
  
  /**
   * Handle delete persona
   */
  const handleDelete = useCallback((persona: Persona) => {
    if (!activeProjectId) return;
    
    const confirmed = confirm(
      `Are you sure you want to delete "${persona.name}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      deletePersona(activeProjectId, persona.id);
      loadPersonas();
      console.log('✅ Persona deleted');
    } catch (error) {
      console.error('❌ Failed to delete persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete persona');
    }
  }, [activeProjectId, loadPersonas]);
  
  // Panel footer - varies by view mode
  const panelFooter = viewMode === 'list' ? (
    <Button
      variant="default"
      size="default"
      onClick={handleCreateNew}
      disabled={!activeProject}
      className="w-full bg-apple-blue hover:bg-apple-blue/90"
    >
      <Plus className="h-4 w-4 mr-2" />
      Create New Persona
    </Button>
  ) : (
    <div className="flex gap-3">
      <Button
        variant="outline"
        size="default"
        onClick={handleBackToList}
        disabled={saveSuccess}
        className="flex-1"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to List
      </Button>
      <Button
        variant="default"
        size="default"
        onClick={handleSave}
        disabled={!activeProject || saveSuccess}
        className="flex-1 bg-apple-blue hover:bg-apple-blue/90"
      >
        {saveSuccess ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Saved!
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Persona
          </>
        )}
      </Button>
    </div>
  );
  
  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      title={
        viewMode === 'list' 
          ? 'Personas' 
          : viewMode === 'create' 
          ? 'Create Persona' 
          : 'Edit Persona'
      }
      subtitle={
        viewMode === 'list'
          ? `${personas.length} persona${personas.length !== 1 ? 's' : ''}`
          : 'Define your target audience profile'
      }
      footer={panelFooter}
    >
      <div className="space-y-6">
        {/* Active Project Indicator */}
        {activeProject ? (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-900">
                {viewMode === 'list' ? 'Personas for:' : 'Creating persona for:'}
              </p>
              <p className="text-sm font-semibold text-blue-700 truncate">
                {activeProject.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                No Active Project
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Please create or select a project to manage personas
              </p>
            </div>
          </div>
        )}
        
        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <div className="space-y-4">
            {personas.length > 0 ? (
              <div className="space-y-3">
                {personas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    onEdit={() => handleEdit(persona)}
                    onDelete={() => handleDelete(persona)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600 mb-1">
                  No Personas Yet
                </p>
                <p className="text-xs text-gray-500">
                  Create personas to target specific audience profiles
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* CREATE/EDIT VIEW */}
        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="space-y-6">
            {/* Success Message */}
            {saveSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">
                  Persona saved successfully!
                </p>
              </div>
            )}
            
            {/* Error Message */}
            {saveError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-xs text-red-700 mt-1">{saveError}</p>
                </div>
              </div>
            )}
            
            {/* Form Fields */}
            <div className="space-y-5">
              {/* Persona Name */}
              <div className="space-y-2">
                <label htmlFor="personaName" className="block text-sm font-medium text-gray-900">
                  Persona Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="personaName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sarah, the Enterprise Decision Maker"
                  disabled={saveSuccess}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                    'text-sm text-gray-900 bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    'disabled:bg-gray-50 disabled:opacity-50',
                    'placeholder:text-gray-400'
                  )}
                />
                <p className="text-xs text-gray-500">
                  Give this persona a memorable name and title
                </p>
              </div>
              
              {/* Demographics */}
              <div className="space-y-2">
                <label htmlFor="demographics" className="block text-sm font-medium text-gray-900">
                  Demographics & Role
                </label>
                <AutoExpandTextarea
                  id="demographics"
                  value={demographics}
                  onChange={(e) => setDemographics(e.target.value)}
                  placeholder="e.g., 35-45 years old, VP of Marketing, works at mid-sized B2B SaaS companies, located in major tech hubs"
                  minHeight={100}
                  maxHeight={300}
                  disabled={saveSuccess}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                    'text-sm text-gray-900 bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    'disabled:bg-gray-50 disabled:opacity-50',
                    'placeholder:text-gray-400'
                  )}
                />
                <p className="text-xs text-gray-500">
                  Age, location, job title, company size, industry
                </p>
              </div>
              
              {/* Pain Points */}
              <div className="space-y-2">
                <label htmlFor="painPoints" className="block text-sm font-medium text-gray-900">
                  Pain Points & Challenges
                </label>
                <AutoExpandTextarea
                  id="painPoints"
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                  placeholder="e.g., Struggles to prove ROI of marketing initiatives, limited budget for tools, team is overwhelmed with manual work"
                  minHeight={100}
                  maxHeight={300}
                  disabled={saveSuccess}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                    'text-sm text-gray-900 bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    'disabled:bg-gray-50 disabled:opacity-50',
                    'placeholder:text-gray-400'
                  )}
                />
                <p className="text-xs text-gray-500">
                  Problems and frustrations they face daily
                </p>
              </div>
              
              {/* Goals */}
              <div className="space-y-2">
                <label htmlFor="goals" className="block text-sm font-medium text-gray-900">
                  Goals & Aspirations
                </label>
                <AutoExpandTextarea
                  id="goals"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="e.g., Increase marketing efficiency, reduce campaign creation time, improve content quality, get promoted to CMO"
                  minHeight={100}
                  maxHeight={300}
                  disabled={saveSuccess}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                    'text-sm text-gray-900 bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    'disabled:bg-gray-50 disabled:opacity-50',
                    'placeholder:text-gray-400'
                  )}
                />
                <p className="text-xs text-gray-500">
                  What they want to achieve professionally and personally
                </p>
              </div>
              
              {/* Communication Style / Language Patterns */}
              <div className="space-y-2">
                <label htmlFor="languagePatterns" className="block text-sm font-medium text-gray-900">
                  Preferred Communication Style
                </label>
                <AutoExpandTextarea
                  id="languagePatterns"
                  value={languagePatterns}
                  onChange={(e) => setLanguagePatterns(e.target.value)}
                  placeholder="e.g., Prefers data-driven arguments, responds to ROI metrics, values efficiency and practicality, appreciates clear actionable advice"
                  minHeight={100}
                  maxHeight={300}
                  disabled={saveSuccess}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                    'text-sm text-gray-900 bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    'disabled:bg-gray-50 disabled:opacity-50',
                    'placeholder:text-gray-400'
                  )}
                />
                <p className="text-xs text-gray-500">
                  How they prefer to be communicated with
                </p>
              </div>
              
              {/* Psychographics (optional, collapsed for simplicity) */}
              <div className="space-y-2">
                <label htmlFor="psychographics" className="block text-sm font-medium text-gray-900">
                  Additional Details (Optional)
                </label>
                <AutoExpandTextarea
                  id="psychographics"
                  value={psychographics}
                  onChange={(e) => setPsychographics(e.target.value)}
                  placeholder="e.g., Values innovation and efficiency, influenced by industry thought leaders, active on LinkedIn, reads marketing blogs"
                  minHeight={80}
                  maxHeight={250}
                  disabled={saveSuccess}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                    'text-sm text-gray-900 bg-white',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    'disabled:bg-gray-50 disabled:opacity-50',
                    'placeholder:text-gray-400'
                  )}
                />
                <p className="text-xs text-gray-500">
                  Values, interests, lifestyle, personality traits
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SlideOutPanel>
  );
}
