/**
 * @file app/api/claude/route.ts
 * @description Centralized API route for Claude AI calls with usage tracking
 * 
 * This endpoint provides a single entry point for all Claude API interactions,
 * handling authentication, rate limiting (future), and automatic token usage logging.
 * 
 * Features:
 * - Automatic token usage logging to Supabase
 * - Cost calculation based on model pricing
 * - Feature-based tracking for analytics
 * - Graceful error handling (logging failures don't block responses)
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireUserId, getUserId, unauthorizedResponse } from '@/lib/utils/api-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported Claude models with their pricing
 */
type ClaudeModel = 
  | 'claude-sonnet-4-20250514'
  | 'claude-sonnet-4-5-20250929'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-haiku-20240307';

/**
 * Message role for Claude API
 */
type MessageRole = 'user' | 'assistant';

/**
 * Single message in conversation
 */
export interface ClaudeMessage {
  role: MessageRole;
  content: string;
}

// Alias for internal use
type Message = ClaudeMessage;

/**
 * Valid feature identifiers for usage tracking
 * Add new features here as they're implemented
 */
export type ClaudeFeature =
  | 'tone_shifter'
  | 'expand'
  | 'shorten'
  | 'rewrite_channel'
  | 'headline_generator'
  | 'brand_alignment'
  | 'persona_alignment'
  | 'analyze_document'
  | 'generate_template'
  | 'landing_page_hero'
  | 'sales_email'
  | 'brochure_section'
  | 'general';

/**
 * Request body structure
 */
export interface ClaudeRequest {
  /** Array of conversation messages */
  messages: Message[];
  /** System prompt for Claude */
  system?: string;
  /** Claude model to use (defaults to claude-sonnet-4-20250514) */
  model?: ClaudeModel;
  /** Maximum tokens in response */
  maxTokens?: number;
  /** Feature identifier for usage tracking (REQUIRED for analytics) */
  feature: ClaudeFeature;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
}

/**
 * Validate that feature is a known type
 */
function isValidFeature(feature: string): feature is ClaudeFeature {
  const validFeatures: ClaudeFeature[] = [
    'tone_shifter', 'expand', 'shorten', 'rewrite_channel',
    'headline_generator', 'brand_alignment', 'persona_alignment',
    'analyze_document', 'generate_template', 'landing_page_hero',
    'sales_email', 'brochure_section', 'general'
  ];
  return validFeatures.includes(feature as ClaudeFeature);
}

/**
 * Response body structure
 */
export interface ClaudeResponse {
  /** Generated text content */
  text: string;
  /** Model used for generation */
  model: string;
  /** Token usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Stop reason from Claude */
  stopReason: string | null;
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Model pricing configuration (USD per 1M tokens)
 */
interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Pricing for Claude models (USD per 1 million tokens)
 * Updated: January 2025
 * 
 * @see https://www.anthropic.com/pricing
 */
const MODEL_PRICING: Record<ClaudeModel, ModelPricing> = {
  'claude-sonnet-4-20250514': {
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
  },
  'claude-sonnet-4-5-20250929': {
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
  },
  'claude-3-5-sonnet-20241022': {
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
  },
  'claude-3-opus-20240229': {
    inputPerMillion: 15.00,
    outputPerMillion: 75.00,
  },
  'claude-3-haiku-20240307': {
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
  },
};

/** Default model to use if not specified */
const DEFAULT_MODEL: ClaudeModel = 'claude-sonnet-4-20250514';

/** Default max tokens if not specified */
const DEFAULT_MAX_TOKENS = 4096;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate cost in USD for a Claude API call
 * 
 * @param model - The Claude model used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD (up to 6 decimal places)
 */
function calculateCost(
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  
  // Round to 6 decimal places to match DECIMAL(10,6) in database
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Log API usage to Supabase
 * 
 * This function is fire-and-forget - it logs errors but doesn't throw.
 * API responses should not fail due to logging issues.
 * 
 * @param userId - Clerk user ID
 * @param model - Claude model used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param feature - Feature identifier
 * @param costUsd - Calculated cost in USD
 */
async function logUsageToSupabase(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  feature: string,
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
        feature,
        cost_usd: costUsd,
        // timestamp is auto-generated by database default
      });

    if (error) {
      logger.error('❌ Failed to log API usage:', error);
    } else {
      logger.log('📊 API usage logged:', {
        userId: userId.substring(0, 8) + '...',
        model,
        tokens: inputTokens + outputTokens,
        cost: `$${costUsd.toFixed(6)}`,
        feature,
      });
    }
  } catch (err) {
    // Log error but don't throw - this is fire-and-forget
    logger.error('❌ Exception logging API usage:', err);
  }
}

/**
 * Validate the Claude model is supported
 */
function isValidModel(model: string): model is ClaudeModel {
  return model in MODEL_PRICING;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/claude
 * 
 * Centralized Claude API endpoint with automatic usage tracking
 * 
 * @param request - Next.js request object
 * @returns JSON response with generated text and usage stats
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/claude', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *     system: 'You are a helpful assistant.',
 *     feature: 'chat',
 *   }),
 * });
 * ```
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ClaudeResponse | ErrorResponse>> {
  // Track start time for logging
  const startTime = Date.now();
  
  try {
    // ------------------------------------------------------------------------
    // 1. Authenticate user
    // ------------------------------------------------------------------------
    
    let userId: string;
    
    try {
      userId = await requireUserId();
    } catch (error) {
      return unauthorizedResponse();
    }

    // ------------------------------------------------------------------------
    // 2. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<ClaudeRequest>;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON with a "messages" array'
        },
        { status: 400 }
      );
    }

    const { 
      messages, 
      system, 
      model = DEFAULT_MODEL,
      maxTokens = DEFAULT_MAX_TOKENS,
      feature,
      temperature,
    } = body;

    // Validate feature (required for analytics tracking)
    if (!feature || typeof feature !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing "feature" field',
          details: 'Please provide a feature identifier (e.g., "tone_shifter", "expand", "general")'
        },
        { status: 400 }
      );
    }

    // Validate feature is a known type (warn but don't block for unknown features)
    const validatedFeature = isValidFeature(feature) ? feature : 'general';
    if (!isValidFeature(feature)) {
      logger.log(`⚠️ Unknown feature "${feature}", logging as "general"`);
    }

    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "messages" field',
          details: 'Please provide an array of messages with role and content'
        },
        { status: 400 }
      );
    }

    // Validate each message
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg.role || !msg.content) {
        return NextResponse.json<ErrorResponse>(
          { 
            error: `Invalid message at index ${i}`,
            details: 'Each message must have "role" and "content" fields'
          },
          { status: 400 }
        );
      }
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        return NextResponse.json<ErrorResponse>(
          { 
            error: `Invalid role at index ${i}`,
            details: 'Message role must be "user" or "assistant"'
          },
          { status: 400 }
        );
      }
    }

    // Validate model
    const selectedModel: ClaudeModel = isValidModel(model) ? model : DEFAULT_MODEL;

    // ------------------------------------------------------------------------
    // 3. Initialize Anthropic client
    // ------------------------------------------------------------------------
    
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

    const anthropic = new Anthropic({ apiKey });

    // ------------------------------------------------------------------------
    // 4. Call Claude API
    // ------------------------------------------------------------------------
    
    logger.log('🤖 Claude API request:', {
      userId: userId.substring(0, 8) + '...',
      model: selectedModel,
      messageCount: messages.length,
      feature: validatedFeature,
      hasSystemPrompt: !!system,
    });

    // Build request options
    const requestOptions: Anthropic.MessageCreateParams = {
      model: selectedModel,
      max_tokens: maxTokens,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Add optional parameters
    if (system) {
      requestOptions.system = system;
    }
    if (temperature !== undefined) {
      requestOptions.temperature = temperature;
    }

    // Call with timeout
    const response = await Promise.race([
      anthropic.messages.create(requestOptions),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`)),
          REQUEST_TIMEOUT_MS
        )
      ),
    ]);

    // ------------------------------------------------------------------------
    // 5. Extract response data
    // ------------------------------------------------------------------------
    
    const textContent = response.content.find(block => block.type === 'text');
    const text = textContent?.type === 'text' ? textContent.text.trim() : '';

    if (!text) {
      logger.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'Claude returned an empty response. Please try again.'
        },
        { status: 500 }
      );
    }

    // Extract usage statistics
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;

    // Calculate cost
    const costUsd = calculateCost(selectedModel, inputTokens, outputTokens);

    // ------------------------------------------------------------------------
    // 6. Log usage to Supabase (fire-and-forget)
    // ------------------------------------------------------------------------
    
    // Don't await - let it run in background
    logUsageToSupabase(
      userId,
      selectedModel,
      inputTokens,
      outputTokens,
      validatedFeature,
      costUsd
    ).catch(err => {
      // Extra safety net - should never throw but just in case
      logger.error('❌ Unexpected error in usage logging:', err);
    });

    // ------------------------------------------------------------------------
    // 7. Return response
    // ------------------------------------------------------------------------
    
    const duration = Date.now() - startTime;
    
    logger.log('✅ Claude API success:', {
      duration: `${duration}ms`,
      inputTokens,
      outputTokens,
      cost: `$${costUsd.toFixed(6)}`,
      responseLength: text.length,
    });

    return NextResponse.json<ClaudeResponse>(
      {
        text,
        model: selectedModel,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
        },
        stopReason: response.stop_reason,
      },
      { status: 200 }
    );

  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    
    const duration = Date.now() - startTime;
    
    logger.error('❌ Claude API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    });

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Request timeout',
          details: 'The request took too long to complete. Please try again with shorter content.'
        },
        { status: 408 }
      );
    }

    // Handle Anthropic-specific errors
    if (error instanceof Anthropic.APIError) {
      logger.error('Anthropic API Error:', {
        status: error.status,
        message: error.message,
      });

      let userMessage = 'AI service error. Please try again.';
      let statusCode = error.status || 500;
      
      switch (error.status) {
        case 400:
          userMessage = 'Invalid request. Please check your input and try again.';
          break;
        case 401:
        case 403:
          userMessage = 'Authentication error. Please contact support.';
          break;
        case 429:
          userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
          break;
        case 500:
        case 503:
          userMessage = 'AI service temporarily unavailable. Please try again in a moment.';
          break;
        case 529:
          userMessage = 'AI service is overloaded. Please try again in a few minutes.';
          break;
      }

      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI service error',
          details: userMessage
        },
        { status: statusCode }
      );
    }

    // Handle generic errors
    return NextResponse.json<ErrorResponse>(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred.'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - Usage Statistics
// ============================================================================

/**
 * GET /api/claude
 * 
 * Returns the current user's API usage statistics
 * 
 * @param request - Next.js request object
 * @returns JSON response with usage statistics
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Authenticate user
    const userId = await getUserId();
    
    if (!userId) {
      return unauthorizedResponse();
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json(
        { 
          error: 'Usage tracking not available',
          details: 'Database is not configured'
        },
        { status: 503 }
      );
    }

    // Get usage summary
    const { data: summary, error: summaryError } = await (supabaseAdmin
      .from('user_usage_summary') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get current month usage
    const { data: monthlyUsage, error: monthlyError } = await (supabaseAdmin
      .from('user_usage_current_month') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get today's usage
    const { data: dailyUsage, error: dailyError } = await (supabaseAdmin
      .from('user_usage_today') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    // Return statistics (with defaults for new users)
    return NextResponse.json({
      allTime: summary || {
        total_api_calls: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_tokens_used: 0,
        total_cost_usd: 0,
        last_api_call: null,
      },
      currentMonth: monthlyUsage || {
        api_calls_this_month: 0,
        input_tokens_this_month: 0,
        output_tokens_this_month: 0,
        total_tokens_this_month: 0,
        cost_this_month: 0,
        last_api_call: null,
      },
      today: dailyUsage || {
        api_calls_today: 0,
        tokens_today: 0,
        cost_today: 0,
      },
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }

    logger.error('❌ Error fetching usage stats:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch usage statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
