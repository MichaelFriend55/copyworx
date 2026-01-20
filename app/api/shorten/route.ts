/**
 * @file app/api/shorten/route.ts
 * @description API route for shortening copy using Claude AI
 * 
 * This endpoint accepts text and uses Claude to shorten it while
 * preserving the core message and impact.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateTextLength, validateNotEmpty, logError } from '@/lib/utils/error-handling';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Request body structure
 */
interface ShortenRequest {
  text: string;
}

/**
 * Response body structure
 */
interface ShortenResponse {
  shortenedText: string;
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
 * AGGRESSIVE SHORTENING: Targets 40-50% length reduction
 */
const SYSTEM_PROMPT = `You are an expert copywriter with 40 years of experience. Your job is to AGGRESSIVELY shorten copy by cutting it to approximately 40-50% of its original length while preserving only the essential core message.

CRITICAL OUTPUT FORMAT:
You must output valid HTML that preserves the original structure while shortening the content.
Use only these tags:
- <h2> or <h3> for headings and subject lines
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for bold emphasis
- <em> for italic emphasis

HTML RULES:
- Preserve the original document structure (headings stay headings, bullets stay bullets)
- Shorten ONLY the content/wording, NOT the structure
- If input has bullets, output must have bullets (just more concise)
- If input has headings, output must have headings
- Output ONLY HTML, no markdown, no preamble
- Do NOT add blank lines between tags

AGGRESSIVE SHORTENING STRATEGY:
- TARGET: Reduce to approximately HALF the original length (40-50% reduction)
- Cut ruthlessly - every word must earn its place
- Remove ALL redundant phrases and filler words
- Eliminate descriptive fluff and unnecessary modifiers
- Strip out repetitive explanations
- Keep ONLY the essential information and core value proposition
- Use the most concise possible wording
- Combine related ideas into single, tight sentences
- Remove examples unless absolutely critical
- Cut transitional phrases and connecting words where possible
- Be ruthless: if it doesn't add critical value, cut it

What to KEEP:
- The single most important benefit or message
- Critical facts, numbers, or claims that drive the message
- Essential calls-to-action
- Core brand differentiators

What to CUT:
- Adjective stacking (e.g., "amazing, incredible, fantastic" → pick ONE)
- Redundant phrases (e.g., "completely and totally" → "completely")
- Unnecessary explanations
- Backstory and context unless critical
- Polite filler (e.g., "We are pleased to announce" → "Announcing")
- Examples and illustrations unless they ARE the message

Do NOT change the core message or add new information.

Return ONLY the shortened HTML, no explanations or preambles.`;

/**
 * Generates a user prompt with the text to shorten
 * AGGRESSIVE VERSION: Emphasizes 40-50% length reduction
 */
function buildUserPrompt(text: string): string {
  return `AGGRESSIVELY shorten the following copy to approximately 40-50% of its original length. Cut ruthlessly while preserving only the essential core message. Remove ALL redundant phrases, eliminate unnecessary words, and keep ONLY critical information.

CRITICAL: Output must be valid HTML with preserved structure. If the input has headings, keep them as headings. If it has bullets, keep them as bullets (just drastically shorter). Do not add a preamble or explanation - just return the aggressively shortened HTML.

Example - aggressive shortening (notice the 50%+ reduction):
INPUT (33 words):
<p>Our coffee delivers a bold, robust flavor profile that awakens your senses with every sip. The carefully selected beans provide a powerful energizing kick that will keep you going all day long.</p>

OUTPUT (11 words - 67% reduction):
<p><strong>Bold coffee</strong> that energizes and keeps you going.</p>

TARGET: Aim for approximately HALF the original word count. Be ruthless - every word must justify its existence.

ORIGINAL COPY:
${text}

SHORTENED HTML:`;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/shorten
 * 
 * Shortens copy using Claude AI
 * 
 * @param request - Next.js request object containing text
 * @returns JSON response with shortened text or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<ShortenResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<ShortenRequest>;
    
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
          details: 'Please provide the copy to shorten as a string in the "text" field'
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
          details: error instanceof Error ? error.message : 'Please provide valid text to shorten'
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
    // 3. Call Claude API to shorten the text
    // ------------------------------------------------------------------------
    
    // Build the user prompt with the text to shorten
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
            content: userPrompt, // The actual shortening request
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
    const shortenedText = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '';

    if (!shortenedText) {
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
    const newLength = shortenedText.length;

    // ------------------------------------------------------------------------
    // 5. Return the shortened text
    // ------------------------------------------------------------------------
    
    return NextResponse.json<ShortenResponse>(
      {
        shortenedText,
        originalLength,
        newLength,
      },
      { status: 200 }
    );

  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    
    logError(error, 'Shorten API');

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
