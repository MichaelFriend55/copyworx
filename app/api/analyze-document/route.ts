/**
 * @file app/api/analyze-document/route.ts
 * @description API route for AI-powered document analysis using Claude
 * 
 * Analyzes document content for:
 * - Tone detection (Professional, Casual, Urgent, etc.) with confidence
 * - Brand voice alignment score (if brand voice provided)
 * - Persona alignment score (if persona provided)
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateNotEmpty, logError } from '@/lib/utils/error-handling';
import type { BrandVoice } from '@/lib/types/brand';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Persona data for alignment analysis
 */
interface PersonaData {
  name: string;
  demographics: string;
  psychographics: string;
  painPoints: string;
  goals: string;
}

/**
 * Request body structure
 */
interface AnalyzeDocumentRequest {
  content: string;
  brandVoice?: BrandVoice;
  persona?: PersonaData;
  metricsToAnalyze: ('tone' | 'brand' | 'persona')[];
}

/**
 * Response body structure
 */
interface AnalyzeDocumentResponse {
  tone?: {
    label: string;
    confidence: number;
  };
  brandAlignment?: {
    score: number;
    feedback: string;
  };
  personaAlignment?: {
    score: number;
    feedback: string;
  };
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

const VALID_METRICS = ['tone', 'brand', 'persona'] as const;

const TONE_LABELS = [
  'Professional',
  'Casual',
  'Urgent',
  'Friendly',
  'Technical',
  'Playful',
  'Persuasive',
  'Informative',
  'Emotional',
  'Formal',
] as const;

/**
 * System prompt for document analysis
 */
const SYSTEM_PROMPT = `You are an expert copywriter and content analyst. Your job is to analyze copy and provide structured feedback.

You will be asked to analyze text for one or more of the following:
1. TONE: Identify the primary tone/voice of the writing
2. BRAND ALIGNMENT: How well the copy aligns with a given brand voice
3. PERSONA ALIGNMENT: How well the copy resonates with a target persona

Always respond with valid JSON only. No markdown, no explanations outside the JSON.`;

/**
 * Build user prompt based on requested metrics
 */
function buildAnalysisPrompt(
  content: string,
  metricsToAnalyze: string[],
  brandVoice?: BrandVoice,
  persona?: PersonaData
): string {
  const tasks: string[] = [];
  const responseFormat: string[] = [];
  
  // Tone analysis
  if (metricsToAnalyze.includes('tone')) {
    tasks.push(`1. TONE DETECTION: Identify the primary tone of this copy from these options: ${TONE_LABELS.join(', ')}. Provide a confidence percentage (0-100).`);
    responseFormat.push(`"tone": { "label": "Primary Tone", "confidence": 85 }`);
  }
  
  // Brand alignment
  if (metricsToAnalyze.includes('brand') && brandVoice) {
    tasks.push(`2. BRAND VOICE ALIGNMENT: Evaluate how well this copy aligns with the following brand voice:
- Brand: ${brandVoice.brandName}
- Tone: ${brandVoice.brandTone || 'Not specified'}
- Values: ${brandVoice.brandValues?.join(', ') || 'Not specified'}
- Approved phrases: ${brandVoice.approvedPhrases?.slice(0, 5).join(', ') || 'Not specified'}
- Words to avoid: ${brandVoice.forbiddenWords?.slice(0, 5).join(', ') || 'Not specified'}
- Mission: ${brandVoice.missionStatement || 'Not specified'}

Score 1-10 where 10 is perfect alignment. Provide brief feedback (max 50 words).`);
    responseFormat.push(`"brandAlignment": { "score": 8, "feedback": "Brief feedback here" }`);
  }
  
  // Persona alignment
  if (metricsToAnalyze.includes('persona') && persona) {
    tasks.push(`3. PERSONA ALIGNMENT: Evaluate how well this copy resonates with the target persona:
- Name: ${persona.name}
- Demographics: ${persona.demographics || 'Not specified'}
- Psychographics: ${persona.psychographics || 'Not specified'}
- Pain Points: ${persona.painPoints || 'Not specified'}
- Goals: ${persona.goals || 'Not specified'}

Score 1-10 where 10 means the copy perfectly addresses this persona's needs. Provide brief feedback (max 50 words).`);
    responseFormat.push(`"personaAlignment": { "score": 7, "feedback": "Brief feedback here" }`);
  }
  
  if (tasks.length === 0) {
    return '';
  }
  
  return `Analyze the following copy:

---
${content.substring(0, 3000)}${content.length > 3000 ? '\n[Content truncated...]' : ''}
---

Tasks:
${tasks.join('\n\n')}

Respond with ONLY valid JSON in this exact format:
{
  ${responseFormat.join(',\n  ')}
}`;
}

/**
 * Parse Claude's response into structured data
 */
function parseAnalysisResponse(responseText: string): AnalyzeDocumentResponse {
  try {
    // Remove any markdown code blocks if present
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleanedResponse);
    
    const result: AnalyzeDocumentResponse = {};
    
    // Validate and extract tone
    if (parsed.tone && typeof parsed.tone.label === 'string' && typeof parsed.tone.confidence === 'number') {
      result.tone = {
        label: parsed.tone.label,
        confidence: Math.min(100, Math.max(0, parsed.tone.confidence)),
      };
    }
    
    // Validate and extract brand alignment
    if (parsed.brandAlignment && typeof parsed.brandAlignment.score === 'number') {
      result.brandAlignment = {
        score: Math.min(10, Math.max(1, parsed.brandAlignment.score)),
        feedback: typeof parsed.brandAlignment.feedback === 'string' 
          ? parsed.brandAlignment.feedback.substring(0, 200) 
          : '',
      };
    }
    
    // Validate and extract persona alignment
    if (parsed.personaAlignment && typeof parsed.personaAlignment.score === 'number') {
      result.personaAlignment = {
        score: Math.min(10, Math.max(1, parsed.personaAlignment.score)),
        feedback: typeof parsed.personaAlignment.feedback === 'string' 
          ? parsed.personaAlignment.feedback.substring(0, 200) 
          : '',
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to parse Claude response:', responseText);
    throw new Error('Failed to parse analysis response');
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/analyze-document
 * 
 * Analyzes document content for tone, brand alignment, and persona alignment
 */
export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeDocumentResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<AnalyzeDocumentRequest>;
    
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON', details: 'Please send valid JSON' },
        { status: 400 }
      );
    }
    
    const { content, brandVoice, persona, metricsToAnalyze } = body;
    
    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing content', details: 'Please provide document content to analyze' },
        { status: 400 }
      );
    }
    
    try {
      validateNotEmpty(content, 'Content');
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Empty content', details: error instanceof Error ? error.message : 'Content is empty' },
        { status: 400 }
      );
    }
    
    // Validate metrics array
    if (!Array.isArray(metricsToAnalyze) || metricsToAnalyze.length === 0) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Missing metrics', details: 'Please specify which metrics to analyze' },
        { status: 400 }
      );
    }
    
    // Filter to valid metrics only
    const validMetrics = metricsToAnalyze.filter(
      (m): m is typeof VALID_METRICS[number] => VALID_METRICS.includes(m as any)
    );
    
    if (validMetrics.length === 0) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid metrics', details: `Valid metrics are: ${VALID_METRICS.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check if brand/persona required but not provided
    if (validMetrics.includes('brand') && !brandVoice) {
      // Remove brand from metrics instead of erroring
      const idx = validMetrics.indexOf('brand');
      if (idx > -1) validMetrics.splice(idx, 1);
    }
    
    if (validMetrics.includes('persona') && !persona) {
      // Remove persona from metrics instead of erroring
      const idx = validMetrics.indexOf('persona');
      if (idx > -1) validMetrics.splice(idx, 1);
    }
    
    // If no metrics left after filtering, return empty
    if (validMetrics.length === 0) {
      return NextResponse.json<AnalyzeDocumentResponse>({}, { status: 200 });
    }
    
    // ------------------------------------------------------------------------
    // 2. Initialize Anthropic client
    // ------------------------------------------------------------------------
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY not found');
      return NextResponse.json<ErrorResponse>(
        { error: 'Server configuration error', details: 'API key not configured' },
        { status: 500 }
      );
    }
    
    const anthropic = new Anthropic({ apiKey });
    
    // ------------------------------------------------------------------------
    // 3. Build prompt and call Claude
    // ------------------------------------------------------------------------
    
    const userPrompt = buildAnalysisPrompt(content, validMetrics, brandVoice, persona);
    
    if (!userPrompt) {
      return NextResponse.json<AnalyzeDocumentResponse>({}, { status: 200 });
    }
    
    console.log('📊 Document analysis request:', {
      contentLength: content.length,
      metrics: validMetrics,
      hasBrandVoice: !!brandVoice,
      hasPersona: !!persona,
    });
    
    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 20 seconds')), 20000)
      ),
    ]);
    
    // ------------------------------------------------------------------------
    // 4. Parse and return response
    // ------------------------------------------------------------------------
    
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '';
    
    if (!responseText) {
      console.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { error: 'Analysis failed', details: 'No response from AI' },
        { status: 500 }
      );
    }
    
    const result = parseAnalysisResponse(responseText);
    
    console.log('📊 Document analysis complete:', result);
    
    return NextResponse.json<AnalyzeDocumentResponse>(result, { status: 200 });
    
  } catch (error) {
    logError(error, 'Document analysis API');
    
    // Handle timeout
    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Timeout', details: 'Analysis took too long. Try with shorter content.' },
        { status: 408 }
      );
    }
    
    // Handle Anthropic errors
    if (error instanceof Anthropic.APIError) {
      let userMessage = 'AI service error. Please try again.';
      
      if (error.status === 429) {
        userMessage = 'Rate limit exceeded. Please wait and try again.';
      } else if (error.status === 401 || error.status === 403) {
        userMessage = 'Authentication error. Please contact support.';
      }
      
      return NextResponse.json<ErrorResponse>(
        { error: 'AI service error', details: userMessage },
        { status: error.status || 500 }
      );
    }
    
    return NextResponse.json<ErrorResponse>(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
