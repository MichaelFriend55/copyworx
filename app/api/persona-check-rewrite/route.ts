/**
 * @file app/api/persona-check-rewrite/route.ts
 * @description API route for rewriting HTML copy to better speak to a persona
 *
 * Takes the original HTML, a client-serialized persona, and the prior
 * analysis results. Returns the rewritten HTML with every structural tag
 * from the input preserved (h1/h2/h3, p, ol/ul/li, strong/em/u, br, etc.) —
 * only the text content inside tags changes.
 *
 * Pattern mirrors app/api/brand-check-rewrite/route.ts exactly:
 *   getUserId() → checkUserWithinLimit() → build prompt → Anthropic call →
 *   fire-and-forget logUsageToSupabase() → return rewritten HTML.
 *
 * Persona payload is CLIENT-SERIALIZED — same stateless pattern as Brand
 * Check. personaId and projectId are accepted for logging only.
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

interface PersonaPayload {
  name: string;
  demographics: string;
  psychographics: string;
  painPoints: string;
  languagePatterns: string;
  goals: string;
}

interface PersonaCheckRecommendation {
  issue?: string;
  suggestion?: string;
  example?: string;
}

interface PersonaCheckAnalysisContext {
  overallScore?: string;
  summary?: string;
  painPointsAddressed?: {
    addressed?: string[];
    missed?: string[];
  };
  languageMatch?: {
    rating?: string;
    observations?: string[];
  };
  emotionalTerritory?: string[];
  recommendations?: PersonaCheckRecommendation[];
}

interface PersonaCheckRewriteRequest {
  /** Original copy as an HTML string (from editor.getHTML() or the selection slice). */
  html: string;
  persona: PersonaPayload;
  analysis?: PersonaCheckAnalysisContext;
  /** Persona UUID — used for logging only; persona data is client-serialized. */
  personaId?: string;
  /** Project UUID — used for logging only. */
  projectId?: string;
}

interface PersonaCheckRewriteResponse {
  /** Rewritten copy as an HTML string, with the input's tag structure preserved. */
  rewrittenHtml: string;
  personaName: string;
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

function buildPersonaContext(persona: PersonaPayload): string {
  const safe = (value: string | undefined): string =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : '(not specified)';

  return `Name: ${safe(persona.name)}
Demographics: ${safe(persona.demographics)}
Psychographics: ${safe(persona.psychographics)}
Pain Points: ${safe(persona.painPoints)}
Language Patterns: ${safe(persona.languagePatterns)}
Goals & Aspirations: ${safe(persona.goals)}`;
}

/**
 * Format the prior analysis as a bullet list of issues to fix.
 *
 * Pulls from three signal sources in the persona-check result:
 *   1. recommendations — the model's explicit "fix this" items (issue + suggestion + optional example)
 *   2. painPointsAddressed.missed — pain points the original copy skipped
 *   3. languageMatch.observations — only when the rating is Weak or Moderate
 *      (at Strong, observations are praise, not fix targets)
 */
function buildIssuesList(analysis: PersonaCheckAnalysisContext | undefined): string {
  if (!analysis) {
    return '(no specific issues flagged — speak to the persona throughout)';
  }

  const sections: string[] = [];

  if (Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0) {
    const recs = analysis.recommendations
      .map((rec) => {
        const issue = typeof rec.issue === 'string' ? rec.issue.trim() : '';
        const suggestion = typeof rec.suggestion === 'string' ? rec.suggestion.trim() : '';
        const example =
          typeof rec.example === 'string' && rec.example.trim().length > 0
            ? rec.example.trim()
            : '';
        if (!issue && !suggestion) return null;
        const parts = [issue && `Issue: ${issue}`, suggestion && `Fix: ${suggestion}`]
          .filter(Boolean)
          .join(' — ');
        return example ? `- ${parts} (example: ${example})` : `- ${parts}`;
      })
      .filter((line): line is string => line !== null);

    if (recs.length > 0) {
      sections.push(`Recommendations:\n${recs.join('\n')}`);
    }
  }

  const missed = analysis.painPointsAddressed?.missed;
  if (Array.isArray(missed) && missed.length > 0) {
    sections.push(
      `Pain points the original missed (address these):\n${missed.map((m) => `- ${m}`).join('\n')}`
    );
  }

  const langObs = analysis.languageMatch?.observations;
  const langRating = analysis.languageMatch?.rating;
  if (
    Array.isArray(langObs) &&
    langObs.length > 0 &&
    (langRating === 'Weak' || langRating === 'Moderate')
  ) {
    sections.push(
      `Language observations to act on:\n${langObs.map((o) => `- ${o}`).join('\n')}`
    );
  }

  if (sections.length === 0) {
    return '(no specific issues flagged — speak to the persona throughout)';
  }

  return sections.join('\n\n');
}

/**
 * Build the user-turn prompt. Original HTML, issues, and persona context are
 * inlined here (vs. the system prompt) so the model receives them together
 * with the explicit rewrite instruction — same pattern as brand-check-rewrite.
 */
function buildUserPrompt(
  originalHtml: string,
  persona: PersonaPayload,
  analysis: PersonaCheckAnalysisContext | undefined
): string {
  const personaContext = buildPersonaContext(persona);
  const issues = buildIssuesList(analysis);

  return `You previously analyzed a piece of HTML copy against a target persona and identified specific issues. Now rewrite the copy to speak more directly to this persona, while preserving the EXACT HTML structure.

CRITICAL FORMATTING RULES:
1. Preserve ALL HTML tags from the original — every <h1>, <h2>, <h3>, <p>, <ol>, <ul>, <li>, <strong>, <em>, <u>, <br>, and any other structural tags.
2. Maintain the same document structure — same number of sections, same heading hierarchy, same list items.
3. Only change the TEXT CONTENT inside tags. Do not add new tags, remove existing tags, or restructure the document.
4. If a heading said "Section 1" in the original, the rewritten version should still have a heading at the same level with similar intent.
5. Preserve approximate length within each section — do not expand or collapse content dramatically.

ORIGINAL HTML:
"""
${originalHtml}
"""

IDENTIFIED ISSUES TO FIX:
${issues}

TARGET PERSONA:
${personaContext}

Rewrite the HTML now. Address the persona's pain points directly. Use language patterns this persona responds to. Avoid language patterns this persona tunes out. Preserve every HTML tag and the document structure. Return ONLY the rewritten HTML — no preamble, no code fences, no explanation. Just the HTML starting with the first tag.`;
}

/**
 * System prompt — kept short; the heavy lifting is in the user prompt which
 * carries the original HTML, issues, and persona context together.
 */
const SYSTEM_PROMPT = `You are a senior audience-focused copywriter with 20+ years of experience rewriting HTML copy to speak directly to a specific target persona.

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
        feature: 'persona-check-rewrite',
        cost_usd: costUsd,
      });

    if (error) {
      console.error('❌ Failed to log persona-check-rewrite usage:', error);
    } else {
      logger.log('📊 Persona check rewrite usage logged:', {
        userId: userId.substring(0, 8) + '...',
        model,
        tokens: inputTokens + outputTokens,
        cost: `$${costUsd.toFixed(6)}`,
      });
    }
  } catch (err) {
    console.error('❌ Exception logging persona-check-rewrite usage:', err);
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
 * Strip accidental code fences from Claude's response. Mirrors the
 * defensive cleanup in brand-check-rewrite exactly.
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
 * POST /api/persona-check-rewrite
 *
 * Returns an HTML rewrite of the input copy that speaks more directly to the
 * target persona. The output preserves the input's tag structure so TipTap
 * can insert it without losing headings, lists, or inline formatting.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<PersonaCheckRewriteResponse | ErrorResponse>> {
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

    let body: Partial<PersonaCheckRewriteRequest>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON', details: 'Please send valid JSON' },
        { status: 400 }
      );
    }

    const { html, persona, analysis, personaId, projectId } = body;

    if (!html || typeof html !== 'string') {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Missing "html" field',
          details: 'Provide the original copy as HTML (from editor.getHTML()) to rewrite',
        },
        { status: 400 }
      );
    }

    if (!persona || typeof persona !== 'object' || !persona.name) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing persona', details: 'No persona was provided' },
        { status: 400 }
      );
    }

    try {
      validateNotEmpty(html, 'HTML');
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
    const userPrompt = buildUserPrompt(html, persona as PersonaPayload, analysis);

    logger.log('📝 Persona check rewrite request:', {
      personaName: persona.name,
      personaId: personaId ? personaId.substring(0, 8) + '...' : undefined,
      projectId: projectId ? projectId.substring(0, 8) + '...' : undefined,
      htmlLength: html.length,
      hasAnalysis: !!analysis,
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

    logger.log('✅ Persona check rewrite complete:', {
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

    return NextResponse.json<PersonaCheckRewriteResponse>(
      {
        rewrittenHtml,
        personaName: persona.name,
        originalLength: html.length,
        newLength: rewrittenHtml.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logError(error, 'Persona Check Rewrite API');

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
