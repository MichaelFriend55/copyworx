/**
 * @file app/api/brand-alignment/route.ts
 * @description API route for checking copy alignment with brand voice using Claude AI
 * 
 * This endpoint accepts text and brand voice configuration, then uses Claude to analyze
 * how well the copy aligns with the defined brand voice guidelines.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { BrandVoice, BrandAlignmentResult, BrandAlignmentRequest, BrandAlignmentResponse } from '@/lib/types/brand';
import { validateTextLength, validateNotEmpty, logError } from '@/lib/utils/error-handling';

// ============================================================================
// Type Definitions
// ============================================================================

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
 * System prompt that establishes Claude's role as a brand voice analyst
 */
const SYSTEM_PROMPT = `You are an expert brand voice analyst with 40 years of experience. Your job is to analyze copy and assess how well it aligns with a given brand voice.

When analyzing:
- Check for tone consistency with brand guidelines
- Identify usage of approved phrases
- Flag any forbidden words or phrases
- Assess alignment with brand values
- Consider mission statement alignment
- Provide specific, actionable recommendations

Be thorough, objective, and provide constructive feedback.`;

/**
 * Generates a user prompt with the text and brand voice to analyze
 */
function buildUserPrompt(text: string, brandVoice: BrandVoice): string {
  return `Analyze the following copy for brand voice alignment.

BRAND VOICE GUIDELINES:
Brand Name: ${brandVoice.brandName}
Tone: ${brandVoice.brandTone || 'Not specified'}
Mission: ${brandVoice.missionStatement || 'Not specified'}

${brandVoice.brandValues.length > 0 ? `Brand Values:\n${brandVoice.brandValues.map(v => `- ${v}`).join('\n')}` : ''}

${brandVoice.approvedPhrases.length > 0 ? `Approved Phrases:\n${brandVoice.approvedPhrases.map(p => `- ${p}`).join('\n')}` : ''}

${brandVoice.forbiddenWords.length > 0 ? `Forbidden Words/Phrases:\n${brandVoice.forbiddenWords.map(w => `- ${w}`).join('\n')}` : ''}

COPY TO ANALYZE:
${text}

Please provide your analysis in the following JSON format:
{
  "score": [0-100 numeric score],
  "assessment": "[overall assessment in 1-2 sentences]",
  "matches": ["list", "of", "things", "that", "match", "brand", "voice"],
  "violations": ["list", "of", "things", "that", "violate", "brand", "voice"],
  "recommendations": ["specific", "actionable", "recommendations"]
}

Return ONLY the JSON object, no other text.`;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/brand-alignment
 * 
 * Checks copy alignment with brand voice using Claude AI
 * 
 * @param request - Next.js request object containing text and brandVoice
 * @returns JSON response with alignment analysis or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<BrandAlignmentResponse | ErrorResponse>> {
  try {
    // DEBUG: Check if API key is loaded
    console.log('🔍 Environment check:', {
      hasKey: !!process.env.ANTHROPIC_API_KEY,
      firstChars: process.env.ANTHROPIC_API_KEY?.substring(0, 15) || 'MISSING'
    });
    
    // ------------------------------------------------------------------------
    // 1. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<BrandAlignmentRequest>;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON with "text" and "brandVoice" fields'
        },
        { status: 400 }
      );
    }

    const { text, brandVoice } = body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "text" field',
          details: 'Please provide the copy to analyze as a string in the "text" field'
        },
        { status: 400 }
      );
    }

    if (!brandVoice || typeof brandVoice !== 'object') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "brandVoice" field',
          details: 'Please provide brand voice configuration'
        },
        { status: 400 }
      );
    }

    // Validate brand voice has required fields
    if (!brandVoice.brandName) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid brand voice',
          details: 'Brand voice must include brandName'
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
          details: error instanceof Error ? error.message : 'Please provide valid text to analyze'
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
    // 3. Call Claude API to analyze the text
    // ------------------------------------------------------------------------
    
    console.log('📝 Brand alignment request:', {
      textLength: text.length,
      brandName: brandVoice.brandName,
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });

    // Build the user prompt with the text and brand voice
    const userPrompt = buildUserPrompt(text, brandVoice as BrandVoice);

    // Call Claude's Messages API with timeout
    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Latest Claude Sonnet model
        max_tokens: 4000, // Maximum length of response
        system: SYSTEM_PROMPT, // System prompt defining Claude's role
        messages: [
          {
            role: 'user',
            content: userPrompt, // The actual analysis request
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
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '';

    if (!responseText) {
      console.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'Claude returned an empty response. Please try again.'
        },
        { status: 500 }
      );
    }

    // Parse the JSON response from Claude
    let result: BrandAlignmentResult;
    try {
      // Remove any markdown code blocks if present
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      result = JSON.parse(cleanedResponse);
      
      // Validate result structure
      if (typeof result.score !== 'number' || !result.assessment) {
        throw new Error('Invalid result format');
      }
      
      // Ensure arrays exist
      result.matches = result.matches || [];
      result.violations = result.violations || [];
      result.recommendations = result.recommendations || [];
      
    } catch (error) {
      console.error('❌ Failed to parse Claude response:', error);
      console.error('Raw response:', responseText);
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'Failed to parse AI response. Please try again.'
        },
        { status: 500 }
      );
    }

    console.log('✅ Brand alignment analysis complete:', {
      score: result.score,
      matchesCount: result.matches.length,
      violationsCount: result.violations.length,
      recommendationsCount: result.recommendations.length,
    });

    // ------------------------------------------------------------------------
    // 5. Return the analysis result
    // ------------------------------------------------------------------------
    
    return NextResponse.json<BrandAlignmentResponse>(
      {
        result,
        textLength: text.length,
      },
      { status: 200 }
    );

  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    
    logError(error, 'Brand alignment API');

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Request timeout',
          details: 'The analysis took too long. Please try again with shorter text.'
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
