/**
 * @file components/workspace/BrandCheck.tsx
 * @description Brand Check right-sidebar tool
 *
 * Analyzes the active editor's text (or the user's selection, when present)
 * against the active project's assigned brand voice. Renders the structured
 * JSON analysis as discrete visual sections (never as a raw JSON blob),
 * with an Overall Alignment badge, matches, misalignments, missing elements,
 * and recommendations.
 *
 * When the user clicks "Rewrite to Fix Issues", the tool calls the rewrite
 * endpoint and renders a stacked (Original vs Rewrite) comparison. The
 * comparison is stacked — not side-by-side — because the right sidebar is
 * only ~320px wide; see "Known Limitations" in the Part 2 completion report.
 *
 * Pattern: mirrors ToneShifter / CompetitiveAnalysis (AIWorxButtonLoader,
 * lucide-react icons, cn for Tailwind). Rewrite acceptance uses
 * lib/editor-utils.insertTextAtSelection — same function ToneShifter uses.
 *
 * @example
 * ```tsx
 * <BrandCheck editor={editorInstance} />
 * ```
 */

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  X,
  Copy,
  ClipboardCheck,
  RotateCcw,
  Check,
  AlertTriangle,
  Circle,
  Wand2,
  Volume2,
  ArrowLeft,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
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
import { BRAND_VOICE_PANEL_ID } from '@/components/workspace/BrandVoiceSlideOut';

// ============================================================================
// Types (mirror /api/brand-check response shape)
// ============================================================================

type OverallAlignment = 'Strong' | 'Moderate' | 'Weak' | 'Off-Brand';

interface BrandCheckAnalysis {
  overallAlignment: OverallAlignment;
  alignmentScore: number;
  summary: string;
  matches: string[];
  misalignments: string[];
  missingElements: string[];
  recommendations: string[];
}

interface BrandCheckProps {
  editor: Editor | null;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Color styling for each alignment bucket. Tailwind pairs background / border
 * / text for the pill badge plus the corresponding icon.
 */
const ALIGNMENT_STYLES: Record<
  OverallAlignment,
  { pill: string; icon: React.ComponentType<{ className?: string }>; iconClass: string }
> = {
  Strong: {
    pill: 'bg-green-100 text-green-800 border-green-300',
    icon: Check,
    iconClass: 'text-green-700',
  },
  Moderate: {
    pill: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Circle,
    iconClass: 'text-yellow-700',
  },
  Weak: {
    pill: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertTriangle,
    iconClass: 'text-orange-700',
  },
  'Off-Brand': {
    pill: 'bg-red-100 text-red-800 border-red-300',
    icon: X,
    iconClass: 'text-red-700',
  },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract plain text from the editor, preferring the user's current selection
 * when available. Returns an empty string if the editor has no content.
 *
 * Used for (a) the pre-analyze preview and (b) the analysis API request body.
 * The analysis endpoint is a diagnostic — plain text is the right input shape
 * because we don't want the model distracted by tag noise when identifying
 * brand-voice issues.
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
 * (already serialized by lib/editor-utils.getEditorSelection and cached in the
 * workspace store) when available. Falls back to editor.getHTML() for the
 * whole document.
 *
 * Used for the REWRITE flow only — we send HTML so Claude can preserve the
 * input's tag structure (headings, paragraphs, lists, inline formatting) when
 * returning the rewritten copy.
 */
function getEditorHtml(editor: Editor | null, selectedHTML: string | null): string {
  if (selectedHTML && selectedHTML.trim().length > 0) {
    return selectedHTML;
  }
  if (!editor) return '';
  return editor.getHTML();
}

/**
 * Strip HTML tags for plain-text clipboard output.
 *
 * The Copy Rewrite button writes plain text to the clipboard (per spec) so
 * pasting into email, Slack, Notes, or terminal yields clean prose without
 * leaking tag markup. Mirrors the CompetitiveAnalysis "Copy Analysis" pattern.
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
 * Serialize the active brand voice into the payload shape expected by both
 * /api/brand-check and /api/brand-check-rewrite.
 */
function serializeBrandVoice(brandVoice: {
  brandName: string;
  brandTone: string;
  approvedPhrases?: string[];
  forbiddenWords?: string[];
  brandValues?: string[];
  missionStatement?: string;
  writing_samples?: string[];
}) {
  return {
    brandName: brandVoice.brandName,
    brandTone: brandVoice.brandTone ?? '',
    approvedPhrases: Array.isArray(brandVoice.approvedPhrases) ? brandVoice.approvedPhrases : [],
    forbiddenWords: Array.isArray(brandVoice.forbiddenWords) ? brandVoice.forbiddenWords : [],
    brandValues: Array.isArray(brandVoice.brandValues) ? brandVoice.brandValues : [],
    missionStatement: brandVoice.missionStatement ?? '',
    writing_samples: Array.isArray(brandVoice.writing_samples) ? brandVoice.writing_samples : [],
  };
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * List card used for Matches / Misalignments / Missing Elements / Recommendations.
 */
function BulletSection({
  title,
  icon: Icon,
  items,
  accent,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  accent: 'green' | 'red' | 'amber' | 'blue';
}) {
  if (items.length === 0) return null;

  const accentClasses: Record<typeof accent, { header: string; bullet: string }> = {
    green: { header: 'text-green-700', bullet: 'bg-green-500' },
    red: { header: 'text-red-700', bullet: 'bg-red-500' },
    amber: { header: 'text-amber-700', bullet: 'bg-amber-500' },
    blue: { header: 'text-blue-700', bullet: 'bg-blue-500' },
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', accentClasses[accent].header)}>
        <Icon className="w-3.5 h-3.5" />
        <span>
          {title} ({items.length})
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 bg-white border border-gray-200 rounded-lg p-3">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex items-start gap-2 text-sm text-apple-text-dark">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2',
                accentClasses[accent].bullet
              )}
              aria-hidden="true"
            />
            <span className="flex-1 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Alignment pill shown at the top of the analysis result.
 */
function AlignmentBadge({
  alignment,
  score,
}: {
  alignment: OverallAlignment;
  score: number;
}) {
  const style = ALIGNMENT_STYLES[alignment];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold',
        style.pill
      )}
    >
      <Icon className={cn('w-4 h-4', style.iconClass)} />
      <span>{alignment}</span>
      <span className="text-xs font-medium opacity-80">({score}/100)</span>
    </div>
  );
}

/**
 * Empty state shown when the active project has no brand voice assigned.
 * Includes a direct CTA that opens the Brand Voice slide-out.
 */
function NoBrandVoiceState() {
  const { openSlideOut } = useSlideOutActions();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">Brand Check</h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Check your copy against the active project's brand voice
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-900">
          <Volume2 className="w-5 h-5" />
          <span className="text-sm font-semibold">No Brand Voice selected</span>
        </div>
        <p className="text-sm text-blue-800 leading-relaxed">
          Brand Check compares your copy against the brand voice assigned to
          the active project. Set one up to get started.
        </p>
        <button
          onClick={() => openSlideOut(BRAND_VOICE_PANEL_ID)}
          className={cn(
            'inline-flex items-center gap-2 py-2 px-3 rounded-lg',
            'text-sm font-medium text-white',
            'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98]',
            'shadow-sm hover:shadow transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
          )}
        >
          <Volume2 className="w-4 h-4" />
          Set up Brand Voice
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BrandCheck — analyze editor copy against the active project's brand voice.
 */
export function BrandCheck({ editor, className }: BrandCheckProps) {
  const projects = useProjects();
  const activeProjectId = useActiveProjectId();
  const selectedText = useSelectedText();
  const selectedHTML = useSelectedHTML();
  const selectionRange = useSelectionRange();

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const brandVoice = activeProject?.brandVoice ?? null;
  const hasBrandVoice = !!brandVoice?.brandName;

  // Analysis state. We snapshot BOTH plain text and HTML at analyze time:
  //   - analyzedText is what the analysis endpoint saw (diagnostic input)
  //     and what the stacked comparison renders in the "Original" pane.
  //   - analyzedHtml is what we send to the rewrite endpoint so the model
  //     can preserve tags. Keeping them paired here prevents the rewrite
  //     from targeting a different chunk if the user's selection moves
  //     between Analyze and Rewrite clicks.
  const [analysis, setAnalysis] = useState<BrandCheckAnalysis | null>(null);
  const [analyzedText, setAnalyzedText] = useState<string>('');
  const [analyzedHtml, setAnalyzedHtml] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Rewrite state. rewrittenHtml holds the HTML string from
  // /api/brand-check-rewrite; the comparison view renders it via
  // dangerouslySetInnerHTML (same pattern as ToneShifter) and Accept passes
  // it through formatGeneratedContent before inserting into TipTap.
  const [rewrittenHtml, setRewrittenHtml] = useState<string | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [copiedRewrite, setCopiedRewrite] = useState(false);

  const editorText = useMemo(
    () => getEditorText(editor, selectedText),
    [editor, selectedText]
  );
  const hasEditorText = editorText.length > 0;
  const canAnalyze = hasBrandVoice && hasEditorText && !isAnalyzing;

  /**
   * Run brand alignment analysis via /api/brand-check.
   *
   * We capture BOTH the plain text (sent to the analysis endpoint) and the
   * HTML snapshot (held in state for the eventual rewrite call) here so the
   * rewrite always targets the exact same chunk the analysis diagnosed, even
   * if the user's editor selection moves between clicks.
   */
  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze || !brandVoice) return;

    const htmlSnapshot = getEditorHtml(editor, selectedHTML);

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setRewrittenHtml(null);
    setRewriteError(null);

    try {
      const response = await fetch('/api/brand-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editorText,
          brandVoice: serializeBrandVoice(brandVoice),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Brand check failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis as BrandCheckAnalysis);
      setAnalyzedText(editorText);
      setAnalyzedHtml(htmlSnapshot);
      logger.log('✅ Brand check complete:', {
        alignment: data.analysis?.overallAlignment,
        score: data.analysis?.alignmentScore,
        htmlLength: htmlSnapshot.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setAnalysisError(message);
      logger.error('❌ Brand check error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [canAnalyze, brandVoice, editorText, editor, selectedHTML]);

  /**
   * Request a rewrite via /api/brand-check-rewrite.
   *
   * Sends the HTML snapshot captured at analyze time so Claude can preserve
   * the input's tag structure (headings, lists, inline formatting) in the
   * rewrite. Response body is `rewrittenHtml` — raw HTML that the preview
   * renders with dangerouslySetInnerHTML and Accept inserts into TipTap with
   * isHTML: true.
   */
  const handleRewrite = useCallback(async () => {
    if (!analysis || !brandVoice || !analyzedHtml) return;

    setIsRewriting(true);
    setRewriteError(null);
    setRewrittenHtml(null);

    try {
      const response = await fetch('/api/brand-check-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: analyzedHtml,
          brandVoice: serializeBrandVoice(brandVoice),
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
      logger.log('✅ Brand check rewrite complete:', { newLength: newHtml.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setRewriteError(message);
      logger.error('❌ Brand check rewrite error:', err);
    } finally {
      setIsRewriting(false);
    }
  }, [analysis, brandVoice, analyzedHtml]);

  /**
   * Accept the rewrite: insert HTML into the editor at the current selection
   * (replacing it) or, if there is no selection, replace the entire document.
   *
   * We run the HTML through formatGeneratedContent first to sanitize and
   * normalize — same pipeline ToneShifter uses for its Replace Selection flow
   * — then hand it to insertTextAtSelection with isHTML: true so TipTap
   * parses tags instead of inserting them as literal text.
   */
  const handleAcceptRewrite = useCallback(() => {
    if (!editor || !rewrittenHtml) return;

    const formattedHtml = formatGeneratedContent(rewrittenHtml, false);

    if (selectionRange) {
      const success = insertTextAtSelection(editor, formattedHtml, { isHTML: true });
      if (success) {
        logger.log('✅ Brand-aligned rewrite inserted at selection (HTML)');
      } else {
        logger.error('❌ Failed to insert rewrite at selection');
        return;
      }
    } else {
      editor.commands.setContent(formattedHtml);
      logger.log('✅ Brand-aligned rewrite replaced entire document (HTML)');
    }

    setRewrittenHtml(null);
    setAnalysis(null);
    setAnalyzedText('');
    setAnalyzedHtml('');
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
   * Copy the rewrite to the clipboard as plain text.
   *
   * Per spec, this writes tag-stripped prose so pasting into email, Slack,
   * Notes, or a terminal yields clean text (no leaked HTML markup). Mirrors
   * the CompetitiveAnalysis "Copy Analysis" behavior.
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
    setAnalysisError(null);
    setRewrittenHtml(null);
    setRewriteError(null);
    setCopiedRewrite(false);
  }, []);

  // -------------------------------------------------------------------------
  // Render: no brand voice assigned
  // -------------------------------------------------------------------------
  if (!hasBrandVoice) {
    return (
      <div className={cn('flex flex-col gap-5', className)}>
        <NoBrandVoiceState />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: main panel
  // -------------------------------------------------------------------------
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">Brand Check</h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Check your copy against{' '}
          <span className="font-medium text-apple-text-dark">{brandVoice!.brandName}</span>
        </p>
      </div>

      {/* Source preview */}
      {!analysis && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-apple-blue" />
            {selectedText && selectedText.trim().length > 0
              ? `Selected text (${editorText.length} characters)`
              : `Full document (${editorText.length} characters)`}
          </label>
          <div className="bg-apple-gray-bg border border-apple-gray-light rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar">
            {hasEditorText ? (
              <p className="text-sm text-apple-text-dark whitespace-pre-wrap">{editorText}</p>
            ) : (
              <p className="text-xs text-apple-text-light italic">
                Write or paste copy in the editor, or highlight a passage, then click Check.
              </p>
            )}
          </div>
        </div>
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
          {/* Alignment badge */}
          <div>
            <AlignmentBadge
              alignment={analysis.overallAlignment}
              score={analysis.alignmentScore}
            />
          </div>

          {/* Summary */}
          {analysis.summary && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-apple-text-light">
                Summary
              </div>
              <p className="text-sm text-apple-text-dark leading-relaxed bg-white border border-gray-200 rounded-lg p-3">
                {analysis.summary}
              </p>
            </div>
          )}

          {/* Structured sections */}
          <BulletSection
            title="What matches"
            icon={Check}
            items={analysis.matches}
            accent="green"
          />
          <BulletSection
            title="Misalignments"
            icon={AlertTriangle}
            items={analysis.misalignments}
            accent="red"
          />
          <BulletSection
            title="Missing elements"
            icon={Circle}
            items={analysis.missingElements}
            accent="amber"
          />
          <BulletSection
            title="Recommendations"
            icon={Sparkles}
            items={analysis.recommendations}
            accent="blue"
          />

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

        </div>
      )}

      {/* Rewrite comparison (stacked, not side-by-side — sidebar is ~320px) */}
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

          {/* Original — render the HTML snapshot so headings, lists, and inline
              formatting show up in the preview (not as raw plain text). Same
              prose styling the CompetitiveAnalysis result uses. */}
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

          {/* Rewrite — same HTML rendering pattern as ToneShifter's result preview. */}
          <div className="flex flex-col gap-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
              Brand-aligned Rewrite
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

      {/* ═══ Sticky primary action ═══
          States:
          - Pre-analysis → Check Brand Alignment.
          - Analysis shown, no rewrite yet → Rewrite to Fix Issues + New Check.
          - Rewrite comparison → bar hidden; the comparison view above owns
            Accept Rewrite / Copy Rewrite / Keep Original so those contextual
            actions stay grouped with the rewrite they act on. */}
      {!analysis && (
        <StickyActionBar>
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={cn(
              'w-full py-3 px-4 rounded-lg',
              'font-medium text-sm text-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'flex items-center justify-center gap-2',
              isAnalyzing && 'aiworx-gradient-animated cursor-wait',
              !isAnalyzing && canAnalyze && 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200',
              !canAnalyze && !isAnalyzing && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
            )}
          >
            {isAnalyzing ? (
              <AIWorxButtonLoader />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Check Brand Alignment
              </>
            )}
          </button>
        </StickyActionBar>
      )}

      {analysis && !rewrittenHtml && (
        <StickyActionBar>
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
                !isRewriting && 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200'
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
              onClick={handleNewAnalysis}
              className={cn(
                'w-full py-2 px-3 rounded-lg',
                'text-sm font-medium text-gray-600',
                'border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
                'flex items-center justify-center gap-2'
              )}
            >
              <RotateCcw className="w-4 h-4" />
              New Check
            </button>
          </div>
        </StickyActionBar>
      )}
    </div>
  );
}
