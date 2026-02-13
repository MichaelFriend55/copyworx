/**
 * @file components/workspace/ProductLaunchCampaignTemplate.tsx
 * @description Multi-channel product launch campaign template for CopyWorx Studio
 *
 * Generates coordinated launch messaging across email, social media, landing pages,
 * and paid advertising for three campaign phases: pre-launch, launch day, post-launch.
 *
 * Features:
 *   - 5 launch types (New Product, New Feature, Rebrand, Pricing Change, Market Expansion)
 *   - Channel scope selection (Email, Social, Landing Page, Ads, Press)
 *   - 4-step campaign builder wizard
 *   - Single API call for messaging consistency across all pieces
 *   - Visual campaign timeline by phase
 *   - Organized output display with per-piece clipboard copy
 *   - Brand voice and persona integration
 *   - Editor insertion for export/editing
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Rocket,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  X,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  Share2,
  Globe,
  Megaphone,
  Newspaper,
  Calendar,
  Zap,
  Target,
  TrendingUp,
  RefreshCw,
  DollarSign,
  Users,
} from 'lucide-react';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { cn } from '@/lib/utils';
import { formatGeneratedContent, stripHtml } from '@/lib/utils/content-formatting';
import {
  createDocument,
  updateDocument as updateDocumentInStorage,
  getProjectPersonas,
} from '@/lib/storage/unified-storage';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import type { Project, Persona } from '@/lib/types/project';
import type { Editor } from '@tiptap/react';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Template metadata shown in the slide-out header */
const TEMPLATE_META = {
  name: 'Product Launch Campaign',
  description: 'Multi-channel coordinated launch messaging across email, social, landing pages & ads.',
  complexity: 'Advanced' as const,
  estimatedTime: '25-40 min',
};

/** Launch type definitions with descriptions and messaging angles */
const LAUNCH_TYPES = [
  {
    id: 'new_product',
    label: 'New Product Launch',
    icon: Rocket,
    description: 'Launching a brand-new product or service to market',
    angle: 'Education + excitement — audience may not know they need it yet',
  },
  {
    id: 'new_feature',
    label: 'New Feature Launch',
    icon: Zap,
    description: 'Adding new capabilities to an existing product',
    angle: 'Value add for current customers + attract prospects',
  },
  {
    id: 'rebrand',
    label: 'Rebrand / Reposition',
    icon: RefreshCw,
    description: 'Same product, new positioning or identity',
    angle: '"New and improved" — re-engage past customers + new market',
  },
  {
    id: 'pricing_change',
    label: 'Pricing / Packaging Change',
    icon: DollarSign,
    description: 'New tiers, plans, or pricing structure',
    angle: 'Value justification — retention + acquisition',
  },
  {
    id: 'market_expansion',
    label: 'Market Expansion',
    icon: Users,
    description: 'Launching to a new audience or geography',
    angle: 'Relevance to new market — net new customer segment',
  },
] as const;

/** Campaign channel definitions */
const CAMPAIGN_CHANNELS = [
  { id: 'email', label: 'Email Sequences', icon: Mail, color: 'blue' },
  { id: 'social', label: 'Social Media', icon: Share2, color: 'green' },
  { id: 'landing_page', label: 'Landing Pages', icon: Globe, color: 'purple' },
  { id: 'ads', label: 'Paid Advertising', icon: Megaphone, color: 'orange' },
  { id: 'press', label: 'Press Materials', icon: Newspaper, color: 'gray' },
] as const;

/** Tone options */
const TONE_OPTIONS = ['Professional', 'Enthusiastic', 'Bold', 'Conversational'] as const;

/** Duration options for pre/post launch phases */
const DURATION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
] as const;

/** Wizard step labels */
const WIZARD_STEPS = [
  'Launch Type & Channels',
  'Product Details',
  'Campaign Settings',
  'Review & Generate',
] as const;

/** Channel badge colors for output display */
const CHANNEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  email: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  social: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  landing_page: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  ads: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  press: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

/** Channel icon mapping */
const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  social: Share2,
  landing_page: Globe,
  ads: Megaphone,
  press: Newspaper,
};

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ProductLaunchCampaignTemplateProps {
  /** Callback when template should close */
  onClose: () => void;
  /** TipTap editor instance */
  editor: Editor | null;
  /** Active project for brand voice and personas */
  activeProject: Project | null;
}

/** Single content piece in the campaign (email, social post, landing page, ad) */
interface CampaignPiece {
  id: string;
  title: string;
  timing: string;
  subject?: string;
  preview?: string;
  platform?: string;
  cta?: string;
  body: string;
  wordCount: number;
  charCount: number;
}

/** A channel's content within a phase */
interface CampaignChannel {
  id: string;
  name: string;
  pieces: CampaignPiece[];
}

/** A campaign phase (pre-launch, launch day, post-launch) */
interface CampaignPhase {
  id: string;
  name: string;
  timing: string;
  channels: CampaignChannel[];
}

/** Fully parsed campaign output */
interface ParsedCampaign {
  phases: CampaignPhase[];
  totalPieces: number;
}

/** Core form inputs for product details */
interface CoreFormData {
  productName: string;
  productDescription: string;
  targetAudience: string;
  mainProblem: string;
  keyBenefits: string;
  differentiators: string;
  pricingDetails: string;
  launchDate: string;
}

/** Optional form inputs */
interface OptionalFormData {
  earlyBirdOffer: string;
  limitedOffer: string;
  socialProof: string;
  testimonials: string;
}

/** Campaign configuration settings */
interface CampaignSettings {
  preLaunchDuration: string;
  postLaunchDuration: string;
  tone: string;
  includeLaunchOffer: boolean;
  includeCountdown: boolean;
}

type ViewState = 'wizard' | 'generating' | 'results';

// ═══════════════════════════════════════════════════════════
// PARSER — Extracts structured campaign from Claude output
// ═══════════════════════════════════════════════════════════

/**
 * Parse raw Claude output into structured CampaignPhase objects.
 *
 * Expected delimiters:
 *   <campaign-phase id="..." name="..." timing="..."> ... </campaign-phase>
 *   <campaign-channel id="..." name="..."> ... </campaign-channel>
 *   <campaign-piece> ... </campaign-piece>
 *   <piece-title>, <piece-timing>, <piece-subject>, <piece-preview>,
 *   <piece-platform>, <piece-cta>, <piece-body>
 */
function parseCampaignOutput(raw: string): ParsedCampaign {
  const phases: CampaignPhase[] = [];
  let totalPieces = 0;

  const phaseRegex = /<campaign-phase\s+id="([^"]+)"\s+name="([^"]+)"\s+timing="([^"]+)">([\s\S]*?)<\/campaign-phase>/g;
  let phaseMatch: RegExpExecArray | null;

  while ((phaseMatch = phaseRegex.exec(raw)) !== null) {
    const [, phaseId, phaseName, phaseTiming, phaseContent] = phaseMatch;
    const channels: CampaignChannel[] = [];

    const channelRegex = /<campaign-channel\s+id="([^"]+)"\s+name="([^"]+)">([\s\S]*?)<\/campaign-channel>/g;
    let channelMatch: RegExpExecArray | null;

    while ((channelMatch = channelRegex.exec(phaseContent)) !== null) {
      const [, channelId, channelName, channelContent] = channelMatch;
      const pieces: CampaignPiece[] = [];

      const pieceRegex = /<campaign-piece>([\s\S]*?)<\/campaign-piece>/g;
      let pieceMatch: RegExpExecArray | null;

      while ((pieceMatch = pieceRegex.exec(channelContent)) !== null) {
        const pieceContent = pieceMatch[1];
        const piece = extractPieceFields(pieceContent, phaseId, channelId, pieces.length);
        pieces.push(piece);
        totalPieces++;
      }

      if (pieces.length > 0) {
        channels.push({ id: channelId, name: channelName, pieces });
      }
    }

    if (channels.length > 0) {
      phases.push({ id: phaseId, name: phaseName, timing: phaseTiming, channels });
    }
  }

  return { phases, totalPieces };
}

/**
 * Extract metadata and body from a single <campaign-piece> block
 */
function extractPieceFields(
  content: string,
  phaseId: string,
  channelId: string,
  index: number
): CampaignPiece {
  const getTag = (tag: string): string => {
    const match = content.match(new RegExp(`<piece-${tag}>([\\s\\S]*?)<\\/piece-${tag}>`));
    return match ? match[1].trim() : '';
  };

  const body = getTag('body');
  const plainBody = body.replace(/<[^>]*>/g, '');

  return {
    id: `${phaseId}_${channelId}_${index}`,
    title: getTag('title') || `Piece ${index + 1}`,
    timing: getTag('timing'),
    subject: getTag('subject') || undefined,
    preview: getTag('preview') || undefined,
    platform: getTag('platform') || undefined,
    cta: getTag('cta') || undefined,
    body,
    wordCount: plainBody.split(/\s+/).filter(Boolean).length,
    charCount: plainBody.length,
  };
}

// ═══════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build the full Claude system prompt for campaign generation.
 * Includes campaign brief, channel instructions, and output format specification.
 */
function buildCampaignPrompt(
  launchType: string,
  selectedChannels: string[],
  core: CoreFormData,
  optional: OptionalFormData,
  settings: CampaignSettings,
  brandVoiceInstructions: string,
  personaInstructions: string
): string {
  const launchTypeInfo = LAUNCH_TYPES.find((lt) => lt.id === launchType);
  const channelLabels = selectedChannels
    .map((ch) => CAMPAIGN_CHANNELS.find((c) => c.id === ch)?.label)
    .filter(Boolean)
    .join(', ');

  const optionalSections = [
    optional.earlyBirdOffer && `Launch Offer/Discount: ${optional.earlyBirdOffer}`,
    optional.limitedOffer && `Limited Time/Quantity Offer: ${optional.limitedOffer}`,
    optional.socialProof && `Social Proof/Metrics: ${optional.socialProof}`,
    optional.testimonials && `Customer Testimonials: ${optional.testimonials}`,
  ].filter(Boolean).join('\n');

  const channelInstructionBlocks = buildChannelInstructions(selectedChannels, settings);
  const toneInstructions = buildToneInstructions(settings.tone);

  return `You are an expert marketing strategist and professional copywriter with 40+ years of experience creating multi-channel product launch campaigns for agencies and Fortune 500 companies.

Your task: Create a complete, coordinated product launch campaign with consistent positioning across every piece.

═══════════════════════════════════════════════════════
CAMPAIGN BRIEF
═══════════════════════════════════════════════════════

Launch Type: ${launchTypeInfo?.label || launchType} — ${launchTypeInfo?.angle || ''}
Product/Service: ${core.productName}
One-Line Description: ${core.productDescription}
Target Audience: ${core.targetAudience}
Core Problem Solved: ${core.mainProblem}

Key Benefits:
${core.keyBenefits}

Unique Differentiators (vs. alternatives):
${core.differentiators}

Pricing/Offer Details: ${core.pricingDetails}
Launch Date: ${core.launchDate}

${optionalSections ? `ADDITIONAL CONTEXT:\n${optionalSections}` : ''}

═══════════════════════════════════════════════════════
CAMPAIGN PARAMETERS
═══════════════════════════════════════════════════════

Channels: ${channelLabels}
Pre-Launch Duration: ${settings.preLaunchDuration} days before launch
Post-Launch Duration: ${settings.postLaunchDuration} days after launch
Include Launch Offer: ${settings.includeLaunchOffer ? 'Yes — weave offer messaging into launch day and post-launch' : 'No'}
Include Countdown Messaging: ${settings.includeCountdown ? 'Yes — use countdown language in pre-launch' : 'No'}

${toneInstructions}

${brandVoiceInstructions}

${personaInstructions}

═══════════════════════════════════════════════════════
WHAT TO GENERATE
═══════════════════════════════════════════════════════

${channelInstructionBlocks}

═══════════════════════════════════════════════════════
CRITICAL CAMPAIGN RULES
═══════════════════════════════════════════════════════

1. CONSISTENCY: Every piece must reinforce the same core positioning, key benefits, and differentiators.
2. PROGRESSIVE MESSAGING:
   - Pre-Launch: Build anticipation and curiosity. Don't reveal everything.
   - Launch Day: Full reveal with clear value proposition and conversion focus.
   - Post-Launch: Deepen understanding, handle objections, create urgency.
3. CHANNEL ADAPTATION: LinkedIn tone ≠ Instagram tone ≠ Email tone. Adapt format and language to each.
4. NO CONTRADICTIONS: Never make conflicting claims between any two pieces.
5. SPECIFIC TIMING: Use exact Day -X, Day 0, Day +X notation for every piece.
6. QUALITY: Write agency-level copy. No generic filler. Every word earns its place.
7. Each email must have a compelling subject line and preview text.
8. Social posts should include relevant hashtags and platform-appropriate formatting.
9. Landing pages should include headline, subheadline, key selling points, and CTA.

═══════════════════════════════════════════════════════
OUTPUT FORMAT (FOLLOW EXACTLY)
═══════════════════════════════════════════════════════

Output ONLY the campaign content using this EXACT structure. No preamble, commentary, or markdown.

<campaign-phase id="pre_launch" name="Phase 1: Pre-Launch" timing="${settings.preLaunchDuration} days before launch">
<campaign-channel id="[channel_id]" name="[Channel Display Name]">
<campaign-piece>
<piece-title>Piece title here</piece-title>
<piece-timing>Day -X</piece-timing>
<piece-subject>Email subject line (emails only)</piece-subject>
<piece-preview>Email preview/preheader text (emails only)</piece-preview>
<piece-platform>Platform name (social/ads only, e.g. LinkedIn, Instagram)</piece-platform>
<piece-cta>Call to action text (landing pages/ads only)</piece-cta>
<piece-body>
Full body copy here. Write complete, ready-to-use copy.
Separate paragraphs with blank lines.
Do not use HTML tags in the body.
</piece-body>
</campaign-piece>
</campaign-channel>
</campaign-phase>

<campaign-phase id="launch_day" name="Phase 2: Launch Day" timing="Day 0">
[...channels and pieces...]
</campaign-phase>

<campaign-phase id="post_launch" name="Phase 3: Post-Launch" timing="${settings.postLaunchDuration} days after launch">
[...channels and pieces...]
</campaign-phase>

Only include the <piece-subject> and <piece-preview> tags for email pieces.
Only include the <piece-platform> tag for social media and ad pieces.
Only include the <piece-cta> tag for landing page and ad pieces.
Omit tags that don't apply to the channel type.

BEGIN GENERATING THE CAMPAIGN NOW.`;
}

/**
 * Build per-channel generation instructions based on selected channels
 */
function buildChannelInstructions(selectedChannels: string[], settings: CampaignSettings): string {
  const blocks: string[] = [];

  if (selectedChannels.includes('email')) {
    blocks.push(`EMAIL SEQUENCES:
Pre-Launch: 3 emails (teaser/intrigue, problem agitation, sneak peek or early access invite)
Launch Day: 1 launch announcement email${settings.includeLaunchOffer ? ' with offer details' : ''}
Post-Launch: 3 emails (feature deep-dive, use case or social proof, urgency/last chance)
Each email: subject line + preview text + full body (100-200 words per email)`);
  }

  if (selectedChannels.includes('social')) {
    blocks.push(`SOCIAL MEDIA:
Pre-Launch: 3 posts (announcement teaser on LinkedIn, problem highlight on Twitter/X, countdown on Instagram)
Launch Day: 2 posts (launch announcement on LinkedIn, feature highlights on Instagram)
Post-Launch: 3 posts (use case example on LinkedIn, FAQ/objection on Twitter/X, limited-time reminder on Instagram)
Vary platform: LinkedIn = professional/long-form, Instagram = visual/concise, Twitter/X = punchy/short`);
  }

  if (selectedChannels.includes('landing_page')) {
    blocks.push(`LANDING PAGES:
Pre-Launch: 1 waitlist/coming-soon page (headline, subheadline, key benefits, email capture CTA)
Launch Day: 1 full sales/product page (headline, subheadline, problem/solution, benefits, social proof section, CTA)
Post-Launch: not needed (launch day page persists)
Include: headline, subheadline, 3-4 body sections, clear CTA for each page`);
  }

  if (selectedChannels.includes('ads')) {
    blocks.push(`PAID ADVERTISING:
Pre-Launch: not needed
Launch Day: 2 ads (1 Google Search ad with headline/descriptions, 1 Facebook/Instagram ad with primary text + headline)
Post-Launch: 1 retargeting ad (for visitors who didn't convert)
Keep ads concise: headlines under 30 chars for Google, primary text under 125 chars for Meta`);
  }

  if (selectedChannels.includes('press')) {
    blocks.push(`PRESS MATERIALS:
Launch Day: 1 press release (headline, dateline, 3-4 paragraphs, boilerplate, media contact placeholder)
Professional, factual tone regardless of campaign tone setting.
Include newsworthy angle and key quotes placeholder.`);
  }

  return blocks.join('\n\n');
}

/**
 * Build tone-specific prompt instructions
 */
function buildToneInstructions(tone: string): string {
  switch (tone) {
    case 'Professional':
      return `TONE: Professional
- Corporate, polished, authoritative language
- Data-driven where possible, measured confidence
- No slang or overly casual expressions
- Suitable for B2B and enterprise audiences`;
    case 'Enthusiastic':
      return `TONE: Enthusiastic
- Energetic, positive, genuinely excited language
- Use exclamation points sparingly but effectively
- Convey passion without being hyperbolic
- Suitable for consumer products and creative audiences`;
    case 'Bold':
      return `TONE: Bold
- Confident, direct, provocative language
- Challenge assumptions, make strong claims
- Short punchy sentences mixed with longer persuasive ones
- Suitable for disruptive products and competitive markets`;
    case 'Conversational':
      return `TONE: Conversational
- Friendly, approachable, human language
- Use contractions naturally (we're, you'll, it's)
- Write like you're talking to a smart friend
- Suitable for DTC brands and community-focused products`;
    default:
      return '';
  }
}

// ═══════════════════════════════════════════════════════════
// HTML BUILDER — Converts parsed campaign to editor HTML
// ═══════════════════════════════════════════════════════════

/**
 * Build formatted HTML for TipTap editor insertion from parsed campaign
 */
function buildEditorHtml(campaign: ParsedCampaign, productName: string, launchDate: string): string {
  const parts: string[] = [];

  parts.push(`<h1>Product Launch Campaign: ${productName}</h1>`);
  parts.push(`<p><strong>Launch Date:</strong> ${launchDate}</p>`);
  parts.push('<hr>');

  for (const phase of campaign.phases) {
    parts.push(`<h2>${phase.name} (${phase.timing})</h2>`);

    for (const channel of phase.channels) {
      parts.push(`<h3>${channel.name}</h3>`);

      for (const piece of channel.pieces) {
        parts.push(`<h4>${piece.title} — ${piece.timing}</h4>`);
        if (piece.subject) {
          parts.push(`<p><strong>Subject:</strong> ${piece.subject}</p>`);
        }
        if (piece.preview) {
          parts.push(`<p><strong>Preview:</strong> ${piece.preview}</p>`);
        }
        if (piece.platform) {
          parts.push(`<p><strong>Platform:</strong> ${piece.platform}</p>`);
        }

        const bodyParagraphs = piece.body
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
          .join('');
        parts.push(bodyParagraphs);

        if (piece.cta) {
          parts.push(`<p><strong>CTA:</strong> ${piece.cta}</p>`);
        }
        parts.push('<hr>');
      }
    }
  }

  return parts.join('');
}

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Wizard step indicator bar
 */
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <React.Fragment key={index}>
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
              index < currentStep && 'bg-green-500 text-white',
              index === currentStep && 'bg-apple-blue text-white ring-2 ring-apple-blue/30',
              index > currentStep && 'bg-gray-100 text-gray-400'
            )}
            title={WIZARD_STEPS[index]}
          >
            {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={cn(
                'flex-1 h-0.5 transition-colors',
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Reusable form field wrapper with label, required indicator, helper text
 */
function FormField({
  label,
  required,
  helperText,
  children,
}: {
  label: string;
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
      {children}
    </div>
  );
}

/**
 * Copy-to-clipboard button with feedback
 */
function CopyButton({
  pieceId,
  copiedId,
  onCopy,
  label,
}: {
  pieceId: string;
  copiedId: string | null;
  onCopy: (id: string) => void;
  label?: string;
}) {
  const isCopied = copiedId === pieceId;

  return (
    <button
      onClick={() => onCopy(pieceId)}
      className={cn(
        'flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all',
        isCopied
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
      title={isCopied ? 'Copied!' : 'Copy to clipboard'}
    >
      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label || (isCopied ? 'Copied' : 'Copy')}
    </button>
  );
}

/**
 * Single campaign piece card — displays one email, social post, landing page, or ad
 */
function PieceCard({
  piece,
  channelId,
  copiedId,
  onCopy,
}: {
  piece: CampaignPiece;
  channelId: string;
  copiedId: string | null;
  onCopy: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const colors = CHANNEL_COLORS[channelId] || CHANNEL_COLORS.email;

  return (
    <div className={cn('border rounded-lg overflow-hidden', colors.border)}>
      {/* Piece header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          colors.bg, 'hover:opacity-90 transition-opacity'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn('text-sm font-semibold', colors.text, 'truncate')}>
            {piece.title}
          </span>
          {piece.platform && (
            <span className="text-xs px-1.5 py-0.5 bg-white/70 rounded text-gray-600 flex-shrink-0">
              {piece.platform}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs text-gray-500">{piece.timing}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Piece content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3 bg-white">
          {/* Email metadata */}
          {piece.subject && (
            <div className="text-sm">
              <span className="font-medium text-gray-500">Subject: </span>
              <span className="text-gray-900">{piece.subject}</span>
            </div>
          )}
          {piece.preview && (
            <div className="text-sm">
              <span className="font-medium text-gray-500">Preview: </span>
              <span className="text-gray-600 italic">{piece.preview}</span>
            </div>
          )}

          {/* Body */}
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {piece.body}
          </div>

          {/* CTA */}
          {piece.cta && (
            <div className="text-sm">
              <span className="font-medium text-gray-500">CTA: </span>
              <span className="text-apple-blue font-medium">{piece.cta}</span>
            </div>
          )}

          {/* Footer: word count + copy button */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {piece.wordCount} words &middot; {piece.charCount} chars
            </span>
            <CopyButton pieceId={piece.id} copiedId={copiedId} onCopy={onCopy} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Phase accordion — collapsible section for a campaign phase
 */
function PhaseAccordion({
  phase,
  isExpanded,
  onToggle,
  copiedId,
  onCopy,
}: {
  phase: CampaignPhase;
  isExpanded: boolean;
  onToggle: () => void;
  copiedId: string | null;
  onCopy: (id: string) => void;
}) {
  const pieceCount = phase.channels.reduce((sum, ch) => sum + ch.pieces.length, 0);
  const phaseColors: Record<string, string> = {
    pre_launch: 'from-amber-500 to-orange-500',
    launch_day: 'from-blue-500 to-indigo-600',
    post_launch: 'from-green-500 to-emerald-600',
  };
  const gradient = phaseColors[phase.id] || 'from-gray-500 to-gray-600';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-5 py-4',
          'bg-gradient-to-r text-white', gradient
        )}
      >
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5" />
          <div className="text-left">
            <h3 className="font-semibold text-sm">{phase.name}</h3>
            <p className="text-xs opacity-80">{phase.timing}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'}
          </span>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-6 bg-gray-50/50">
          {phase.channels.map((channel) => {
            const ChannelIcon = CHANNEL_ICONS[channel.id] || Mail;
            const colors = CHANNEL_COLORS[channel.id] || CHANNEL_COLORS.email;

            return (
              <div key={channel.id} className="space-y-3">
                {/* Channel header */}
                <div className="flex items-center gap-2">
                  <div className={cn('p-1.5 rounded-md', colors.bg)}>
                    <ChannelIcon className={cn('w-4 h-4', colors.text)} />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-800">{channel.name}</h4>
                  <span className="text-xs text-gray-400">
                    ({channel.pieces.length} {channel.pieces.length === 1 ? 'piece' : 'pieces'})
                  </span>
                </div>

                {/* Pieces */}
                <div className="space-y-2 ml-2">
                  {channel.pieces.map((piece) => (
                    <PieceCard
                      key={piece.id}
                      piece={piece}
                      channelId={channel.id}
                      copiedId={copiedId}
                      onCopy={onCopy}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Campaign timeline visualization — horizontal bar showing phases
 */
function CampaignTimeline({
  preLaunchDays,
  postLaunchDays,
  selectedChannels,
}: {
  preLaunchDays: number;
  postLaunchDays: number;
  selectedChannels: string[];
}) {
  const totalDays = preLaunchDays + 1 + postLaunchDays;
  const prePct = (preLaunchDays / totalDays) * 100;
  const launchPct = (1 / totalDays) * 100;
  const postPct = (postLaunchDays / totalDays) * 100;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign Timeline</h4>
      <div className="flex rounded-lg overflow-hidden h-8 border border-gray-200">
        <div
          className="bg-gradient-to-r from-amber-400 to-orange-400 flex items-center justify-center text-xs font-medium text-white"
          style={{ width: `${prePct}%` }}
          title={`Pre-Launch: ${preLaunchDays} days`}
        >
          {preLaunchDays}d
        </div>
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-xs font-medium text-white border-x border-white/30"
          style={{ width: `${Math.max(launchPct, 8)}%` }}
          title="Launch Day"
        >
          Day 0
        </div>
        <div
          className="bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center text-xs font-medium text-white"
          style={{ width: `${postPct}%` }}
          title={`Post-Launch: ${postLaunchDays} days`}
        >
          {postLaunchDays}d
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        {selectedChannels.map((ch) => {
          const channel = CAMPAIGN_CHANNELS.find((c) => c.id === ch);
          if (!channel) return null;
          const colors = CHANNEL_COLORS[ch];
          return (
            <span
              key={ch}
              className={cn('text-xs px-2 py-0.5 rounded-full border', colors.bg, colors.text, colors.border)}
            >
              {channel.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Summary row for the review step
 */
function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  const display = value.length > 140 ? value.slice(0, 140) + '...' : value;

  return (
    <div className="flex gap-3">
      <span className="text-gray-500 font-medium flex-shrink-0 w-32 text-right text-xs pt-0.5">
        {label}:
      </span>
      <span className="text-gray-900 text-xs leading-relaxed whitespace-pre-line">{display}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED INPUT CLASS
// ═══════════════════════════════════════════════════════════

const INPUT_CLASS = cn(
  'w-full px-3 py-2 rounded-lg border transition-all duration-200',
  'text-sm text-gray-900 bg-white',
  'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-1',
  'disabled:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
);

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ProductLaunchCampaignTemplate({
  onClose,
  editor,
  activeProject,
}: ProductLaunchCampaignTemplateProps) {
  const activeDocumentId = useWorkspaceStore((state) => state.activeDocumentId);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);

  // ─── Wizard state ───
  const [currentStep, setCurrentStep] = useState(0);
  const [viewState, setViewState] = useState<ViewState>('wizard');

  // ─── Step 0: Launch Type & Channels ───
  const [launchType, setLaunchType] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['email', 'social', 'landing_page']);

  // ─── Step 1: Core Details ───
  const [coreData, setCoreData] = useState<CoreFormData>({
    productName: '',
    productDescription: '',
    targetAudience: '',
    mainProblem: '',
    keyBenefits: '',
    differentiators: '',
    pricingDetails: '',
    launchDate: '',
  });

  // ─── Step 2: Settings & Optional ───
  const [optionalData, setOptionalData] = useState<OptionalFormData>({
    earlyBirdOffer: '',
    limitedOffer: '',
    socialProof: '',
    testimonials: '',
  });
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings>({
    preLaunchDuration: '7',
    postLaunchDuration: '14',
    tone: 'Professional',
    includeLaunchOffer: false,
    includeCountdown: true,
  });

  // ─── Brand voice & persona ───
  const [applyBrandVoice, setApplyBrandVoice] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const hasBrandVoice = Boolean(activeProject?.brandVoice?.brandName);

  // ─── Generation state ───
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<ParsedCampaign | null>(null);

  // ─── Output UI state ───
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['pre_launch', 'launch_day', 'post_launch']);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ─── Load personas ───
  useEffect(() => {
    const loadPersonas = async () => {
      if (!activeProject) {
        setPersonas([]);
        return;
      }
      try {
        const projectPersonas = await getProjectPersonas(activeProject.id);
        setPersonas(projectPersonas);
      } catch (error) {
        logger.error('Failed to load personas:', error);
        setPersonas([]);
      }
    };
    loadPersonas();
  }, [activeProject]);

  // ─── Clear copied indicator after 2 seconds ───
  useEffect(() => {
    if (!copiedId) return;
    const timer = setTimeout(() => setCopiedId(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedId]);

  // ═══════════════════════════════════════════════════════════
  // FIELD UPDATERS
  // ═══════════════════════════════════════════════════════════

  const updateCore = useCallback(<K extends keyof CoreFormData>(field: K, value: CoreFormData[K]) => {
    setCoreData((prev) => ({ ...prev, [field]: value }));
    setGenerationError(null);
  }, []);

  const updateOptional = useCallback(<K extends keyof OptionalFormData>(field: K, value: OptionalFormData[K]) => {
    setOptionalData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateSettings = useCallback(<K extends keyof CampaignSettings>(field: K, value: CampaignSettings[K]) => {
    setCampaignSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleChannel = useCallback((channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId) ? prev.filter((c) => c !== channelId) : [...prev, channelId]
    );
  }, []);

  const togglePhase = useCallback((phaseId: string) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseId) ? prev.filter((p) => p !== phaseId) : [...prev, phaseId]
    );
  }, []);

  // ═══════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Validate the current wizard step. Returns error message or null if valid.
   */
  const validateStep = useCallback((step: number): string | null => {
    switch (step) {
      case 0:
        if (!launchType) return 'Please select a launch type.';
        if (selectedChannels.length === 0) return 'Please select at least one channel.';
        return null;

      case 1:
        if (!coreData.productName.trim()) return 'Product/Service Name is required.';
        if (!coreData.productDescription.trim()) return 'Product description is required.';
        if (!coreData.targetAudience.trim()) return 'Target audience is required.';
        if (!coreData.mainProblem.trim()) return 'Main problem solved is required.';
        if (!coreData.keyBenefits.trim()) return 'Key benefits are required.';
        if (!coreData.differentiators.trim()) return 'Unique differentiators are required.';
        if (!coreData.launchDate.trim()) return 'Launch date is required.';
        return null;

      case 2:
        return null; // All optional

      case 3:
        return null; // Review step — no new input

      default:
        return null;
    }
  }, [launchType, selectedChannels, coreData]);

  /**
   * Advance to next wizard step after validation
   */
  const handleNext = useCallback(() => {
    const error = validateStep(currentStep);
    if (error) {
      setGenerationError(error);
      return;
    }
    setGenerationError(null);
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, [currentStep, validateStep]);

  /**
   * Go back to previous wizard step
   */
  const handlePrevious = useCallback(() => {
    setGenerationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // ═══════════════════════════════════════════════════════════
  // GENERATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate the complete campaign via Claude API
   */
  const handleGenerate = useCallback(async () => {
    if (!editor || !activeProject) return;

    // Auto-create document if none open
    let targetDocumentId = activeDocumentId;
    if (!targetDocumentId && activeProjectId) {
      try {
        const dateStr = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const title = `Launch Campaign - ${coreData.productName} - ${dateStr}`;
        const newDoc = await createDocument(activeProjectId, title);
        targetDocumentId = newDoc.id;
        useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);
        logger.log('Auto-created document for campaign:', newDoc.id);
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (err) {
        logger.error('Failed to create document:', err);
        setGenerationError('Failed to create document. Please try again.');
        return;
      }
    }

    setIsGenerating(true);
    setGenerationError(null);
    setCampaign(null);
    setViewState('generating');

    try {
      // Build brand voice instructions
      let brandVoiceInstructions = '';
      if (applyBrandVoice && activeProject.brandVoice) {
        const bv = activeProject.brandVoice;
        brandVoiceInstructions = `
BRAND VOICE REQUIREMENTS:
Brand: ${bv.brandName}
Tone: ${bv.brandTone}
Use these phrases: ${bv.approvedPhrases?.join(', ') || 'N/A'}
Never use: ${bv.forbiddenWords?.join(', ') || 'N/A'}
Reflect values: ${bv.brandValues?.join(', ') || 'N/A'}
Mission context: ${bv.missionStatement || 'N/A'}
Write in a way that authentically reflects this brand voice.`;
      }

      // Build persona instructions
      let personaInstructions = '';
      const selectedPersona = selectedPersonaId
        ? personas.find((p) => p.id === selectedPersonaId)
        : undefined;
      if (selectedPersona) {
        personaInstructions = `
TARGET PERSONA:
Name: ${selectedPersona.name}
Demographics: ${selectedPersona.demographics}
Psychographics: ${selectedPersona.psychographics}
Pain Points: ${selectedPersona.painPoints}
Language they use: ${selectedPersona.languagePatterns}
Goals: ${selectedPersona.goals}
Write specifically for this persona's context and language.`;
      }

      // Build the prompt
      const systemPrompt = buildCampaignPrompt(
        launchType,
        selectedChannels,
        coreData,
        optionalData,
        campaignSettings,
        brandVoiceInstructions,
        personaInstructions
      );

      logger.log('Generating campaign for:', coreData.productName, 'channels:', selectedChannels);

      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'product-launch-campaign',
          formData: {
            productName: coreData.productName,
            _systemPromptOverride: systemPrompt,
          },
          applyBrandVoice,
          brandVoice: applyBrandVoice ? activeProject.brandVoice : undefined,
          persona: selectedPersona,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to generate campaign');
      }

      const data = await response.json();
      const rawContent = data.generatedCopy;

      logger.log('Campaign generated, raw length:', rawContent.length);

      // Parse the structured output
      const parsed = parseCampaignOutput(rawContent);

      if (parsed.totalPieces === 0) {
        throw new Error('No campaign pieces could be parsed from the output. Please try again.');
      }

      logger.log('Parsed campaign:', parsed.totalPieces, 'pieces across', parsed.phases.length, 'phases');

      setCampaign(parsed);
      setViewState('results');

      // Build HTML and insert into editor
      const editorHtml = buildEditorHtml(parsed, coreData.productName, coreData.launchDate);
      const formatted = formatGeneratedContent(editorHtml);
      editor.commands.setContent(formatted);

      // Persist to document storage
      if (activeProjectId && targetDocumentId) {
        try {
          updateDocumentInStorage(activeProjectId, targetDocumentId, { content: formatted });
          logger.log('Campaign document saved');
        } catch (storageErr) {
          logger.error('Failed to save campaign document:', storageErr);
        }
      }
    } catch (error) {
      logger.error('Campaign generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate campaign');
      setViewState('wizard');
    } finally {
      setIsGenerating(false);
    }
  }, [
    editor,
    activeProject,
    activeDocumentId,
    activeProjectId,
    launchType,
    selectedChannels,
    coreData,
    optionalData,
    campaignSettings,
    applyBrandVoice,
    selectedPersonaId,
    personas,
  ]);

  // ═══════════════════════════════════════════════════════════
  // CLIPBOARD
  // ═══════════════════════════════════════════════════════════

  /**
   * Copy a single piece to clipboard
   */
  const handleCopyPiece = useCallback((pieceId: string) => {
    if (!campaign) return;

    for (const phase of campaign.phases) {
      for (const channel of phase.channels) {
        const piece = channel.pieces.find((p) => p.id === pieceId);
        if (piece) {
          const parts: string[] = [piece.title, `Timing: ${piece.timing}`];
          if (piece.subject) parts.push(`Subject: ${piece.subject}`);
          if (piece.preview) parts.push(`Preview: ${piece.preview}`);
          if (piece.platform) parts.push(`Platform: ${piece.platform}`);
          parts.push('', piece.body);
          if (piece.cta) parts.push('', `CTA: ${piece.cta}`);

          navigator.clipboard.writeText(parts.join('\n').trim())
            .then(() => setCopiedId(pieceId))
            .catch((err) => logger.error('Clipboard error:', err));
          return;
        }
      }
    }
  }, [campaign]);

  /**
   * Copy the entire campaign to clipboard
   */
  const handleCopyAll = useCallback(() => {
    if (!campaign) return;

    const lines: string[] = [
      `PRODUCT LAUNCH CAMPAIGN: ${coreData.productName}`,
      `Launch Date: ${coreData.launchDate}`,
      '═'.repeat(60),
      '',
    ];

    for (const phase of campaign.phases) {
      lines.push(`${phase.name} (${phase.timing})`, '─'.repeat(40));
      for (const channel of phase.channels) {
        lines.push('', `  ${channel.name}`, '');
        for (const piece of channel.pieces) {
          lines.push(`    ${piece.title} — ${piece.timing}`);
          if (piece.subject) lines.push(`    Subject: ${piece.subject}`);
          if (piece.preview) lines.push(`    Preview: ${piece.preview}`);
          if (piece.platform) lines.push(`    Platform: ${piece.platform}`);
          lines.push('', piece.body.split('\n').map((l) => `    ${l}`).join('\n'));
          if (piece.cta) lines.push(`    CTA: ${piece.cta}`);
          lines.push('');
        }
      }
      lines.push('');
    }

    navigator.clipboard.writeText(lines.join('\n').trim())
      .then(() => setCopiedId('all'))
      .catch((err) => logger.error('Clipboard error:', err));
  }, [campaign, coreData]);

  // ═══════════════════════════════════════════════════════════
  // WIZARD STEP RENDERERS
  // ═══════════════════════════════════════════════════════════

  /**
   * Step 0: Launch Type & Channel Selection
   */
  const renderStep0 = () => (
    <div className="space-y-6">
      {/* Launch Type */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Launch Type <span className="text-red-500">*</span></h3>
        <p className="text-xs text-gray-500">What kind of launch is this? This shapes the messaging angle.</p>
        <div className="space-y-2">
          {LAUNCH_TYPES.map((lt) => {
            const Icon = lt.icon;
            const isSelected = launchType === lt.id;
            return (
              <button
                key={lt.id}
                onClick={() => { setLaunchType(lt.id); setGenerationError(null); }}
                className={cn(
                  'w-full text-left p-3 rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-apple-blue bg-blue-50/50 ring-1 ring-apple-blue/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-1.5 rounded-md flex-shrink-0 mt-0.5',
                    isSelected ? 'bg-apple-blue text-white' : 'bg-gray-100 text-gray-500'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', isSelected ? 'text-apple-blue' : 'text-gray-900')}>
                      {lt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{lt.description}</p>
                    <p className="text-xs text-gray-400 italic mt-0.5">{lt.angle}</p>
                  </div>
                  {isSelected && <CheckCircle className="w-5 h-5 text-apple-blue flex-shrink-0 mt-0.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Campaign Channels <span className="text-red-500">*</span></h3>
        <p className="text-xs text-gray-500">Select which channels to include in the campaign.</p>
        <div className="space-y-2">
          {CAMPAIGN_CHANNELS.map((ch) => {
            const Icon = ch.icon;
            const isChecked = selectedChannels.includes(ch.id);
            return (
              <label
                key={ch.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  isChecked ? 'border-apple-blue bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleChannel(ch.id)}
                  className="h-4 w-4 rounded border-gray-300 text-apple-blue focus:ring-apple-blue"
                />
                <Icon className={cn('w-4 h-4 flex-shrink-0', isChecked ? 'text-apple-blue' : 'text-gray-400')} />
                <span className={cn('text-sm', isChecked ? 'text-gray-900 font-medium' : 'text-gray-700')}>
                  {ch.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  /**
   * Step 1: Core Product Details
   */
  const renderStep1 = () => (
    <div className="space-y-4">
      <FormField label="Product/Service Name" required>
        <input
          type="text"
          value={coreData.productName}
          onChange={(e) => updateCore('productName', e.target.value)}
          placeholder="e.g., CopyWorx Studio"
          className={INPUT_CLASS}
          maxLength={100}
        />
      </FormField>

      <FormField label="What It Is (1-sentence description)" required>
        <AutoExpandTextarea
          value={coreData.productDescription}
          onChange={(e) => updateCore('productDescription', e.target.value)}
          placeholder="e.g., AI copywriting platform built by a professional copywriter for professional copywriters"
          className={INPUT_CLASS}
          minHeight={60}
          maxHeight={120}
          maxLength={300}
        />
      </FormField>

      <FormField label="Target Audience" required helperText="Who is this for? Be specific.">
        <AutoExpandTextarea
          value={coreData.targetAudience}
          onChange={(e) => updateCore('targetAudience', e.target.value)}
          placeholder="e.g., Professional freelance copywriters and small agency owners who use AI tools"
          className={INPUT_CLASS}
          minHeight={60}
          maxHeight={120}
          maxLength={300}
        />
      </FormField>

      <FormField label="Main Problem Solved" required helperText="What pain point does this eliminate?">
        <AutoExpandTextarea
          value={coreData.mainProblem}
          onChange={(e) => updateCore('mainProblem', e.target.value)}
          placeholder="e.g., AI writing tools are built by engineers, not copywriters — they lack professional frameworks"
          className={INPUT_CLASS}
          minHeight={60}
          maxHeight={120}
          maxLength={400}
        />
      </FormField>

      <FormField label="Key Benefits (3-5)" required helperText="List each benefit on a new line">
        <AutoExpandTextarea
          value={coreData.keyBenefits}
          onChange={(e) => updateCore('keyBenefits', e.target.value)}
          placeholder={"Professional-grade templates (brand messaging, sales pages, case studies)\nMulti-client brand voice management\nSelection-based editing workflow\nBuilt by a copywriter with 40 years experience"}
          className={INPUT_CLASS}
          minHeight={80}
          maxHeight={200}
          maxLength={800}
        />
      </FormField>

      <FormField label="Unique Differentiators" required helperText="What makes this different from alternatives?">
        <AutoExpandTextarea
          value={coreData.differentiators}
          onChange={(e) => updateCore('differentiators', e.target.value)}
          placeholder="e.g., Only AI platform with professional copywriting frameworks, built by a 40-year veteran"
          className={INPUT_CLASS}
          minHeight={60}
          maxHeight={160}
          maxLength={500}
        />
      </FormField>

      <FormField label="Pricing/Offer Details" helperText="Pricing, packages, or offer structure (optional but recommended)">
        <AutoExpandTextarea
          value={coreData.pricingDetails}
          onChange={(e) => updateCore('pricingDetails', e.target.value)}
          placeholder="e.g., Free tier with 3 templates/month, Pro at $29/month, Agency at $79/month"
          className={INPUT_CLASS}
          minHeight={60}
          maxHeight={120}
          maxLength={300}
        />
      </FormField>

      <FormField label="Launch Date" required helperText="When is the launch? Used for countdown messaging.">
        <input
          type="text"
          value={coreData.launchDate}
          onChange={(e) => updateCore('launchDate', e.target.value)}
          placeholder="e.g., March 1, 2026"
          className={INPUT_CLASS}
          maxLength={50}
        />
      </FormField>
    </div>
  );

  /**
   * Step 2: Campaign Settings & Optional Fields
   */
  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Campaign Timing */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Campaign Timing</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Pre-Launch Duration">
            <select
              value={campaignSettings.preLaunchDuration}
              onChange={(e) => updateSettings('preLaunchDuration', e.target.value)}
              className={INPUT_CLASS}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Post-Launch Duration">
            <select
              value={campaignSettings.postLaunchDuration}
              onChange={(e) => updateSettings('postLaunchDuration', e.target.value)}
              className={INPUT_CLASS}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* Tone */}
      <FormField label="Campaign Tone" helperText="Sets the voice across all pieces">
        <select
          value={campaignSettings.tone}
          onChange={(e) => updateSettings('tone', e.target.value)}
          className={INPUT_CLASS}
        >
          {TONE_OPTIONS.map((tone) => (
            <option key={tone} value={tone}>{tone}</option>
          ))}
        </select>
      </FormField>

      {/* Toggles */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={campaignSettings.includeLaunchOffer}
            onChange={(e) => updateSettings('includeLaunchOffer', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-apple-blue focus:ring-apple-blue"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">Include Launch Offer</span>
            <p className="text-xs text-gray-500">Weave special offer/discount into launch and post-launch</p>
          </div>
        </label>
        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={campaignSettings.includeCountdown}
            onChange={(e) => updateSettings('includeCountdown', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-apple-blue focus:ring-apple-blue"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">Include Countdown Messaging</span>
            <p className="text-xs text-gray-500">Add countdown language to pre-launch pieces</p>
          </div>
        </label>
      </div>

      {/* Optional fields */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Optional Details</h3>
        <p className="text-xs text-gray-500">These enrich the campaign but aren&apos;t required.</p>

        <FormField label="Early Bird / Launch Discount" helperText="e.g., 30% off for first 100 customers">
          <input
            type="text"
            value={optionalData.earlyBirdOffer}
            onChange={(e) => updateOptional('earlyBirdOffer', e.target.value)}
            placeholder="e.g., 30% off for first 100 sign-ups"
            className={INPUT_CLASS}
            maxLength={200}
          />
        </FormField>

        <FormField label="Limited Time/Quantity Offer" helperText="Creates urgency in post-launch">
          <input
            type="text"
            value={optionalData.limitedOffer}
            onChange={(e) => updateOptional('limitedOffer', e.target.value)}
            placeholder="e.g., Founding member pricing ends March 15"
            className={INPUT_CLASS}
            maxLength={200}
          />
        </FormField>

        <FormField label="Social Proof / Success Metrics" helperText="Numbers, beta results, waitlist size">
          <AutoExpandTextarea
            value={optionalData.socialProof}
            onChange={(e) => updateOptional('socialProof', e.target.value)}
            placeholder="e.g., 500+ beta users, 4.8/5 satisfaction score, saved users 12 hours/week average"
            className={INPUT_CLASS}
            minHeight={60}
            maxHeight={120}
            maxLength={400}
          />
        </FormField>

        <FormField label="Testimonials" helperText="Customer quotes to weave into campaign">
          <AutoExpandTextarea
            value={optionalData.testimonials}
            onChange={(e) => updateOptional('testimonials', e.target.value)}
            placeholder='"CopyWorx finally understands what professional copywriters need." — Sarah K., Freelance Copywriter'
            className={INPUT_CLASS}
            minHeight={60}
            maxHeight={120}
            maxLength={600}
          />
        </FormField>
      </div>

      {/* Brand Voice Toggle */}
      {hasBrandVoice && (
        <div className="p-4 border border-gray-200 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyBrandVoice}
              onChange={(e) => setApplyBrandVoice(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-apple-blue focus:ring-apple-blue"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Apply Brand Voice</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Use {activeProject?.brandVoice?.brandName}&apos;s guidelines across all pieces
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Persona Selector */}
      {personas.length > 0 && (
        <FormField label="Target Persona (Optional)">
          <select
            value={selectedPersonaId || ''}
            onChange={(e) => setSelectedPersonaId(e.target.value || null)}
            className={INPUT_CLASS}
          >
            <option value="">No specific persona</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>{persona.name}</option>
            ))}
          </select>
        </FormField>
      )}
    </div>
  );

  /**
   * Step 3: Review & Generate
   */
  const renderStep3 = () => {
    const launchTypeInfo = LAUNCH_TYPES.find((lt) => lt.id === launchType);
    const estimatedPieces = estimatePieceCount(selectedChannels);

    return (
      <div className="space-y-5">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-apple-blue flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Campaign Summary</h3>
              <p className="text-xs text-gray-600 mt-1">Review your campaign details before generating.</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
          <SummaryRow label="Launch Type" value={launchTypeInfo?.label || ''} />
          <SummaryRow label="Product" value={coreData.productName} />
          <SummaryRow label="Description" value={coreData.productDescription} />
          <SummaryRow label="Audience" value={coreData.targetAudience} />
          <SummaryRow label="Problem" value={coreData.mainProblem} />
          <SummaryRow label="Launch Date" value={coreData.launchDate} />
          <SummaryRow label="Tone" value={campaignSettings.tone} />
          <SummaryRow label="Channels" value={selectedChannels.map((ch) =>
            CAMPAIGN_CHANNELS.find((c) => c.id === ch)?.label
          ).filter(Boolean).join(', ')} />
        </div>

        {/* Timeline preview */}
        <CampaignTimeline
          preLaunchDays={parseInt(campaignSettings.preLaunchDuration, 10)}
          postLaunchDays={parseInt(campaignSettings.postLaunchDuration, 10)}
          selectedChannels={selectedChannels}
        />

        {/* Estimated output */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-800">
              <strong>Estimated output:</strong> ~{estimatedPieces} campaign pieces across 3 phases.
              Generation takes 60-120 seconds for this volume of content.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // RESULTS DISPLAY
  // ═══════════════════════════════════════════════════════════

  const renderResults = () => {
    if (!campaign) return null;

    return (
      <div className="space-y-4">
        {/* Campaign header */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">{coreData.productName}</h3>
              <p className="text-xs text-gray-600 mt-1">
                Launch: {coreData.launchDate} &middot; {campaign.totalPieces} pieces generated
              </p>
            </div>
            <CopyButton
              pieceId="all"
              copiedId={copiedId}
              onCopy={() => handleCopyAll()}
              label={copiedId === 'all' ? 'Copied All' : 'Copy All'}
            />
          </div>
        </div>

        {/* Phase accordions */}
        {campaign.phases.map((phase) => (
          <PhaseAccordion
            key={phase.id}
            phase={phase}
            isExpanded={expandedPhases.includes(phase.id)}
            onToggle={() => togglePhase(phase.id)}
            copiedId={copiedId}
            onCopy={handleCopyPiece}
          />
        ))}

        {/* Regenerate button */}
        <button
          onClick={() => {
            setViewState('wizard');
            setCurrentStep(3);
            setCampaign(null);
          }}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg font-medium text-sm',
            'border border-gray-300 text-gray-700 bg-white',
            'hover:bg-gray-50 transition-colors flex items-center justify-center gap-2'
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Back to Settings & Regenerate
        </button>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // GENERATING STATE
  // ═══════════════════════════════════════════════════════════

  const renderGenerating = () => (
    <div className="text-center py-12 space-y-6">
      <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center">
        <Rocket className="w-8 h-8 text-apple-blue animate-bounce" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Generating Your Campaign</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
          Creating {estimatePieceCount(selectedChannels)}+ coordinated pieces across {selectedChannels.length} channels
          and 3 phases. This takes 60-120 seconds.
        </p>
      </div>
      <AIWorxButtonLoader />
      <div className="space-y-2 text-xs text-gray-400">
        <p>Building pre-launch sequence...</p>
        <p>Crafting launch day messaging...</p>
        <p>Creating post-launch follow-up...</p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-t-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{TEMPLATE_META.name}</h2>
              <p className="text-sm text-white/80 mt-0.5">{TEMPLATE_META.description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              useWorkspaceStore.getState().setSelectedTemplateId(null);
              onClose();
            }}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close"
            title="Close template"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-0.5 rounded border bg-white/10 border-white/20">
            {TEMPLATE_META.complexity}
          </span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{TEMPLATE_META.estimatedTime}</span>
          </div>
        </div>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {/* Error display */}
        {generationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{generationError}</p>
            </div>
            <button onClick={() => setGenerationError(null)}>
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}

        {/* Wizard view */}
        {viewState === 'wizard' && (
          <>
            <StepIndicator currentStep={currentStep} totalSteps={WIZARD_STEPS.length} />
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Step {currentStep + 1}: {WIZARD_STEPS[currentStep]}
            </h3>
            {currentStep === 0 && renderStep0()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </>
        )}

        {/* Generating view */}
        {viewState === 'generating' && renderGenerating()}

        {/* Results view */}
        {viewState === 'results' && renderResults()}
      </div>

      {/* Footer with navigation buttons */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {viewState === 'wizard' && (
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className={cn(
                  'px-4 py-2.5 rounded-lg font-medium text-sm',
                  'border border-gray-300 text-gray-700 bg-white',
                  'hover:bg-gray-50 transition-colors',
                  'flex items-center gap-1'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {currentStep < WIZARD_STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-medium text-sm text-white',
                  'bg-apple-blue hover:bg-[#0071e3] transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                  'flex items-center justify-center gap-1'
                )}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !editor || !activeProject}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-medium text-sm text-white',
                  'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
                  'flex items-center justify-center gap-2',
                  isGenerating && 'aiworx-gradient-animated cursor-wait',
                  !isGenerating && 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all'
                )}
              >
                {isGenerating ? (
                  <AIWorxButtonLoader />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Campaign
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {viewState === 'results' && (
          <button
            onClick={() => {
              useWorkspaceStore.getState().setSelectedTemplateId(null);
              onClose();
            }}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white',
              'bg-green-500 hover:bg-green-600 transition-colors',
              'flex items-center justify-center gap-2'
            )}
          >
            <CheckCircle className="w-4 h-4" />
            Finish & Close
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// UTILITY — Estimate piece count from selected channels
// ═══════════════════════════════════════════════════════════

/**
 * Estimate total number of campaign pieces based on selected channels.
 * Used for UI display and generation time estimates.
 */
function estimatePieceCount(selectedChannels: string[]): number {
  let count = 0;

  if (selectedChannels.includes('email')) count += 7;       // 3 pre + 1 launch + 3 post
  if (selectedChannels.includes('social')) count += 8;      // 3 pre + 2 launch + 3 post
  if (selectedChannels.includes('landing_page')) count += 2; // 1 pre + 1 launch
  if (selectedChannels.includes('ads')) count += 3;         // 2 launch + 1 post
  if (selectedChannels.includes('press')) count += 1;       // 1 launch

  return count;
}
