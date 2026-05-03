/**
 * @file app/api/worxdesk/extract-brief/route.ts
 * @description WORX DESK Call 2 — Brief Extraction (non-streaming JSON, with retry).
 *
 * Reads the original brief plus the Strategic Take and the user's Q&A from
 * Call 1, then asks Claude Sonnet 4 to emit a JSON formData object whose
 * keys exactly match the chosen template's field schema. The response is
 * parsed server-side and returned as { formData: { ... } }.
 *
 * Retry contract: if the model's first response cannot be parsed as a JSON
 * object, we retry exactly once with a stricter prepended instruction. If
 * the second attempt also fails, we return 502. Each LLM call is logged
 * separately to api_usage_logs so cost tracking captures both attempts.
 *
 * Defensive JSON cleanup runs on both attempts (trim, strip code fences,
 * slice to the outermost { ... }) — Sonnet sometimes adds a fence even
 * when the prompt forbids it.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  WORXDESK_BRIEF_EXTRACTION_PROMPT,
  buildBriefExtractionPrompt,
} from '@/lib/prompts/worxdesk-brief-extraction';
import {
  buildTemplateSchemaBlock,
  isWorxDeskSupportedTemplate,
} from '@/lib/templates/worxdesk-template-schemas';
import type {
  BriefExtractionLLMRequest,
  BriefExtractionLLMResponse,
  WorxDeskAnswer,
  WorxDeskQuestion,
} from '@/lib/types/worxdesk';
import {
  WORXDESK_MODEL,
  WORXDESK_USAGE_FEATURES,
  fireAndForgetUsageLog,
  getAnthropicClient,
  requireWorxDeskPreflight,
  worxdeskFeatureGuard,
  type WorxDeskErrorBody,
} from '@/lib/api/worxdesk-helpers';
import { logger } from '@/lib/utils/logger';
import { logError } from '@/lib/utils/error-handling';

// ============================================================================
// Configuration constants
// ============================================================================

/** formData JSON is small (6–10 fields max per supported template). */
const BRIEF_EXTRACTION_MAX_TOKENS = 2000;

/** Per-attempt timeout (each retry attempt resets this). */
const BRIEF_EXTRACTION_TIMEOUT_MS = 45_000;

/**
 * Instruction prepended to the user message on the second attempt when the
 * first attempt could not be parsed. Worded to be maximally directive.
 */
const RETRY_INSTRUCTION =
  'Your previous response could not be parsed as JSON. Output ONLY a single valid JSON object matching the schema. No preamble. No code fences. No explanation. Begin your response with { and end with }.';

// ============================================================================
// Request types
// ============================================================================

/**
 * Wire shape for this route's request body. Extends BriefExtractionLLMRequest
 * with the questions array required by buildBriefExtractionPrompt(). The
 * questions originate from the Strategic Review (Call 1) and live in the
 * client's session state — we accept them here so the client can be the
 * source of truth for the Q+A pairing.
 */
interface BriefExtractionRouteRequest extends BriefExtractionLLMRequest {
  questions: WorxDeskQuestion[];
}

interface ValidationOk {
  ok: true;
  request: BriefExtractionRouteRequest;
}

interface ValidationFail {
  ok: false;
  response: NextResponse<WorxDeskErrorBody>;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate the request body. Returns the validated request on success or a
 * 400 NextResponse on failure.
 *
 * Rules (from the Phase 3 spec):
 * - brief, deliverableSpec, strategicTake, targetTemplateId: non-empty strings.
 * - supportingMaterials: string, may be empty.
 * - answers, questions: arrays, may be empty.
 * - targetTemplateId: must be a WORX DESK v1 supported template.
 * - Every answer.questionId must reference a question in the questions array.
 *   (Skipped only when both arrays are empty — otherwise we cannot resolve
 *   question text and the data is incoherent.)
 */
function validateRequest(rawBody: unknown): ValidationOk | ValidationFail {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return badRequest('Request body must be a JSON object.');
  }

  const body = rawBody as Partial<BriefExtractionRouteRequest>;

  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  const deliverableSpec =
    typeof body.deliverableSpec === 'string' ? body.deliverableSpec.trim() : '';
  const supportingMaterials =
    typeof body.supportingMaterials === 'string' ? body.supportingMaterials : '';
  const strategicTake =
    typeof body.strategicTake === 'string' ? body.strategicTake.trim() : '';
  const targetTemplateId =
    typeof body.targetTemplateId === 'string' ? body.targetTemplateId.trim() : '';

  if (brief.length === 0) {
    return badRequest('Field "brief" is required and must be a non-empty string.');
  }
  if (deliverableSpec.length === 0) {
    return badRequest('Field "deliverableSpec" is required and must be a non-empty string.');
  }
  if (strategicTake.length === 0) {
    return badRequest('Field "strategicTake" is required and must be a non-empty string.');
  }
  if (targetTemplateId.length === 0) {
    return badRequest('Field "targetTemplateId" is required and must be a non-empty string.');
  }
  if (!isWorxDeskSupportedTemplate(targetTemplateId)) {
    return badRequest(`Template '${targetTemplateId}' is not supported by WORX DESK in v1.`);
  }

  if (!Array.isArray(body.answers)) {
    return badRequest('Field "answers" is required and must be an array (may be empty).');
  }
  if (!Array.isArray(body.questions)) {
    return badRequest('Field "questions" is required and must be an array (may be empty).');
  }

  const answers = body.answers as WorxDeskAnswer[];
  const questions = body.questions as WorxDeskQuestion[];

  for (const [index, q] of questions.entries()) {
    if (!q || typeof q !== 'object' || typeof q.id !== 'string' || typeof q.text !== 'string') {
      return badRequest(
        `Field "questions[${index}]" must have string "id" and string "text" properties.`,
      );
    }
  }

  for (const [index, a] of answers.entries()) {
    if (
      !a ||
      typeof a !== 'object' ||
      typeof a.questionId !== 'string' ||
      typeof a.answer !== 'string' ||
      typeof a.wasSkipped !== 'boolean'
    ) {
      return badRequest(
        `Field "answers[${index}]" must have string "questionId", string "answer", and boolean "wasSkipped" properties.`,
      );
    }
  }

  // Cross-reference: every answer.questionId must exist in questions[].
  const questionIds = new Set(questions.map((q) => q.id));
  for (const [index, a] of answers.entries()) {
    if (!questionIds.has(a.questionId)) {
      return badRequest(
        `answers[${index}].questionId "${a.questionId}" does not match any id in the questions array.`,
      );
    }
  }

  return {
    ok: true,
    request: {
      brief,
      deliverableSpec,
      supportingMaterials,
      strategicTake,
      targetTemplateId,
      answers,
      questions,
    },
  };
}

function badRequest(details: string): ValidationFail {
  return {
    ok: false,
    response: NextResponse.json<WorxDeskErrorBody>(
      { error: 'Bad request', details },
      { status: 400 },
    ),
  };
}

// ============================================================================
// JSON cleanup + parsing
// ============================================================================

/**
 * Strip the wrapping noise that Sonnet sometimes adds around JSON output:
 *
 *   1. Trim leading and trailing whitespace.
 *   2. If the text starts with ```json or ``` and ends with ```, strip the
 *      fences. We tolerate either three-backtick variant.
 *   3. Slice from the first '{' to the last '}' inclusive, in case the model
 *      added stray prose before or after the object.
 *
 * Returns the cleaned string, or the original input if no '{' / '}' pair
 * exists (let JSON.parse fail naturally so the caller can decide to retry).
 */
function cleanupJsonResponse(raw: string): string {
  let cleaned = raw.trim();

  // Strip code fences. We accept ```json … ``` or ``` … ```.
  // The ^/$ anchors only matter after trim().
  const fencedMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch) {
    cleaned = fencedMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return cleaned;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

/** Type guard: a non-null, non-array plain object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Run cleanup → JSON.parse → object-shape check. Returns the parsed object
 * or null. Never throws.
 */
function tryParseFormData(raw: string): Record<string, unknown> | null {
  const cleaned = cleanupJsonResponse(raw);
  if (cleaned.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) {
    return null;
  }

  return parsed;
}

// ============================================================================
// LLM call (single attempt) with timeout and usage logging
// ============================================================================

/**
 * Result of a single attempt at the Brief Extraction call. Encapsulates the
 * raw text, the parsed object (if cleanup succeeded), and the token counts
 * we need for usage logging.
 */
interface ExtractionAttemptResult {
  rawText: string;
  parsed: Record<string, unknown> | null;
  inputTokens: number;
  outputTokens: number;
}

/**
 * One LLM call. Times out at BRIEF_EXTRACTION_TIMEOUT_MS via Promise.race
 * (matches the pattern used by /api/generate-template). Always logs usage
 * to api_usage_logs on success (even if the parse fails — we still spent
 * the tokens and need the cost row).
 */
async function runExtractionAttempt(params: {
  anthropic: Anthropic;
  systemPrompt: string;
  userMessage: string;
  userId: string;
  attemptLabel: 'attempt-1' | 'attempt-2';
}): Promise<ExtractionAttemptResult> {
  const { anthropic, systemPrompt, userMessage, userId, attemptLabel } = params;

  const message = await Promise.race([
    anthropic.messages.create({
      model: WORXDESK_MODEL,
      max_tokens: BRIEF_EXTRACTION_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Brief Extraction timed out after ${BRIEF_EXTRACTION_TIMEOUT_MS / 1000} seconds`,
            ),
          ),
        BRIEF_EXTRACTION_TIMEOUT_MS,
      ),
    ),
  ]);

  const rawText =
    message.content[0]?.type === 'text' ? message.content[0].text : '';

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;

  // Log usage for THIS attempt before we even know whether the parse will
  // succeed — we billed the tokens either way, and per spec retries log
  // as separate rows under the same `feature` value.
  fireAndForgetUsageLog({
    userId,
    feature: WORXDESK_USAGE_FEATURES.briefExtraction,
    inputTokens,
    outputTokens,
  });

  logger.log(`📦 Brief Extraction ${attemptLabel} returned`, {
    inputTokens,
    outputTokens,
    rawLength: rawText.length,
  });

  return {
    rawText,
    parsed: tryParseFormData(rawText),
    inputTokens,
    outputTokens,
  };
}

// ============================================================================
// Anthropic error → JSON error response
// ============================================================================

/**
 * Convert an Anthropic / generic error into a sanitized JSON NextResponse.
 * The full error is already logged by the caller via logError().
 *
 * Status mapping:
 *   timeout            → 504
 *   429 rate limit     → 429
 *   503 / 529 overload → 503
 *   other Anthropic    → 500 (or the SDK's status)
 *   anything else      → 500
 */
function errorToJsonResponse(error: unknown): NextResponse<WorxDeskErrorBody> {
  if (error instanceof Error && error.message.toLowerCase().includes('timed out')) {
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Request timeout',
        details: 'Brief Extraction timed out. Please try again.',
      },
      { status: 504 },
    );
  }

  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) {
      return NextResponse.json<WorxDeskErrorBody>(
        {
          error: 'AI service error',
          details: 'Rate limit exceeded. Please wait a moment and try again.',
        },
        { status: 429 },
      );
    }
    if (error.status === 503 || error.status === 529 || error.status === 500) {
      return NextResponse.json<WorxDeskErrorBody>(
        {
          error: 'AI service error',
          details: 'Service temporarily unavailable. Please try again in a moment.',
        },
        { status: 503 },
      );
    }
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'AI service error',
        details: 'AI service error. Please try again.',
      },
      { status: error.status || 500 },
    );
  }

  return NextResponse.json<WorxDeskErrorBody>(
    {
      error: 'Internal server error',
      details: 'An unexpected error occurred during Brief Extraction.',
    },
    { status: 500 },
  );
}

// ============================================================================
// Route handler
// ============================================================================

/**
 * POST /api/worxdesk/extract-brief
 *
 * Returns: { formData: Record<string, unknown> } on 200.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<BriefExtractionLLMResponse | WorxDeskErrorBody>> {
  // --------------------------------------------------------------------------
  // 1. Feature flag.
  // --------------------------------------------------------------------------
  const flagResponse = worxdeskFeatureGuard();
  if (flagResponse) {
    return flagResponse;
  }

  // --------------------------------------------------------------------------
  // 2. Auth + monthly usage limit.
  // --------------------------------------------------------------------------
  const preflight = await requireWorxDeskPreflight();
  if (!preflight.ok) {
    return preflight.response;
  }
  const { userId } = preflight;

  // --------------------------------------------------------------------------
  // 3. Parse JSON body.
  // --------------------------------------------------------------------------
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Invalid JSON in request body',
        details: 'Please send a valid JSON object matching the BriefExtraction request shape.',
      },
      { status: 400 },
    );
  }

  // --------------------------------------------------------------------------
  // 4. Validate fields.
  // --------------------------------------------------------------------------
  const validation = validateRequest(rawBody);
  if (!validation.ok) {
    return validation.response;
  }
  const input = validation.request;

  // --------------------------------------------------------------------------
  // 5. Build schema block + base user message.
  //    buildTemplateSchemaBlock throws on unsupported template ids, but we
  //    already filtered with isWorxDeskSupportedTemplate above, so this is
  //    just a defensive try/catch for the case where the supported list and
  //    the schema helper somehow disagree.
  // --------------------------------------------------------------------------
  let baseUserMessage: string;
  try {
    const schemaBlock = buildTemplateSchemaBlock(input.targetTemplateId);
    baseUserMessage = buildBriefExtractionPrompt(input, schemaBlock, input.questions);
  } catch (error) {
    logError(error, 'WORX DESK Brief Extraction (prompt build)');
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Bad request',
        details:
          error instanceof Error
            ? error.message
            : 'Could not build extraction prompt for the chosen template.',
      },
      { status: 400 },
    );
  }

  // --------------------------------------------------------------------------
  // 6. Anthropic client.
  // --------------------------------------------------------------------------
  const clientResult = getAnthropicClient();
  if (!clientResult.ok) {
    return clientResult.response;
  }
  const anthropic = clientResult.client;

  // --------------------------------------------------------------------------
  // 7. Attempt 1.
  //    Any exception here (timeout, Anthropic API error) short-circuits with
  //    the appropriate status code. We do NOT retry on transport / API
  //    errors — only on a successful response that fails to parse.
  // --------------------------------------------------------------------------
  let attempt1: ExtractionAttemptResult;
  try {
    attempt1 = await runExtractionAttempt({
      anthropic,
      systemPrompt: WORXDESK_BRIEF_EXTRACTION_PROMPT,
      userMessage: baseUserMessage,
      userId,
      attemptLabel: 'attempt-1',
    });
  } catch (error) {
    logError(error, 'WORX DESK Brief Extraction (attempt 1)');
    return errorToJsonResponse(error);
  }

  if (attempt1.parsed) {
    return NextResponse.json<BriefExtractionLLMResponse>(
      { formData: attempt1.parsed as Record<string, string> },
      { status: 200 },
    );
  }

  // --------------------------------------------------------------------------
  // 8. Attempt 2 — retry with stricter instruction prepended.
  //    Sonnet sometimes responds with prose or fenced JSON despite the
  //    system prompt. The prepended directive consistently fixes this in
  //    practice. Both attempts log usage independently.
  // --------------------------------------------------------------------------
  logger.warn(
    'WORX DESK Brief Extraction: attempt 1 produced unparseable output, retrying. ' +
      `Raw output preview: ${attempt1.rawText.slice(0, 200)}`,
  );

  const retryUserMessage = `${RETRY_INSTRUCTION}\n\n${baseUserMessage}`;

  let attempt2: ExtractionAttemptResult;
  try {
    attempt2 = await runExtractionAttempt({
      anthropic,
      systemPrompt: WORXDESK_BRIEF_EXTRACTION_PROMPT,
      userMessage: retryUserMessage,
      userId,
      attemptLabel: 'attempt-2',
    });
  } catch (error) {
    logError(error, 'WORX DESK Brief Extraction (attempt 2)');
    return errorToJsonResponse(error);
  }

  if (attempt2.parsed) {
    return NextResponse.json<BriefExtractionLLMResponse>(
      { formData: attempt2.parsed as Record<string, string> },
      { status: 200 },
    );
  }

  // Both attempts failed to parse. Surface a clean 502 to the client.
  logger.error(
    'WORX DESK Brief Extraction: both attempts produced unparseable output. ' +
      `Attempt 2 preview: ${attempt2.rawText.slice(0, 200)}`,
  );

  return NextResponse.json<WorxDeskErrorBody>(
    {
      error: 'AI extraction failed',
      details:
        'Failed to extract structured data from brief. Please try again or simplify your brief.',
    },
    { status: 502 },
  );
}
