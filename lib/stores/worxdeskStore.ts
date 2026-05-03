/**
 * @file lib/stores/worxdeskStore.ts
 * @description Ephemeral Zustand store for the WORX DESK on-ramp session.
 *
 * Holds the in-memory state of a single WORX DESK session – from brief intake
 * through Strategic Review (Phase 5B), Q&A (Phase 5B), and copy generation
 * (Phase 6). The store is intentionally NOT persisted: a session is a
 * working-memory artifact that gets distilled into the document's
 * `worxdesk_metadata` jsonb column at save time, and stale half-finished
 * sessions surviving a page reload would be confusing rather than useful.
 *
 * Architectural mirror of `lib/stores/workspaceStore.ts`:
 *   - One source-of-truth state object
 *   - Granular `setX` actions for inputs
 *   - Higher-level orchestrators (`startSession`, `parseUploadedFile`,
 *     `resetSession`) that touch multiple slices at once
 *   - `useShallow` selector hooks to keep consumers from re-rendering on
 *     unrelated slice changes
 *
 * Phase 5A populates the input slice (this file) and the file-parse slice.
 * Phase 5B will populate the strategic-review and Q&A slices. Phase 6 will
 * populate the generation slice. The shape is declared up front so later
 * phases can extend without restructuring the store.
 */

'use client';

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type {
  WorxDeskAnswer,
  WorxDeskQuestion,
} from '@/lib/types/worxdesk';
import { logger } from '@/lib/utils/logger';

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

  // ── Strategic Review state (placeholder for 5A; populated in 5B) ─────────

  /** Strategic-take paragraph from Call 1. Empty string in Phase 5A. */
  strategicTake: string;

  /** Clarifying questions from Call 1. Empty array in Phase 5A. */
  strategicQuestions: WorxDeskQuestion[];

  /** True while the Strategic Review SSE stream is open. False in 5A. */
  isStreamingReview: boolean;

  /** User-facing Strategic Review error, or null when none. */
  reviewError: string | null;

  // ── Q&A state (placeholder for 5A; populated in 5B) ──────────────────────

  /** User answers to clarifying questions. Empty array in Phase 5A. */
  answers: WorxDeskAnswer[];

  /** True if the user typed "skip" to bypass the Strategic Review. */
  bypassedReview: boolean;

  // ── Generation state (placeholder for 5A and 5B; populated in Phase 6) ───

  /** True while Brief Extraction (Call 2) is in flight. */
  isExtractingBrief: boolean;

  /** True while final copy generation (template generator) is in flight. */
  isGenerating: boolean;

  /** User-facing generation error, or null when none. */
  generationError: string | null;

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
   * Clear every slice and mint a new run id. Use from "Cancel" buttons or
   * after a confirmed-and-completed session that should not bleed into the
   * next opening of the panel.
   */
  resetSession: () => void;
}

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
  strategicTake: '',
  strategicQuestions: [] as WorxDeskQuestion[],
  isStreamingReview: false,
  reviewError: null,
  answers: [] as WorxDeskAnswer[],
  bypassedReview: false,
  isExtractingBrief: false,
  isGenerating: false,
  generationError: null,
} as const;

// ============================================================================
// Store factory
// ============================================================================

/**
 * Ephemeral WORX DESK session store. NOT wrapped in `persist` middleware:
 * sessions live in working memory only; finished sessions are distilled into
 * the document's `worxdesk_metadata` jsonb column.
 */
export const useWorxDeskStore = create<WorxDeskState>()((set) => ({
  worxdeskRunId: null,
  ...INITIAL_SESSION_SLICES,

  startSession: () => {
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

  resetSession: () => {
    const newRunId = generateRunId();
    set({ worxdeskRunId: newRunId, ...INITIAL_SESSION_SLICES });
    logger.log('🔄 WORX DESK session reset; new run id:', newRunId);
  },
}));

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
      resetSession: state.resetSession,
    })),
  );

/**
 * Read just the session run id. Useful for tracking / analytics call sites
 * that should not re-render on input changes.
 */
export const useWorxDeskSessionId = () =>
  useWorxDeskStore((state) => state.worxdeskRunId);
