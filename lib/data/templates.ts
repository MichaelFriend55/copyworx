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
 * Email Sequence Template
 * Creates complete multi-email sequences (3-7 emails) with narrative arc
 */
export const EMAIL_SEQUENCE_KICKOFF_TEMPLATE: Template = {
  id: 'email-sequence-kickoff',
  name: 'Email Sequence',
  category: 'email',
  description: 'Generate a complete email sequence (3-7 emails) with strategic narrative arc and timing.',
  complexity: 'Intermediate',
  estimatedTime: '2-5 min',
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
        'Sales Sequence',
        'Onboarding',
        'Re-engagement',
        'Other (specify)'
      ]
    },
    {
      id: 'numberOfEmails',
      label: 'Number of Emails',
      type: 'select',
      helperText: 'How many emails should be in this sequence?',
      required: true,
      options: [
        '3 emails',
        '4 emails',
        '5 emails',
        '6 emails',
        '7 emails'
      ]
    },
    {
      id: 'recipientProfile',
      label: 'Recipient Profile',
      type: 'textarea',
      placeholder: 'e.g., Small business owners who signed up for our free marketing checklist...',
      helperText: 'Who receives these emails? Describe their background and interests',
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
      id: 'endGoal',
      label: 'Sequence End Goal',
      type: 'select',
      helperText: 'What should subscribers do by the end of the sequence?',
      required: true,
      options: [
        'Purchase Product/Service',
        'Book a Call/Demo',
        'Start Free Trial',
        'Join Community/Group',
        'Upgrade Account',
        'Complete Onboarding',
        'Stay Engaged (nurture)',
        'Other (specify)'
      ]
    },
    {
      id: 'tone',
      label: 'Tone',
      type: 'select',
      helperText: 'What tone should these emails have?',
      required: true,
      options: [
        'Professional',
        'Friendly',
        'Educational',
        'Enthusiastic',
        'Authoritative',
        'Conversational',
        'Other (specify)'
      ]
    },
    {
      id: 'keyMessage',
      label: 'Key Message/Theme',
      type: 'textarea',
      placeholder: "e.g., We're here to help you grow, not sell you stuff...",
      helperText: 'Central theme or message that should run through all emails (optional)',
      required: false,
      maxLength: 250
    },
    {
      id: 'productService',
      label: 'Product/Service (if selling)',
      type: 'textarea',
      placeholder: 'e.g., Our premium marketing course that teaches...',
      helperText: 'What are you ultimately promoting? (optional for nurture sequences)',
      required: false,
      maxLength: 300
    }
  ],
  systemPrompt: `You are an expert email marketing copywriter specializing in high-converting email sequences. Create a COMPLETE email sequence with ALL emails based on these details:

Campaign Type: {campaignType}
Number of Emails: {numberOfEmails}
Recipient Profile: {recipientProfile}
Offer/Value Proposition: {offerValue}
Sequence End Goal: {endGoal}
Tone: {tone}
Key Message/Theme: {keyMessage}
Product/Service: {productService}

{brandVoiceInstructions}
{personaInstructions}

CRITICAL: You MUST generate ALL emails specified in "Number of Emails". Not just the first one.

STRATEGIC EMAIL SEQUENCE FRAMEWORK:
Based on the number of emails requested, follow this narrative arc:

FOR 3 EMAILS:
- Email 1: WELCOME + VALUE (Day 1) - Warm welcome, set expectations, deliver quick win
- Email 2: PROOF + EDUCATION (Day 3) - Share expertise, social proof, build trust
- Email 3: CLOSE (Day 5) - Clear CTA, urgency, final push toward end goal

FOR 4 EMAILS:
- Email 1: WELCOME (Day 1) - Warm intro, set stage, immediate value
- Email 2: VALUE (Day 3) - Educational content, build expertise
- Email 3: PROOF (Day 5) - Testimonials, case studies, results
- Email 4: CLOSE (Day 7) - Urgency, clear CTA, final action

FOR 5 EMAILS:
- Email 1: WELCOME (Day 1) - Introduction, expectations, quick win
- Email 2: VALUE (Day 3) - Deep educational content, build trust
- Email 3: PROOF (Day 5) - Social proof, success stories
- Email 4: ENGAGEMENT (Day 7) - Interactive, questions, deepen relationship
- Email 5: CLOSE (Day 10) - Strong CTA, urgency, final push

FOR 6 EMAILS:
- Email 1: WELCOME (Day 1) - Warm greeting, expectations, initial value
- Email 2: VALUE (Day 3) - Educational tip or insight
- Email 3: STORY (Day 5) - Case study or transformation story
- Email 4: PROOF (Day 7) - Testimonials, results, credibility
- Email 5: OBJECTIONS (Day 9) - Address concerns, FAQ style
- Email 6: CLOSE (Day 12) - Final CTA with urgency

FOR 7 EMAILS:
- Email 1: WELCOME (Day 1) - Warm introduction, set expectations
- Email 2: VALUE (Day 2) - Quick tip, immediate usefulness
- Email 3: EDUCATION (Day 4) - Deeper teaching, establish expertise
- Email 4: STORY (Day 6) - Case study, transformation narrative
- Email 5: PROOF (Day 8) - Social proof, testimonials
- Email 6: OBJECTIONS (Day 10) - Handle concerns, build confidence
- Email 7: CLOSE (Day 14) - Final push, urgency, clear CTA

REQUIREMENTS FOR EACH EMAIL:
1. Compelling subject line that creates curiosity
2. Clear purpose aligned with its position in the arc
3. Reference previous emails naturally ("As I mentioned...")
4. Escalate commitment gradually
5. Maintain consistent brand voice throughout
6. Each email: 150-300 words body (shorter is better for engagement)
7. End with soft CTA for early emails, strong CTA for final emails

OUTPUT FORMAT (CRITICAL - Follow exactly):

<h2>═══ EMAIL 1 of X: [PURPOSE] ═══</h2>
<p><strong>📅 Send: Day 1</strong> (Immediately after signup)</p>
<h3>Subject: [Your Compelling Subject Line]</h3>
<p>[Email body - use multiple paragraphs]</p>
<p>[Include bullet points with <ul><li> where helpful]</p>
<p>[Signature]</p>

<hr>

<h2>═══ EMAIL 2 of X: [PURPOSE] ═══</h2>
<p><strong>📅 Send: Day 3</strong> (2 days after Email 1)</p>
<h3>Subject: [Your Compelling Subject Line]</h3>
<p>[Email body...]</p>

[Continue with <hr> between each email until you've written ALL emails]

REMEMBER: 
- Generate EVERY email in the sequence, not just the first
- Use <hr> to separate emails clearly
- Include timing recommendations for each
- Build narrative momentum across the sequence
- Make each email standalone readable but part of a cohesive journey`
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
 * Press Release Template
 * Generates AP Style, journalist-friendly press releases
 */
export const PRESS_RELEASE_TEMPLATE: Template = {
  id: 'press-release',
  name: 'Press Release',
  category: 'collateral',
  description: 'Generate a publication-ready press release following AP Style and journalist-friendly best practices.',
  complexity: 'Intermediate',
  estimatedTime: '15-25 min',
  icon: 'Newspaper',
  fields: [
    // ── Core News Details ──
    {
      id: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'e.g., Acme Health Systems',
      helperText: 'Full legal or trade name of the company issuing the release',
      required: true,
      maxLength: 100
    },
    {
      id: 'announcementType',
      label: 'Announcement Type',
      type: 'select',
      helperText: 'What kind of news is this?',
      required: true,
      options: [
        'Product Launch',
        'Partnership/Alliance',
        'Acquisition/Merger',
        'Funding/Investment',
        'Executive Hire/Promotion',
        'Expansion (New Market/Office)',
        'Award/Recognition',
        'Research/Study Results',
        'Event/Conference',
        'Community Initiative',
        'Milestone/Anniversary',
        'Policy/Regulatory Update',
        'Other (specify)'
      ]
    },
    {
      id: 'headline',
      label: 'Suggested Headline',
      type: 'text',
      placeholder: 'e.g., Acme Health Systems Expands Telehealth Access to Rural Communities',
      helperText: 'Optional starting point — AI will refine to 8-12 words, AP Style',
      required: false,
      maxLength: 150
    },
    {
      id: 'whatHappened',
      label: 'The News (What Happened)',
      type: 'textarea',
      placeholder: 'e.g., We launched a new telehealth platform serving 12 rural counties in partnership with state health departments...',
      helperText: 'Describe the announcement in plain language. Include who, what, when, where, why.',
      required: true,
      maxLength: 800
    },
    {
      id: 'whyNow',
      label: 'Why Now (Timing/Relevance)',
      type: 'textarea',
      placeholder: 'e.g., Rural telehealth access became a federal priority this quarter after new CMS guidelines...',
      helperText: 'What makes this newsworthy right now? Industry trends, market timing, regulatory changes?',
      required: true,
      maxLength: 500
    },
    {
      id: 'whoItAffects',
      label: 'Who This Affects',
      type: 'textarea',
      placeholder: 'e.g., 250,000 residents in underserved rural areas, 40 community health centers, and 3 state health departments...',
      helperText: 'Identify affected stakeholders — customers, communities, industry, partners',
      required: true,
      maxLength: 400
    },
    {
      id: 'keyDetails',
      label: 'Key Details',
      type: 'textarea',
      placeholder: 'e.g., Platform goes live March 1. Covers 12 counties. Zero cost to patients. Backed by $4M state grant...',
      helperText: 'Specific facts: dates, numbers, locations, terms, scope. Journalists need hard details.',
      required: true,
      maxLength: 600
    },
    // ── Supporting Context ──
    {
      id: 'backgroundContext',
      label: 'Background Context',
      type: 'textarea',
      placeholder: 'e.g., Acme has operated in the telehealth space since 2019 and currently serves 1.2 million patients...',
      helperText: 'Company history, market context, or prior milestones that frame this news (optional)',
      required: false,
      maxLength: 500
    },
    {
      id: 'dataPoints',
      label: 'Supporting Data',
      type: 'textarea',
      placeholder: 'e.g., 73% of rural residents lack adequate telehealth access (CDC, 2025). Telehealth adoption grew 38% YoY...',
      helperText: 'Statistics, research findings, or metrics that strengthen the story (optional)',
      required: false,
      maxLength: 500
    },
    // ── Dateline ──
    {
      id: 'city',
      label: 'City',
      type: 'text',
      placeholder: 'e.g., Austin',
      helperText: 'City for the dateline (where the news originates)',
      required: true,
      maxLength: 50
    },
    {
      id: 'state',
      label: 'State',
      type: 'text',
      placeholder: 'e.g., Texas',
      helperText: 'State for the dateline (spell out per AP Style)',
      required: true,
      maxLength: 30
    },
    // ── Quotes ──
    {
      id: 'quote1Speaker',
      label: 'Quote 1 — Speaker Name & Title',
      type: 'text',
      placeholder: 'e.g., Dr. Sarah Chen, CEO of Acme Health Systems',
      helperText: 'Full name and title of the primary spokesperson',
      required: true,
      maxLength: 120
    },
    {
      id: 'quote1Content',
      label: 'Quote 1 — Direction/Key Point',
      type: 'textarea',
      placeholder: 'e.g., Emphasize commitment to health equity and that this is personal for her — grew up in a rural area without access...',
      helperText: 'What should this quote convey? AI will craft a natural, human-sounding quote — not robotic corporate speak.',
      required: true,
      maxLength: 400
    },
    {
      id: 'quote2Speaker',
      label: 'Quote 2 — Speaker Name & Title',
      type: 'text',
      placeholder: 'e.g., James Rodriguez, Director of the Texas Rural Health Initiative',
      helperText: 'Second spokesperson — a partner, customer, or outside validator (optional)',
      required: false,
      maxLength: 120
    },
    {
      id: 'quote2Content',
      label: 'Quote 2 — Direction/Key Point',
      type: 'textarea',
      placeholder: 'e.g., Reinforce measurable community impact and why this partnership model can scale to other states...',
      helperText: 'What should this quote reinforce? Best when it comes from an external voice.',
      required: false,
      maxLength: 400
    },
    // ── Boilerplate & Contact ──
    {
      id: 'companyBoilerplate',
      label: 'About Company (Boilerplate)',
      type: 'textarea',
      placeholder: 'e.g., Acme Health Systems is a telehealth platform serving 1.2 million patients across 15 states. Founded in 2019, the company...',
      helperText: 'Standard company description paragraph. Keep to 3-4 sentences.',
      required: true,
      maxLength: 500
    },
    {
      id: 'mediaContactName',
      label: 'Media Contact — Name',
      type: 'text',
      placeholder: 'e.g., Maria Gonzalez',
      helperText: 'Name of the person journalists should contact',
      required: true,
      maxLength: 80
    },
    {
      id: 'mediaContactTitle',
      label: 'Media Contact — Title',
      type: 'text',
      placeholder: 'e.g., Director of Communications',
      helperText: 'Job title of the media contact',
      required: true,
      maxLength: 80
    },
    {
      id: 'mediaContactPhone',
      label: 'Media Contact — Phone',
      type: 'text',
      placeholder: 'e.g., (512) 555-0199',
      helperText: 'Direct phone number for press inquiries',
      required: true,
      maxLength: 30
    },
    {
      id: 'mediaContactEmail',
      label: 'Media Contact — Email',
      type: 'text',
      placeholder: 'e.g., press@acmehealth.com',
      helperText: 'Email address for press inquiries',
      required: true,
      maxLength: 80
    },
    {
      id: 'companyWebsite',
      label: 'Company Website',
      type: 'text',
      placeholder: 'e.g., www.acmehealth.com',
      helperText: 'Company URL to include in media contact block',
      required: true,
      maxLength: 100
    },
    // ── Optional Metadata ──
    {
      id: 'embargoDate',
      label: 'Embargo Date',
      type: 'text',
      placeholder: 'e.g., March 1, 2026 at 9:00 a.m. ET',
      helperText: 'Leave blank for "FOR IMMEDIATE RELEASE." Fill in to set an embargo.',
      required: false,
      maxLength: 80
    },
    {
      id: 'additionalNotes',
      label: 'Additional Context for AI',
      type: 'textarea',
      placeholder: 'e.g., Avoid mentioning competitor names. Emphasize the nonprofit partnership angle. Include the hashtag #RuralHealthAccess if appropriate.',
      helperText: 'Any extra instructions, constraints, or context for the AI writer (optional)',
      required: false,
      maxLength: 400
    }
  ],
  systemPrompt: `You are a seasoned public relations writer with 20 years of experience placing stories in major newsrooms. You write for reporters and editors, NOT for marketing audiences.

Generate a complete, publication-ready press release using these inputs:

COMPANY: {companyName}
ANNOUNCEMENT TYPE: {announcementType}
SUGGESTED HEADLINE: {headline}

THE NEWS:
{whatHappened}

WHY NOW:
{whyNow}

WHO THIS AFFECTS:
{whoItAffects}

KEY DETAILS:
{keyDetails}

BACKGROUND CONTEXT:
{backgroundContext}

SUPPORTING DATA:
{dataPoints}

LOCATION: {city}, {state}

QUOTE 1:
Speaker: {quote1Speaker}
Direction: {quote1Content}

QUOTE 2:
Speaker: {quote2Speaker}
Direction: {quote2Content}

ABOUT {companyName}:
{companyBoilerplate}

MEDIA CONTACT:
{mediaContactName}
{mediaContactTitle}
{mediaContactPhone}
{mediaContactEmail}
{companyWebsite}

EMBARGO: {embargoDate}

ADDITIONAL CONTEXT:
{additionalNotes}

{brandVoiceInstructions}
{personaInstructions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT STRUCTURE (follow this order exactly):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. RELEASE LINE: If an embargo date was provided, output "EMBARGOED UNTIL [date]". Otherwise output "FOR IMMEDIATE RELEASE".

2. MEDIA CONTACT BLOCK: Name, title, phone, email, website — formatted clearly.

3. HEADLINE: 8-12 words maximum. Newsworthy and benefit-driven. ZERO marketing superlatives. Use active voice.

4. SUBHEADLINE: One line that adds context, stakes, or scope. Not a repeat of the headline.

5. DATELINE: Format as "{city}, {state} — [Today's date as Month Day, Year] —" followed by the lede.

6. LEDE PARAGRAPH: Answer who, what, when, where, why in 2-3 sentences. This paragraph must stand alone if a journalist quotes only this.

7. SUPPORTING PARAGRAPHS: 2-3 paragraphs providing context, details, and relevance. Use inverted pyramid — most important facts first.

8. QUOTE 1: A natural, human-sounding quote from the first speaker. Transform the direction into something a real person would actually say. Quotes add insight, emotion, or vision — they do NOT repeat facts from the body copy.

9. IMPACT PARAGRAPH: How this affects customers, community, or industry. Ground the impact in specifics.

10. QUOTE 2 (if provided): A reinforcing quote from the second speaker. Should complement, not repeat, Quote 1.

11. ABOUT SECTION: "About [Company Name]" boilerplate paragraph.

12. END MARK: Three hash marks (###) centered.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES — NO EXCEPTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Use inverted pyramid: most important information first.
- Write in third person, active voice throughout.
- NO superlatives: never use "leading," "cutting-edge," "revolutionary," "game-changing," "innovative," "world-class," "best-in-class," or "disruptive."
- NO promotional language or marketing hype. Write for skeptical journalists.
- NO exclamation points anywhere in the release.
- Quotes must sound like real humans talking — conversational, insightful, specific. NOT corporate boilerplate.
- Quotes should add perspective, emotion, or vision — NOT repeat facts already in the body.
- Follow AP Style for numbers (spell out one through nine, use numerals for 10+), dates, titles, abbreviations, and punctuation.
- Use "said" as the attribution verb — not "stated," "shared," "expressed," or "commented."
- Company name should be referenced in full on first mention, then shortened naturally.
- Attribute all claims. Do not make unattributed assertions.
- Keep paragraphs to 2-3 sentences maximum for journalist readability.
- Make it easy to quote and republish verbatim.

TONE: Authoritative but accessible. Professional but not stuffy. Newsworthy without being breathless.

If optional fields (background context, data points, Quote 2, embargo, additional notes) are blank or say "(not provided)", simply omit those sections — do NOT include placeholder text or mention them.`
};

/**
 * Multi-Section Brochure Template (Advanced)
 * This is a special template that generates content section by section
 * with context awareness and progress persistence.
 * 
 * Note: This template uses a custom component (BrochureMultiSectionTemplate)
 * rather than the standard TemplateFormSlideOut. The template definition
 * here is for display in the TemplatesModal.
 */
export const BROCHURE_MULTI_SECTION_TEMPLATE: Template = {
  id: 'brochure-multi-section',
  name: 'Brochure Copy (Multi-Section)',
  category: 'collateral',
  description: 'Generate complete brochure section by section with context. Progress saves across sessions.',
  complexity: 'Advanced',
  estimatedTime: '30-45 min',
  icon: 'BookOpen',
  fields: [], // Fields are defined per-section in the config
  systemPrompt: '', // System prompt is built dynamically per section
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
  WEBSITE_COPY_SEO_TEMPLATE,
  PRESS_RELEASE_TEMPLATE,
  BROCHURE_MULTI_SECTION_TEMPLATE,
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
