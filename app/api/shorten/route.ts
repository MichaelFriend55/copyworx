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
 */
const SYSTEM_PROMPT = `You are an expert copywriter with 40 years of experience. Your job is to shorten copy while preserving its core message and impact.

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
- Remove unnecessary words while preserving core message and impact

When shortening:
- Remove unnecessary words and redundancies
- Tighten sentences and eliminate fluff
- Make every word count
- Maintain the original tone and key points
- Keep the fundamental message intact
- Preserve the most important benefits and claims
- Ensure the shortened version is still clear and compelling
- Do NOT change the core message or omit critical information
- Do NOT add new information

Return ONLY the shortened HTML, no explanations or preambles.`;

/**
 * Generates a user prompt with the text to shorten
 */
function buildUserPrompt(text: string): string {
  return `Shorten the following copy while preserving its core message and impact. Remove unnecessary words, tighten sentences, and make every word count. Maintain the original tone and key points.

CRITICAL: Output must be valid HTML with preserved structure. If the input has headings, keep them as headings. If it has bullets, keep them as bullets (just more concise). Do not add a preamble or explanation - just return the shortened HTML.

Example - shortening while preserving structure:
INPUT:
<p>Our coffee delivers a bold, robust flavor profile that awakens your senses with every sip. The carefully selected beans provide a powerful energizing kick.</p>
OUTPUT:
<p>Our <strong>bold coffee</strong> awakens your senses and delivers a powerful energizing kick.</p>

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
    // DEBUG: Check if API key is loaded
    console.log('🔍 Environment check:', {
      hasKey: !!process.env.ANTHROPIC_API_KEY,
      firstChars: process.env.ANTHROPIC_API_KEY?.substring(0, 15) || 'MISSING'
    });
    
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
    
    console.log('📝 Shorten request:', {
      originalLength: text.length,
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });

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

    console.log('✅ Shorten successful:', {
      originalLength,
      newLength,
      reductionPercent: ((originalLength - newLength) / originalLength * 100).toFixed(1) + '%',
      preview: shortenedText.substring(0, 100) + (shortenedText.length > 100 ? '...' : ''),
    });

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
