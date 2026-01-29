/**
 * @file app/api/expand/route.ts
 * @description API route for expanding copy using Claude AI
 * 
 * This endpoint accepts text and uses Claude to expand it by adding
 * detail, examples, benefits, and supporting information.
 * 
 * Includes automatic usage logging to track API costs per user.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateTextLength, validateNotEmpty, logError } from '@/lib/utils/error-handling';
import { logger } from '@/lib/utils/logger';
// Imports for usage logging and limit checking
import { getUserId, checkUserWithinLimit, usageLimitExceededResponse } from '@/lib/utils/api-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Request body structure
 */
interface ExpandRequest {
  text: string;
}

/**
 * Response body structure
 */
interface ExpandResponse {
  expandedText: string;
  originalLength: number;
  newLength: number;
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * System prompt that establishes Claude's role and expertise
 */
const SYSTEM_PROMPT = `You are an expert copywriter with 40 years of experience. Your job is to expand copy by adding detail, examples, benefits, and supporting information while maintaining the original message and tone.

CRITICAL OUTPUT FORMAT:
You must output valid HTML that preserves the original structure while expanding the content.
Use only these tags:
- <h2> or <h3> for headings and subject lines
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for bold emphasis
- <em> for italic emphasis

HTML RULES:
- Preserve the original document structure (headings stay headings, bullets stay bullets)
- Expand ONLY the content/detail, NOT the structure
- If input has bullets, output must have bullets (just more detailed)
- If input has headings, output must have headings
- Output ONLY HTML, no markdown, no preamble
- Do NOT add blank lines between tags
- Add detail, examples, benefits, and supporting information

When expanding:
- Keep the original core message and tone intact
- Add relevant details, examples, and supporting facts
- Expand on benefits and value propositions
- Include sensory details and specific scenarios when appropriate
- Make the copy more comprehensive and engaging
- Maintain readability and flow
- Do NOT change the fundamental message or claims
- Do NOT add information that contradicts the original

Return ONLY the expanded HTML, no explanations or preambles.`;

/**
 * Generates a user prompt with the text to expand
 */
function buildUserPrompt(text: string): string {
  return `Expand the following copy by adding detail, examples, benefits, and supporting information. Maintain the original message and tone, but make it more comprehensive and engaging.

CRITICAL: Output must be valid HTML with preserved structure. If the input has headings, keep them as headings. If it has bullets, keep them as bullets (just expanded). Do not add a preamble or explanation - just return the expanded HTML.

Example - expanding while preserving structure:
INPUT:
<p>Our coffee is bold and energizing.</p>
OUTPUT:
<p>Our coffee delivers a <strong>bold, robust flavor profile</strong> that awakens your senses with every sip. The carefully selected beans provide a powerful <strong>energizing kick</strong> that fuels your morning and keeps you focused throughout your entire day, delivering sustained energy without the crash.</p>

ORIGINAL COPY:
${text}

EXPANDED HTML:`;
}

// ============================================================================
// Usage Logging (ADDED)
// ============================================================================

/**
 * Log API usage to Supabase for cost tracking
 * 
 * This function is fire-and-forget - logs errors but doesn't throw.
 * API responses should NOT fail due to logging issues.
 * 
 * @param userId - Clerk user ID
 * @param model - Claude model used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param costUsd - Calculated cost in USD
 */
async function logUsageToSupabase(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number
): Promise<void> {
  // Skip logging if Supabase is not configured
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
        feature: 'expand',
        cost_usd: costUsd,
        // timestamp is auto-generated by database default
      });

    if (error) {
      // Log error but don't throw - API response should still succeed
      console.error('❌ Failed to log expand usage:', error);
    } else {
      logger.log('📊 Expand usage logged:', {
        userId: userId.substring(0, 8) + '...',
        model,
        tokens: inputTokens + outputTokens,
        cost: `$${costUsd.toFixed(6)}`,
      });
    }
  } catch (err) {
    // Log error but don't throw - this is fire-and-forget
    console.error('❌ Exception logging expand usage:', err);
  }
}

/**
 * Calculate cost in USD for a Claude API call
 * Based on Claude Sonnet 4 pricing: $3/1M input, $15/1M output
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  // Round to 6 decimal places for precision
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/expand
 * 
 * Expands copy using Claude AI
 * 
 * @param request - Next.js request object containing text
 * @returns JSON response with expanded text or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<ExpandResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Check usage limit BEFORE processing request
    // ------------------------------------------------------------------------
    
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
    
    // ------------------------------------------------------------------------
    // 2. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<ExpandRequest>;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON with a "text" field'
        },
        { status: 400 }
      );
    }

    const { text } = body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "text" field',
          details: 'Please provide the copy to expand as a string in the "text" field'
        },
        { status: 400 }
      );
    }

    // Validate text
    try {
      validateNotEmpty(text, 'Text');
      validateTextLength(text, 'Text');
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid text',
          details: error instanceof Error ? error.message : 'Please provide valid text to expand'
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // 2. Initialize Anthropic client
    // ------------------------------------------------------------------------
    
    // Read API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      logger.error('❌ ANTHROPIC_API_KEY not found in environment variables');
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Server configuration error',
          details: 'API key not configured. Please contact support.'
        },
        { status: 500 }
      );
    }

    // Create Anthropic client instance
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // ------------------------------------------------------------------------
    // 3. Call Claude API to expand the text
    // ------------------------------------------------------------------------
    
    logger.log('📝 Expand request:', {
      originalLength: text.length,
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });

    // Build the user prompt with the text to expand
    const userPrompt = buildUserPrompt(text);

    // Call Claude's Messages API with timeout
    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Latest Claude Sonnet model
        max_tokens: 4000, // Maximum length of response
        system: SYSTEM_PROMPT, // System prompt defining Claude's role
        messages: [
          {
            role: 'user',
            content: userPrompt, // The actual expansion request
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
      ),
    ]);

    // ------------------------------------------------------------------------
    // 4. Extract and process the response
    // ------------------------------------------------------------------------
    
    // Claude returns an array of content blocks; we want the text from the first one
    const expandedText = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '';

    if (!expandedText) {
      logger.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'Claude returned an empty response. Please try again.'
        },
        { status: 500 }
      );
    }

    // Calculate text lengths for comparison
    const originalLength = text.length;
    const newLength = expandedText.length;

    logger.log('✅ Expand successful:', {
      originalLength,
      newLength,
      expansionPercent: ((newLength - originalLength) / originalLength * 100).toFixed(1) + '%',
      preview: expandedText.substring(0, 100) + (expandedText.length > 100 ? '...' : ''),
    });

    // ------------------------------------------------------------------------
    // 5. Log usage to Supabase
    // ------------------------------------------------------------------------
    
    // userId was already retrieved at start for limit check
    if (userId) {
      // Extract token usage from Claude's response
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      
      // Calculate cost based on Claude Sonnet 4 pricing
      const costUsd = calculateCost(inputTokens, outputTokens);
      
      // Fire-and-forget logging - don't await, let it run in background
      // This ensures logging failures don't slow down or break the API response
      logUsageToSupabase(
        userId,
        'claude-sonnet-4-20250514', // Model used in this route
        inputTokens,
        outputTokens,
        costUsd
      ).catch(err => {
        // Extra safety net - should never throw but just in case
        console.error('❌ Unexpected error in expand usage logging:', err);
      });
    } else {
      logger.log('⚠️ No user ID found, skipping usage logging for expand');
    }

    // ------------------------------------------------------------------------
    // 6. Return the expanded text
    // ------------------------------------------------------------------------
    
    return NextResponse.json<ExpandResponse>(
      {
        expandedText,
        originalLength,
        newLength,
      },
      { status: 200 }
    );

  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    
    logError(error, 'Expand API');

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Request timeout',
          details: 'The request took too long. Please try again with shorter text.'
        },
        { status: 408 }
      );
    }

    // Handle Anthropic-specific errors
    if (error instanceof Anthropic.APIError) {
      let userMessage = 'AI service error. Please try again.';
      
      if (error.status === 429) {
        userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.status === 500 || error.status === 503) {
        userMessage = 'AI service temporarily unavailable. Please try again in a moment.';
      }

      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI service error',
          details: userMessage
        },
        { status: error.status || 500 }
      );
    }

    // Handle generic errors
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}
