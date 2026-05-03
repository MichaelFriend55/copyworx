/**
 * @file components/workspace/WorxDeskSlideOut.tsx
 * @description WORX DESK on-ramp input panel – Phase 5A.
 *
 * The first user-facing surface of the WORX DESK feature: a 600px right-side
 * slide-out where users paste or upload a creative brief, describe the
 * deliverable, optionally pick a brand voice and persona, and click Submit.
 *
 * Phase 5A scope:
 *   - Render the input form with all fields (recent briefs, deliverable
 *     type, brief textarea + drag-drop upload, deliverable spec, supporting
 *     materials, brand voice, persona)
 *   - Drive every input through `useWorxDeskStore`
 *   - Parse uploaded files via /api/worxdesk/parse-brief-file
 *   - Fetch recent briefs from /api/worxdesk/recent-briefs on mount
 *   - On Submit: show a placeholder toast and log the full session state
 *
 * Phase 5B will replace the placeholder Submit handler with the real
 * Strategic Review streaming flow plus the Q&A panel. Phase 6 wires the
 * final generation step.
 *
 * Panel ID is exported here (mirrors `TEMPLATES_PANEL_ID`,
 * `BRAND_VOICE_PANEL_ID`, `PERSONAS_PANEL_ID`, `TEMPLATE_FORM_PANEL_ID`)
 * along with two convenience hooks. The store file (`worxdeskStore.ts`)
 * stays focused on session state and does not import the panel id.
 */

'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Button } from '@/components/ui/button';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import {
  useIsSlideOutOpen,
  useSlideOutActions,
} from '@/lib/stores/slideOutStore';
import {
  useWorxDeskActions,
  useWorxDeskFileState,
  useWorxDeskInputs,
  useWorxDeskSessionId,
} from '@/lib/stores/worxdeskStore';
import { WORXDESK_SUPPORTED_TEMPLATE_IDS } from '@/lib/templates/worxdesk-template-schemas';
import { ALL_TEMPLATES } from '@/lib/data/templates';
import {
  SUPPORTED_BRIEF_FILE_EXTENSIONS,
  validateBriefFile,
} from '@/lib/files/file-validation';
import { getProjectPersonas } from '@/lib/storage/unified-storage';
import type { Project, Persona } from '@/lib/types/project';
import type { Editor } from '@tiptap/react';

// ============================================================================
// Constants
// ============================================================================

/**
 * Unique panel id for the WORX DESK input slide-out. Lives next to the
 * panel component (mirrors `TEMPLATES_PANEL_ID` and friends) so consumers
 * import the id and the component from the same module.
 */
export const WORXDESK_PANEL_ID = 'worxdesk-onramp';

/**
 * Map of supported template ids to human-readable names. Built from
 * `ALL_TEMPLATES` once at module load. The 10 supported template ids and
 * their resolved names are documented in the deliverables report.
 */
const TEMPLATE_NAME_BY_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const id of WORXDESK_SUPPORTED_TEMPLATE_IDS) {
    const template = ALL_TEMPLATES.find((t) => t.id === id);
    map[id] = template ? template.name : id;
  }
  return map;
})();

/**
 * Ordered list used to render the deliverable-type dropdown. Order matches
 * `WORXDESK_SUPPORTED_TEMPLATE_IDS` so the source-of-truth for template
 * support stays in `lib/templates/worxdesk-template-schemas.ts`.
 */
const TEMPLATE_OPTIONS = WORXDESK_SUPPORTED_TEMPLATE_IDS.map((id) => ({
  id,
  name: TEMPLATE_NAME_BY_ID[id],
}));

/**
 * `accept` attribute for the hidden file input. Mirrors
 * `SUPPORTED_BRIEF_FILE_EXTENSIONS` so adding a new format only requires a
 * single edit in `lib/files/file-validation.ts`.
 */
const FILE_INPUT_ACCEPT = SUPPORTED_BRIEF_FILE_EXTENSIONS.join(',');

// ============================================================================
// Types
// ============================================================================

interface WorxDeskSlideOutProps {
  /** Whether the panel is currently open. */
  isOpen: boolean;

  /** Callback invoked when the X button or backdrop closes the panel. */
  onClose: () => void;

  /**
   * TipTap editor instance. Phase 5A does not write to the editor – the
   * prop is accepted now so Phase 5B / 6 can use it without changing the
   * call site in `app/worxspace/page.tsx`.
   */
  editor: Editor | null;

  /**
   * Active project for brand voice and persona pickers. May be `null`
   * during initial load; the panel degrades gracefully (pickers do not
   * render when there are no options).
   */
  activeProject: Project | null;
}

/**
 * Shape of a row in the GET /api/worxdesk/recent-briefs response.
 * Mirrors the route's `RecentBrief` type; kept locally to avoid importing
 * a server-only module into client code.
 */
interface RecentBrief {
  id: string;
  templateId: string;
  templateName: string;
  updatedAt: string;
  briefPreview: string;
  fullBrief: string;
}

// ============================================================================
// Convenience hooks
// ============================================================================

/**
 * True when the WORX DESK input panel is currently open. Thin wrapper
 * around `useIsSlideOutOpen(WORXDESK_PANEL_ID)`; lives here so consumers
 * import one symbol instead of remembering the id string.
 */
export const useIsWorxDeskOpen = (): boolean =>
  useIsSlideOutOpen(WORXDESK_PANEL_ID);

/**
 * Open / close actions for the WORX DESK panel. Returned references are
 * stable across renders thanks to `useSlideOutActions` using `useShallow`.
 */
export const useWorxDeskPanelActions = (): {
  openWorxDesk: () => void;
  closeWorxDesk: () => void;
} => {
  const { openSlideOut, closeSlideOut } = useSlideOutActions();
  return useMemo(
    () => ({
      openWorxDesk: () => openSlideOut(WORXDESK_PANEL_ID),
      closeWorxDesk: () => closeSlideOut(WORXDESK_PANEL_ID),
    }),
    [openSlideOut, closeSlideOut],
  );
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format an ISO timestamp into a short month-day label suitable for the
 * recent-briefs dropdown (e.g. "Apr 12"). Falls back to the raw string
 * when the input fails to parse.
 */
function formatBriefDate(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ============================================================================
// Recent briefs sub-hook
// ============================================================================

/**
 * Fetch the user's recent WORX DESK briefs whenever the panel transitions
 * from closed to open. Returns `briefs: []` when the user has none, when
 * the request fails (the dropdown just hides), or while in flight.
 */
function useRecentBriefs(isOpen: boolean): {
  briefs: RecentBrief[];
  isLoading: boolean;
} {
  const [briefs, setBriefs] = useState<RecentBrief[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const response = await fetch('/api/worxdesk/recent-briefs');
        if (!response.ok) {
          // Most likely 404 (feature flag off) or 401 (not authed). Either
          // way, the dropdown just won't render – no toast spam.
          if (!cancelled) {
            setBriefs([]);
            setIsLoading(false);
          }
          return;
        }
        const data = (await response.json()) as { briefs?: RecentBrief[] };
        if (!cancelled) {
          setBriefs(Array.isArray(data.briefs) ? data.briefs : []);
          setIsLoading(false);
        }
      } catch (err) {
        logger.warn('⚠️ WORX DESK recent-briefs fetch failed:', err);
        if (!cancelled) {
          setBriefs([]);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return { briefs, isLoading };
}

// ============================================================================
// Main component
// ============================================================================

export function WorxDeskSlideOut({
  isOpen,
  onClose,
  editor: _editor,
  activeProject,
}: WorxDeskSlideOutProps) {
  // Editor is reserved for Phase 5B / 6. Suppress the unused-var lint
  // without changing the public prop surface.
  void _editor;

  const inputs = useWorxDeskInputs();
  const fileState = useWorxDeskFileState();
  const sessionId = useWorxDeskSessionId();
  const {
    startSession,
    setOriginalBrief,
    setDeliverableSpec,
    setSupportingMaterials,
    setChosenTemplateId,
    setBrandVoiceId,
    setPersonaId,
    parseUploadedFile,
    clearUploadedFile,
    resetSession,
  } = useWorxDeskActions();

  // ── Local UI state ───────────────────────────────────────────────────────

  // Tracks which fields the user has interacted with, so required-field
  // errors only appear after a real touch (not on initial render).
  const [touched, setTouched] = useState<{
    chosenTemplateId: boolean;
    originalBrief: boolean;
    deliverableSpec: boolean;
  }>({
    chosenTemplateId: false,
    originalBrief: false,
    deliverableSpec: false,
  });

  // Surfaced when a dropped or selected file fails client-side validation
  // (wrong extension, oversized). Kept local because it's transient UI
  // state that should clear as soon as the user picks a new file.
  const [clientFileError, setClientFileError] = useState<string | null>(null);

  // Drag-over visual state for the drop zone.
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Personas ─────────────────────────────────────────────────────────────

  const [personas, setPersonas] = useState<Persona[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!activeProject) {
      setPersonas([]);
      return;
    }
    (async () => {
      try {
        const projectPersonas = await getProjectPersonas(activeProject.id);
        if (!cancelled) {
          setPersonas(projectPersonas);
        }
      } catch (err) {
        logger.warn('⚠️ WORX DESK could not load personas:', err);
        if (!cancelled) setPersonas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProject]);

  // ── Recent briefs ────────────────────────────────────────────────────────

  const { briefs: recentBriefs } = useRecentBriefs(isOpen);

  // ── Session lifecycle ────────────────────────────────────────────────────

  // First time the panel opens, mint a new run id. Re-opens preserve any
  // in-progress brief so closing the panel to glance at the editor does
  // not destroy the user's work.
  useEffect(() => {
    if (isOpen && sessionId === null) {
      startSession();
    }
    // We intentionally depend only on `isOpen` and `sessionId` so re-renders
    // caused by typing in fields do not re-trigger this effect.
  }, [isOpen, sessionId, startSession]);

  // Reset the touched / file-error UI state when the panel re-opens. The
  // store-side session state intentionally persists per the lifecycle note
  // above; only the throwaway UI flags get cleared.
  useEffect(() => {
    if (isOpen) {
      setTouched({
        chosenTemplateId: false,
        originalBrief: false,
        deliverableSpec: false,
      });
      setClientFileError(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      setClientFileError(null);

      const validation = validateBriefFile(file);
      if (!validation.valid) {
        setClientFileError(validation.error ?? 'File could not be uploaded.');
        return;
      }

      await parseUploadedFile(file);
      // After a successful parse, surface the textarea touched-state so any
      // subsequent emptying of the field flags a required-field error.
      setTouched((prev) => ({ ...prev, originalBrief: true }));
    },
    [parseUploadedFile],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      await handleFile(file);
    },
    [handleFile],
  );

  const handleFileInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset the input value so re-selecting the same file fires `change`.
      event.target.value = '';
      if (!file) return;
      await handleFile(file);
    },
    [handleFile],
  );

  // ── Recent brief population ──────────────────────────────────────────────

  const handleRecentBriefSelect = useCallback(
    (briefId: string) => {
      if (!briefId) return;
      const brief = recentBriefs.find((b) => b.id === briefId);
      if (!brief) return;
      setOriginalBrief(brief.fullBrief);
      // If the saved brief targeted a still-supported template, reuse it.
      if (
        brief.templateId &&
        (WORXDESK_SUPPORTED_TEMPLATE_IDS as readonly string[]).includes(
          brief.templateId,
        )
      ) {
        setChosenTemplateId(brief.templateId);
        setTouched((prev) => ({ ...prev, chosenTemplateId: true }));
      }
      setTouched((prev) => ({ ...prev, originalBrief: true }));
    },
    [recentBriefs, setOriginalBrief, setChosenTemplateId],
  );

  // ── Validation ───────────────────────────────────────────────────────────

  const errors = useMemo(() => {
    const next: {
      chosenTemplateId?: string;
      originalBrief?: string;
      deliverableSpec?: string;
    } = {};
    if (!inputs.chosenTemplateId) {
      next.chosenTemplateId = 'Choose a deliverable type to continue.';
    }
    if (!inputs.originalBrief.trim()) {
      next.originalBrief = 'Paste or upload a brief to continue.';
    }
    if (!inputs.deliverableSpec.trim()) {
      next.deliverableSpec =
        'Describe what you want produced (length, channel, CTA).';
    }
    return next;
  }, [inputs.chosenTemplateId, inputs.originalBrief, inputs.deliverableSpec]);

  const isSubmitEnabled = Object.keys(errors).length === 0;

  // ── Submit (placeholder for Phase 5B) ────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!isSubmitEnabled) return;

    // Phase 5A intentionally does not call /api/worxdesk/strategic-review.
    // Phase 5B will replace this handler with the streaming SSE consumer.
    toast.success('Strategic Review coming in the next phase. Your brief is ready.');
    logger.log('📋 WORX DESK Phase 5A submit (placeholder):', {
      worxdeskRunId: sessionId,
      chosenTemplateId: inputs.chosenTemplateId,
      brandVoiceId: inputs.brandVoiceId,
      personaId: inputs.personaId,
      uploadedFileName: fileState.uploadedFileName,
      originalBriefLength: inputs.originalBrief.length,
      deliverableSpecLength: inputs.deliverableSpec.length,
      supportingMaterialsLength: inputs.supportingMaterials.length,
      parseWarnings: fileState.parseWarnings,
    });
  }, [
    isSubmitEnabled,
    sessionId,
    inputs.chosenTemplateId,
    inputs.brandVoiceId,
    inputs.personaId,
    inputs.originalBrief,
    inputs.deliverableSpec,
    inputs.supportingMaterials,
    fileState.uploadedFileName,
    fileState.parseWarnings,
  ]);

  // ── Cancel ───────────────────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    resetSession();
    onClose();
  }, [resetSession, onClose]);

  // ── Derived data for pickers ─────────────────────────────────────────────

  const brandVoices = activeProject?.brandVoices ?? [];

  // ── Render ───────────────────────────────────────────────────────────────

  const fileError = clientFileError ?? fileState.parseError;

  const panelFooter = (
    <StickyActionBar variant="static">
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={handleCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          size="default"
          onClick={handleSubmit}
          disabled={!isSubmitEnabled}
          className="flex-1"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Submit Brief
        </Button>
      </div>
    </StickyActionBar>
  );

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      width={600}
      title="WORX DESK"
      subtitle="Brief in. Copy out. Powered by methodology."
      footer={panelFooter}
    >
      <div className="space-y-6">
        {/* ── A. Intro banner ─────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>What this does:</strong> Paste or upload a creative brief.
            We'll review it like a senior copywriter, then write the copy.
          </p>
        </div>

        {/* ── B. Recent briefs (only when there is at least one) ───────── */}
        {recentBriefs.length > 0 && (
          <div className="space-y-2">
            <label
              htmlFor="worxdesk-recent-briefs"
              className="text-xs font-medium text-gray-500"
            >
              Recent briefs
            </label>
            <select
              id="worxdesk-recent-briefs"
              defaultValue=""
              onChange={(event) => {
                handleRecentBriefSelect(event.target.value);
                // Reset the dropdown so re-selecting the same option works.
                event.target.value = '';
              }}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              )}
            >
              <option value="">– Choose a recent brief to reuse –</option>
              {recentBriefs.map((brief) => (
                <option key={brief.id} value={brief.id}>
                  {brief.templateName} · {formatBriefDate(brief.updatedAt)} ·
                  &quot;{brief.briefPreview}&quot;
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── C. Deliverable type ──────────────────────────────────────── */}
        <div className="space-y-2">
          <label
            htmlFor="worxdesk-template"
            className="text-sm font-medium text-apple-text-dark"
          >
            What are you creating?
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          </label>
          <select
            id="worxdesk-template"
            value={inputs.chosenTemplateId}
            onChange={(event) => {
              setChosenTemplateId(event.target.value);
              setTouched((prev) => ({ ...prev, chosenTemplateId: true }));
            }}
            onBlur={() =>
              setTouched((prev) => ({ ...prev, chosenTemplateId: true }))
            }
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-gray-900 bg-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              touched.chosenTemplateId && errors.chosenTemplateId
                ? 'border-red-300 bg-red-50'
                : 'border-apple-gray-light hover:border-apple-gray',
            )}
          >
            <option value="">– Select a deliverable type –</option>
            {TEMPLATE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          {touched.chosenTemplateId && errors.chosenTemplateId && (
            <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
              <AlertCircle className="w-3 h-3" />
              {errors.chosenTemplateId}
            </p>
          )}
        </div>

        {/* ── D. Brief input (paste OR upload) ─────────────────────────── */}
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-apple-text-dark">
              The brief
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            </label>
            <p className="text-xs text-apple-text-light">
              Paste a creative brief or upload a PDF, DOCX, or TXT file.
            </p>
          </div>

          {/* Drag-drop upload zone */}
          {fileState.uploadedFileName ? (
            // File loaded state – show filename chip with clear button.
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-apple-blue/30 bg-apple-blue/5">
              <FileText className="w-4 h-4 text-apple-blue flex-shrink-0" />
              <span className="text-sm text-gray-900 truncate flex-1">
                {fileState.uploadedFileName}
              </span>
              <button
                type="button"
                onClick={clearUploadedFile}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear uploaded file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={cn(
                'relative w-full rounded-lg border-2 border-dashed py-6 px-4',
                'flex flex-col items-center justify-center gap-2',
                'cursor-pointer transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                isDragging
                  ? 'border-apple-blue bg-apple-blue/5'
                  : 'border-gray-300 hover:border-apple-blue/60 hover:bg-gray-50',
              )}
            >
              {fileState.isParsingFile ? (
                <>
                  <Loader2 className="w-6 h-6 text-apple-blue animate-spin" />
                  <p className="text-sm text-gray-600">Parsing brief...</p>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOCX, or TXT (max 10 MB)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_INPUT_ACCEPT}
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {fileError && (
            <p className="text-xs text-red-600 flex items-start gap-1" role="alert">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{fileError}</span>
            </p>
          )}

          {/* Brief textarea – paste path AND post-upload editable view */}
          <AutoExpandTextarea
            value={inputs.originalBrief}
            onChange={(event) => setOriginalBrief(event.target.value)}
            onBlur={() =>
              setTouched((prev) => ({ ...prev, originalBrief: true }))
            }
            placeholder="Or paste your brief here..."
            minHeight={200}
            maxHeight={600}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-apple-text-dark',
              'placeholder:text-apple-text-light',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              touched.originalBrief && errors.originalBrief
                ? 'border-red-300 bg-red-50'
                : 'border-apple-gray-light bg-white hover:border-apple-gray',
            )}
          />
          {touched.originalBrief && errors.originalBrief && (
            <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
              <AlertCircle className="w-3 h-3" />
              {errors.originalBrief}
            </p>
          )}

          {fileState.parseWarnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> {fileState.parseWarnings.join('. ')}
              </p>
            </div>
          )}
        </div>

        {/* ── E. Deliverable spec ──────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="space-y-1">
            <label
              htmlFor="worxdesk-deliverable-spec"
              className="text-sm font-medium text-apple-text-dark"
            >
              What exactly do you want?
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            </label>
            <p className="text-xs text-apple-text-light">
              Be specific. e.g., &quot;1 launch email with 5 subject line
              variations and clear CTA to register.&quot;
            </p>
          </div>
          <AutoExpandTextarea
            id="worxdesk-deliverable-spec"
            value={inputs.deliverableSpec}
            onChange={(event) => setDeliverableSpec(event.target.value)}
            onBlur={() =>
              setTouched((prev) => ({ ...prev, deliverableSpec: true }))
            }
            placeholder="Describe the exact output you want."
            minHeight={80}
            maxHeight={300}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-apple-text-dark',
              'placeholder:text-apple-text-light',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              touched.deliverableSpec && errors.deliverableSpec
                ? 'border-red-300 bg-red-50'
                : 'border-apple-gray-light bg-white hover:border-apple-gray',
            )}
          />
          {touched.deliverableSpec && errors.deliverableSpec && (
            <p className="text-xs text-red-600 flex items-center gap-1" role="alert">
              <AlertCircle className="w-3 h-3" />
              {errors.deliverableSpec}
            </p>
          )}
        </div>

        {/* ── F. Supporting materials ──────────────────────────────────── */}
        <div className="space-y-2">
          <div className="space-y-1">
            <label
              htmlFor="worxdesk-supporting-materials"
              className="text-sm font-medium text-apple-text-dark"
            >
              Supporting materials
            </label>
            <p className="text-xs text-apple-text-light">
              Notes, links, references, or any additional context. URLs are
              accepted but not fetched.
            </p>
          </div>
          <AutoExpandTextarea
            id="worxdesk-supporting-materials"
            value={inputs.supportingMaterials}
            onChange={(event) => setSupportingMaterials(event.target.value)}
            placeholder="Anything else we should know?"
            minHeight={60}
            maxHeight={200}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'text-sm text-apple-text-dark',
              'placeholder:text-apple-text-light',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'border-apple-gray-light bg-white hover:border-apple-gray',
            )}
          />
        </div>

        {/* ── G. Brand voice picker ────────────────────────────────────── */}
        {brandVoices.length > 0 && (
          <div className="space-y-2">
            <label
              htmlFor="worxdesk-brand-voice"
              className="text-sm font-medium text-apple-text-dark"
            >
              Brand voice
            </label>
            <select
              id="worxdesk-brand-voice"
              value={inputs.brandVoiceId ?? ''}
              onChange={(event) =>
                setBrandVoiceId(event.target.value || null)
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'border-apple-gray-light hover:border-apple-gray',
              )}
            >
              <option value="">No specific brand voice</option>
              {brandVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.brandName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── H. Persona picker ────────────────────────────────────────── */}
        {personas.length > 0 && (
          <div className="space-y-2">
            <label
              htmlFor="worxdesk-persona"
              className="text-sm font-medium text-apple-text-dark"
            >
              Persona
            </label>
            <select
              id="worxdesk-persona"
              value={inputs.personaId ?? ''}
              onChange={(event) => setPersonaId(event.target.value || null)}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'border-apple-gray-light hover:border-apple-gray',
              )}
            >
              <option value="">No specific persona</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Subtle bottom callout to reinforce the "Briefcase" pill identity */}
        <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
          <Briefcase className="w-3 h-3" />
          <span>WORX DESK · brief-to-copy on-ramp</span>
        </div>
      </div>
    </SlideOutPanel>
  );
}

export default WorxDeskSlideOut;
