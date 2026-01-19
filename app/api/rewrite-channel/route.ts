/**
 * @file app/api/rewrite-channel/route.ts
 * @description API route for rewriting copy for different marketing channels using Claude AI
 * 
 * This endpoint accepts text and a target channel, then uses Claude to optimize
 * the copy for that specific platform while preserving the core message.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateTextLength, validateNotEmpty, logError } from '@/lib/utils/error-handling';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported channel types for copy rewriting
 */
type ChannelType = 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'email';

/**
 * Request body structure
 */
interface RewriteChannelRequest {
  text: string;
  channel: ChannelType;
}

/**
 * Response body structure
 */
interface RewriteChannelResponse {
  rewrittenText: string;
  originalLength: number;
  newLength: number;
  channel: string;
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

const VALID_CHANNELS: ChannelType[] = ['linkedin', 'twitter', 'instagram', 'facebook', 'email'];

/**
 * System prompt that establishes Claude's role and expertise
 */
const SYSTEM_PROMPT = `You are an expert copywriter with 40 years of experience across all marketing channels. Your job is to rewrite copy to optimize it for specific platforms while preserving the core message and maximizing engagement.

CRITICAL OUTPUT FORMAT:
You must output valid HTML that preserves the original structure while adapting to the channel.
Use only these tags:
- <h2> or <h3> for headings and subject lines
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for bold emphasis
- <em> for italic emphasis

HTML RULES:
- Preserve the original document structure (headings stay headings, bullets stay bullets)
- Adapt the tone and wording for the channel, NOT the structure
- If input has bullets, output must have bullets (just reworded for platform)
- If input has headings, output must have headings
- Output ONLY HTML, no markdown, no preamble
- Do NOT add blank lines between tags
- Adapt style to match platform while preserving formatting

When rewriting:
- Adapt the tone, format, and style to match the platform's best practices
- Maintain the original meaning and key value propositions
- Optimize for the platform's audience expectations and behavior patterns
- Improve clarity and engagement
- Remove redundancies and awkward phrasing
- DO NOT add new information or claims not in the original

Return ONLY the rewritten HTML, no explanations or preambles.`;

/**
 * Channel-specific prompts with platform optimization guidelines
 */
const CHANNEL_PROMPTS: Record<ChannelType, string> = {
  linkedin: `Rewrite this copy for LinkedIn with a professional yet personable tone. Add business context and thought leadership angle. Aim for 1-2 impactful paragraphs that engage professional audiences.

LINKEDIN BEST PRACTICES:
- Professional but conversational tone
- Business value and insights focus
- Thought leadership positioning
- 1-3 paragraphs ideal
- Use line breaks for readability
- Strong opening hook
- Can include relevant hashtags (2-3 max)

ORIGINAL COPY:`,

  twitter: `Rewrite this copy for Twitter/X. Make it punchy and conversational with maximum impact in minimal words. Create a strong hook in the first 10 words. Keep it under 280 characters if possible, but prioritize impact over strict character limits.

TWITTER BEST PRACTICES:
- Punchy and concise
- Strong opening hook (first 10 words critical)
- Conversational tone
- Aim for under 280 characters when possible
- Can use 1-2 relevant hashtags
- Create engagement and shareability

ORIGINAL COPY:`,

  instagram: `Rewrite this copy for Instagram with an emotional, story-driven approach. Use casual, relatable language that connects personally. Format with line breaks for readability. Make it work well alongside visual content.

INSTAGRAM BEST PRACTICES:
- Emotional and story-driven
- Casual, relatable language
- Personal connection focus
- Use line breaks for visual appeal
- Works with visual content
- Longer captions are OK if engaging
- Can include emojis where appropriate
- 3-5 relevant hashtags at the end

ORIGINAL COPY:`,

  facebook: `Rewrite this copy for Facebook with a community-focused, conversational tone. Make it relatable and engaging for diverse audiences. Use friendly, approachable language that encourages interaction.

FACEBOOK BEST PRACTICES:
- Community-focused and conversational
- Relatable to diverse audiences
- Friendly and approachable tone
- Encourage comments and engagement
- Questions work well
- Mix of short and medium length
- Can include emojis naturally

ORIGINAL COPY:`,

  email: `Rewrite this copy for email with a direct, personal tone. Make it scannable with clear value proposition and strong call-to-action. Use short paragraphs and bullet points where appropriate.

EMAIL BEST PRACTICES:
- Direct and personal tone
- Clear value proposition up front
- Scannable format (short paragraphs)
- Use bullet points for key benefits
- Strong, clear call-to-action
- Action-oriented language
- Remove fluff, be concise

ORIGINAL COPY:`,
};

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/rewrite-channel
 * 
 * Rewrites copy for a specific marketing channel using Claude AI
 * 
 * @param request - Next.js request object containing text and channel
 * @returns JSON response with rewritten text or error
 */
export async function POST(request: NextRequest): Promise<NextResponse<RewriteChannelResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Parse and validate request body
    // ------------------------------------------------------------------------
    
    let body: Partial<RewriteChannelRequest>;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid JSON in request body',
          details: 'Please send valid JSON with "text" and "channel" fields'
        },
        { status: 400 }
      );
    }

    const { text, channel } = body;

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

    if (!channel || typeof channel !== 'string') {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Missing or invalid "channel" field',
          details: `Please provide a channel as one of: ${VALID_CHANNELS.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate channel is one of the allowed values
    if (!VALID_CHANNELS.includes(channel as ChannelType)) {
      return NextResponse.json<ErrorResponse>(
        { 
          error: 'Invalid channel value',
          details: `Channel must be one of: ${VALID_CHANNELS.join(', ')}. Received: "${channel}"`
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
          details: error instanceof Error ? error.message : 'Please provide valid text to rewrite'
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
    
    console.log('📝 Rewrite channel request:', {
      originalLength: text.length,
      channel: channel,
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });

    // Build the user prompt with the channel-specific instructions
    const channelPrompt = CHANNEL_PROMPTS[channel as ChannelType];
    const userPrompt = `${channelPrompt}\n\n${text}`;

    // Call Claude's Messages API with timeout
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

    console.log('✅ Rewrite channel successful:', {
      channel,
      originalLength,
      newLength,
      changePercent: ((newLength - originalLength) / originalLength * 100).toFixed(1) + '%',
      preview: rewrittenText.substring(0, 100) + (rewrittenText.length > 100 ? '...' : ''),
    });

    // ------------------------------------------------------------------------
    // 5. Return the rewritten text
    // ------------------------------------------------------------------------
    
    return NextResponse.json<RewriteChannelResponse>(
      {
        rewrittenText,
        originalLength,
        newLength,
        channel,
      },
      { status: 200 }
    );

  } catch (error) {
    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------
    
    logError(error, 'Rewrite channel API');

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
