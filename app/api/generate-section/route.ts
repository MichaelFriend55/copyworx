/**
 * @file app/api/generate-section/route.ts
 * @description API route for generating individual brochure sections using Claude AI
 * 
 * This endpoint handles section-by-section generation for multi-section templates,
 * providing context from previous sections for consistent tone and messaging.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSectionPrompt, getSectionById } from '@/lib/templates/brochure-multi-section-config';
import type { SectionGenerationRequest, SectionGenerationResponse } from '@/lib/types/template-progress';
import { logError } from '@/lib/utils/error-handling';

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
// Helper Functions
// ============================================================================

/**
 * Build brand voice instructions for Claude
 */
function buildBrandVoiceInstructions(brandVoice: NonNullable<SectionGenerationRequest['brandVoice']>): string {
  return `Brand: ${brandVoice.brandName}
Tone: ${brandVoice.brandTone}
Approved Phrases: ${brandVoice.approvedPhrases.join(', ')}
Forbidden Words: ${brandVoice.forbiddenWords.join(', ')}
Brand Values: ${brandVoice.brandValues.join(', ')}
Mission: ${brandVoice.missionStatement}

Apply these brand guidelines to all copy generated.`;
}

/**
 * Build persona instructions for Claude
 */
function buildPersonaInstructions(persona: NonNullable<SectionGenerationRequest['persona']>): string {
  return `Target Persona: ${persona.name}
Demographics: ${persona.demographics}
Psychographics: ${persona.psychographics}
Pain Points: ${persona.painPoints}
Language Patterns: ${persona.languagePatterns}
Goals: ${persona.goals}

Write specifically for this persona's context and use language that resonates with them.`;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/generate-section
 * 
 * Generates a single brochure section using Claude AI with context from previous sections
 * 
 * @param request - Next.js request object containing section generation request
 * @returns JSON response with generated content or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<SectionGenerationResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<SectionGenerationRequest>;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON with required fields'
        },
        { status: 400 }
      );
    }

    const { 
      templateId, 
      sectionId, 
      sectionIndex,
      formData, 
      previousContent, 
      applyBrandVoice, 
      brandVoice, 
      persona 
    } = body;

    // Validate required fields
    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "templateId" field',
          details: 'Please provide the template ID as a string'
        },
        { status: 400 }
      );
    }

    if (!sectionId || typeof sectionId !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "sectionId" field',
          details: 'Please provide the section ID as a string'
        },
        { status: 400 }
      );
    }

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "formData" field',
          details: 'Please provide form data as an object'
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // 2. Validate section exists
    // ------------------------------------------------------------------------
    
    const section = getSectionById(sectionId);
    
    if (!section) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Section not found',
          details: `No section found with ID: ${sectionId}`
        },
        { status: 404 }
      );
    }

    // Validate required fields for this section
    const missingFields = section.fields
      .filter((field) => {
        // Check if field is required and empty
        if (!field.required) return false;
        
        // Handle conditional fields
        if (field.conditionalOn) {
          const conditionValue = formData[field.conditionalOn.fieldId];
          const conditionMet = Array.isArray(field.conditionalOn.value)
            ? field.conditionalOn.value.includes(conditionValue)
            : conditionValue === field.conditionalOn.value;
          
          // If condition not met, field is not required
          if (!conditionMet) return false;
        }
        
        return !formData[field.id]?.trim();
      })
      .map((field) => field.label);
    
    if (missingFields.length > 0) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing required fields',
          details: `Please fill in: ${missingFields.join(', ')}`
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // 3. Initialize Anthropic client
    // ------------------------------------------------------------------------
    
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

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // ------------------------------------------------------------------------
    // 4. Build the prompt with context
    // ------------------------------------------------------------------------
    
    const brandVoiceInstructions = applyBrandVoice && brandVoice 
      ? buildBrandVoiceInstructions(brandVoice)
      : undefined;
    
    const personaInstructions = persona 
      ? buildPersonaInstructions(persona)
      : undefined;

    const prompt = buildSectionPrompt(
      sectionId,
      formData,
      previousContent,
      brandVoiceInstructions,
      personaInstructions
    );

    console.log(`📄 Generating section: ${section.name} (${sectionId})`);
    console.log(`📊 Previous content length: ${previousContent?.length || 0} chars`);
    console.log(`🎨 Brand voice: ${applyBrandVoice ? 'enabled' : 'disabled'}`);
    console.log(`👤 Persona: ${persona?.name || 'none'}`);

    // ------------------------------------------------------------------------
    // 5. Call Claude API to generate section
    // ------------------------------------------------------------------------
    
    const timeoutMs = 45000; // 45 seconds timeout for section generation
    
    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000, // Shorter than full template since it's a single section
        system: `You are an expert B2B copywriter creating brochure content. 

OUTPUT FORMAT RULES:
1. Output ONLY valid HTML using: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
2. Each paragraph MUST be wrapped in <p> tags
3. Use <ul><li> for bullet lists
4. Use <strong> for key phrases to emphasize
5. Do NOT include section headers/titles - those are added separately
6. Do NOT include markdown syntax - HTML only
7. Output ONLY the content, no preamble or explanation
8. Keep copy concise and benefit-focused

Generate professional, engaging brochure copy that converts.`,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs / 1000} seconds`)), timeoutMs)
      ),
    ]);

    // ------------------------------------------------------------------------
    // 6. Extract and process the response
    // ------------------------------------------------------------------------
    
    const generatedContent = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '';

    if (!generatedContent) {
      console.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'Claude returned an empty response. Please try again.'
        },
        { status: 500 }
      );
    }

    console.log(`✅ Section generated: ${generatedContent.length} chars`);

    // ------------------------------------------------------------------------
    // 7. Return the generated section
    // ------------------------------------------------------------------------
    
    return NextResponse.json<SectionGenerationResponse>(
      {
        generatedContent,
        sectionId,
        metadata: {
          textLength: generatedContent.length,
          sectionName: section.name,
          brandVoiceApplied: Boolean(applyBrandVoice && brandVoice),
          personaUsed: Boolean(persona),
        },
      },
      { status: 200 }
    );

  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    
    logError(error, 'Section generation API');

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Request timeout',
          details: 'Section generation took too long. Please try again.'
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
