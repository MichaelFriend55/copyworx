/**
 * @file components/workspace/CaseStudyTemplate.tsx
 * @description Professional B2B Case Study template for CopyWorx Studio
 *
 * Generates client-ready case studies that prove ROI through customer success stories.
 * Supports four structure types and three output formats:
 *
 * Structures:
 *   1. PSR (Problem, Solution, Results) — Most common, straightforward
 *   2. STAR (Situation, Task, Action, Result) — Detailed, consulting-style
 *   3. Before-After-Bridge — Story-driven
 *   4. Executive Summary — Corporate/formal
 *
 * Formats:
 *   1. One-Page (500-700 words) — Scannable, bullet-heavy, sales handout
 *   2. Detailed (1,000-1,500 words) — In-depth narrative, multi-section
 *   3. Slide Deck (6-8 slides) — Presentation outline with speaker notes
 *
 * Features:
 *   - Structure & format selectors with contextual descriptions
 *   - Metric input fields with examples/hints
 *   - Customer quote integration with verbatim enforcement
 *   - Validation requiring at least one metric
 *   - Brand voice & persona integration
 *   - Structured output with per-section clipboard copy
 *   - Output inserted into TipTap editor for editing/export
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Award,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  X,
  Clock,
  Info,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from 'lucide-react';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { cn } from '@/lib/utils';
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
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

/** Template metadata shown in the header */
const TEMPLATE_META = {
  name: 'Case Study',
  description:
    'Professional B2B success stories that prove ROI — structure, data accuracy, and credibility.',
  complexity: 'Advanced' as const,
  estimatedTime: '15-25 min',
};

/** Structure options with descriptions */
const STRUCTURE_OPTIONS = [
  {
    id: 'psr',
    label: 'PSR',
    fullLabel: 'Problem → Solution → Results',
    description: 'Most common format. Straightforward narrative arc that clearly connects the customer\'s problem to your solution and measurable outcomes.',
    bestFor: 'General-purpose case studies, sales handouts',
  },
  {
    id: 'star',
    label: 'STAR',
    fullLabel: 'Situation → Task → Action → Result',
    description: 'Detailed, consulting-style format that provides full context. Shows the complexity of the challenge and the thoroughness of the solution.',
    bestFor: 'Enterprise sales, consulting engagements',
  },
  {
    id: 'before-after-bridge',
    label: 'Before-After-Bridge',
    fullLabel: 'Before → After → Bridge',
    description: 'Story-driven format that contrasts life before and after your solution. Emotionally compelling and easy for readers to envision themselves in.',
    bestFor: 'Website content, storytelling-heavy brands',
  },
  {
    id: 'executive-summary',
    label: 'Executive Summary',
    fullLabel: 'Executive Summary Style',
    description: 'Corporate/formal format with an executive summary up front, followed by detailed sections. Designed for C-suite readers who skim first.',
    bestFor: 'Enterprise/corporate audiences, formal proposals',
  },
] as const;

/** Format options with descriptions */
const FORMAT_OPTIONS = [
  {
    id: 'one-page',
    label: 'One-Page',
    wordCount: '500-700 words',
    description: 'Scannable, bullet-heavy. Perfect for sales handouts and PDFs.',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    wordCount: '1,000-1,500 words',
    description: 'In-depth narrative with multiple sections. Ideal for web pages.',
  },
  {
    id: 'slide-deck',
    label: 'Slide Deck',
    wordCount: '6-8 slides',
    description: 'Presentation outline with speaker notes and big numbers.',
  },
] as const;

/** Tone options */
const TONE_OPTIONS = [
  'Professional',
  'Conversational',
  'Technical',
] as const;

/** Maximum number of metric fields */
const MAX_METRICS = 6;

/** Minimum required metrics */
const MIN_METRICS = 1;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface CaseStudyTemplateProps {
  /** Callback when template should close */
  onClose: () => void;
  /** TipTap editor instance */
  editor: Editor | null;
  /** Active project for brand voice and personas */
  activeProject: Project | null;
}

/** Single metric entry */
interface MetricEntry {
  id: string;
  value: string;
}

/** Form data shape for the case study */
interface CaseStudyFormData {
  // Structure & format
  structure: typeof STRUCTURE_OPTIONS[number]['id'];
  format: typeof FORMAT_OPTIONS[number]['id'];
  // Required fields
  customerName: string;
  customerIndustry: string;
  customerRole: string;
  problem: string;
  solution: string;
  // Metrics
  metrics: MetricEntry[];
  // Optional fields
  customerCompanySize: string;
  implementationDetails: string;
  customerQuote: string;
  timeline: string;
  companyBackground: string;
  secondaryBenefits: string;
  futurePlans: string;
  additionalQuotes: string;
  // Settings
  tone: typeof TONE_OPTIONS[number];
  includeLogoPlaceholders: boolean;
  includeChartPlaceholders: boolean;
}

/** Tracks which section was copied to clipboard */
type CopiedSection = string | null;

// ═══════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build the Claude system prompt for case study generation.
 * Dynamically assembles prompt based on chosen structure and format,
 * injecting user inputs, brand voice, and persona instructions.
 */
function buildCaseStudySystemPrompt(
  formData: CaseStudyFormData,
  brandVoiceInstructions: string,
  personaInstructions: string
): string {
  const metricsText = formData.metrics
    .filter((m) => m.value.trim())
    .map((m, i) => `  - Metric ${i + 1}: ${m.value}`)
    .join('\n');

  const structureLabel =
    STRUCTURE_OPTIONS.find((s) => s.id === formData.structure)?.fullLabel || formData.structure;
  const formatLabel =
    FORMAT_OPTIONS.find((f) => f.id === formData.format)?.label || formData.format;

  return `You are an expert B2B copywriter who specializes in writing client-ready case studies. You have 20 years of experience producing high-value case studies that sales teams use to close deals. Professional case studies like these cost $2,000-$5,000 each. Deliver accordingly.

Generate a complete, publication-ready case study based on these inputs:

STRUCTURE: ${structureLabel}
FORMAT: ${formatLabel}
TONE: ${formData.tone}

CLIENT PROFILE:
Customer/Company Name: ${formData.customerName}
Industry: ${formData.customerIndustry}
Company Size: ${formData.customerCompanySize || '(not provided)'}
Contact Name/Role: ${formData.customerRole}

THE CHALLENGE:
${formData.problem}

THE SOLUTION:
${formData.solution}

IMPLEMENTATION DETAILS:
${formData.implementationDetails || '(not provided)'}

KEY RESULTS/METRICS:
${metricsText || '(none provided)'}

CUSTOMER QUOTE:
${formData.customerQuote || '(not provided)'}

TIMELINE:
${formData.timeline || '(not provided)'}

COMPANY BACKGROUND:
${formData.companyBackground || '(not provided)'}

SECONDARY BENEFITS:
${formData.secondaryBenefits || '(not provided)'}

FUTURE PLANS:
${formData.futurePlans || '(not provided)'}

ADDITIONAL STAKEHOLDER QUOTES:
${formData.additionalQuotes || '(not provided)'}

${brandVoiceInstructions}
${personaInstructions}

═══════════════════════════════════════════════════
STRUCTURE-SPECIFIC INSTRUCTIONS
═══════════════════════════════════════════════════

${getStructureInstructions(formData.structure)}

═══════════════════════════════════════════════════
FORMAT-SPECIFIC INSTRUCTIONS
═══════════════════════════════════════════════════

${getFormatInstructions(formData.format, formData.includeLogoPlaceholders, formData.includeChartPlaceholders)}

═══════════════════════════════════════════════════
TONE GUIDANCE
═══════════════════════════════════════════════════

${getToneInstructions(formData.tone)}

═══════════════════════════════════════════════════
CRITICAL QUALITY RULES — NO EXCEPTIONS
═══════════════════════════════════════════════════

METRICS & DATA:
- Use ONLY the specific numbers provided in the "Key Results/Metrics" section above.
- NEVER generate fake metrics or fabricate statistics.
- If no metrics were provided, use placeholder brackets like "[X%]" and note they need to be filled in.
- Highlight metrics visually — use <strong> tags and present them prominently.
- Numbers are the backbone of credibility. Present them in callout-style formatting.

CUSTOMER VOICE:
- Use the customer quote VERBATIM — do not paraphrase, rewrite, or embellish it.
- Include the customer's full name and title with every quote.
- If no quote was provided, include a placeholder: "[Customer Quote — Recommended]".
- Place quotes strategically: end of Challenge section, end of Results section.
- Format quotes as pull quotes using <blockquote> or <em> with attribution.

PERSPECTIVE & CREDIBILITY:
- Write in THIRD PERSON (about the customer, not "we").
- The customer is the HERO of this story — not the product/service.
- No hyperbole, no superlatives without data backing them.
- No "revolutionary," "game-changing," "cutting-edge," or similar empty claims.
- Use specific company names, specific titles, specific timeframes from the inputs.
- Every claim must be traceable to the data provided.

STRUCTURE & SCANABILITY:
- Use clear section headers matching the chosen structure type.
- Short paragraphs (2-3 sentences maximum).
- Bullet points for lists of results, features, or benefits.
- Metrics should be presented in a visually prominent way.
- Include a clear narrative arc: problem → solution → results.

FORMAT:
- Output ONLY valid HTML using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote> tags.
- No markdown. No preamble. No explanation outside the case study content.
- Each section header uses <h2>, sub-sections use <h3>.
- Use <strong> for metrics, key phrases, and emphasis.
- Use <blockquote> or <em> for customer quotes with attribution.`;
}

/**
 * Get structure-specific prompt instructions
 */
function getStructureInstructions(structure: string): string {
  switch (structure) {
    case 'psr':
      return `PSR (Problem → Solution → Results) STRUCTURE:

1. TITLE: "Case Study: How [Customer] [Achieved Key Result] in [Timeline]"

2. CLIENT PROFILE: Company name, industry, size, and the challenge in 1-2 sentences.

3. THE CHALLENGE:
   - Describe the problem in specific, quantifiable terms
   - Include pain points as bullet points
   - Show the business impact of the problem (cost, time, lost opportunity)
   - End with a customer quote about the challenge (if provided)

4. THE SOLUTION:
   - What was implemented and how
   - Key features or capabilities that addressed the problem
   - Implementation timeline and process
   - Keep focus on what was done, not marketing language

5. THE RESULTS:
   - Lead with the biggest metric in a prominent callout
   - Present all metrics in a visually scannable format (bullets or callout box)
   - Describe additional qualitative benefits
   - End with a customer quote about the results (if provided)

6. THE IMPACT (brief closing):
   - Future plans or expanded usage
   - CTA or next steps`;

    case 'star':
      return `STAR (Situation → Task → Action → Result) STRUCTURE:

1. TITLE: "Success Story: [Customer]'s Journey to [Key Result]"

2. SITUATION (2-3 paragraphs):
   - Full context of the customer's business and environment
   - Industry landscape and competitive pressures
   - Why the status quo was no longer acceptable
   - Specific data about the pre-solution state

3. TASK (1-2 paragraphs):
   - What the customer needed to accomplish
   - Criteria for success they established
   - Constraints and requirements (budget, timeline, technical)
   - Why they chose this approach

4. ACTION (2-3 paragraphs):
   - Detailed implementation narrative
   - Key decisions made and why
   - Challenges overcome during implementation
   - Team involvement and change management

5. RESULT (2-3 paragraphs + metrics):
   - Quantifiable outcomes prominently displayed
   - Comparison: before vs. after metrics
   - ROI calculation if data supports it
   - Customer quote about the transformation
   - Unexpected or additional benefits`;

    case 'before-after-bridge':
      return `BEFORE-AFTER-BRIDGE STRUCTURE:

1. TITLE: "[Customer]: From [Before State] to [After State]"

2. BEFORE (2-3 paragraphs):
   - Paint a vivid picture of life before the solution
   - Specific daily frustrations and operational challenges
   - Quantify the cost of the old way (time, money, opportunity)
   - Make the reader feel the pain
   - Use storytelling, not just facts

3. AFTER (2-3 paragraphs):
   - Contrast with the transformed state
   - Use the same metrics framework to show improvement
   - Describe the new daily reality — what changed?
   - Present metrics prominently as the proof of transformation
   - Customer quote about the new reality

4. BRIDGE (1-2 paragraphs):
   - How they got from Before to After
   - The solution, implementation, and key decisions
   - Timeline of the transformation
   - What made this solution the right choice

5. KEY RESULTS (callout section):
   - All metrics in a visually prominent format
   - Before vs. After comparison where possible`;

    case 'executive-summary':
      return `EXECUTIVE SUMMARY STYLE STRUCTURE:

1. TITLE: "[Customer] Case Study: [Key Result Headline]"

2. EXECUTIVE SUMMARY (3-4 sentences):
   - The entire story in one paragraph
   - Customer, problem, solution, and headline result
   - Written for C-suite executives who may only read this section

3. COMPANY BACKGROUND:
   - Customer profile: name, industry, size, market position
   - Relevant context about their business

4. BUSINESS CHALLENGE:
   - Detailed description of the problem
   - Business impact quantified
   - Why existing approaches were insufficient

5. SOLUTION OVERVIEW:
   - What was provided and how it addresses the challenge
   - Key capabilities and differentiators
   - Integration with existing systems/processes

6. IMPLEMENTATION:
   - Timeline and phases
   - Key milestones
   - Team and stakeholder involvement

7. RESULTS & ROI:
   - All metrics prominently displayed
   - ROI calculation if data supports it
   - Comparison metrics (before/after)
   - Secondary and unexpected benefits

8. CUSTOMER TESTIMONIAL:
   - Full customer quote as a dedicated section
   - Attribution with name and title

9. CONCLUSION:
   - Future plans and expanded usage
   - CTA or next steps`;

    default:
      return '';
  }
}

/**
 * Get format-specific prompt instructions
 */
function getFormatInstructions(
  format: string,
  includeLogos: boolean,
  includeCharts: boolean
): string {
  const logoText = includeLogos
    ? '\n- Include placeholder text like "[COMPANY LOGO]" and "[CUSTOMER LOGO]" where logos should appear.'
    : '';
  const chartText = includeCharts
    ? '\n- Include placeholder text like "[CHART: Before vs. After Metrics]" or "[GRAPH: ROI Over Time]" where visual data should appear.'
    : '';

  switch (format) {
    case 'one-page':
      return `ONE-PAGE FORMAT (500-700 words):
- Keep total word count between 500-700 words.
- Scannable layout: heavy use of bullets, short paragraphs.
- Metrics in a prominent callout section using <strong> tags.
- Customer quote as a pull quote with attribution.
- Every section should be 2-4 sentences or bullet-based.
- Optimized for a single-page PDF or print handout.
- End with a brief CTA.${logoText}${chartText}`;

    case 'detailed':
      return `DETAILED FORMAT (1,000-1,500 words):
- Target word count: 1,000-1,500 words.
- Full narrative with proper paragraph structure.
- Detailed context, implementation description, and results analysis.
- Multiple customer quotes if provided.
- Include section transitions that maintain narrative flow.
- Optimized for web pages or multi-page documents.
- Include a CTA section at the end.${logoText}${chartText}`;

    case 'slide-deck':
      return `SLIDE DECK FORMAT (6-8 slides):
- Output as a structured slide outline, NOT a narrative.
- Each slide should have:
  * Slide title as <h2>
  * 3-5 bullet points of content (minimal text per slide)
  * Speaker notes in an <em> block below the bullets
- Slide sequence:
  1. Title Slide: Case study title, customer name, customer logo placeholder
  2. Customer Profile: Company background, industry, size
  3. The Challenge: Key pain points, impact metrics
  4. The Solution: What was implemented, key features
  5. The Results: BIG NUMBERS prominently displayed, 2-3 key metrics
  6. Customer Quote: Full testimonial as the centerpiece
  7. Additional Benefits: Secondary outcomes, future plans
  8. CTA Slide: Next steps, contact info placeholder
- Results slide should feature metrics in large, prominent formatting.
- Minimal text per slide — this is for presentation, not reading.${logoText}${chartText}`;

    default:
      return '';
  }
}

/**
 * Get tone-specific prompt instructions
 */
function getToneInstructions(tone: string): string {
  switch (tone) {
    case 'Professional':
      return `PROFESSIONAL TONE:
- Corporate, formal, data-driven language
- No contractions, no casual language
- Lead with facts and metrics
- Measured, authoritative voice
- Suitable for enterprise audiences and formal proposals`;

    case 'Conversational':
      return `CONVERSATIONAL TONE:
- Approachable, storytelling-driven language
- Use contractions naturally (they're, wasn't, couldn't)
- Engaging narrative that reads like a story, not a report
- Reader should feel connected to the customer's journey
- Suitable for website content and marketing collateral`;

    case 'Technical':
      return `TECHNICAL TONE:
- Detailed, implementation-focused, specification-heavy language
- Include technical details about integration, architecture, process
- Use industry-specific terminology appropriate to the customer's sector
- Data and methodology emphasis
- Suitable for technical decision-makers and engineering teams`;

    default:
      return '';
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Form field wrapper with label, required indicator, and helper text
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
 * Copy-to-clipboard button for a section of the case study
 */
function CopyButton({
  sectionId,
  copiedSection,
  onCopy,
}: {
  sectionId: string;
  copiedSection: CopiedSection;
  onCopy: (sectionId: string) => void;
}) {
  const isCopied = copiedSection === sectionId;

  return (
    <button
      onClick={() => onCopy(sectionId)}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
        isCopied
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
      title={isCopied ? 'Copied!' : 'Copy section to clipboard'}
    >
      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {isCopied ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * Summary row in the review — shows label and value
 */
function SummaryRow({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  if (!value || !value.trim()) return null;
  const displayValue = truncate && value.length > 120 ? value.slice(0, 120) + '...' : value;

  return (
    <div className="flex gap-3">
      <span className="text-gray-500 font-medium flex-shrink-0 w-28 text-right text-xs pt-0.5">
        {label}:
      </span>
      <span className="text-gray-900 text-xs leading-relaxed whitespace-pre-line">
        {displayValue}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// UNIQUE ID GENERATOR
// ═══════════════════════════════════════════════════════════

/** Generate a simple unique ID for metric entries */
let metricCounter = 0;
function generateMetricId(): string {
  metricCounter += 1;
  return `metric-${Date.now()}-${metricCounter}`;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function CaseStudyTemplate({
  onClose,
  editor,
  activeProject,
}: CaseStudyTemplateProps) {
  const activeDocumentId = useWorkspaceStore((state) => state.activeDocumentId);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);

  // ─── Form data ───
  const [formData, setFormData] = useState<CaseStudyFormData>({
    structure: 'psr',
    format: 'one-page',
    customerName: '',
    customerIndustry: '',
    customerRole: '',
    problem: '',
    solution: '',
    metrics: [
      { id: generateMetricId(), value: '' },
      { id: generateMetricId(), value: '' },
      { id: generateMetricId(), value: '' },
    ],
    customerCompanySize: '',
    implementationDetails: '',
    customerQuote: '',
    timeline: '',
    companyBackground: '',
    secondaryBenefits: '',
    futurePlans: '',
    additionalQuotes: '',
    tone: 'Professional',
    includeLogoPlaceholders: false,
    includeChartPlaceholders: false,
  });

  // ─── UI state ───
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [applyBrandVoice, setApplyBrandVoice] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // ─── Generation state ───
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // ─── Clipboard state ───
  const [copiedSection, setCopiedSection] = useState<CopiedSection>(null);

  const hasBrandVoice = Boolean(activeProject?.brandVoice?.brandName);

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
        logger.error('❌ Failed to load personas:', error);
        setPersonas([]);
      }
    };
    loadPersonas();
  }, [activeProject]);

  // ─── Clear copied indicator after 2 seconds ───
  useEffect(() => {
    if (!copiedSection) return;
    const timer = setTimeout(() => setCopiedSection(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedSection]);

  // ─── Form field updater ───
  const updateField = useCallback(
    <K extends keyof CaseStudyFormData>(field: K, value: CaseStudyFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setGenerationError(null);
      setValidationWarnings([]);
    },
    []
  );

  // ─── Metric management ───
  const updateMetric = useCallback((id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metrics: prev.metrics.map((m) => (m.id === id ? { ...m, value } : m)),
    }));
    setGenerationError(null);
    setValidationWarnings([]);
  }, []);

  const addMetric = useCallback(() => {
    setFormData((prev) => {
      if (prev.metrics.length >= MAX_METRICS) return prev;
      return {
        ...prev,
        metrics: [...prev.metrics, { id: generateMetricId(), value: '' }],
      };
    });
  }, []);

  const removeMetric = useCallback((id: string) => {
    setFormData((prev) => {
      if (prev.metrics.length <= MIN_METRICS) return prev;
      return {
        ...prev,
        metrics: prev.metrics.filter((m) => m.id !== id),
      };
    });
  }, []);

  // ─── Validation ───
  const validate = useCallback((): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!formData.customerName.trim()) errors.push('Customer/Company Name is required.');
    if (!formData.customerIndustry.trim()) errors.push('Customer Industry is required.');
    if (!formData.customerRole.trim()) errors.push('Customer Title/Role is required.');
    if (!formData.problem.trim()) errors.push('Problem/Challenge description is required.');
    if (!formData.solution.trim()) errors.push('Solution description is required.');

    const filledMetrics = formData.metrics.filter((m) => m.value.trim());
    if (filledMetrics.length === 0) {
      errors.push('Case studies need specific metrics. Add at least one measurable result.');
    }

    if (!formData.customerQuote.trim()) {
      warnings.push('Customer quotes add credibility. Consider adding one.');
    }

    if (!formData.customerCompanySize.trim()) {
      warnings.push('Specific company details make case studies more believable.');
    }

    return { valid: errors.length === 0, errors, warnings };
  }, [formData]);

  // ─── Generate the case study ───
  const handleGenerate = useCallback(async () => {
    if (!editor || !activeProject) return;

    const { valid, errors, warnings } = validate();
    setValidationWarnings(warnings);

    if (!valid) {
      setGenerationError(errors.join(' '));
      return;
    }

    // Auto-create document if none open
    let targetDocumentId = activeDocumentId;
    if (!targetDocumentId && activeProjectId) {
      try {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const title = `Case Study - ${formData.customerName} - ${dateStr}`;
        const newDoc = await createDocument(activeProjectId, title);
        targetDocumentId = newDoc.id;
        useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);
        logger.log('📄 Auto-created document for Case Study:', newDoc.id);
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (createError) {
        logger.error('❌ Failed to create document:', createError);
        setGenerationError('Failed to create document. Please try again.');
        return;
      }
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedHTML(null);

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
Write specifically for this persona's context and use language that resonates with them.`;
      }

      // Build the prompt
      const systemPrompt = buildCaseStudySystemPrompt(
        formData,
        brandVoiceInstructions,
        personaInstructions
      );

      logger.log('📋 Generating Case Study for:', formData.customerName);

      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'case-study',
          formData: {
            ...formData,
            metrics: JSON.stringify(formData.metrics),
            _systemPromptOverride: systemPrompt,
          },
          applyBrandVoice,
          brandVoice: applyBrandVoice ? activeProject.brandVoice : undefined,
          persona: selectedPersona,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to generate case study');
      }

      const data = await response.json();
      const rawHTML = data.generatedCopy;
      const formatted = formatGeneratedContent(rawHTML);

      logger.log('✅ Case Study generated, length:', formatted.length);

      // Store for structured display
      setGeneratedHTML(formatted);

      // Insert into TipTap editor
      editor.commands.setContent(formatted);

      // Persist to document storage
      if (activeProjectId && targetDocumentId) {
        try {
          updateDocumentInStorage(activeProjectId, targetDocumentId, {
            content: formatted,
          });
          logger.log('💾 Case Study document saved');
        } catch (storageError) {
          logger.error('⚠️ Failed to save Case Study document:', storageError);
        }
      }
    } catch (error) {
      logger.error('❌ Case Study generation error:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate case study'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    editor,
    activeProject,
    activeDocumentId,
    activeProjectId,
    formData,
    applyBrandVoice,
    selectedPersonaId,
    personas,
    validate,
  ]);

  // ─── Copy section to clipboard ───
  const handleCopySection = useCallback(
    (sectionId: string) => {
      if (!generatedHTML) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(generatedHTML, 'text/html');
      const headings = doc.querySelectorAll('h2');

      let sectionText = '';
      headings.forEach((heading) => {
        const normalizedId = heading.textContent
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || '';
        if (normalizedId.includes(sectionId)) {
          const elements: string[] = [heading.textContent || ''];
          let sibling = heading.nextElementSibling;
          while (sibling && sibling.tagName !== 'H2') {
            elements.push(sibling.textContent || '');
            sibling = sibling.nextElementSibling;
          }
          sectionText = elements.join('\n');
        }
      });

      if (!sectionText) {
        const bodyText = doc.body.textContent || '';
        sectionText = bodyText;
      }

      navigator.clipboard
        .writeText(sectionText.trim())
        .then(() => setCopiedSection(sectionId))
        .catch((err) => logger.error('❌ Clipboard error:', err));
    },
    [generatedHTML]
  );

  // ─── Copy full case study to clipboard ───
  const handleCopyFullCaseStudy = useCallback(() => {
    if (!generatedHTML) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(generatedHTML, 'text/html');
    const fullText = doc.body.textContent || '';
    navigator.clipboard
      .writeText(fullText.trim())
      .then(() => setCopiedSection('full'))
      .catch((err) => logger.error('❌ Clipboard error:', err));
  }, [generatedHTML]);

  // ─── Start over ───
  const handleStartOver = useCallback(() => {
    setGeneratedHTML(null);
    setGenerationError(null);
    setValidationWarnings([]);
  }, []);

  // ─── Close handler ───
  const handleClose = useCallback(() => {
    useWorkspaceStore.getState().setSelectedTemplateId(null);
    onClose();
  }, [onClose]);

  // ═══════════════════════════════════════════════════════════
  // SHARED INPUT CLASSES
  // ═══════════════════════════════════════════════════════════

  const inputClasses = cn(
    'w-full px-3 py-2 rounded-lg border border-gray-300 transition-all duration-200',
    'text-sm text-gray-900 bg-white',
    'hover:border-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:ring-offset-1',
    'disabled:bg-gray-50 disabled:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: STRUCTURE & FORMAT SELECTORS
  // ═══════════════════════════════════════════════════════════

  const renderSelectors = () => (
    <div className="space-y-5">
      {/* Structure selector */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Structure
        </label>
        <div className="space-y-2">
          {STRUCTURE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                formData.structure === option.id
                  ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <input
                type="radio"
                name="structure"
                value={option.id}
                checked={formData.structure === option.id}
                onChange={() => updateField('structure', option.id)}
                disabled={isGenerating}
                className="mt-1 h-4 w-4 text-amber-500 focus:ring-amber-400 border-gray-300"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.fullLabel}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
                <p className="text-xs text-amber-700 mt-0.5">Best for: {option.bestFor}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Format selector */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateField('format', option.id)}
              disabled={isGenerating}
              className={cn(
                'flex flex-col items-center p-3 rounded-lg border text-center transition-all',
                formData.format === option.id
                  ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="text-sm font-semibold text-gray-900">{option.label}</span>
              <span className="text-xs text-gray-500 mt-0.5">{option.wordCount}</span>
              <span className="text-[10px] text-gray-400 mt-1 leading-tight">{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: REQUIRED FIELDS
  // ═══════════════════════════════════════════════════════════

  const renderRequiredFields = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center gap-2">
        <span>Customer Details</span>
      </h3>

      <FormField
        label="Customer/Company Name"
        required
        helperText="The company featured in this case study"
      >
        <input
          type="text"
          value={formData.customerName}
          onChange={(e) => updateField('customerName', e.target.value)}
          placeholder="e.g., TechCorp Solutions"
          className={inputClasses}
          disabled={isGenerating}
          maxLength={100}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Customer Industry" required>
          <input
            type="text"
            value={formData.customerIndustry}
            onChange={(e) => updateField('customerIndustry', e.target.value)}
            placeholder="e.g., B2B SaaS"
            className={inputClasses}
            disabled={isGenerating}
            maxLength={100}
          />
        </FormField>

        <FormField label="Company Size" helperText="Optional">
          <input
            type="text"
            value={formData.customerCompanySize}
            onChange={(e) => updateField('customerCompanySize', e.target.value)}
            placeholder="e.g., 250 employees"
            className={inputClasses}
            disabled={isGenerating}
            maxLength={100}
          />
        </FormField>
      </div>

      <FormField
        label="Customer Title/Role"
        required
        helperText="Person quoted in the case study (for testimonial attribution)"
      >
        <input
          type="text"
          value={formData.customerRole}
          onChange={(e) => updateField('customerRole', e.target.value)}
          placeholder="e.g., Sarah Chen, VP of Sales"
          className={inputClasses}
          disabled={isGenerating}
          maxLength={150}
        />
      </FormField>

      <FormField
        label="Problem/Challenge"
        required
        helperText="What problem did the customer face? Be specific with numbers if possible (100-200 words)."
      >
        <AutoExpandTextarea
          value={formData.problem}
          onChange={(e) => updateField('problem', e.target.value)}
          placeholder="e.g., TechCorp's sales team was struggling with manual follow-up processes. Sales reps spent 4+ hours daily on administrative tasks. 67% of leads went uncontacted for 48+ hours..."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={100}
          maxHeight={200}
          maxLength={1000}
        />
      </FormField>

      <FormField
        label="Your Solution/Product"
        required
        helperText="What did you provide? Focus on what was implemented, not marketing language."
      >
        <AutoExpandTextarea
          value={formData.solution}
          onChange={(e) => updateField('solution', e.target.value)}
          placeholder="e.g., Implemented SalesFlow's automated follow-up system that integrated with existing CRM, automated instant lead response emails, multi-touch follow-up sequences, and real-time pipeline analytics..."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={80}
          maxHeight={160}
          maxLength={800}
        />
      </FormField>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: METRICS SECTION
  // ═══════════════════════════════════════════════════════════

  const renderMetrics = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Key Results / Metrics
        </h3>
        {formData.metrics.length < MAX_METRICS && (
          <button
            type="button"
            onClick={addMetric}
            disabled={isGenerating}
            className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Metric
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md">
        <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Case studies need specific numbers, not vague claims. Include measurable results like
          &quot;50% increase in sales&quot; or &quot;$2M additional revenue&quot; or &quot;3 months to ROI.&quot;
        </p>
      </div>

      <div className="space-y-2">
        {formData.metrics.map((metric, index) => (
          <div key={metric.id} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">
              {index + 1}.
            </span>
            <input
              type="text"
              value={metric.value}
              onChange={(e) => updateMetric(metric.id, e.target.value)}
              placeholder={
                index === 0
                  ? 'e.g., 150% increase in qualified pipeline'
                  : index === 1
                    ? 'e.g., $2.1M in additional pipeline value'
                    : 'e.g., 3 months to full ROI'
              }
              className={cn(inputClasses, 'flex-1')}
              disabled={isGenerating}
              maxLength={200}
            />
            {formData.metrics.length > MIN_METRICS && (
              <button
                type="button"
                onClick={() => removeMetric(metric.id)}
                disabled={isGenerating}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title="Remove metric"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: QUOTE & TIMELINE
  // ═══════════════════════════════════════════════════════════

  const renderQuoteAndTimeline = () => (
    <div className="space-y-4">
      <FormField
        label="Customer Quote"
        helperText="Direct quote from the customer. Will be used VERBATIM — not paraphrased."
      >
        <AutoExpandTextarea
          value={formData.customerQuote}
          onChange={(e) => updateField('customerQuote', e.target.value)}
          placeholder='e.g., "SalesFlow gave us back our time. Our reps are actually selling again instead of updating spreadsheets. The ROI was clear within the first month."'
          className={inputClasses}
          disabled={isGenerating}
          minHeight={60}
          maxHeight={120}
          maxLength={500}
        />
        {formData.customerQuote && (
          <p className="text-xs text-gray-400 mt-1">
            {formData.customerQuote.length}/500 characters
          </p>
        )}
      </FormField>

      <FormField
        label="Timeline"
        helperText="How long did implementation and results take? (optional)"
      >
        <input
          type="text"
          value={formData.timeline}
          onChange={(e) => updateField('timeline', e.target.value)}
          placeholder="e.g., 2 weeks implementation, results within 90 days"
          className={inputClasses}
          disabled={isGenerating}
          maxLength={200}
        />
      </FormField>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: OPTIONAL FIELDS (COLLAPSED)
  // ═══════════════════════════════════════════════════════════

  const renderOptionalFields = () => (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setShowOptionalFields(!showOptionalFields)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors w-full"
      >
        {showOptionalFields ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        Optional Details
        <span className="text-xs text-gray-400 font-normal">(adds depth to the case study)</span>
      </button>

      {showOptionalFields && (
        <div className="space-y-4 pl-1 border-l-2 border-gray-100 ml-2">
          <div className="pl-3 space-y-4">
            <FormField
              label="Implementation Details"
              helperText="Specifics about the implementation process (for Detailed format or STAR structure)"
            >
              <AutoExpandTextarea
                value={formData.implementationDetails}
                onChange={(e) => updateField('implementationDetails', e.target.value)}
                placeholder="e.g., Implementation took 2 weeks. Integrated with existing Salesforce CRM. Full team adoption by week 3..."
                className={inputClasses}
                disabled={isGenerating}
                minHeight={60}
                maxHeight={120}
                maxLength={600}
              />
            </FormField>

            <FormField
              label="Company Background"
              helperText="Additional context about the customer's business"
            >
              <AutoExpandTextarea
                value={formData.companyBackground}
                onChange={(e) => updateField('companyBackground', e.target.value)}
                placeholder="e.g., TechCorp is a 250-person B2B SaaS company serving mid-market enterprises, founded in 2018..."
                className={inputClasses}
                disabled={isGenerating}
                minHeight={60}
                maxHeight={120}
                maxLength={400}
              />
            </FormField>

            <FormField
              label="Secondary Benefits"
              helperText="Other benefits achieved beyond the primary metrics"
            >
              <AutoExpandTextarea
                value={formData.secondaryBenefits}
                onChange={(e) => updateField('secondaryBenefits', e.target.value)}
                placeholder="e.g., Sales cycle shortened from 45 to 28 days. Team satisfaction increased 67%. Leadership gained real-time pipeline visibility..."
                className={inputClasses}
                disabled={isGenerating}
                minHeight={60}
                maxHeight={120}
                maxLength={400}
              />
            </FormField>

            <FormField
              label="Future Plans"
              helperText="Ongoing relationship or expanded usage"
            >
              <AutoExpandTextarea
                value={formData.futurePlans}
                onChange={(e) => updateField('futurePlans', e.target.value)}
                placeholder="e.g., TechCorp plans to expand usage to their customer success team for automated onboarding sequences..."
                className={inputClasses}
                disabled={isGenerating}
                minHeight={60}
                maxHeight={100}
                maxLength={300}
              />
            </FormField>

            <FormField
              label="Additional Stakeholder Quotes"
              helperText="Quotes from other people involved (one per line)"
            >
              <AutoExpandTextarea
                value={formData.additionalQuotes}
                onChange={(e) => updateField('additionalQuotes', e.target.value)}
                placeholder='e.g., "The onboarding was seamless. Our team was productive within days." — Mike Johnson, Sales Director'
                className={inputClasses}
                disabled={isGenerating}
                minHeight={60}
                maxHeight={120}
                maxLength={500}
              />
            </FormField>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: SETTINGS
  // ═══════════════════════════════════════════════════════════

  const renderSettings = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Settings
      </h3>

      {/* Tone selector */}
      <FormField label="Tone" required helperText="How should the case study read?">
        <select
          value={formData.tone}
          onChange={(e) => updateField('tone', e.target.value as CaseStudyFormData['tone'])}
          className={inputClasses}
          disabled={isGenerating}
        >
          {TONE_OPTIONS.map((tone) => (
            <option key={tone} value={tone}>
              {tone}
            </option>
          ))}
        </select>
      </FormField>

      {/* Placeholder toggles */}
      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.includeLogoPlaceholders}
            onChange={(e) => updateField('includeLogoPlaceholders', e.target.checked)}
            disabled={isGenerating}
            className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            Include logo placeholders
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.includeChartPlaceholders}
            onChange={(e) => updateField('includeChartPlaceholders', e.target.checked)}
            disabled={isGenerating}
            className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            Include chart/graph placeholders
          </span>
        </label>
      </div>

      {/* Brand Voice toggle */}
      {hasBrandVoice && (
        <div className="p-3 border border-gray-200 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={applyBrandVoice}
              onChange={(e) => setApplyBrandVoice(e.target.checked)}
              disabled={isGenerating}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 group-hover:text-amber-600 transition-colors">
                Apply Brand Voice
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Infuse {activeProject?.brandVoice?.brandName}&apos;s brand guidelines
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Persona selector */}
      {personas.length > 0 && (
        <FormField label="Target Persona" helperText="Optional — tailor language for a specific audience">
          <select
            value={selectedPersonaId || ''}
            onChange={(e) => setSelectedPersonaId(e.target.value || null)}
            disabled={isGenerating}
            className={inputClasses}
          >
            <option value="">No specific persona</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name}
              </option>
            ))}
          </select>
        </FormField>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: VALIDATION WARNINGS
  // ═══════════════════════════════════════════════════════════

  const renderWarnings = () => {
    if (validationWarnings.length === 0) return null;
    return (
      <div className="space-y-1.5">
        {validationWarnings.map((warning, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md"
          >
            <Info className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">{warning}</p>
          </div>
        ))}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER: GENERATED OUTPUT
  // ═══════════════════════════════════════════════════════════

  /** Determine section labels based on chosen structure */
  const getOutputSections = (): { id: string; label: string }[] => {
    switch (formData.structure) {
      case 'psr':
        return [
          { id: 'client', label: 'Client Profile' },
          { id: 'challenge', label: 'The Challenge' },
          { id: 'solution', label: 'The Solution' },
          { id: 'result', label: 'The Results' },
          { id: 'impact', label: 'The Impact' },
        ];
      case 'star':
        return [
          { id: 'situation', label: 'Situation' },
          { id: 'task', label: 'Task' },
          { id: 'action', label: 'Action' },
          { id: 'result', label: 'Result' },
        ];
      case 'before-after-bridge':
        return [
          { id: 'before', label: 'Before' },
          { id: 'after', label: 'After' },
          { id: 'bridge', label: 'Bridge' },
          { id: 'result', label: 'Key Results' },
        ];
      case 'executive-summary':
        return [
          { id: 'executive', label: 'Executive Summary' },
          { id: 'background', label: 'Company Background' },
          { id: 'challenge', label: 'Business Challenge' },
          { id: 'solution', label: 'Solution Overview' },
          { id: 'implementation', label: 'Implementation' },
          { id: 'result', label: 'Results & ROI' },
          { id: 'testimonial', label: 'Customer Testimonial' },
        ];
      default:
        return [];
    }
  };

  const renderOutput = () => (
    <div className="space-y-4">
      {/* Success header */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">
              Case Study Generated
            </p>
            <p className="text-xs text-green-700 mt-1">
              Your case study is in the editor. Use the buttons below to copy sections or the full document.
            </p>
          </div>
        </div>
      </div>

      {/* Structure & format summary */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="px-2 py-0.5 bg-gray-100 rounded font-medium">
          {STRUCTURE_OPTIONS.find((s) => s.id === formData.structure)?.label}
        </span>
        <span>·</span>
        <span className="px-2 py-0.5 bg-gray-100 rounded font-medium">
          {FORMAT_OPTIONS.find((f) => f.id === formData.format)?.label}
        </span>
        <span>·</span>
        <span className="px-2 py-0.5 bg-gray-100 rounded font-medium">{formData.tone}</span>
      </div>

      {/* Section copy buttons */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Copy Sections
        </p>
        <div className="grid grid-cols-1 gap-2">
          {getOutputSections().map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-900">{section.label}</span>
              <CopyButton
                sectionId={section.id}
                copiedSection={copiedSection}
                onCopy={handleCopySection}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Copy full case study */}
      <button
        onClick={handleCopyFullCaseStudy}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
          copiedSection === 'full'
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
        )}
      >
        {copiedSection === 'full' ? (
          <>
            <Check className="w-4 h-4" />
            Full Case Study Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy Full Case Study
          </>
        )}
      </button>

      {/* Start over */}
      <button
        onClick={handleStartOver}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Start Over
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-t-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{TEMPLATE_META.name}</h2>
              <p className="text-sm text-amber-100 mt-0.5">{TEMPLATE_META.description}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close"
            title="Close template"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta info */}
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

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {generatedHTML ? (
          renderOutput()
        ) : (
          <div className="space-y-6">
            {/* Error display */}
            {generationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{generationError}</p>
              </div>
            )}

            {/* Validation warnings */}
            {renderWarnings()}

            {/* Structure & Format */}
            {renderSelectors()}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Required fields */}
            {renderRequiredFields()}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Metrics */}
            {renderMetrics()}

            {/* Quote & Timeline */}
            {renderQuoteAndTimeline()}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Optional fields (collapsible) */}
            {renderOptionalFields()}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Settings */}
            {renderSettings()}
          </div>
        )}
      </div>

      {/* Footer with action buttons */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {generatedHTML ? (
          <button
            onClick={handleClose}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white',
              'bg-green-500 hover:bg-green-600 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
              'flex items-center justify-center gap-2'
            )}
          >
            <CheckCircle className="w-4 h-4" />
            Done — Edit in Document
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !editor || !activeProject}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white',
              'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
              'flex items-center justify-center gap-2',
              isGenerating && 'aiworx-gradient-animated cursor-wait',
              !isGenerating && 'bg-amber-500 hover:bg-amber-600 transition-colors',
              (!editor || !activeProject) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center gap-1">
                <AIWorxButtonLoader />
                <span className="text-xs">Generating case study...</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Case Study
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
