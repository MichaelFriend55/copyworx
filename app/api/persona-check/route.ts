/**
 * @file app/api/persona-check/route.ts
 * @description API route for analyzing copy fit against a target persona using Claude AI
 *
 * Accepts copy text plus a client-serialized persona payload and returns a
 * structured JSON persona-check report. Used by the Persona Check
 * right-sidebar tool to show alignment strength, pain points addressed vs.
 * missed, language match, emotional territory, and specific recommendations.
 *
 * Pattern mirrors app/api/brand-check/route.ts exactly:
 *   getUserId() → checkUserWithinLimit() → build prompt → Anthropic call →
 *   fire-and-forget logUsageToSupabase() → return JSON.
 *
 * Persona payload is CLIENT-SERIALIZED (not loaded from Supabase) to preserve
 * architectural parity with Brand Check, which is also stateless with respect
 * to its brand voice payload. personaId and projectId are accepted for
 * logging/validation only.
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

/**
 * Serialized persona payload sent by the client. Mirrors the shape of the
 * client-side Persona interface (lib/types/project.ts) minus id/timestamps/
 * photoUrl which aren't useful to the model.
 */
interface PersonaPayload {
  name: string;
  demographics: string;
  psychographics: string;
  painPoints: string;
  languagePatterns: string;
  goals: string;
}

interface PersonaCheckRequest {
  text: string;
  persona: PersonaPayload;
  /** Persona UUID — used for logging only; persona data is client-serialized. */
  personaId?: string;
  /** Project UUID — used for logging only. */
  projectId?: string;
}

/**
 * Overall alignment bucket returned by the model. These are the only values
 * the client uses to color the alignment badge (green, yellow, orange, red).
 */
type OverallScore =
  | 'Strongly Aligned'
  | 'Moderately Aligned'
  | 'Weakly Aligned'
  | 'Misaligned';

type LanguageMatchRating = 'Strong' | 'Moderate' | 'Weak';

interface PersonaCheckRecommendation {
  issue: string;
  suggestion: string;
  example?: string;
}

interface PersonaCheckAnalysis {
  overallScore: OverallScore;
  summary: string;
  painPointsAddressed: {
    addressed: string[];
    missed: string[];
  };
  languageMatch: {
    rating: LanguageMatchRating;
    observations: string[];
  };
  emotionalTerritory: string[];
  recommendations: PersonaCheckRecommendation[];
}

interface PersonaCheckResponse {
  analysis: PersonaCheckAnalysis;
  personaName: string;
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
 * Build the persona context block for the system prompt.
 *
 * Fields with empty strings are rendered as "(not specified)" so the model
 * never sees bare colons — keeps the prompt readable and avoids accidental
 * hallucinated defaults.
 */
function buildPersonaContext(persona: PersonaPayload): string {
  const safe = (value: string | undefined): string =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : '(not specified)';

  return `TARGET PERSONA: ${safe(persona.name)}
Demographics: ${safe(persona.demographics)}
Psychographics: ${safe(persona.psychographics)}
Pain Points: ${safe(persona.painPoints)}
Language Patterns: ${safe(persona.languagePatterns)}
Goals & Aspirations: ${safe(persona.goals)}`;
}

/**
 * Build the system prompt for persona-check analysis.
 */
function buildSystemPrompt(persona: PersonaPayload): string {
  const personaContext = buildPersonaContext(persona);

  return `You are a senior copywriter and audience strategist. You are analyzing whether a piece of copy actually speaks to a specific target persona.

Your job: produce a structured diagnostic about persona fit. Be direct. Reference the persona's specific pain points, language patterns, and emotional triggers. If the copy doesn't address what this persona cares about, say so specifically — don't be vague. Do not be a pep talk. If the copy lands, say so briefly and move on.

${personaContext}

CRITICAL OUTPUT RULES:
- Return ONLY a single valid JSON object. No markdown, no code fences, no prose outside the JSON.
- Do NOT wrap the JSON in \`\`\`json fences.
- All string arrays must be non-null; use [] when nothing applies.
- Be specific and concrete — cite actual phrases from the copy, not generic advice.

JSON SCHEMA (return exactly this shape):
{
  "overallScore": "Strongly Aligned" | "Moderately Aligned" | "Weakly Aligned" | "Misaligned",
  "summary": "<one-sentence diagnostic summary>",
  "painPointsAddressed": {
    "addressed": ["<pain point this copy addresses>", ...],
    "missed": ["<pain point this copy could have addressed but didn't>", ...]
  },
  "languageMatch": {
    "rating": "Strong" | "Moderate" | "Weak",
    "observations": ["<specific observation about language use>", ...]
  },
  "emotionalTerritory": ["<observation about tone fit>", ...],
  "recommendations": [
    {
      "issue": "<what's off>",
      "suggestion": "<specific fix>",
      "example": "<optional — a better version of the phrase>"
    }, ...
  ]
}

BUCKET GUIDANCE:
- Strongly Aligned: Copy speaks directly to this persona; pain points addressed; language lands.
- Moderately Aligned: Mostly on-target but missing some pain points or drifting in language.
- Weakly Aligned: Recognizable misses in pain points, language, or emotional tone.
- Misaligned: Copy reads like it was written for a different audience entirely.`;
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Log API usage to Supabase (fire-and-forget). Mirrors brand-check exactly.
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
        feature: 'persona-check',
        cost_usd: costUsd,
      });

    if (error) {
      console.error('❌ Failed to log persona-check usage:', error);
    } else {
      logger.log('📊 Persona check usage logged:', {
        userId: userId.substring(0, 8) + '...',
        model,
        tokens: inputTokens + outputTokens,
        cost: `$${costUsd.toFixed(6)}`,
      });
    }
  } catch (err) {
    console.error('❌ Exception logging persona-check usage:', err);
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

const VALID_SCORES: readonly OverallScore[] = [
  'Strongly Aligned',
  'Moderately Aligned',
  'Weakly Aligned',
  'Misaligned',
];

const VALID_LANGUAGE_RATINGS: readonly LanguageMatchRating[] = ['Strong', 'Moderate', 'Weak'];

/**
 * Extract and validate the JSON analysis from Claude's raw response.
 *
 * Same defensive parsing as brand-check: strip code fences, slice on outer
 * braces, coerce every field to the expected shape so downstream consumers
 * never see null/undefined.
 */
function parseAnalysis(raw: string): PersonaCheckAnalysis {
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

  const toRecommendations = (value: unknown): PersonaCheckRecommendation[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item): PersonaCheckRecommendation | null => {
        if (!item || typeof item !== 'object') return null;
        const obj = item as Record<string, unknown>;
        const issue = typeof obj.issue === 'string' ? obj.issue.trim() : '';
        const suggestion = typeof obj.suggestion === 'string' ? obj.suggestion.trim() : '';
        if (!issue && !suggestion) return null;
        const example =
          typeof obj.example === 'string' && obj.example.trim().length > 0
            ? obj.example.trim()
            : undefined;
        return { issue, suggestion, example };
      })
      .filter((r): r is PersonaCheckRecommendation => r !== null);
  };

  const score: OverallScore = VALID_SCORES.includes(parsed.overallScore)
    ? parsed.overallScore
    : 'Moderately Aligned';

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

  const painPointsRaw =
    parsed.painPointsAddressed && typeof parsed.painPointsAddressed === 'object'
      ? (parsed.painPointsAddressed as Record<string, unknown>)
      : {};

  const languageMatchRaw =
    parsed.languageMatch && typeof parsed.languageMatch === 'object'
      ? (parsed.languageMatch as Record<string, unknown>)
      : {};

  const languageRating: LanguageMatchRating = VALID_LANGUAGE_RATINGS.includes(
    languageMatchRaw.rating as LanguageMatchRating
  )
    ? (languageMatchRaw.rating as LanguageMatchRating)
    : 'Moderate';

  return {
    overallScore: score,
    summary,
    painPointsAddressed: {
      addressed: toStringArray(painPointsRaw.addressed),
      missed: toStringArray(painPointsRaw.missed),
    },
    languageMatch: {
      rating: languageRating,
      observations: toStringArray(languageMatchRaw.observations),
    },
    emotionalTerritory: toStringArray(parsed.emotionalTerritory),
    recommendations: toRecommendations(parsed.recommendations),
  };
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/persona-check
 *
 * Returns a structured JSON report on how well the provided copy speaks to
 * the given persona.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<PersonaCheckResponse | ErrorResponse>> {
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

    let body: Partial<PersonaCheckRequest>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON', details: 'Please send valid JSON' },
        { status: 400 }
      );
    }

    const { text, persona, personaId, projectId } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing "text" field', details: 'Provide the copy you want to check' },
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
    const systemPrompt = buildSystemPrompt(persona as PersonaPayload);
    const userPrompt = `COPY TO ANALYZE:\n"""\n${text}\n"""\n\nReturn the JSON report now.`;

    logger.log('📝 Persona check request:', {
      personaName: persona.name,
      personaId: personaId ? personaId.substring(0, 8) + '...' : undefined,
      projectId: projectId ? projectId.substring(0, 8) + '...' : undefined,
      textLength: text.length,
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

    let analysis: PersonaCheckAnalysis;
    try {
      analysis = parseAnalysis(rawResponse);
    } catch (parseError) {
      logError(parseError, 'Persona Check JSON parse');
      logger.error('❌ Failed to parse persona-check JSON response:', {
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

    logger.log('✅ Persona check complete:', {
      score: analysis.overallScore,
      addressed: analysis.painPointsAddressed.addressed.length,
      missed: analysis.painPointsAddressed.missed.length,
      languageRating: analysis.languageMatch.rating,
      recommendations: analysis.recommendations.length,
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

    return NextResponse.json<PersonaCheckResponse>(
      {
        analysis,
        personaName: persona.name,
        textLength: text.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logError(error, 'Persona Check API');

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
