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
        'No Urgency'
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
        'Download Resource'
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
 * All available templates
 * Add new templates to this array to make them available
 */
export const ALL_TEMPLATES: Template[] = [
  SALES_EMAIL_TEMPLATE,
  LANDING_PAGE_HERO_TEMPLATE
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
