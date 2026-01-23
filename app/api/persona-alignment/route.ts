/**
 * @file app/api/persona-alignment/route.ts
 * @description API route for checking copy alignment with target persona using Claude AI
 * 
 * This endpoint accepts text and persona configuration, then uses Claude to analyze
 * how well the copy resonates with the target persona.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateTextLength, validateNotEmpty, logError } from '@/lib/utils/error-handling';
import type { Persona } from '@/lib/types/project';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Persona alignment result structure
 */
interface PersonaAlignmentResult {
  score: number;
  assessment: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

/**
 * Request body structure
 */
interface PersonaAlignmentRequest {
  text: string;
  persona: Persona;
}

/**
 * Response structure
 */
interface PersonaAlignmentResponse {
  result: PersonaAlignmentResult;
  textLength: number;
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
 * System prompt that establishes Claude's role as a persona alignment analyst
 */
const SYSTEM_PROMPT = `You are an expert copywriter and audience analyst with 40 years of experience. Your job is to analyze copy and assess how well it resonates with a target persona.

When analyzing:
- Consider if the language matches the persona's demographics and communication style
- Check if the copy addresses the persona's pain points
- Assess if the copy speaks to the persona's goals and aspirations
- Evaluate if the psychographic profile would find this copy compelling
- Consider the emotional resonance with the target audience
- Provide specific, actionable recommendations

Be thorough, objective, and provide constructive feedback.`;

/**
 * Generates a user prompt with the text and persona to analyze
 */
function buildUserPrompt(text: string, persona: Persona): string {
  return `Analyze the following copy for persona alignment.

TARGET PERSONA:
Name: ${persona.name}
${persona.demographics ? `Demographics: ${persona.demographics}` : ''}
${persona.psychographics ? `Psychographics: ${persona.psychographics}` : ''}
${persona.painPoints ? `Pain Points: ${persona.painPoints}` : ''}
${persona.goals ? `Goals: ${persona.goals}` : ''}

COPY TO ANALYZE:
${text}

Please provide your analysis in the following JSON format:
{
  "score": [0-100 numeric score],
  "assessment": "[overall assessment in 1-2 sentences explaining how well this copy would resonate with the persona]",
  "strengths": ["list", "of", "things", "that", "work", "well", "for", "this", "persona"],
  "improvements": ["list", "of", "areas", "that", "don't", "quite", "fit", "the", "persona"],
  "recommendations": ["specific", "actionable", "recommendations", "to", "better", "reach", "this", "persona"]
}

Return ONLY the JSON object, no other text.`;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/persona-alignment
 * 
 * Checks copy alignment with target persona using Claude AI
 * 
 * @param request - Next.js request object containing text and persona
 * @returns JSON response with alignment analysis or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<PersonaAlignmentResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<PersonaAlignmentRequest>;
    
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON with "text" and "persona" fields'
        },
        { status: 400 }
      );
    }

    const { text, persona } = body;

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

    if (!persona || typeof persona !== 'object') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "persona" field',
          details: 'Please provide persona configuration'
        },
        { status: 400 }
      );
    }

    // Validate persona has required fields
    if (!persona.name) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid persona',
          details: 'Persona must include name'
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

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // ------------------------------------------------------------------------
    // 3. Call Claude API to analyze the text
    // ------------------------------------------------------------------------
    
    logger.log('📝 Persona alignment request:', {
      textLength: text.length,
      personaName: persona.name,
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });

    const userPrompt = buildUserPrompt(text, persona as Persona);

    // Call Claude's Messages API with timeout
    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
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
    
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '';

    if (!responseText) {
      logger.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'Claude returned an empty response. Please try again.'
        },
        { status: 500 }
      );
    }

    // Parse the JSON response from Claude
    let result: PersonaAlignmentResult;
    try {
      // Remove any markdown code blocks if present
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      result = JSON.parse(cleanedResponse);
      
      // Validate result structure
      if (typeof result.score !== 'number' || !result.assessment) {
        throw new Error('Invalid result format');
      }
      
      // Ensure arrays exist
      result.strengths = result.strengths || [];
      result.improvements = result.improvements || [];
      result.recommendations = result.recommendations || [];
      
    } catch {
      logger.error('❌ Failed to parse Claude response');
      logger.error('Raw response:', responseText);
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'Failed to parse AI response. Please try again.'
        },
        { status: 500 }
      );
    }

    logger.log('✅ Persona alignment analysis complete:', {
      score: result.score,
      strengthsCount: result.strengths.length,
      improvementsCount: result.improvements.length,
      recommendationsCount: result.recommendations.length,
    });

    // ------------------------------------------------------------------------
    // 5. Return the analysis result
    // ------------------------------------------------------------------------
    
    return NextResponse.json<PersonaAlignmentResponse>(
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
    
    logError(error, 'Persona alignment API');

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
