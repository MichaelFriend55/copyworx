/**
 * @file components/workspace/MyProjectsSlideOut.tsx
 * @description Full-featured project navigator slide-out panel
 *
 * Features:
 * - Search/filter bar
 * - Project tree with Projects → Folders → Documents hierarchy
 *   (document/folder rendering delegated to DocumentList)
 * - Snippets section (project-scoped)
 * - Current document highlighting
 * - New Project / New Folder / New Document buttons
 * - Click document to open in editor (panel stays open)
 *
 * @example
 * ```tsx
 * <MyProjectsSlideOut
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onDocumentClick={(doc) => handleDocumentSelect(doc)}
 * />
 * ```
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Search,
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  Trash2,
  Pencil,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useWorkspaceStore,
  useProjects,
  useActiveProjectId,
  useProjectActions,
  useDocumentActions,
} from '@/lib/stores/workspaceStore';
import {
  createDocument,
  createFolder,
  createProject,
  updateProject,
  deleteProject as deleteProjectFromStorage,
} from '@/lib/storage/unified-storage';
import type { Project, ProjectDocument } from '@/lib/types/project';
import type { Snippet } from '@/lib/types/snippet';
import DocumentList from './DocumentList';
import { SnippetSection } from './SnippetSection';
import { SnippetModals } from './SnippetModals';
import { useSnippetActions, useSnippetStore } from '@/lib/stores/snippetStore';
import { DeleteProjectModal } from './DeleteProjectModal';
import { BrandVoiceSection } from './BrandVoiceSection';
import { PersonaSection } from './PersonaSection';

// ============================================================================
// Constants
// ============================================================================

/** Slide-out panel ID for state management */
export const MY_PROJECTS_PANEL_ID = 'my-projects';

// ============================================================================
// Types
// ============================================================================

interface MyProjectsSlideOutProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Callback when a document is clicked */
  onDocumentClick?: (doc: ProjectDocument) => void;
}

// ============================================================================
// ProjectSection
// ============================================================================

interface ProjectSectionProps {
  project: Project;
  isActive: boolean;
  isExpanded: boolean;
  /** Passed to SnippetSection / BrandVoiceSection / PersonaSection for filtering */
  searchQuery: string;
  /**
   * Incrementing key forwarded to DocumentList as `key` so it remounts
   * and reloads whenever the parent creates a folder/document via the
   * slideout's footer buttons.
   */
  refreshKey: number;
  onToggle: () => void;
  onSelect: () => void;
  onDocumentSelect: (doc: ProjectDocument) => void;
  onSnippetClick?: (snippet: Snippet) => void;
  onAddSnippet?: (projectId: string) => void;
  onEditSnippet?: (snippet: Snippet) => void;
  onDeleteProject?: (project: Project) => void;
  onRenameProject?: (projectId: string, newName: string) => void;
  canDelete: boolean;
}

function ProjectSection({
  project,
  isActive,
  isExpanded,
  searchQuery,
  refreshKey,
  onToggle,
  onSelect,
  onDocumentSelect,
  onSnippetClick,
  onAddSnippet,
  onEditSnippet,
  onDeleteProject,
  onRenameProject,
  canDelete,
}: ProjectSectionProps) {
  // Project rename state
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameEditValue, setProjectNameEditValue] = useState('');

  const handleStartProjectRename = () => {
    setIsEditingProjectName(true);
    setProjectNameEditValue(project.name);
  };

  const handleSaveProjectRename = () => {
    const trimmedName = projectNameEditValue.trim();
    if (!trimmedName) {
      setIsEditingProjectName(false);
      setProjectNameEditValue('');
      return;
    }
    if (trimmedName !== project.name) {
      onRenameProject?.(project.id, trimmedName);
    }
    setIsEditingProjectName(false);
    setProjectNameEditValue('');
  };

  const handleCancelProjectRename = () => {
    setIsEditingProjectName(false);
    setProjectNameEditValue('');
  };

  const handleProjectRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveProjectRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelProjectRename();
    }
  };

  return (
    <div className="mb-3">
      {/* Project header */}
      <div
        className={cn(
          'group flex items-center gap-1.5 px-2 py-1.5 rounded-md',
          'transition-colors duration-150',
          isActive
            ? 'bg-blue-100 border border-blue-300'
            : 'hover:bg-gray-100 border border-transparent',
          !isEditingProjectName && 'cursor-pointer'
        )}
        onClick={() => {
          if (isEditingProjectName) return;
          if (!isActive) {
            onSelect();
          }
          onToggle();
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
        )}

        <FolderIcon className={cn(
          'h-4 w-4 flex-shrink-0',
          isActive ? 'text-blue-600' : 'text-gray-400'
        )} />

        {/* Project name — editable or display */}
        {isEditingProjectName ? (
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              value={projectNameEditValue}
              onChange={(e) => setProjectNameEditValue(e.target.value)}
              onKeyDown={handleProjectRenameKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1.5 py-0.5 text-xs font-semibold border-2 border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              autoFocus
              placeholder="Project name"
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleSaveProjectRename(); }}
              className="p-0.5 text-green-600 hover:bg-green-50 rounded flex-shrink-0"
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancelProjectRename(); }}
              className="p-0.5 text-gray-500 hover:bg-gray-100 rounded flex-shrink-0"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className={cn(
              'flex-1 text-xs font-semibold truncate',
              isActive ? 'text-blue-900' : 'text-gray-900'
            )}>
              {project.name}
            </span>

            {isActive && (
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">
                Active
              </span>
            )}

            <span className="text-[10px] text-gray-500 flex-shrink-0">
              {project.documents.length} docs
            </span>

            {/* Rename button — visible on hover */}
            <button
              onClick={(e) => { e.stopPropagation(); handleStartProjectRename(); }}
              className={cn(
                'p-1 rounded opacity-0 group-hover:opacity-100',
                'hover:bg-blue-100 transition-all duration-150',
                'flex-shrink-0'
              )}
              title="Rename project"
              aria-label={`Rename project ${project.name}`}
            >
              <Pencil className="h-3 w-3 text-blue-600" />
            </button>

            {/* Delete button — visible on hover */}
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteProject?.(project); }}
                className={cn(
                  'p-1 rounded opacity-0 group-hover:opacity-100',
                  'hover:bg-red-100 transition-all duration-150',
                  'flex-shrink-0'
                )}
                title="Delete project"
                aria-label={`Delete project ${project.name}`}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Project contents */}
      {isExpanded && (
        <div className="mt-1 ml-2 pl-2 border-l-2 border-gray-200">
          {/*
           * Document & folder tree.
           * DocumentList reads activeProjectId from the Zustand store.
           * The accordion ensures a project is always made active before
           * being expanded, so the two are always in sync.
           * key={refreshKey} remounts DocumentList whenever the footer
           * creates a folder/document, forcing a fresh data load.
           */}
          <DocumentList
            key={refreshKey}
            onDocumentClick={onDocumentSelect}
            showCreateButtons={false}
          />

          {/* Snippets section */}
          <SnippetSection
            projectId={project.id}
            isExpanded={isExpanded}
            searchQuery={searchQuery}
            onSnippetClick={onSnippetClick}
            onAddSnippet={onAddSnippet}
            onEditSnippet={onEditSnippet}
          />

          {/* Brand Voice section */}
          <BrandVoiceSection
            project={project}
            isExpanded={isExpanded}
            searchQuery={searchQuery}
          />

          {/* Personas section */}
          <PersonaSection
            project={project}
            isExpanded={isExpanded}
            searchQuery={searchQuery}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MyProjectsSlideOut({
  isOpen,
  onClose,
  onDocumentClick,
}: MyProjectsSlideOutProps) {
  // Store state
  const projects = useProjects();
  const activeProjectId = useActiveProjectId();
  const { setActiveProjectId } = useProjectActions();
  const { setActiveDocumentId } = useDocumentActions();

  // Snippet store actions
  const {
    loadSnippets,
    insertSnippet,
    openAddModal,
    openEditModal,
  } = useSnippetActions();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  // ACCORDION BEHAVIOR: Only track one expanded project ID at a time
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Delete project modal state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Track previous isOpen to detect open transitions
  const wasOpenRef = React.useRef(false);

  // Auto-expand active project on open
  useEffect(() => {
    if (isOpen && activeProjectId) {
      setExpandedProjectId(activeProjectId);
    }
  }, [isOpen, activeProjectId]);

  // Refresh projects only when panel opens (not on every render)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      useWorkspaceStore.getState().refreshProjects();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Toggle project expansion — ACCORDION: only one open at a time
  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjectId(prev => (prev === projectId ? null : projectId));
  }, []);

  // Handle document selection — panel stays open
  const handleDocumentSelect = useCallback((doc: ProjectDocument) => {
    // Set active document in store
    setActiveDocumentId(doc.id);

    // If document is in a different project, switch projects first
    if (doc.projectId !== activeProjectId) {
      setActiveProjectId(doc.projectId);
    }

    // Notify parent (editor loads the document)
    onDocumentClick?.(doc);

    // NOTE: onClose() intentionally not called — the panel stays open
  }, [activeProjectId, setActiveProjectId, setActiveDocumentId, onDocumentClick]);

  // Handle project selection
  const handleProjectSelect = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
  }, [setActiveProjectId]);

  // Create new project
  const handleCreateProject = useCallback(async () => {
    const name = window.prompt('Project name:');
    if (!name?.trim()) return;

    try {
      const newProject = await createProject(name.trim());
      useWorkspaceStore.getState().refreshProjects();
      setActiveProjectId(newProject.id);
      // ACCORDION: Auto-expand the newly created project
      setExpandedProjectId(newProject.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create project');
    }
  }, [setActiveProjectId]);

  // Create new folder in active project
  const handleCreateFolder = useCallback(() => {
    if (!activeProjectId) {
      window.alert('Please select a project first');
      return;
    }

    const name = window.prompt('Folder name:');
    if (!name?.trim()) return;

    try {
      createFolder(activeProjectId, name.trim());
      setRefreshKey(k => k + 1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create folder');
    }
  }, [activeProjectId]);

  // Create new document in active project
  const handleCreateDocument = useCallback(async () => {
    if (!activeProjectId) {
      window.alert('Please select a project first');
      return;
    }

    const title = window.prompt('Document title:');
    if (!title?.trim()) return;

    try {
      const newDoc = await createDocument(activeProjectId, title.trim());
      setRefreshKey(k => k + 1);
      handleDocumentSelect(newDoc);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create document');
    }
  }, [activeProjectId, handleDocumentSelect]);

  // Delete project handlers
  const handleOpenDeleteModal = useCallback((project: Project) => {
    setProjectToDelete(project);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setProjectToDelete(null);
    }
  }, [isDeleting]);

  const handleConfirmDelete = useCallback(async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);

    try {
      const deletingActiveProject = projectToDelete.id === activeProjectId;
      const projectIdToDelete = projectToDelete.id;
      const isLastProject = projects.length <= 1;

      // If this is the last project, create a default one first
      if (isLastProject) {
        logger.log('📝 Creating default project before deleting last project...');
        const newProject = await createProject('My Project');
        useWorkspaceStore.getState().refreshProjects();
        setActiveProjectId(newProject.id);
        setExpandedProjectId(newProject.id);
      }

      // Delete from storage
      deleteProjectFromStorage(projectIdToDelete);

      // Refresh the store state
      useWorkspaceStore.getState().refreshProjects();

      if (deletingActiveProject) {
        setActiveDocumentId(null);
      }

      if (expandedProjectId === projectIdToDelete) {
        setExpandedProjectId(null);
      }

      setRefreshKey(k => k + 1);

      logger.log('✅ Project deleted:', projectToDelete.name);
    } catch (error) {
      logger.error('❌ Failed to delete project:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to delete project');
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  }, [projectToDelete, projects.length, activeProjectId, setActiveDocumentId, setActiveProjectId, expandedProjectId]);

  // Always allow delete — we'll auto-create a default project if needed
  const canDeleteProject = true;

  // Rename project handler
  const handleRenameProject = useCallback(async (projectId: string, newName: string) => {
    try {
      await updateProject(projectId, { name: newName });
      useWorkspaceStore.getState().refreshProjects();
      setRefreshKey(k => k + 1);
      logger.log('✅ Project renamed:', { projectId, newName });
    } catch (error) {
      logger.error('❌ Failed to rename project:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to rename project');
    }
  }, []);

  // Snippet handlers
  const handleSnippetClick = useCallback((snippet: Snippet) => {
    if (snippet.projectId !== activeProjectId) {
      loadSnippets(snippet.projectId);
    }
    insertSnippet(snippet);
  }, [activeProjectId, loadSnippets, insertSnippet]);

  const handleAddSnippet = useCallback((projectId: string) => {
    loadSnippets(projectId);
    openAddModal();
  }, [loadSnippets, openAddModal]);

  const handleEditSnippet = useCallback((snippet: Snippet) => {
    loadSnippets(snippet.projectId);
    openEditModal(snippet);
  }, [loadSnippets, openEditModal]);

  // Panel footer
  const panelFooter = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateFolder}
        disabled={!activeProjectId}
        className="flex-1"
      >
        <FolderPlus className="h-4 w-4 mr-2" />
        New Folder
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateDocument}
        disabled={!activeProjectId}
        className="flex-1"
      >
        <FilePlus className="h-4 w-4 mr-2" />
        New Document
      </Button>
    </div>
  );

  return (
    <>
      <SlideOutPanel
        isOpen={isOpen}
        onClose={onClose}
        side="left"
        title="My Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        footer={panelFooter}
      >
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* New Project button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateProject}
            className="w-full justify-start"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>

          {/* Project list */}
          <div className="space-y-2">
            {projects.map(project => (
              <ProjectSection
                key={project.id}
                project={project}
                isActive={project.id === activeProjectId}
                isExpanded={expandedProjectId === project.id}
                searchQuery={searchQuery}
                refreshKey={refreshKey}
                onToggle={() => toggleProject(project.id)}
                onSelect={() => handleProjectSelect(project.id)}
                onDocumentSelect={handleDocumentSelect}
                onSnippetClick={handleSnippetClick}
                onAddSnippet={handleAddSnippet}
                onEditSnippet={handleEditSnippet}
                onDeleteProject={handleOpenDeleteModal}
                onRenameProject={handleRenameProject}
                canDelete={canDeleteProject}
              />
            ))}

            {/* Empty state */}
            {projects.length === 0 && (
              <div className="text-center py-8">
                <FolderIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No projects yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Create a project to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </SlideOutPanel>

      {/* Snippet modals */}
      <SnippetModals />

      {/* Delete project confirmation modal */}
      <DeleteProjectModal
        isOpen={projectToDelete !== null}
        projectName={projectToDelete?.name || ''}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}

export default MyProjectsSlideOut;
