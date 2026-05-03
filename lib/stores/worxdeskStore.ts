/**
 * @file lib/stores/worxdeskStore.ts
 * @description Ephemeral Zustand store for the WORX DESK on-ramp session.
 *
 * Holds the in-memory state of a single WORX DESK session – from brief intake
 * (Phase 5A) through Strategic Review streaming and Q&A (Phase 5B) into copy
 * generation (Phase 6). The store is intentionally NOT persisted: a session
 * is a working-memory artifact that gets distilled into the document's
 * `worxdesk_metadata` jsonb column at save time, and stale half-finished
 * sessions surviving a page reload would be confusing rather than useful.
 *
 * Architectural mirror of `lib/stores/workspaceStore.ts`:
 *   - One source-of-truth state object
 *   - Granular `setX` actions for inputs
 *   - Higher-level orchestrators (`startSession`, `submitBrief`,
 *     `extractBrief`, `resetSession`) that touch multiple slices at once
 *   - `useShallow` selector hooks to keep consumers from re-rendering on
 *     unrelated slice changes
 *
 * Phase 5A populates the input slice and the file-parse slice. Phase 5B
 * (this file's current scope) populates the strategic-review and Q&A slices
 * via SSE streaming and adds the brief-extraction call. Phase 6 will
 * populate the final generation slice (`isGenerating`).
 */

'use client';

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
import type {
  BriefExtractionLLMResponse,
  StrategicReviewLLMRequest,
  WorxDeskAnswer,
  WorxDeskMetadata,
  WorxDeskQuestion,
} from '@/lib/types/worxdesk';
import type { Project, Persona } from '@/lib/types/project';
import type {
  TemplateGenerationRequest,
  TemplateGenerationResponse,
} from '@/lib/types/template';
import { parseStrategicReviewText } from '@/lib/files/strategic-review-parser';
import { getTemplateById } from '@/lib/data/templates';
import { WORXDESK_SUPPORTED_TEMPLATE_IDS } from '@/lib/templates/worxdesk-template-schemas';
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
import {
  createDocument,
  getProjectPersonas,
} from '@/lib/storage/unified-storage';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { useSlideOutStore } from '@/lib/stores/slideOutStore';
import { logger } from '@/lib/utils/logger';
import { formatErrorForUser, logError } from '@/lib/utils/error-handling';

// ============================================================================
// UUID generation
// ============================================================================

/**
 * Generate a UUID for the WORX DESK session run id. Uses the same browser
 * fallback chain as `lib/storage/document-storage.ts` so we don't add a new
 * npm dependency just for ID generation. `crypto.randomUUID()` is available
 * in every modern browser (Chrome 92+, Safari 15.4+, Firefox 95+) and in
 * Node 19+; the fallback covers older runtimes that may still execute this
 * file (e.g. SSR pre-hydration in some edge cases).
 */
function generateRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Endpoint that parses uploaded brief files. Centralized so the store and
 * any callers that want to mock it in tests share one string.
 */
const PARSE_BRIEF_FILE_ENDPOINT = '/api/worxdesk/parse-brief-file';

/** Phase 3 SSE streaming endpoint for the Strategic Review (Call 1). */
const STRATEGIC_REVIEW_ENDPOINT = '/api/worxdesk/strategic-review';

/** Phase 3 JSON endpoint for Brief Extraction (Call 2). */
const EXTRACT_BRIEF_ENDPOINT = '/api/worxdesk/extract-brief';

/** Phase 6 JSON endpoint for final template-driven copy generation (Call 3). */
const GENERATE_TEMPLATE_ENDPOINT = '/api/generate-template';

/**
 * Panel id of the WORX DESK on-ramp slide-out. Mirrored here from
 * `components/workspace/WorxDeskSlideOut.tsx` so this store can close the
 * panel after a successful generation without importing the component file
 * (which would create a circular dependency: the component imports hooks
 * from this store). Keep in sync with `WORXDESK_PANEL_ID` over there — the
 * single source of truth lives next to the component, this is only a
 * runtime-coordination duplicate.
 */
const WORXDESK_PANEL_ID_FOR_CLOSE = 'worxdesk-onramp';

/**
 * Number of milliseconds to wait between activating the freshly-created
 * document and pushing the generated HTML into the editor. Mirrors the
 * delay used by `TemplateFormSlideOut.handleGenerate` so the EditorArea
 * has a render tick to react to the new `activeDocumentId` before we call
 * `editor.commands.setContent` on it.
 */
const EDITOR_ACTIVATION_SETTLE_MS = 150;

/**
 * Sonner toast id reused for the "Copy generated. Document created." success
 * notification fired by `generateCopy`. Reusing one id ensures rapid retries
 * coalesce into a single visible toast rather than stacking duplicates.
 */
const GENERATION_SUCCESS_TOAST_ID = 'worxdesk-generation-success';

/**
 * Sentinel answer text written when a question is skipped (either by the
 * user clicking "I don't know" on an individual question or by the global
 * "skip strategic review" bypass). Lives here so the UI label, the answer
 * payload sent to the API, and the round-trip persistence layer all read
 * the same string.
 */
export const WORXDESK_SKIPPED_ANSWER_TEXT = "don't know";

// ============================================================================
// SSE frame types
// ============================================================================

/**
 * Mirror of the server-side `StrategicReviewSseFrame` type from
 * `app/api/worxdesk/strategic-review/route.ts`. Re-declared here rather
 * than imported because that file is server-only (NextResponse, Anthropic
 * SDK) and pulling it into a `'use client'` module would break the build.
 */
type StrategicReviewSseFrame =
  | { type: 'text'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

// ============================================================================
// Module-scoped abort handle
// ============================================================================

/**
 * Tracks the AbortController for the in-flight Strategic Review fetch so
 * `resetReview()` / `resetSession()` can cancel a stream that's still
 * draining. Module-scoped (not in store state) because AbortController is
 * non-serializable and re-storing it on each `set()` would do more harm
 * than good. Only one stream may run at a time per session.
 */
let activeReviewAbortController: AbortController | null = null;

/**
 * Cancel any in-flight Strategic Review fetch. Safe to call when no
 * stream is active. Used by reset paths and by `submitBrief()` itself
 * when a second submit comes in before the first finishes.
 */
function cancelActiveReviewStream(reason: string): void {
  if (activeReviewAbortController === null) return;
  try {
    activeReviewAbortController.abort(reason);
  } catch {
    // Already aborted – harmless.
  }
  activeReviewAbortController = null;
}

// ============================================================================
// State shape
// ============================================================================

/**
 * Full ephemeral state of a WORX DESK session.
 *
 * The shape is split into logical slices in the comments below for
 * readability; TypeScript treats it as one flat interface.
 */
export interface WorxDeskState {
  // ── Session identity ─────────────────────────────────────────────────────

  /**
   * Stable run id for this WORX DESK session. Generated on `startSession()`,
   * carried into `worxdesk_metadata.worxdeskRunId` at save time, and used
   * for analytics + log correlation. `null` before the panel is opened the
   * first time.
   */
  worxdeskRunId: string | null;

  // ── Input fields (Phase 5A) ──────────────────────────────────────────────

  /** Raw brief text – pasted by the user or populated from a parsed file. */
  originalBrief: string;

  /** Free-text description of the desired deliverable (length, channel, etc.). */
  deliverableSpec: string;

  /** Notes / links / references the user supplies as additional context. */
  supportingMaterials: string;

  /**
   * The AI@Worx template id selected by the user. Empty string before the
   * user picks one. Constrained to `WORXDESK_SUPPORTED_TEMPLATE_IDS` at the
   * UI layer; the store does not enforce this so the type stays simple.
   */
  chosenTemplateId: string;

  /** Brand voice id from the active project, or null when none selected. */
  brandVoiceId: string | null;

  /** Persona id from the active project, or null when none selected. */
  personaId: string | null;

  // ── File parsing state (Phase 5A) ────────────────────────────────────────

  /** True while the parse-brief-file API call is in flight. */
  isParsingFile: boolean;

  /**
   * User-facing error message from the most recent file parse attempt, or
   * null when there was no error. Cleared on the next successful parse.
   */
  parseError: string | null;

  /**
   * Non-fatal warnings surfaced by the parse-brief-file API
   * (e.g. "OCR was skipped"). Always present as an array; an empty array
   * means the latest parse produced no warnings.
   */
  parseWarnings: string[];

  /**
   * Filename of the most recently uploaded brief file, or null when no
   * file has been uploaded (or the chip has been cleared). Used to render
   * the "Uploaded: foo.pdf [×]" affordance.
   */
  uploadedFileName: string | null;

  // ── Strategic Review state (Phase 5B) ────────────────────────────────────

  /**
   * Full unparsed text accumulated from the SSE stream. Updated on every
   * `text` frame so the review view can show progressive content while
   * the model is still writing. Reset to empty string when a new
   * `submitBrief()` begins.
   */
  streamingRawText: string;

  /**
   * Parsed Strategic Take paragraph. Populated when the SSE stream
   * completes (the `done` frame). Always read this for the canonical
   * value sent to `/api/worxdesk/extract-brief`; only read
   * `streamingRawText` for live display during streaming.
   */
  strategicTake: string;

  /**
   * Parsed clarifying questions. Populated when the SSE stream completes.
   * Empty array when `briefIsSolid` is true OR while streaming is in
   * progress.
   */
  strategicQuestions: WorxDeskQuestion[];

  /** True while the Strategic Review SSE stream is open and draining. */
  isStreamingReview: boolean;

  /**
   * User-facing error message from the most recent Strategic Review run.
   * Set when the stream emits an `error` frame OR when the fetch fails
   * before the stream opens. Cleared at the start of each new
   * `submitBrief()` call.
   */
  reviewError: string | null;

  /**
   * True when the parser detected the "no decisions needed" sentinel
   * inside the Decisions Needed block. The Generate button enables
   * automatically when this is true.
   */
  briefIsSolid: boolean;

  /**
   * True when the parser detected the "this brief needs more before we
   * can write to it" lead-in inside the Strategic Take. Used by the
   * review view to surface a softer, more directive callout above the
   * questions.
   */
  briefIsBroken: boolean;

  // ── Q&A state (Phase 5B) ─────────────────────────────────────────────────

  /**
   * One entry per answered or skipped question. Always contains a
   * superset of the question ids the user has touched; questions the
   * user has not yet engaged with do not appear here. Cleared on
   * `resetReview()` and on `submitBrief()`.
   */
  answers: WorxDeskAnswer[];

  /**
   * True when the user typed "skip" to bypass the Strategic Review
   * entirely. While true, every question is treated as auto-skipped
   * with answer text `WORXDESK_SKIPPED_ANSWER_TEXT`.
   */
  bypassedReview: boolean;

  /**
   * Internal: question ids whose answers were created by `bypassReview()`
   * rather than by the user explicitly skipping or typing. Lets
   * `unbypassReview()` cleanly remove the auto-created answers without
   * touching answers the user already entered. Not exposed via any
   * selector hook — purely an internal bookkeeping slice.
   *
   * (Implemented as a string array rather than a Set so Zustand's
   * shallow equality checks behave the same as for the other slices.)
   */
  autoSkippedQuestionIds: string[];

  // ── Generation state (Phase 5B + Phase 6) ────────────────────────────────

  /** True while Brief Extraction (Call 2) is in flight. */
  isExtractingBrief: boolean;

  /**
   * The structured form data returned by Brief Extraction (Call 2).
   * `null` until extraction succeeds for the first time. Used by the
   * Generating view to render the labeled-list confirmation, and by
   * Phase 6 as the input to the template generator.
   */
  extractedFormData: Record<string, string> | null;

  /** True while final copy generation (template generator) is in flight. */
  isGenerating: boolean;

  /**
   * User-facing generation error from either Brief Extraction or copy
   * generation. Cleared at the start of each new `extractBrief()` call.
   */
  generationError: string | null;

  /**
   * Safety net for the "generation succeeded but document persistence failed"
   * edge case in `generateCopy`. When the LLM returned valid HTML but
   * `createDocument` (or the editor write) threw, the formatted HTML is
   * stored here so the user does not lose their generation. `null` in every
   * other state. Cleared by `clearGeneratedCopy()` and by `resetSession()`.
   */
  generatedCopyHtml: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Begin a new session. Mints a fresh run id and resets every other slice
   * to its initial value. Idempotent in the sense that calling it twice in
   * a row simply produces a second fresh run id with another empty session.
   * Callers that want to preserve in-progress work across panel open/close
   * cycles should guard with `if (state.worxdeskRunId === null)`.
   */
  startSession: () => void;

  setOriginalBrief: (text: string) => void;
  setDeliverableSpec: (text: string) => void;
  setSupportingMaterials: (text: string) => void;
  setChosenTemplateId: (id: string) => void;
  setBrandVoiceId: (id: string | null) => void;
  setPersonaId: (id: string | null) => void;

  /**
   * Upload a brief file to /api/worxdesk/parse-brief-file and, on success,
   * populate `originalBrief` with the parsed text and `uploadedFileName`
   * with the file's name. Surfaces server-side warnings in `parseWarnings`.
   * On failure, sets `parseError` with a user-facing message and leaves
   * `originalBrief` untouched so a previous paste is not destroyed.
   *
   * Caller is expected to have already run client-side validation
   * (`validateBriefFile`) before invoking this – but the route validates
   * server-side as well, so a missed client check just produces a
   * normal `parseError`.
   */
  parseUploadedFile: (file: File) => Promise<void>;

  /**
   * Clear the uploaded-file chip. Intentionally does NOT clear
   * `originalBrief`: the user may have edited the parsed text by hand and
   * removing the chip should not destroy their edits. The chip just stops
   * advertising the original filename.
   */
  clearUploadedFile: () => void;

  /**
   * Open an SSE stream against /api/worxdesk/strategic-review using the
   * current input slice, parse incoming `text` frames into
   * `streamingRawText`, and on the `done` frame promote the result into
   * the structured `strategicTake` + `strategicQuestions` slices via
   * `parseStrategicReviewText`. Validates required fields before firing
   * (no-op when `chosenTemplateId`, `originalBrief`, or `deliverableSpec`
   * is empty — the UI's submit button guards against this anyway). Safe
   * to call multiple times: a prior stream is aborted before a new one
   * opens.
   */
  submitBrief: () => Promise<void>;

  /**
   * Record the user's answer to a single Strategic Review question.
   * Always sets `wasSkipped: false` regardless of the prior state — the
   * caller invokes this when the user types real text. To skip, call
   * `skipQuestion(questionId)` instead.
   */
  answerQuestion: (questionId: string, answerText: string) => void;

  /**
   * Mark a single Strategic Review question as skipped. Writes a
   * canonical `WORXDESK_SKIPPED_ANSWER_TEXT` answer with `wasSkipped:
   * true`. Removes the id from the auto-skipped tracking set if it was
   * there (so manually skipping a previously bypassed question doesn't
   * get auto-cleared by a later `unbypassReview()` call).
   */
  skipQuestion: (questionId: string) => void;

  /**
   * Bypass the Strategic Review entirely. Sets `bypassedReview: true`
   * and writes a skipped answer for every question. Tracks the
   * auto-created answers in `autoSkippedQuestionIds` so they can be
   * cleanly removed by `unbypassReview()`. Idempotent: re-calling does
   * not duplicate answers.
   */
  bypassReview: () => void;

  /**
   * Undo a prior `bypassReview()`. Clears `bypassedReview` and removes
   * any answers that were created by the bypass (preserving any answers
   * the user typed or skipped manually).
   */
  unbypassReview: () => void;

  /**
   * Call /api/worxdesk/extract-brief with the current strategic-review
   * + answers state. On success, stores the result in
   * `extractedFormData`. On failure, sets `generationError` with a
   * user-facing message. Always finishes with `isExtractingBrief: false`.
   */
  extractBrief: () => Promise<void>;

  /**
   * Final orchestrator (Phase 6). Pipes the extracted form data into
   * `/api/generate-template`, formats the returned HTML, creates a
   * persisted `ProjectDocument` (carrying the full `WorxDeskMetadata`),
   * activates that document so the editor swaps to it, pushes the HTML
   * into the live TipTap editor, fires a success toast, then resets the
   * session and closes the WORX DESK panel.
   *
   * Pre-conditions are validated up front; if any are missing, the
   * action sets `generationError` and returns without touching the
   * network.
   *
   * On a generation API failure: surfaces a user-facing error and leaves
   * the panel open so the user can retry from the failure UI.
   *
   * On a post-generation persistence failure (HTML in hand, but
   * `createDocument` or `editor.commands.setContent` threw): writes the
   * HTML into `generatedCopyHtml` as a safety net so it can be recovered
   * before the user navigates away, and surfaces a distinct error
   * message that calls out the partial-success state.
   *
   * @param editor         Live TipTap editor instance from the worxspace
   *                       page. May be `null` when the editor has not
   *                       mounted yet — the action treats `null` as a
   *                       precondition failure rather than a no-op so the
   *                       UI can show "open a project first".
   * @param activeProject  The currently-selected project. May be `null`
   *                       for the same reason.
   */
  generateCopy: (
    editor: Editor | null,
    activeProject: Project | null,
  ) => Promise<void>;

  /**
   * Clear the `generatedCopyHtml` safety net. Used by the Generating view
   * after the user acknowledges a recovered partial-success state, and
   * implicitly by `resetSession()`.
   */
  clearGeneratedCopy: () => void;

  /**
   * Clear all review / answer / extraction state, leaving the input slice
   * untouched. Used by the "← Edit brief" button in the Strategic Review
   * view: the user wants to return to the input form to tweak the brief
   * without losing what they pasted.
   */
  resetReview: () => void;

  /**
   * Clear extraction-only state (extractedFormData + generationError),
   * preserving the Strategic Review and the user's answers. Used by the
   * "← Back to review" button in the Generating view so the user can
   * tweak an answer and re-run extraction.
   */
  backToReview: () => void;

  /**
   * Clear every slice and mint a new run id. Use from "Cancel" buttons or
   * after a confirmed-and-completed session that should not bleed into the
   * next opening of the panel.
   */
  resetSession: () => void;
}

/**
 * Phases the WORX DESK panel can be in. Derived from state by
 * `useWorxDeskFlow()`; the store does not store a phase field directly
 * because every transition is implied by the underlying state slices.
 *
 * `generating` (Phase 6) covers the window between Brief Extraction
 * succeeding and the panel auto-closing on a successful copy
 * generation. It is distinct from `extracting` because the user-facing
 * loader copy and the underlying API call are different; it is distinct
 * from `extracted` because the latter is no longer a visible state in
 * v1 (the view auto-triggers `generateCopy` as soon as
 * `extractedFormData` lands).
 */
export type WorxDeskFlowPhase =
  | 'input'
  | 'streaming'
  | 'review'
  | 'extracting'
  | 'extracted'
  | 'generating';

// ============================================================================
// Initial values
// ============================================================================

/**
 * Initial values for every slice except `worxdeskRunId`. Used by the store
 * factory and by `startSession` / `resetSession` so all three paths produce
 * identical empty sessions.
 */
const INITIAL_SESSION_SLICES = {
  originalBrief: '',
  deliverableSpec: '',
  supportingMaterials: '',
  chosenTemplateId: '',
  brandVoiceId: null,
  personaId: null,
  isParsingFile: false,
  parseError: null,
  parseWarnings: [] as string[],
  uploadedFileName: null,
  streamingRawText: '',
  strategicTake: '',
  strategicQuestions: [] as WorxDeskQuestion[],
  isStreamingReview: false,
  reviewError: null,
  briefIsSolid: false,
  briefIsBroken: false,
  answers: [] as WorxDeskAnswer[],
  bypassedReview: false,
  autoSkippedQuestionIds: [] as string[],
  isExtractingBrief: false,
  extractedFormData: null as Record<string, string> | null,
  isGenerating: false,
  generationError: null,
  generatedCopyHtml: null as string | null,
} as const;

/**
 * Just the review / answer / extraction slices, used by `resetReview()`
 * to wipe Phase 5B state without touching the user's input.
 */
const INITIAL_REVIEW_SLICES = {
  streamingRawText: '',
  strategicTake: '',
  strategicQuestions: [] as WorxDeskQuestion[],
  isStreamingReview: false,
  reviewError: null,
  briefIsSolid: false,
  briefIsBroken: false,
  answers: [] as WorxDeskAnswer[],
  bypassedReview: false,
  autoSkippedQuestionIds: [] as string[],
  isExtractingBrief: false,
  extractedFormData: null as Record<string, string> | null,
  isGenerating: false,
  generationError: null,
  generatedCopyHtml: null as string | null,
} as const;

// ============================================================================
// SSE consumption helpers (module-private)
// ============================================================================

/**
 * Read a fetch-response body as a stream of SSE frames terminated by the
 * SSE-spec blank line (`\n\n`). Each frame is parsed from its `data: `
 * prefix into the `StrategicReviewSseFrame` union and yielded to the
 * caller. Malformed frames are logged and skipped — the stream continues
 * draining.
 *
 * The async generator pattern keeps the consumer in `submitBrief()`
 * declarative ("for await each frame, do X") and contains all the
 * decoder / buffer / split bookkeeping inside this helper.
 */
async function* iterateSseFrames(
  response: Response,
): AsyncGenerator<StrategicReviewSseFrame, void, void> {
  if (!response.body) {
    throw new Error('Strategic Review response had no body to stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Flush any trailing decoded bytes. SSE requires `\n\n` so a
        // trailing fragment without the terminator is incomplete and
        // safely discarded.
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      // Drain any complete frames. SSE allows `\n\n` or `\r\n\r\n`; we
      // accept either to be tolerant of proxies that normalize line
      // endings.
      let separatorIndex: number;
      while (
        (separatorIndex = findFrameSeparator(buffer)) !== -1
      ) {
        const frameBlock = buffer.slice(0, separatorIndex.valueOf());
        // Advance past the separator. `findFrameSeparator` returns the
        // start of the separator and we strip a fixed length below
        // because both `\n\n` (length 2) and `\r\n\r\n` (length 4) are
        // accepted; we re-detect to slice the correct amount.
        const separatorLength = buffer.startsWith('\r\n\r\n', separatorIndex)
          ? 4
          : 2;
        buffer = buffer.slice(separatorIndex + separatorLength);

        const parsed = parseSseFrameBlock(frameBlock);
        if (parsed !== null) {
          yield parsed;
        }
      }
    }
  } finally {
    // Always release the lock on the underlying reader so the connection
    // can close even if the consumer broke out of the iterator early.
    try {
      reader.releaseLock();
    } catch {
      // releaseLock throws if the stream is already errored — harmless.
    }
  }
}

/**
 * Find the next SSE frame terminator (`\n\n` or `\r\n\r\n`). Returns the
 * index of the first newline of the terminator, or -1 when no complete
 * frame is in the buffer yet.
 */
function findFrameSeparator(buffer: string): number {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf === -1) return crlf;
  if (crlf === -1) return lf;
  return Math.min(lf, crlf);
}

/**
 * Parse one SSE frame block (everything between two terminators) into a
 * structured `StrategicReviewSseFrame`. The block may contain multiple
 * lines; we only act on `data: …` lines and ignore SSE comments
 * (`: keepalive`) and any unrecognized field lines.
 *
 * Returns `null` for blocks that don't carry a valid JSON `data` line or
 * a payload whose `type` we don't recognize. Per the WHAT NOT TO DO
 * directive in the Phase 5B prompt: we log and continue rather than
 * trying to recover unknown frames.
 */
function parseSseFrameBlock(block: string): StrategicReviewSseFrame | null {
  // SSE frames may be multiple lines; the JSON we care about lives on
  // a single `data: ` line per the Phase 3 contract.
  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.startsWith('data:')) continue;

    // Strip `data:` and any single leading space (SSE spec convention).
    const payload = line.startsWith('data: ') ? line.slice(6) : line.slice(5);
    if (payload.length === 0) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (err) {
      logger.warn('⚠️ WORX DESK SSE: ignoring non-JSON frame:', err);
      return null;
    }

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      typeof (parsed as { type: unknown }).type === 'string'
    ) {
      const typed = parsed as Record<string, unknown>;
      const type = typed.type as string;

      if (type === 'text' && typeof typed.content === 'string') {
        return { type: 'text', content: typed.content };
      }
      if (type === 'done') {
        return { type: 'done' };
      }
      if (type === 'error' && typeof typed.message === 'string') {
        return { type: 'error', message: typed.message };
      }
    }

    logger.warn('⚠️ WORX DESK SSE: ignoring frame with unknown shape:', payload);
    return null;
  }

  return null;
}

/**
 * Convert an HTTP error response from the Strategic Review route into a
 * user-facing message. Pre-stream failures (auth, validation, feature
 * flag) come through as JSON `{ error, details }`, so we surface
 * `details` when present.
 */
async function readPreStreamError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string; details?: string };
    return (
      json.details ??
      json.error ??
      `Strategic Review failed (HTTP ${response.status}). Please try again.`
    );
  } catch {
    return `Strategic Review failed (HTTP ${response.status}). Please try again.`;
  }
}

// ============================================================================
// Store factory
// ============================================================================

/**
 * Ephemeral WORX DESK session store. NOT wrapped in `persist` middleware:
 * sessions live in working memory only; finished sessions are distilled into
 * the document's `worxdesk_metadata` jsonb column.
 */
export const useWorxDeskStore = create<WorxDeskState>()((set, get) => ({
  worxdeskRunId: null,
  ...INITIAL_SESSION_SLICES,

  startSession: () => {
    cancelActiveReviewStream('startSession');
    const newRunId = generateRunId();
    set({ worxdeskRunId: newRunId, ...INITIAL_SESSION_SLICES });
    logger.log('🚀 WORX DESK session started:', newRunId);
  },

  setOriginalBrief: (text) => set({ originalBrief: text }),
  setDeliverableSpec: (text) => set({ deliverableSpec: text }),
  setSupportingMaterials: (text) => set({ supportingMaterials: text }),
  setChosenTemplateId: (id) => set({ chosenTemplateId: id }),
  setBrandVoiceId: (id) => set({ brandVoiceId: id }),
  setPersonaId: (id) => set({ personaId: id }),

  parseUploadedFile: async (file) => {
    set({
      isParsingFile: true,
      parseError: null,
      parseWarnings: [],
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(PARSE_BRIEF_FILE_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      // The route returns JSON for both success and failure paths, with a
      // sanitized `details` field on failure that's safe to show users.
      const json = (await response.json().catch(() => ({}))) as
        | {
            text: string;
            warnings: string[];
            fileType: string;
            characterCount: number;
            wordCount: number;
          }
        | { error: string; details?: string };

      if (!response.ok) {
        const errorBody = json as { error?: string; details?: string };
        const userMessage =
          errorBody.details ??
          errorBody.error ??
          'Could not parse the uploaded file. Please try a different file.';
        set({
          isParsingFile: false,
          parseError: userMessage,
          parseWarnings: [],
          // uploadedFileName intentionally unchanged on failure – there is
          // no successfully-uploaded file to advertise.
        });
        logger.warn('⚠️ WORX DESK file parse failed:', userMessage);
        return;
      }

      const successBody = json as {
        text: string;
        warnings: string[];
        fileType: string;
        characterCount: number;
        wordCount: number;
      };

      set({
        isParsingFile: false,
        parseError: null,
        parseWarnings: Array.isArray(successBody.warnings) ? successBody.warnings : [],
        originalBrief: successBody.text ?? '',
        uploadedFileName: file.name,
      });
      logger.log('✅ WORX DESK brief parsed:', {
        fileName: file.name,
        characterCount: successBody.characterCount,
        wordCount: successBody.wordCount,
        warningCount: successBody.warnings?.length ?? 0,
      });
    } catch (err) {
      // Network error, JSON parse error, or other unexpected failure. Show
      // a generic message; never leak the underlying exception to the user.
      const fallbackMessage =
        'Could not upload the file. Check your connection and try again.';
      set({
        isParsingFile: false,
        parseError: fallbackMessage,
        parseWarnings: [],
      });
      logger.error('❌ WORX DESK parseUploadedFile threw:', err);
    }
  },

  clearUploadedFile: () => {
    // Note: keeps `originalBrief` intact so the user does not lose any
    // edits they made to the parsed text after upload.
    set({
      uploadedFileName: null,
      parseError: null,
      parseWarnings: [],
    });
  },

  // ── Phase 5B: Strategic Review streaming ──────────────────────────────

  submitBrief: async () => {
    const state = get();

    // Guard: required fields. The submit button is disabled in this case
    // but we re-check defensively because the action is also exported
    // and could be called programmatically.
    if (
      state.chosenTemplateId.trim().length === 0 ||
      state.originalBrief.trim().length === 0 ||
      state.deliverableSpec.trim().length === 0
    ) {
      logger.warn('⚠️ WORX DESK submitBrief: required fields missing, ignoring.');
      return;
    }

    // Cancel any prior in-flight stream (rare, but possible if the user
    // re-clicks Submit before a previous stream finishes).
    cancelActiveReviewStream('submitBrief: starting new stream');

    // Reset every Phase 5B slice. We keep the input slice intact so the
    // stream uses whatever the user just typed.
    set({
      streamingRawText: '',
      strategicTake: '',
      strategicQuestions: [],
      isStreamingReview: true,
      reviewError: null,
      briefIsSolid: false,
      briefIsBroken: false,
      answers: [],
      bypassedReview: false,
      autoSkippedQuestionIds: [],
      isExtractingBrief: false,
      extractedFormData: null,
      generationError: null,
    });

    const requestPayload: StrategicReviewLLMRequest = {
      brief: state.originalBrief,
      deliverableSpec: state.deliverableSpec,
      supportingMaterials: state.supportingMaterials,
      chosenTemplateId: state.chosenTemplateId,
      brandVoiceId: state.brandVoiceId,
      personaId: state.personaId,
    };

    const controller = new AbortController();
    activeReviewAbortController = controller;

    let response: Response;
    try {
      response = await fetch(STRATEGIC_REVIEW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        logger.log('🛑 WORX DESK submitBrief: aborted before response.');
        if (activeReviewAbortController === controller) {
          activeReviewAbortController = null;
        }
        // Don't set reviewError on a user-initiated abort.
        set({ isStreamingReview: false });
        return;
      }
      logError(err, 'WORX DESK submitBrief (network)');
      activeReviewAbortController = null;
      set({
        isStreamingReview: false,
        reviewError:
          'Could not start Strategic Review. Check your connection and try again.',
      });
      return;
    }

    // Pre-stream JSON error path (auth / validation / feature flag).
    if (!response.ok) {
      const message = await readPreStreamError(response);
      activeReviewAbortController = null;
      set({
        isStreamingReview: false,
        reviewError: message,
      });
      logger.warn('⚠️ WORX DESK submitBrief: pre-stream error:', message);
      return;
    }

    // ── Drain SSE frames ────────────────────────────────────────────────
    let receivedDone = false;
    let sawErrorFrame = false;

    try {
      for await (const frame of iterateSseFrames(response)) {
        if (controller.signal.aborted) {
          logger.log('🛑 WORX DESK submitBrief: aborted mid-stream.');
          break;
        }

        if (frame.type === 'text') {
          // Append into a fresh string so Zustand's shallow equality
          // detects the change. Consumers that need a parsed view call
          // `parseStrategicReviewText(streamingRawText)` themselves.
          set((prev) => ({
            streamingRawText: prev.streamingRawText + frame.content,
          }));
          continue;
        }

        if (frame.type === 'error') {
          sawErrorFrame = true;
          set({
            isStreamingReview: false,
            reviewError: frame.message,
          });
          logger.warn('⚠️ WORX DESK Strategic Review error frame:', frame.message);
          // Don't break the loop – the server closes after the error
          // frame anyway, and the next read returns done.
          continue;
        }

        if (frame.type === 'done') {
          receivedDone = true;
          break;
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        logger.log('🛑 WORX DESK submitBrief: stream reader aborted.');
      } else {
        logError(err, 'WORX DESK submitBrief (stream)');
        set({
          isStreamingReview: false,
          reviewError:
            'Strategic Review stream failed. Please try again in a moment.',
        });
      }
      if (activeReviewAbortController === controller) {
        activeReviewAbortController = null;
      }
      return;
    }

    if (activeReviewAbortController === controller) {
      activeReviewAbortController = null;
    }

    // If we exited because we were aborted, just clear the streaming
    // flag and bail – the resetting code path already cleared the rest.
    if (controller.signal.aborted) {
      set({ isStreamingReview: false });
      return;
    }

    if (sawErrorFrame) {
      // `reviewError` and `isStreamingReview: false` were already set
      // when the error frame arrived. Nothing more to do.
      return;
    }

    if (!receivedDone) {
      // Stream closed without sending a `done` frame – treat as a
      // truncated response so the UI surfaces a retry affordance.
      set({
        isStreamingReview: false,
        reviewError:
          'Strategic Review ended unexpectedly. Please try again.',
      });
      return;
    }

    // Happy path: parse the accumulated text into the structured slices.
    const finalText = get().streamingRawText;
    const parsed = parseStrategicReviewText(finalText);

    set({
      isStreamingReview: false,
      strategicTake: parsed.strategicTake,
      strategicQuestions: parsed.questions,
      briefIsSolid: parsed.briefIsSolid,
      briefIsBroken: parsed.briefIsBroken,
    });

    logger.log('✅ WORX DESK Strategic Review complete:', {
      questionCount: parsed.questions.length,
      briefIsSolid: parsed.briefIsSolid,
      briefIsBroken: parsed.briefIsBroken,
      takeLength: parsed.strategicTake.length,
    });
  },

  answerQuestion: (questionId, answerText) => {
    set((prev) => {
      const next = upsertAnswer(prev.answers, {
        questionId,
        answer: answerText,
        wasSkipped: false,
      });
      return {
        answers: next,
        // Typing into a previously auto-skipped question removes it
        // from the auto-skip set so unbypass doesn't wipe the new value.
        autoSkippedQuestionIds: prev.autoSkippedQuestionIds.filter(
          (id) => id !== questionId,
        ),
      };
    });
  },

  skipQuestion: (questionId) => {
    set((prev) => ({
      answers: upsertAnswer(prev.answers, {
        questionId,
        answer: WORXDESK_SKIPPED_ANSWER_TEXT,
        wasSkipped: true,
      }),
      // A manual single-question skip is NOT a bypass auto-skip; remove
      // it from the auto-tracking set if it was there.
      autoSkippedQuestionIds: prev.autoSkippedQuestionIds.filter(
        (id) => id !== questionId,
      ),
    }));
  },

  bypassReview: () => {
    set((prev) => {
      // Track which question ids the bypass had to add an answer for
      // (i.e. the user hadn't already typed or skipped them). Only those
      // get cleaned up by `unbypassReview()`.
      const existingAnswerIds = new Set(prev.answers.map((a) => a.questionId));
      const newlyAutoSkipped: string[] = [];
      const nextAnswers: WorxDeskAnswer[] = [...prev.answers];

      for (const question of prev.strategicQuestions) {
        if (existingAnswerIds.has(question.id)) continue;
        nextAnswers.push({
          questionId: question.id,
          answer: WORXDESK_SKIPPED_ANSWER_TEXT,
          wasSkipped: true,
        });
        newlyAutoSkipped.push(question.id);
      }

      // Merge with any previously auto-skipped ids (idempotent re-bypass).
      const merged = Array.from(
        new Set([...prev.autoSkippedQuestionIds, ...newlyAutoSkipped]),
      );

      return {
        bypassedReview: true,
        answers: nextAnswers,
        autoSkippedQuestionIds: merged,
      };
    });
  },

  unbypassReview: () => {
    set((prev) => {
      const autoSet = new Set(prev.autoSkippedQuestionIds);
      const trimmed = prev.answers.filter((a) => !autoSet.has(a.questionId));
      return {
        bypassedReview: false,
        answers: trimmed,
        autoSkippedQuestionIds: [],
      };
    });
  },

  extractBrief: async () => {
    const state = get();

    if (state.strategicTake.trim().length === 0) {
      logger.warn(
        '⚠️ WORX DESK extractBrief: strategicTake is empty, refusing to call.',
      );
      return;
    }

    if (state.chosenTemplateId.trim().length === 0) {
      logger.warn('⚠️ WORX DESK extractBrief: chosenTemplateId missing.');
      return;
    }

    set({
      isExtractingBrief: true,
      extractedFormData: null,
      generationError: null,
    });

    try {
      const response = await fetch(EXTRACT_BRIEF_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: state.originalBrief,
          deliverableSpec: state.deliverableSpec,
          supportingMaterials: state.supportingMaterials,
          strategicTake: state.strategicTake,
          answers: state.answers,
          questions: state.strategicQuestions,
          targetTemplateId: state.chosenTemplateId,
        }),
      });

      const json = (await response.json().catch(() => ({}))) as
        | BriefExtractionLLMResponse
        | { error?: string; details?: string };

      if (!response.ok) {
        const errorBody = json as { error?: string; details?: string };
        const userMessage =
          errorBody.details ??
          errorBody.error ??
          'Brief extraction failed. Please try again.';
        set({
          isExtractingBrief: false,
          generationError: userMessage,
        });
        logger.warn('⚠️ WORX DESK extractBrief: server error:', userMessage);
        return;
      }

      const okBody = json as BriefExtractionLLMResponse;
      const formData =
        okBody && typeof okBody.formData === 'object' && okBody.formData !== null
          ? coerceFormDataValues(okBody.formData)
          : null;

      if (formData === null) {
        set({
          isExtractingBrief: false,
          generationError: 'Brief extraction returned an unexpected shape.',
        });
        logger.warn(
          '⚠️ WORX DESK extractBrief: response had no formData object',
          okBody,
        );
        return;
      }

      set({
        isExtractingBrief: false,
        extractedFormData: formData,
        generationError: null,
      });
      logger.log('✅ WORX DESK Brief Extraction complete:', {
        fieldCount: Object.keys(formData).length,
      });
    } catch (err) {
      logError(err, 'WORX DESK extractBrief (network)');
      set({
        isExtractingBrief: false,
        generationError:
          'Could not reach the extraction service. Check your connection and try again.',
      });
    }
  },

  generateCopy: async (editor, activeProject) => {
    const state = get();

    // ── Preconditions ────────────────────────────────────────────────────
    //
    // Every check produces a user-facing `generationError` so the
    // Generating view's failure UI surfaces the reason. None of these
    // should fire under normal flow (the Generate button in the review
    // view requires a brand voice / persona to already be selectable
    // against the active project) but the action can also be called via
    // the "Try again" affordance, where stale prerequisites are possible.

    if (state.extractedFormData === null) {
      set({
        generationError:
          'No extracted brief is available. Please run the Strategic Review first.',
      });
      logger.warn('⚠️ WORX DESK generateCopy: extractedFormData is null.');
      return;
    }

    if (activeProject === null) {
      set({
        generationError:
          'No project is currently active. Open a project before generating copy.',
      });
      logger.warn('⚠️ WORX DESK generateCopy: activeProject is null.');
      return;
    }

    if (editor === null) {
      set({
        generationError:
          'The editor is not ready yet. Please wait a moment and try again.',
      });
      logger.warn('⚠️ WORX DESK generateCopy: editor is null.');
      return;
    }

    if (
      !(WORXDESK_SUPPORTED_TEMPLATE_IDS as readonly string[]).includes(
        state.chosenTemplateId,
      )
    ) {
      set({
        generationError: `Template "${state.chosenTemplateId}" is not supported by WORX DESK in this release.`,
      });
      logger.warn(
        '⚠️ WORX DESK generateCopy: chosenTemplateId not in supported list:',
        state.chosenTemplateId,
      );
      return;
    }

    const template = getTemplateById(state.chosenTemplateId);
    if (!template) {
      set({
        generationError: `Template "${state.chosenTemplateId}" could not be found.`,
      });
      logger.error(
        '❌ WORX DESK generateCopy: getTemplateById returned undefined for',
        state.chosenTemplateId,
      );
      return;
    }

    // ── Resolve brand voice + persona from the active project ───────────
    //
    // Brand voice resolution prefers `brandVoices` (the multi-voice array)
    // and falls back to `brandVoice` (the legacy singular field) so a
    // project that has only the singular value still works. `null` is the
    // canonical "none selected" value passed to the API.

    const brandVoiceResolved =
      state.brandVoiceId === null
        ? null
        : (activeProject.brandVoices ?? []).find(
            (bv) => bv.id === state.brandVoiceId,
          ) ??
          (activeProject.brandVoice?.id === state.brandVoiceId
            ? activeProject.brandVoice
            : null);

    let personaResolved: Persona | null = null;
    if (state.personaId !== null) {
      try {
        const projectPersonas = await getProjectPersonas(activeProject.id);
        personaResolved =
          projectPersonas.find((p) => p.id === state.personaId) ?? null;
      } catch (personaErr) {
        // A persona load failure is not fatal: we continue without one.
        // The selected persona is informational and the route accepts a
        // missing persona gracefully.
        logError(personaErr, 'WORX DESK generateCopy (persona load)');
      }
    }

    set({
      isGenerating: true,
      generationError: null,
      generatedCopyHtml: null,
    });

    // ── Step 1: Call /api/generate-template ──────────────────────────────

    const requestBody: TemplateGenerationRequest = {
      templateId: state.chosenTemplateId,
      formData: state.extractedFormData,
      // Mirror TemplateFormSlideOut: only set `applyBrandVoice: true` when
      // we have a resolved voice to send. Without a voice the route must
      // ignore the brand-voice prompt segment regardless of this flag, but
      // setting it true with no voice attached would be misleading.
      applyBrandVoice: brandVoiceResolved !== null,
      brandVoice: brandVoiceResolved ?? undefined,
      persona: personaResolved ?? undefined,
    };

    let formattedContent: string;
    try {
      const response = await fetch(GENERATE_TEMPLATE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        const message =
          errorBody.details ??
          errorBody.error ??
          `Generation failed (HTTP ${response.status}). Please try again.`;
        throw new Error(message);
      }

      const data = (await response.json()) as TemplateGenerationResponse;
      const generatedCopy = data?.generatedCopy ?? '';
      if (generatedCopy.trim().length === 0) {
        throw new Error('Generation returned empty copy. Please try again.');
      }

      formattedContent = formatGeneratedContent(generatedCopy);
      logger.log('✅ WORX DESK generation API succeeded:', {
        templateId: state.chosenTemplateId,
        rawLength: generatedCopy.length,
        formattedLength: formattedContent.length,
      });
    } catch (err) {
      logError(err, 'WORX DESK generateCopy (API)');
      set({
        isGenerating: false,
        generationError: formatErrorForUser(err, 'Generation'),
      });
      return;
    }

    // ── Step 2: Build WorxDeskMetadata snapshot ──────────────────────────

    const worxdeskMetadata: WorxDeskMetadata = {
      originalBrief: state.originalBrief,
      deliverableSpec: state.deliverableSpec,
      supportingMaterials: state.supportingMaterials,
      chosenTemplateId: state.chosenTemplateId,
      brandVoiceId: state.brandVoiceId,
      personaId: state.personaId,
      strategicTake: state.strategicTake,
      questionsAndAnswers: buildQuestionsAndAnswersForMetadata(
        state.strategicQuestions,
        state.answers,
      ),
      extractedFormData: state.extractedFormData,
      // The session run id is minted on `startSession`; it is non-null any
      // time a session has been opened. We assert + fall back to an empty
      // string so the metadata write does not throw on an impossible-but-
      // typed-possible null.
      worxdeskRunId: state.worxdeskRunId ?? '',
      bypassedReview: state.bypassedReview,
      createdAt: new Date().toISOString(),
    };

    // ── Step 3: Persist document + activate it in the editor ────────────
    //
    // From here on, any failure means the LLM already produced HTML that
    // the user paid for. Stash it in `generatedCopyHtml` so a subsequent
    // refresh / "Try again" cycle can recover it without re-paying for
    // generation, and surface a distinct error message that says so.

    try {
      const documentTitle = buildWorxDeskDocumentTitle(template.name);
      const newDoc = await createDocument(
        activeProject.id,
        documentTitle,
        formattedContent,
        worxdeskMetadata,
      );
      logger.log('📄 WORX DESK document created:', {
        id: newDoc.id,
        title: newDoc.title,
      });

      // Activate the new document so EditorArea swaps to it on the next
      // render. Mirror TemplateFormSlideOut: refresh sidebar + document
      // list so the just-created doc appears immediately.
      const workspaceActions = useWorkspaceStore.getState();
      workspaceActions.setActiveDocumentId(newDoc.id);
      await workspaceActions.refreshAll();

      // Brief delay to let EditorArea react to the new activeDocumentId
      // before we push content into the editor instance directly.
      await new Promise<void>((resolve) =>
        setTimeout(resolve, EDITOR_ACTIVATION_SETTLE_MS),
      );

      editor.commands.setContent(formattedContent);
    } catch (persistErr) {
      logError(persistErr, 'WORX DESK generateCopy (persistence)');
      set({
        isGenerating: false,
        generatedCopyHtml: formattedContent,
        generationError:
          'Generation succeeded but document creation failed. The copy is still available — please try again or contact support.',
      });
      return;
    }

    // ── Step 4: Notify, reset, close ─────────────────────────────────────

    toast.success('Copy generated. Document created.', {
      id: GENERATION_SUCCESS_TOAST_ID,
    });

    // resetSession() also clears `generatedCopyHtml` via INITIAL_SESSION_SLICES.
    get().resetSession();
    useSlideOutStore.getState().closeSlideOut(WORXDESK_PANEL_ID_FOR_CLOSE);

    // `isGenerating` is included in INITIAL_SESSION_SLICES (as `false`),
    // so resetSession() above already cleared it. The explicit set below
    // is a defensive belt-and-braces in case INITIAL_SESSION_SLICES ever
    // diverges from the field set here.
    set({ isGenerating: false });
  },

  clearGeneratedCopy: () => {
    set({ generatedCopyHtml: null });
  },

  resetReview: () => {
    cancelActiveReviewStream('resetReview');
    set({ ...INITIAL_REVIEW_SLICES });
    logger.log('🔄 WORX DESK review reset (input preserved).');
  },

  backToReview: () => {
    set({
      extractedFormData: null,
      generationError: null,
    });
    logger.log('↩️ WORX DESK back to review (extraction cleared).');
  },

  resetSession: () => {
    cancelActiveReviewStream('resetSession');
    const newRunId = generateRunId();
    set({ worxdeskRunId: newRunId, ...INITIAL_SESSION_SLICES });
    logger.log('🔄 WORX DESK session reset; new run id:', newRunId);
  },
}));

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Insert or replace an answer for a given question id, keeping the
 * surrounding ordering of the answers array stable. Pure helper used
 * by `answerQuestion` and `skipQuestion` so they share semantics.
 */
function upsertAnswer(
  answers: WorxDeskAnswer[],
  next: WorxDeskAnswer,
): WorxDeskAnswer[] {
  const existingIndex = answers.findIndex((a) => a.questionId === next.questionId);
  if (existingIndex === -1) {
    return [...answers, next];
  }
  const replaced = answers.slice();
  replaced[existingIndex] = next;
  return replaced;
}

/**
 * Coerce every value in the extraction response into a string so the
 * downstream UI / metadata layer can treat it uniformly. The Phase 3
 * extract-brief route returns `Record<string, unknown>` (the route's
 * `as Record<string, string>` cast is optimistic), so a tolerant
 * client-side coercion is appropriate.
 */
function coerceFormDataValues(
  raw: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (value === null || value === undefined) {
      result[key] = '';
    } else {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Build the WORX DESK document title from the human-readable template name.
 * Mirrors the format used by `TemplateFormSlideOut.generateDocumentTitle`
 * (e.g. `"Sales Email - May 3, 2026 1:41pm"`) so documents created through
 * either flow share a recognizable shape in the sidebar. Pure helper —
 * deterministic given a stable `Date` argument.
 */
function buildWorxDeskDocumentTitle(
  templateName: string,
  now: Date = new Date(),
): string {
  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = now
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase()
    .replace(' ', '');
  return `${templateName} - ${formattedDate} ${formattedTime}`;
}

/**
 * Pair every Strategic Review question with its corresponding answer (or
 * a "skipped" sentinel when the user never engaged with it) into the
 * flattened shape persisted on `WorxDeskMetadata.questionsAndAnswers`.
 *
 * Questions are the source of iteration so the resulting array preserves
 * the order the user saw the questions in. An answer entry without a
 * matching question (which should never happen given the UI contract) is
 * silently dropped — replay tooling reads this column for human display,
 * not for state reconstruction, so an orphaned answer would have nothing
 * to attach to.
 */
function buildQuestionsAndAnswersForMetadata(
  questions: WorxDeskQuestion[],
  answers: WorxDeskAnswer[],
): WorxDeskMetadata['questionsAndAnswers'] {
  return questions.map((question) => {
    const matched = answers.find((a) => a.questionId === question.id);
    if (matched) {
      return {
        question: question.text,
        answer: matched.answer,
        wasSkipped: matched.wasSkipped,
      };
    }
    return {
      question: question.text,
      answer: WORXDESK_SKIPPED_ANSWER_TEXT,
      wasSkipped: true,
    };
  });
}

// ============================================================================
// Selector hooks
// ============================================================================

/**
 * Read the input field values for the WORX DESK form. Wrapped in
 * `useShallow` so consumers re-render only when one of these specific
 * fields changes, not on unrelated slices like `strategicTake`.
 */
export const useWorxDeskInputs = () =>
  useWorxDeskStore(
    useShallow((state) => ({
      originalBrief: state.originalBrief,
      deliverableSpec: state.deliverableSpec,
      supportingMaterials: state.supportingMaterials,
      chosenTemplateId: state.chosenTemplateId,
      brandVoiceId: state.brandVoiceId,
      personaId: state.personaId,
    })),
  );

/**
 * Read the file-parse slice. Components that render the upload zone and
 * its loading / error / chip states subscribe to this hook.
 */
export const useWorxDeskFileState = () =>
  useWorxDeskStore(
    useShallow((state) => ({
      isParsingFile: state.isParsingFile,
      parseError: state.parseError,
      parseWarnings: state.parseWarnings,
      uploadedFileName: state.uploadedFileName,
    })),
  );

/**
 * Read action functions with stable references. Pass the returned object
 * as a dependency to `useEffect` / `useCallback` without re-invocation
 * loops – `useShallow` ensures the same identity is returned across
 * renders when nothing in the slice changed.
 */
export const useWorxDeskActions = () =>
  useWorxDeskStore(
    useShallow((state) => ({
      startSession: state.startSession,
      setOriginalBrief: state.setOriginalBrief,
      setDeliverableSpec: state.setDeliverableSpec,
      setSupportingMaterials: state.setSupportingMaterials,
      setChosenTemplateId: state.setChosenTemplateId,
      setBrandVoiceId: state.setBrandVoiceId,
      setPersonaId: state.setPersonaId,
      parseUploadedFile: state.parseUploadedFile,
      clearUploadedFile: state.clearUploadedFile,
      submitBrief: state.submitBrief,
      answerQuestion: state.answerQuestion,
      skipQuestion: state.skipQuestion,
      bypassReview: state.bypassReview,
      unbypassReview: state.unbypassReview,
      extractBrief: state.extractBrief,
      generateCopy: state.generateCopy,
      clearGeneratedCopy: state.clearGeneratedCopy,
      resetReview: state.resetReview,
      backToReview: state.backToReview,
      resetSession: state.resetSession,
    })),
  );

/**
 * Read just the session run id. Useful for tracking / analytics call sites
 * that should not re-render on input changes.
 */
export const useWorxDeskSessionId = () =>
  useWorxDeskStore((state) => state.worxdeskRunId);

/**
 * Read the Strategic Review slice. Subscribed by the review view to
 * render the streamed Strategic Take, the parsed questions, and any
 * stream-level error. Includes `streamingRawText` so the view can
 * progressively display content while the model is still writing.
 */
export const useWorxDeskReview = () =>
  useWorxDeskStore(
    useShallow((state) => ({
      strategicTake: state.strategicTake,
      strategicQuestions: state.strategicQuestions,
      isStreamingReview: state.isStreamingReview,
      reviewError: state.reviewError,
      briefIsSolid: state.briefIsSolid,
      briefIsBroken: state.briefIsBroken,
      streamingRawText: state.streamingRawText,
    })),
  );

/**
 * Read the Q&A slice. Components that render answer textareas and the
 * skip-bypass affordance subscribe to this hook.
 */
export const useWorxDeskAnswers = () =>
  useWorxDeskStore(
    useShallow((state) => ({
      answers: state.answers,
      bypassedReview: state.bypassedReview,
    })),
  );

/**
 * Read the Brief Extraction slice. Subscribed by the Generating view to
 * render the loading state, the success result, and any error.
 */
export const useWorxDeskExtraction = () =>
  useWorxDeskStore(
    useShallow((state) => ({
      isExtractingBrief: state.isExtractingBrief,
      extractedFormData: state.extractedFormData,
      generationError: state.generationError,
    })),
  );

/**
 * Read the final-generation slice (Phase 6). Subscribed by the Generating
 * view to switch between the "Writing your copy…" loader, the failure UI,
 * and the safety-net recovery state when document persistence fails after
 * a successful generation.
 */
export const useWorxDeskGeneration = () =>
  useWorxDeskStore(
    useShallow((state) => ({
      isGenerating: state.isGenerating,
      generationError: state.generationError,
      generatedCopyHtml: state.generatedCopyHtml,
    })),
  );

/**
 * Derive the current panel phase from the underlying state. The phase
 * drives the panel body's view selection and the StickyActionBar's
 * button layout.
 *
 * Order of checks matters – earlier branches win:
 *   1. `generating` while Phase 6 copy generation is in flight, OR
 *      whenever extraction has completed and we still have an
 *      `extractedFormData` snapshot in hand. The auto-trigger in the
 *      Generating view fires `generateCopy` synchronously on that
 *      transition, so the view should never display the raw extraction
 *      result; reporting `generating` here keeps the panel header /
 *      footer aligned with what the body is doing. The single exception
 *      is when the safety-net `generatedCopyHtml` is set or there is a
 *      `generationError`: those are the recovery surfaces the user
 *      explicitly needs to see, so we still report `generating` (the
 *      view branches internally on those flags).
 *   2. `extracting` while Brief Extraction is in flight.
 *   3. `extracted` once a result is in hand. Retained for legacy
 *      compatibility / debugging — under the Phase 6 auto-trigger this
 *      branch is normally short-circuited by the `generating` check
 *      above.
 *   4. `streaming` while the SSE stream is open.
 *   5. `review` once we have any Strategic Take text to show OR a
 *      `reviewError` to surface. Including the error here is what keeps
 *      pre-stream HTTP failures (e.g. 503 returned before the SSE
 *      channel opens) from silently dropping the user back into the
 *      input form with no visible error.
 *   6. `input` otherwise.
 */
export const useWorxDeskFlow = (): WorxDeskFlowPhase =>
  useWorxDeskStore((state) => {
    if (state.isGenerating) return 'generating';
    if (
      state.extractedFormData !== null ||
      state.generatedCopyHtml !== null ||
      (state.generationError !== null && !state.isExtractingBrief)
    ) {
      return 'generating';
    }
    if (state.isExtractingBrief) return 'extracting';
    if (state.isStreamingReview) return 'streaming';
    if (state.strategicTake.length > 0 || state.reviewError !== null) {
      return 'review';
    }
    return 'input';
  });
