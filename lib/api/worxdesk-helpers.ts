/**
 * @file lib/api/worxdesk-helpers.ts
 * @description Shared helpers for the WORX DESK API routes (Phase 3).
 *
 * The two WORX DESK routes (strategic-review and extract-brief) share a
 * common preamble: feature-flag guard, Clerk auth, monthly usage-limit check,
 * Anthropic client construction, Sonnet 4 cost calculation, and fire-and-forget
 * insertion into `api_usage_logs`. This module concentrates those concerns so
 * each route file stays focused on its own request validation, prompt
 * assembly, streaming/JSON handling, and retry semantics.
 *
 * Design choices that diverge from /api/generate-template (intentional):
 *
 * 1. Authentication is enforced. WORX DESK is a paid-tier, margin-sensitive
 *    feature, so we reject unauthenticated requests with 401 rather than
 *    silently skipping logging like /api/generate-template does.
 *
 * 2. Usage logging mirrors the existing api_usage_logs schema exactly:
 *    user_id, model, input_tokens, output_tokens, feature, cost_usd. The
 *    Phase 3 spec mentioned success/error_message/attempt fields, but those
 *    columns do not exist in the live table (verified against
 *    lib/types/database.ts). Adding them is out of scope for Phase 3.
 *    Failed calls do not produce a log row, which matches the existing
 *    /api/generate-template behavior.
 *
 * 3. Brief Extraction retries log a separate row per attempt with the same
 *    `feature` value, so cost-tracking captures both attempts.
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { featureFlags } from '@/lib/config/feature-flags';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import {
  checkUserWithinLimit,
  getUserId,
  unauthorizedResponse,
  usageLimitExceededResponse,
} from '@/lib/utils/api-auth';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Constants
// ============================================================================

/**
 * Stable feature identifiers written to api_usage_logs.feature so cost
 * tracking and admin dashboards can group rows per WORX DESK call type.
 */
export const WORXDESK_USAGE_FEATURES = {
  strategicReview: 'worxdesk_strategic_review',
  briefExtraction: 'worxdesk_brief_extraction',
} as const;

export type WorxDeskUsageFeature =
  (typeof WORXDESK_USAGE_FEATURES)[keyof typeof WORXDESK_USAGE_FEATURES];

/**
 * Model used for both WORX DESK calls. Matches /api/generate-template.
 * Pricing constants below assume this model — update both together if it
 * ever changes.
 */
export const WORXDESK_MODEL = 'claude-sonnet-4-20250514';

/** Claude Sonnet 4 input price per 1M tokens in USD. */
const SONNET4_INPUT_USD_PER_MTOK = 3;

/** Claude Sonnet 4 output price per 1M tokens in USD. */
const SONNET4_OUTPUT_USD_PER_MTOK = 15;

// ============================================================================
// Result / response types
// ============================================================================

/**
 * Standard error response shape returned by every failure path in both
 * WORX DESK routes. Mirrors the shape used by /api/generate-template so
 * client-side error handling can be consistent across all AI routes.
 */
export interface WorxDeskErrorBody {
  error: string;
  details?: string;
}

/**
 * Outcome of `requireWorxDeskPreflight()`. On success, returns the
 * authenticated userId. On failure, returns a NextResponse the caller
 * must return immediately to short-circuit the request.
 */
export type WorxDeskPreflightResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse<WorxDeskErrorBody> };

// ============================================================================
// Feature flag guard
// ============================================================================

/**
 * Returns a 404 NextResponse when the WORX DESK feature flag is disabled.
 * Returns null when the flag is enabled and the caller may proceed.
 *
 * 404 (not 403) is intentional: when the feature is dark, the route should
 * be indistinguishable from a non-existent endpoint. This avoids leaking
 * the existence of paid-tier features to anonymous probes.
 */
export function worxdeskFeatureGuard(): NextResponse<WorxDeskErrorBody> | null {
  if (!featureFlags.worxdeskEnabled) {
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Not found',
        details: 'WORX DESK is not enabled.',
      },
      { status: 404 },
    );
  }
  return null;
}

// ============================================================================
// Auth + usage-limit preflight
// ============================================================================

/**
 * Combined Clerk auth check and monthly usage-limit check.
 *
 * - No userId → 401 unauthorized (stricter than /api/generate-template,
 *   intentional for paid-tier WORX DESK routes).
 * - userId present but over the monthly $5 limit → 403 limit-exceeded
 *   (delegates to the existing usageLimitExceededResponse helper so the
 *   client receives the same shape it already handles for other AI routes).
 * - userId present and within limits → returns the userId for use in the
 *   downstream usage-logging call.
 */
export async function requireWorxDeskPreflight(): Promise<WorxDeskPreflightResult> {
  const userId = await getUserId();

  if (!userId) {
    return {
      ok: false,
      response: unauthorizedResponse() as NextResponse<WorxDeskErrorBody>,
    };
  }

  const usageCheck = await checkUserWithinLimit(userId);

  if (!usageCheck.withinLimit) {
    logger.log('🚫 WORX DESK: user exceeded usage limit', {
      userId: userId.substring(0, 8) + '...',
      totalCost: `$${usageCheck.totalCost.toFixed(4)}`,
    });
    return {
      ok: false,
      response: usageLimitExceededResponse(
        usageCheck.totalCost,
      ) as NextResponse<WorxDeskErrorBody>,
    };
  }

  return { ok: true, userId };
}

// ============================================================================
// Anthropic client
// ============================================================================

/**
 * Outcome of `getAnthropicClient()`. On success returns an Anthropic
 * instance; on failure returns a 500 response the caller must return.
 */
export type AnthropicClientResult =
  | { ok: true; client: Anthropic }
  | { ok: false; response: NextResponse<WorxDeskErrorBody> };

/**
 * Constructs an Anthropic SDK client using the ANTHROPIC_API_KEY env var.
 * Returns a 500 NextResponse if the key is missing — same posture as
 * /api/generate-template, with the same user-facing message.
 */
export function getAnthropicClient(): AnthropicClientResult {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    logger.error('❌ ANTHROPIC_API_KEY not found in environment variables');
    return {
      ok: false,
      response: NextResponse.json<WorxDeskErrorBody>(
        {
          error: 'Server configuration error',
          details: 'API key not configured. Please contact support.',
        },
        { status: 500 },
      ),
    };
  }

  return { ok: true, client: new Anthropic({ apiKey }) };
}

// ============================================================================
// Cost calculation
// ============================================================================

/**
 * Calculate cost in USD for a Claude Sonnet 4 call. Identical formula to
 * /api/generate-template's calculateCost(); kept here so both WORX DESK
 * routes share one definition.
 *
 * Returns a value rounded to 6 decimal places (matches the existing route).
 */
export function calculateClaudeSonnet4Cost(
  inputTokens: number,
  outputTokens: number,
): number {
  const inputCost = (inputTokens / 1_000_000) * SONNET4_INPUT_USD_PER_MTOK;
  const outputCost = (outputTokens / 1_000_000) * SONNET4_OUTPUT_USD_PER_MTOK;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

// ============================================================================
// Usage logging
// ============================================================================

/**
 * Fire-and-forget insert into the `api_usage_logs` table. Mirrors the
 * helper in /api/generate-template — never throws, never blocks the
 * response, logs its own errors to console.
 *
 * The schema (per lib/types/database.ts) accepts only:
 *   user_id, model, input_tokens, output_tokens, feature, cost_usd
 * (id, timestamp, total_tokens are auto-generated). We deliberately do
 * not attempt to write a `success`, `error_message`, or `metadata`
 * column — those fields do not exist on the live table.
 *
 * Failed LLM calls are not logged here; this matches /api/generate-template
 * behavior. Cost is only billed for tokens we actually consumed, and we
 * only have token counts on success.
 *
 * Brief Extraction retries call this twice with the same `feature` value,
 * producing two rows so total cost reflects both attempts.
 */
export async function logWorxDeskUsage(params: {
  userId: string;
  feature: WorxDeskUsageFeature;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  const { userId, feature, inputTokens, outputTokens } = params;

  if (!isSupabaseConfigured() || !supabaseAdmin) {
    logger.log('⚠️ Supabase not configured, skipping WORX DESK usage logging');
    return;
  }

  const costUsd = calculateClaudeSonnet4Cost(inputTokens, outputTokens);

  try {
    const { error } = await (supabaseAdmin.from('api_usage_logs') as any).insert({
      user_id: userId,
      model: WORXDESK_MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      feature,
      cost_usd: costUsd,
    });

    if (error) {
      console.error(`❌ Failed to log ${feature} usage:`, error);
      return;
    }

    logger.log(`📊 ${feature} usage logged:`, {
      userId: userId.substring(0, 8) + '...',
      model: WORXDESK_MODEL,
      tokens: inputTokens + outputTokens,
      cost: `$${costUsd.toFixed(6)}`,
    });
  } catch (err) {
    console.error(`❌ Exception logging ${feature} usage:`, err);
  }
}

/**
 * Convenience wrapper around logWorxDeskUsage that swallows any unexpected
 * rejection from the underlying fire-and-forget call. Use this at the
 * call-site so a logging exception can never bubble up and break a
 * successful API response.
 */
export function fireAndForgetUsageLog(params: {
  userId: string;
  feature: WorxDeskUsageFeature;
  inputTokens: number;
  outputTokens: number;
}): void {
  logWorxDeskUsage(params).catch((err) => {
    console.error(`❌ Unexpected error in ${params.feature} usage logging:`, err);
  });
}
