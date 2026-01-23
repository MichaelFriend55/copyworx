/**
 * @file components/workspace/PersonasTool.tsx
 * @description Main personas management tool
 * 
 * Features:
 * - List view with persona cards
 * - Create/edit form view
 * - Full CRUD operations
 * - Project-scoped personas
 * 
 * @example
 * ```tsx
 * <PersonasTool editor={editorInstance} />
 * ```
 */

'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Users,
  Plus,
  ArrowLeft,
  Folder,
  AlertTriangle,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import type { Persona } from '@/lib/types/project';
import { useWorkspaceStore, useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import {
  getProjectPersonas,
  createPersona,
  updatePersona,
  deletePersona,
} from '@/lib/storage/persona-storage';
import { PersonaCard } from './PersonaCard';
import { PersonaForm } from './PersonaForm';
import { cn } from '@/lib/utils';

interface PersonasToolProps {
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Optional CSS classes */
  className?: string;
}

type ViewMode = 'list' | 'create' | 'edit';

/**
 * PersonasTool component - Main personas management interface
 */
export function PersonasTool({ editor, className }: PersonasToolProps) {
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  // Memoize the find operation to avoid creating new references on every render
  const activeProject = React.useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // Load personas when project changes
  useEffect(() => {
    if (activeProjectId) {
      loadPersonas();
    } else {
      setPersonas([]);
    }
  }, [activeProjectId]);

  /**
   * Load personas from storage
   */
  const loadPersonas = () => {
    if (!activeProjectId) return;
    
    const projectPersonas = getProjectPersonas(activeProjectId);
    setPersonas(projectPersonas);
    logger.log(`📋 Loaded ${projectPersonas.length} persona(s)`);
  };

  /**
   * Handle create new persona
   */
  const handleCreate = () => {
    setEditingPersona(null);
    setViewMode('create');
  };

  /**
   * Handle edit persona
   */
  const handleEdit = (persona: Persona) => {
    setEditingPersona(persona);
    setViewMode('edit');
  };

  /**
   * Handle save persona (create or update)
   */
  const handleSave = (personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!activeProjectId) {
      alert('No active project');
      return;
    }

    try {
      if (viewMode === 'edit' && editingPersona) {
        // Update existing persona
        updatePersona(activeProjectId, editingPersona.id, personaData);
        logger.log('✅ Persona updated');
      } else {
        // Create new persona
        createPersona(activeProjectId, personaData);
        logger.log('✅ Persona created');
      }

      // Reload personas and return to list
      loadPersonas();
      setViewMode('list');
      setEditingPersona(null);
    } catch (error) {
      logger.error('❌ Failed to save persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to save persona');
    }
  };

  /**
   * Handle delete persona
   */
  const handleDelete = (personaId: string) => {
    if (!activeProjectId) return;

    const persona = personas.find((p) => p.id === personaId);
    if (!persona) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${persona.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      deletePersona(activeProjectId, personaId);
      loadPersonas();
      logger.log('🗑️ Persona deleted');
    } catch (error) {
      logger.error('❌ Failed to delete persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete persona');
    }
  };

  /**
   * Handle cancel form
   */
  const handleCancel = () => {
    setViewMode('list');
    setEditingPersona(null);
  };

  // Check if we have an active project
  const hasActiveProject = !!activeProject;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 space-y-3 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Persona Manager
          </h2>
        </div>

        {/* Active Project Indicator */}
        {activeProject ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
            <Folder className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-purple-900">
                Personas for:
              </p>
              <p className="text-sm font-semibold text-purple-700 truncate">
                {activeProject.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-yellow-900">
                No Active Project
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Please select a project to manage personas
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-6">
        {!hasActiveProject ? (
          // No Project State
          <div className="text-center py-12 text-gray-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium text-gray-600 mb-1">
              No Project Selected
            </p>
            <p className="text-xs text-gray-500">
              Select a project from the sidebar to manage personas
            </p>
          </div>
        ) : viewMode === 'list' ? (
          // List View
          <div className="space-y-4">
            {/* Create Button */}
            <button
              onClick={handleCreate}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3',
                'bg-gradient-to-r from-purple-600 to-blue-600',
                'text-white font-medium rounded-lg',
                'hover:from-purple-700 hover:to-blue-700',
                'transition-all duration-200',
                'shadow-md hover:shadow-lg'
              )}
            >
              <Plus className="w-5 h-5" />
              Create New Persona
            </button>

            {/* Personas List */}
            {personas.length > 0 ? (
              <div className="space-y-3">
                {personas.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    onEdit={() => handleEdit(persona)}
                    onDelete={() => handleDelete(persona.id)}
                  />
                ))}
              </div>
            ) : (
              // Empty State
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-sm font-medium text-gray-600 mb-1">
                  No Personas Yet
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Create your first persona to get started
                </p>
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create First Persona
                </button>
              </div>
            )}
          </div>
        ) : (
          // Form View (Create or Edit)
          <div className="space-y-4">
            {/* Back Button */}
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Personas</span>
            </button>

            {/* Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                {viewMode === 'edit' ? 'Edit Persona' : 'Create New Persona'}
              </h3>
              <PersonaForm
                persona={editingPersona}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
