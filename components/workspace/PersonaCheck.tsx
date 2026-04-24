/**
 * @file components/workspace/PersonaCheck.tsx
 * @description Persona Check right-sidebar tool
 *
 * Analyzes the active editor's text (or the user's selection, when present)
 * against a persona the user picks from the dropdown at the top of the
 * panel. Renders the structured JSON analysis as discrete visual sections
 * (never as a raw JSON blob), with an Overall Alignment badge, pain-points
 * addressed vs. missed, a language-match rating, emotional territory
 * observations, and numbered recommendations (issue / suggestion / example).
 *
 * When the user clicks "Rewrite to Fix Issues", the tool calls the rewrite
 * endpoint and renders a stacked (Original vs Rewrite) comparison — same
 * layout as BrandCheck because the right sidebar is only ~320px wide.
 *
 * Persona Check is a sibling of BrandCheck and reuses its HTML-preservation
 * pipeline verbatim:
 *   - Client sends editor.getHTML() (selection slice when present, full doc
 *     otherwise) to the rewrite endpoint.
 *   - analyzedHtml is snapshotted at Analyze time so Rewrite targets the
 *     exact chunk that was diagnosed.
 *   - Rewrite response is an HTML string.
 *   - Preview renders HTML via dangerouslySetInnerHTML inside a prose-styled
 *     container.
 *   - Accept Rewrite runs formatGeneratedContent(rewrittenHtml, false) then
 *     insertTextAtSelection(editor, formattedHtml, { isHTML: true }).
 *   - Copy Rewrite uses htmlToPlainText(rewrittenHtml) for clipboard writes.
 *
 * @example
 * ```tsx
 * <PersonaCheck editor={editorInstance} />
 * ```
 */

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserCheck,
  Sparkles,
  X,
  Copy,
  ClipboardCheck,
  RotateCcw,
  Check,
  AlertTriangle,
  Circle,
  Wand2,
  Users,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import { insertTextAtSelection } from '@/lib/editor-utils';
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
import {
  useProjects,
  useActiveProjectId,
  useSelectedText,
  useSelectedHTML,
  useSelectionRange,
} from '@/lib/stores/workspaceStore';
import { useSlideOutActions } from '@/lib/stores/slideOutStore';
import { PERSONAS_PANEL_ID } from '@/components/workspace/PersonasSlideOut';
import type { Persona } from '@/lib/types/project';

// ============================================================================
// Types (mirror /api/persona-check response shape)
// ============================================================================

type OverallScore =
  | 'Strongly Aligned'
  | 'Moderately Aligned'
  | 'Weakly Aligned'
  | 'Misaligned';

type LanguageMatchRating = 'Strong' | 'Moderate' | 'Weak';

interface PersonaCheckRecommendation {
  issue: string;
  suggestion: string;
  example?: string;
}

interface PersonaCheckAnalysis {
  overallScore: OverallScore;
  summary: string;
  painPointsAddressed: {
    addressed: string[];
    missed: string[];
  };
  languageMatch: {
    rating: LanguageMatchRating;
    observations: string[];
  };
  emotionalTerritory: string[];
  recommendations: PersonaCheckRecommendation[];
}

interface PersonaCheckProps {
  editor: Editor | null;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Color styling for each overall-score bucket. Reuses the exact Tailwind
 * tokens from BrandCheck's ALIGNMENT_STYLES so the two panels look like
 * siblings (green / yellow / orange / red).
 */
const SCORE_STYLES: Record<
  OverallScore,
  { pill: string; icon: React.ComponentType<{ className?: string }>; iconClass: string }
> = {
  'Strongly Aligned': {
    pill: 'bg-green-100 text-green-800 border-green-300',
    icon: Check,
    iconClass: 'text-green-700',
  },
  'Moderately Aligned': {
    pill: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Circle,
    iconClass: 'text-yellow-700',
  },
  'Weakly Aligned': {
    pill: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertTriangle,
    iconClass: 'text-orange-700',
  },
  Misaligned: {
    pill: 'bg-red-100 text-red-800 border-red-300',
    icon: X,
    iconClass: 'text-red-700',
  },
};

/**
 * Smaller badge colors for the Language Match rating. Reuses the same color
 * ramp as SCORE_STYLES but at a pill-only size (no icon).
 */
const LANGUAGE_RATING_STYLES: Record<LanguageMatchRating, string> = {
  Strong: 'bg-green-100 text-green-800 border-green-300',
  Moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Weak: 'bg-orange-100 text-orange-800 border-orange-300',
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract plain text from the editor, preferring the user's current selection
 * when available. Mirrors BrandCheck.getEditorText exactly.
 */
function getEditorText(editor: Editor | null, selectedText: string | null): string {
  if (selectedText && selectedText.trim().length > 0) {
    return selectedText.trim();
  }
  if (!editor) return '';
  return editor.getText().trim();
}

/**
 * Extract HTML from the editor, preferring the user's current selection slice
 * when available. Used for the REWRITE flow only — we send HTML so Claude can
 * preserve the input's tag structure. Mirrors BrandCheck.getEditorHtml.
 */
function getEditorHtml(editor: Editor | null, selectedHTML: string | null): string {
  if (selectedHTML && selectedHTML.trim().length > 0) {
    return selectedHTML;
  }
  if (!editor) return '';
  return editor.getHTML();
}

/**
 * Count words in a plain-text string. Used by the selection indicator at the
 * top of the panel: "✓ N words selected".
 */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Strip HTML tags for plain-text clipboard output.
 *
 * The Copy Rewrite button writes plain text to the clipboard so pasting into
 * email, Slack, Notes, or terminal yields clean prose without leaking tag
 * markup. Mirrors BrandCheck.htmlToPlainText exactly.
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|br|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Serialize a Persona into the payload shape expected by both
 * /api/persona-check and /api/persona-check-rewrite.
 *
 * Drops id/timestamps/photoUrl — the model only needs the content fields.
 */
function serializePersona(persona: Persona) {
  return {
    name: persona.name,
    demographics: persona.demographics ?? '',
    psychographics: persona.psychographics ?? '',
    painPoints: persona.painPoints ?? '',
    languagePatterns: persona.languagePatterns ?? '',
    goals: persona.goals ?? '',
  };
}

/**
 * Serialize the full analysis result to plain text for clipboard writes.
 *
 * Used by the "Copy Analysis" secondary button — produces a human-readable
 * outline of the report (overall score, summary, pain points, language
 * match, emotional territory, recommendations) suitable for pasting into
 * email, Slack, Notes, etc.
 */
function analysisToPlainText(
  analysis: PersonaCheckAnalysis,
  personaName: string
): string {
  const lines: string[] = [];
  lines.push(`Persona Check — ${personaName}`);
  lines.push(`Overall: ${analysis.overallScore}`);
  if (analysis.summary) {
    lines.push('');
    lines.push(`Summary: ${analysis.summary}`);
  }

  const { addressed, missed } = analysis.painPointsAddressed;
  if (addressed.length > 0 || missed.length > 0) {
    lines.push('');
    lines.push('Pain Points Addressed:');
    if (addressed.length > 0) {
      lines.push('  Addressed:');
      addressed.forEach((item) => lines.push(`    - ${item}`));
    }
    if (missed.length > 0) {
      lines.push('  Missed:');
      missed.forEach((item) => lines.push(`    - ${item}`));
    }
  }

  if (analysis.languageMatch.observations.length > 0) {
    lines.push('');
    lines.push(`Language Match: ${analysis.languageMatch.rating}`);
    analysis.languageMatch.observations.forEach((obs) => lines.push(`  - ${obs}`));
  }

  if (analysis.emotionalTerritory.length > 0) {
    lines.push('');
    lines.push('Emotional Territory:');
    analysis.emotionalTerritory.forEach((obs) => lines.push(`  - ${obs}`));
  }

  if (analysis.recommendations.length > 0) {
    lines.push('');
    lines.push('Recommendations:');
    analysis.recommendations.forEach((rec, index) => {
      lines.push(`  ${index + 1}. ${rec.issue}`);
      if (rec.suggestion) lines.push(`     Suggestion: ${rec.suggestion}`);
      if (rec.example) lines.push(`     Example: ${rec.example}`);
    });
  }

  return lines.join('\n');
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Overall-score pill shown at the top of the analysis result.
 */
function ScoreBadge({ score }: { score: OverallScore }) {
  const style = SCORE_STYLES[score];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold',
        style.pill
      )}
    >
      <Icon className={cn('w-4 h-4', style.iconClass)} />
      <span>{score}</span>
    </div>
  );
}

/**
 * Checkmark / caution sub-list used inside the Pain Points Addressed section.
 */
function PainPointList({
  items,
  variant,
}: {
  items: string[];
  variant: 'addressed' | 'missed';
}) {
  if (items.length === 0) return null;

  const isAddressed = variant === 'addressed';
  const Icon = isAddressed ? Check : AlertTriangle;
  const headerLabel = isAddressed ? 'Addressed' : 'Missed';
  const headerClass = isAddressed ? 'text-green-700' : 'text-amber-700';
  const iconClass = isAddressed ? 'text-green-600' : 'text-amber-600';

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide',
          headerClass
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>
          {headerLabel} ({items.length})
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-lg p-3">
        {items.map((item, index) => (
          <li
            key={`${variant}-${index}`}
            className="flex items-start gap-2 text-sm text-apple-text-dark"
          >
            <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', iconClass)} />
            <span className="flex-1 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Simple bullet list used for Emotional Territory + Language observations.
 */
function BulletList({ items, accent }: { items: string[]; accent: 'blue' | 'violet' }) {
  if (items.length === 0) return null;

  const bulletClass = accent === 'blue' ? 'bg-blue-500' : 'bg-violet-500';

  return (
    <ul className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-lg p-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm text-apple-text-dark">
          <span
            className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2', bulletClass)}
            aria-hidden="true"
          />
          <span className="flex-1 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Numbered recommendations list. Each row renders:
 *   - issue (bold title line)
 *   - suggestion (body)
 *   - example (optional, rendered as a highlighted before/after callout)
 */
function RecommendationsList({ items }: { items: PersonaCheckRecommendation[] }) {
  if (items.length === 0) return null;

  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((rec, index) => (
        <li
          key={index}
          className="flex gap-3 bg-white border border-gray-200 rounded-lg p-3"
        >
          <div
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full',
              'bg-blue-50 border border-blue-200 text-blue-700',
              'flex items-center justify-center text-xs font-semibold'
            )}
            aria-hidden="true"
          >
            {index + 1}
          </div>
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            {rec.issue && (
              <div className="text-sm font-semibold text-apple-text-dark leading-snug">
                {rec.issue}
              </div>
            )}
            {rec.suggestion && (
              <div className="text-sm text-apple-text-dark leading-relaxed">
                {rec.suggestion}
              </div>
            )}
            {rec.example && (
              <div className="mt-1 text-sm text-blue-900 leading-relaxed italic bg-blue-50 border-l-2 border-blue-400 pl-2.5 py-1.5 pr-2 rounded-r">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide not-italic mr-1.5">
                  Example:
                </span>
                {rec.example}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Empty state shown when the active project has no personas.
 * Includes a direct CTA that opens the Personas slide-out.
 */
function NoPersonasState() {
  const { openSlideOut } = useSlideOutActions();

  return (
    <div className="flex flex-col items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 text-blue-900">
        <Users className="w-5 h-5" />
        <span className="text-sm font-semibold">No personas available</span>
      </div>
      <p className="text-sm text-blue-800 leading-relaxed">
        Persona Check needs at least one persona in the active project. Add a
        persona to get started.
      </p>
      <button
        onClick={() => openSlideOut(PERSONAS_PANEL_ID)}
        className={cn(
          'inline-flex items-center gap-2 py-2 px-3 rounded-lg',
          'text-sm font-medium text-white',
          'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98]',
          'shadow-sm hover:shadow transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
        )}
      >
        <Users className="w-4 h-4" />
        Set up Personas
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PersonaCheck — analyze editor copy against a persona the user picks from
 * the active project's personas list.
 */
export function PersonaCheck({ editor, className }: PersonaCheckProps) {
  const projects = useProjects();
  const activeProjectId = useActiveProjectId();
  const selectedText = useSelectedText();
  const selectedHTML = useSelectedHTML();
  const selectionRange = useSelectionRange();

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const personas = useMemo<Persona[]>(
    () => activeProject?.personas ?? [],
    [activeProject]
  );
  const hasPersonas = personas.length > 0;

  // Persona selection state (new vs BrandCheck — BrandCheck pulls brandVoice
  // from the active project automatically). A project can have multiple
  // personas, so the user must pick which one to check against.
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  // If the user switches projects (or the personas list changes such that
  // the previously selected persona is gone), clear the selection so the
  // dropdown returns to its placeholder state.
  useEffect(() => {
    if (!selectedPersonaId) return;
    if (!personas.some((p) => p.id === selectedPersonaId)) {
      setSelectedPersonaId(null);
    }
  }, [personas, selectedPersonaId]);

  const selectedPersona = useMemo<Persona | null>(
    () => personas.find((p) => p.id === selectedPersonaId) ?? null,
    [personas, selectedPersonaId]
  );

  // Analysis state. We snapshot BOTH plain text and HTML at analyze time:
  //   - analyzedText is what the analysis endpoint saw (diagnostic input)
  //     and what the stacked comparison renders in the "Original" pane.
  //   - analyzedHtml is what we send to the rewrite endpoint so the model
  //     can preserve tags. Keeping them paired here prevents the rewrite
  //     from targeting a different chunk if the user's selection moves
  //     between Analyze and Rewrite clicks.
  //   - analyzedPersona is a snapshot of the persona at analyze time so the
  //     rewrite always runs against the same target, even if the user
  //     changes the dropdown afterward.
  const [analysis, setAnalysis] = useState<PersonaCheckAnalysis | null>(null);
  const [analyzedText, setAnalyzedText] = useState<string>('');
  const [analyzedHtml, setAnalyzedHtml] = useState<string>('');
  const [analyzedPersona, setAnalyzedPersona] = useState<Persona | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);

  // Rewrite state — mirrors BrandCheck exactly.
  const [rewrittenHtml, setRewrittenHtml] = useState<string | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [copiedRewrite, setCopiedRewrite] = useState(false);

  const editorText = useMemo(
    () => getEditorText(editor, selectedText),
    [editor, selectedText]
  );
  const hasEditorText = editorText.length > 0;
  const wordCount = useMemo(() => countWords(editorText), [editorText]);
  const hasActiveDocument = !!editor;
  const canAnalyze =
    hasActiveDocument && hasEditorText && !!selectedPersona && !isAnalyzing;

  /**
   * Run persona-fit analysis via /api/persona-check.
   *
   * Captures plain text (sent to the analysis endpoint), the HTML snapshot
   * (held for the eventual rewrite call), and the persona snapshot — so the
   * rewrite always targets the exact same chunk diagnosed against the exact
   * same persona, even if the editor selection or dropdown changes between
   * clicks.
   */
  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze || !selectedPersona) return;

    const htmlSnapshot = getEditorHtml(editor, selectedHTML);

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setRewrittenHtml(null);
    setRewriteError(null);
    setCopiedAnalysis(false);

    try {
      const response = await fetch('/api/persona-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editorText,
          persona: serializePersona(selectedPersona),
          personaId: selectedPersona.id,
          projectId: activeProjectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Persona check failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis as PersonaCheckAnalysis);
      setAnalyzedText(editorText);
      setAnalyzedHtml(htmlSnapshot);
      setAnalyzedPersona(selectedPersona);
      logger.log('✅ Persona check complete:', {
        personaName: selectedPersona.name,
        score: data.analysis?.overallScore,
        htmlLength: htmlSnapshot.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setAnalysisError(message);
      logger.error('❌ Persona check error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [canAnalyze, selectedPersona, editorText, editor, selectedHTML, activeProjectId]);

  /**
   * Request a rewrite via /api/persona-check-rewrite.
   *
   * Sends the HTML snapshot captured at analyze time so Claude can preserve
   * the input's tag structure in the rewrite. Response body is rewrittenHtml
   * — raw HTML that the preview renders with dangerouslySetInnerHTML and
   * Accept inserts into TipTap with isHTML: true.
   */
  const handleRewrite = useCallback(async () => {
    if (!analysis || !analyzedPersona || !analyzedHtml) return;

    setIsRewriting(true);
    setRewriteError(null);
    setRewrittenHtml(null);

    try {
      const response = await fetch('/api/persona-check-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: analyzedHtml,
          persona: serializePersona(analyzedPersona),
          personaId: analyzedPersona.id,
          projectId: activeProjectId,
          analysis,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Rewrite failed');
      }

      const data = await response.json();
      const newHtml = typeof data.rewrittenHtml === 'string' ? data.rewrittenHtml : '';
      if (!newHtml) {
        throw new Error('Rewrite returned empty HTML');
      }
      setRewrittenHtml(newHtml);
      logger.log('✅ Persona check rewrite complete:', { newLength: newHtml.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setRewriteError(message);
      logger.error('❌ Persona check rewrite error:', err);
    } finally {
      setIsRewriting(false);
    }
  }, [analysis, analyzedPersona, analyzedHtml, activeProjectId]);

  /**
   * Accept the rewrite: insert HTML into the editor at the current selection
   * (replacing it) or, if there is no selection, replace the entire document.
   *
   * Runs the HTML through formatGeneratedContent first to sanitize and
   * normalize, then hands it to insertTextAtSelection with isHTML: true so
   * TipTap parses tags instead of inserting them as literal text. Identical
   * to BrandCheck.handleAcceptRewrite.
   */
  const handleAcceptRewrite = useCallback(() => {
    if (!editor || !rewrittenHtml) return;

    const formattedHtml = formatGeneratedContent(rewrittenHtml, false);

    if (selectionRange) {
      const success = insertTextAtSelection(editor, formattedHtml, { isHTML: true });
      if (success) {
        logger.log('✅ Persona-aligned rewrite inserted at selection (HTML)');
      } else {
        logger.error('❌ Failed to insert rewrite at selection');
        return;
      }
    } else {
      editor.commands.setContent(formattedHtml);
      logger.log('✅ Persona-aligned rewrite replaced entire document (HTML)');
    }

    setRewrittenHtml(null);
    setAnalysis(null);
    setAnalyzedText('');
    setAnalyzedHtml('');
    setAnalyzedPersona(null);
  }, [editor, rewrittenHtml, selectionRange]);

  /**
   * Keep the original — discard the rewrite without touching analysis.
   */
  const handleKeepOriginal = useCallback(() => {
    setRewrittenHtml(null);
    setRewriteError(null);
    setCopiedRewrite(false);
  }, []);

  /**
   * Copy the analysis to the clipboard as plain text.
   */
  const handleCopyAnalysis = useCallback(async () => {
    if (!analysis || !analyzedPersona) return;
    try {
      const plainText = analysisToPlainText(analysis, analyzedPersona.name);
      await navigator.clipboard.writeText(plainText);
      setCopiedAnalysis(true);
      setTimeout(() => setCopiedAnalysis(false), 2000);
    } catch (err) {
      logger.error('Failed to copy analysis:', err);
    }
  }, [analysis, analyzedPersona]);

  /**
   * Copy the rewrite to the clipboard as plain text.
   *
   * Writes tag-stripped prose so pasting into email, Slack, Notes, or a
   * terminal yields clean text. Mirrors BrandCheck.handleCopyRewrite exactly.
   */
  const handleCopyRewrite = useCallback(async () => {
    if (!rewrittenHtml) return;
    try {
      const plainText = htmlToPlainText(rewrittenHtml);
      await navigator.clipboard.writeText(plainText);
      setCopiedRewrite(true);
      setTimeout(() => setCopiedRewrite(false), 2000);
    } catch (err) {
      logger.error('Failed to copy rewrite:', err);
    }
  }, [rewrittenHtml]);

  /**
   * Reset everything and return to the pre-analysis state.
   */
  const handleNewAnalysis = useCallback(() => {
    setAnalysis(null);
    setAnalyzedText('');
    setAnalyzedHtml('');
    setAnalyzedPersona(null);
    setAnalysisError(null);
    setRewrittenHtml(null);
    setRewriteError(null);
    setCopiedRewrite(false);
    setCopiedAnalysis(false);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">Persona Check</h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Select copy in your document, choose a persona, then click Analyze.
          Persona Check will evaluate whether the copy speaks to that audience.
        </p>
      </div>

      {/* Persona selector (pre-analysis only — once analysis is shown it's
          locked to analyzedPersona so the rewrite stays consistent) */}
      {!analysis && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="persona-check-select"
            className="text-xs font-semibold uppercase tracking-wide text-apple-text-dark flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-apple-blue" />
            Check against which persona?
          </label>
          {hasPersonas ? (
            <select
              id="persona-check-select"
              value={selectedPersonaId ?? ''}
              onChange={(event) => setSelectedPersonaId(event.target.value || null)}
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'text-sm text-apple-text-dark bg-white',
                'border border-apple-gray-light hover:border-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-1 focus:border-apple-blue',
                'transition-colors duration-150'
              )}
            >
              <option value="">Select a persona…</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
          ) : (
            <NoPersonasState />
          )}
        </div>
      )}

      {/* Selection indicator */}
      {!analysis && hasPersonas && (
        <div
          className={cn(
            'flex items-center gap-2 text-sm px-3 py-2 rounded-lg border',
            hasEditorText
              ? 'text-green-800 bg-green-50 border-green-200'
              : 'text-apple-text-light bg-apple-gray-bg border-apple-gray-light'
          )}
        >
          {hasEditorText ? (
            <>
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="font-medium">
                {wordCount} {wordCount === 1 ? 'word' : 'words'} selected
              </span>
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 text-apple-text-light flex-shrink-0" />
              <span>Select text in your document to analyze</span>
            </>
          )}
        </div>
      )}

      {/* Analyze button */}
      {!analysis && hasPersonas && (
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={cn(
            'w-full py-3 px-4 rounded-lg',
            'font-medium text-sm text-white',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'flex items-center justify-center gap-2',
            isAnalyzing && 'aiworx-gradient-animated cursor-wait',
            !isAnalyzing &&
              canAnalyze &&
              'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200',
            !canAnalyze &&
              !isAnalyzing &&
              'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
          )}
        >
          {isAnalyzing ? (
            <AIWorxButtonLoader />
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              Analyze Copy
            </>
          )}
        </button>
      )}

      {/* Analyze error */}
      {analysisError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{analysisError}</p>
          </div>
          <button
            onClick={() => setAnalysisError(null)}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Analysis result */}
      {analysis && !rewrittenHtml && (
        <div className="flex flex-col gap-4">
          {/* Persona reminder (the result is locked to this persona) */}
          {analyzedPersona && (
            <div className="flex items-center gap-2 text-xs text-apple-text-light">
              <Users className="w-3.5 h-3.5" />
              <span>
                Checked against{' '}
                <span className="font-medium text-apple-text-dark">
                  {analyzedPersona.name}
                </span>
              </span>
            </div>
          )}

          {/* Overall score badge */}
          <div>
            <ScoreBadge score={analysis.overallScore} />
          </div>

          {/* Summary */}
          {analysis.summary && (
            <p className="text-sm text-apple-text-dark leading-relaxed bg-white border border-gray-200 rounded-lg p-3">
              {analysis.summary}
            </p>
          )}

          {/* Pain Points Addressed — render section header if either sub-list
              has items; hide the whole section when both are empty. */}
          {(analysis.painPointsAddressed.addressed.length > 0 ||
            analysis.painPointsAddressed.missed.length > 0) && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-apple-text-light">
                Pain Points Addressed
              </div>
              <div className="flex flex-col gap-2.5">
                <PainPointList
                  items={analysis.painPointsAddressed.addressed}
                  variant="addressed"
                />
                <PainPointList
                  items={analysis.painPointsAddressed.missed}
                  variant="missed"
                />
              </div>
            </div>
          )}

          {/* Language Match */}
          {(analysis.languageMatch.observations.length > 0 ||
            analysis.languageMatch.rating) && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-apple-text-light">
                  Language Match
                </div>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold',
                    LANGUAGE_RATING_STYLES[analysis.languageMatch.rating]
                  )}
                >
                  {analysis.languageMatch.rating}
                </span>
              </div>
              <BulletList items={analysis.languageMatch.observations} accent="violet" />
            </div>
          )}

          {/* Emotional Territory */}
          {analysis.emotionalTerritory.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-apple-text-light">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Emotional Territory</span>
              </div>
              <BulletList items={analysis.emotionalTerritory} accent="blue" />
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-apple-text-light">
                Specific Recommendations
              </div>
              <RecommendationsList items={analysis.recommendations} />
            </div>
          )}

          {/* Rewrite error */}
          {rewriteError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Rewrite error</p>
                <p className="text-xs text-red-700 mt-1">{rewriteError}</p>
              </div>
              <button
                onClick={() => setRewriteError(null)}
                className="text-red-600 hover:text-red-800 focus:outline-none"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleRewrite}
              disabled={isRewriting}
              className={cn(
                'w-full py-2.5 px-3 rounded-lg',
                'text-sm font-medium text-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'flex items-center justify-center gap-2',
                isRewriting && 'aiworx-gradient-animated cursor-wait',
                !isRewriting &&
                  'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200'
              )}
            >
              {isRewriting ? (
                <AIWorxButtonLoader />
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Rewrite to Fix Issues
                </>
              )}
            </button>
            <button
              onClick={handleCopyAnalysis}
              className={cn(
                'w-full py-2 px-3 rounded-lg',
                'text-sm font-medium',
                'flex items-center justify-center gap-2',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                copiedAnalysis
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
            >
              {copiedAnalysis ? (
                <>
                  <ClipboardCheck className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Analysis
                </>
              )}
            </button>
            <button
              onClick={handleNewAnalysis}
              className={cn(
                'w-full py-1.5 px-3 rounded-lg',
                'text-sm font-medium text-gray-600 hover:text-gray-900',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
                'flex items-center justify-center gap-1.5'
              )}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Analysis
            </button>
          </div>
        </div>
      )}

      {/* Rewrite comparison (stacked, not side-by-side — sidebar is ~320px).
          Matches BrandCheck's comparison block verbatim for the prose
          container and action buttons so the two tools feel like siblings. */}
      {analysis && rewrittenHtml && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-apple-text-dark">
              <Wand2 className="w-4 h-4 text-apple-blue" />
              <span>Proposed Rewrite</span>
            </div>
            <button
              onClick={handleKeepOriginal}
              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 focus:outline-none"
              title="Back to analysis"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>

          {/* Original — render the HTML snapshot so headings, lists, and
              inline formatting show up in the preview (not as raw plain
              text). Arbitrary selectors match BrandCheck. */}
          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-apple-text-light">
              Original
            </div>
            <div className="bg-apple-gray-bg border border-apple-gray-light rounded-lg p-3 max-h-40 overflow-y-auto custom-scrollbar">
              <div
                className="text-sm text-apple-text-dark prose prose-sm max-w-none
                  [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:first:mt-0
                  [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:first:mt-0
                  [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:first:mt-0
                  [&_p]:my-1.5 [&_p]:leading-relaxed
                  [&_ul]:my-2 [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:pl-5
                  [&_li]:my-1"
                dangerouslySetInnerHTML={{ __html: analyzedHtml || analyzedText }}
              />
            </div>
          </div>

          {/* Rewrite */}
          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Persona-aligned Rewrite
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-48 overflow-y-auto custom-scrollbar">
              <div
                className="text-sm text-apple-text-dark prose prose-sm max-w-none
                  [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:first:mt-0
                  [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:first:mt-0
                  [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:first:mt-0
                  [&_p]:my-1.5 [&_p]:leading-relaxed
                  [&_ul]:my-2 [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:pl-5
                  [&_li]:my-1"
                dangerouslySetInnerHTML={{ __html: rewrittenHtml }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAcceptRewrite}
              disabled={!editor}
              className={cn(
                'w-full py-2.5 px-3 rounded-lg',
                'text-sm font-medium text-white',
                'bg-green-600 hover:bg-green-700 active:scale-[0.98]',
                'shadow-sm hover:shadow transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                'flex items-center justify-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title={
                selectionRange
                  ? 'Replace selected text with the rewrite'
                  : 'Replace entire document with the rewrite'
              }
            >
              <Check className="w-4 h-4" />
              Accept Rewrite
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleCopyRewrite}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg',
                  'text-sm font-medium',
                  'flex items-center justify-center gap-2',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                  copiedRewrite
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
              >
                {copiedRewrite ? (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Rewrite
                  </>
                )}
              </button>
              <button
                onClick={handleKeepOriginal}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg',
                  'text-sm font-medium text-gray-700',
                  'border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
                  'flex items-center justify-center gap-2'
                )}
              >
                <X className="w-4 h-4" />
                Keep Original
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
