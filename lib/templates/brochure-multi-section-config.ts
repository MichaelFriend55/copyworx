/**
 * @file lib/templates/brochure-multi-section-config.ts
 * @description Configuration for the Multi-Section Brochure Template
 * 
 * This template allows copywriters to generate brochure content section by section,
 * with each section receiving context from previous sections for consistency.
 * 
 * Sections:
 * 1. Cover/Title
 * 2. Hero/Introduction/Benefits
 * 3. Solutions/Features
 * 4. Case Study/Proof
 * 5. Call-to-Action
 * 6. Other (custom section)
 */

import type { MultiSectionTemplate, TemplateSection } from '@/lib/types/template-progress';

/**
 * Section separator used between generated sections
 * Visible as horizontal rule in editor, clean for print
 */
export const SECTION_SEPARATOR = '\n\n<hr class="brochure-section-break" />\n\n';

/**
 * Cover/Title Section Configuration
 */
export const COVER_SECTION: TemplateSection = {
  id: 'cover',
  name: 'Cover/Title',
  description: 'The front cover that creates first impression and establishes brand identity',
  fields: [
    {
      id: 'brochureTitle',
      label: 'Brochure Title',
      type: 'text',
      placeholder: 'e.g., Transform Your Business with AI-Powered Solutions',
      helperText: 'Main headline for the brochure cover',
      required: true,
      maxLength: 100,
    },
    {
      id: 'subtitle',
      label: 'Subtitle/Tagline',
      type: 'text',
      placeholder: 'e.g., Your Partner in Digital Transformation',
      helperText: 'Supporting line beneath the main title',
      required: false,
      maxLength: 150,
    },
    {
      id: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'e.g., Acme Technologies Inc.',
      helperText: 'Your company or brand name',
      required: true,
      maxLength: 100,
    },
    {
      id: 'coverTone',
      label: 'Tone',
      type: 'select',
      helperText: 'The overall tone for the cover',
      required: true,
      options: ['Professional', 'Bold', 'Friendly', 'Authoritative'],
    },
  ],
};

/**
 * Hero/Introduction/Benefits Section Configuration
 */
export const HERO_SECTION: TemplateSection = {
  id: 'hero',
  name: 'Hero/Introduction/Benefits',
  description: 'The opening section that hooks readers and communicates core value',
  fields: [
    {
      id: 'mainValueProp',
      label: 'Main Value Proposition',
      type: 'textarea',
      placeholder: 'e.g., We help mid-size businesses reduce operational costs by 40% through intelligent automation while improving customer satisfaction scores.',
      helperText: 'The core promise and unique value you deliver (2-3 sentences)',
      required: true,
      maxLength: 500,
    },
    {
      id: 'keyBenefits',
      label: 'Key Benefits',
      type: 'textarea',
      placeholder: 'e.g., Reduce costs by 40%, Automate repetitive tasks, 24/7 customer support, Seamless integration',
      helperText: 'Main benefits, separated by commas',
      required: true,
      maxLength: 400,
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'text',
      placeholder: 'e.g., Operations managers at companies with 100-500 employees',
      helperText: 'Who is this brochure for?',
      required: true,
      maxLength: 200,
    },
    {
      id: 'emotionalAngle',
      label: 'Emotional Angle',
      type: 'select',
      helperText: 'Primary emotional driver to emphasize',
      required: true,
      options: ['Trust', 'Innovation', 'Results', 'Transformation'],
    },
  ],
};

/**
 * Solutions/Features Section Configuration
 */
export const SOLUTIONS_SECTION: TemplateSection = {
  id: 'solutions',
  name: 'Solutions/Features',
  description: 'Detailed breakdown of your product/service offerings',
  fields: [
    {
      id: 'productServiceName',
      label: 'Product/Service Name',
      type: 'text',
      placeholder: 'e.g., AutomateNow Platform',
      helperText: 'Name of the product or service being featured',
      required: true,
      maxLength: 100,
    },
    {
      id: 'mainFeatures',
      label: 'Main Features',
      type: 'textarea',
      placeholder: 'e.g.,\nAI-powered workflow automation\nReal-time analytics dashboard\nCustom integration API\n24/7 support portal',
      helperText: 'Key features, one per line',
      required: true,
      maxLength: 600,
    },
    {
      id: 'featureEmphasis',
      label: 'Feature Emphasis',
      type: 'select',
      helperText: 'How should features be presented?',
      required: true,
      options: ['Technical specs', 'User benefits', 'Both'],
    },
  ],
};

/**
 * Case Study/Proof Section Configuration
 */
export const CASE_STUDY_SECTION: TemplateSection = {
  id: 'caseStudy',
  name: 'Case Study/Proof',
  description: 'Social proof through customer success stories or data',
  fields: [
    {
      id: 'includeCaseStudy',
      label: 'Include Case Study?',
      type: 'select',
      helperText: 'Choose the type of proof to include',
      required: true,
      options: ['Yes - Full case study', 'No - Other proof type'],
    },
    // Case study fields (conditional on includeCaseStudy = Yes)
    {
      id: 'clientName',
      label: 'Client Name',
      type: 'text',
      placeholder: 'e.g., GlobalTech Industries',
      helperText: 'Name of the client (can be anonymized)',
      required: false,
      maxLength: 100,
      conditionalOn: {
        fieldId: 'includeCaseStudy',
        value: 'Yes - Full case study',
      },
    },
    {
      id: 'challenge',
      label: 'Challenge',
      type: 'textarea',
      placeholder: 'e.g., GlobalTech was processing 10,000+ invoices monthly with a 5% error rate and 3-day average processing time...',
      helperText: 'What problem did the client face?',
      required: false,
      maxLength: 400,
      conditionalOn: {
        fieldId: 'includeCaseStudy',
        value: 'Yes - Full case study',
      },
    },
    {
      id: 'result',
      label: 'Result',
      type: 'textarea',
      placeholder: 'e.g., Reduced processing time to 4 hours, achieved 99.9% accuracy, saved $200K annually in labor costs...',
      helperText: 'What results did they achieve? Include specific metrics',
      required: false,
      maxLength: 400,
      conditionalOn: {
        fieldId: 'includeCaseStudy',
        value: 'Yes - Full case study',
      },
    },
    // Alternative proof fields (conditional on includeCaseStudy = No)
    {
      id: 'proofType',
      label: 'Other Proof Type',
      type: 'textarea',
      placeholder: 'e.g., "Trusted by 500+ companies including Fortune 500 brands"\n"Winner of 2024 Innovation Award"\n"4.9/5 rating from 1,000+ reviews"',
      helperText: 'Enter testimonials, statistics, awards, or certifications',
      required: false,
      maxLength: 500,
      conditionalOn: {
        fieldId: 'includeCaseStudy',
        value: 'No - Other proof type',
      },
    },
  ],
};

/**
 * Call-to-Action Section Configuration
 */
export const CTA_SECTION: TemplateSection = {
  id: 'cta',
  name: 'Call-to-Action',
  description: 'The closing section that drives reader to take action',
  fields: [
    {
      id: 'primaryCTA',
      label: 'Primary CTA',
      type: 'text',
      placeholder: 'e.g., Schedule Your Free Demo Today',
      helperText: 'The main action you want readers to take',
      required: true,
      maxLength: 100,
    },
    {
      id: 'urgencyLevel',
      label: 'Urgency Level',
      type: 'select',
      helperText: 'How urgent should the call-to-action feel?',
      required: true,
      options: ['High', 'Medium', 'Low'],
    },
    {
      id: 'contactMethod',
      label: 'Contact Method',
      type: 'select',
      helperText: 'How should readers reach you?',
      required: true,
      options: ['Phone', 'Email', 'Website', 'Schedule demo'],
    },
  ],
};

/**
 * Other/Custom Section Configuration
 */
export const OTHER_SECTION: TemplateSection = {
  id: 'other',
  name: 'Other',
  description: 'Custom section for additional content not covered by standard sections',
  fields: [
    {
      id: 'sectionName',
      label: 'Section Name',
      type: 'text',
      placeholder: 'e.g., Pricing Plans, FAQ, Team, History',
      helperText: 'What should this section be called?',
      required: true,
      maxLength: 50,
    },
    {
      id: 'sectionPurpose',
      label: 'Section Purpose',
      type: 'textarea',
      placeholder: 'e.g., This section should outline our three pricing tiers and help readers choose the right plan for their needs...',
      helperText: 'What should this section accomplish? Be specific about goals',
      required: true,
      maxLength: 300,
    },
    {
      id: 'keyPoints',
      label: 'Key Points',
      type: 'textarea',
      placeholder: 'e.g.,\nStarter: $99/mo - up to 10 users\nPro: $299/mo - up to 50 users\nEnterprise: Custom - unlimited users',
      helperText: 'Main points to include in this section',
      required: true,
      maxLength: 600,
    },
  ],
};

/**
 * All sections in order
 */
export const BROCHURE_SECTIONS: TemplateSection[] = [
  COVER_SECTION,
  HERO_SECTION,
  SOLUTIONS_SECTION,
  CASE_STUDY_SECTION,
  CTA_SECTION,
  OTHER_SECTION,
];

/**
 * Get section by ID
 */
export function getSectionById(sectionId: string): TemplateSection | undefined {
  return BROCHURE_SECTIONS.find(section => section.id === sectionId);
}

/**
 * Get section index by ID
 */
export function getSectionIndex(sectionId: string): number {
  return BROCHURE_SECTIONS.findIndex(section => section.id === sectionId);
}

/**
 * System prompt prefix for brochure sections
 */
export const BROCHURE_SYSTEM_PROMPT_PREFIX = `You are an expert B2B copywriter with 20+ years of experience creating high-converting marketing collateral. You specialize in brochure copy that is:
- Benefit-focused and customer-centric
- Professional yet engaging
- Scannable with clear hierarchy
- Consistent in tone and messaging
- Persuasive without being pushy

OUTPUT FORMAT: Generate ONLY clean HTML using these tags:
- <h2> or <h3> for headings
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for emphasis
- <em> for subtle emphasis

Do NOT include section titles/headers in your output - those are added automatically.
Generate ONLY the body content for the section.`;

/**
 * Build section-specific prompt
 */
export function buildSectionPrompt(
  sectionId: string,
  formData: Record<string, string>,
  previousContent?: string,
  brandVoice?: string,
  persona?: string
): string {
  const section = getSectionById(sectionId);
  if (!section) {
    throw new Error(`Unknown section ID: ${sectionId}`);
  }

  let prompt = BROCHURE_SYSTEM_PROMPT_PREFIX;

  // Add context from previous sections
  if (previousContent && previousContent.trim().length > 0) {
    prompt += `\n\n=== PREVIOUS BROCHURE CONTENT ===
${previousContent}
=== END PREVIOUS CONTENT ===

Your new section MUST:
- Flow naturally from the content above
- Maintain consistent tone and messaging
- Reference and build upon key themes
- Not repeat information already covered`;
  } else {
    prompt += `\n\nThis is the FIRST section of the brochure. Establish the tone and core messaging that subsequent sections will follow.`;
  }

  // Add brand voice if provided
  if (brandVoice) {
    prompt += `\n\n=== BRAND VOICE GUIDELINES ===
${brandVoice}`;
  }

  // Add persona if provided
  if (persona) {
    prompt += `\n\n=== TARGET PERSONA ===
${persona}`;
  }

  // Add section-specific instructions
  prompt += `\n\n=== SECTION: ${section.name.toUpperCase()} ===
${getSectionInstructions(sectionId)}

=== FORM INPUTS ===
${JSON.stringify(formData, null, 2)}

Generate compelling copy for this section that:
1. Achieves the specific goals of a ${section.name} section
2. Uses professional, benefit-focused language
3. Is appropriate length for a brochure (100-250 words)
4. Flows naturally if following previous content

OUTPUT ONLY THE HTML CONTENT. No preamble, no explanations.`;

  return prompt;
}

/**
 * Get section-specific instructions for Claude
 */
function getSectionInstructions(sectionId: string): string {
  const instructions: Record<string, string> = {
    cover: `Purpose: Create an impactful opening that captures attention and establishes brand identity.
Requirements:
- Compelling headline that communicates the core benefit
- Tagline that supports the headline
- Professional brand positioning
Length: Brief - this is cover copy, not body copy. 2-4 lines max.`,

    hero: `Purpose: Hook the reader and communicate your unique value proposition.
Requirements:
- Open with the main value proposition prominently
- Present key benefits in a scannable format
- Address the target audience's needs directly
- Create emotional connection based on the specified angle
Length: 150-200 words, including benefit bullets.`,

    solutions: `Purpose: Detail your product/service offerings and how they solve problems.
Requirements:
- Lead with the product/service name and brief overview
- Present features with clear benefit statements
- Use the specified emphasis (technical, benefits, or both)
- Make it scannable with bullets or short paragraphs
Length: 150-250 words.`,

    caseStudy: `Purpose: Build credibility through proof of results.
Requirements:
- If case study: Tell a compelling transformation story (Challenge → Solution → Result)
- Include specific metrics and outcomes
- If alternative proof: Present testimonials, stats, or awards compellingly
- Make the proof relevant to the target audience
Length: 150-200 words.`,

    cta: `Purpose: Drive the reader to take immediate action.
Requirements:
- Clear, compelling primary call-to-action
- Match urgency level to the specified setting
- Include appropriate contact method
- Create a sense of what they'll gain by acting
Length: 75-125 words. Keep it focused and actionable.`,

    other: `Purpose: Create a custom section based on user specifications.
Requirements:
- Match the section name and purpose provided
- Cover all key points specified
- Maintain consistency with the brochure's overall tone
- Format appropriately for the content type
Length: 100-200 words.`,
  };

  return instructions[sectionId] || 'Generate professional brochure copy for this section.';
}

/**
 * Complete Multi-Section Brochure Template Definition
 */
export const BROCHURE_MULTI_SECTION_TEMPLATE: MultiSectionTemplate = {
  id: 'brochure-multi-section',
  name: 'Brochure Copy (Multi-Section)',
  category: 'advanced',
  description: 'Generate complete brochure copy section by section with context. Progress saves across sessions.',
  complexity: 'Advanced',
  estimatedTime: '30-45 min',
  icon: 'BookOpen',
  sections: BROCHURE_SECTIONS,
  sectionSeparator: SECTION_SEPARATOR,
  systemPromptPrefix: BROCHURE_SYSTEM_PROMPT_PREFIX,
};

/**
 * Export for template registry
 */
export default BROCHURE_MULTI_SECTION_TEMPLATE;
