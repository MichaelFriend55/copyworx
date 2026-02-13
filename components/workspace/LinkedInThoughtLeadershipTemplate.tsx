/**
 * @file components/workspace/LinkedInThoughtLeadershipTemplate.tsx
 * @description LinkedIn Thought Leadership Post template for CopyWorx Studio
 *
 * Generates high-engagement LinkedIn posts that build professional credibility.
 * Supports five structure types optimized for LinkedIn's algorithm and UX:
 *
 * Structures:
 *   1. Story-Based — Personal experience → insight → application (most popular)
 *   2. Contrarian Take — Challenge conventional wisdom with evidence
 *   3. Lesson Learned — Mistake/failure → lesson → practical advice
 *   4. Framework/System — Results → step-by-step system → engagement
 *   5. Observation + Insight — Pattern noticed → implications → takeaway
 *
 * Features:
 *   - Structure selector with descriptions and best-use guidance
 *   - Hook preview (first 210 characters — LinkedIn "see more" cutoff)
 *   - Real-time character counter with color-coded thresholds
 *   - Quality validation (hook length, line breaks, engagement question)
 *   - LinkedIn-optimized formatting (short paragraphs, scannable rhythm)
 *   - Copy to clipboard with formatting preserved
 *   - Brand voice and persona integration
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Lightbulb,
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
  Eye,
  AlertTriangle,
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
  name: 'LinkedIn Thought Leadership Post',
  description:
    'High-engagement LinkedIn posts that build professional credibility and attract opportunities.',
  complexity: 'Beginner' as const,
  estimatedTime: '5-10 min',
};

/** LinkedIn "see more" cutoff in characters */
const HOOK_CHAR_LIMIT = 210;

/** Character target thresholds */
const CHAR_TARGETS = {
  short: { label: '~1,200', value: 1200 },
  medium: { label: '~1,500', value: 1500 },
  long: { label: '~1,800', value: 1800 },
} as const;

/** Structure options with descriptions */
const STRUCTURE_OPTIONS = [
  {
    id: 'story-based',
    label: 'Story-Based',
    description: 'Personal experience or observation leading to an insight and practical application.',
    bestFor: 'Highest engagement — most popular LinkedIn format',
    example: '"I lost a $50K client because I sent a proposal on Friday afternoon..."',
  },
  {
    id: 'contrarian-take',
    label: 'Contrarian Take',
    description: 'Challenge conventional wisdom with your unique perspective and better approach.',
    bestFor: 'Sparking debate and driving comments',
    example: '"Hot take: Your LinkedIn posts aren\'t authentic. They\'re performative vulnerability..."',
  },
  {
    id: 'lesson-learned',
    label: 'Lesson Learned',
    description: 'A mistake or failure, what you learned from it, and how others can avoid it.',
    bestFor: 'Building trust through vulnerability',
    example: '"My biggest hiring mistake cost us 6 months and $200K..."',
  },
  {
    id: 'framework-system',
    label: 'Framework / System',
    description: 'Share a 3-5 step system or framework that produces results, with evidence.',
    bestFor: 'Establishing expertise and getting saves/shares',
    example: '"3 years ago, my sales emails got 2% response rates. Last month: 47%..."',
  },
  {
    id: 'observation-insight',
    label: 'Observation + Insight',
    description: 'A pattern or trend you noticed, why it matters, and what to do about it.',
    bestFor: 'Demonstrating industry awareness and foresight',
    example: '"I\'ve interviewed 200+ marketers this year. One pattern keeps emerging..."',
  },
] as const;

/** Tone options suited for LinkedIn thought leadership */
const TONE_OPTIONS = [
  { id: 'conversational', label: 'Conversational', description: 'Friendly and approachable — like talking to a smart colleague' },
  { id: 'vulnerable', label: 'Vulnerable & Honest', description: 'Raw, real, and self-aware — sharing failures openly' },
  { id: 'bold', label: 'Bold & Confident', description: 'Direct, opinionated, and unapologetic' },
  { id: 'professional', label: 'Professional', description: 'Credible and measured — data meets insight' },
] as const;

/** Hook style options */
const HOOK_STYLE_OPTIONS = [
  { id: 'bold-statement', label: 'Bold Statement', example: '"Nobody tells you this about leadership..."' },
  { id: 'question', label: 'Question', example: '"What if everything you learned about sales is wrong?"' },
  { id: 'story-opening', label: 'Story Opening', example: '"I lost a $50K client last Tuesday..."' },
  { id: 'number-statistic', label: 'Number / Statistic', example: '"3 years ago: 2% response rate. Last month: 47%."' },
] as const;

/** Character target options */
const CHAR_TARGET_OPTIONS = [
  { id: 'short', label: '~1,200 chars', description: 'Punchy and focused' },
  { id: 'medium', label: '~1,500 chars', description: 'Optimal engagement' },
  { id: 'long', label: '~1,800 chars', description: 'Deep-dive content' },
] as const;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface LinkedInThoughtLeadershipTemplateProps {
  /** Callback when template should close */
  onClose: () => void;
  /** TipTap editor instance */
  editor: Editor | null;
  /** Active project for brand voice and personas */
  activeProject: Project | null;
}

/** Form data shape */
interface LinkedInFormData {
  structure: typeof STRUCTURE_OPTIONS[number]['id'];
  topic: string;
  personalContext: string;
  keyInsight: string;
  practicalTakeaway: string;
  authorRole: string;
  targetAudience: string;
  tone: typeof TONE_OPTIONS[number]['id'];
  hookStyle: typeof HOOK_STYLE_OPTIONS[number]['id'];
  charTarget: typeof CHAR_TARGET_OPTIONS[number]['id'];
  includeEmojis: boolean;
  includeHashtags: boolean;
  // Conditional fields
  frameworkName: string;
  contrarianBelief: string;
  specificMetrics: string;
}

/** Quality check result */
interface QualityCheck {
  label: string;
  passed: boolean;
  message: string;
}

// ═══════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build the Claude system prompt for LinkedIn thought leadership post generation.
 * Assembles prompt based on chosen structure, tone, and user inputs.
 */
function buildLinkedInSystemPrompt(
  formData: LinkedInFormData,
  brandVoiceInstructions: string,
  personaInstructions: string
): string {
  const structureLabel =
    STRUCTURE_OPTIONS.find((s) => s.id === formData.structure)?.label || formData.structure;
  const toneLabel =
    TONE_OPTIONS.find((t) => t.id === formData.tone)?.label || formData.tone;
  const hookStyleLabel =
    HOOK_STYLE_OPTIONS.find((h) => h.id === formData.hookStyle)?.label || formData.hookStyle;
  const charTargetValue =
    CHAR_TARGETS[formData.charTarget as keyof typeof CHAR_TARGETS]?.value || 1500;

  return `You are a LinkedIn thought leadership ghostwriter who has helped executives and professionals build massive followings. You understand the LinkedIn algorithm, the "see more" cutoff, and what makes posts go viral in 2026. You write personal, insightful, story-driven content — never corporate, never generic.

Generate a LinkedIn thought leadership post based on these inputs:

STRUCTURE: ${structureLabel}
TONE: ${toneLabel}
HOOK STYLE: ${hookStyleLabel}
CHARACTER TARGET: ~${charTargetValue} characters (excluding hashtags)

AUTHOR CONTEXT:
Role/Expertise: ${formData.authorRole}
Target Audience: ${formData.targetAudience}

CONTENT:
Topic/Theme: ${formData.topic}
Personal Story/Experience/Observation: ${formData.personalContext}
Key Insight/Lesson: ${formData.keyInsight}
Practical Takeaway: ${formData.practicalTakeaway}
${formData.specificMetrics ? `Specific Results/Metrics: ${formData.specificMetrics}` : ''}
${formData.frameworkName ? `Framework/System Name: ${formData.frameworkName}` : ''}
${formData.contrarianBelief ? `Contrarian Belief to Challenge: ${formData.contrarianBelief}` : ''}

SETTINGS:
Include Emojis: ${formData.includeEmojis ? 'Yes (1-2 maximum, strategic placement only, NEVER in the hook)' : 'No'}
Include Hashtags: ${formData.includeHashtags ? 'Yes (3-5 hashtags at the end, mix popular and niche)' : 'No'}

${brandVoiceInstructions}
${personaInstructions}

═══════════════════════════════════════════════════
STRUCTURE-SPECIFIC INSTRUCTIONS
═══════════════════════════════════════════════════

${getStructureInstructions(formData.structure)}

═══════════════════════════════════════════════════
LINKEDIN FORMATTING RULES — CRITICAL
═══════════════════════════════════════════════════

1. HOOK (First 210 characters):
   - First sentence: 8-12 words MAXIMUM
   - Must create curiosity, tension, or pattern interrupt
   - Match the specified hook style (${hookStyleLabel})
   - NO generic openings ("I've been thinking about...", "In today's world...")
   - The hook determines whether 95% of people read the rest

2. LINE BREAKS:
   - 1-2 sentences per paragraph MAXIMUM
   - Blank line between EVERY paragraph
   - Never more than 3 lines without a break
   - Creates the scannable visual rhythm LinkedIn rewards

3. PARAGRAPH LENGTH:
   - Short paragraphs (1-2 sentences each)
   - Vary length for rhythm: short punch. Then a slightly longer line.
   - Some single-sentence paragraphs for emphasis

4. ENGAGEMENT:
   - MUST end with a question that invites genuine conversation
   - The question should be specific, not generic ("What's your experience?" is weak)
   - Make it easy to respond ("Which of these resonates?" or "What's your worst example?")

5. CHARACTER COUNT:
   - Target ~${charTargetValue} characters total (excluding hashtags)
   - Stay within ±100 characters of target
   - Optimal LinkedIn engagement range: 1,200-1,500 characters

6. VOICE:
   - Write in FIRST PERSON ("I", not "we" or "companies")
   - Personal, not corporate
   - Conversational, not formal
   - Specific, not generic (real examples, real numbers, real situations)
   - Match the specified tone: ${toneLabel}

═══════════════════════════════════════════════════
TONE GUIDANCE
═══════════════════════════════════════════════════

${getToneInstructions(formData.tone)}

═══════════════════════════════════════════════════
CRITICAL QUALITY RULES — NO EXCEPTIONS
═══════════════════════════════════════════════════

MUST DO:
- Start with impact — no throat-clearing, no buildup
- Use specific examples, numbers, and situations (not platitudes)
- Write like you talk — contractions, natural rhythm
- Include at least one insight the reader can USE today
- End with a genuine question that starts conversation
- Use line breaks after every 1-2 sentences

MUST NOT:
- Use corporate jargon: "synergy," "leverage," "paradigm," "innovative," "disruptive"
- Humble brag: "I'm so grateful...", "Honored to announce..."
- Generic advice: "work hard," "stay positive," "believe in yourself"
- Long paragraphs (more than 3 lines without a break)
- Salesy or promotional language
- More than 2 emojis (if emojis are enabled)
- ALL CAPS (except ONE strategic word for emphasis, if tone calls for it)
- Preach or lecture — share, don't teach down

OUTPUT FORMAT:
- Output the post as PLAIN TEXT with line breaks
- Use \\n\\n for paragraph breaks (blank line between paragraphs)
- Do NOT use HTML tags, markdown, or any formatting markup
- Hashtags on a separate line at the very end (if enabled)
- The output should be copy-paste ready for LinkedIn`;
}

/**
 * Get structure-specific prompt instructions
 */
function getStructureInstructions(structure: string): string {
  switch (structure) {
    case 'story-based':
      return `STORY-BASED STRUCTURE (Most Popular):

1. HOOK (1-2 lines): Intriguing opening that creates curiosity
   - Drop the reader into the middle of the story
   - Use a specific detail that raises questions

2. STORY (4-6 short paragraphs): Personal experience or observation
   - Specific setting, details, and stakes
   - Build tension — what happened?
   - Show, don't tell

3. INSIGHT (1-2 paragraphs): What you learned
   - The "aha moment" — connect the dots
   - Frame it as a universal principle, not just your experience

4. APPLICATION (1-2 paragraphs): How readers can use this
   - Specific, actionable advice
   - "Next time you..." or "Try this..."

5. ENGAGEMENT: Question to audience
   - Related to the story's theme
   - Easy to answer from personal experience`;

    case 'contrarian-take':
      return `CONTRARIAN TAKE STRUCTURE:

1. HOOK (1-2 lines): Challenge conventional wisdom directly
   - "Hot take:" or bold declarative statement
   - Name the belief you're challenging

2. COMMON BELIEF (1-2 paragraphs): What everyone thinks
   - Acknowledge the popular perspective fairly
   - Show you understand why people believe this

3. WHY IT'S WRONG (2-3 paragraphs): Your perspective with evidence
   - Use specific examples or data
   - Show the hidden cost of the conventional approach
   - Be respectful but firm

4. BETTER APPROACH (1-2 paragraphs): Your recommendation
   - Specific and actionable alternative
   - Back it with your experience or data

5. ENGAGEMENT: Ask for opinions
   - "Do you agree or am I wrong?"
   - Invite healthy debate`;

    case 'lesson-learned':
      return `LESSON LEARNED STRUCTURE:

1. HOOK (1-2 lines): Lead with the mistake or failure
   - Be specific about the cost or consequence
   - Create empathy through vulnerability

2. WHAT HAPPENED (2-3 paragraphs): The situation
   - Set the scene with specific details
   - What went wrong and why
   - Be honest, not performative

3. WHAT YOU LEARNED (1-2 paragraphs): The lesson
   - The insight that emerged from the failure
   - Connect it to a broader principle

4. HOW TO AVOID IT (1-2 paragraphs): Practical advice
   - Specific steps readers can take
   - "If I could go back, I would..."
   - Actionable, not abstract

5. ENGAGEMENT: "Have you experienced this?"
   - Invite shared vulnerability
   - Make it safe to respond`;

    case 'framework-system':
      return `FRAMEWORK/SYSTEM STRUCTURE:

1. HOOK (1-2 lines): Lead with results achieved
   - Specific before/after numbers if available
   - Create a "how did they do that?" reaction

2. CONTEXT (1 paragraph): Why the old way doesn't work
   - Name the common approach and its flaw
   - Set up why a system is needed

3. THE FRAMEWORK (main body): 3-5 step system
   - Each step gets its own short paragraph
   - Use a memorable name or acronym if provided
   - Be specific about WHAT to do at each step
   - Include brief explanation of WHY each step works

4. WHY IT WORKS (1 paragraph): Brief explanation
   - Connect the framework to human psychology or business logic
   - Keep it concise

5. HOW TO APPLY (1 paragraph): Call to action
   - "Try this in your next..." or "Start with step 1 today"
   - Make it immediately actionable

6. ENGAGEMENT: "Which step resonates most?"
   - Or: "What would you add to this?"`;

    case 'observation-insight':
      return `OBSERVATION + INSIGHT STRUCTURE:

1. HOOK (1-2 lines): Something you noticed
   - A specific data point, pattern, or trend
   - "I've noticed something..." with specificity

2. THE PATTERN (2-3 paragraphs): Trend or observation
   - Describe what you're seeing in your industry/field
   - Use specific examples or data points
   - Show this isn't just one instance

3. WHY IT MATTERS (1-2 paragraphs): Implications
   - What does this mean for professionals?
   - What's the consequence of ignoring this trend?
   - Connect to broader shifts

4. WHAT TO DO (1-2 paragraphs): Actionable takeaway
   - Specific recommendation based on the observation
   - "Here's how to position yourself..."
   - Practical and immediate

5. ENGAGEMENT: Question or poll
   - "Are you seeing this too?"
   - "What's your take on this trend?"`;

    default:
      return '';
  }
}

/**
 * Get tone-specific prompt instructions
 */
function getToneInstructions(tone: string): string {
  switch (tone) {
    case 'conversational':
      return `CONVERSATIONAL TONE:
- Write like you're talking to a smart colleague over coffee
- Use contractions freely (I've, don't, can't, they're)
- Natural rhythm — some long sentences, some short
- Include small asides and personal observations
- Warm but substantive — friendly, not fluffy`;

    case 'vulnerable':
      return `VULNERABLE & HONEST TONE:
- Lead with real feelings and real stakes
- Admit what you didn't know or got wrong
- Show the process, not just the polished result
- Be self-aware without being self-deprecating
- Raw honesty, not performative vulnerability
- "I was scared" not "I'm so grateful for the journey"`;

    case 'bold':
      return `BOLD & CONFIDENT TONE:
- Direct, opinionated, and unapologetic
- Take clear positions — no hedging or "it depends"
- Short, punchy sentences for emphasis
- Challenge the reader to think differently
- Confident without being arrogant
- "Here's the truth:" energy`;

    case 'professional':
      return `PROFESSIONAL TONE:
- Credible and measured — every claim backed by evidence
- Data-informed without being dry
- Authoritative but accessible
- Use industry-appropriate language (not jargon)
- Balanced perspective — acknowledge complexity
- Think: senior exec sharing hard-won wisdom`;

    default:
      return '';
  }
}

// ═══════════════════════════════════════════════════════════
// QUALITY VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Run quality checks on generated LinkedIn post content.
 * Returns an array of pass/fail checks for display.
 */
function runQualityChecks(content: string): QualityCheck[] {
  const checks: QualityCheck[] = [];

  // Strip hashtags for character count
  const contentWithoutHashtags = content.replace(/\n#\S+(\s#\S+)*/g, '').trim();
  const charCount = contentWithoutHashtags.length;

  // Check 1: Hook under 210 characters
  const firstParagraphEnd = content.indexOf('\n\n');
  const hookLength = firstParagraphEnd > 0 ? firstParagraphEnd : Math.min(content.length, 210);
  const hookText = content.substring(0, hookLength);
  checks.push({
    label: 'Hook under 210 chars',
    passed: hookText.length <= HOOK_CHAR_LIMIT,
    message: hookText.length <= HOOK_CHAR_LIMIT
      ? `Hook is ${hookText.length} characters`
      : `Hook is ${hookText.length} chars (${hookText.length - HOOK_CHAR_LIMIT} over limit)`,
  });

  // Check 2: Total under 1,800 characters
  checks.push({
    label: 'Total under 1,800 chars',
    passed: charCount <= 1800,
    message: charCount <= 1800
      ? `${charCount} characters total`
      : `${charCount} characters (${charCount - 1800} over)`,
  });

  // Check 3: Has line breaks (at least 3)
  const lineBreakCount = (content.match(/\n\n/g) || []).length;
  checks.push({
    label: 'At least 3 line breaks',
    passed: lineBreakCount >= 3,
    message: `${lineBreakCount} paragraph breaks found`,
  });

  // Check 4: Ends with question
  const lastLine = content.trim().split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).pop() || '';
  const endsWithQuestion = lastLine.trim().endsWith('?');
  checks.push({
    label: 'Ends with engagement question',
    passed: endsWithQuestion,
    message: endsWithQuestion ? 'Post ends with a question' : 'Consider adding a closing question',
  });

  // Check 5: Personal voice (uses "I")
  const usesFirstPerson = /\bI\b/.test(content);
  checks.push({
    label: 'Personal voice (uses "I")',
    passed: usesFirstPerson,
    message: usesFirstPerson ? 'Written in first person' : 'Consider adding personal perspective',
  });

  // Check 6: No corporate jargon
  const jargonWords = ['synergy', 'leverage', 'paradigm', 'innovative', 'disruptive', 'game-changing', 'cutting-edge', 'best-in-class'];
  const foundJargon = jargonWords.filter((word) =>
    content.toLowerCase().includes(word)
  );
  checks.push({
    label: 'No corporate jargon',
    passed: foundJargon.length === 0,
    message: foundJargon.length === 0
      ? 'Clean of corporate jargon'
      : `Found: ${foundJargon.join(', ')}`,
  });

  return checks;
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
 * Character count indicator with color-coded thresholds
 */
function CharacterCount({
  current,
  target,
  label,
}: {
  current: number;
  target?: number;
  label?: string;
}) {
  const getColor = (): string => {
    if (!target) return 'text-gray-400';
    const ratio = current / target;
    if (ratio <= 1.0) return 'text-green-600';
    if (ratio <= 1.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <span className={cn('text-xs font-medium tabular-nums', getColor())}>
      {label && <span className="text-gray-400 font-normal">{label} </span>}
      {current.toLocaleString()}
      {target && <span className="text-gray-400">/{target.toLocaleString()}</span>}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function LinkedInThoughtLeadershipTemplate({
  onClose,
  editor,
  activeProject,
}: LinkedInThoughtLeadershipTemplateProps) {
  const activeDocumentId = useWorkspaceStore((state) => state.activeDocumentId);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);

  // ─── Form data ───
  const [formData, setFormData] = useState<LinkedInFormData>({
    structure: 'story-based',
    topic: '',
    personalContext: '',
    keyInsight: '',
    practicalTakeaway: '',
    authorRole: '',
    targetAudience: '',
    tone: 'conversational',
    hookStyle: 'bold-statement',
    charTarget: 'medium',
    includeEmojis: false,
    includeHashtags: true,
    frameworkName: '',
    contrarianBelief: '',
    specificMetrics: '',
  });

  // ─── UI state ───
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [applyBrandVoice, setApplyBrandVoice] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // ─── Generation state ───
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);

  // ─── Clipboard state ───
  const [copied, setCopied] = useState(false);

  const hasBrandVoice = Boolean(activeProject?.brandVoice?.brandName);

  // ─── Derived values ───
  const charTargetValue = useMemo(
    () => CHAR_TARGETS[formData.charTarget as keyof typeof CHAR_TARGETS]?.value || 1500,
    [formData.charTarget]
  );

  /** Whether the current structure needs the framework name field */
  const needsFrameworkName = formData.structure === 'framework-system';

  /** Whether the current structure needs the contrarian belief field */
  const needsContrarianBelief = formData.structure === 'contrarian-take';

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
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // ─── Form field updater ───
  const updateField = useCallback(
    <K extends keyof LinkedInFormData>(field: K, value: LinkedInFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setGenerationError(null);
    },
    []
  );

  // ─── Validation ───
  const validate = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.topic.trim()) errors.push('Topic/Theme is required.');
    if (!formData.personalContext.trim()) errors.push('Personal story/experience is required.');
    if (!formData.keyInsight.trim()) errors.push('Key insight/lesson is required.');
    if (!formData.authorRole.trim()) errors.push('Your role/expertise is required.');
    if (!formData.targetAudience.trim()) errors.push('Target audience is required.');

    if (needsFrameworkName && !formData.frameworkName.trim()) {
      errors.push('Framework/System name is required for this structure.');
    }

    if (needsContrarianBelief && !formData.contrarianBelief.trim()) {
      errors.push('The belief you\'re challenging is required for this structure.');
    }

    return { valid: errors.length === 0, errors };
  }, [formData, needsFrameworkName, needsContrarianBelief]);

  // ─── Generate the post ───
  const handleGenerate = useCallback(async () => {
    if (!editor || !activeProject) return;

    const { valid, errors } = validate();
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
        const title = `LinkedIn Post - ${formData.topic.substring(0, 40)} - ${dateStr}`;
        const newDoc = await createDocument(activeProjectId, title);
        targetDocumentId = newDoc.id;
        useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);
        logger.log('Auto-created document for LinkedIn post:', newDoc.id);
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (createError) {
        logger.error('Failed to create document:', createError);
        setGenerationError('Failed to create document. Please try again.');
        return;
      }
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedContent(null);
    setQualityChecks([]);
    setShowPreview(false);

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
Write in a way that authentically reflects this brand voice while maintaining personal LinkedIn tone.`;
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

      const systemPrompt = buildLinkedInSystemPrompt(
        formData,
        brandVoiceInstructions,
        personaInstructions
      );

      logger.log('Generating LinkedIn post, structure:', formData.structure);

      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'linkedin-thought-leadership',
          formData: {
            ...formData,
            _systemPromptOverride: systemPrompt,
          },
          applyBrandVoice,
          brandVoice: applyBrandVoice ? activeProject.brandVoice : undefined,
          persona: selectedPersona,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to generate post');
      }

      const data = await response.json();
      let rawContent = data.generatedCopy;

      // Strip any HTML tags the model might have included — we want plain text
      rawContent = rawContent.replace(/<[^>]+>/g, '');
      // Normalize line breaks
      rawContent = rawContent.replace(/\r\n/g, '\n').trim();

      logger.log('LinkedIn post generated, length:', rawContent.length);

      // Store plain text for preview and clipboard
      setGeneratedContent(rawContent);

      // Run quality checks
      const checks = runQualityChecks(rawContent);
      setQualityChecks(checks);

      // Show preview mode
      setShowPreview(true);

      // Convert to HTML for TipTap editor
      const htmlContent = rawContent
        .split('\n\n')
        .map((paragraph: string) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');

      const formatted = formatGeneratedContent(htmlContent);

      // Insert into TipTap editor
      editor.commands.setContent(formatted);

      // Persist to document storage
      if (activeProjectId && targetDocumentId) {
        try {
          updateDocumentInStorage(activeProjectId, targetDocumentId, {
            content: formatted,
          });
          logger.log('LinkedIn post document saved');
        } catch (storageError) {
          logger.error('Failed to save LinkedIn post document:', storageError);
        }
      }
    } catch (error) {
      logger.error('LinkedIn post generation error:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate post'
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

  // ─── Copy to clipboard ───
  const handleCopy = useCallback(() => {
    if (!generatedContent) return;
    navigator.clipboard
      .writeText(generatedContent)
      .then(() => setCopied(true))
      .catch((err) => logger.error('Clipboard error:', err));
  }, [generatedContent]);

  // ─── Start over ───
  const handleStartOver = useCallback(() => {
    setGeneratedContent(null);
    setGenerationError(null);
    setQualityChecks([]);
    setShowPreview(false);
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
    'focus:outline-none focus:ring-2 focus:ring-[#006EE6] focus:border-[#006EE6] focus:ring-offset-1',
    'disabled:bg-gray-50 disabled:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: STRUCTURE SELECTOR
  // ═══════════════════════════════════════════════════════════

  const renderStructureSelector = () => (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Post Structure
      </label>
      <div className="space-y-2">
        {STRUCTURE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
              formData.structure === option.id
                ? 'border-[#006EE6] bg-blue-50 ring-1 ring-[#006EE6]/30'
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
              className="mt-1 h-4 w-4 text-[#006EE6] focus:ring-[#006EE6] border-gray-300"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{option.label}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{option.description}</p>
              <p className="text-xs text-[#006EE6] mt-0.5 italic">{option.example}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{option.bestFor}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: CONTENT FIELDS
  // ═══════════════════════════════════════════════════════════

  const renderContentFields = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Your Content
      </h3>

      <FormField
        label="Topic / Theme"
        required
        helperText="What is this post about? Be specific."
      >
        <input
          type="text"
          value={formData.topic}
          onChange={(e) => updateField('topic', e.target.value)}
          placeholder="e.g., Why timing matters more than talent in sales"
          className={inputClasses}
          disabled={isGenerating}
          maxLength={200}
        />
      </FormField>

      <FormField
        label="Your Story / Experience / Observation"
        required
        helperText="The personal experience or observation to weave into the post. Be specific — details make posts compelling."
      >
        <AutoExpandTextarea
          value={formData.personalContext}
          onChange={(e) => updateField('personalContext', e.target.value)}
          placeholder="e.g., Last week I lost a $50K client because I sent a proposal at 4:47pm on Friday. My competitor had sent theirs Thursday evening. By Monday my proposal was buried in 47 other emails..."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={80}
          maxHeight={180}
          maxLength={600}
        />
        <div className="flex justify-end mt-1">
          <CharacterCount current={formData.personalContext.length} target={600} />
        </div>
      </FormField>

      <FormField
        label="Key Insight / Lesson"
        required
        helperText="The main takeaway — what you learned or what the reader should understand."
      >
        <AutoExpandTextarea
          value={formData.keyInsight}
          onChange={(e) => updateField('keyInsight', e.target.value)}
          placeholder="e.g., When someone is ready to buy, they're in 'decision mode.' Send your proposal when they're ready to decide, not when it's convenient for you."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={60}
          maxHeight={120}
          maxLength={400}
        />
      </FormField>

      <FormField
        label="Practical Takeaway"
        helperText="What should readers DO with this insight? (Optional but recommended)"
      >
        <AutoExpandTextarea
          value={formData.practicalTakeaway}
          onChange={(e) => updateField('practicalTakeaway', e.target.value)}
          placeholder='e.g., Ask "When are you planning to review proposals?" and send yours to arrive at that exact moment.'
          className={inputClasses}
          disabled={isGenerating}
          minHeight={60}
          maxHeight={120}
          maxLength={300}
        />
      </FormField>

      {/* Conditional: Framework name */}
      {needsFrameworkName && (
        <FormField
          label="Framework / System Name"
          required
          helperText="Give your framework a memorable name or acronym."
        >
          <input
            type="text"
            value={formData.frameworkName}
            onChange={(e) => updateField('frameworkName', e.target.value)}
            placeholder="e.g., The REPLY Framework, The 3-2-1 Method"
            className={inputClasses}
            disabled={isGenerating}
            maxLength={100}
          />
        </FormField>
      )}

      {/* Conditional: Contrarian belief */}
      {needsContrarianBelief && (
        <FormField
          label="Belief You're Challenging"
          required
          helperText="What does everyone believe that you think is wrong?"
        >
          <AutoExpandTextarea
            value={formData.contrarianBelief}
            onChange={(e) => updateField('contrarianBelief', e.target.value)}
            placeholder='e.g., "Authentic" LinkedIn posts are actually performative vulnerability — everyone shares failures AFTER they succeed.'
            className={inputClasses}
            disabled={isGenerating}
            minHeight={60}
            maxHeight={100}
            maxLength={300}
          />
        </FormField>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: AUTHOR CONTEXT
  // ═══════════════════════════════════════════════════════════

  const renderAuthorContext = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Author Context
      </h3>

      <FormField
        label="Your Role / Expertise"
        required
        helperText="Your professional identity — this shapes the credibility of the post."
      >
        <input
          type="text"
          value={formData.authorRole}
          onChange={(e) => updateField('authorRole', e.target.value)}
          placeholder="e.g., VP of Sales at a B2B SaaS company, Freelance copywriter with 15 years experience"
          className={inputClasses}
          disabled={isGenerating}
          maxLength={150}
        />
      </FormField>

      <FormField
        label="Target Audience"
        required
        helperText="Who should this post resonate with on LinkedIn?"
      >
        <input
          type="text"
          value={formData.targetAudience}
          onChange={(e) => updateField('targetAudience', e.target.value)}
          placeholder="e.g., B2B sales professionals and founders, Marketing leaders at mid-size companies"
          className={inputClasses}
          disabled={isGenerating}
          maxLength={200}
        />
      </FormField>
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
      <FormField label="Tone" required>
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateField('tone', option.id)}
              disabled={isGenerating}
              className={cn(
                'flex flex-col p-2.5 rounded-lg border text-left transition-all',
                formData.tone === option.id
                  ? 'border-[#006EE6] bg-blue-50 ring-1 ring-[#006EE6]/30'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="text-xs font-semibold text-gray-900">{option.label}</span>
              <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">{option.description}</span>
            </button>
          ))}
        </div>
      </FormField>

      {/* Hook style */}
      <FormField label="Hook Style" required helperText="How should the post open?">
        <select
          value={formData.hookStyle}
          onChange={(e) => updateField('hookStyle', e.target.value as LinkedInFormData['hookStyle'])}
          className={inputClasses}
          disabled={isGenerating}
        >
          {HOOK_STYLE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} — {option.example}
            </option>
          ))}
        </select>
      </FormField>

      {/* Character target */}
      <FormField label="Character Target" helperText="Optimal LinkedIn engagement: 1,200-1,500 chars">
        <div className="grid grid-cols-3 gap-2">
          {CHAR_TARGET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateField('charTarget', option.id)}
              disabled={isGenerating}
              className={cn(
                'flex flex-col items-center p-2 rounded-lg border text-center transition-all',
                formData.charTarget === option.id
                  ? 'border-[#006EE6] bg-blue-50 ring-1 ring-[#006EE6]/30'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span className="text-xs font-semibold text-gray-900">{option.label}</span>
              <span className="text-[10px] text-gray-400">{option.description}</span>
            </button>
          ))}
        </div>
      </FormField>

      {/* Toggles row */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.includeEmojis}
            onChange={(e) => updateField('includeEmojis', e.target.checked)}
            disabled={isGenerating}
            className="h-4 w-4 rounded border-gray-300 text-[#006EE6] focus:ring-[#006EE6]"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">Emojis</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.includeHashtags}
            onChange={(e) => updateField('includeHashtags', e.target.checked)}
            disabled={isGenerating}
            className="h-4 w-4 rounded border-gray-300 text-[#006EE6] focus:ring-[#006EE6]"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900">Hashtags</span>
        </label>
      </div>

      {/* Optional: Specific metrics */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowOptionalFields(!showOptionalFields)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          {showOptionalFields ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          Optional Details
        </button>

        {showOptionalFields && (
          <div className="space-y-3 pl-3 border-l-2 border-gray-100 ml-2">
            <FormField
              label="Specific Results / Metrics"
              helperText="Numbers add credibility: before/after stats, percentages, revenue"
            >
              <input
                type="text"
                value={formData.specificMetrics}
                onChange={(e) => updateField('specificMetrics', e.target.value)}
                placeholder="e.g., Response rate went from 2% to 47% in 3 months"
                className={inputClasses}
                disabled={isGenerating}
                maxLength={200}
              />
            </FormField>
          </div>
        )}
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
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#006EE6] focus:ring-[#006EE6]"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 group-hover:text-[#006EE6] transition-colors">
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
  // RENDER: GENERATED OUTPUT / PREVIEW
  // ═══════════════════════════════════════════════════════════

  const renderOutput = () => {
    if (!generatedContent) return null;

    // Calculate stats
    const contentWithoutHashtags = generatedContent.replace(/\n#\S+(\s#\S+)*/g, '').trim();
    const totalChars = contentWithoutHashtags.length;
    const hookEnd = generatedContent.indexOf('\n\n');
    const hookText = hookEnd > 0 ? generatedContent.substring(0, hookEnd) : generatedContent.substring(0, HOOK_CHAR_LIMIT);
    const hookChars = hookText.length;
    const passedChecks = qualityChecks.filter((c) => c.passed).length;
    const totalChecks = qualityChecks.length;

    return (
      <div className="space-y-4">
        {/* Success header */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">
                LinkedIn Post Generated
              </p>
              <p className="text-xs text-green-700 mt-1">
                Your post is in the editor and ready to copy to LinkedIn.
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs">
          <span className={cn(
            'px-2 py-1 rounded-full font-medium border',
            totalChars <= 1500 ? 'bg-green-50 text-green-700 border-green-200'
              : totalChars <= 1800 ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : 'bg-red-50 text-red-700 border-red-200'
          )}>
            {totalChars.toLocaleString()} chars
          </span>
          <span className={cn(
            'px-2 py-1 rounded-full font-medium border',
            hookChars <= HOOK_CHAR_LIMIT
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          )}>
            Hook: {hookChars} / {HOOK_CHAR_LIMIT}
          </span>
          <span className={cn(
            'px-2 py-1 rounded-full font-medium border',
            passedChecks === totalChecks
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
          )}>
            {passedChecks}/{totalChecks} checks
          </span>
        </div>

        {/* Hook preview */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <Eye className="w-3.5 h-3.5" />
            LinkedIn Preview (before &quot;see more&quot;)
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-900 whitespace-pre-line leading-relaxed">
              {generatedContent.substring(0, HOOK_CHAR_LIMIT)}
              {generatedContent.length > HOOK_CHAR_LIMIT && (
                <span className="text-blue-600 ml-1">...see more</span>
              )}
            </p>
          </div>
        </div>

        {/* Quality checks */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Quality Checks
          </p>
          <div className="space-y-1">
            {qualityChecks.map((check, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs',
                  check.passed ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                )}
              >
                {check.passed ? (
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="font-medium">{check.label}</span>
                <span className="text-gray-500 ml-auto">{check.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Copy to clipboard */}
        <button
          onClick={handleCopy}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
            copied
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-blue-50 text-[#006EE6] border border-blue-200 hover:bg-blue-100'
          )}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Post to Clipboard
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
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-[#006EE6] to-[#7A3991] text-white p-4 rounded-t-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{TEMPLATE_META.name}</h2>
              <p className="text-sm text-white/80 mt-0.5">{TEMPLATE_META.description}</p>
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
        {generatedContent && showPreview ? (
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

            {/* LinkedIn best practices tip */}
            <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md">
              <Info className="w-3.5 h-3.5 text-[#006EE6] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>LinkedIn tip:</strong> The first 210 characters (before &quot;see more&quot;) determine
                whether anyone reads the rest. Start with impact — no buildup, no introductions.
              </p>
            </div>

            {/* Structure selector */}
            {renderStructureSelector()}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Content fields */}
            {renderContentFields()}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Author context */}
            {renderAuthorContext()}

            {/* Divider */}
            <div className="border-t border-gray-200" />

            {/* Settings */}
            {renderSettings()}
          </div>
        )}
      </div>

      {/* Footer with action buttons */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {generatedContent && showPreview ? (
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
              'focus:outline-none focus:ring-2 focus:ring-[#006EE6] focus:ring-offset-2',
              'flex items-center justify-center gap-2',
              isGenerating && 'aiworx-gradient-animated cursor-wait',
              !isGenerating && 'bg-[#006EE6] hover:bg-[#0062CC] transition-colors',
              (!editor || !activeProject) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center gap-1">
                <AIWorxButtonLoader />
                <span className="text-xs">Crafting your LinkedIn post...</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate LinkedIn Post
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
