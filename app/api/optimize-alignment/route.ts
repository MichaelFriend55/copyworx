/**
 * @file app/api/optimize-alignment/route.ts
 * @description API route for rewriting copy to optimize alignment with persona or brand
 * 
 * This endpoint takes copy that has been analyzed for alignment issues and
 * rewrites it to fix those specific issues while preserving strengths.
 * 
 * Includes automatic usage logging to track API costs per user.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateTextLength, validateNotEmpty, logError } from '@/lib/utils/error-handling';
import { logger } from '@/lib/utils/logger';
import { getUserId, checkUserWithinLimit, usageLimitExceededResponse } from '@/lib/utils/api-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import type { 
  OptimizeAlignmentRequest, 
  OptimizeAlignmentResponse,
  OptimizeAnalysisContext,
  OptimizePersonaContext,
  OptimizeBrandContext,
} from '@/lib/types/brand';

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
 * System prompt for persona alignment optimization
 */
const PERSONA_SYSTEM_PROMPT = `You are an expert copywriter with 40 years of experience specializing in audience-targeted messaging. Your job is to rewrite copy to better resonate with a specific target persona.

CRITICAL OUTPUT FORMAT:
You must output valid HTML that preserves the original structure while optimizing the content.
Use only these tags:
- <h2> or <h3> for headings and subject lines
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for bold emphasis
- <em> for italic emphasis

REWRITING RULES:
1. ONLY fix the specific alignment issues identified - do NOT rewrite everything
2. PRESERVE what's working well (the identified strengths)
3. Maintain the original structure and formatting
4. Keep the core message intact
5. Match the persona's language patterns and vocabulary
6. Address their pain points and goals
7. Use emotional triggers that resonate with their psychographics
8. Keep similar length - don't pad or over-expand

Return ONLY the rewritten HTML content, no explanations or preambles.`;

/**
 * System prompt for brand alignment optimization
 */
const BRAND_SYSTEM_PROMPT = `You are an expert copywriter with 40 years of experience specializing in brand voice consistency. Your job is to rewrite copy to better align with brand voice guidelines.

CRITICAL OUTPUT FORMAT:
You must output valid HTML that preserves the original structure while optimizing the content.
Use only these tags:
- <h2> or <h3> for headings and subject lines
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for bold emphasis
- <em> for italic emphasis

REWRITING RULES:
1. ONLY fix the specific brand voice violations identified - do NOT rewrite everything
2. PRESERVE what's working well (the identified matches)
3. Maintain the original structure and formatting
4. Keep the core message intact
5. Use approved phrases where appropriate
6. REMOVE or replace any forbidden words/phrases
7. Match the brand tone consistently throughout
8. Align with brand values and mission
9. Keep similar length - don't pad or over-expand

Return ONLY the rewritten HTML content, no explanations or preambles.`;

/**
 * Generates a user prompt for persona optimization
 */
function buildPersonaPrompt(
  text: string, 
  analysis: OptimizeAnalysisContext, 
  persona: OptimizePersonaContext
): string {
  return `Rewrite this copy to better align with the target persona. Focus ONLY on fixing the identified issues while preserving the strengths.

TARGET PERSONA:
Name: ${persona.name}
${persona.demographics ? `Demographics: ${persona.demographics}` : ''}
${persona.psychographics ? `Psychographics: ${persona.psychographics}` : ''}
${persona.painPoints ? `Pain Points: ${persona.painPoints}` : ''}
${persona.goals ? `Goals: ${persona.goals}` : ''}

ANALYSIS RESULTS:
Current Score: ${analysis.score}%
Assessment: ${analysis.assessment}

STRENGTHS TO PRESERVE (do not change these aspects):
${analysis.strengths.length > 0 ? analysis.strengths.map(s => `• ${s}`).join('\n') : '• None identified'}

ISSUES TO FIX (focus your changes here):
${analysis.issues.length > 0 ? analysis.issues.map(i => `• ${i}`).join('\n') : '• None identified'}

RECOMMENDATIONS TO IMPLEMENT:
${analysis.recommendations.length > 0 ? analysis.recommendations.map(r => `• ${r}`).join('\n') : '• None identified'}

ORIGINAL COPY TO REWRITE:
${text}

INSTRUCTIONS:
1. Preserve the strengths listed above - don't change what's already working
2. Fix ONLY the specific issues identified
3. Implement the recommendations where possible
4. Keep the same structure (headings, bullets, paragraphs)
5. Maintain similar length

Return ONLY the rewritten HTML:`;
}

/**
 * Generates a user prompt for brand optimization
 */
function buildBrandPrompt(
  text: string, 
  analysis: OptimizeAnalysisContext, 
  brand: OptimizeBrandContext
): string {
  return `Rewrite this copy to better align with the brand voice. Focus ONLY on fixing the identified violations while preserving what matches well.

BRAND VOICE GUIDELINES:
Brand Name: ${brand.brandName}
${brand.brandTone ? `Tone: ${brand.brandTone}` : ''}
${brand.missionStatement ? `Mission: ${brand.missionStatement}` : ''}
${brand.brandValues && brand.brandValues.length > 0 ? `Values: ${brand.brandValues.join(', ')}` : ''}
${brand.approvedPhrases && brand.approvedPhrases.length > 0 ? `\nApproved Phrases to USE:\n${brand.approvedPhrases.map(p => `• "${p}"`).join('\n')}` : ''}
${brand.forbiddenWords && brand.forbiddenWords.length > 0 ? `\nForbidden Words to AVOID:\n${brand.forbiddenWords.map(w => `• "${w}"`).join('\n')}` : ''}

ANALYSIS RESULTS:
Current Score: ${analysis.score}%
Assessment: ${analysis.assessment}

WHAT MATCHES WELL (preserve these aspects):
${analysis.strengths.length > 0 ? analysis.strengths.map(s => `• ${s}`).join('\n') : '• None identified'}

VIOLATIONS TO FIX (focus your changes here):
${analysis.issues.length > 0 ? analysis.issues.map(i => `• ${i}`).join('\n') : '• None identified'}

RECOMMENDATIONS TO IMPLEMENT:
${analysis.recommendations.length > 0 ? analysis.recommendations.map(r => `• ${r}`).join('\n') : '• None identified'}

ORIGINAL COPY TO REWRITE:
${text}

INSTRUCTIONS:
1. Preserve what matches the brand voice - don't change what's already working
2. Fix ONLY the specific violations identified
3. Replace any forbidden words with brand-appropriate alternatives
4. Use approved phrases where they fit naturally
5. Keep the same structure (headings, bullets, paragraphs)
6. Maintain similar length

Return ONLY the rewritten HTML:`;
}

/**
 * Generates a summary of changes prompt
 */
function buildChangesSummaryPrompt(original: string, rewritten: string): string {
  return `Compare these two versions of copy and provide a brief summary of the key changes made.

ORIGINAL:
${original}

REWRITTEN:
${rewritten}

Provide 2-4 brief bullet points summarizing the main changes. Format as a JSON array of strings.
Example: ["Changed generic greeting to persona-specific language", "Added industry terminology", "Softened aggressive sales tone"]

Return ONLY the JSON array:`;
}

// ============================================================================
// Usage Logging
// ============================================================================

/**
 * Log API usage to Supabase for cost tracking
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
        feature: 'optimize-alignment',
        cost_usd: costUsd,
      });

    if (error) {
      console.error('❌ Failed to log optimize-alignment usage:', error);
    } else {
      logger.log('📊 Optimize-alignment usage logged:', {
        userId: userId.substring(0, 8) + '...',
        model,
        tokens: inputTokens + outputTokens,
        cost: `$${costUsd.toFixed(6)}`,
      });
    }
  } catch (err) {
    console.error('❌ Exception logging optimize-alignment usage:', err);
  }
}

/**
 * Calculate cost in USD for a Claude API call
 * Based on Claude Sonnet 4 pricing: $3/1M input, $15/1M output
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/optimize-alignment
 * 
 * Rewrites copy to optimize alignment with persona or brand
 */
export async function POST(request: NextRequest): Promise<NextResponse<OptimizeAlignmentResponse | ErrorResponse>> {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

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
    
    let body: Partial<OptimizeAlignmentRequest>;
    
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON'
        },
        { status: 400 }
      );
    }

    const { text, type, analysisContext, personaContext, brandContext } = body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "text" field',
          details: 'Please provide the copy to optimize'
        },
        { status: 400 }
      );
    }

    if (!type || (type !== 'persona' && type !== 'brand')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "type" field',
          details: 'Type must be "persona" or "brand"'
        },
        { status: 400 }
      );
    }

    if (!analysisContext || typeof analysisContext !== 'object') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "analysisContext" field',
          details: 'Please provide the analysis results'
        },
        { status: 400 }
      );
    }

    // Validate type-specific context
    if (type === 'persona' && (!personaContext || !personaContext.name)) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing "personaContext" for persona optimization',
          details: 'Please provide persona details'
        },
        { status: 400 }
      );
    }

    if (type === 'brand' && (!brandContext || !brandContext.brandName)) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing "brandContext" for brand optimization',
          details: 'Please provide brand voice details'
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
          details: error instanceof Error ? error.message : 'Please provide valid text'
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------------
    // 3. Initialize Anthropic client
    // ------------------------------------------------------------------------
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      logger.error('❌ ANTHROPIC_API_KEY not found');
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
    // 4. Build and send optimization request
    // ------------------------------------------------------------------------
    
    const targetName = type === 'persona' 
      ? personaContext!.name 
      : brandContext!.brandName;

    logger.log('📝 Optimize alignment request:', {
      type,
      targetName,
      textLength: text.length,
      score: analysisContext.score,
      issuesCount: analysisContext.issues?.length || 0,
    });

    const systemPrompt = type === 'persona' 
      ? PERSONA_SYSTEM_PROMPT 
      : BRAND_SYSTEM_PROMPT;

    const userPrompt = type === 'persona'
      ? buildPersonaPrompt(text, analysisContext as OptimizeAnalysisContext, personaContext!)
      : buildBrandPrompt(text, analysisContext as OptimizeAnalysisContext, brandContext!);

    // Call Claude API for rewrite with timeout
    const rewriteMessage = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 45 seconds')), 45000)
      ),
    ]);

    totalInputTokens += rewriteMessage.usage.input_tokens;
    totalOutputTokens += rewriteMessage.usage.output_tokens;

    const rewrittenText = rewriteMessage.content[0].type === 'text'
      ? rewriteMessage.content[0].text.trim()
      : '';

    if (!rewrittenText) {
      logger.error('❌ Claude returned empty rewrite');
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'AI returned an empty response. Please try again.'
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------------
    // 5. Get changes summary
    // ------------------------------------------------------------------------
    
    const summaryPrompt = buildChangesSummaryPrompt(text, rewrittenText);
    
    const summaryMessage = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: summaryPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Summary request timed out')), 15000)
      ),
    ]);

    totalInputTokens += summaryMessage.usage.input_tokens;
    totalOutputTokens += summaryMessage.usage.output_tokens;

    let changesSummary: string[] = [];
    try {
      const summaryText = summaryMessage.content[0].type === 'text'
        ? summaryMessage.content[0].text.trim()
        : '[]';
      const cleanedSummary = summaryText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      changesSummary = JSON.parse(cleanedSummary);
      
      if (!Array.isArray(changesSummary)) {
        changesSummary = ['Copy optimized for better alignment'];
      }
    } catch {
      logger.warn('⚠️ Could not parse changes summary');
      changesSummary = ['Copy optimized for better alignment'];
    }

    // ------------------------------------------------------------------------
    // 6. Log usage
    // ------------------------------------------------------------------------
    
    if (userId) {
      const costUsd = calculateCost(totalInputTokens, totalOutputTokens);
      
      logUsageToSupabase(
        userId,
        'claude-sonnet-4-20250514',
        totalInputTokens,
        totalOutputTokens,
        costUsd
      ).catch(err => {
        console.error('❌ Unexpected error in optimize-alignment usage logging:', err);
      });
    }

    logger.log('✅ Optimize alignment complete:', {
      targetName,
      originalLength: text.length,
      newLength: rewrittenText.length,
      changesCount: changesSummary.length,
    });

    // ------------------------------------------------------------------------
    // 7. Return the optimized result
    // ------------------------------------------------------------------------
    
    return NextResponse.json<OptimizeAlignmentResponse>(
      {
        rewrittenText,
        changesSummary,
        originalLength: text.length,
        newLength: rewrittenText.length,
        targetName,
      },
      { status: 200 }
    );

  } catch (error) {
    logError(error, 'Optimize alignment API');

    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Request timeout',
          details: 'The optimization took too long. Please try again with shorter text.'
        },
        { status: 408 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      let userMessage = 'AI service error. Please try again.';
      
      if (error.status === 429) {
        userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.status === 500 || error.status === 503) {
        userMessage = 'AI service temporarily unavailable. Please try again in a moment.';
      }

      return NextResponse.json<ErrorResponse>(
        { error: 'AI service error', details: userMessage },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json<ErrorResponse>(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred.'
      },
      { status: 500 }
    );
  }
}
