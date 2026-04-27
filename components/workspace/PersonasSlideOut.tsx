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
import { logger } from '@/lib/utils/logger';
import {
  Users,
  Plus,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Folder,
  User,
  Edit2,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { PersonaForm, PERSONA_FORM_ID } from '@/components/workspace/PersonaForm';
import { cn } from '@/lib/utils';
import {
  useWorkspaceStore,
  useActiveProjectId,
  useProjects,
  usePendingPersonaEdit,
  usePendingEditActions,
  useProjectActions,
} from '@/lib/stores/workspaceStore';
import {
  getProjectPersonas,
  createPersona,
  updatePersona,
  deletePersona,
} from '@/lib/storage/unified-storage';
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
  const pendingPersonaEdit = usePendingPersonaEdit();
  const { setPendingPersonaEdit } = usePendingEditActions();
  const { refreshProjects, refreshAll } = useProjectActions();
  
  // Get active project
  const activeProject = React.useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  
  // Delete confirmation state
  const [personaToDelete, setPersonaToDelete] = useState<Persona | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mirrors PersonaForm's internal photo-upload progress. Used to disable
  // the Submit button rendered in this component's footer (the form itself
  // no longer owns its Submit button — see PersonaForm doc header).
  const [isPersonaFormUploading, setIsPersonaFormUploading] = useState(false);
  
  // Load personas when project changes or panel opens
  useEffect(() => {
    if (!isOpen || !activeProjectId) {
      setPersonas([]);
      return;
    }
    
    loadPersonas();
  }, [isOpen, activeProjectId]);
  
  // Check for pending persona edit and automatically switch to edit mode
  useEffect(() => {
    if (isOpen && pendingPersonaEdit && personas.length > 0) {
      // Find the persona by ID
      const personaToEdit = personas.find(p => p.id === pendingPersonaEdit);
      
      if (personaToEdit) {
        // Load into edit mode
        handleEdit(personaToEdit);
        
        // Clear the pending edit
        setPendingPersonaEdit(null);
      }
    }
  }, [isOpen, pendingPersonaEdit, personas, setPendingPersonaEdit]);
  
  /**
   * Load personas from storage
   */
  const loadPersonas = useCallback(async () => {
    if (!activeProjectId) return;
    
    const projectPersonas = await getProjectPersonas(activeProjectId);
    setPersonas(projectPersonas);
    logger.log(`📋 Loaded ${projectPersonas.length} persona(s)`);
  }, [activeProjectId]);
  
  /**
   * Handle create new persona
   */
  const handleCreateNew = useCallback(() => {
    setEditingPersona(null);
    setViewMode('create');
  }, []);
  
  /**
   * Handle edit persona
   */
  const handleEdit = useCallback((persona: Persona) => {
    setEditingPersona(persona);
    setViewMode('edit');
  }, []);
  
  /**
   * Handle back to list
   */
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setEditingPersona(null);
  }, []);
  
  /**
   * Handle save persona from PersonaForm
   */
  const handleSave = useCallback(async (personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => {
    // The form now guarantees personaData.projectId is a non-empty string
    // (validated inside PersonaForm before calling onSave). Treat it as
    // the source of truth for both create and edit flows so reassignment
    // "just works": editing a persona and picking a new project updates
    // the row's project_id on the server.
    const targetProjectId = personaData.projectId;

    if (!targetProjectId) {
      alert('No project selected for this persona. Please choose a project.');
      return;
    }

    try {
      if (viewMode === 'edit' && editingPersona) {
        // Pass targetProjectId as the "owner" argument to updatePersona
        // so the storage layer looks up the persona in the right local
        // cache bucket. The updates payload independently carries the new
        // projectId, which reaches the PUT endpoint and reassigns the row.
        await updatePersona(targetProjectId, editingPersona.id, personaData);
        logger.log('✅ Persona updated');
      } else {
        await createPersona(targetProjectId, personaData);
        logger.log('✅ Persona created');
      }

      // Refresh both the local persona list (for this slide-out) and the
      // workspace projects store (so the sidebar immediately reflects
      // any reassignment, mirroring the Brand Voice behavior).
      await Promise.all([loadPersonas(), refreshProjects()]);
      handleBackToList();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save persona. Please try again.';
      alert(errorMessage);
      logger.error('❌ Failed to save persona:', error);
    }
  }, [viewMode, editingPersona, loadPersonas, refreshProjects, handleBackToList]);
  
  /**
   * Handle delete persona - show confirmation modal
   */
  const handleDelete = useCallback((persona: Persona) => {
    setPersonaToDelete(persona);
  }, []);
  
  /**
   * Confirm delete persona
   */
  const confirmDelete = useCallback(async () => {
    if (!activeProjectId || !personaToDelete) return;
    
    setIsDeleting(true);
    
    try {
      await deletePersona(activeProjectId, personaToDelete.id);
      // Refresh both this slide-out's local list AND the workspace
      // projects store so PersonaSection in the sidebar drops the
      // deleted row immediately. Mirrors handleSave's refresh pattern.
      await Promise.all([loadPersonas(), refreshAll()]);
      logger.log('✅ Persona deleted');

      setPersonaToDelete(null);
    } catch (error) {
      logger.error('❌ Failed to delete persona:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete persona');
    } finally {
      setIsDeleting(false);
    }
  }, [activeProjectId, personaToDelete, loadPersonas, refreshAll]);
  
  /**
   * Cancel delete
   */
  const cancelDelete = useCallback(() => {
    setPersonaToDelete(null);
  }, []);
  
  // Panel footer — varies by view mode. Every variant uses a `variant="static"`
  // StickyActionBar (the SlideOutPanel footer slot is a flex-shrink-0 row inside
  // a fixed flex-column panel; that slot already reserves space, so the bar only
  // needs visual chrome).
  //
  // - list mode:        primary CTA "Create New Persona".
  // - create/edit mode: Cancel + Submit. Submit uses `form={PERSONA_FORM_ID}` +
  //                     `type="submit"` so clicking it triggers <PersonaForm>'s
  //                     submit handler via HTML5 form association — no refs,
  //                     no imperative handles, no prop threading. Submit is
  //                     disabled while PersonaForm's internal photo upload is
  //                     in flight (tracked via `isPersonaFormUploading`).
  let panelFooter: React.ReactNode = null;
  if (viewMode === 'list') {
    panelFooter = (
      <StickyActionBar variant="static">
        <Button
          variant="brand"
          size="default"
          onClick={handleCreateNew}
          disabled={!activeProject}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Persona
        </Button>
      </StickyActionBar>
    );
  } else {
    // create or edit
    const submitLabel = viewMode === 'edit' ? 'Update Persona' : 'Create Persona';
    panelFooter = (
      <StickyActionBar variant="static">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={PERSONA_FORM_ID}
            disabled={isPersonaFormUploading}
            className={cn(
              'flex-1 px-6 py-3 font-medium rounded-lg transition-all',
              'bg-gradient-to-r from-purple-600 to-blue-600',
              'text-white hover:from-purple-700 hover:to-blue-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-md hover:shadow-lg'
            )}
          >
            {submitLabel}
          </button>
        </div>
      </StickyActionBar>
    );
  }
  
  return (
    <>
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
          <PersonaForm
            persona={editingPersona}
            defaultProjectId={activeProjectId}
            onSave={handleSave}
            onUploadingChange={setIsPersonaFormUploading}
          />
        )}
      </div>
    </SlideOutPanel>
    
    {/* Delete Confirmation Modal */}
    <ConfirmationModal
      isOpen={!!personaToDelete}
      title="Delete Persona"
      message={`Delete "${personaToDelete?.name}"?`}
      description="This will permanently remove this persona. This cannot be undone."
      confirmLabel="Delete Persona"
      onClose={cancelDelete}
      onConfirm={confirmDelete}
      isConfirming={isDeleting}
      isDestructive={true}
    />
    </>
  );
}
