/**
 * @file components/workspace/worxdesk/WorxDeskInputView.tsx
 * @description Phase 5A input form, extracted from the panel shell.
 *
 * Renders the brief / spec / supporting-materials / brand voice / persona
 * inputs the user fills in before submitting. The shell
 * (`WorxDeskSlideOut`) decides which view to render based on the flow
 * phase from `useWorxDeskFlow()`; this file's only job is the input
 * surface.
 *
 * Phase 5B does not change the structure of these inputs. The only
 * user-visible behavior change is the Submit Brief button (rendered by
 * the shell, not by this view) now calls `submitBrief()` and opens the
 * SSE stream instead of showing a placeholder toast.
 */

'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  Briefcase,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import {
  useWorxDeskActions,
  useWorxDeskFileState,
  useWorxDeskInputs,
} from '@/lib/stores/worxdeskStore';
import { WORXDESK_SUPPORTED_TEMPLATE_IDS } from '@/lib/templates/worxdesk-template-schemas';
import { ALL_TEMPLATES } from '@/lib/data/templates';
import {
  SUPPORTED_BRIEF_FILE_EXTENSIONS,
  validateBriefFile,
} from '@/lib/files/file-validation';
import { getProjectPersonas } from '@/lib/storage/unified-storage';
import type { Project, Persona } from '@/lib/types/project';

// ============================================================================
// Constants (mirrors of Phase 5A)
// ============================================================================

/**
 * Map of supported template ids to human-readable names. Built from
 * `ALL_TEMPLATES` once at module load.
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

/** `accept` attribute for the hidden file input. */
const FILE_INPUT_ACCEPT = SUPPORTED_BRIEF_FILE_EXTENSIONS.join(',');

// ============================================================================
// Types
// ============================================================================

interface WorxDeskInputViewProps {
  /**
   * True while the SlideOutPanel is open. Used to gate one-time effects
   * (focus, persona load) so they only fire when the panel is visible.
   */
  isOpen: boolean;

  /**
   * Active project for brand voice and persona pickers. May be `null`
   * during initial load; the view degrades gracefully.
   */
  activeProject: Project | null;

  /**
   * Callback invoked when the user has interacted with one of the three
   * required fields, exposing the parent's submit-button enable check.
   * Returning `true` means the form is submittable.
   */
  onValidityChange: (isValid: boolean) => void;
}

/**
 * Briefly-shaped recent-brief row, mirroring the Phase 5A type used by
 * the `useRecentBriefs` hook.
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
} {
  const [briefs, setBriefs] = useState<RecentBrief[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/worxdesk/recent-briefs');
        if (!response.ok) {
          if (!cancelled) setBriefs([]);
          return;
        }
        const data = (await response.json()) as { briefs?: RecentBrief[] };
        if (!cancelled) {
          setBriefs(Array.isArray(data.briefs) ? data.briefs : []);
        }
      } catch (err) {
        logger.warn('⚠️ WORX DESK recent-briefs fetch failed:', err);
        if (!cancelled) setBriefs([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return { briefs };
}

// ============================================================================
// Main view
// ============================================================================

export function WorxDeskInputView({
  isOpen,
  activeProject,
  onValidityChange,
}: WorxDeskInputViewProps) {
  const inputs = useWorxDeskInputs();
  const fileState = useWorxDeskFileState();
  const {
    setOriginalBrief,
    setDeliverableSpec,
    setSupportingMaterials,
    setChosenTemplateId,
    setBrandVoiceId,
    setPersonaId,
    parseUploadedFile,
    clearUploadedFile,
  } = useWorxDeskActions();

  // ── Local UI state ───────────────────────────────────────────────────────

  const [touched, setTouched] = useState<{
    chosenTemplateId: boolean;
    originalBrief: boolean;
    deliverableSpec: boolean;
  }>({
    chosenTemplateId: false,
    originalBrief: false,
    deliverableSpec: false,
  });

  const [clientFileError, setClientFileError] = useState<string | null>(null);
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

  // Reset throwaway UI state when the panel re-opens. Store-side session
  // state intentionally persists per the Phase 5A lifecycle contract.
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

  const isValid = Object.keys(errors).length === 0;

  // Push validity up to the shell so it can enable / disable Submit
  // Brief without re-implementing the same checks.
  useEffect(() => {
    onValidityChange(isValid);
  }, [isValid, onValidityChange]);

  // ── Derived data for pickers ─────────────────────────────────────────────

  const brandVoices = activeProject?.brandVoices ?? [];
  const fileError = clientFileError ?? fileState.parseError;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── A. Intro banner ─────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          <strong>What this does:</strong> Paste or upload a creative brief.
          We&apos;ll review it like a senior copywriter, then write the copy.
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

        {fileState.uploadedFileName ? (
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
            onChange={(event) => setBrandVoiceId(event.target.value || null)}
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
        <span>MY WORX DESK · brief-to-copy on-ramp</span>
      </div>
    </div>
  );
}
