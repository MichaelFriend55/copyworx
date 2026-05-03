/**
 * @file app/api/worxdesk/strategic-review/route.ts
 * @description WORX DESK Call 1 — Strategic Review (streaming SSE).
 *
 * Reads a creative brief plus deliverable / brand / persona context, calls
 * Claude Sonnet 4 with the WORXDESK_STRATEGIC_REVIEW_PROMPT system message,
 * and streams the model's response back to the client as Server-Sent Events.
 *
 * Streaming format (one JSON object per `data:` line, blank line terminates):
 *
 *   data: {"type":"text","content":"...chunk..."}\n\n
 *   data: {"type":"done"}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 *
 * The text frames carry raw text deltas in arrival order. The done frame is
 * sent after the final message_stop event. The error frame is sent (and the
 * stream is closed) on any failure once streaming has begun. Pre-stream
 * failures (auth, validation, feature flag) return JSON with the appropriate
 * HTTP status — they never enter the SSE channel.
 *
 * Phase 5 is responsible for parsing the streamed text into Strategic Take +
 * Decisions Needed sections. This route does not parse or interpret the model
 * output; it just relays bytes.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  WORXDESK_STRATEGIC_REVIEW_PROMPT,
  buildStrategicReviewPrompt,
} from '@/lib/prompts/worxdesk-strategic-review';
import { isWorxDeskSupportedTemplate } from '@/lib/templates/worxdesk-template-schemas';
import type { StrategicReviewLLMRequest } from '@/lib/types/worxdesk';
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

/** Max tokens for the Strategic Take + up to 4 questions. Plenty of headroom. */
const STRATEGIC_REVIEW_MAX_TOKENS = 2000;

/** Hard timeout for the streaming call. Includes time spent waiting for the
 *  first byte AND time spent draining text deltas. If we hit this, we abort
 *  the underlying stream and emit an error frame. */
const STRATEGIC_REVIEW_TIMEOUT_MS = 60_000;

// ============================================================================
// SSE frame helpers
// ============================================================================

/** Single source of truth for SSE frame shape. */
type StrategicReviewSseFrame =
  | { type: 'text'; content: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * Encode a structured frame as a single SSE `data:` line followed by the
 * blank-line terminator required by the SSE spec. We keep one JSON object
 * per frame so the client can parse with a simple split-by-`\n\n` reader.
 */
function encodeSseFrame(encoder: TextEncoder, frame: StrategicReviewSseFrame): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(frame)}\n\n`);
}

// ============================================================================
// Request validation
// ============================================================================

interface ValidationOk {
  ok: true;
  request: StrategicReviewLLMRequest;
}

interface ValidationFail {
  ok: false;
  response: NextResponse<WorxDeskErrorBody>;
}

/**
 * Parse and validate the request body against StrategicReviewLLMRequest.
 *
 * Rules (from the Phase 3 spec):
 * - brief and deliverableSpec must be non-empty strings.
 * - chosenTemplateId must be a known WORX DESK v1 template.
 * - supportingMaterials may be an empty string.
 * - brandVoiceId and personaId may be null.
 *
 * Returns the validated request on success; otherwise a NextResponse the
 * caller must return immediately (status 400 for missing/empty fields).
 */
async function parseAndValidateRequest(
  request: NextRequest,
): Promise<ValidationOk | ValidationFail> {
  let body: Partial<StrategicReviewLLMRequest>;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json<WorxDeskErrorBody>(
        {
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON matching the StrategicReviewLLMRequest schema.',
        },
        { status: 400 },
      ),
    };
  }

  const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
  const deliverableSpec =
    typeof body.deliverableSpec === 'string' ? body.deliverableSpec.trim() : '';
  const supportingMaterials =
    typeof body.supportingMaterials === 'string' ? body.supportingMaterials : '';
  const chosenTemplateId =
    typeof body.chosenTemplateId === 'string' ? body.chosenTemplateId.trim() : '';
  const brandVoiceId = body.brandVoiceId === undefined ? null : body.brandVoiceId;
  const personaId = body.personaId === undefined ? null : body.personaId;

  if (brief.length === 0) {
    return badRequest('Field "brief" is required and must be a non-empty string.');
  }

  if (deliverableSpec.length === 0) {
    return badRequest('Field "deliverableSpec" is required and must be a non-empty string.');
  }

  if (chosenTemplateId.length === 0) {
    return badRequest('Field "chosenTemplateId" is required and must be a non-empty string.');
  }

  if (!isWorxDeskSupportedTemplate(chosenTemplateId)) {
    return badRequest(`Template '${chosenTemplateId}' is not supported by WORX DESK in v1.`);
  }

  if (brandVoiceId !== null && typeof brandVoiceId !== 'string') {
    return badRequest('Field "brandVoiceId" must be a string or null.');
  }

  if (personaId !== null && typeof personaId !== 'string') {
    return badRequest('Field "personaId" must be a string or null.');
  }

  return {
    ok: true,
    request: {
      brief,
      deliverableSpec,
      supportingMaterials,
      chosenTemplateId,
      brandVoiceId,
      personaId,
    },
  };
}

/** Small helper so the validator stays readable. */
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
// Anthropic error → user-facing message
// ============================================================================

/**
 * Convert an unknown error into a sanitized, user-facing message that is safe
 * to surface inside an SSE error frame. The full error is logged separately
 * via logError(); the client never sees raw SDK details.
 */
function sanitizeErrorForClient(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (error.status === 529 || error.status === 503 || error.status === 500) {
      return 'Service temporarily unavailable. Please try again in a moment.';
    }
    return 'AI service error. Please try again.';
  }

  return 'Unexpected error during Strategic Review. Please try again.';
}

// ============================================================================
// Route handler
// ============================================================================

/**
 * POST /api/worxdesk/strategic-review
 *
 * Streams the WORX DESK Strategic Review for a submitted brief.
 * See file header for the SSE frame format.
 */
export async function POST(request: NextRequest): Promise<Response> {
  // --------------------------------------------------------------------------
  // 1. Feature flag — must be the first check.
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
  // 3. Parse and validate request body.
  // --------------------------------------------------------------------------
  const validation = await parseAndValidateRequest(request);
  if (!validation.ok) {
    return validation.response;
  }
  const input = validation.request;

  // --------------------------------------------------------------------------
  // 4. Anthropic client.
  // --------------------------------------------------------------------------
  const clientResult = getAnthropicClient();
  if (!clientResult.ok) {
    return clientResult.response;
  }
  const anthropic = clientResult.client;

  // --------------------------------------------------------------------------
  // 5. Build messages and open the stream.
  //    Wrap stream creation in its own try so we can return a JSON error
  //    response (rather than an SSE error) for failures that happen before
  //    we have committed to streaming back to the client.
  // --------------------------------------------------------------------------
  const userMessage = buildStrategicReviewPrompt(input);

  let stream: ReturnType<Anthropic['messages']['stream']>;
  try {
    stream = anthropic.messages.stream({
      model: WORXDESK_MODEL,
      max_tokens: STRATEGIC_REVIEW_MAX_TOKENS,
      system: WORXDESK_STRATEGIC_REVIEW_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
  } catch (error) {
    logError(error, 'WORX DESK Strategic Review (stream open)');
    return jsonErrorResponseFromError(error);
  }

  // --------------------------------------------------------------------------
  // 6. Pipe text deltas to the client as SSE frames.
  //    On timeout we abort the underlying stream; on any other failure we
  //    emit an error frame and close cleanly so the client always receives
  //    a terminator.
  // --------------------------------------------------------------------------
  const encoder = new TextEncoder();
  let timedOut = false;

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const timeoutId = setTimeout(() => {
        timedOut = true;
        try {
          stream.controller.abort();
        } catch (abortErr) {
          // Aborting a stream that already finished can throw; harmless.
          logger.warn('Strategic Review: abort after timeout threw', abortErr);
        }
      }, STRATEGIC_REVIEW_TIMEOUT_MS);

      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encodeSseFrame(encoder, { type: 'text', content: event.delta.text }),
            );
          }
        }

        // Stream completed — capture token usage from the assembled message
        // before closing so we can log accurate cost. finalMessage() is
        // guaranteed to resolve once the iterator drains.
        const finalMessage = await stream.finalMessage();

        controller.enqueue(encodeSseFrame(encoder, { type: 'done' }));
        controller.close();

        fireAndForgetUsageLog({
          userId,
          feature: WORXDESK_USAGE_FEATURES.strategicReview,
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        });
      } catch (error) {
        logError(error, 'WORX DESK Strategic Review (stream)');
        const message = timedOut
          ? 'Strategic Review timed out. Please try again.'
          : sanitizeErrorForClient(error);
        try {
          controller.enqueue(encodeSseFrame(encoder, { type: 'error', message }));
        } catch {
          // Controller may already be closed if the client disconnected.
        }
        controller.close();
      } finally {
        clearTimeout(timeoutId);
      }
    },

    cancel() {
      // Client disconnected. Abort the upstream call so we stop spending
      // tokens on a response no one will read.
      try {
        stream.controller.abort();
      } catch {
        // Already aborted or finished.
      }
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Tell nginx / Vercel proxies not to buffer; SSE must flush per frame.
      'X-Accel-Buffering': 'no',
    },
  });
}

// ============================================================================
// Pre-stream JSON error helper
// ============================================================================

/**
 * Build a JSON error response for failures that occur BEFORE we open the
 * SSE stream (e.g. anthropic.messages.stream() throws synchronously). Once
 * the stream is open we must use SSE error frames instead.
 */
function jsonErrorResponseFromError(error: unknown): NextResponse<WorxDeskErrorBody> {
  if (error instanceof Anthropic.APIError) {
    let userMessage = 'AI service error. Please try again.';
    let status = error.status || 500;

    if (error.status === 429) {
      userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (error.status === 529 || error.status === 503 || error.status === 500) {
      userMessage = 'Service temporarily unavailable. Please try again in a moment.';
      status = 503;
    }

    return NextResponse.json<WorxDeskErrorBody>(
      { error: 'AI service error', details: userMessage },
      { status },
    );
  }

  return NextResponse.json<WorxDeskErrorBody>(
    {
      error: 'Internal server error',
      details: 'Failed to start Strategic Review. Please try again.',
    },
    { status: 500 },
  );
}
