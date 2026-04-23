/**
 * @file app/api/brand-check-rewrite/route.ts
 * @description API route for rewriting copy to better align with a brand voice
 *
 * Takes the original copy, the brand voice configuration (including writing
 * samples), and the prior analysis results, and returns a plain-text rewrite
 * that preserves meaning and length while fixing the flagged misalignments.
 *
 * Pattern mirrors app/api/competitive-analysis/route.ts:
 *   getUserId() → checkUserWithinLimit() → build prompt → Anthropic call →
 *   fire-and-forget logUsageToSupabase() → return plain text.
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

interface BrandCheckAnalysisContext {
  overallAlignment?: string;
  alignmentScore?: number;
  summary?: string;
  matches?: string[];
  misalignments?: string[];
  missingElements?: string[];
  recommendations?: string[];
}

interface BrandCheckRewriteRequest {
  text: string;
  brandVoice: BrandVoicePayload;
  analysis?: BrandCheckAnalysisContext;
}

interface BrandCheckRewriteResponse {
  rewrittenText: string;
  brandName: string;
  originalLength: number;
  newLength: number;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Prompt Builders
// ============================================================================

/**
 * Build a Writing Samples block (see brand-check/route.ts for shared format).
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
 * Format the prior analysis as bullet context for the rewrite prompt.
 */
function buildAnalysisContext(analysis: BrandCheckAnalysisContext | undefined): string {
  if (!analysis) return '';

  const sections: string[] = [];

  if (typeof analysis.overallAlignment === 'string' && analysis.overallAlignment) {
    sections.push(`Current alignment: ${analysis.overallAlignment}`);
  }
  if (Array.isArray(analysis.misalignments) && analysis.misalignments.length > 0) {
    sections.push(
      `Misalignments to fix:\n${analysis.misalignments.map((m) => `- ${m}`).join('\n')}`
    );
  }
  if (Array.isArray(analysis.missingElements) && analysis.missingElements.length > 0) {
    sections.push(
      `Missing brand elements to add:\n${analysis.missingElements
        .map((m) => `- ${m}`)
        .join('\n')}`
    );
  }
  if (Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0) {
    sections.push(
      `Recommendations:\n${analysis.recommendations.map((r) => `- ${r}`).join('\n')}`
    );
  }

  if (sections.length === 0) return '';

  return `\n\nPRIOR ANALYSIS (fix these issues):\n\n${sections.join('\n\n')}`;
}

function buildSystemPrompt(
  brandVoice: BrandVoicePayload,
  analysis: BrandCheckAnalysisContext | undefined
): string {
  const brandContext = buildBrandVoiceContext(brandVoice);
  const analysisContext = buildAnalysisContext(analysis);

  return `You are a senior brand copywriter with 20+ years of experience rewriting copy to match a specific brand voice exactly.

BRAND VOICE CONFIGURATION:

${brandContext}${analysisContext}

YOUR TASK:
Rewrite the user's copy so it sounds like it came from this brand. Fix the misalignments and add the missing elements where it makes sense, without padding or bloat.

HARD RULES:
- Preserve the original meaning, structure, and approximate length (±20%).
- Keep the original format (if it's a paragraph, return a paragraph; if it's a list, return a list).
- Use the brand's approved phrases where natural. Never use forbidden words.
- If writing samples were provided above, match their rhythm, word choice, and sentence structure more closely than the abstract tone description.
- Do NOT add commentary, headers, labels, explanations, or markdown fences.
- Return ONLY the rewritten copy as plain text. Nothing else.`;
}

// ============================================================================
// Usage Logging
// ============================================================================

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
        feature: 'brand-check-rewrite',
        cost_usd: costUsd,
      });

    if (error) {
      console.error('❌ Failed to log brand-check-rewrite usage:', error);
    } else {
      logger.log('📊 Brand check rewrite usage logged:', {
        userId: userId.substring(0, 8) + '...',
        model,
        tokens: inputTokens + outputTokens,
        cost: `$${costUsd.toFixed(6)}`,
      });
    }
  } catch (err) {
    console.error('❌ Exception logging brand-check-rewrite usage:', err);
  }
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/brand-check-rewrite
 *
 * Returns a plain-text rewrite of the input that better aligns with the
 * provided brand voice.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<BrandCheckRewriteResponse | ErrorResponse>> {
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

    let body: Partial<BrandCheckRewriteRequest>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON', details: 'Please send valid JSON' },
        { status: 400 }
      );
    }

    const { text, brandVoice, analysis } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing "text" field', details: 'Provide the original copy to rewrite' },
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
    const systemPrompt = buildSystemPrompt(brandVoice as BrandVoicePayload, analysis);
    const userPrompt = `Original copy to rewrite:\n\n${text}`;

    logger.log('📝 Brand check rewrite request:', {
      brandName: brandVoice.brandName,
      textLength: text.length,
      hasAnalysis: !!analysis,
      hasWritingSamples: Array.isArray(brandVoice.writing_samples)
        ? brandVoice.writing_samples.length
        : 0,
    });

    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
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

    // Defensive: strip any accidental code fences even though we told the model
    // not to produce them. We still return plain text to the client.
    const rewrittenText = rawResponse
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    logger.log('✅ Brand check rewrite complete:', {
      originalLength: text.length,
      newLength: rewrittenText.length,
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

    return NextResponse.json<BrandCheckRewriteResponse>(
      {
        rewrittenText,
        brandName: brandVoice.brandName,
        originalLength: text.length,
        newLength: rewrittenText.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logError(error, 'Brand Check Rewrite API');

    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Request timeout', details: 'The rewrite took too long. Try with shorter text.' },
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
