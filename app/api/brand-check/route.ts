/**
 * @file app/api/brand-check/route.ts
 * @description API route for analyzing copy alignment with a brand voice using Claude AI
 *
 * Accepts copy text plus brand voice config (including writing samples) and
 * returns a structured JSON brand-check report. Used by the Brand Check
 * right-sidebar tool to show alignment strength, matches, misalignments,
 * missing elements, and recommendations.
 *
 * Pattern mirrors app/api/competitive-analysis/route.ts:
 *   getUserId() → checkUserWithinLimit() → build prompt → Anthropic call →
 *   fire-and-forget logUsageToSupabase() → return JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateTextLength, validateNotEmpty, logError } from '@/lib/utils/error-handling';
import { logger } from '@/lib/utils/logger';
import { getUserId, checkUserWithinLimit, usageLimitExceededResponse } from '@/lib/utils/api-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

interface BrandVoicePayload {
  brandName: string;
  brandTone: string;
  approvedPhrases: string[];
  forbiddenWords: string[];
  brandValues: string[];
  missionStatement: string;
  writing_samples?: string[];
}

interface BrandCheckRequest {
  text: string;
  brandVoice: BrandVoicePayload;
}

/**
 * Overall alignment bucket returned by the model. These are the only values
 * the client uses to color the alignment badge (green, yellow, orange, red).
 */
type OverallAlignment = 'Strong' | 'Moderate' | 'Weak' | 'Off-Brand';

interface BrandCheckAnalysis {
  overallAlignment: OverallAlignment;
  /** 0-100 score for additional granularity */
  alignmentScore: number;
  /** Short, one-paragraph summary of the alignment */
  summary: string;
  /** Specific phrases/moments that match the brand voice well */
  matches: string[];
  /** Specific phrases/moments that violate the brand voice */
  misalignments: string[];
  /** Brand elements (approved phrases, values, mission cues) that are missing */
  missingElements: string[];
  /** Actionable recommendations to move closer to the brand voice */
  recommendations: string[];
}

interface BrandCheckResponse {
  analysis: BrandCheckAnalysis;
  brandName: string;
  textLength: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Prompt Builders
// ============================================================================

/**
 * Build a Writing Samples block that is appended to the brand voice context.
 *
 * Returns an empty string when no usable samples exist so callers can
 * concatenate unconditionally without emitting a stray "WRITING SAMPLES:"
 * header. Matches the exact format used by generate-section and
 * generate-template (Part 1).
 */
function buildWritingSamplesBlock(samples: string[] | undefined | null): string {
  if (!Array.isArray(samples)) {
    return '';
  }

  const cleaned = samples
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (cleaned.length === 0) {
    return '';
  }

  const formatted = cleaned
    .map((sample, index) => `SAMPLE ${index + 1}:\n${sample}`)
    .join('\n\n');

  return `

WRITING SAMPLES (existing copy in this brand's voice — use these as reference for rhythm, word choice, sentence structure, and tone. Match the voice of these samples more than you describe it):

${formatted}`;
}

/**
 * Build the brand voice context block for the system prompt.
 */
function buildBrandVoiceContext(brandVoice: BrandVoicePayload): string {
  const approvedPhrases = brandVoice.approvedPhrases?.length
    ? brandVoice.approvedPhrases.join(', ')
    : '(none specified)';
  const forbiddenWords = brandVoice.forbiddenWords?.length
    ? brandVoice.forbiddenWords.join(', ')
    : '(none specified)';
  const brandValues = brandVoice.brandValues?.length
    ? brandVoice.brandValues.join(', ')
    : '(none specified)';

  const base = `Brand: ${brandVoice.brandName}
Tone: ${brandVoice.brandTone || '(not specified)'}
Mission: ${brandVoice.missionStatement || '(not specified)'}
Brand Values: ${brandValues}
Approved Phrases: ${approvedPhrases}
Forbidden Words: ${forbiddenWords}`;

  return base + buildWritingSamplesBlock(brandVoice.writing_samples);
}

/**
 * Build the system prompt for brand check analysis.
 */
function buildSystemPrompt(brandVoice: BrandVoicePayload): string {
  const brandContext = buildBrandVoiceContext(brandVoice);

  return `You are a senior brand strategist with 20+ years of experience auditing brand voice alignment. You evaluate whether a piece of copy reflects a specific brand's voice, tone, values, and messaging system.

BRAND VOICE CONFIGURATION:

${brandContext}

Your job: analyze the user's copy against this brand voice and return a structured JSON report.

CRITICAL OUTPUT RULES:
- Return ONLY a single valid JSON object. No markdown, no code fences, no prose outside the JSON.
- Do NOT wrap the JSON in \`\`\`json fences.
- All string arrays must be non-null; use [] when nothing applies.
- Be specific and concrete — cite actual phrases from the copy, not generic advice.

JSON SCHEMA (return exactly this shape):
{
  "overallAlignment": "Strong" | "Moderate" | "Weak" | "Off-Brand",
  "alignmentScore": <integer 0-100>,
  "summary": "<one paragraph, 1-3 sentences>",
  "matches": ["<short phrase-level observation>", ...],
  "misalignments": ["<short phrase-level observation>", ...],
  "missingElements": ["<brand element not present that should be>", ...],
  "recommendations": ["<actionable suggestion>", ...]
}

BUCKET GUIDANCE:
- Strong (85-100): Copy sounds like it came straight from this brand.
- Moderate (65-84): Mostly on-brand but with noticeable drift or gaps.
- Weak (40-64): Recognizable issues in tone, vocabulary, or values.
- Off-Brand (0-39): Copy reads like a different brand entirely.

If writing samples were provided above, weight rhythm, word choice, and sentence structure from the samples more heavily than the abstract tone description.`;
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Log API usage to Supabase (fire-and-forget).
 */
async function logUsageToSupabase(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number
): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    logger.log('⚠️ Supabase not configured, skipping usage logging');
    return;
  }

  try {
    const { error } = await (supabaseAdmin
      .from('api_usage_logs') as any)
      .insert({
        user_id: userId,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        feature: 'brand-check',
        cost_usd: costUsd,
      });

    if (error) {
      console.error('❌ Failed to log brand-check usage:', error);
    } else {
      logger.log('📊 Brand check usage logged:', {
        userId: userId.substring(0, 8) + '...',
        model,
        tokens: inputTokens + outputTokens,
        cost: `$${costUsd.toFixed(6)}`,
      });
    }
  } catch (err) {
    console.error('❌ Exception logging brand-check usage:', err);
  }
}

/**
 * Calculate cost based on Claude Sonnet 4 pricing: $3/1M input, $15/1M output.
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

// ============================================================================
// Response Parsing
// ============================================================================

const VALID_ALIGNMENTS: readonly OverallAlignment[] = ['Strong', 'Moderate', 'Weak', 'Off-Brand'];

/**
 * Extract and validate the JSON analysis from Claude's raw response.
 *
 * Claude sometimes wraps JSON in code fences even when instructed not to; this
 * strips those defensively before parsing and then coerces every field to the
 * expected shape so downstream consumers never see null/undefined.
 */
function parseAnalysis(raw: string): BrandCheckAnalysis {
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed = JSON.parse(cleaned);

  const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  };

  const alignment: OverallAlignment = VALID_ALIGNMENTS.includes(parsed.overallAlignment)
    ? parsed.overallAlignment
    : 'Moderate';

  const rawScore =
    typeof parsed.alignmentScore === 'number'
      ? parsed.alignmentScore
      : Number.parseInt(String(parsed.alignmentScore), 10);
  const score = Number.isFinite(rawScore) ? Math.min(100, Math.max(0, Math.round(rawScore))) : 0;

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

  return {
    overallAlignment: alignment,
    alignmentScore: score,
    summary,
    matches: toStringArray(parsed.matches),
    misalignments: toStringArray(parsed.misalignments),
    missingElements: toStringArray(parsed.missingElements),
    recommendations: toStringArray(parsed.recommendations),
  };
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/brand-check
 *
 * Returns a structured JSON report on how well the provided copy aligns with
 * the given brand voice.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<BrandCheckResponse | ErrorResponse>> {
  try {
    const userId = await getUserId();

    if (userId) {
      const usageCheck = await checkUserWithinLimit(userId);
      if (!usageCheck.withinLimit) {
        logger.log('🚫 User exceeded usage limit:', {
          userId: userId.substring(0, 8) + '...',
          totalCost: `$${usageCheck.totalCost.toFixed(4)}`,
        });
        return usageLimitExceededResponse(usageCheck.totalCost);
      }
    }

    let body: Partial<BrandCheckRequest>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON', details: 'Please send valid JSON' },
        { status: 400 }
      );
    }

    const { text, brandVoice } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing "text" field', details: 'Provide the copy you want to check' },
        { status: 400 }
      );
    }

    if (!brandVoice || typeof brandVoice !== 'object' || !brandVoice.brandName) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing brand voice', details: 'No brand voice configuration was provided' },
        { status: 400 }
      );
    }

    try {
      validateNotEmpty(text, 'Text');
      validateTextLength(text, 'Text');
    } catch (validationError) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Invalid text',
          details:
            validationError instanceof Error ? validationError.message : 'Provide valid text',
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      logger.error('❌ ANTHROPIC_API_KEY not found');
      return NextResponse.json<ErrorResponse>(
        { error: 'Server configuration error', details: 'API key not configured.' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt(brandVoice as BrandVoicePayload);
    const userPrompt = `Analyze this copy against the brand voice above and return the JSON report:\n\n${text}`;

    logger.log('📝 Brand check request:', {
      brandName: brandVoice.brandName,
      textLength: text.length,
      hasWritingSamples: Array.isArray(brandVoice.writing_samples)
        ? brandVoice.writing_samples.length
        : 0,
    });

    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 60 seconds')), 60000)
      ),
    ]);

    const rawResponse =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    if (!rawResponse) {
      logger.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { error: 'AI processing error', details: 'Empty response. Please try again.' },
        { status: 500 }
      );
    }

    let analysis: BrandCheckAnalysis;
    try {
      analysis = parseAnalysis(rawResponse);
    } catch (parseError) {
      logError(parseError, 'Brand Check JSON parse');
      logger.error('❌ Failed to parse brand-check JSON response:', {
        rawPreview: rawResponse.slice(0, 500),
      });
      return NextResponse.json<ErrorResponse>(
        {
          error: 'AI processing error',
          details: 'The AI returned a malformed response. Please try again.',
        },
        { status: 502 }
      );
    }

    logger.log('✅ Brand check complete:', {
      alignment: analysis.overallAlignment,
      score: analysis.alignmentScore,
      matches: analysis.matches.length,
      misalignments: analysis.misalignments.length,
    });

    if (userId) {
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const costUsd = calculateCost(inputTokens, outputTokens);

      logUsageToSupabase(
        userId,
        'claude-sonnet-4-20250514',
        inputTokens,
        outputTokens,
        costUsd
      ).catch((err) => console.error('❌ Unexpected usage logging error:', err));
    }

    return NextResponse.json<BrandCheckResponse>(
      {
        analysis,
        brandName: brandVoice.brandName,
        textLength: text.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logError(error, 'Brand Check API');

    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Request timeout', details: 'The analysis took too long. Try with shorter text.' },
        { status: 408 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      let userMessage = 'AI service error. Please try again.';
      if (error.status === 429) {
        userMessage = 'Rate limit exceeded. Please wait and try again.';
      } else if (error.status === 500 || error.status === 503) {
        userMessage = 'AI service temporarily unavailable.';
      }
      return NextResponse.json<ErrorResponse>(
        { error: 'AI service error', details: userMessage },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json<ErrorResponse>(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
