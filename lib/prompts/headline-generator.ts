/**
 * @file lib/prompts/headline-generator.ts
 * @description Prompt configuration for the AI Headline Generator tool
 *
 * Contains:
 * - Channel preset definitions with character guidance and viewing context
 * - Tone option definitions
 * - System prompt for Claude
 * - User prompt builder that assembles the full prompt from form data
 */

// ============================================================================
// Channel Presets
// ============================================================================

/**
 * Supported headline channel types
 */
export type HeadlineChannel =
  | 'email-subject'
  | 'landing-page-hero'
  | 'google-ppc'
  | 'facebook-ad'
  | 'linkedin-post'
  | 'video-title'
  | 'blog-post-title'
  | 'print-ad'
  | 'brochure-cover'
  | 'billboard'
  | 'direct-mail-envelope'
  | 'flyer'
  | 'poster'
  | 'custom';

/**
 * Channel preset configuration
 */
export interface ChannelPreset {
  /** Unique channel identifier */
  id: HeadlineChannel;
  /** Display label */
  label: string;
  /** Character/word guidance string */
  characterGuidance: string;
  /** Context about where the headline will be viewed */
  viewingContext: string;
}

/**
 * All channel presets with auto-fill values
 */
export const CHANNEL_PRESETS: ChannelPreset[] = [
  {
    id: 'email-subject',
    label: 'Email Subject Line',
    characterGuidance: '40-50 characters (mobile preview)',
    viewingContext: 'Inbox competition — must stand out in crowded inbox',
  },
  {
    id: 'landing-page-hero',
    label: 'Landing Page Hero',
    characterGuidance: '60-80 characters',
    viewingContext: 'Primary conversion driver — works with supporting subheadline',
  },
  {
    id: 'google-ppc',
    label: 'Google/PPC Ad',
    characterGuidance: '30 characters maximum',
    viewingContext: 'Search intent match — instant clarity required',
  },
  {
    id: 'facebook-ad',
    label: 'Facebook Ad',
    characterGuidance: '40 characters before truncation',
    viewingContext: 'News feed scroll — stop the scroll factor critical',
  },
  {
    id: 'linkedin-post',
    label: 'LinkedIn Post',
    characterGuidance: '150 characters maximum',
    viewingContext: 'Professional network — thought leadership appropriate',
  },
  {
    id: 'video-title',
    label: 'Video Title',
    characterGuidance: '60 characters (full display in search)',
    viewingContext: 'Search results and suggested videos — balance curiosity and clarity',
  },
  {
    id: 'blog-post-title',
    label: 'Blog Post Title',
    characterGuidance: '60 characters (SEO title tag length)',
    viewingContext: 'Search engines and social shares — keyword inclusion matters',
  },
  {
    id: 'print-ad',
    label: 'Print Ad Headline',
    characterGuidance: '10-20 words',
    viewingContext: 'Print media (newspapers, magazines, trade publications) - works with visual and body copy',
  },
  {
    id: 'brochure-cover',
    label: 'Brochure Cover',
    characterGuidance: '5-10 words maximum',
    viewingContext: 'First impression before opening — supporting content inside',
  },
  {
    id: 'billboard',
    label: 'Billboard',
    characterGuidance: '7 words maximum',
    viewingContext: 'Viewed at 55mph — instant comprehension required, no second chances',
  },
  {
    id: 'direct-mail-envelope',
    label: 'Direct Mail Envelope',
    characterGuidance: '8-12 words',
    viewingContext: 'Drive envelope open rate — curiosity over clarity',
  },
  {
    id: 'flyer',
    label: 'Flyer Headline',
    characterGuidance: '10-15 words',
    viewingContext: 'High-distraction environment — must grab attention immediately',
  },
  {
    id: 'poster',
    label: 'Poster Headline',
    characterGuidance: '5-10 words maximum',
    viewingContext: 'Viewed from distance — large type, memorable impact',
  },
  {
    id: 'custom',
    label: 'Custom (I\'ll specify)',
    characterGuidance: '',
    viewingContext: '',
  },
];

/**
 * Look up a channel preset by its ID
 */
export function getChannelPreset(channelId: HeadlineChannel): ChannelPreset | undefined {
  return CHANNEL_PRESETS.find((preset) => preset.id === channelId);
}

// ============================================================================
// Tone Options
// ============================================================================

/**
 * Available tone options for multi-select
 */
export const TONE_OPTIONS = [
  'Professional',
  'Casual',
  'Bold',
  'Empathetic',
  'Urgent',
  'Playful',
  'Sophisticated',
  'Direct',
] as const;

export type ToneOption = (typeof TONE_OPTIONS)[number];

// ============================================================================
// Form Data Interface
// ============================================================================

/**
 * Shape of the headline generator form submission
 */
export interface HeadlineFormData {
  /** Selected channel preset ID */
  channel: HeadlineChannel;
  /** What the user is promoting (required) */
  whatYourePromoting: string;
  /** Target audience description (required) */
  targetAudience: string;
  /** Key benefit or transformation (required) */
  keyBenefit: string;
  /** Unique angle / differentiator (optional) */
  uniqueAngle?: string;
  /** Number of headline variations to generate */
  numberOfVariations: number;
  /** Selected tone preferences */
  tonePreferences: ToneOption[];
  /** Character / word guidance (auto-filled, editable) */
  characterGuidance: string;
  /** Viewing context (auto-filled, editable) */
  viewingContext: string;
  /** Words or phrases to avoid (optional) */
  avoidWords?: string;
  /** Additional context (optional) */
  additionalContext?: string;
}

// ============================================================================
// Parsed Headline Result
// ============================================================================

/**
 * A single parsed headline result
 */
export interface HeadlineResult {
  /** The copywriting formula used (e.g. "BENEFIT-DRIVEN") */
  formula: string;
  /** The generated headline text */
  headline: string;
}

// ============================================================================
// System Prompt
// ============================================================================

/**
 * System prompt for the headline generator Claude call
 */
export const HEADLINE_GENERATOR_SYSTEM_PROMPT = `You are a world-class direct response copywriter with 20+ years of experience crafting headlines that convert. You specialize in channel-specific headline optimization and understand the nuances of every medium — from email subject lines to billboard copy.

Your headlines are known for:
- Clarity over cleverness
- Specific, concrete language (no vague claims)
- Benefit-focused messaging that speaks to the reader's desires
- Natural, human tone (never robotic or corporate-speak)
- Strict adherence to character/word limits

You always use proven copywriting formulas and test different emotional angles across variations. Each headline you produce is strong enough to stand alone as a paid campaign headline.

IMPORTANT: Return ONLY the headlines in the exact format requested. No preamble, no closing remarks, no explanations.`;

// ============================================================================
// Channel-Specific Requirements
// ============================================================================

/**
 * Build the channel-specific requirements block for the prompt
 */
function buildChannelRequirements(channel: HeadlineChannel): string {
  const requirements: Record<string, string> = {
    'email-subject': `CHANNEL-SPECIFIC REQUIREMENTS:
- Maximum 40-50 characters for mobile preview optimization
- Create urgency, curiosity, or personal relevance
- Avoid spam triggers (FREE, !!!, all caps, $$$)
- Test question format vs. statement format
- Consider emoji if brand-appropriate (sparingly)`,

    'landing-page-hero': `CHANNEL-SPECIFIC REQUIREMENTS:
- 60-80 characters ideal
- Lead with strongest benefit or transformation
- Should work with supporting subheadline beneath
- Can be slightly longer/more dramatic
- Focus on clarity over cleverness`,

    'google-ppc': `CHANNEL-SPECIFIC REQUIREMENTS:
- 30 character maximum — this is a hard limit
- Must be instantly clear (no mystery)
- Include benefit or outcome
- Specificity beats vagueness
- Call-out audience when possible`,

    'facebook-ad': `CHANNEL-SPECIFIC REQUIREMENTS:
- 40 characters before truncation
- Must stop the scroll — pattern interrupt is key
- Include benefit or outcome
- Specificity beats vagueness
- Emotional triggers work well in feed`,

    'linkedin-post': `CHANNEL-SPECIFIC REQUIREMENTS:
- 150 characters maximum
- Professional but conversational tone
- Can be thought-provoking question
- Avoid hard selling
- Lead with insight or value`,

    'video-title': `CHANNEL-SPECIFIC REQUIREMENTS:
- 60 characters (full display in search)
- Balance curiosity with clarity
- Include searchable keywords naturally
- Numbers and "How to" perform well
- Avoid clickbait that doesn't deliver`,

    'blog-post-title': `CHANNEL-SPECIFIC REQUIREMENTS:
- 60 characters (SEO title tag length)
- Include relevant keywords naturally
- Can use colons for subtitle structure
- Balance SEO and human appeal
- Specific > vague`,

    'print-ad': `CHANNEL-SPECIFIC REQUIREMENTS:
- 10-20 words
- Bold, clear, benefit-driven
- Print media (newspapers, magazines, trade publications)
- Assume visual support (image/subhead)
- Can be more sophisticated/clever for magazines
- Must work without click-through`,

    'brochure-cover': `CHANNEL-SPECIFIC REQUIREMENTS:
- 5-10 words maximum
- First impression before opening
- Lead with strongest benefit
- Supporting details are inside
- Professional and credible`,

    'billboard': `CHANNEL-SPECIFIC REQUIREMENTS:
- MAXIMUM 7 WORDS — this is critical
- Viewed at 55mph — instant comprehension required
- Clarity trumps cleverness every time
- Avoid complex ideas or multiple concepts
- Large brand recognition assumed`,

    'direct-mail-envelope': `CHANNEL-SPECIFIC REQUIREMENTS:
- 8-12 words
- Purpose: drive envelope open rate
- Curiosity over clarity
- Personal/relevant language
- Tease the benefit inside`,

    'flyer': `CHANNEL-SPECIFIC REQUIREMENTS:
- 10-15 words
- Grab attention in high-distraction environment
- Clear call-to-action implied
- Urgent or time-sensitive language appropriate
- Benefit must be obvious`,

    'poster': `CHANNEL-SPECIFIC REQUIREMENTS:
- 5-10 words maximum
- Viewed from distance — large type
- Dramatic or emotional appeal
- Memorable/quotable
- Visual complement assumed`,
  };

  return requirements[channel] || '';
}

// ============================================================================
// User Prompt Builder
// ============================================================================

/**
 * Build the full user prompt from form data
 *
 * @param data - Validated form data from the headline generator UI
 * @returns Assembled user prompt string for Claude
 */
export function buildHeadlineUserPrompt(data: HeadlineFormData): string {
  const toneStr = data.tonePreferences.length > 0
    ? data.tonePreferences.join(', ')
    : 'Professional';

  const channelPreset = getChannelPreset(data.channel);
  const channelLabel = channelPreset?.label ?? 'Custom';

  const lines: string[] = [
    `Generate ${data.numberOfVariations} headline variations optimized for: ${channelLabel}`,
    '',
    `CHANNEL CONTEXT: ${data.viewingContext}`,
    `CHARACTER GUIDANCE: ${data.characterGuidance}`,
    '',
    'WHAT YOU\'RE PROMOTING:',
    data.whatYourePromoting,
    '',
    'TARGET AUDIENCE:',
    data.targetAudience,
    '',
    'KEY BENEFIT/TRANSFORMATION:',
    data.keyBenefit,
    '',
    'UNIQUE ANGLE/DIFFERENTIATOR:',
    data.uniqueAngle || '(none specified — use your best judgment)',
    '',
    `TONE PREFERENCES: ${toneStr}`,
  ];

  if (data.avoidWords && data.avoidWords.trim().length > 0) {
    lines.push('', `WORDS/PHRASES TO AVOID: ${data.avoidWords}`);
  }

  if (data.additionalContext && data.additionalContext.trim().length > 0) {
    lines.push('', `ADDITIONAL CONTEXT: ${data.additionalContext}`);
  }

  // Channel-specific requirements
  const channelReqs = buildChannelRequirements(data.channel);
  if (channelReqs) {
    lines.push('', '---', '', channelReqs);
  }

  // Core instructions (always included)
  lines.push(
    '',
    '---',
    '',
    'CORE INSTRUCTIONS:',
    '',
    `Create ${data.numberOfVariations} distinct headline variations using different proven copywriting formulas. Each headline must:`,
    '',
    `1. Respect the ${data.characterGuidance} constraints strictly`,
    '2. Test a DIFFERENT ANGLE or emotional trigger (not just rephrasing)',
    `3. Match ${toneStr} tone`,
    '4. Be immediately compelling and clear',
    '5. Focus on outcomes/benefits over features',
    '6. Be specific and concrete (no vague claims)',
    '7. Create appropriate curiosity, urgency, or emotional resonance',
    '8. Sound natural and human (not AI-generated corporate speak)',
    '',
    'USE THESE PROVEN FORMULAS (mix throughout):',
    '',
    'BENEFIT-DRIVEN: "Get X Without Y", "X Made Simple", "The Easy Way to X"',
    'CURIOSITY GAP: "The X Secret That Y", "What X Don\'t Tell You About Y"',
    'HOW-TO: "How to X in Y [timeframe]", "How to X Without Y"',
    'QUESTION: "Struggling With X?", "What If You Could X?"',
    'NUMBER-DRIVEN: "X Ways to Y", "X Mistakes That Cost You Y"',
    'SOCIAL PROOF: "Join X [People] Who Y", "Why X [People] Choose Y"',
    'FOMO/URGENCY: "Last Chance to X", "Don\'t Miss X"',
    'PROBLEM/SOLUTION: "Stop X. Start Y.", "End X Forever"',
    'TRANSFORMATION: "From X to Y in [timeframe]", "Turn X Into Y"',
    'STAT-DRIVEN: "X% of Y Experience Z", "X Proven Ways to Y"',
    'GUARANTEE: "X or Your Money Back", "X Results in Y Days (Guaranteed)"',
    'NEGATIVE ANGLE: "Stop Doing X", "Why X Doesn\'t Work"',
    '',
    '---',
    '',
    'FORMAT YOUR RESPONSE (strictly follow this format):',
    '',
    '[FORMULA NAME]:',
    '- [Headline]',
    '',
    '[FORMULA NAME]:',
    '- [Headline]',
    '',
    `(Continue for all ${data.numberOfVariations} headlines)`,
    '',
    '---',
    '',
    'QUALITY CHECKLIST FOR EVERY HEADLINE:',
    '✓ Respects character/word limits',
    '✓ Uses a distinct formula from others',
    '✓ Tests a unique angle or trigger',
    '✓ Specific and concrete (not vague)',
    '✓ Benefit-focused',
    '✓ Sounds human and natural',
    `✓ Appropriate for ${channelLabel} context`,
    `✓ Matches ${toneStr} tone`,
    '',
    'Generate headlines that a professional copywriter would charge $500+ for. Make each one strong enough to stand alone. Prioritize clarity and conversion over creativity.',
  );

  return lines.join('\n');
}

// ============================================================================
// Response Parser
// ============================================================================

/**
 * Parse the raw Claude response into structured headline results
 *
 * This parser is designed to be forgiving and handle multiple output formats
 * from Claude, including:
 * - Bullet points (• or -)
 * - Numbered lists (1. or 1))
 * - Formula labels ([BENEFIT-DRIVEN]: or BENEFIT-DRIVEN:)
 * - Plain text headlines
 * - Mixed formats in the same response
 *
 * Expected format examples:
 * ```
 * BENEFIT-DRIVEN:
 * - Get More Leads Without Cold Calling
 *
 * • Stop Losing Clients to Bad Follow-Up
 *
 * 1. How to Close 3X More Deals in 30 Days
 * ```
 *
 * @param rawText - Raw text response from Claude
 * @returns Array of parsed headline results with formula labels
 */
export function parseHeadlineResponse(rawText: string): HeadlineResult[] {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  // Split into lines and clean up whitespace
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const headlines: string[] = [];
  const formulaMap = new Map<string, string>(); // Maps headline to formula
  let currentFormula = 'GENERATED'; // Default formula label

  for (const line of lines) {
    // Skip common non-headline preamble/footer content
    if (line.match(/^(here are|your headlines|critical|format|example|quality checklist)/i)) {
      continue;
    }
    if (line.match(/^-{3,}$/)) {
      continue; // Skip separator lines like "---"
    }
    if (line.match(/^✓/)) {
      continue; // Skip checklist items
    }

    // Check if this line is a formula header
    // Matches patterns like:
    // - "BENEFIT-DRIVEN:"
    // - "[BENEFIT-DRIVEN]:"
    // - "HOW-TO (variant):"
    const formulaMatch = line.match(/^(?:\[(.+?)\]|([A-Z][A-Z\s/\-()]+\w)):?\s*$/);
    if (formulaMatch) {
      currentFormula = (formulaMatch[1] || formulaMatch[2]).trim().replace(/:$/, '');
      continue;
    }

    // Try different extraction patterns

    // Pattern 1: Bullet points "• Headline" or "- Headline"
    let match = line.match(/^[•\-]\s*(.+)$/);
    if (match) {
      const headline = match[1].trim();
      headlines.push(headline);
      formulaMap.set(headline, currentFormula);
      continue;
    }

    // Pattern 2: Numbered lists "1. Headline" or "1) Headline"
    match = line.match(/^\d+[\.\)]\s*(.+)$/);
    if (match) {
      const headline = match[1].trim();
      headlines.push(headline);
      formulaMap.set(headline, currentFormula);
      continue;
    }

    // Pattern 3: Formula labels inline "[FORMULA]: Headline" or "FORMULA: Headline"
    match = line.match(/^(?:\[(.+?)\]|([A-Z][A-Z\s/\-()]+\w)):\s*(.+)$/);
    if (match && match[3] && match[3].length > 10) {
      const formula = (match[1] || match[2]).trim();
      const headline = match[3].trim();
      headlines.push(headline);
      formulaMap.set(headline, formula);
      continue;
    }

    // Pattern 4: Plain text that looks like a headline
    // Must be: longer than 10 chars, not all caps, not a question about the task
    if (
      line.length > 10 &&
      line.length < 200 && // Reasonable headline length
      line !== line.toUpperCase() &&
      !line.match(/^(note|important|reminder|tip):/i)
    ) {
      // Additional check: skip lines that look like instructions
      if (!line.match(/^(you must|please|ensure|make sure|remember to)/i)) {
        headlines.push(line);
        formulaMap.set(line, currentFormula);
      }
    }
  }

  // Deduplicate in case we caught the same headline in different formats
  const uniqueHeadlines = [...new Set(headlines)];

  // Convert to HeadlineResult format
  return uniqueHeadlines.map((headline) => ({
    formula: formulaMap.get(headline) || 'GENERATED',
    headline,
  }));
}
