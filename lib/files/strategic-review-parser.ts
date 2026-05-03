/**
 * @file lib/files/strategic-review-parser.ts
 * @description Parse the WORX DESK Strategic Review LLM output into a
 *   structured `WorxDeskStrategicReview` record.
 *
 * The Strategic Review system prompt
 * (`lib/prompts/worxdesk-strategic-review.ts`) instructs Claude to emit
 * exactly two markdown sections:
 *
 *   ## Strategic Take
 *   [one paragraph, 3-5 sentences]
 *
 *   ## Decisions Needed
 *   [either a numbered list of 0-4 questions, OR the single sentinel
 *    sentence "No decisions needed - ready to generate when you are."]
 *
 * The prompt's solid-brief sentinel is hard-coded in the prompt body with
 * an em-dash (U+2014) between "needed" and "ready". The model usually
 * mirrors that exactly, but we accept any of em-dash, en-dash, or hyphen
 * to be tolerant of minor model deviation.
 *
 * The broken-brief lead-in is "This brief needs more before we can write
 * to it." — it appears as the first sentence of the Strategic Take
 * itself, NOT in the Decisions Needed section.
 *
 * This module is browser-safe (no Node imports) and pure (same input ⇒
 * same output, no I/O). It is consumed both by the WORX DESK store on
 * stream completion and directly by the review view during streaming so
 * the user sees text appear progressively.
 */

import type {
  WorxDeskQuestion,
  WorxDeskStrategicReview,
} from '@/lib/types/worxdesk';

// ============================================================================
// Constants
// ============================================================================

/**
 * Marker that delimits the Strategic Take from the questions block. The
 * exact casing is what the prompt instructs Claude to emit. We match
 * case-insensitively to tolerate minor model deviation.
 */
const DECISIONS_HEADER_REGEX = /##\s*Decisions Needed\b/i;

/**
 * Marker for the Strategic Take heading. Stripped from the parsed take
 * so callers can render the body without the redundant heading.
 */
const STRATEGIC_TAKE_HEADER_REGEX = /^##\s*Strategic Take\s*\n+/i;

/**
 * Detects the "brief is solid" sentinel sentence inside the Decisions
 * Needed block. The prompt body uses an em-dash; tolerant of en-dash or
 * hyphen too. Surrounding quotes (the prompt wraps the sentence in
 * double quotes when documenting it) are optional in the model output.
 */
const SOLID_SENTINEL_REGEX =
  /no decisions needed\s*[\u2014\u2013-]\s*ready to generate when you are\.?/i;

/**
 * Detects the "brief is broken" lead-in. This appears at the START of
 * the Strategic Take section (not Decisions Needed). The system prompt
 * shows it surrounded by markdown bold (`**...**`) which the model may
 * or may not include — we strip the bold markers before testing.
 */
const BROKEN_LEAD_REGEX = /^this brief needs more before we can write to it\./i;

/**
 * Matches a numbered list item line: `1. text`, `12. text`, etc. The
 * captured group is the question text (without the leading number). We
 * accept either Markdown-style hyphens or en-dashes inside the captured
 * text — they don't affect matching.
 */
const NUMBERED_ITEM_REGEX = /^\s*(\d+)\.\s+(.+\S)\s*$/;

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a Strategic Review markdown string into a structured record.
 *
 * Behavior contract:
 * - The raw input may be a complete review OR a partial in-progress
 *   stream. Partial input always returns a non-empty `strategicTake`
 *   (the bytes received so far) plus an empty `questions` array; the
 *   parse promotes to the structured shape only when the
 *   `## Decisions Needed` marker has appeared.
 * - When the marker IS present and the Decisions Needed block matches
 *   the solid sentinel, returns `briefIsSolid: true, questions: []`.
 * - When the marker IS present and the Strategic Take leads with the
 *   broken-brief lead-in, returns `briefIsBroken: true` plus whatever
 *   questions were parsed (the prompt instructs the model to surface
 *   the most critical gaps as numbered questions in this case).
 * - When the marker IS present and neither sentinel applies, parses
 *   numbered questions out of the Decisions Needed block.
 * - When the structure is missing or malformed (no marker, garbled
 *   output), gracefully degrades: returns the full input as
 *   `strategicTake`, `questions: []`, both flags false. The caller is
 *   expected to surface a small "Could not detect questions" hint in
 *   the UI rather than blocking the user.
 *
 * Never throws. Always returns a `WorxDeskStrategicReview`.
 *
 * @param rawText - The raw streamed (or completed) Strategic Review text.
 */
export function parseStrategicReviewText(rawText: string): WorxDeskStrategicReview {
  // ── Defensive normalization ────────────────────────────────────────────
  // Trim trailing whitespace only — leading whitespace before the
  // "## Strategic Take" header is harmless to remove.
  const text = (rawText ?? '').trim();

  if (text.length === 0) {
    return {
      strategicTake: '',
      questions: [],
      briefIsSolid: false,
      briefIsBroken: false,
    };
  }

  // ── Locate the Decisions Needed marker ────────────────────────────────
  const markerMatch = DECISIONS_HEADER_REGEX.exec(text);

  if (!markerMatch) {
    // Stream still in progress (or model omitted the section). Show
    // everything we have as the Strategic Take, no questions yet.
    return {
      strategicTake: stripStrategicTakeHeader(text),
      questions: [],
      briefIsSolid: false,
      briefIsBroken: false,
    };
  }

  const markerStart = markerMatch.index;
  const markerEnd = markerStart + markerMatch[0].length;

  const beforeMarker = text.slice(0, markerStart).trim();
  const afterMarker = text.slice(markerEnd).trim();

  const strategicTake = stripStrategicTakeHeader(beforeMarker);

  // ── Solid-brief sentinel ──────────────────────────────────────────────
  if (SOLID_SENTINEL_REGEX.test(afterMarker)) {
    return {
      strategicTake,
      questions: [],
      briefIsSolid: true,
      briefIsBroken: false,
    };
  }

  // ── Broken-brief lead-in detection ────────────────────────────────────
  // The lead-in lives in the Strategic Take, not Decisions Needed. Strip
  // any wrapping bold markers before the regex test so the model adding
  // `**...**` doesn't defeat detection.
  const takeWithoutBold = strategicTake.replace(/\*\*/g, '').trim();
  const briefIsBroken = BROKEN_LEAD_REGEX.test(takeWithoutBold);

  // ── Parse numbered questions ──────────────────────────────────────────
  const questions = parseNumberedQuestions(afterMarker);

  return {
    strategicTake,
    questions,
    briefIsSolid: false,
    briefIsBroken,
  };
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Strip the leading `## Strategic Take` header from a Strategic Take
 * block. Idempotent — when the header is not present, returns the input
 * unchanged.
 */
function stripStrategicTakeHeader(input: string): string {
  return input.replace(STRATEGIC_TAKE_HEADER_REGEX, '').trim();
}

/**
 * Parse a markdown block containing numbered questions (`1. ...`,
 * `2. ...`, etc.) into `WorxDeskQuestion` objects. Lines that don't
 * match the numbered pattern are ignored — the model occasionally adds
 * a trailing prose line which we don't want as a phantom question.
 *
 * Question ids are deterministic (`q-1`, `q-2`, ...) so re-parsing the
 * same text produces the same ids — important because the store uses
 * the id to pair answers with questions across multiple parser calls
 * during streaming.
 */
function parseNumberedQuestions(block: string): WorxDeskQuestion[] {
  const questions: WorxDeskQuestion[] = [];

  for (const rawLine of block.split('\n')) {
    const match = NUMBERED_ITEM_REGEX.exec(rawLine);
    if (!match) continue;

    const text = match[2].trim();
    if (text.length === 0) continue;

    questions.push({
      id: `q-${questions.length + 1}`,
      text,
    });
  }

  return questions;
}
