/**
 * @file components/workspace/ProjectSelector.tsx
 * @description Project selector dropdown component
 * 
 * Features:
 * - Shows current active project
 * - Dropdown menu to switch between projects
 * - Create new project option
 * - Rename/delete project actions
 * - Apple-style design aesthetic
 * 
 * @example
 * ```tsx
 * <ProjectSelector />
 * ```
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Folder,
  ChevronDown,
  Plus,
  MoreVertical,
  Check,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { useProjects, useActiveProjectId, useProjectActions } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils';

interface ProjectSelectorProps {
  /** Optional CSS classes */
  className?: string;
}

/**
 * ProjectSelector component - Dropdown for switching between projects
 */
export function ProjectSelector({ className }: ProjectSelectorProps) {
  const projects = useProjects();
  const activeProjectId = useActiveProjectId();
  const { setActiveProjectId, deleteProject, updateProject } = useProjectActions();

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get active project - memoize to avoid new references on every render
  const activeProject = React.useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingProjectId(null);
        setShowDeleteConfirm(null);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  /**
   * Handle project switch
   */
  const handleProjectSwitch = (projectId: string): void => {
    if (projectId === activeProjectId) {
      setIsOpen(false);
      return;
    }

    setActiveProjectId(projectId);
    setIsOpen(false);
    console.log('🔄 Switched to project:', projectId);
  };

  /**
   * Handle start editing project name
   */
  const handleStartEdit = (projectId: string, currentName: string): void => {
    setEditingProjectId(projectId);
    setEditingName(currentName);
  };

  /**
   * Handle save edited project name
   */
  const handleSaveEdit = (projectId: string): void => {
    const trimmedName = editingName.trim();
    
    if (!trimmedName) {
      setError('Project name cannot be empty');
      return;
    }

    try {
      updateProject(projectId, { name: trimmedName });
      setEditingProjectId(null);
      setEditingName('');
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update project');
    }
  };

  /**
   * Handle cancel editing
   */
  const handleCancelEdit = (): void => {
    setEditingProjectId(null);
    setEditingName('');
  };

  /**
   * Handle delete project
   */
  const handleDeleteProject = (projectId: string): void => {
    if (projects.length <= 1) {
      setError('Cannot delete the last project. At least one project must exist.');
      setShowDeleteConfirm(null);
      return;
    }

    try {
      deleteProject(projectId);
      setShowDeleteConfirm(null);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete project');
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
          'bg-white border border-gray-200',
          'hover:bg-gray-50 hover:border-gray-300',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          isOpen && 'ring-2 ring-apple-blue border-apple-blue'
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Folder className="w-4 h-4 text-apple-blue flex-shrink-0" />
          <span className="text-sm font-medium text-apple-text-dark truncate">
            {activeProject?.name || 'No Project'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-1 z-50',
            'bg-white border border-gray-200 rounded-lg shadow-lg',
            'max-h-80 overflow-y-auto custom-scrollbar',
            'py-1'
          )}
        >
          {/* Project List */}
          {projects.map((project) => (
            <div key={project.id}>
              {editingProjectId === project.id ? (
                // Edit Mode
                <div className="px-2 py-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(project.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-apple-blue rounded focus:outline-none focus:ring-1 focus:ring-apple-blue"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(project.id)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : showDeleteConfirm === project.id ? (
                // Delete Confirmation
                <div className="px-3 py-2 bg-red-50 border-l-2 border-red-500">
                  <p className="text-xs text-red-900 font-medium mb-2">
                    Delete "{project.name}"?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="flex-1 px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Normal Mode
                <div className="flex items-center group hover:bg-gray-50">
                  <button
                    onClick={() => handleProjectSwitch(project.id)}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-left"
                  >
                    <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-apple-text-dark flex-1 truncate">
                      {project.name}
                    </span>
                    {project.id === activeProjectId && (
                      <Check className="w-4 h-4 text-apple-blue flex-shrink-0" />
                    )}
                  </button>

                  {/* Actions Menu */}
                  <div className="relative pr-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle actions menu (simplified - just show inline)
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity"
                      title="More actions"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>

                    {/* Inline actions on hover */}
                    <div className="absolute right-full top-0 mr-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(project.id, project.name);
                        }}
                        className="p-1 bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 rounded shadow-sm"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(project.id);
                          }}
                          className="p-1 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 rounded shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Separator */}
          <div className="border-t border-gray-200 my-1" />

          {/* New Project Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowNewProjectDialog(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4 text-apple-blue" />
            <span className="text-sm font-medium text-apple-blue">New Project</span>
          </button>
        </div>
      )}

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <NewProjectDialog
          onClose={() => setShowNewProjectDialog(false)}
          onProjectCreated={(projectId) => {
            setShowNewProjectDialog(false);
            setActiveProjectId(projectId);
          }}
        />
      )}
    </div>
  );
}

/**
 * New Project Dialog Component (inline for now)
 */
function NewProjectDialog({
  onClose,
  onProjectCreated,
}: {
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}) {
  const [projectName, setProjectName] = useState('');
  const { addProject, refreshProjects } = useProjectActions();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = () => {
    const trimmedName = projectName.trim();

    if (!trimmedName) {
      setCreateError('Project name cannot be empty');
      return;
    }

    try {
      // Import dynamically to avoid SSR issues
      const { createProject } = require('@/lib/storage/project-storage');
      const newProject = createProject(trimmedName);
      
      // Refresh projects in store
      refreshProjects();
      
      // Notify parent
      onProjectCreated(newProject.id);
      
      console.log('✅ Project created:', newProject.name);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-apple-text-dark mb-4">
          Create New Project
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              setCreateError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="e.g., Marketing Campaign 2024"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent"
          />
          {createError && (
            <p className="mt-2 text-sm text-red-600">{createError}</p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-apple-blue hover:bg-blue-600 rounded-lg transition-colors"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
