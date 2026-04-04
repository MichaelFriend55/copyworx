/**
 * @file app/api/competitive-analysis/route.ts
 * @description API route for analyzing competitor copy using Claude AI
 *
 * Accepts competitor text, copy type, and optional industry context,
 * then returns a structured competitive teardown in HTML format.
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

interface CompetitiveAnalysisRequest {
  text: string;
  copyType?: string;
  industryContext?: string;
}

interface CompetitiveAnalysisResponse {
  analysis: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Build the system prompt for competitive analysis
 */
function buildSystemPrompt(copyType: string, industryContext?: string): string {
  return `You are a senior copywriting strategist with 40 years of experience analyzing competitive messaging. You specialize in identifying what makes copy effective or ineffective, and providing actionable strategic insights.

Analyze the provided ${copyType} copy and deliver a structured competitive teardown.${industryContext ? ` The competitive context is: ${industryContext}.` : ''}

IMPORTANT FORMATTING RULES:
- Return your analysis in clean HTML using <h3>, <p>, <ul>, <li>, and <strong> tags
- Do NOT use markdown
- Be specific and actionable – cite actual phrases and elements from the copy
- Write as a strategic advisor, not a generic AI reviewer
- Focus on what a competing copywriter could LEARN and EXPLOIT from this analysis

Structure your response with these exact section headers:
<h3>📋 Messaging Strategy</h3>
<h3>💪 Strengths</h3>
<h3>⚠️ Weaknesses</h3>
<h3>🎯 Opportunities for You</h3>
<h3>💡 Key Takeaways</h3>

For Key Takeaways, provide 3-5 actionable bullet points.`;
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Log API usage to Supabase (fire-and-forget)
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
        feature: 'competitive-analysis',
        cost_usd: costUsd,
      });

    if (error) {
      console.error('❌ Failed to log competitive-analysis usage:', error);
    } else {
      logger.log('📊 Competitive analysis usage logged:', {
        userId: userId.substring(0, 8) + '...',
        model,
        tokens: inputTokens + outputTokens,
        cost: `$${costUsd.toFixed(6)}`,
      });
    }
  } catch (err) {
    console.error('❌ Exception logging competitive-analysis usage:', err);
  }
}

/**
 * Calculate cost based on Claude Sonnet 4 pricing: $3/1M input, $15/1M output
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/competitive-analysis
 *
 * Analyzes competitor copy and returns a strategic teardown in HTML
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<CompetitiveAnalysisResponse | ErrorResponse>> {
  try {
    // 1. Check usage limit
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

    // 2. Parse and validate request
    let body: Partial<CompetitiveAnalysisRequest>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON', details: 'Please send valid JSON' },
        { status: 400 }
      );
    }

    const { text, copyType, industryContext } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing "text" field', details: 'Paste the competitor copy you want to analyze' },
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
          details: validationError instanceof Error ? validationError.message : 'Provide valid text',
        },
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

    // 4. Call Claude
    const resolvedCopyType = copyType || 'marketing';
    const systemPrompt = buildSystemPrompt(resolvedCopyType, industryContext);
    const userPrompt = `Analyze this ${resolvedCopyType} copy:\n\n${text}`;

    logger.log('📝 Competitive analysis request:', {
      copyType: resolvedCopyType,
      textLength: text.length,
      hasIndustryContext: !!industryContext,
    });

    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 60 seconds')), 60000)
      ),
    ]);

    // 5. Extract response
    const analysis =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    if (!analysis) {
      logger.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { error: 'AI processing error', details: 'Empty response. Please try again.' },
        { status: 500 }
      );
    }

    logger.log('✅ Competitive analysis complete:', {
      responseLength: analysis.length,
    });

    // 6. Log usage
    if (userId) {
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const costUsd = calculateCost(inputTokens, outputTokens);

      logUsageToSupabase(userId, 'claude-sonnet-4-20250514', inputTokens, outputTokens, costUsd)
        .catch((err) => console.error('❌ Unexpected usage logging error:', err));
    }

    // 7. Return analysis
    return NextResponse.json<CompetitiveAnalysisResponse>({ analysis }, { status: 200 });
  } catch (error) {
    logError(error, 'Competitive Analysis API');

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
