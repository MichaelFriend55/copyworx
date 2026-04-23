/**
 * @file app/api/brand-check-rewrite/route.ts
 * @description API route for rewriting HTML copy to better align with a brand voice
 *
 * Takes the original HTML, the brand voice configuration (including writing
 * samples), and the prior analysis results. Returns the rewritten HTML with
 * every structural tag from the input preserved (h1/h2/h3, p, ol/ul/li,
 * strong/em/u, br, etc.) — only the text content inside tags changes.
 *
 * Pattern mirrors app/api/competitive-analysis/route.ts:
 *   getUserId() → checkUserWithinLimit() → build prompt → Anthropic call →
 *   fire-and-forget logUsageToSupabase() → return rewritten HTML.
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
  /** Original copy as an HTML string (from editor.getHTML() or the selection slice). */
  html: string;
  brandVoice: BrandVoicePayload;
  analysis?: BrandCheckAnalysisContext;
}

interface BrandCheckRewriteResponse {
  /** Rewritten copy as an HTML string, with the input's tag structure preserved. */
  rewrittenHtml: string;
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
 * Format the prior analysis as a bullet list of issues to fix, for the prompt.
 */
function buildIssuesList(analysis: BrandCheckAnalysisContext | undefined): string {
  if (!analysis) return '(no specific issues flagged — apply the brand voice throughout)';

  const sections: string[] = [];

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

  if (sections.length === 0) {
    return '(no specific issues flagged — apply the brand voice throughout)';
  }

  return sections.join('\n\n');
}

/**
 * Build the user-turn prompt. The original HTML, issues, and brand voice
 * context are inlined here (vs. the system prompt) so the model receives them
 * together with the explicit rewrite instruction.
 */
function buildUserPrompt(
  originalHtml: string,
  brandVoice: BrandVoicePayload,
  analysis: BrandCheckAnalysisContext | undefined
): string {
  const brandContext = buildBrandVoiceContext(brandVoice);
  const issues = buildIssuesList(analysis);

  return `You previously analyzed a piece of HTML copy against a brand voice and identified specific issues. Now rewrite the copy to fix those issues while preserving the EXACT HTML structure.

CRITICAL FORMATTING RULES:
1. Preserve ALL HTML tags from the original — every <h1>, <h2>, <h3>, <p>, <ol>, <ul>, <li>, <strong>, <em>, <u>, <br>, and any other structural tags.
2. Maintain the same document structure — same number of sections, same heading hierarchy, same list items.
3. Only change the TEXT CONTENT inside tags. Do not add new tags, remove existing tags, or restructure the document.
4. If a heading said "Section 1 — Who This Is For" in the original, the rewritten version should still have an h1 or h2 with an updated but similar heading.
5. Preserve approximate length within each section — do not expand or collapse content dramatically.

ORIGINAL HTML:
"""
${originalHtml}
"""

IDENTIFIED ISSUES TO FIX:
${issues}

BRAND VOICE CONTEXT:
${brandContext}

Rewrite the HTML now. Fix every identified brand voice issue. Match the voice of the Writing Samples if provided. Preserve every HTML tag. Return ONLY the rewritten HTML — no preamble, no code fences, no explanation. Just the HTML starting with the first tag.`;
}

/**
 * System prompt — kept short; the heavy lifting is in the user prompt which
 * carries the original HTML, issues, and brand voice context together.
 */
const SYSTEM_PROMPT = `You are a senior brand copywriter with 20+ years of experience rewriting HTML copy to match a specific brand voice exactly.

You preserve every HTML tag in the input, change only the text content inside tags, and return raw HTML — never markdown, never code fences, never explanations. Your output begins with the first HTML tag and ends with the last.`;

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
// Response Cleanup
// ============================================================================

/**
 * Strip accidental code fences from Claude's response.
 *
 * We instruct the model not to use fences, but defensively remove them anyway
 * since wrapping in ```html ... ``` is a common model habit. Mirrors the
 * defensive parsing on the analysis endpoint.
 */
function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();

  const fenceMatch = cleaned.match(/^```(?:html|xml)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  cleaned = cleaned
    .replace(/^```(?:html|xml)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return cleaned;
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/brand-check-rewrite
 *
 * Returns an HTML rewrite of the input copy that better aligns with the
 * provided brand voice. The output preserves the input's tag structure so
 * TipTap can insert it without losing headings, lists, or inline formatting.
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

    const { html, brandVoice, analysis } = body;

    if (!html || typeof html !== 'string') {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Missing "html" field',
          details: 'Provide the original copy as HTML (from editor.getHTML()) to rewrite',
        },
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
      validateNotEmpty(html, 'HTML');
      // Length validation operates on character count, which is still a
      // reasonable sanity bound for HTML input.
      validateTextLength(html, 'HTML');
    } catch (validationError) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Invalid HTML',
          details:
            validationError instanceof Error ? validationError.message : 'Provide valid HTML',
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
    const userPrompt = buildUserPrompt(html, brandVoice as BrandVoicePayload, analysis);

    logger.log('📝 Brand check rewrite request:', {
      brandName: brandVoice.brandName,
      htmlLength: html.length,
      hasAnalysis: !!analysis,
      hasWritingSamples: Array.isArray(brandVoice.writing_samples)
        ? brandVoice.writing_samples.length
        : 0,
    });

    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
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

    const rewrittenHtml = stripCodeFences(rawResponse);

    if (!rewrittenHtml) {
      logger.error('❌ Rewrite produced empty HTML after cleanup');
      return NextResponse.json<ErrorResponse>(
        {
          error: 'AI processing error',
          details: 'Rewrite was empty after processing. Please try again.',
        },
        { status: 502 }
      );
    }

    logger.log('✅ Brand check rewrite complete:', {
      originalLength: html.length,
      newLength: rewrittenHtml.length,
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
        rewrittenHtml,
        brandName: brandVoice.brandName,
        originalLength: html.length,
        newLength: rewrittenHtml.length,
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
