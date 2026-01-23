/**
 * @file app/api/generate-template/route.ts
 * @description API route for generating copy from templates using Claude AI
 * 
 * This endpoint accepts a template ID, form data, optional brand voice,
 * and optional persona, then uses Claude to generate high-quality copy.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getTemplateById } from '@/lib/data/templates';
import type { 
  TemplateFormData, 
  TemplateGenerationRequest, 
  TemplateGenerationResponse 
} from '@/lib/types/template';
import type { BrandVoice } from '@/lib/types/brand';
import type { Persona } from '@/lib/types/project';
import { logError } from '@/lib/utils/error-handling';
import { logger } from '@/lib/utils/logger';

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
function buildBrandVoiceInstructions(brandVoice: BrandVoice): string {
  return `
BRAND VOICE REQUIREMENTS:

Brand: ${brandVoice.brandName}
Tone: ${brandVoice.brandTone}
Use these phrases: ${brandVoice.approvedPhrases.join(', ')}
Never use: ${brandVoice.forbiddenWords.join(', ')}
Reflect values: ${brandVoice.brandValues.join(', ')}
Mission context: ${brandVoice.missionStatement}

Write in a way that authentically reflects this brand voice.
`;
}

/**
 * Build persona instructions for Claude
 */
function buildPersonaInstructions(persona: Persona): string {
  return `
TARGET PERSONA:

Name: ${persona.name}
Demographics: ${persona.demographics}
Psychographics: ${persona.psychographics}
Pain Points: ${persona.painPoints}
Language they use: ${persona.languagePatterns}
Goals: ${persona.goals}

Write specifically for this persona's context and use language that resonates with them.
`;
}

/**
 * Replace placeholders in system prompt with form data and context
 */
function buildPrompt(
  systemPrompt: string,
  formData: TemplateFormData,
  brandVoice?: BrandVoice,
  persona?: Persona
): string {
  let prompt = systemPrompt;
  
  // Replace form data placeholders
  Object.entries(formData).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    prompt = prompt.replace(new RegExp(placeholder, 'g'), value || '(not provided)');
  });
  
  // Replace brand voice placeholder
  if (brandVoice) {
    const brandInstructions = buildBrandVoiceInstructions(brandVoice);
    prompt = prompt.replace('{brandVoiceInstructions}', brandInstructions);
  } else {
    prompt = prompt.replace('{brandVoiceInstructions}', '');
  }
  
  // Replace persona placeholder
  if (persona) {
    const personaInstructions = buildPersonaInstructions(persona);
    prompt = prompt.replace('{personaInstructions}', personaInstructions);
  } else {
    prompt = prompt.replace('{personaInstructions}', '');
  }
  
  return prompt;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * Extract number of emails from form data for email sequence templates
 * @param formData - Form data from request
 * @returns Number of emails (1 if not an email sequence)
 */
function getEmailSequenceCount(formData: TemplateFormData): number {
  const numberOfEmails = formData.numberOfEmails;
  if (!numberOfEmails) return 1;
  
  // Parse "X emails" format (e.g., "5 emails" -> 5)
  const match = numberOfEmails.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * POST /api/generate-template
 * 
 * Generates copy from a template using Claude AI
 * 
 * @param request - Next.js request object containing template generation request
 * @returns JSON response with generated copy or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<TemplateGenerationResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<TemplateGenerationRequest>;
    
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

    const { templateId, formData, applyBrandVoice, brandVoice, personaId, persona } = body;

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
    // 2. Load template and validate
    // ------------------------------------------------------------------------
    
    const template = getTemplateById(templateId);
    
    if (!template) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Template not found',
          details: `No template found with ID: ${templateId}`
        },
        { status: 404 }
      );
    }

    // Validate required fields are filled
    const missingFields = template.fields
      .filter((field) => field.required && !formData[field.id]?.trim())
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
    // 4. Build prompt from template
    // ------------------------------------------------------------------------
    
    const prompt = buildPrompt(
      template.systemPrompt,
      formData,
      applyBrandVoice && brandVoice ? brandVoice : undefined,
      persona || undefined
    );

    // ------------------------------------------------------------------------
    // 5. Calculate dynamic timeout and tokens for email sequences
    // ------------------------------------------------------------------------
    
    const isEmailSequence = templateId === 'email-sequence-kickoff';
    const emailCount = isEmailSequence ? getEmailSequenceCount(formData) : 1;
    
    // Dynamic timeout: 30s base + 20s per email for sequences
    // 3 emails = 90s, 5 emails = 130s, 7 emails = 170s
    const timeoutMs = isEmailSequence 
      ? 30000 + (emailCount * 20000)
      : 30000;
    
    // Dynamic max tokens: ~1000 tokens per email (subject + body + formatting)
    // Base 4000 for single content, scale up for sequences
    const maxTokens = isEmailSequence 
      ? Math.min(8000, 1200 * emailCount) // Cap at 8000 tokens
      : 4000;
    
    logger.log(`📧 Template: ${templateId}, Emails: ${emailCount}, Timeout: ${timeoutMs}ms, MaxTokens: ${maxTokens}`);

    // ------------------------------------------------------------------------
    // 6. Call Claude API to generate copy
    // ------------------------------------------------------------------------
    
    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Latest Claude Sonnet model
        max_tokens: maxTokens, // Dynamic based on content type
        system: `You are an expert copywriter with 40 years of experience. You create compelling, high-converting copy that resonates with target audiences. Follow all instructions carefully and deliver polished, professional copy.

CRITICAL OUTPUT FORMAT:

You MUST output valid HTML using ONLY these tags:
- <h2> or <h3> for headings and section titles
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for bold text (important phrases, key benefits)
- <em> for italic text (subtle emphasis)
- <br> for line breaks within paragraphs (use sparingly)

HTML OUTPUT RULES:

1. Each paragraph MUST be wrapped in <p> tags
2. Each heading MUST be wrapped in <h2> or <h3> tags
3. Bullet lists MUST use <ul><li>item</li></ul> structure
4. Use <strong> for emphasis, NOT markdown (**text**)
5. Do NOT include any preamble, explanation, or markdown
6. Output ONLY the HTML content, nothing else
7. Ensure proper tag closure (every opening tag has a closing tag)
8. CRITICAL: Do NOT add blank lines between paragraph tags. Write tags consecutively:
   CORRECT: <p>Text</p><p>Next text</p>
   INCORRECT: <p>Text</p>\n\n<p>Next text</p>
9. Do NOT use markdown syntax - only HTML tags

Example email structure:
<h3>Subject: Your Compelling Subject Line</h3>
<p>Dear Prospect,</p>
<p>Opening paragraph with <strong>key benefit</strong> highlighted that addresses their pain point...</p>
<p>Another paragraph explaining the value proposition and how it solves their problem...</p>
<ul>
<li>First benefit with clear, measurable value</li>
<li>Second benefit that resonates with their goals</li>
<li>Third benefit that closes the deal</li>
</ul>
<p>Closing paragraph with strong call-to-action and urgency...</p>
<p>Best regards,<br>Your Name</p>

Example landing page structure:
<h2>Your Compelling Headline That Communicates Core Benefit</h2>
<h3>Supporting subheadline that expands on the promise and builds interest</h3>
<p>Opening paragraph that introduces the <strong>unique value proposition</strong> and establishes credibility...</p>
<p>Another paragraph elaborating on how it works and why it's different from competitors...</p>
<ul>
<li>Key feature with benefit explanation</li>
<li>Another differentiator that matters to the audience</li>
<li>Final proof point that builds trust</li>
</ul>
<p><strong>Social proof:</strong> Trusted by 5,000+ companies including Fortune 500 brands...</p>

Quality Guidelines:
- Keep HTML clean and properly nested
- Use <h2> for main headlines, <h3> for subheadings
- Each idea gets its own <p> or <li> tag
- Use <strong> strategically for key phrases and CTAs
- Ensure bullets are concise and impactful
- No empty tags or unnecessary nesting

REMEMBER: Output ONLY HTML. No markdown, no preamble, no explanation. Just the HTML content.`,
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
    
    const generatedCopy = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '';

    if (!generatedCopy) {
      logger.error('❌ Claude returned empty response');
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'AI processing error',
          details: 'Claude returned an empty response. Please try again.'
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------------
    // 7. Return the generated copy
    // ------------------------------------------------------------------------
    
    return NextResponse.json<TemplateGenerationResponse>(
      {
        generatedCopy,
        prompt: prompt, // Include for debugging (optional)
        metadata: {
          textLength: generatedCopy.length,
          templateUsed: template.name,
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
    
    logError(error, 'Template generation API');

    // Handle timeout errors
    if (error instanceof Error && error.message.includes('timed out')) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Request timeout',
          details: 'Template generation took too long. Please try again or simplify your inputs.'
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

// ============================================================================
// Future Enhancements (TODO)
// ============================================================================

/**
 * TODO: Rate Limiting
 * - Implement per-user rate limiting
 * - Use Redis or Upstash for distributed rate limiting
 * - Return 429 status when rate limit exceeded
 */

/**
 * TODO: Caching
 * - Cache generation results for identical inputs
 * - Use Redis or edge cache (Vercel KV)
 * - Set TTL to 24 hours
 * - Reduces API costs and improves response time
 */

/**
 * TODO: Cost Tracking
 * - Log token usage per request
 * - Track costs per user/organization
 * - Set up usage alerts for high-volume users
 */

/**
 * TODO: Template Versioning
 * - Track template versions
 * - Allow A/B testing different prompt variations
 * - Analytics on which templates perform best
 */
