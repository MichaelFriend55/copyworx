/**
 * @file components/workspace/BrandVoiceSection.tsx
 * @description Brand Voice list section for the My Projects slide-out.
 *
 * Renders every brand voice belonging to a project (one row per voice) and
 * provides the Active / Set Active affordance so users can pick which voice
 * the project's tools (Brand Check, templates, Word Advisor) use when they
 * need a single voice.
 *
 * Data model:
 * - `project.brandVoices` — all voices whose `brand_voices.project_id` equals
 *   the project's id. Source of truth for this component.
 * - `project.brandVoiceId` — mirrors `projects.brand_voice_id`. When set,
 *   the matching row shows an "Active" pill. When null with ≥ 2 voices, no
 *   row shows an Active pill (UI is honest that no choice has been made).
 *
 * Interaction:
 * - Click anywhere on a row (except the Set Active pill) → opens the Brand
 *   Voice slide-out in edit mode for that voice.
 * - Click the Set Active pill → PUT /api/db/projects sets brand_voice_id,
 *   then refreshProjects() re-renders the sidebar with the new pill.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Volume2,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types/project';
import type { BrandVoice } from '@/lib/types/brand';
import { useSlideOutActions } from '@/lib/stores/slideOutStore';
import {
  usePendingEditActions,
  useWorkspaceStore,
} from '@/lib/stores/workspaceStore';
import { BRAND_VOICE_PANEL_ID } from '@/components/workspace/BrandVoiceSlideOut';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

interface BrandVoiceSectionProps {
  /** Project to display brand voices for */
  project: Project;
  /** Whether this project section is expanded */
  isExpanded: boolean;
  /** Search query for filtering */
  searchQuery?: string;
}

/**
 * Status of the Set Active pill for a given row.
 *
 * - 'none'       — row is currently active (show "Active" pill, non-interactive)
 *   OR project has only 1 voice (show nothing).
 * - 'idle'       — row is not active and user has ≥ 2 voices; show clickable
 *   "Set Active" pill.
 * - 'pending'    — a Set Active PUT is in flight for THIS row.
 * - 'disabled'   — another row's Set Active is in flight; block clicks here.
 */
type PillState = 'none' | 'idle' | 'pending' | 'disabled' | 'active';

interface BrandVoiceRowProps {
  brandVoice: BrandVoice;
  pillState: PillState;
  errorMessage: string | null;
  onOpen: () => void;
  onSetActive: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// ============================================================================
// BrandVoiceRow
// ============================================================================

function BrandVoiceRow({
  brandVoice,
  pillState,
  errorMessage,
  onOpen,
  onSetActive,
}: BrandVoiceRowProps) {
  const handleRowClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent the row click handler firing when the user aimed at the pill.
    if ((event.target as HTMLElement).closest('[data-row-action]')) return;
    onOpen();
  };

  const handlePillClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (pillState === 'idle') {
      onSetActive();
    }
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-1.5 px-2 py-1.5 rounded-md cursor-pointer',
        'transition-colors duration-150',
        'hover:bg-gray-50'
      )}
      onClick={handleRowClick}
      title={`Click to view/edit "${brandVoice.brandName}"`}
    >
      <Volume2 className="h-3.5 w-3.5 flex-shrink-0 mt-px text-blue-500" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-900 truncate flex-1 min-w-0">
            {brandVoice.brandName}
          </span>

          {pillState === 'active' && (
            <span
              className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0"
              aria-label="Active brand voice"
            >
              Active
            </span>
          )}

          {(pillState === 'idle' || pillState === 'disabled') && (
            <button
              type="button"
              data-row-action="set-active"
              onClick={handlePillClick}
              disabled={pillState === 'disabled'}
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0',
                'border transition-colors duration-150',
                pillState === 'idle'
                  ? 'text-gray-500 border-transparent hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200'
                  : 'text-gray-300 border-transparent cursor-not-allowed'
              )}
              aria-label={`Set "${brandVoice.brandName}" as active brand voice`}
            >
              Set Active
            </button>
          )}

          {pillState === 'pending' && (
            <span
              data-row-action="set-active"
              className="text-[10px] font-medium text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0 flex items-center gap-1"
              aria-live="polite"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Setting…
            </span>
          )}
        </div>

        {brandVoice.brandTone && (
          <p className="text-[10px] text-gray-500 truncate mt-0.5">
            {truncateText(brandVoice.brandTone, 60)}
          </p>
        )}

        {errorMessage && (
          <p
            className="text-[10px] text-red-600 mt-0.5"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// BrandVoiceSection
// ============================================================================

export function BrandVoiceSection({
  project,
  isExpanded,
  searchQuery = '',
}: BrandVoiceSectionProps) {
  const [sectionExpanded, setSectionExpanded] = useState(true);
  const { openSlideOut } = useSlideOutActions();
  const { setPendingBrandVoiceEdit } = usePendingEditActions();

  /**
   * Single-flight guard: only one Set Active request may be in flight at
   * a time. Value is the brand voice id currently being set, or null when
   * nothing is pending. All other rows show a disabled pill while this is
   * non-null so rapid double-clicks don't write contradictory values.
   */
  const [pendingId, setPendingId] = useState<string | null>(null);

  /**
   * Transient error keyed by brand voice id. Shown inline below the row
   * that failed. Cleared on the next successful Set Active on that row.
   */
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  // Defensive: sidebar must never crash if `brandVoices` is missing on a
  // stale store payload. getAllProjects() backfills this for localStorage,
  // but cloud payloads routed through older code paths might not.
  const brandVoices = Array.isArray(project.brandVoices)
    ? project.brandVoices
    : [];
  const hasBrandVoices = brandVoices.length > 0;
  const isMulti = brandVoices.length >= 2;

  const filteredBrandVoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return brandVoices;
    return brandVoices.filter((bv) =>
      bv.brandName.toLowerCase().includes(query) ||
      (bv.brandTone || '').toLowerCase().includes(query)
    );
  }, [brandVoices, searchQuery]);

  const toggleSection = useCallback(() => {
    setSectionExpanded((prev) => !prev);
  }, []);

  const handleOpenBrandVoice = useCallback(
    (bv: BrandVoice) => {
      setPendingBrandVoiceEdit(bv.brandName);
      openSlideOut(BRAND_VOICE_PANEL_ID);
    },
    [openSlideOut, setPendingBrandVoiceEdit]
  );

  const handleOpenEmptyState = useCallback(() => {
    openSlideOut(BRAND_VOICE_PANEL_ID);
  }, [openSlideOut]);

  /**
   * PATCH projects.brand_voice_id then refresh the store so the sidebar
   * re-renders with the new Active pill on the chosen row.
   */
  const handleSetActive = useCallback(
    async (bv: BrandVoice) => {
      if (pendingId) return; // guarded by UI, belt-and-suspenders
      setPendingId(bv.id);
      setRowErrors((prev) => {
        if (!(bv.id in prev)) return prev;
        const next = { ...prev };
        delete next[bv.id];
        return next;
      });

      try {
        const response = await fetch('/api/db/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: project.id,
            brand_voice_id: bv.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.details ||
              errorData.error ||
              'Failed to set active brand voice'
          );
        }

        logger.log('✅ Set active brand voice:', {
          projectId: project.id,
          brandVoiceId: bv.id,
          brandName: bv.brandName,
        });

        await useWorkspaceStore.getState().refreshProjects();
      } catch (error) {
        logger.error('❌ Failed to set active brand voice:', error);
        const message =
          error instanceof Error ? error.message : 'Failed to set active brand voice';
        setRowErrors((prev) => ({ ...prev, [bv.id]: message }));
      } finally {
        setPendingId(null);
      }
    },
    [pendingId, project.id]
  );

  if (!isExpanded) return null;

  /**
   * Resolve the pill state for a given row.
   *
   * Rules (spec B1):
   * - Project has 0 voices  → rendered empty state below, not per-row.
   * - Project has 1 voice   → no pill, no affordance (implicitly active).
   * - Project has ≥ 2 voices
   *   • Row whose id === project.brandVoiceId → 'active'
   *   • Otherwise, if project.brandVoiceId is null → 'idle' on ALL rows
   *     (honest UI: no explicit choice has been made yet).
   *   • Otherwise → 'idle' (or 'pending'/'disabled' depending on in-flight).
   */
  const resolvePillState = (bv: BrandVoice): PillState => {
    if (!isMulti) return 'none';
    if (project.brandVoiceId && project.brandVoiceId === bv.id) return 'active';
    if (pendingId === bv.id) return 'pending';
    if (pendingId !== null) return 'disabled';
    return 'idle';
  };

  return (
    <div className="mt-2 ml-2 pl-2 border-l-2 border-blue-200">
      {/* Section header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer',
          'hover:bg-blue-50 transition-colors duration-150'
        )}
        onClick={toggleSection}
      >
        {sectionExpanded ? (
          <ChevronDown className="h-4 w-4 text-blue-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0" />
        )}

        <Volume2 className="h-4 w-4 text-blue-500 flex-shrink-0" />

        <span className="flex-1 text-sm font-semibold text-blue-900">
          Brand Voice
        </span>

        {hasBrandVoices && (
          <span className="text-xs text-blue-500 px-2 py-0.5 bg-blue-100 rounded-full">
            {brandVoices.length}
          </span>
        )}
      </div>

      {/* Brand voice rows */}
      {sectionExpanded && (
        <div className="mt-1 space-y-1">
          {filteredBrandVoices.length > 0 ? (
            filteredBrandVoices.map((bv) => (
              <BrandVoiceRow
                key={bv.id}
                brandVoice={bv}
                pillState={resolvePillState(bv)}
                errorMessage={rowErrors[bv.id] ?? null}
                onOpen={() => handleOpenBrandVoice(bv)}
                onSetActive={() => handleSetActive(bv)}
              />
            ))
          ) : !hasBrandVoices ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">No brand voice set</p>
              <button
                onClick={handleOpenEmptyState}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Set brand voice
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic py-2 px-3">
              No brand voice matches &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BrandVoiceSection;
