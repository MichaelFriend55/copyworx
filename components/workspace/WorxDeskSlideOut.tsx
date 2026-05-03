/**
 * @file components/workspace/WorxDeskSlideOut.tsx
 * @description WORX DESK on-ramp panel shell – Phase 5B.
 *
 * Phase 5A built the input form. Phase 5B extends the panel to switch
 * between three body views based on the WORX DESK flow phase:
 *
 *   - INPUT      → `<WorxDeskInputView />` (Phase 5A form)
 *   - STREAMING  → `<WorxDeskReviewView />` (Strategic Review streaming + Q&A)
 *   - REVIEW     → `<WorxDeskReviewView />`
 *   - EXTRACTING → `<WorxDeskGeneratingView />`
 *   - EXTRACTED  → `<WorxDeskGeneratingView />`
 *
 * The header (title) and footer (StickyActionBar) are owned by this
 * file. The footer's button layout, labels, and enable state change
 * per phase per the Phase 5B spec.
 *
 * Lifecycle:
 *   - First time the panel opens we mint a new run id (`startSession`).
 *     Re-opens preserve any in-progress brief / review so closing the
 *     panel to glance at the editor does not destroy the user's work.
 *   - The "Cancel" button in the INPUT view fully resets the session.
 *   - The "Cancel" button in the STREAMING view closes without resetting
 *     so the user can re-open and finish the review (the SSE stream is
 *     aborted by `resetReview()` / `resetSession()` only — a panel close
 *     leaves the stream draining harmlessly into module memory).
 *
 * Panel ID + convenience hooks remain exported here so consumers in
 * `LeftSidebarContent.tsx` and `app/worxspace/page.tsx` keep their
 * existing imports.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Button } from '@/components/ui/button';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import {
  useIsSlideOutOpen,
  useSlideOutActions,
} from '@/lib/stores/slideOutStore';
import {
  useWorxDeskActions,
  useWorxDeskAnswers,
  useWorxDeskFlow,
  useWorxDeskReview,
  useWorxDeskSessionId,
} from '@/lib/stores/worxdeskStore';
import { WorxDeskInputView } from './worxdesk/WorxDeskInputView';
import { WorxDeskReviewView } from './worxdesk/WorxDeskReviewView';
import { WorxDeskGeneratingView } from './worxdesk/WorxDeskGeneratingView';
import type { Project } from '@/lib/types/project';
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
 * Subtitle copy keyed by flow phase. The shell reads this from a single
 * map so every transition uses the correct framing.
 */
const SUBTITLE_BY_PHASE: Record<string, string> = {
  input: 'Brief in. Copy out. Powered by methodology.',
  streaming: 'Reading your brief…',
  review: 'Strategic Review complete.',
  extracting: 'Preparing your brief for generation…',
  extracted: 'Brief extracted successfully.',
};

// ============================================================================
// Types
// ============================================================================

interface WorxDeskSlideOutProps {
  /** Whether the panel is currently open. */
  isOpen: boolean;

  /** Callback invoked when the X button or backdrop closes the panel. */
  onClose: () => void;

  /**
   * TipTap editor instance. Phase 5B does not write to the editor – the
   * prop is accepted now so Phase 6 can use it without changing the
   * call site in `app/worxspace/page.tsx`.
   */
  editor: Editor | null;

  /**
   * Active project for brand voice and persona pickers. May be `null`
   * during initial load; the input view degrades gracefully.
   */
  activeProject: Project | null;
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
// Main component
// ============================================================================

export function WorxDeskSlideOut({
  isOpen,
  onClose,
  editor: _editor,
  activeProject,
}: WorxDeskSlideOutProps) {
  // Editor is reserved for Phase 6. Suppress the unused-var lint
  // without changing the public prop surface.
  void _editor;

  const sessionId = useWorxDeskSessionId();
  const flowPhase = useWorxDeskFlow();
  const review = useWorxDeskReview();
  const { answers, bypassedReview } = useWorxDeskAnswers();
  const {
    startSession,
    submitBrief,
    extractBrief,
    resetReview,
    backToReview,
    resetSession,
  } = useWorxDeskActions();

  // ── Local UI state ───────────────────────────────────────────────────────

  // Mirror of the input view's required-field validity. The input view
  // reports it via callback so the shell can drive the Submit button
  // disabled state without re-implementing validation logic.
  const [isInputValid, setIsInputValid] = useState(false);

  // First time the panel opens, mint a new run id. Re-opens preserve any
  // in-progress work.
  useEffect(() => {
    if (isOpen && sessionId === null) {
      startSession();
    }
  }, [isOpen, sessionId, startSession]);

  // ── Submit / Generate handlers ───────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (!isInputValid) return;
    void submitBrief();
  }, [isInputValid, submitBrief]);

  const handleGenerate = useCallback(() => {
    void extractBrief();
  }, [extractBrief]);

  // ── Cancel / Close handlers ──────────────────────────────────────────────

  const handleCancelFromInput = useCallback(() => {
    resetSession();
    onClose();
  }, [resetSession, onClose]);

  const handleCancelFromStreaming = useCallback(() => {
    // Per spec: streaming Cancel only closes the panel without resetting
    // the session. The SSE stream keeps draining quietly into module
    // memory; `resetReview()` would abort it, but we want the user to
    // re-open and find the review ready.
    onClose();
  }, [onClose]);

  // ── Generate enable check (REVIEW phase) ─────────────────────────────────

  // Generate is enabled if any of:
  //   - the brief was solid (no questions to answer)
  //   - the review was bypassed (every question auto-skipped)
  //   - every question has an answer (real text or skipped)
  //
  // Baseline: a Strategic Take must exist. The "review" phase can also
  // be entered when only `reviewError` is set (pre-stream HTTP failures
  // surface there so the error callout renders) — Generate must stay
  // disabled in that case so a click doesn't fire `extractBrief()`
  // against an empty take.
  const isGenerateEnabled = useMemo(() => {
    if (review.strategicTake.length === 0) return false;
    if (review.reviewError !== null) return false;
    if (review.briefIsSolid) return true;
    if (bypassedReview) return true;
    if (review.strategicQuestions.length === 0) {
      // Stream finished without questions and not flagged solid – treat
      // this as a parser-degraded state and let the user proceed.
      return true;
    }
    const answeredIds = new Set(answers.map((a) => a.questionId));
    return review.strategicQuestions.every((q) => answeredIds.has(q.id));
  }, [
    review.strategicTake,
    review.reviewError,
    review.briefIsSolid,
    review.strategicQuestions,
    bypassedReview,
    answers,
  ]);

  // ── Footer per phase ─────────────────────────────────────────────────────

  const footer = useMemo(() => {
    switch (flowPhase) {
      case 'input':
        return (
          <StickyActionBar variant="static">
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={handleCancelFromInput}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                size="default"
                onClick={handleSubmit}
                disabled={!isInputValid}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Brief
              </Button>
            </div>
          </StickyActionBar>
        );

      case 'streaming':
        return (
          <StickyActionBar variant="static">
            <div className="flex gap-3 items-center">
              <Button
                variant="outline"
                size="default"
                onClick={handleCancelFromStreaming}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                size="default"
                disabled
                className="flex-1"
              >
                <AIWorxButtonLoader />
              </Button>
            </div>
          </StickyActionBar>
        );

      case 'review':
        return (
          <StickyActionBar variant="static">
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={resetReview}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Edit brief
              </Button>
              <Button
                variant="brand"
                size="default"
                onClick={handleGenerate}
                disabled={!isGenerateEnabled}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
          </StickyActionBar>
        );

      case 'extracting':
        // No buttons. The 45s timeout in the route guards against a
        // stuck state; a Cancel here would race with the request and
        // create more confusion than it solves.
        return null;

      case 'extracted':
        return (
          <StickyActionBar variant="static">
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={backToReview}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to review
              </Button>
              <Button
                variant="ghost"
                size="default"
                onClick={resetSession}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Start over
              </Button>
            </div>
          </StickyActionBar>
        );

      default:
        return null;
    }
  }, [
    flowPhase,
    isInputValid,
    isGenerateEnabled,
    handleCancelFromInput,
    handleCancelFromStreaming,
    handleSubmit,
    handleGenerate,
    resetReview,
    backToReview,
    resetSession,
  ]);

  // ── Body per phase ───────────────────────────────────────────────────────

  let body: React.ReactNode;
  switch (flowPhase) {
    case 'input':
      body = (
        <WorxDeskInputView
          isOpen={isOpen}
          activeProject={activeProject}
          onValidityChange={setIsInputValid}
        />
      );
      break;
    case 'streaming':
    case 'review':
      body = <WorxDeskReviewView />;
      break;
    case 'extracting':
    case 'extracted':
      body = <WorxDeskGeneratingView />;
      break;
    default:
      body = null;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      width={600}
      title="MY WORX DESK"
      subtitle={SUBTITLE_BY_PHASE[flowPhase] ?? SUBTITLE_BY_PHASE.input}
      footer={footer ?? undefined}
    >
      {body}
    </SlideOutPanel>
  );
}

export default WorxDeskSlideOut;
