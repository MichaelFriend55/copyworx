/**
 * @file components/workspace/worxdesk/WorxDeskGeneratingView.tsx
 * @description WORX DESK Brief Extraction + Final Generation panel body (Phase 6).
 *
 * This view is mounted by `WorxDeskSlideOut` whenever the flow phase is
 * `extracting` or `generating`. It owns three visible states and one
 * recovery state:
 *
 *   1. EXTRACTING (`isExtractingBrief: true`)
 *      Branded loader with the copy "Extracting your brief…". This is the
 *      window between the user clicking Generate in the review view and
 *      Brief Extraction (Call 2) returning structured `formData`.
 *
 *   2. GENERATING (`isGenerating: true`)
 *      Branded loader with "Writing your copy…" and the methodology
 *      tagline. The Phase 6 auto-trigger fires `generateCopy` as soon as
 *      `extractedFormData` lands, so the user sees this state immediately
 *      after extraction completes — there is no intermediate
 *      "extraction-result confirmation" view in v1.
 *
 *   3. FAILURE (`generationError !== null`)
 *      Red callout. Discriminates between an extraction failure (no
 *      `extractedFormData` yet) and a generation failure (extraction
 *      succeeded but the generation API or persistence threw). "Try
 *      again" wires to whichever step failed; "Back to review" returns
 *      to the Strategic Review view via `backToReview()`.
 *
 *   4. SAFETY-NET RECOVERY (`generatedCopyHtml !== null`)
 *      A specialized failure surface for the rare "LLM returned valid
 *      HTML but `createDocument` / `editor.commands.setContent` threw"
 *      window. The HTML is held in the store so the user does not lose
 *      their generation. Offers a Try-again retry plus an explicit
 *      acknowledgement that the copy is recoverable.
 *
 *   On a clean success, the store closes the WORX DESK panel via
 *   `closeWorxDesk()` and resets the session, so this view never has to
 *   render a "done" state.
 *
 * Auto-trigger contract:
 *   `useEffect` watches `extractedFormData` and fires `generateCopy`
 *   exactly once per extraction completion. A `useRef` flag prevents
 *   re-firing on unrelated re-renders (parent re-mounts, store slice
 *   updates from sibling fields, etc.). The flag resets when
 *   `extractedFormData` returns to `null` (back-to-review or session
 *   reset), so a subsequent extraction triggers another generation.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { AIWorxLoader } from '@/components/ui/AIWorxLoader';
import {
  useWorxDeskActions,
  useWorxDeskExtraction,
  useWorxDeskGeneration,
} from '@/lib/stores/worxdeskStore';
import type { Project } from '@/lib/types/project';

// ============================================================================
// Props
// ============================================================================

interface WorxDeskGeneratingViewProps {
  /**
   * Live TipTap editor instance from the worxspace page. The auto-trigger
   * forwards this directly to `generateCopy`; a `null` editor flips the
   * action into its precondition-failure path so the view surfaces a
   * user-facing error rather than no-oping.
   */
  editor: Editor | null;

  /**
   * Active project for brand voice / persona resolution and as the
   * parent of the document `generateCopy` will create. May be `null`
   * during initial load; the store action treats `null` as a
   * precondition failure.
   */
  activeProject: Project | null;
}

// ============================================================================
// Main view
// ============================================================================

export function WorxDeskGeneratingView({
  editor,
  activeProject,
}: WorxDeskGeneratingViewProps) {
  const extraction = useWorxDeskExtraction();
  const generation = useWorxDeskGeneration();
  const { generateCopy, extractBrief, backToReview } = useWorxDeskActions();

  // ── Auto-trigger guard ───────────────────────────────────────────────────
  //
  // A boolean ref tracks whether the current extraction result has already
  // been handed off to `generateCopy`. The guard is keyed on the OBJECT
  // IDENTITY of `extractedFormData` — every successful extraction lands a
  // fresh `Record<string, string>` reference (the store builds a new
  // object per response), so resetting the ref to `false` on transitions
  // back to `null` and re-firing on the next non-null is a clean
  // "once per extraction" semantic.

  const hasTriggeredForExtractionRef = useRef(false);

  useEffect(() => {
    if (extraction.extractedFormData === null) {
      // Reset for the next extraction cycle.
      hasTriggeredForExtractionRef.current = false;
      return;
    }
    if (hasTriggeredForExtractionRef.current) return;
    if (
      generation.isGenerating ||
      generation.generationError !== null ||
      generation.generatedCopyHtml !== null
    ) {
      // Either the generation is already in flight (StrictMode double-mount
      // or a manual retry that beat the effect), or we're sitting on a
      // failure that the user must resolve manually before re-firing.
      return;
    }
    hasTriggeredForExtractionRef.current = true;
    void generateCopy(editor, activeProject);
  }, [
    extraction.extractedFormData,
    generation.isGenerating,
    generation.generationError,
    generation.generatedCopyHtml,
    editor,
    activeProject,
    generateCopy,
  ]);

  // ── Manual retry handler ────────────────────────────────────────────────
  //
  // Distinguishes between an extraction failure (which retries
  // `extractBrief()`) and a generation failure (which retries
  // `generateCopy()`). The discrimination is the same one the failure UI
  // uses below.

  const handleTryAgain = (): void => {
    if (extraction.extractedFormData === null) {
      void extractBrief();
      return;
    }
    void generateCopy(editor, activeProject);
  };

  // ── 1. EXTRACTING state ──────────────────────────────────────────────────

  if (extraction.isExtractingBrief) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple p-6">
          <AIWorxLoader message="Extracting your brief…" />
        </div>
        <p className="text-xs text-apple-text-light text-center">
          We&apos;re translating your brief into structured fields the writing
          engine understands.
        </p>
      </div>
    );
  }

  // ── 2. GENERATING state ──────────────────────────────────────────────────

  if (generation.isGenerating) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple p-6">
          <AIWorxLoader message="Writing your copy…" />
        </div>
        <p className="text-xs text-apple-text-light text-center">
          Powered by 40 years of methodology.
        </p>
      </div>
    );
  }

  // ── 3. SAFETY-NET RECOVERY state ────────────────────────────────────────
  //
  // The LLM produced valid HTML but `createDocument` or
  // `editor.commands.setContent` threw. The HTML is preserved in the
  // store so the user can retry persistence without re-paying for
  // generation. The retry path here is currently the same `generateCopy`
  // call — a future enhancement could split a "retry persistence only"
  // action that skips the API call.

  if (generation.generatedCopyHtml !== null) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-amber-900">
                Copy generated, but couldn&apos;t save the document
              </p>
              <p className="text-xs text-amber-800">
                {generation.generationError ??
                  'Your generated copy is held safely. Try saving again or contact support.'}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 hover:text-amber-950 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Try again
                </button>
                <button
                  type="button"
                  onClick={backToReview}
                  className="text-xs text-amber-900 hover:text-amber-950 hover:underline"
                >
                  Back to review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. FAILURE state ────────────────────────────────────────────────────
  //
  // Either Brief Extraction or final generation threw. We discriminate by
  // whether `extractedFormData` is set: null means extraction failed; non-
  // null means extraction succeeded but generation failed. The user-
  // facing copy and the retry target adapt accordingly.

  if (generation.generationError !== null) {
    const isGenerationFailure = extraction.extractedFormData !== null;
    const headline = isGenerationFailure
      ? 'Copy generation failed'
      : 'Brief extraction failed';

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-red-800">{headline}</p>
              <p className="text-xs text-red-700">
                {generation.generationError}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Try again
                </button>
                <button
                  type="button"
                  onClick={backToReview}
                  className="text-xs text-red-700 hover:text-red-900 hover:underline"
                >
                  Back to review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Defensive fallback ──────────────────────────────────────────────────
  //
  // Reaching this branch means the panel has routed us to the generating
  // view but none of the four states above match. Under the Phase 6 auto-
  // trigger this is normally a transient single render between
  // extraction landing and `isGenerating` flipping true. Render nothing
  // rather than throwing — the next state change will swap us into a
  // real state.

  return null;
}
