/**
 * @file components/workspace/BrandVoiceSlideOut.tsx
 * @description Brand Voice management slide-out panel
 * 
 * Features:
 * - List all brand voices for the user
 * - Create new brand voices
 * - Edit existing brand voices
 * - Delete brand voices with confirmation
 * - Assign brand voice to current project
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Volume2,
  Save,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Plus,
  Pencil,
  ArrowLeft,
  Loader2,
  Star,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Button } from '@/components/ui/button';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ProjectSelectorField } from '@/components/workspace/ProjectSelectorField';
import { cn } from '@/lib/utils';
import {
  useWorkspaceStore,
  useActiveProjectId,
  useProjects,
  usePendingBrandVoiceEdit,
  usePendingEditActions,
  useProjectActions,
} from '@/lib/stores/workspaceStore';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Unique ID for the brand voice slide-out panel */
export const BRAND_VOICE_PANEL_ID = 'brand-voice-setup';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface BrandVoiceSlideOutProps {
  /** Whether the slide-out is open */
  isOpen: boolean;
  
  /** Callback when slide-out should close */
  onClose: () => void;
}

/**
 * Brand voice data from the API
 */
interface BrandVoiceData {
  id: string;
  project_id: string | null;
  brand_name: string;
  brand_tone: string;
  approved_phrases: string[];
  forbidden_words: string[];
  brand_values: string[];
  mission_statement: string;
  /** Up to 5 pieces of existing brand copy for AI voice grounding */
  writing_samples: string[];
  created_at: string;
  updated_at: string;
}

type ViewMode = 'list' | 'create' | 'edit';

// ═══════════════════════════════════════════════════════════
// WRITING SAMPLES CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Maximum number of Writing Samples a user can save on a single brand voice. */
const MAX_WRITING_SAMPLES = 5;

/**
 * Minimum character length for a non-empty Writing Sample. Empties are allowed
 * (and filtered out on save); partially-filled samples below this threshold
 * trigger an inline validation message.
 */
const MIN_SAMPLE_LENGTH = 20;

const SAMPLE_PLACEHOLDER =
  'e.g., "At Cornerstone, the doctor who delivered your baby might be the one your daughter sees for her sports physical twenty years later. That\'s not marketing. That\'s how we practice medicine."';

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function BrandVoiceSlideOut({
  isOpen,
  onClose,
}: BrandVoiceSlideOutProps) {
  // Store state
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const pendingBrandVoiceEdit = usePendingBrandVoiceEdit();
  const { setPendingBrandVoiceEdit } = usePendingEditActions();
  const { refreshProjects } = useProjectActions();
  
  // Get active project
  const activeProject = React.useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingBrandVoice, setEditingBrandVoice] = useState<BrandVoiceData | null>(null);
  
  // Brand voices list state
  const [brandVoices, setBrandVoices] = useState<BrandVoiceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Migration state
  const [showMigrationNeeded, setShowMigrationNeeded] = useState(false);
  const [migrationSql, setMigrationSql] = useState<string | null>(null);
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  
  // Form state
  const [brandName, setBrandName] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [approvedPhrases, setApprovedPhrases] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [missionStatement, setMissionStatement] = useState('');
  /**
   * Writing Samples form state — always contains at least one textarea so the
   * user sees an input to type into on the create flow. Entries may be empty
   * (filtered out on save) or below MIN_SAMPLE_LENGTH (shows inline warning).
   */
  const [writingSamples, setWritingSamples] = useState<string[]>(['']);

  /**
   * Currently-selected owning project for this brand voice.
   *
   * - Edit mode: initialized from the loaded brand voice's project_id.
   * - Create mode: defaults to the currently active project (if any).
   *
   * Null is a valid runtime state (a brand voice can legally live with no
   * project since migration 001), but the save handler requires a value
   * before hitting POST so new brand voices always have an organizational
   * home on creation.
   */
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBrandVoice, setDeletingBrandVoice] = useState<BrandVoiceData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Fetch all brand voices for the user
   */
  const fetchBrandVoices = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      const response = await fetch('/api/db/all-brand-voices');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch brand voices');
      }
      
      const data = await response.json();
      
      // Transform the data to match our expected format
      const transformedData: BrandVoiceData[] = data.map((bv: any) => ({
        id: bv.id,
        project_id: bv.projectId,
        brand_name: bv.brandName,
        brand_tone: bv.brandTone || '',
        approved_phrases: bv.approvedPhrases || [],
        forbidden_words: bv.forbiddenWords || [],
        brand_values: bv.brandValues || [],
        mission_statement: bv.missionStatement || '',
        writing_samples: Array.isArray(bv.writingSamples) ? bv.writingSamples : [],
        created_at: bv.createdAt,
        updated_at: bv.updatedAt,
      }));
      
      setBrandVoices(transformedData);
    } catch (error) {
      logger.error('Failed to fetch brand voices:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load brand voices');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Fetch brand voices when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchBrandVoices();
      setViewMode('list');
    }
  }, [isOpen, fetchBrandVoices]);
  
  // Check for pending brand voice edit and automatically switch to edit mode
  useEffect(() => {
    if (isOpen && pendingBrandVoiceEdit && brandVoices.length > 0) {
      // Find the brand voice by name
      const brandVoiceToEdit = brandVoices.find(bv => bv.brand_name === pendingBrandVoiceEdit);
      
      if (brandVoiceToEdit) {
        // Load into edit mode
        handleEdit(brandVoiceToEdit);
        
        // Clear the pending edit
        setPendingBrandVoiceEdit(null);
      }
    }
  }, [isOpen, pendingBrandVoiceEdit, brandVoices, setPendingBrandVoiceEdit]);
  
  // ═══════════════════════════════════════════════════════════
  // FORM HANDLERS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Reset form to empty state
   */
  const resetForm = useCallback(() => {
    setBrandName('');
    setBrandTone('');
    setApprovedPhrases('');
    setForbiddenWords('');
    setBrandValues('');
    setMissionStatement('');
    // Always render at least one empty textarea on new-brand-voice creation
    // so the user sees a prompt to add samples.
    setWritingSamples(['']);
    // Create-flow default: owning project = the currently active project.
    // Edit-flow will overwrite this in loadBrandVoiceIntoForm before render.
    setProjectId(activeProjectId ?? null);
    setSaveError(null);
    setSaveSuccess(false);
  }, [activeProjectId]);

  /**
   * Load brand voice data into form
   */
  const loadBrandVoiceIntoForm = useCallback((bv: BrandVoiceData) => {
    setBrandName(bv.brand_name);
    setBrandTone(bv.brand_tone);
    setApprovedPhrases(bv.approved_phrases.join('\n'));
    setForbiddenWords(bv.forbidden_words.join('\n'));
    setBrandValues(bv.brand_values.join('\n'));
    setMissionStatement(bv.mission_statement);
    // Edit flow: render one textarea per existing sample, or a single empty
    // textarea if this brand voice predates the Writing Samples feature.
    setWritingSamples(
      Array.isArray(bv.writing_samples) && bv.writing_samples.length > 0
        ? [...bv.writing_samples]
        : ['']
    );
    // Edit flow: initialize the project dropdown from the brand voice's
    // current owning project so reassignment only happens when the user
    // explicitly picks a different project.
    setProjectId(bv.project_id ?? null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // WRITING SAMPLES HANDLERS
  // ═══════════════════════════════════════════════════════════

  /** Update the text of a single Writing Sample at the given index. */
  const updateWritingSample = useCallback((index: number, value: string) => {
    setWritingSamples((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  /**
   * Remove a Writing Sample textarea. Keeps at least one textarea rendered so
   * the user always has a place to type.
   */
  const removeWritingSample = useCallback((index: number) => {
    setWritingSamples((prev) => {
      if (prev.length <= 1) {
        return [''];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  /** Append a new empty Writing Sample textarea (capped at MAX_WRITING_SAMPLES). */
  const addWritingSample = useCallback(() => {
    setWritingSamples((prev) => {
      if (prev.length >= MAX_WRITING_SAMPLES) {
        return prev;
      }
      return [...prev, ''];
    });
  }, []);
  
  /**
   * Handle creating a new brand voice
   */
  const handleCreateNew = useCallback(() => {
    resetForm();
    setEditingBrandVoice(null);
    setViewMode('create');
  }, [resetForm]);
  
  /**
   * Handle editing a brand voice
   */
  const handleEdit = useCallback((bv: BrandVoiceData) => {
    loadBrandVoiceIntoForm(bv);
    setEditingBrandVoice(bv);
    setViewMode('edit');
  }, [loadBrandVoiceIntoForm]);
  
  /**
   * Handle back to list
   */
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setEditingBrandVoice(null);
    resetForm();
  }, [resetForm]);
  
  /**
   * Handle save brand voice (create or update)
   */
  const handleSave = useCallback(async () => {
    setSaveError(null);
    setSaveSuccess(false);
    
    // Validate required fields
    if (!brandName.trim()) {
      setSaveError('Brand Name is required');
      return;
    }

    // For creating new brand voices, we need a project (until migration is run).
    // The project is picked via the ProjectSelectorField and falls back to
    // the active project on mount; reject save only if both are missing.
    if (viewMode === 'create' && !projectId && !activeProjectId) {
      setSaveError('Please select a project first. Brand voices need to be associated with a project.');
      return;
    }

    // Validate Writing Samples: entries that have content below MIN_SAMPLE_LENGTH
    // must either be expanded to meet the threshold or cleared entirely. Empty
    // strings are allowed and stripped on save.
    const invalidSampleIndex = writingSamples.findIndex((sample) => {
      const trimmed = sample.trim();
      return trimmed.length > 0 && trimmed.length < MIN_SAMPLE_LENGTH;
    });
    if (invalidSampleIndex !== -1) {
      setSaveError(
        `Writing Sample ${invalidSampleIndex + 1} must be at least ${MIN_SAMPLE_LENGTH} characters or empty.`
      );
      return;
    }

    setIsSaving(true);

    try {
      // Filter out empty samples before writing to DB. Only persist non-empty
      // strings so a user who adds then clears a textarea doesn't leave noise
      // in the stored array.
      const cleanedWritingSamples = writingSamples
        .map((sample) => sample.trim())
        .filter((sample) => sample.length > 0)
        .slice(0, MAX_WRITING_SAMPLES);

      const brandVoiceData: Record<string, unknown> = {
        brand_name: brandName.trim(),
        brand_tone: brandTone.trim(),
        approved_phrases: approvedPhrases
          .split('\n')
          .map(p => p.trim())
          .filter(Boolean),
        forbidden_words: forbiddenWords
          .split('\n')
          .map(w => w.trim())
          .filter(Boolean),
        brand_values: brandValues
          .split('\n')
          .map(v => v.trim())
          .filter(Boolean),
        mission_statement: missionStatement.trim(),
        writing_samples: cleanedWritingSamples,
      };
      
      let response: Response;
      
      if (viewMode === 'edit' && editingBrandVoice) {
        // Update existing brand voice. Always include project_id so the
        // server can reassign the owning project when the user picks a
        // different one in the dropdown. Sending the unchanged value is
        // a no-op — see brand-voices PUT handler.
        response = await fetch('/api/db/brand-voices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingBrandVoice.id,
            project_id: projectId,
            ...brandVoiceData,
          }),
        });
      } else {
        // Create new brand voice. Use the project picked in the dropdown
        // (may be null if the user intentionally cleared it, but we block
        // that earlier for create mode). Fall back to the active project
        // for backwards compatibility.
        response = await fetch('/api/db/brand-voices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...brandVoiceData,
            project_id: projectId ?? activeProjectId,
          }),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Provide helpful error messages
        if (response.status === 409) {
          // Show migration needed UI instead of error
          setShowMigrationNeeded(true);
          setMigrationSql(`-- Run this in Supabase SQL Editor
ALTER TABLE brand_voices DROP CONSTRAINT IF EXISTS brand_voices_project_id_key;
ALTER TABLE brand_voices ALTER COLUMN project_id DROP NOT NULL;`);
          throw new Error(
            'A brand voice already exists for this project. Click "Enable Multiple Brand Voices" below to fix this.'
          );
        }
        
        throw new Error(errorData.details || errorData.error || 'Failed to save brand voice');
      }
      
      setSaveSuccess(true);
      logger.log(`✅ Brand voice ${viewMode === 'edit' ? 'updated' : 'created'}`);

      // Refresh the brand voices list (this slide-out) AND the workspace
      // projects store so the sidebar reflects the reassignment without
      // requiring a page reload. Both fetches run in parallel — failure
      // of refreshProjects is non-fatal for the save itself.
      await Promise.all([fetchBrandVoices(), refreshProjects()]);

      setTimeout(() => {
        setSaveSuccess(false);
        handleBackToList();
      }, 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save brand voice. Please try again.';
      setSaveError(errorMessage);
      logger.error('❌ Failed to save brand voice:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    brandName, brandTone, approvedPhrases, forbiddenWords, brandValues, missionStatement,
    writingSamples, activeProjectId, projectId,
    viewMode, editingBrandVoice, fetchBrandVoices, refreshProjects, handleBackToList
  ]);
  
  /**
   * Handle delete button click - show confirmation
   */
  const handleDeleteClick = useCallback((bv: BrandVoiceData) => {
    setDeletingBrandVoice(bv);
    setShowDeleteModal(true);
  }, []);
  
  /**
   * Confirm delete brand voice
   */
  const confirmDelete = useCallback(async () => {
    if (!deletingBrandVoice) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/db/brand-voices?id=${deletingBrandVoice.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete brand voice');
      }
      
      logger.log('✅ Brand voice deleted');
      
      // Refresh the list
      await fetchBrandVoices();
      
      // Also update Zustand store if this brand voice was assigned to any project
      const { projects } = useWorkspaceStore.getState();
      const updatedProjects = projects.map(p => {
        if (p.brandVoice && p.brandVoice.id === deletingBrandVoice.id) {
          return { ...p, brandVoice: null };
        }
        return p;
      });
      useWorkspaceStore.setState({ projects: updatedProjects });
      
      setShowDeleteModal(false);
      setDeletingBrandVoice(null);
      
    } catch (error) {
      logger.error('❌ Failed to delete brand voice:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to delete brand voice');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingBrandVoice, fetchBrandVoices]);
  
  /**
   * Cancel delete
   */
  const cancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setDeletingBrandVoice(null);
  }, []);
  
  /**
   * Run database migration to enable multiple brand voices
   */
  const handleRunMigration = useCallback(async () => {
    setIsRunningMigration(true);
    
    try {
      const response = await fetch('/api/db/run-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migration: 'multiple-brand-voices' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Migration succeeded
        setShowMigrationNeeded(false);
        setMigrationSql(null);
        setSaveError(null);
        // User can now click save again
      } else {
        // Migration failed, show the SQL to copy
        setMigrationSql(data.sql);
        setSaveError('Automatic migration failed. Please copy and run the SQL below in your Supabase SQL Editor, then try saving again.');
      }
    } catch (error) {
      setSaveError('Failed to run migration. Please copy the SQL below and run it manually in Supabase SQL Editor.');
    } finally {
      setIsRunningMigration(false);
    }
  }, []);
  
  // ═══════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Render the list view
   */
  const renderListView = () => (
    <div className="space-y-4">
      {/* Create New Button */}
      <Button
        variant="brand"
        size="default"
        onClick={handleCreateNew}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        New Brand Voice
      </Button>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-apple-blue" />
          <span className="ml-2 text-sm text-gray-600">Loading brand voices...</span>
        </div>
      )}
      
      {/* Error State */}
      {loadError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{loadError}</p>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && !loadError && brandVoices.length === 0 && (
        <div className="text-center py-8">
          <Volume2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No brand voices yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Create your first brand voice to get started
          </p>
        </div>
      )}
      
      {/* Brand Voices List */}
      {!isLoading && !loadError && brandVoices.length > 0 && (
        <div className="space-y-2">
          {brandVoices.map((bv) => {
            // Check if this brand voice is currently assigned to the active
            // project. Compare by id (not name) so two voices sharing a name
            // don't both light up, and so the check stays in sync with the
            // sidebar's Active pill which is also id-based.
            const isCurrentBrandVoice = activeProject?.brandVoice?.id === bv.id;
            
            return (
              <div
                key={bv.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  'bg-white hover:bg-gray-50 transition-colors duration-200',
                  isCurrentBrandVoice && 'border-apple-blue bg-blue-50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-apple-blue flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">
                      {bv.brand_name}
                    </span>
                    {isCurrentBrandVoice && (
                      <span className="text-xs px-2 py-0.5 bg-apple-blue text-white rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                {bv.brand_tone && (
                  <p className="text-xs text-gray-500 mt-1 truncate pl-6">
                    {bv.brand_tone.substring(0, 50)}
                    {bv.brand_tone.length > 50 ? '...' : ''}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleEdit(bv)}
                  className="p-2 text-gray-400 hover:text-apple-blue rounded-lg hover:bg-gray-100 transition-colors"
                  title="Edit brand voice"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(bv)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete brand voice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
  
  /**
   * Render the form view (create or edit)
   */
  const renderFormView = () => (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBackToList}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Brand Voices
      </button>
      
      {/* Success Message */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">
            Brand voice {viewMode === 'edit' ? 'updated' : 'created'} successfully!
          </p>
        </div>
      )}
      
      {/* Error Message */}
      {saveError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1 whitespace-pre-wrap">{saveError}</p>
          </div>
        </div>
      )}
      
      {/* Migration Needed UI */}
      {showMigrationNeeded && (
        <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Database Update Required</p>
              <p className="text-sm text-amber-700 mt-1">
                To enable multiple brand voices, the database needs to be updated.
              </p>
            </div>
          </div>
          
          <Button
            variant="brand"
            size="default"
            onClick={handleRunMigration}
            disabled={isRunningMigration}
            className="w-full"
          >
            {isRunningMigration ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Migration...
              </>
            ) : (
              'Enable Multiple Brand Voices'
            )}
          </Button>
          
          {migrationSql && (
            <div className="mt-3">
              <p className="text-xs text-amber-700 mb-2">
                Or copy this SQL and run it in your Supabase SQL Editor:
              </p>
              <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {migrationSql}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {/* Form Fields */}
      <div className="space-y-5">
        {/* Brand Name */}
        <div className="space-y-2">
          <label htmlFor="brandName" className="block text-sm font-medium text-gray-900">
            Brand Name <span className="text-red-600">*</span>
          </label>
          <input
            id="brandName"
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g., Acme Corporation, Nike, My Startup"
            disabled={isSaving || saveSuccess}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'disabled:bg-gray-50 disabled:opacity-50',
              'placeholder:text-gray-400'
            )}
          />
          <p className="text-xs text-gray-500">
            Give this brand voice a name so you can identify it
          </p>
        </div>

        {/* Project Assignment ────────────────────────────────────────────
            Placement: directly after Brand Name and before Brand Tone.
            Project assignment is organizational metadata and belongs near
            the top of the form alongside the name, per spec. */}
        <ProjectSelectorField
          value={projectId}
          onChange={setProjectId}
          helperText="Choose which project this brand voice belongs to"
          disabled={isSaving || saveSuccess}
        />

        {/* Brand Tone Description */}
        <div className="space-y-2">
          <label htmlFor="brandTone" className="block text-sm font-medium text-gray-900">
            Brand Tone Description
          </label>
          <AutoExpandTextarea
            id="brandTone"
            value={brandTone}
            onChange={(e) => setBrandTone(e.target.value)}
            placeholder="e.g., Professional yet approachable, innovative, customer-focused"
            minHeight={100}
            maxHeight={300}
            disabled={isSaving || saveSuccess}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'disabled:bg-gray-50 disabled:opacity-50',
              'placeholder:text-gray-400'
            )}
          />
        </div>
        
        {/* Approved Phrases */}
        <div className="space-y-2">
          <label htmlFor="approvedPhrases" className="block text-sm font-medium text-gray-900">
            Approved Phrases
          </label>
          <AutoExpandTextarea
            id="approvedPhrases"
            value={approvedPhrases}
            onChange={(e) => setApprovedPhrases(e.target.value)}
            placeholder="world-class&#10;industry-leading&#10;trusted partner"
            minHeight={100}
            maxHeight={300}
            disabled={isSaving || saveSuccess}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'disabled:bg-gray-50 disabled:opacity-50',
              'placeholder:text-gray-400'
            )}
          />
          <p className="text-xs text-gray-500">One per line</p>
        </div>
        
        {/* Forbidden Words */}
        <div className="space-y-2">
          <label htmlFor="forbiddenWords" className="block text-sm font-medium text-red-600">
            Forbidden Words
          </label>
          <AutoExpandTextarea
            id="forbiddenWords"
            value={forbiddenWords}
            onChange={(e) => setForbiddenWords(e.target.value)}
            placeholder="cheap&#10;discount&#10;limited time"
            minHeight={100}
            maxHeight={300}
            disabled={isSaving || saveSuccess}
            className={cn(
              'w-full px-3 py-2 rounded-lg border border-red-200 transition-all duration-200',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
              'disabled:bg-gray-50 disabled:opacity-50',
              'placeholder:text-gray-400'
            )}
          />
          <p className="text-xs text-gray-500">One per line</p>
        </div>
        
        {/* Brand Values */}
        <div className="space-y-2">
          <label htmlFor="brandValues" className="block text-sm font-medium text-gray-900">
            Brand Values
          </label>
          <AutoExpandTextarea
            id="brandValues"
            value={brandValues}
            onChange={(e) => setBrandValues(e.target.value)}
            placeholder="Innovation&#10;Customer Success&#10;Integrity"
            minHeight={100}
            maxHeight={300}
            disabled={isSaving || saveSuccess}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'disabled:bg-gray-50 disabled:opacity-50',
              'placeholder:text-gray-400'
            )}
          />
          <p className="text-xs text-gray-500">One per line</p>
        </div>
        
        {/* Mission Statement */}
        <div className="space-y-2">
          <label htmlFor="missionStatement" className="block text-sm font-medium text-gray-900">
            Mission Statement
          </label>
          <AutoExpandTextarea
            id="missionStatement"
            value={missionStatement}
            onChange={(e) => setMissionStatement(e.target.value)}
            placeholder="Our mission is to..."
            minHeight={100}
            maxHeight={300}
            disabled={isSaving || saveSuccess}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'disabled:bg-gray-50 disabled:opacity-50',
              'placeholder:text-gray-400'
            )}
          />
        </div>

        {/* ─── Writing Samples ─────────────────────────────────────────── */}
        {/*
          Writing Samples live at the end of the form, immediately before the
          action buttons. Dynamic list of up to 5 textareas; each can be
          deleted individually, and an "+ Add Sample" button appends new ones
          (capped at MAX_WRITING_SAMPLES). Empty samples are stripped on save
          so users can add/remove entries without polluting the stored array.
        */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-900">
              Writing Samples
            </label>
            <p className="text-xs text-gray-500">
              Paste 2–5 pieces of existing brand copy — email, web, social, or print.
              The AI learns voice from examples better than from rules.
            </p>
          </div>

          <div className="space-y-3">
            {writingSamples.map((sample, index) => {
              const trimmed = sample.trim();
              const isTooShort = trimmed.length > 0 && trimmed.length < MIN_SAMPLE_LENGTH;
              return (
                <div key={index} className="relative">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <AutoExpandTextarea
                        id={`writingSample-${index}`}
                        value={sample}
                        onChange={(e) => updateWritingSample(index, e.target.value)}
                        placeholder={SAMPLE_PLACEHOLDER}
                        minHeight={120}
                        maxHeight={400}
                        disabled={isSaving || saveSuccess}
                        aria-label={`Writing Sample ${index + 1}`}
                        className={cn(
                          'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                          'text-sm text-gray-900 bg-white',
                          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                          'disabled:bg-gray-50 disabled:opacity-50',
                          'placeholder:text-gray-400',
                          isTooShort ? 'border-amber-300' : 'border-gray-200'
                        )}
                      />
                      {isTooShort && (
                        <p className="text-xs text-amber-700 mt-1">
                          Sample must be at least {MIN_SAMPLE_LENGTH} characters or empty.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeWritingSample(index)}
                      disabled={isSaving || saveSuccess}
                      className={cn(
                        'p-2 rounded-lg transition-colors flex-shrink-0 mt-1',
                        'text-gray-400 hover:text-red-600 hover:bg-red-50',
                        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
                      )}
                      aria-label={`Remove Writing Sample ${index + 1}`}
                      title="Remove sample"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Sample button (capped at MAX_WRITING_SAMPLES) */}
          <div>
            <button
              type="button"
              onClick={addWritingSample}
              disabled={
                isSaving ||
                saveSuccess ||
                writingSamples.length >= MAX_WRITING_SAMPLES
              }
              title={
                writingSamples.length >= MAX_WRITING_SAMPLES
                  ? `Maximum ${MAX_WRITING_SAMPLES} samples`
                  : 'Add another writing sample'
              }
              className={cn(
                'inline-flex items-center gap-1.5 text-sm font-medium',
                'text-apple-blue hover:text-blue-700 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2 rounded-md px-1 py-0.5',
                'disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:text-gray-400'
              )}
            >
              <Plus className="w-4 h-4" />
              Add Sample
            </button>
            <p className="text-xs text-gray-400 mt-1">
              {writingSamples.length} of {MAX_WRITING_SAMPLES} sample slot{writingSamples.length === 1 ? '' : 's'} used
            </p>
          </div>
        </div>
      </div>

    </div>
  );

  /**
   * Footer for the create/edit form view. Rendered inside SlideOutPanel's footer
   * slot (via StickyActionBar) so the primary Save/Cancel actions stay visible
   * regardless of scroll position in long forms.
   */
  const renderFormFooter = () => (
    <StickyActionBar>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={handleBackToList}
          disabled={isSaving || saveSuccess}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          size="default"
          onClick={handleSave}
          disabled={isSaving || saveSuccess}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {viewMode === 'edit' ? 'Update' : 'Create'} Brand Voice
            </>
          )}
        </Button>
      </div>
    </StickyActionBar>
  );
  
  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  
  return (
    <>
      <SlideOutPanel
        isOpen={isOpen}
        onClose={onClose}
        side="right"
        title={
          viewMode === 'list' ? 'Brand Voices' :
          viewMode === 'create' ? 'New Brand Voice' :
          `Edit: ${editingBrandVoice?.brand_name || 'Brand Voice'}`
        }
        subtitle={
          viewMode === 'list' ? 'Manage your brand voice profiles' :
          viewMode === 'create' ? 'Define a new brand voice' :
          'Update brand voice settings'
        }
        footer={viewMode === 'list' ? undefined : renderFormFooter()}
      >
        {viewMode === 'list' ? renderListView() : renderFormView()}
      </SlideOutPanel>
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Brand Voice"
        message={`Delete "${deletingBrandVoice?.brand_name}" brand voice?`}
        description="This will permanently remove this brand voice. This cannot be undone."
        confirmLabel="Delete Brand Voice"
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        isConfirming={isDeleting}
        isDestructive={true}
      />
    </>
  );
}
