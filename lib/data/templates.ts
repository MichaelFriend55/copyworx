/**
 * @file lib/data/templates.ts
 * @description Template definitions for copywriting generation
 * 
 * Contains all available templates with their form fields and AI prompts.
 * To add a new template, simply add it to the ALL_TEMPLATES array.
 */

import { Template, TemplateCategory } from '@/lib/types/template';

/**
 * Sales Email Template
 * Generates persuasive cold outreach sales emails
 */
export const SALES_EMAIL_TEMPLATE: Template = {
  id: 'sales-email',
  name: 'Sales Email',
  category: 'email',
  description: 'Craft a persuasive sales email that addresses pain points and drives conversions.',
  complexity: 'Intermediate',
  estimatedTime: '15-20 min',
  icon: 'DollarSign',
  fields: [
    {
      id: 'productService',
      label: 'Product/Service',
      type: 'textarea',
      placeholder: 'e.g., An AI-powered copywriting tool that generates marketing content in seconds...',
      helperText: 'What are you selling? Include key features and benefits',
      required: true,
      maxLength: 400
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'e.g., Small business owners who struggle to write marketing content...',
      helperText: 'Who is this email for? Be specific about their situation',
      required: true,
      maxLength: 300
    },
    {
      id: 'painPoints',
      label: 'Pain Points',
      type: 'textarea',
      placeholder: 'e.g., Spending hours writing copy, inconsistent brand voice, writer\'s block...',
      helperText: 'What problems does your audience face? (one per line)',
      required: true,
      maxLength: 400
    },
    {
      id: 'specialOffer',
      label: 'Special Offer',
      type: 'textarea',
      placeholder: 'e.g., 50% off for the first 3 months, plus free onboarding and priority support',
      helperText: 'Any special pricing or bonus to include?',
      required: false,
      maxLength: 150
    },
    {
      id: 'urgencyType',
      label: 'Urgency Type',
      type: 'select',
      helperText: 'What creates urgency to act now?',
      required: true,
      options: [
        'Limited Time Offer',
        'Limited Quantity',
        'Exclusive Access',
        'Price Increase Coming',
        'Seasonal/Event-Based',
        'No Urgency',
        'Other (specify)'
      ]
    },
    {
      id: 'callToAction',
      label: 'Call-to-Action',
      type: 'textarea',
      placeholder: 'e.g., Start Your Free Trial - No Credit Card Required',
      helperText: 'The button or link text (can include supporting text)',
      required: true,
      maxLength: 100
    }
  ],
  systemPrompt: `You are an expert sales copywriter. Create a persuasive cold outreach sales email based on the following details:

Product/Service: {productService}
Target Audience: {targetAudience}
Pain Points: {painPoints}
Special Offer: {specialOffer}
Urgency Type: {urgencyType}
Call-to-Action: {callToAction}

{brandVoiceInstructions}
{personaInstructions}

Write a compelling sales email that:
1. Opens with a hook that addresses their pain point
2. Presents the solution (product/service) with benefits
3. Includes social proof or credibility if relevant
4. Creates urgency to act
5. Ends with a clear call-to-action

Format as a complete email with subject line.`
};

/**
 * Landing Page Hero Template
 * Generates above-the-fold hero section copy
 */
export const LANDING_PAGE_HERO_TEMPLATE: Template = {
  id: 'landing-page-hero',
  name: 'Landing Page Hero',
  category: 'landing-page',
  description: 'Create a powerful above-the-fold hero section that communicates your value proposition.',
  complexity: 'Intermediate',
  estimatedTime: '15-20 min',
  icon: 'Target',
  fields: [
    {
      id: 'productService',
      label: 'Product/Service',
      type: 'textarea',
      placeholder: 'e.g., A project management tool for remote teams with task tracking and video meetings...',
      helperText: 'What are you offering?',
      required: true,
      maxLength: 500
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'e.g., Remote team leaders at startups frustrated with using multiple tools...',
      helperText: 'Who is this page for?',
      required: true,
      maxLength: 400
    },
    {
      id: 'primaryProblem',
      label: 'Primary Problem',
      type: 'textarea',
      placeholder: 'e.g., Remote teams waste 5+ hours per week switching between tools...',
      helperText: 'The #1 problem you solve',
      required: true,
      maxLength: 300
    },
    {
      id: 'uniqueValueProp',
      label: 'Unique Value Proposition',
      type: 'textarea',
      placeholder: 'e.g., The only platform that combines project management with AI meeting summaries...',
      helperText: 'What makes you different?',
      required: true,
      maxLength: 300
    },
    {
      id: 'socialProof',
      label: 'Social Proof',
      type: 'textarea',
      placeholder: 'e.g., Trusted by 5,000+ remote teams including Shopify and Figma',
      helperText: 'Customer count, logos, or testimonial',
      required: false,
      maxLength: 200
    },
    {
      id: 'primaryCTA',
      label: 'Primary CTA',
      type: 'textarea',
      placeholder: 'e.g., Start Free Trial - No Credit Card Required',
      helperText: 'Main button text (can include supporting text)',
      required: true,
      maxLength: 100
    },
    {
      id: 'pageGoal',
      label: 'Page Goal',
      type: 'select',
      helperText: 'Primary conversion goal',
      required: true,
      options: [
        'Free Trial Signup',
        'Demo Request',
        'Email Capture',
        'Purchase/Checkout',
        'Waitlist Signup',
        'Download Resource',
        'Other (specify)'
      ]
    }
  ],
  systemPrompt: `You are an expert conversion copywriter. Create a high-converting landing page hero section based on these details:

Product/Service: {productService}
Target Audience: {targetAudience}
Primary Problem: {primaryProblem}
Unique Value Proposition: {uniqueValueProp}
Social Proof: {socialProof}
Primary CTA: {primaryCTA}
Page Goal: {pageGoal}

{brandVoiceInstructions}
{personaInstructions}

Write hero section copy that includes:
1. Headline: Clear, benefit-driven, addresses the problem (8-12 words)
2. Subheadline: Expands on headline, communicates unique value (15-25 words)
3. Supporting Copy: 2-3 sentences elaborating on benefits and solution
4. Social Proof Line: Brief credibility statement if provided
5. CTA Copy: The button text and optional supporting microcopy

Format each element clearly labeled.`
};

/**
 * Email Sequence Kickoff Template
 * Creates compelling first email for subscriber welcome sequences
 */
export const EMAIL_SEQUENCE_KICKOFF_TEMPLATE: Template = {
  id: 'email-sequence-kickoff',
  name: 'Email Sequence Kickoff',
  category: 'email',
  description: 'Create a compelling first email that welcomes subscribers and sets expectations.',
  complexity: 'Beginner',
  estimatedTime: '10-15 min',
  icon: 'Mail',
  fields: [
    {
      id: 'campaignType',
      label: 'Campaign Type',
      type: 'select',
      helperText: 'What type of email sequence is this?',
      required: true,
      options: [
        'Welcome Series',
        'Lead Magnet Follow-up',
        'Product Launch',
        'Course/Training',
        'Newsletter',
        'Other (specify)'
      ]
    },
    {
      id: 'sequenceLength',
      label: 'Sequence Length',
      type: 'select',
      helperText: 'How many emails in this sequence?',
      required: true,
      options: [
        '3-email series',
        '5-email series',
        '7-email series'
      ]
    },
    {
      id: 'recipientProfile',
      label: 'Recipient Profile',
      type: 'textarea',
      placeholder: 'e.g., Small business owners who signed up for our free marketing checklist...',
      helperText: 'Who receives this email? Describe their background and interests',
      required: true,
      maxLength: 400
    },
    {
      id: 'offerValue',
      label: 'Offer/Value Proposition',
      type: 'textarea',
      placeholder: 'e.g., Weekly marketing tips, exclusive discounts, and insider strategies...',
      helperText: 'What value are you offering subscribers?',
      required: true,
      maxLength: 300
    },
    {
      id: 'tone',
      label: 'Tone',
      type: 'select',
      helperText: 'What tone should this email have?',
      required: true,
      options: [
        'Professional',
        'Friendly',
        'Educational',
        'Enthusiastic',
        'Authoritative',
        'Other (specify)'
      ]
    },
    {
      id: 'emailGoal',
      label: 'Email Goal',
      type: 'select',
      helperText: 'Primary objective of this first email',
      required: true,
      options: [
        'Build Trust',
        'Educate',
        'Drive Action',
        'Set Expectations',
        'Deliver Value',
        'Other (specify)'
      ]
    },
    {
      id: 'keyMessage',
      label: 'Key Message',
      type: 'textarea',
      placeholder: "e.g., We're here to help you grow, not sell you stuff...",
      helperText: 'Specific message or theme to emphasize (optional)',
      required: false,
      maxLength: 250
    }
  ],
  systemPrompt: `You are an expert email marketing copywriter specializing in nurture sequences. Create a compelling first/kickoff email based on these details:

Campaign Type: {campaignType}
Sequence Length: {sequenceLength}
Recipient Profile: {recipientProfile}
Offer/Value Proposition: {offerValue}
Tone: {tone}
Email Goal: {emailGoal}
Key Message: {keyMessage}

{brandVoiceInstructions}
{personaInstructions}

Write a powerful kickoff email that:
1. Opens with a warm, engaging subject line that creates curiosity
2. Welcomes them personally and acknowledges why they signed up
3. Clearly communicates what to expect from the email sequence
4. Delivers immediate value (a tip, insight, or resource)
5. Sets expectations for frequency and content type
6. Teases what's coming next in the sequence
7. Ends with a soft call-to-action (reply, follow, read, etc.)

Target length: 200-350 words for the email body.
Format as a complete email with subject line.`
};

/**
 * Social Media Ad Copy Template
 * Generates high-converting copy for paid social ads
 */
export const SOCIAL_MEDIA_AD_COPY_TEMPLATE: Template = {
  id: 'social-media-ad-copy',
  name: 'Social Media Ad Copy',
  category: 'advertising',
  description: 'Generate high-converting copy for paid social ads (Facebook, LinkedIn, TikTok, Google).',
  complexity: 'Intermediate',
  estimatedTime: '10-15 min',
  icon: 'Megaphone',
  fields: [
    {
      id: 'platform',
      label: 'Platform',
      type: 'select',
      helperText: 'Which advertising platform is this for?',
      required: true,
      options: [
        'Facebook/Instagram',
        'LinkedIn',
        'TikTok',
        'Twitter/X',
        'Pinterest',
        'Google Search',
        'Other (specify)'
      ]
    },
    {
      id: 'characterLimit',
      label: 'Character Limit',
      type: 'select',
      helperText: 'How long should the ad copy be?',
      required: true,
      options: [
        'Short (100 chars)',
        'Medium (200 chars)',
        'Long (400 chars)'
      ]
    },
    {
      id: 'productService',
      label: 'Product/Service',
      type: 'textarea',
      placeholder: 'e.g., AI-powered writing assistant that helps marketers create content 10x faster...',
      helperText: 'What are you advertising? Include key features',
      required: true,
      maxLength: 600
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'e.g., Marketing managers at B2B SaaS companies, 30-45 years old, struggling with content creation...',
      helperText: 'Who are you trying to reach? Be specific',
      required: true,
      maxLength: 500
    },
    {
      id: 'primaryBenefit',
      label: 'Primary Benefit',
      type: 'select',
      helperText: 'Main benefit to highlight',
      required: true,
      options: [
        'Save Time',
        'Save Money',
        'Increase Revenue',
        'Solve Problem',
        'Achieve Goal',
        'Learn Skill',
        'Other (specify)'
      ]
    },
    {
      id: 'emotionalTrigger',
      label: 'Emotional Trigger',
      type: 'select',
      helperText: 'Psychology angle to leverage',
      required: true,
      options: [
        'FOMO',
        'Curiosity',
        'Aspiration',
        'Pain Point',
        'Social Proof',
        'Urgency',
        'Other (specify)'
      ]
    },
    {
      id: 'uniqueAngle',
      label: 'Unique Angle',
      type: 'textarea',
      placeholder: 'e.g., Only AI tool trained on top-performing ads, not generic content...',
      helperText: 'What makes you different from competitors?',
      required: true,
      maxLength: 400
    }
  ],
  systemPrompt: `You are a performance marketing expert who writes high-converting paid social ads. Create ad copy based on these details:

Platform: {platform}
Character Limit: {characterLimit}
Product/Service: {productService}
Target Audience: {targetAudience}
Primary Benefit: {primaryBenefit}
Emotional Trigger: {emotionalTrigger}
Unique Angle: {uniqueAngle}

{brandVoiceInstructions}
{personaInstructions}

Write 3 ad variations that:
1. Hook attention in the first line (pattern interrupt or question)
2. Speak directly to the target audience's situation
3. Highlight the primary benefit clearly
4. Leverage the emotional trigger effectively
5. Include a compelling call-to-action
6. Stay within the specified character limit

Platform-specific guidelines:
- Facebook/Instagram: Conversational, visual language, emoji optional
- LinkedIn: Professional, data-driven, business outcomes
- TikTok: Casual, trendy, authentic voice
- Twitter/X: Punchy, concise, hashtag-friendly
- Pinterest: Inspirational, action-oriented
- Google Search: Keyword-focused, benefit-driven headlines

Provide 3 distinct variations with different hooks and angles.`
};

/**
 * Social Media Post Template
 * Creates engaging organic social media content
 */
export const SOCIAL_MEDIA_POST_TEMPLATE: Template = {
  id: 'social-media-post',
  name: 'Social Media Post',
  category: 'social',
  description: 'Create engaging social media content that stops the scroll and drives engagement.',
  complexity: 'Beginner',
  estimatedTime: '5-10 min',
  icon: 'MessageSquare',
  fields: [
    {
      id: 'platform',
      label: 'Platform',
      type: 'select',
      helperText: 'Which social platform is this for?',
      required: true,
      options: [
        'LinkedIn',
        'Instagram',
        'Facebook',
        'Twitter/X',
        'TikTok',
        'Other (specify)'
      ]
    },
    {
      id: 'postType',
      label: 'Post Type',
      type: 'select',
      helperText: 'What kind of content are you creating?',
      required: true,
      options: [
        'Educational',
        'Inspirational',
        'Behind-the-Scenes',
        'Question/Poll',
        'Announcement',
        'Story',
        'Other (specify)'
      ]
    },
    {
      id: 'hookStyle',
      label: 'Hook Style',
      type: 'select',
      helperText: 'How should the post start to grab attention?',
      required: true,
      options: [
        'Question',
        'Statistic',
        'Bold Statement',
        'Personal Story',
        'Contrarian Take',
        'Other (specify)'
      ]
    },
    {
      id: 'topic',
      label: 'Topic/Main Idea',
      type: 'textarea',
      placeholder: 'e.g., Why 80% of startups fail at content marketing and how to avoid it...',
      helperText: 'What is the main message of this post?',
      required: true,
      maxLength: 300
    },
    {
      id: 'keyPoints',
      label: 'Key Points',
      type: 'textarea',
      placeholder: 'e.g., \n- Consistency beats perfection\n- Know your audience deeply\n- Repurpose content across channels',
      helperText: 'Main points to cover (one per line)',
      required: true,
      maxLength: 500
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'e.g., Early-stage founders and marketers',
      helperText: 'Who should resonate with this post?',
      required: true,
      maxLength: 150
    },
    {
      id: 'tone',
      label: 'Tone',
      type: 'select',
      helperText: 'What tone should the post have?',
      required: true,
      options: [
        'Professional',
        'Casual',
        'Inspirational',
        'Educational',
        'Humorous',
        'Other (specify)'
      ]
    },
    {
      id: 'callToAction',
      label: 'Call-to-Action',
      type: 'select',
      helperText: 'What action do you want readers to take? (optional)',
      required: false,
      options: [
        'Comment',
        'Share',
        'Click Link',
        'Tag Someone',
        'Save Post',
        'Other (specify)'
      ]
    }
  ],
  systemPrompt: `You are a social media expert who creates viral, engaging content. Write a social post based on these details:

Platform: {platform}
Post Type: {postType}
Hook Style: {hookStyle}
Topic: {topic}
Key Points: {keyPoints}
Target Audience: {targetAudience}
Tone: {tone}
Call-to-Action: {callToAction}

{brandVoiceInstructions}
{personaInstructions}

Create a scroll-stopping post that:
1. Opens with a powerful hook that matches the specified style
2. Delivers valuable content based on the key points
3. Uses appropriate formatting for the platform
4. Maintains the specified tone throughout
5. Ends with a clear call-to-action if specified
6. Uses line breaks strategically for readability

Platform-specific formatting:
- LinkedIn: Professional, line breaks every 1-2 sentences, no hashtags in body
- Instagram: Visual language, emojis encouraged, hashtags at end
- Facebook: Conversational, medium length, engagement questions
- Twitter/X: Punchy and concise, thread format if needed
- TikTok: Trendy, hooks viewers immediately, casual tone

Target length by platform:
- LinkedIn: 150-250 words
- Instagram: 100-200 words (caption)
- Facebook: 100-150 words
- Twitter/X: Under 280 characters (or thread)
- TikTok: 50-100 words (script style)`
};

/**
 * Print Media Template
 * Copy for print ads in magazines, newspapers, billboards, and direct mail
 */
export const PRINT_MEDIA_TEMPLATE: Template = {
  id: 'print-media',
  name: 'Print Media',
  category: 'advertising',
  description: 'Copy for print ads (magazine, newspaper, direct mail, billboards).',
  complexity: 'Intermediate',
  estimatedTime: '10-15 min',
  icon: 'FileText',
  fields: [
    {
      id: 'adFormat',
      label: 'Ad Format/Size',
      type: 'select',
      helperText: 'What format is this ad?',
      required: true,
      options: [
        'Full Page',
        'Half Page',
        'Quarter Page',
        'Billboard',
        'Direct Mail Postcard',
        'Flyer'
      ]
    },
    {
      id: 'publicationType',
      label: 'Publication Type',
      type: 'select',
      helperText: 'Where will this ad appear?',
      required: true,
      options: [
        'Trade Magazine',
        'Consumer Magazine',
        'Newspaper',
        'Direct Mail',
        'Out-of-Home',
        'Other (specify)'
      ]
    },
    {
      id: 'headlineStyle',
      label: 'Headline Style',
      type: 'select',
      helperText: 'What type of headline approach?',
      required: true,
      options: [
        'Benefit-Driven',
        'Question',
        'Command',
        'News',
        'Curiosity',
        'How-To',
        'Other (specify)'
      ]
    },
    {
      id: 'productService',
      label: 'Product/Service',
      type: 'textarea',
      placeholder: 'e.g., Premium organic coffee subscription delivered fresh weekly...',
      helperText: 'What are you advertising?',
      required: true,
      maxLength: 200
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'e.g., Coffee enthusiasts, 35-55, who value quality and convenience...',
      helperText: 'Who is this ad targeting?',
      required: true,
      maxLength: 300
    },
    {
      id: 'primaryBenefit',
      label: 'Primary Benefit',
      type: 'select',
      helperText: 'Main benefit to highlight',
      required: true,
      options: [
        'Save Time',
        'Save Money',
        'Improve Quality',
        'Solve Problem',
        'Enhance Status',
        'Other (specify)'
      ]
    },
    {
      id: 'tone',
      label: 'Tone',
      type: 'select',
      helperText: 'What tone should the ad convey?',
      required: true,
      options: [
        'Professional',
        'Urgent',
        'Luxurious',
        'Practical',
        'Bold',
        'Other (specify)'
      ]
    },
    {
      id: 'visualConcept',
      label: 'Visual Concept',
      type: 'textarea',
      placeholder: 'e.g., Steaming cup of coffee with sunrise over mountain backdrop...',
      helperText: 'Describe the main visual/image idea (optional)',
      required: false,
      maxLength: 250
    },
    {
      id: 'mandatories',
      label: 'Mandatories',
      type: 'textarea',
      placeholder: 'e.g., "Offer valid through 12/31. Terms apply. FDA statement required."',
      helperText: 'Legal or required copy that MUST appear (optional)',
      required: false,
      maxLength: 300
    },
    {
      id: 'ctaType',
      label: 'Call-to-Action Type',
      type: 'select',
      helperText: 'What action should readers take?',
      required: true,
      options: [
        'Visit Website',
        'Call Now',
        'Use Promo Code',
        'Visit Store',
        'Request Info',
        'Other (specify)'
      ]
    }
  ],
  systemPrompt: `You are a legendary print advertising copywriter in the tradition of David Ogilvy and Bill Bernbach. Create print ad copy based on these details:

Ad Format: {adFormat}
Publication Type: {publicationType}
Headline Style: {headlineStyle}
Product/Service: {productService}
Target Audience: {targetAudience}
Primary Benefit: {primaryBenefit}
Tone: {tone}
Visual Concept: {visualConcept}
Mandatories: {mandatories}
Call-to-Action Type: {ctaType}

{brandVoiceInstructions}
{personaInstructions}

Create print ad copy that includes:
1. HEADLINE: Compelling, attention-grabbing headline (5-10 words)
2. SUBHEADLINE: Supporting line that expands on the headline
3. BODY COPY: Persuasive copy that sells the benefit (length varies by format)
4. CTA: Clear call-to-action with contact/response info
5. TAGLINE: Memorable brand tagline (optional)

Format-specific guidelines:
- Full Page: 150-200 words body copy
- Half Page: 75-100 words body copy
- Quarter Page: 40-60 words body copy
- Billboard: 7 words or less total, no body copy
- Direct Mail Postcard: 100-150 words, urgency-focused
- Flyer: 100-150 words, benefit bullets

Remember: Every word must earn its place. Print ads are expensive—make each word count.
Include the mandatories naturally if provided.`
};

/**
 * Brochure Copy Template
 * Multi-section brochure content generation
 */
export const BROCHURE_COPY_TEMPLATE: Template = {
  id: 'brochure-copy',
  name: 'Brochure Copy (Multi-Section)',
  category: 'collateral',
  description: 'Generate targeted copy for specific brochure sections—cover, hero, benefits, solutions, or CTA.',
  complexity: 'Intermediate',
  estimatedTime: '10-15 min',
  icon: 'FileEdit',
  fields: [
    {
      id: 'brochureGoal',
      label: 'Brochure Goal',
      type: 'select',
      helperText: 'Primary purpose of this brochure',
      required: true,
      options: [
        'Generate Leads',
        'Educate Prospects',
        'Support Sales',
        'Build Brand',
        'Product Launch',
        'Other (specify)'
      ]
    },
    {
      id: 'brochureFormat',
      label: 'Brochure Format',
      type: 'select',
      helperText: 'Physical format of the brochure',
      required: true,
      options: [
        'Tri-Fold',
        'Bi-Fold',
        'Multi-Page Booklet',
        'Single Sheet',
        'Digital PDF'
      ]
    },
    {
      id: 'section',
      label: 'Which Section Are You Writing?',
      type: 'select',
      helperText: 'Select the specific section to generate',
      required: true,
      options: [
        'Cover/Title',
        'Hero/Introduction',
        'Benefits Section',
        'Solutions/Features',
        'Case Study/Proof',
        'Call-to-Action'
      ]
    },
    {
      id: 'productService',
      label: 'Product/Service/Company Description',
      type: 'textarea',
      placeholder: 'e.g., B2B software platform that automates invoice processing for mid-market companies...',
      helperText: 'What are you promoting?',
      required: true,
      maxLength: 300
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'e.g., CFOs and Finance Directors at companies with 100-500 employees...',
      helperText: 'Who will be reading this brochure?',
      required: true,
      maxLength: 360
    },
    {
      id: 'painPoint',
      label: 'Primary Pain Point/Problem',
      type: 'textarea',
      placeholder: 'e.g., Manual invoice processing costs $15 per invoice and creates 3% error rate...',
      helperText: 'What problem does your audience face?',
      required: true,
      maxLength: 300
    },
    {
      id: 'keyBenefits',
      label: 'Top 3 Key Benefits',
      type: 'textarea',
      placeholder: 'e.g., \n- Reduce processing costs by 80%\n- Eliminate data entry errors\n- Free up 20+ hours per week',
      helperText: 'Main selling points (separate each with a new line)',
      required: true,
      maxLength: 400
    },
    {
      id: 'differentiator',
      label: 'Your Unique Differentiator',
      type: 'textarea',
      placeholder: 'e.g., Only solution with 99.9% accuracy AI that learns your specific workflows...',
      helperText: 'What makes you different from competitors?',
      required: true,
      maxLength: 250
    },
    {
      id: 'socialProofType',
      label: 'Type of Social Proof to Emphasize',
      type: 'select',
      helperText: 'What kind of proof will you highlight? (optional)',
      required: false,
      options: [
        'Customer Testimonials',
        'Case Studies',
        'Industry Awards',
        'Certifications',
        'Client Logos',
        'Statistics'
      ]
    },
    {
      id: 'proofDetail',
      label: 'Proof Point Detail',
      type: 'textarea',
      placeholder: 'e.g., "Saved us $200K in the first year" - Jane Smith, CFO at Acme Corp',
      helperText: 'The specific stat, quote, or result (optional)',
      required: false,
      maxLength: 200
    },
    {
      id: 'primaryCta',
      label: 'Primary Call-to-Action',
      type: 'select',
      helperText: 'What action should readers take?',
      required: true,
      options: [
        'Request Demo',
        'Get Quote',
        'Schedule Consultation',
        'Download Resource',
        'Contact Sales',
        'Visit Website',
        'Other (specify)'
      ]
    },
    {
      id: 'tone',
      label: 'Desired Tone',
      type: 'select',
      helperText: 'What tone should the copy convey?',
      required: true,
      options: [
        'Professional',
        'Friendly',
        'Authoritative',
        'Inspirational',
        'Technical',
        'Other (specify)'
      ]
    },
    {
      id: 'ctaIncentive',
      label: 'CTA Incentive/Reason to Act Now',
      type: 'textarea',
      placeholder: 'e.g., Free ROI assessment worth $2,500 for companies that book this month...',
      helperText: 'Why should they act immediately? (optional)',
      required: false,
      maxLength: 200
    }
  ],
  systemPrompt: `You are an expert B2B copywriter specializing in sales collateral. Create brochure section copy based on these details:

Brochure Goal: {brochureGoal}
Format: {brochureFormat}
Section to Write: {section}
Product/Service: {productService}
Target Audience: {targetAudience}
Primary Pain Point: {painPoint}
Key Benefits: {keyBenefits}
Unique Differentiator: {differentiator}
Social Proof Type: {socialProofType}
Proof Detail: {proofDetail}
Primary CTA: {primaryCta}
Tone: {tone}
CTA Incentive: {ctaIncentive}

{brandVoiceInstructions}
{personaInstructions}

Generate copy for the "{section}" section following these guidelines:

COVER/TITLE SECTION:
- Headline: 5-8 words, benefit-focused
- Tagline: Supporting line, 10-15 words
- Visual direction suggestion

HERO/INTRODUCTION SECTION:
- Opening headline: Problem-aware
- 2-3 sentences establishing the pain point
- 2-3 sentences introducing your solution
- Transition to benefits

BENEFITS SECTION:
- Section headline
- 3 benefits with headlines and 2-3 sentence explanations each
- Focus on outcomes, not features

SOLUTIONS/FEATURES SECTION:
- Section headline
- 3-4 features framed as solutions
- Each with clear benefit statement

CASE STUDY/PROOF SECTION:
- Section headline
- Customer situation summary
- Solution implemented
- Results achieved (with numbers)
- Pull quote if provided

CALL-TO-ACTION SECTION:
- Compelling headline
- 2-3 sentences on why to act now
- Clear next step
- Contact information placeholder
- Incentive if provided

Write ONLY the requested section with appropriate length for the brochure format.`
};

/**
 * Website Copy (SEO-Optimized) Template
 * SEO-focused copy for homepage, service pages, and core website sections
 */
export const WEBSITE_COPY_SEO_TEMPLATE: Template = {
  id: 'website-copy-seo',
  name: 'Website Copy (SEO-Optimized)',
  category: 'website',
  description: 'Generate SEO-optimized copy for homepage, service pages, and core website sections with keyword integration.',
  complexity: 'Intermediate',
  estimatedTime: '15-20 min',
  icon: 'Globe',
  fields: [
    {
      id: 'pageType',
      label: 'Page Type',
      type: 'select',
      helperText: 'What type of page is this?',
      required: true,
      options: [
        'Homepage',
        'Service/Product Page',
        'About Page',
        'Landing Page',
        'Blog Post'
      ]
    },
    {
      id: 'pageGoal',
      label: 'Page Goal',
      type: 'select',
      helperText: 'Primary conversion goal',
      required: true,
      options: [
        'Lead Generation',
        'E-commerce/Sales',
        'Information/Education',
        'Brand Building',
        'Other (specify)'
      ]
    },
    {
      id: 'primaryKeyword',
      label: 'Primary Keyword/Keyphrase',
      type: 'text',
      placeholder: 'e.g., project management software for small teams',
      helperText: 'Main keyword to target (2-4 words ideal)',
      required: true,
      maxLength: 100
    },
    {
      id: 'secondaryKeywords',
      label: 'Secondary Keywords',
      type: 'textarea',
      placeholder: 'e.g., \n- task management app\n- team collaboration tool\n- small business project tracking',
      helperText: 'Related search terms to naturally incorporate (3-5 keywords)',
      required: true,
      maxLength: 300
    },
    {
      id: 'searchIntent',
      label: 'User Search Intent',
      type: 'select',
      helperText: 'Why are users searching for this?',
      required: true,
      options: [
        'Looking for Solution',
        'Comparing Options',
        'Ready to Buy',
        'Learning/Research'
      ]
    },
    {
      id: 'targetAudience',
      label: 'Target Audience',
      type: 'textarea',
      placeholder: 'e.g., Small business owners and team leads who need simple project tracking...',
      helperText: 'Who is this page for?',
      required: true,
      maxLength: 300
    },
    {
      id: 'productService',
      label: 'Product/Service/Business',
      type: 'textarea',
      placeholder: 'e.g., Cloud-based project management tool with Kanban boards, time tracking, and team chat...',
      helperText: 'What are you promoting?',
      required: true,
      maxLength: 250
    },
    {
      id: 'uniqueValue',
      label: 'Unique Value Proposition',
      type: 'textarea',
      placeholder: 'e.g., The only project tool built specifically for teams under 20 people...',
      helperText: 'What makes you different?',
      required: true,
      maxLength: 300
    },
    {
      id: 'topBenefits',
      label: 'Top 3 Benefits',
      type: 'textarea',
      placeholder: 'e.g., \n- Get started in 5 minutes, no training needed\n- See all projects in one dashboard\n- Integrates with tools you already use',
      helperText: 'Main selling points (one per line)',
      required: true,
      maxLength: 400
    },
    {
      id: 'painPoint',
      label: 'Primary Pain Point/Problem',
      type: 'textarea',
      placeholder: 'e.g., Teams waste 5+ hours per week in status meetings and scattered communication...',
      helperText: 'What problem do you solve?',
      required: true,
      maxLength: 300
    },
    {
      id: 'callToAction',
      label: 'Call-to-Action',
      type: 'select',
      helperText: 'Primary action for visitors',
      required: true,
      options: [
        'Request Quote',
        'Schedule Demo',
        'Start Free Trial',
        'Contact Us',
        'Buy Now',
        'Learn More',
        'Other (specify)'
      ]
    },
    {
      id: 'tone',
      label: 'Tone',
      type: 'select',
      helperText: 'What tone should the copy have?',
      required: true,
      options: [
        'Professional',
        'Conversational',
        'Technical',
        'Friendly',
        'Authoritative',
        'Other (specify)'
      ]
    },
    {
      id: 'metaDescription',
      label: 'Meta Description',
      type: 'textarea',
      placeholder: 'e.g., Simple project management for small teams. Get organized in minutes with our intuitive Kanban boards and...',
      helperText: 'SEO snippet shown in search results (max 160 chars, optional)',
      required: false,
      maxLength: 160
    }
  ],
  systemPrompt: `You are an SEO copywriter who creates compelling, search-optimized web content. Write website copy based on these details:

Page Type: {pageType}
Page Goal: {pageGoal}
Primary Keyword: {primaryKeyword}
Secondary Keywords: {secondaryKeywords}
User Search Intent: {searchIntent}
Target Audience: {targetAudience}
Product/Service: {productService}
Unique Value Proposition: {uniqueValue}
Top 3 Benefits: {topBenefits}
Primary Pain Point: {painPoint}
Call-to-Action: {callToAction}
Tone: {tone}
Meta Description: {metaDescription}

{brandVoiceInstructions}
{personaInstructions}

Create SEO-optimized page copy that includes:

1. META TITLE: 50-60 characters, includes primary keyword, compelling
2. META DESCRIPTION: 150-160 characters, includes keyword, has CTA (if not provided)
3. H1 HEADLINE: Primary keyword naturally included, benefit-focused
4. HERO SECTION: 
   - Subheadline expanding on H1
   - 2-3 sentences addressing pain point and introducing solution
   - CTA button text

5. BENEFITS SECTION:
   - Section headline (H2)
   - 3 benefits with H3 headlines and 2-3 sentence explanations
   - Naturally incorporate secondary keywords

6. HOW IT WORKS / FEATURES SECTION:
   - Section headline (H2)
   - 3-4 steps or features
   - Clear, scannable format

7. SOCIAL PROOF SECTION:
   - Section headline (H2)
   - Placeholder for testimonials/logos
   - Trust-building copy

8. CTA SECTION:
   - Compelling headline (H2)
   - 2-3 sentences creating urgency
   - CTA button text with supporting microcopy

SEO Guidelines:
- Include primary keyword in H1, first paragraph, and naturally 2-3 more times
- Use secondary keywords in H2s and body copy where natural
- Write for humans first, search engines second
- Keep paragraphs short (2-3 sentences max)
- Use bullet points for scanability
- Match content to user search intent

Target word count: 600-900 words total page copy.`
};

/**
 * All available templates
 * Add new templates to this array to make them available
 */
export const ALL_TEMPLATES: Template[] = [
  SALES_EMAIL_TEMPLATE,
  LANDING_PAGE_HERO_TEMPLATE,
  EMAIL_SEQUENCE_KICKOFF_TEMPLATE,
  SOCIAL_MEDIA_AD_COPY_TEMPLATE,
  SOCIAL_MEDIA_POST_TEMPLATE,
  PRINT_MEDIA_TEMPLATE,
  BROCHURE_COPY_TEMPLATE,
  WEBSITE_COPY_SEO_TEMPLATE
];

/**
 * Get a template by its ID
 * @param id - Template ID to find
 * @returns Template if found, undefined otherwise
 */
export function getTemplateById(id: string): Template | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all templates in a specific category
 * @param category - Category to filter by
 * @returns Array of templates in that category
 */
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return ALL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all unique categories from available templates
 * @returns Array of unique category names
 */
export function getAllCategories(): TemplateCategory[] {
  const categories = new Set(ALL_TEMPLATES.map(t => t.category));
  return Array.from(categories);
}
