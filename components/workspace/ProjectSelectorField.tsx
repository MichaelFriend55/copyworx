/**
 * @file components/workspace/ProjectSelectorField.tsx
 * @description Form field for selecting or creating a project owner for a
 *   Brand Voice or Persona.
 *
 * Used inside the Brand Voice and Persona edit modals to let users reassign
 * those entities to a different project. The dropdown is populated from the
 * Zustand workspace store (same source as the sidebar, no new fetch needed)
 * and includes a pinned "+ Create New Project" option that reveals an inline
 * create form without leaving the modal.
 *
 * Styling convention: matches the native <select> in PersonaCheck
 * (apple-blue focus ring) rather than the purple accent used elsewhere in
 * PersonaForm — this keeps the reassignment field visually consistent
 * between the Brand Voice and Persona edit flows.
 */

'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import { useProjects, useProjectActions } from '@/lib/stores/workspaceStore';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Sentinel value for the "+ Create New Project" option. Must not collide
 *  with any real UUID — chosen to be obviously not a UUID. */
const CREATE_NEW_SENTINEL = '__create_new_project__';

/** Maximum length for a project name (mirrors backend validation). */
const MAX_PROJECT_NAME_LENGTH = 100;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ProjectSelectorFieldProps {
  /**
   * Currently selected project_id. `null` renders the field with no
   * selection — the user must pick one before save succeeds (the parent
   * form is responsible for that validation).
   */
  value: string | null;

  /**
   * Fired when the selected project_id changes, either because the user
   * picked an existing project or because a newly created project was
   * auto-selected after successful creation.
   */
  onChange: (projectId: string) => void;

  /** Field label. Defaults to "Project". */
  label?: string;

  /** Helper text rendered below the label. */
  helperText?: string;

  /** Disables both the dropdown and the inline create form. */
  disabled?: boolean;
}

// ═══════════════════════════════════════════════════════════
// API helper — inline project creation
// ═══════════════════════════════════════════════════════════

/**
 * Create a project via the public CRUD endpoint and return its id.
 * Throws on any non-2xx response; caller is responsible for surfacing the
 * error to the user.
 */
async function createProjectOnServer(name: string): Promise<{ id: string; name: string }> {
  const response = await fetch('/api/db/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.details || payload.error || 'Failed to create project');
  }

  const data = await response.json();
  if (typeof data?.id !== 'string') {
    throw new Error('Project creation response did not include an id');
  }
  return { id: data.id, name: data.name };
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ProjectSelectorField({
  value,
  onChange,
  label = 'Project',
  helperText = 'Choose which project this belongs to',
  disabled = false,
}: ProjectSelectorFieldProps) {
  const projects = useProjects();
  const { refreshProjects } = useProjectActions();

  // Inline-create UI state. `isCreating` flips the dropdown into its
  // compact create form. `newProjectName` / error / busy state drive the
  // POST request and its feedback. We intentionally keep this state local
  // — the parent form does not need to know about the creation flow.
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Empty projects list is surfaced as a read-only fallback option so the
  // user is never silently left with an empty dropdown. The spec mandates
  // this visible fallback.
  const hasLoadError = !Array.isArray(projects);

  // Sort alphabetically, case-insensitive, for a stable predictable order.
  const sortedProjects = useMemo(() => {
    if (!Array.isArray(projects)) return [];
    return [...projects].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [projects]);

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = event.target.value;

      if (selected === CREATE_NEW_SENTINEL) {
        // Spec: do NOT fire onChange — instead reveal inline create form.
        setIsCreating(true);
        setCreateError(null);
        setNewProjectName('');
        // Defer focus to after render so the input exists in the DOM.
        requestAnimationFrame(() => nameInputRef.current?.focus());
        return;
      }

      onChange(selected);
    },
    [onChange]
  );

  const cancelInlineCreate = useCallback(() => {
    setIsCreating(false);
    setNewProjectName('');
    setCreateError(null);
  }, []);

  const submitInlineCreate = useCallback(async () => {
    const trimmed = newProjectName.trim();

    if (trimmed.length === 0) {
      setCreateError('Project name is required');
      return;
    }

    if (trimmed.length > MAX_PROJECT_NAME_LENGTH) {
      setCreateError(`Project name cannot exceed ${MAX_PROJECT_NAME_LENGTH} characters`);
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      const created = await createProjectOnServer(trimmed);

      // Refresh the Zustand-backed projects list so both this dropdown
      // and the sidebar show the new project without a page reload.
      await refreshProjects();

      // Auto-select the newly created project per spec.
      onChange(created.id);

      setIsCreating(false);
      setNewProjectName('');
      logger.log('✅ Project created inline from ProjectSelectorField:', created.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create project. Please try again.';
      setCreateError(message);
      logger.error('❌ Inline project creation failed:', error);
    } finally {
      setIsSubmittingCreate(false);
    }
  }, [newProjectName, onChange, refreshProjects]);

  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void submitInlineCreate();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelInlineCreate();
      }
    },
    [submitInlineCreate, cancelInlineCreate]
  );

  return (
    <div className="space-y-2">
      <label
        htmlFor="project-selector-field"
        className="block text-sm font-medium text-gray-900"
      >
        {label}
      </label>

      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}

      {/* Dropdown */}
      <select
        id="project-selector-field"
        value={value ?? ''}
        onChange={handleSelectChange}
        disabled={disabled || isSubmittingCreate}
        aria-label={label}
        className={cn(
          'w-full px-3 py-2 rounded-lg border border-gray-200',
          'text-sm text-gray-900 bg-white',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          'disabled:bg-gray-50 disabled:opacity-50',
          'transition-colors duration-150'
        )}
      >
        {/* Empty state when no value is set yet */}
        {value === null && <option value="">Select a project…</option>}

        {/* Pinned "+ Create New Project" option at the top of the list.
            Rendered only when not currently in the inline-create view so
            selecting it can't accidentally re-trigger the form. */}
        {!isCreating && (
          <option value={CREATE_NEW_SENTINEL}>+ Create New Project</option>
        )}

        {/* Load-error fallback — spec-mandated user-facing message. */}
        {hasLoadError && (
          <option value="" disabled>
            Could not load projects — please refresh
          </option>
        )}

        {/* Existing projects */}
        {sortedProjects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      {/* Inline "Create New Project" form — revealed directly below the
          dropdown when the user selects the sentinel option. Stays within
          the parent modal; no navigation. */}
      {isCreating && (
        <div
          className={cn(
            'mt-2 p-3 space-y-3 border border-gray-200 rounded-lg bg-gray-50'
          )}
        >
          <label
            htmlFor="project-selector-new-name"
            className="block text-sm font-medium text-gray-900"
          >
            Project Name <span className="text-red-600">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="project-selector-new-name"
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={handleNameKeyDown}
            placeholder="e.g., Q2 Launch Campaign"
            disabled={isSubmittingCreate || disabled}
            maxLength={MAX_PROJECT_NAME_LENGTH}
            className={cn(
              'w-full px-3 py-2 rounded-lg border border-gray-200',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'disabled:bg-gray-100 disabled:opacity-50',
              'placeholder:text-gray-400'
            )}
          />

          {createError && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{createError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitInlineCreate}
              disabled={isSubmittingCreate || disabled}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium rounded-lg',
                'bg-apple-blue text-white hover:bg-blue-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'transition-colors duration-150',
                'inline-flex items-center justify-center gap-2'
              )}
            >
              {isSubmittingCreate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Project'
              )}
            </button>
            <button
              type="button"
              onClick={cancelInlineCreate}
              disabled={isSubmittingCreate}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium rounded-lg',
                'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'transition-colors duration-150'
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
