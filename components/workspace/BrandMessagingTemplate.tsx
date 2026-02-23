/**
 * @file components/workspace/BrandMessagingTemplate.tsx
 * @description Brand Messaging Framework — strategic foundation messaging template
 *
 * Generates a complete 5-layer messaging framework:
 *   1. Foundation (Mission / Vision / Core Values)
 *   2. Positioning (Category / Audience / Problem / UVP / Differentiation)
 *   3. Messaging Pillars (3-4 pillars with supporting & proof points)
 *   4. Audience-Specific Messaging (2-3 segments)
 *   5. Expression Layer (Taglines / Elevator Pitches / One-liner / Boilerplate)
 *
 * Features:
 *   - 3-step wizard (Foundation → Strategy → Review & Generate)
 *   - Contextual help ("Why This Matters") for strategic sections
 *   - Brand voice & persona integration
 *   - Structured output display with per-section copy-to-clipboard
 *   - Output also inserted into TipTap editor for editing / export
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Compass,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  X,
  Clock,
  Info,
  RotateCcw,
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
  name: 'Brand Messaging Framework',
  description:
    'Strategic foundation messaging that feeds all other copywriting — mission, positioning, pillars, audience messaging & expression.',
  complexity: 'Advanced' as const,
  estimatedTime: '20-30 min',
};

/** Wizard step definitions */
const WIZARD_STEPS = [
  { id: 'foundation', label: 'Foundation', shortLabel: '1' },
  { id: 'strategy', label: 'Strategy', shortLabel: '2' },
  { id: 'generate', label: 'Generate', shortLabel: '3' },
] as const;

/** Tone options for the framework */
const TONE_OPTIONS = [
  'Professional',
  'Aspirational',
  'Bold & Confident',
  'Friendly & Approachable',
  'Authoritative',
  'Innovative',
] as const;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface BrandMessagingTemplateProps {
  /** Callback when template should close */
  onClose: () => void;
  /** TipTap editor instance */
  editor: Editor | null;
  /** Active project for brand voice and personas */
  activeProject: Project | null;
}

/** Form data shape for the wizard */
interface BMFFormData {
  // Step 1: Foundation
  brandName: string;
  industry: string;
  primaryAudience: string;
  secondaryAudience: string;
  keyProblem: string;
  // Step 2: Strategy
  differentiators: string;
  competitors: string;
  companyValues: string;
  existingMissionVision: string;
  tonePreference: string;
}

/** Tracks which section was copied to clipboard */
type CopiedSection = string | null;

// ═══════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build the Claude system prompt for brand messaging framework generation.
 * Injects user inputs, brand voice, and persona into a comprehensive prompt
 * that produces a cohesive, interconnected 5-layer strategic framework.
 */
function buildBMFSystemPrompt(
  formData: BMFFormData,
  brandVoiceInstructions: string,
  personaInstructions: string
): string {
  return `You are a senior brand strategist and messaging consultant with 25 years of experience developing brand messaging frameworks for companies ranging from startups to Fortune 500. You charge $25,000–$50,000 for this work. Deliver accordingly.

Generate a COMPLETE Brand Messaging Framework based on these inputs:

BRAND NAME: ${formData.brandName}
INDUSTRY/CATEGORY: ${formData.industry}
PRIMARY TARGET AUDIENCE: ${formData.primaryAudience}
SECONDARY TARGET AUDIENCE: ${formData.secondaryAudience || '(not provided)'}
KEY PROBLEM SOLVED: ${formData.keyProblem}
UNIQUE DIFFERENTIATORS: ${formData.differentiators}
COMPETITORS/ALTERNATIVES: ${formData.competitors || '(not provided)'}
COMPANY VALUES: ${formData.companyValues || '(AI to suggest based on inputs)'}
EXISTING MISSION/VISION: ${formData.existingMissionVision || '(none — generate fresh)'}
TONE PREFERENCE: ${formData.tonePreference}

${brandVoiceInstructions}
${personaInstructions}

═══════════════════════════════════════════════════
OUTPUT STRUCTURE — FOLLOW EXACTLY
═══════════════════════════════════════════════════

Generate ALL five layers below. Every section must be specific to THIS brand — no generic filler.

<h2>1. FOUNDATION</h2>

<h3>Mission Statement</h3>
<p>One to two sentences explaining why this company exists. Ground it in the problem solved and audience served. Do NOT use generic "we strive to" language.</p>

<h3>Vision Statement</h3>
<p>One to two sentences describing the aspirational future state. Where is this company leading its industry or audience?</p>

<h3>Core Values</h3>
<p>Three to five values, each as a bold name followed by a one-sentence description:</p>
<ul>
<li><strong>[Value Name]:</strong> [Concrete description of what this value means in practice]</li>
</ul>

<h2>2. POSITIONING</h2>

<h3>Category Definition</h3>
<p>One sentence defining what business or category this brand operates in. Be specific — not "technology company" but the precise category.</p>

<h3>Target Audience</h3>
<p><strong>PRIMARY:</strong> [Specific audience description]</p>
<p><strong>SECONDARY:</strong> [Specific audience description or "N/A"]</p>

<h3>Key Problem Solved</h3>
<p>Two to three sentences describing the core pain point in vivid, audience-resonant language. Quantify the cost of the problem where possible.</p>

<h3>Unique Value Proposition</h3>
<p>Two to three sentences articulating why this brand versus all alternatives. Lead with what makes them the ONLY option, not just a better option. Reference the differentiators provided.</p>

<h3>Competitive Differentiation</h3>
<p>A bullet list of 4-5 specific differentiators that set this brand apart. Each should be concrete and defensible.</p>
<ul>
<li>[Specific differentiator, not vague claims]</li>
</ul>

<h2>3. MESSAGING PILLARS</h2>

<p>Generate exactly 3 pillars. Each pillar is a strategic theme the brand owns in its messaging.</p>

<h3>PILLAR 1: [Pillar Name]</h3>
<p>[Two to three sentences describing what this pillar means and why it matters to the audience.]</p>
<p><strong>Supporting Points:</strong></p>
<ul>
<li>[Specific claim or capability — 3-4 points]</li>
</ul>
<p><strong>Proof Points:</strong></p>
<ul>
<li>[Stats, facts, or examples that back up the pillar — 2-3 points]</li>
</ul>

<h3>PILLAR 2: [Pillar Name]</h3>
<p>[Same structure as Pillar 1]</p>
<p><strong>Supporting Points:</strong></p>
<ul><li>[Points]</li></ul>
<p><strong>Proof Points:</strong></p>
<ul><li>[Points]</li></ul>

<h3>PILLAR 3: [Pillar Name]</h3>
<p>[Same structure as Pillar 1]</p>
<p><strong>Supporting Points:</strong></p>
<ul><li>[Points]</li></ul>
<p><strong>Proof Points:</strong></p>
<ul><li>[Points]</li></ul>

<h2>4. AUDIENCE-SPECIFIC MESSAGING</h2>

<p>Generate messaging for 2-3 distinct audience segments based on the target audiences provided.</p>

<h3>SEGMENT: [Segment Name]</h3>
<p><strong>Pain Points:</strong></p>
<ul><li>[2-3 specific pain points]</li></ul>
<p><strong>What They Care About:</strong></p>
<ul><li>[2-3 priorities]</li></ul>
<p><strong>How We Help:</strong></p>
<ul><li>[2-3 specific ways]</li></ul>
<p><strong>Key Message:</strong></p>
<p><em>"[A direct, compelling message crafted specifically for this segment — 2-3 sentences in quotes]"</em></p>

[Repeat for each segment]

<h2>5. EXPRESSION LAYER</h2>

<h3>Tagline Options</h3>
<ul>
<li><strong>1.</strong> [Tagline option]</li>
<li><strong>2.</strong> [Tagline option]</li>
<li><strong>3.</strong> [Tagline option]</li>
<li><strong>4.</strong> [Tagline option]</li>
<li><strong>5.</strong> [Tagline option]</li>
</ul>

<h3>Elevator Pitch (30-Second)</h3>
<p>[A tight 30-second pitch — roughly 75-85 words. Covers what the brand does, who it is for, and why it is different.]</p>

<h3>Elevator Pitch (60-Second)</h3>
<p>[An expanded 60-second pitch — roughly 150-170 words. Adds the problem context, proof points, and a closing statement.]</p>

<h3>One-Liner</h3>
<p>[A single sentence — Twitter bio style — that captures the brand essence. Maximum 15 words.]</p>

<h3>Boilerplate</h3>
<p>[A press-release-style company description. 50-75 words. Factual, professional, comprehensive.]</p>

═══════════════════════════════════════════════════
CRITICAL QUALITY RULES
═══════════════════════════════════════════════════

VOICE & QUALITY:
- Write like a $50k strategy consultant, not a content mill.
- Every sentence must be SPECIFIC to this brand. No "leveraging synergies" or "driving innovation" filler.
- Use the language of the brand's industry and audience.
- All sections must connect — the mission should echo in the pillars, the pillars should feed the audience messaging, the expression layer should distill everything above.
- If the user provided existing mission/vision language, honor and refine it rather than replacing it entirely.
- If company values were not provided, infer 3-5 values from the differentiators, problem solved, and audience described.

TONE:
- Match the tone preference (${formData.tonePreference}) throughout the framework.
- The framework itself should be written in a professional consulting voice.
- The CONTENT of each section (e.g., taglines, pitches, key messages) should match the specified tone.

SPECIFICITY:
- Use concrete numbers, timeframes, and outcomes wherever the inputs support them.
- If the user provided competitors, position AGAINST them specifically in the differentiation section.
- Pillar names should be distinctive (not generic "Quality" or "Innovation" — make them ownable).
- Proof points should reference real capabilities described in the differentiators. If you lack hard data, use plausible professional language like "designed for..." or "built with..." rather than fabricating statistics.

COHESION:
- The framework is ONE narrative told at five levels of detail.
- The mission should naturally lead to the positioning.
- The positioning should make the pillars feel inevitable.
- The pillars should inform how each audience segment is addressed.
- The expression layer should distill everything above into memorable language.

FORMAT:
- Output ONLY valid HTML using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags.
- No markdown. No preamble. No explanation outside the framework.
- Each section header uses <h2>, each sub-section uses <h3>.
- Use <strong> for emphasis on key terms and names.
- Use <em> for quoted key messages in audience sections.`;
}

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Progress indicator showing wizard step completion
 */
function WizardProgress({
  currentStep,
  completedSteps,
}: {
  currentStep: number;
  completedSteps: number[];
}) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {WIZARD_STEPS.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = index === currentStep;
        const isPast = index < currentStep;

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                isCurrent && 'bg-amber-100 text-amber-800 ring-2 ring-amber-300',
                isCompleted && !isCurrent && 'bg-green-100 text-green-700',
                !isCurrent && !isCompleted && isPast && 'bg-gray-200 text-gray-600',
                !isCurrent && !isCompleted && !isPast && 'bg-gray-100 text-gray-400'
              )}
            >
              {isCompleted && !isCurrent ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <span className="w-4 text-center">{index + 1}</span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'w-6 h-0.5 transition-colors',
                  isPast || isCompleted ? 'bg-green-400' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Strategic help callout — explains "Why This Matters" for a field
 */
function StrategicHelp({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md mt-1">
      <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 leading-relaxed">{text}</p>
    </div>
  );
}

/**
 * Form field wrapper with label, required indicator, helper text, and optional strategic help
 */
function FormField({
  label,
  required,
  helperText,
  strategicHelp,
  children,
}: {
  label: string;
  required?: boolean;
  helperText?: string;
  strategicHelp?: string;
  children: React.ReactNode;
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {strategicHelp && (
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors"
          >
            <Info className="w-3 h-3" />
            Why this matters
          </button>
        )}
      </div>
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
      {showHelp && strategicHelp && <StrategicHelp text={strategicHelp} />}
      {children}
    </div>
  );
}

/**
 * Copy-to-clipboard button for a section of the framework
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

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function BrandMessagingTemplate({
  onClose,
  editor,
  activeProject,
}: BrandMessagingTemplateProps) {
  const activeDocumentId = useWorkspaceStore((state) => state.activeDocumentId);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Form data
  const [formData, setFormData] = useState<BMFFormData>({
    brandName: '',
    industry: '',
    primaryAudience: '',
    secondaryAudience: '',
    keyProblem: '',
    differentiators: '',
    competitors: '',
    companyValues: '',
    existingMissionVision: '',
    tonePreference: 'Professional',
  });

  // Settings
  const [applyBrandVoice, setApplyBrandVoice] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);

  // Clipboard state
  const [copiedSection, setCopiedSection] = useState<CopiedSection>(null);

  const hasBrandVoice = Boolean(activeProject?.brandVoice?.brandName);
  
  const brandNamePlaceholder = 'e.g., ABC Company Brand Voice';

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
    (field: keyof BMFFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setGenerationError(null);
    },
    []
  );

  // ─── Step validation ───
  const validateStep = useCallback(
    (step: number): string | null => {
      if (step === 0) {
        if (!formData.brandName.trim()) return 'Brand/Company Name is required';
        if (!formData.industry.trim()) return 'Industry/Category is required';
        if (!formData.primaryAudience.trim()) return 'Primary Target Audience is required';
        if (!formData.keyProblem.trim()) return 'Key Problem Solved is required';
      }
      if (step === 1) {
        if (!formData.differentiators.trim()) return 'Unique Differentiators are required';
        if (!formData.tonePreference.trim()) return 'Tone Preference is required';
      }
      return null;
    },
    [formData]
  );

  // ─── Navigate wizard steps ───
  const handleNext = useCallback(() => {
    const error = validateStep(currentStep);
    if (error) {
      setGenerationError(error);
      return;
    }
    setGenerationError(null);
    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep]
    );
    setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, [currentStep, validateStep]);

  const handlePrev = useCallback(() => {
    setGenerationError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // ─── Generate the framework ───
  const handleGenerate = useCallback(async () => {
    if (!editor || !activeProject) return;

    // Validate all steps before generating
    for (let step = 0; step < 2; step++) {
      const error = validateStep(step);
      if (error) {
        setCurrentStep(step);
        setGenerationError(error);
        return;
      }
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
        const title = `Brand Messaging Framework - ${formData.brandName} - ${dateStr}`;
        const newDoc = await createDocument(activeProjectId, title);
        targetDocumentId = newDoc.id;
        useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);
        logger.log('📄 Auto-created document for BMF:', newDoc.id);
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
      const systemPrompt = buildBMFSystemPrompt(
        formData,
        brandVoiceInstructions,
        personaInstructions
      );

      logger.log('🧭 Generating Brand Messaging Framework for:', formData.brandName);

      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'brand-messaging-framework',
          formData: {
            // Pass all form data as flat key-value pairs for the API
            ...formData,
            // Override the system prompt — the API will use this template's
            // empty systemPrompt, but we pass the full prompt as a special field
            _systemPromptOverride: systemPrompt,
          },
          applyBrandVoice,
          brandVoice: applyBrandVoice ? activeProject.brandVoice : undefined,
          persona: selectedPersona,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to generate framework');
      }

      const data = await response.json();
      const rawHTML = data.generatedCopy;
      const formatted = formatGeneratedContent(rawHTML);

      logger.log('✅ BMF generated, length:', formatted.length);

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
          logger.log('💾 BMF document saved');
        } catch (storageError) {
          logger.error('⚠️ Failed to save BMF document:', storageError);
        }
      }

      // Mark all steps completed
      setCompletedSteps([0, 1, 2]);
    } catch (error) {
      logger.error('❌ BMF generation error:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate framework'
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
    validateStep,
  ]);

  // ─── Copy section to clipboard ───
  const handleCopySection = useCallback(
    (sectionId: string) => {
      if (!generatedHTML) return;

      // Parse sections from HTML by <h2> boundaries
      const parser = new DOMParser();
      const doc = parser.parseFromString(generatedHTML, 'text/html');
      const headings = doc.querySelectorAll('h2');

      let sectionText = '';
      headings.forEach((heading, index) => {
        const normalizedId = heading.textContent
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || '';
        if (normalizedId.includes(sectionId)) {
          // Collect all elements between this h2 and the next h2
          const elements: string[] = [heading.textContent || ''];
          let sibling = heading.nextElementSibling;
          while (sibling && sibling.tagName !== 'H2') {
            elements.push(sibling.textContent || '');
            sibling = sibling.nextElementSibling;
          }
          sectionText = elements.join('\n');
        }
      });

      // Fallback: copy entire framework if section not found
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

  // ─── Copy full framework to clipboard ───
  const handleCopyFullFramework = useCallback(() => {
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
    setCurrentStep(0);
    setCompletedSteps([]);
    setGenerationError(null);
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
  // RENDER: STEP 1 — FOUNDATION
  // ═══════════════════════════════════════════════════════════

  const renderStep1 = () => (
    <div className="space-y-5">
      <FormField
        label="Brand / Company Name"
        required
        helperText="The name as it should appear in all messaging"
      >
        <input
          type="text"
          value={formData.brandName}
          onChange={(e) => updateField('brandName', e.target.value)}
          placeholder={brandNamePlaceholder}
          className={inputClasses}
          disabled={isGenerating}
          maxLength={100}
        />
      </FormField>

      <FormField
        label="Industry / Category"
        required
        helperText="What business or market category are you in?"
        strategicHelp="Category framing shapes how your audience discovers you. 'AI copywriting platform' lands differently than 'professional writing tool.' Be specific — it defines your competitive set."
      >
        <input
          type="text"
          value={formData.industry}
          onChange={(e) => updateField('industry', e.target.value)}
          placeholder="e.g., Professional AI Copywriting Platform"
          className={inputClasses}
          disabled={isGenerating}
          maxLength={150}
        />
      </FormField>

      <FormField
        label="Primary Target Audience"
        required
        helperText="Who is the #1 audience for your brand? Be specific about role, situation, and mindset."
        strategicHelp="Your primary audience drives 80% of your messaging decisions. The more specific you are here, the sharper every tagline, pitch, and pillar will be."
      >
        <AutoExpandTextarea
          value={formData.primaryAudience}
          onChange={(e) => updateField('primaryAudience', e.target.value)}
          placeholder="e.g., Professional freelance copywriters who handle 3-8 clients simultaneously and need to produce high-quality deliverables faster without sacrificing their professional standards..."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={80}
          maxHeight={160}
          maxLength={500}
        />
      </FormField>

      <FormField
        label="Secondary Target Audience"
        helperText="Who else benefits from your brand? (optional)"
      >
        <AutoExpandTextarea
          value={formData.secondaryAudience}
          onChange={(e) => updateField('secondaryAudience', e.target.value)}
          placeholder="e.g., Marketing agencies managing copywriting for 10+ client brands who need consistent quality at scale..."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={60}
          maxHeight={120}
          maxLength={400}
        />
      </FormField>

      <FormField
        label="Key Problem Solved"
        required
        helperText="What core pain does your brand address? Describe the problem, not your solution."
        strategicHelp="The problem you solve is the emotional engine of your messaging. People buy relief from pain before they buy features. Quantify the cost of the problem if you can (time, money, opportunity)."
      >
        <AutoExpandTextarea
          value={formData.keyProblem}
          onChange={(e) => updateField('keyProblem', e.target.value)}
          placeholder="e.g., Professional copywriters spend 60-70% of their time on repetitive first-draft work for common deliverables, reducing billable hours and creative capacity..."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={80}
          maxHeight={160}
          maxLength={600}
        />
      </FormField>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: STEP 2 — STRATEGY
  // ═══════════════════════════════════════════════════════════

  const renderStep2 = () => (
    <div className="space-y-5">
      <FormField
        label="Unique Differentiators"
        required
        helperText="What makes your brand different? List 3-5 specific differentiators, one per line."
        strategicHelp="Differentiators must be defensible and specific. 'Great customer service' is generic. 'Founded by a 40-year industry veteran' is defensible. These become the backbone of your messaging pillars."
      >
        <AutoExpandTextarea
          value={formData.differentiators}
          onChange={(e) => updateField('differentiators', e.target.value)}
          placeholder={`e.g.,\n- Built by a copywriting professional with 40 years of experience\n- Professional frameworks embedded (AIDA, PAS, FAB)\n- Multi-client brand voice management for agencies\n- Selection-based editing workflow for professional QA\n- Copywriter workflows, not content calendar workflows`}
          className={inputClasses}
          disabled={isGenerating}
          minHeight={120}
          maxHeight={200}
          maxLength={800}
        />
      </FormField>

      <FormField
        label="Competitors / Alternatives"
        helperText="What else does your audience use instead? Name specific competitors or categories of alternatives."
        strategicHelp="Positioning is relative. Naming competitors helps the AI position your brand against specific alternatives — not in a vacuum."
      >
        <AutoExpandTextarea
          value={formData.competitors}
          onChange={(e) => updateField('competitors', e.target.value)}
          placeholder="e.g., Jasper, Copy.ai, ChatGPT, hiring freelance copywriters, doing it manually..."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={60}
          maxHeight={120}
          maxLength={400}
        />
      </FormField>

      <FormField
        label="Company Values"
        helperText="Core values that drive your brand. One per line. Leave blank to let AI suggest values based on your inputs."
      >
        <AutoExpandTextarea
          value={formData.companyValues}
          onChange={(e) => updateField('companyValues', e.target.value)}
          placeholder={`e.g.,\n- Craftsmanship First\n- Professional Respect\n- Quality Over Speed\n- Copywriter-Centric`}
          className={inputClasses}
          disabled={isGenerating}
          minHeight={80}
          maxHeight={160}
          maxLength={500}
        />
      </FormField>

      <FormField
        label="Existing Mission / Vision"
        helperText="Paste any existing mission or vision language you want the framework to honor and refine. Leave blank for fresh generation."
      >
        <AutoExpandTextarea
          value={formData.existingMissionVision}
          onChange={(e) => updateField('existingMissionVision', e.target.value)}
          placeholder="e.g., We exist to give professional copywriters the AI tools they deserve..."
          className={inputClasses}
          disabled={isGenerating}
          minHeight={60}
          maxHeight={120}
          maxLength={500}
        />
      </FormField>

      <FormField
        label="Tone Preference"
        required
        helperText="The overall tone the framework's content should convey."
        strategicHelp="Tone shapes how your brand 'sounds' across every touchpoint. The framework itself is professional consulting language, but the taglines, pitches, and key messages will match your tone preference."
      >
        <select
          value={formData.tonePreference}
          onChange={(e) => updateField('tonePreference', e.target.value)}
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
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: STEP 3 — REVIEW & GENERATE
  // ═══════════════════════════════════════════════════════════

  const renderStep3 = () => (
    <div className="space-y-5">
      {/* Input summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Review Your Inputs
        </h3>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
          <SummaryRow label="Brand" value={formData.brandName} />
          <SummaryRow label="Industry" value={formData.industry} />
          <SummaryRow label="Primary Audience" value={formData.primaryAudience} truncate />
          {formData.secondaryAudience && (
            <SummaryRow label="Secondary Audience" value={formData.secondaryAudience} truncate />
          )}
          <SummaryRow label="Key Problem" value={formData.keyProblem} truncate />
          <SummaryRow label="Differentiators" value={formData.differentiators} truncate />
          {formData.competitors && (
            <SummaryRow label="Competitors" value={formData.competitors} truncate />
          )}
          {formData.companyValues && (
            <SummaryRow label="Values" value={formData.companyValues} truncate />
          )}
          {formData.existingMissionVision && (
            <SummaryRow label="Existing Mission/Vision" value={formData.existingMissionVision} truncate />
          )}
          <SummaryRow label="Tone" value={formData.tonePreference} />
        </div>
      </div>

      {/* Brand Voice toggle */}
      {hasBrandVoice && (
        <div className="p-4 border border-gray-200 rounded-lg">
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
                Infuse {activeProject?.brandVoice?.brandName}&apos;s existing brand guidelines
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Persona selector */}
      {personas.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">
            Target Persona (Optional)
          </label>
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
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: GENERATED OUTPUT
  // ═══════════════════════════════════════════════════════════

  /** Section IDs used for clipboard copy targeting */
  const FRAMEWORK_SECTIONS = [
    { id: 'foundation', label: '1. Foundation' },
    { id: 'positioning', label: '2. Positioning' },
    { id: 'messaging-pillar', label: '3. Messaging Pillars' },
    { id: 'audience', label: '4. Audience Messaging' },
    { id: 'expression', label: '5. Expression Layer' },
  ];

  const renderOutput = () => (
    <div className="space-y-4">
      {/* Success header */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">
              Brand Messaging Framework Generated
            </p>
            <p className="text-xs text-green-700 mt-1">
              Your framework is in the editor. Use the buttons below to copy individual sections or the full framework.
            </p>
          </div>
        </div>
      </div>

      {/* Section copy buttons */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Copy Sections
        </p>
        <div className="grid grid-cols-1 gap-2">
          {FRAMEWORK_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-900">
                {section.label}
              </span>
              <CopyButton
                sectionId={section.id}
                copiedSection={copiedSection}
                onCopy={handleCopySection}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Copy full framework */}
      <button
        onClick={handleCopyFullFramework}
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
            Full Framework Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy Full Framework
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
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{TEMPLATE_META.name}</h2>
              <p className="text-sm text-amber-100 mt-0.5">
                {TEMPLATE_META.description}
              </p>
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
          <>
            {/* Wizard progress */}
            <WizardProgress
              currentStep={currentStep}
              completedSteps={completedSteps}
            />

            {/* Step title */}
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {currentStep === 0 && 'Company Foundation'}
                {currentStep === 1 && 'Strategic Positioning'}
                {currentStep === 2 && 'Review & Generate'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {currentStep === 0 &&
                  'Tell us about your brand, audience, and the problem you solve.'}
                {currentStep === 1 &&
                  'Define what makes you different and how you want to sound.'}
                {currentStep === 2 &&
                  'Review your inputs, then generate the complete framework.'}
              </p>
            </div>

            {/* Error display */}
            {generationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{generationError}</p>
              </div>
            )}

            {/* Wizard step content */}
            {currentStep === 0 && renderStep1()}
            {currentStep === 1 && renderStep2()}
            {currentStep === 2 && renderStep3()}
          </>
        )}
      </div>

      {/* Footer with navigation / action buttons */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        {generatedHTML ? (
          /* Post-generation: just the close button */
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
          <div className="flex gap-2">
            {/* Back button (steps 1 & 2) */}
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                disabled={isGenerating}
                className={cn(
                  'px-4 py-2.5 rounded-lg font-medium text-sm flex-shrink-0',
                  'border border-gray-300 text-gray-700 bg-white',
                  'hover:bg-gray-50 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-1'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {/* Next / Generate button */}
            {currentStep < 2 ? (
              <button
                onClick={handleNext}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-medium text-sm text-white',
                  'bg-amber-500 hover:bg-amber-600 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                  'flex items-center justify-center gap-2'
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
                  'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                  'flex items-center justify-center gap-2',
                  isGenerating && 'aiworx-gradient-animated cursor-wait',
                  !isGenerating &&
                    'bg-amber-500 hover:bg-amber-600 transition-colors'
                )}
              >
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-1">
                    <AIWorxButtonLoader />
                    <span className="text-xs">Generating framework...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Framework
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Summary row in the review step — shows label and value
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
  const displayValue = truncate && value.length > 120
    ? value.slice(0, 120) + '...'
    : value;

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
