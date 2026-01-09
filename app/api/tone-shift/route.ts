/**
 * @file app/api/tone-shift/route.ts
 * @description API route for rewriting copy in different tones using Claude AI
 * 
 * This endpoint accepts text and a target tone, then uses Claude to rewrite
 * the copy while preserving the core message and improving clarity.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateTextLength, validateNotEmpty, logError } from '@/lib/utils/error-handling';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported tone types for copy rewriting
 */
type ToneType = 'professional' | 'casual' | 'urgent' | 'friendly' | 'techy' | 'playful';

/**
 * Request body structure
 */
interface ToneShiftRequest {
  text: string;
  tone: ToneType;
}

/**
 * Response body structure
 */
interface ToneShiftResponse {
  rewrittenText: string;
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

const VALID_TONES: ToneType[] = ['professional', 'casual', 'urgent', 'friendly', 'techy', 'playful'];

/**
 * System prompt that establishes Claude's role and expertise
 * This tells Claude to act as an expert copywriter with decades of experience
 */
const SYSTEM_PROMPT = `You are an expert copywriter with 40 years of experience. Your job is to rewrite copy to match a specific tone while preserving the core message, structure, and formatting.

CRITICAL OUTPUT FORMAT:
You MUST output valid HTML that preserves the original structure while changing the tone.
Use ONLY these tags:
- <h2> or <h3> for headings and subject lines
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for bold emphasis
- <em> for italic emphasis
- <br> for line breaks within paragraphs (use sparingly)

HTML RULES:
1. Preserve the original document structure (headings stay headings, bullets stay bullets)
2. Change ONLY the tone/voice/word choice, NOT the structure
3. If input has bullets, output must have bullets
4. If input has headings, output must have headings
5. Output ONLY HTML, no markdown, no preamble
6. Do NOT add blank lines between tags - write consecutively: <p>Text</p><p>Next</p>
7. Keep emojis if appropriate for the tone (especially Playful and Casual)
8. Preserve bold/italic on key phrases where appropriate

Example - changing Professional to Playful while preserving structure:
INPUT (plain or HTML):
Subject: New Product Launch
We are excited to announce our new product.
• Advanced features
• Competitive pricing

OUTPUT (HTML):
<h3>Subject: 🎉 Get Ready to Fall in Love with Our New Product!</h3>
<p>Guess what? We just dropped something amazing that's about to make your day!</p>
<ul>
<li>Features so cool they'll make you do a happy dance</li>
<li>Prices that won't make your wallet cry</li>
</ul>

When rewriting:
- Maintain the original meaning and key points
- Adjust word choice, sentence structure, and phrasing to match the target tone
- Keep the length roughly similar (±20% is acceptable)
- Improve clarity and readability
- Remove redundancies and awkward phrasing
- Do NOT add new information or claims not in the original

Return ONLY the HTML content, no explanations or preambles.`;

/**
 * Generates a user prompt with the text to rewrite and target tone
 */
function buildUserPrompt(text: string, tone: ToneType): string {
  const toneDescriptions: Record<ToneType, string> = {
    professional: 'Professional tone: formal, polished, business-appropriate, authoritative',
    casual: 'Casual tone: conversational, friendly, relaxed, approachable',
    urgent: 'Urgent tone: time-sensitive, compelling, action-oriented, creates FOMO',
    friendly: 'Friendly tone: warm, personable, welcoming, builds rapport',
    techy: `Technical, precise tone. Use:
- Technical terminology where appropriate
- Specific metrics and data points
- Clear, accurate language
- Demonstrate expertise and precision
- Focus on capabilities and specifications
- Use industry-standard terms
- Maintain clarity while being technical

Avoid: Jargon for jargon's sake, overly complex explanations, condescension`,
    playful: `Playful, fun tone. Use:
- Energetic, upbeat language
- Playful expressions and word choices
- Light humor where appropriate
- Conversational and engaging style
- Creative analogies or metaphors
- Enthusiasm without being annoying
- Keep it professional enough for the context

Avoid: Forced humor, being overly silly, losing the core message`,
  };

  return `Rewrite the following copy in a ${tone} tone while preserving its structure.

TARGET TONE: ${toneDescriptions[tone]}

ORIGINAL COPY:
${text}

REWRITTEN COPY (HTML only):`;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/tone-shift
 * 
 * Rewrites copy in a different tone using Claude AI
 * 
 * @param request - Next.js request object containing text and tone
 * @returns JSON response with rewritten text or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<ToneShiftResponse | ErrorResponse>> {
  try {// DEBUG: Check if API key is loaded
    console.log('🔍 Environment check:', {
      hasKey: !!process.env.ANTHROPIC_API_KEY,
      firstChars: process.env.ANTHROPIC_API_KEY?.substring(0, 15) || 'MISSING'
    });
    
    // ------------------------------------------------------------------------
    // 1. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<ToneShiftRequest>;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON with "text" and "tone" fields'
        },
        { status: 400 }
      );
    }

    const { text, tone } = body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "text" field',
          details: 'Please provide the copy to rewrite as a string in the "text" field'
        },
        { status: 400 }
      );
    }

    if (!tone || typeof tone !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "tone" field',
          details: `Please provide a tone as one of: ${VALID_TONES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate tone is one of the allowed values
    if (!VALID_TONES.includes(tone as ToneType)) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid tone value',
          details: `Tone must be one of: ${VALID_TONES.join(', ')}. Received: "${tone}"`
        },
        { status: 400 }
      );
    }

    // Validate text is not empty
    try {
      validateNotEmpty(text, 'Text');
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Empty text provided',
          details: error instanceof Error ? error.message : 'Please provide non-empty text to rewrite'
        },
        { status: 400 }
      );
    }

    // Validate text length (max 10,000 characters)
    try {
      validateTextLength(text, 'Text');
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Text too long',
          details: error instanceof Error ? error.message : 'Text exceeds maximum length'
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
      console.error('❌ ANTHROPIC_API_KEY not found in environment variables');
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
    // 3. Call Claude API to rewrite the text
    // ------------------------------------------------------------------------
    
    console.log('📝 Tone shift request:', {
      originalLength: text.length,
      tone: tone,
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });

    // Build the user prompt with the text and target tone
    const userPrompt = buildUserPrompt(text, tone as ToneType);

    // Call Claude's Messages API with timeout
    // This sends the request to Claude and waits for the full response
    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Latest Claude Sonnet model
        max_tokens: 4000, // Maximum length of response
        system: SYSTEM_PROMPT, // System prompt defining Claude's role
        messages: [
          {
            role: 'user',
            content: userPrompt, // The actual rewriting request
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
    const rewrittenText = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '';

    if (!rewrittenText) {
      console.error('❌ Claude returned empty response');
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
    const newLength = rewrittenText.length;

    console.log('✅ Tone shift successful:', {
      originalLength,
      newLength,
      changePercent: ((newLength - originalLength) / originalLength * 100).toFixed(1) + '%',
      preview: rewrittenText.substring(0, 100) + (rewrittenText.length > 100 ? '...' : ''),
    });

    // ------------------------------------------------------------------------
    // 5. Return the rewritten text
    // ------------------------------------------------------------------------
    
    return NextResponse.json<ToneShiftResponse>(
      {
        rewrittenText,
        originalLength,
        newLength,
      },
      { status: 200 }
    );

  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    
    logError(error, 'Tone shift API');

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Request timeout',
          details: 'The request took too long to complete. Please try again with shorter text or check your connection.'
        },
        { status: 408 }
      );
    }

    // Handle Anthropic-specific errors
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API Error:', {
        status: error.status,
        message: error.message,
      });

      // Provide user-friendly messages for common Claude errors
      let userMessage = 'AI service error. Please try again.';
      
      if (error.status === 429) {
        userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.status === 401 || error.status === 403) {
        userMessage = 'Authentication error. Please contact support.';
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

// ============================================================================
// Future Enhancements (TODO)
// ============================================================================

/**
 * TODO: Rate Limiting
 * - Implement per-user rate limiting (e.g., 50 requests per hour)
 * - Use Redis or Upstash for distributed rate limiting
 * - Return 429 status when rate limit exceeded
 * 
 * Example with Upstash Redis:
 * ```
 * import { Ratelimit } from "@upstash/ratelimit";
 * import { Redis } from "@upstash/redis";
 * 
 * const ratelimit = new Ratelimit({
 *   redis: Redis.fromEnv(),
 *   limiter: Ratelimit.slidingWindow(50, "1 h"),
 * });
 * ```
 */

/**
 * TODO: Caching
 * - Cache rewrite results for identical text+tone combinations
 * - Use Redis or edge cache (Vercel KV)
 * - Set TTL to 24 hours
 * - Reduces API costs and improves response time
 */

/**
 * TODO: Cost Tracking
 * - Log token usage per request
 * - Track costs per user/organization
 * - Set up usage alerts for high-volume users
 * - Display usage in user dashboard
 */

/**
 * TODO: Streaming Response
 * - Implement streaming for real-time text generation
 * - Improves perceived performance for long rewrites
 * - Use Server-Sent Events (SSE) or WebSocket
 * 
 * Example:
 * ```
 * const stream = await anthropic.messages.stream({...});
 * return new Response(stream.toReadableStream());
 * ```
 */
