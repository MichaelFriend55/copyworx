/**
 * @file components/workspace/worxdesk/WorxDeskReviewView.tsx
 * @description Strategic Review streaming + Q&A view (Phase 5B).
 *
 * Renders the panel body for the `streaming` and `review` flow phases:
 *   - Header strip with "← Edit brief" + status indicator.
 *   - Strategic Take section with markdown-aware text and a blinking
 *     cursor while content is still streaming in.
 *   - Decisions Needed section with three branches: streaming-helper-text,
 *     "brief is solid" callout, or numbered question cards (with "I
 *     don't know" / "Undo skip" affordances).
 *   - Skip-review section: subtle link → inline "type 'skip' to confirm"
 *     input → faded + bypassed treatment with "Undo skip".
 *   - Streaming error callout with "Try again".
 *   - Parser-failure soft warning when no `## Decisions Needed` marker
 *     is found in the stream.
 *
 * The footer (Generate / ← Edit brief) lives in the panel shell.
 */

'use client';

import React, { useCallback, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { cn } from '@/lib/utils';
import {
  WORXDESK_SKIPPED_ANSWER_TEXT,
  useWorxDeskActions,
  useWorxDeskAnswers,
  useWorxDeskReview,
} from '@/lib/stores/worxdeskStore';
import { parseStrategicReviewText } from '@/lib/files/strategic-review-parser';
import type { WorxDeskAnswer, WorxDeskQuestion } from '@/lib/types/worxdesk';

// ============================================================================
// Markdown helpers
// ============================================================================

/**
 * Render a markdown-ish string preserving paragraphs (blank-line
 * separated), single newlines (line breaks), and inline `**bold**` /
 * `*italic*` runs. Intentionally narrow — the Strategic Take prompt
 * forbids headings inside the take itself, so we don't need a full
 * markdown parser. No nesting support; the inline regex handles
 * non-overlapping runs.
 *
 * Rendered as a small `<div>` of `<p>` blocks. Safe against XSS because
 * we never set `dangerouslySetInnerHTML` — every fragment is built from
 * plain text via React children.
 */
function MarkdownText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <div className="space-y-3">
      {paragraphs.map((para, paraIdx) => (
        <p
          key={paraIdx}
          className="text-sm leading-6 text-apple-text-dark whitespace-pre-wrap break-words"
        >
          {renderInlineMarkdown(para)}
        </p>
      ))}
    </div>
  );
}

/**
 * Convert `**bold**` and `*italic*` runs in a string into React nodes.
 * Single-pass tokenizer so the order of characters is preserved.
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  // Pattern matches `**...**` (greedy at first, but ?: keeps groups
  // numbered cleanly) OR `*...*`. Order matters – test for `**` first so
  // the two-asterisk wrapper isn't consumed by the single-asterisk one.
  const regex = /\*\*([^*]+?)\*\*|\*([^*\s][^*]*?)\*/g;
  const out: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > cursor) {
      out.push(text.slice(cursor, match.index));
    }
    if (match[1] !== undefined) {
      out.push(<strong key={`b-${key++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      out.push(<em key={`i-${key++}`}>{match[2]}</em>);
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    out.push(text.slice(cursor));
  }

  // Single-element shortcut so trivial paragraphs stay as plain strings.
  if (out.length === 0) return text;
  if (out.length === 1 && typeof out[0] === 'string') return out[0];

  return out;
}

// ============================================================================
// Main view
// ============================================================================

export function WorxDeskReviewView() {
  const review = useWorxDeskReview();
  const { answers, bypassedReview } = useWorxDeskAnswers();
  const {
    answerQuestion,
    skipQuestion,
    bypassReview,
    unbypassReview,
    resetReview,
    submitBrief,
  } = useWorxDeskActions();

  // ── Derived display state ────────────────────────────────────────────────

  // While streaming, parse the in-progress text every render so the user
  // sees progressive Strategic Take. The parse is cheap (regex on a few
  // KB max) and its output is unused after streaming completes (the
  // store has already promoted the structured fields).
  const liveParsed = review.isStreamingReview
    ? parseStrategicReviewText(review.streamingRawText)
    : null;

  const displayedTake = liveParsed
    ? liveParsed.strategicTake
    : review.strategicTake;

  const displayedQuestions: WorxDeskQuestion[] = liveParsed
    ? liveParsed.questions
    : review.strategicQuestions;

  const displayedSolid = liveParsed ? liveParsed.briefIsSolid : review.briefIsSolid;
  const displayedBroken = liveParsed
    ? liveParsed.briefIsBroken
    : review.briefIsBroken;

  // Soft-warning: stream is finished but the parser couldn't structure
  // the output (no Decisions Needed marker found). We show the raw text
  // as the take and surface a non-blocking notice.
  const parserDegraded =
    !review.isStreamingReview &&
    review.streamingRawText.length > 0 &&
    review.strategicQuestions.length === 0 &&
    !review.briefIsSolid &&
    !review.briefIsBroken &&
    !review.reviewError &&
    !/##\s*Decisions Needed/i.test(review.streamingRawText);

  // ── Error path: Strategic Review failed entirely ─────────────────────────

  if (review.reviewError && !review.isStreamingReview) {
    return (
      <div className="space-y-4">
        <ReviewHeaderStrip
          isStreaming={false}
          showStatus={false}
          onEditBrief={resetReview}
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-red-800">
                Strategic Review failed
              </p>
              <p className="text-xs text-red-700">{review.reviewError}</p>
              <button
                type="button"
                onClick={() => {
                  void submitBrief();
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Happy + streaming path ───────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <ReviewHeaderStrip
        isStreaming={review.isStreamingReview}
        showStatus
        onEditBrief={resetReview}
      />

      {/* Optional faded treatment when the user bypassed the review */}
      <div
        className={cn(
          'space-y-5 transition-opacity duration-200',
          bypassedReview ? 'opacity-50' : 'opacity-100',
        )}
        aria-disabled={bypassedReview ? true : undefined}
      >
        {/* ── Strategic Take ─────────────────────────────────────────── */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-apple-text-light">
            Strategic Take
          </h3>
          {displayedTake.length > 0 ? (
            <div className="rounded-lg border border-apple-gray-light bg-white p-4">
              <MarkdownText text={displayedTake} />
              {review.isStreamingReview && (
                <span
                  aria-hidden="true"
                  className="inline-block ml-1 align-text-bottom animate-pulse text-apple-blue"
                >
                  ▋
                </span>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-apple-gray-light bg-gray-50 p-4">
              <p className="text-sm italic text-apple-text-light">
                Reading your brief…
              </p>
            </div>
          )}
        </section>

        {/* ── Broken-brief callout (renders just below the Take) ──────── */}
        {displayedBroken && !review.isStreamingReview && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">
              <strong>Heads up:</strong> the review flagged this brief as
              missing essential context. Address the questions below before
              generating, or click &quot;← Edit brief&quot; to revise.
            </p>
          </div>
        )}

        {/* ── Decisions Needed ───────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-apple-text-light">
            Decisions Needed
          </h3>

          {review.isStreamingReview && displayedQuestions.length === 0 && !displayedSolid ? (
            <p className="text-xs italic text-apple-text-light">
              Questions appearing as the review completes…
            </p>
          ) : displayedSolid ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm text-emerald-800 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                <span>
                  This brief is solid – ready to generate when you are.
                </span>
              </p>
            </div>
          ) : displayedQuestions.length === 0 ? (
            // Stream finished, no questions and not solid – the parser
            // either missed structure or the model returned zero items.
            // The graceful-degradation banner below will explain.
            null
          ) : (
            <div className="space-y-3">
              {displayedQuestions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  index={index + 1}
                  question={question}
                  answer={findAnswerFor(answers, question.id)}
                  bypassedReview={bypassedReview}
                  onAnswer={(text) => answerQuestion(question.id, text)}
                  onSkip={() => skipQuestion(question.id)}
                />
              ))}
            </div>
          )}

          {parserDegraded && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> Could not detect questions. Continuing
                without them.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ── Skip-review section (always rendered outside the faded block) ─ */}
      {!review.isStreamingReview &&
        displayedQuestions.length > 0 &&
        !displayedSolid && (
          <SkipReviewSection
            bypassedReview={bypassedReview}
            onConfirmSkip={bypassReview}
            onUndoSkip={unbypassReview}
          />
        )}
    </div>
  );
}

// ============================================================================
// Header strip
// ============================================================================

interface ReviewHeaderStripProps {
  isStreaming: boolean;
  showStatus: boolean;
  onEditBrief: () => void;
}

/**
 * Top strip of the Strategic Review view: "← Edit brief" on the left,
 * status pill on the right.
 */
function ReviewHeaderStrip({
  isStreaming,
  showStatus,
  onEditBrief,
}: ReviewHeaderStripProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onEditBrief}
        className="inline-flex items-center gap-1 text-xs font-medium text-apple-text-light hover:text-apple-text-dark transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Edit brief
      </button>

      {showStatus && (
        <div className="flex items-center gap-1.5 text-xs">
          {isStreaming ? (
            <>
              <Loader2 className="w-3 h-3 text-apple-blue animate-spin" />
              <span className="text-apple-text-light">Reading…</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Review ready</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Question card
// ============================================================================

interface QuestionCardProps {
  index: number;
  question: WorxDeskQuestion;
  answer: WorxDeskAnswer | undefined;
  bypassedReview: boolean;
  onAnswer: (text: string) => void;
  onSkip: () => void;
}

/**
 * Single numbered question card with an AutoExpandTextarea, an "I don't
 * know" / "Undo skip" affordance, and a faded treatment when the user
 * has skipped (manually or via bypass).
 */
function QuestionCard({
  index,
  question,
  answer,
  bypassedReview,
  onAnswer,
  onSkip,
}: QuestionCardProps) {
  const isSkipped = answer?.wasSkipped === true;
  const value = isSkipped ? '' : (answer?.answer ?? '');

  // Bypass freezes every card – a skipped-by-bypass card cannot be
  // un-skipped individually; the user must click "Undo skip" on the
  // global banner. Manual single-skip CAN be undone here.
  const lockedByBypass = bypassedReview && isSkipped;

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-3 space-y-2',
        isSkipped
          ? 'border-apple-gray-light bg-gray-50'
          : 'border-apple-gray-light',
      )}
    >
      <p className="text-sm font-medium text-apple-text-dark">
        <span className="text-apple-text-light mr-2">{index}.</span>
        {question.text}
      </p>

      <AutoExpandTextarea
        value={value}
        onChange={(event) => onAnswer(event.target.value)}
        placeholder={
          isSkipped
            ? bypassedReview
              ? 'Skipped (review bypassed)'
              : 'Skipped'
            : 'Type your answer…'
        }
        disabled={isSkipped}
        minHeight={60}
        maxHeight={200}
        className={cn(
          'w-full px-3 py-2 rounded-md border transition-all duration-200',
          'text-sm text-apple-text-dark',
          'placeholder:text-apple-text-light',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-1',
          isSkipped
            ? 'bg-gray-100 border-gray-200 text-apple-text-light cursor-not-allowed'
            : 'bg-white border-apple-gray-light hover:border-apple-gray',
        )}
      />

      <div className="flex items-center justify-between">
        {isSkipped ? (
          lockedByBypass ? (
            <span className="text-xs text-apple-text-light italic">
              Skipped (review bypassed)
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onAnswer('')}
              className="text-xs font-medium text-apple-blue hover:text-apple-blue/80 transition-colors"
            >
              Undo skip
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-apple-text-light hover:text-apple-text-dark hover:underline transition-colors"
          >
            I don&apos;t know
          </button>
        )}

        {isSkipped && (
          <span className="text-xs text-apple-text-light">
            {WORXDESK_SKIPPED_ANSWER_TEXT}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Skip-review section
// ============================================================================

interface SkipReviewSectionProps {
  bypassedReview: boolean;
  onConfirmSkip: () => void;
  onUndoSkip: () => void;
}

/**
 * The deliberately-unobtrusive "skip strategic review" affordance.
 *
 * Three-state UI:
 *   1. Idle: subtle text link "Skip strategic review and generate anyway"
 *   2. Confirming: inline input field – typing "skip" fires the bypass
 *   3. Bypassed: banner explaining the bypass, with an "Undo skip" link
 */
function SkipReviewSection({
  bypassedReview,
  onConfirmSkip,
  onUndoSkip,
}: SkipReviewSectionProps) {
  const [mode, setMode] = useState<'idle' | 'confirming'>('idle');
  const [confirmText, setConfirmText] = useState('');

  // Whenever bypass toggles ON, retract the confirming UI – it has done
  // its job. Whenever bypass toggles OFF (via undo), reset back to idle.
  React.useEffect(() => {
    if (bypassedReview) {
      setMode('idle');
      setConfirmText('');
    }
  }, [bypassedReview]);

  const handleConfirmChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      setConfirmText(next);
      if (next.trim().toLowerCase() === 'skip') {
        onConfirmSkip();
      }
    },
    [onConfirmSkip],
  );

  if (bypassedReview) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-xs text-amber-800">
              Review bypassed. The AI will infer reasonably from your brief
              alone.
            </p>
            <button
              type="button"
              onClick={onUndoSkip}
              className="text-xs font-medium text-amber-800 hover:text-amber-900 hover:underline"
            >
              Undo skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'confirming') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <input
          type="text"
          value={confirmText}
          onChange={handleConfirmChange}
          placeholder="Type 'skip' to confirm bypass"
          className={cn(
            'flex-1 max-w-xs px-2 py-1 rounded border text-xs',
            'border-apple-gray-light bg-white',
            'focus:outline-none focus:ring-1 focus:ring-apple-blue',
          )}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setMode('idle');
            setConfirmText('');
          }}
          className="text-xs text-apple-text-light hover:text-apple-text-dark hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setMode('confirming')}
      className="text-xs text-apple-text-light hover:text-apple-text-dark hover:underline transition-colors"
    >
      Skip strategic review and generate anyway
    </button>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function findAnswerFor(
  answers: WorxDeskAnswer[],
  questionId: string,
): WorxDeskAnswer | undefined {
  return answers.find((a) => a.questionId === questionId);
}
