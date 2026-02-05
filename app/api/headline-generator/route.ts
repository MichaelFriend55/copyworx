/**
 * @file app/api/headline-generator/route.ts
 * @description API route for AI-powered headline generation
 *
 * Validates form data, builds the prompt, calls the centralized
 * /api/claude endpoint pattern, and returns parsed headline results.
 *
 * Features:
 * - Input validation for all required fields
 * - Channel-aware prompt construction
 * - Structured response with parsed formula + headline pairs
 * - Usage tracking via centralized Claude API
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireUserId, unauthorizedResponse } from '@/lib/utils/api-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';
import {
  HEADLINE_GENERATOR_SYSTEM_PROMPT,
  buildHeadlineUserPrompt,
  parseHeadlineResponse,
} from '@/lib/prompts/headline-generator';
import type { HeadlineFormData, HeadlineResult } from '@/lib/prompts/headline-generator';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Successful response shape
 */
interface HeadlineGeneratorResponse {
  /** Parsed headline results */
  headlines: HeadlineResult[];
  /** Raw text from Claude (fallback) */
  rawText: string;
  /** Token usage info */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Error response shape
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Claude model for headline generation */
const MODEL = 'claude-sonnet-4-20250514';

/** Max tokens for response (headlines are short, but we may generate 20+) */
const MAX_TOKENS = 4096;

/** Request timeout (60 seconds — generous for large batches) */
const REQUEST_TIMEOUT_MS = 60000;

/** Maximum allowed variations per request */
const MAX_VARIATIONS = 25;

/** Minimum allowed variations per request */
const MIN_VARIATIONS = 3;

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate headline generator form data
 * @throws Error with user-friendly message if validation fails
 */
function validateFormData(body: Partial<HeadlineFormData>): HeadlineFormData {
  const errors: string[] = [];

  if (!body.channel || typeof body.channel !== 'string') {
    errors.push('Please select a channel.');
  }

  if (!body.whatYourePromoting || body.whatYourePromoting.trim().length === 0) {
    errors.push('Please describe what you\'re promoting.');
  }

  if (!body.targetAudience || body.targetAudience.trim().length === 0) {
    errors.push('Please describe your target audience.');
  }

  if (!body.keyBenefit || body.keyBenefit.trim().length === 0) {
    errors.push('Please describe the key benefit or transformation.');
  }

  if (!body.characterGuidance || body.characterGuidance.trim().length === 0) {
    errors.push('Character guidance is required.');
  }

  if (!body.viewingContext || body.viewingContext.trim().length === 0) {
    errors.push('Viewing context is required.');
  }

  const numberOfVariations = body.numberOfVariations ?? 15;
  if (numberOfVariations < MIN_VARIATIONS || numberOfVariations > MAX_VARIATIONS) {
    errors.push(`Number of variations must be between ${MIN_VARIATIONS} and ${MAX_VARIATIONS}.`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return {
    channel: body.channel!,
    whatYourePromoting: body.whatYourePromoting!.trim(),
    targetAudience: body.targetAudience!.trim(),
    keyBenefit: body.keyBenefit!.trim(),
    uniqueAngle: body.uniqueAngle?.trim() || undefined,
    numberOfVariations,
    tonePreferences: Array.isArray(body.tonePreferences) ? body.tonePreferences : ['Professional'],
    characterGuidance: body.characterGuidance!.trim(),
    viewingContext: body.viewingContext!.trim(),
    avoidWords: body.avoidWords?.trim() || undefined,
    additionalContext: body.additionalContext?.trim() || undefined,
  };
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Model pricing (USD per 1M tokens) — must stay in sync with claude/route.ts
 */
const MODEL_PRICING = {
  inputPerMillion: 3.0,
  outputPerMillion: 15.0,
};

/**
 * Fire-and-forget usage logging
 */
async function logUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) return;

  const costUsd =
    (inputTokens / 1_000_000) * MODEL_PRICING.inputPerMillion +
    (outputTokens / 1_000_000) * MODEL_PRICING.outputPerMillion;

  try {
    const { error } = await (supabaseAdmin.from('api_usage_logs') as ReturnType<typeof supabaseAdmin.from>).insert({
      user_id: userId,
      model: MODEL,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      feature: 'headline_generator',
      cost_usd: Math.round(costUsd * 1_000_000) / 1_000_000,
    } as Record<string, unknown>);

    if (error) {
      logger.error('❌ Failed to log headline generator usage:', error);
    }
  } catch (err) {
    logger.error('❌ Exception logging headline generator usage:', err);
  }
}

// ============================================================================
// POST Handler
// ============================================================================

/**
 * POST /api/headline-generator
 *
 * Generate AI-powered headline variations based on form inputs.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<HeadlineGeneratorResponse | ErrorResponse>> {
  const startTime = Date.now();

  try {
    // 1. Authenticate
    let userId: string;
    try {
      userId = await requireUserId();
    } catch {
      return unauthorizedResponse() as NextResponse<ErrorResponse>;
    }

    // 2. Parse body
    let body: Partial<HeadlineFormData>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON', details: 'Please send valid JSON.' },
        { status: 400 },
      );
    }

    // 3. Validate
    let formData: HeadlineFormData;
    try {
      formData = validateFormData(body);
    } catch (err) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Validation error',
          details: err instanceof Error ? err.message : 'Invalid form data.',
        },
        { status: 400 },
      );
    }

    // 4. Build prompt
    const userPrompt = buildHeadlineUserPrompt(formData);

    logger.log('📝 Headline generator request:', {
      userId: userId.substring(0, 8) + '...',
      channel: formData.channel,
      variations: formData.numberOfVariations,
      tones: formData.tonePreferences,
    });

    // 5. Call Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error('❌ ANTHROPIC_API_KEY not configured');
      return NextResponse.json<ErrorResponse>(
        { error: 'Server configuration error', details: 'API key not configured.' },
        { status: 500 },
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await Promise.race([
      anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: HEADLINE_GENERATOR_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.9, // Higher temperature for creative variety
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`)),
          REQUEST_TIMEOUT_MS,
        ),
      ),
    ]);

    // 6. Extract text
    const textContent = response.content.find((block) => block.type === 'text');
    const rawText = textContent?.type === 'text' ? textContent.text.trim() : '';

    if (!rawText) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Empty response', details: 'Claude returned an empty response. Please try again.' },
        { status: 500 },
      );
    }

    // 7. Parse headlines
    const headlines = parseHeadlineResponse(rawText);

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    // 8. Log usage (fire-and-forget)
    logUsage(userId, inputTokens, outputTokens).catch((err) => {
      logger.error('❌ Unexpected usage logging error:', err);
    });

    const duration = Date.now() - startTime;
    logger.log('✅ Headline generator success:', {
      duration: `${duration}ms`,
      headlinesCount: headlines.length,
      inputTokens,
      outputTokens,
    });

    // 9. Return
    return NextResponse.json<HeadlineGeneratorResponse>({
      headlines,
      rawText,
      usage: { inputTokens, outputTokens },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ Headline generator error:', {
      error: error instanceof Error ? error.message : 'Unknown',
      duration: `${duration}ms`,
    });

    if (error instanceof Anthropic.APIError) {
      let details = 'AI service error. Please try again.';
      if (error.status === 429) details = 'Rate limit exceeded. Please wait and try again.';
      if (error.status === 529) details = 'AI service overloaded. Please try again shortly.';
      return NextResponse.json<ErrorResponse>(
        { error: 'AI service error', details },
        { status: error.status || 500 },
      );
    }

    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Timeout', details: 'Request timed out. Try fewer variations.' },
        { status: 408 },
      );
    }

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unexpected error.',
      },
      { status: 500 },
    );
  }
}
