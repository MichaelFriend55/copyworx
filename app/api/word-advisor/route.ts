/**
 * @file app/api/word-advisor/route.ts
 * @description API route for MY WORD ADVISOR – combines dictionary, thesaurus,
 * and copywriting intelligence. Returns alternative words with rationales,
 * brand voice matching, and persona insights powered by Claude AI.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateNotEmpty, logError } from '@/lib/utils/error-handling';
import { logger } from '@/lib/utils/logger';
import { getUserId, checkUserWithinLimit, usageLimitExceededResponse } from '@/lib/utils/api-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// ============================================================================
// Type Definitions
// ============================================================================

interface WordAdvisorRequest {
  word: string;
  sentence: string;
  paragraph: string;
  brandVoice?: {
    personality: string;
    tone: string;
    values: string;
  };
  persona?: {
    name: string;
    role: string;
    painPoints: string;
    decisionCriteria: string;
  };
}

interface WordAlternative {
  word: string;
  strength: 'stronger' | 'similar' | 'softer';
  rationale: string;
}

interface WordAdvisorResponse {
  definition: string;
  alternatives: WordAlternative[];
  brandVoiceMatch?: string;
  personaInsight?: string;
  contextNote: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SYSTEM_PROMPT = `You are a senior copywriting advisor with 40 years of experience in marketing communications. You help writers choose the most effective words for their copy.

You will be given a word (or short phrase), the sentence it appears in, and the surrounding paragraph. You may also receive Brand Voice settings and Persona details.

Respond in this exact JSON format and nothing else – no markdown, no backticks, no preamble:

{
  "definition": "A concise, marketing-relevant definition of the word. Not a dictionary definition – explain what this word communicates to a reader and the feeling it evokes.",
  "alternatives": [
    {
      "word": "alternative word or short phrase",
      "strength": "stronger" | "similar" | "softer",
      "rationale": "2-3 sentences explaining why a copywriter might choose this word instead. Reference persuasion, emotional impact, audience perception, or clarity. Be specific and practical, not academic."
    }
  ],
  "brandVoiceMatch": "Only include this field if Brand Voice data was provided. 1-2 sentences on which alternatives best align with the defined brand personality and tone.",
  "personaInsight": "Only include this field if Persona data was provided. 1-2 sentences on which alternatives would resonate most with this specific audience based on their role, pain points, and decision criteria.",
  "contextNote": "1 sentence about how the word functions in the given sentence – is it doing heavy lifting, or is it filler? Does the sentence structure support a swap, or would changing this word require reworking the phrase?"
}`;

// ============================================================================
// Helpers
// ============================================================================

function buildUserPrompt(request: WordAdvisorRequest): string {
  const { word, sentence, paragraph, brandVoice, persona } = request;

  let prompt = `Word: "${word}"
Sentence: "${sentence}"
Paragraph: "${paragraph}"`;

  if (brandVoice) {
    prompt += `\nBrand Voice – Personality: ${brandVoice.personality}, Tone: ${brandVoice.tone}, Values: ${brandVoice.values}`;
  }

  if (persona) {
    prompt += `\nTarget Persona – Name: ${persona.name}, Role: ${persona.role}, Pain Points: ${persona.painPoints}, Decision Criteria: ${persona.decisionCriteria}`;
  }

  prompt += '\n\nProvide 5-8 alternative words with copywriting rationales.';

  return prompt;
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

async function logUsageToSupabase(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number
): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
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
        feature: 'word_advisor',
        cost_usd: costUsd,
      });

    if (error) {
      console.error('❌ Failed to log word-advisor usage:', error);
    }
  } catch (err) {
    console.error('❌ Exception logging word-advisor usage:', err);
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<WordAdvisorResponse | ErrorResponse>> {
  try {
    // 1. Auth and usage limit
    const userId = await getUserId();

    if (userId) {
      const usageCheck = await checkUserWithinLimit(userId);
      if (!usageCheck.withinLimit) {
        return usageLimitExceededResponse(usageCheck.totalCost);
      }
    }

    // 2. Parse and validate request
    let body: Partial<WordAdvisorRequest>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { word, sentence, paragraph } = body;

    if (!word || typeof word !== 'string' || !word.trim()) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing or invalid "word" field' },
        { status: 400 }
      );
    }

    if (!sentence || typeof sentence !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing or invalid "sentence" field' },
        { status: 400 }
      );
    }

    if (!paragraph || typeof paragraph !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing or invalid "paragraph" field' },
        { status: 400 }
      );
    }

    try {
      validateNotEmpty(word, 'Word');
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { error: error instanceof Error ? error.message : 'Empty word provided' },
        { status: 400 }
      );
    }

    // 3. Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      logger.error('❌ ANTHROPIC_API_KEY not found');
      return NextResponse.json<ErrorResponse>(
        { error: 'Server configuration error', details: 'API key not configured.' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // 4. Build prompt and call Claude
    const advisorRequest: WordAdvisorRequest = {
      word: word.trim(),
      sentence: sentence.trim(),
      paragraph: paragraph.trim(),
      brandVoice: body.brandVoice,
      persona: body.persona,
    };

    const userPrompt = buildUserPrompt(advisorRequest);

    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      ),
    ]);

    // 5. Parse response
    const rawText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : '';

    if (!rawText) {
      return NextResponse.json<ErrorResponse>(
        { error: 'AI returned an empty response' },
        { status: 500 }
      );
    }

    let parsed: WordAdvisorResponse;
    try {
      parsed = JSON.parse(rawText) as WordAdvisorResponse;
    } catch {
      logger.error('❌ Failed to parse Claude JSON response:', rawText.substring(0, 200));
      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to parse AI response', details: 'The AI returned an invalid format. Please try again.' },
        { status: 500 }
      );
    }

    // 6. Log usage
    if (userId) {
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const costUsd = calculateCost(inputTokens, outputTokens);

      logUsageToSupabase(userId, 'claude-sonnet-4-20250514', inputTokens, outputTokens, costUsd)
        .catch(err => console.error('❌ Unexpected error in word-advisor usage logging:', err));
    }

    // 7. Return parsed result
    return NextResponse.json<WordAdvisorResponse>(parsed, { status: 200 });

  } catch (error) {
    logError(error, 'Word advisor API');

    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Request timeout', details: 'Please try again.' },
        { status: 408 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      let userMessage = 'AI service error. Please try again.';
      if (error.status === 429) userMessage = 'Rate limit exceeded. Please wait and try again.';
      else if (error.status === 401 || error.status === 403) userMessage = 'Authentication error. Please contact support.';
      else if (error.status === 500 || error.status === 503) userMessage = 'AI service temporarily unavailable.';

      return NextResponse.json<ErrorResponse>(
        { error: 'AI service error', details: userMessage },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json<ErrorResponse>(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
