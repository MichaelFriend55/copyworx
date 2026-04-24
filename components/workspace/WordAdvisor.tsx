/**
 * @file components/workspace/WordAdvisor.tsx
 * @description MY WORD ADVISOR – right sidebar panel combining dictionary,
 * thesaurus, and copywriting intelligence. Shows a definition, alternative
 * words with rationales, brand voice matching, and persona insights.
 *
 * Users must explicitly click "Analyze Word" to trigger the API call.
 * Text selection in the editor only updates the displayed selection preview.
 */

'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  BookOpenText,
  ArrowUp,
  ArrowDown,
  Minus,
  Check,
  X,
  Sparkles,
  Target,
  User,
  Lightbulb,
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  useSelectedText,
  useSelectionRange,
  useActiveProjectId,
  useProjects,
} from '@/lib/stores/workspaceStore';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import type { Editor } from '@tiptap/react';

// ============================================================================
// Types
// ============================================================================

interface WordAlternative {
  word: string;
  strength: 'stronger' | 'similar' | 'softer';
  rationale: string;
}

interface WordAdvisorResult {
  definition: string;
  alternatives: WordAlternative[];
  brandVoiceMatch?: string;
  personaInsight?: string;
  contextNote: string;
}

interface WordAdvisorProps {
  editor: Editor | null;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract the sentence containing a word from paragraph text.
 * Finds the nearest sentence-ending punctuation (.?!) on either side.
 */
function extractSentence(paragraph: string, word: string): string {
  if (!paragraph || !word) return paragraph || '';

  const wordIndex = paragraph.toLowerCase().indexOf(word.toLowerCase());
  if (wordIndex === -1) return paragraph;

  const sentenceEnders = /[.!?]/;
  let start = wordIndex;
  while (start > 0 && !sentenceEnders.test(paragraph[start - 1])) {
    start--;
  }

  let end = wordIndex + word.length;
  while (end < paragraph.length && !sentenceEnders.test(paragraph[end])) {
    end++;
  }
  if (end < paragraph.length) end++;

  return paragraph.slice(start, end).trim();
}

/**
 * Extract paragraph text from the TipTap editor at the current selection.
 */
function getParagraphFromEditor(editor: Editor, selectionFrom: number): string {
  try {
    const resolvedPos = editor.state.doc.resolve(selectionFrom);
    return resolvedPos.parent.textContent || '';
  } catch {
    return '';
  }
}

// ============================================================================
// Skeleton / Loading UI
// ============================================================================

function AdvisorSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-2 text-sm text-apple-text-light">
        <Sparkles className="w-4 h-4 text-apple-blue animate-spin" />
        <span>Analyzing word choice...</span>
      </div>

      {/* Definition skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-3/4 bg-gray-100 rounded" />
      </div>

      <div className="border-t border-gray-200" />

      {/* Alternatives skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3 rounded-lg border border-gray-100 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded-full" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-14 bg-gray-100 rounded ml-auto" />
            </div>
            <div className="h-3 w-full bg-gray-100 rounded" />
            <div className="h-3 w-2/3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Strength Indicator
// ============================================================================

function StrengthIndicator({ strength }: { strength: WordAlternative['strength'] }) {
  switch (strength) {
    case 'stronger':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
          <ArrowUp className="w-3 h-3" />
          stronger
        </span>
      );
    case 'softer':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
          <ArrowDown className="w-3 h-3" />
          softer
        </span>
      );
    case 'similar':
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
          <Minus className="w-3 h-3" />
          similar
        </span>
      );
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function WordAdvisor({ editor }: WordAdvisorProps) {
  const selectedText = useSelectedText();
  const selectionRange = useSelectionRange();
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();

  const [result, setResult] = useState<WordAdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [appliedWord, setAppliedWord] = useState<string | null>(null);
  const [analyzedWord, setAnalyzedWord] = useState<string | null>(null);

  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const displayedSelection = selectedText?.trim() || '';
  const hasSelection = displayedSelection.length > 0;

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [activeProjectId, projects]);

  /**
   * Build optional brand voice payload from the active project
   */
  const brandVoicePayload = useMemo(() => {
    const bv = activeProject?.brandVoice;
    if (!bv || !bv.brandName) return undefined;
    return {
      personality: bv.brandTone || '',
      tone: bv.brandTone || '',
      values: (bv.brandValues || []).join(', '),
    };
  }, [activeProject]);

  /**
   * Build optional persona payload from the first persona in the project
   */
  const personaPayload = useMemo(() => {
    const personas = activeProject?.personas;
    if (!personas || personas.length === 0) return undefined;
    const p = personas[0];
    return {
      name: p.name || '',
      role: p.demographics || '',
      painPoints: p.painPoints || '',
      decisionCriteria: p.goals || '',
    };
  }, [activeProject]);

  /**
   * Fetch word advisor results – called ONLY when the user clicks "Analyze Word"
   */
  const handleAnalyze = useCallback(async () => {
    if (!editor || !displayedSelection) return;

    const currentRange = selectionRange
      ? { ...selectionRange }
      : null;
    savedSelectionRef.current = currentRange;

    const paragraph = getParagraphFromEditor(editor, currentRange?.from ?? 0);
    const sentence = extractSentence(paragraph, displayedSelection);

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedAlternative(null);
    setAppliedWord(null);
    setAnalyzedWord(displayedSelection);

    try {
      const response = await fetch('/api/word-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: displayedSelection,
          sentence,
          paragraph,
          brandVoice: brandVoicePayload,
          persona: personaPayload,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || `Request failed (${response.status})`);
      }

      const data: WordAdvisorResult = await response.json();
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze word';
      setError(message);
      logger.error('❌ Word advisor fetch failed:', message);
    } finally {
      setLoading(false);
    }
  }, [editor, displayedSelection, selectionRange, brandVoicePayload, personaPayload]);

  /**
   * Apply the selected alternative word to the editor
   */
  const handleApplyWord = useCallback(() => {
    if (!editor || !selectedAlternative || !savedSelectionRef.current) return;

    const { from, to } = savedSelectionRef.current;

    try {
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .insertContent(selectedAlternative)
        .run();

      setAppliedWord(selectedAlternative);
      logger.log('✅ Word replaced:', { original: analyzedWord, replacement: selectedAlternative });
    } catch (err) {
      logger.error('❌ Failed to apply word:', err);
      setError('Failed to replace word in editor.');
    }
  }, [editor, selectedAlternative, analyzedWord]);

  /**
   * Clear and reset state
   */
  const handleClear = useCallback(() => {
    setResult(null);
    setError(null);
    setSelectedAlternative(null);
    setAppliedWord(null);
    setAnalyzedWord(null);
  }, []);

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BookOpenText className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            MY WORD ADVISOR
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Copywriting-smart alternatives with rationales
        </p>
      </div>

      {/* Prompt / instruction state */}
      {!result && !loading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Highlight a word or phrase in your document, then click&nbsp;
            <strong>Analyze Word</strong> below.
          </p>
        </div>
      )}

      {/* Selected word display – always shows current editor selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-apple-blue" />
          Selected
        </label>
        <div className="bg-apple-gray-bg border border-apple-gray-light rounded-lg px-3 py-2">
          <span className={cn(
            'text-sm',
            hasSelection ? 'font-semibold text-apple-text-dark' : 'text-apple-text-light italic'
          )}>
            {hasSelection ? `\u201C${displayedSelection}\u201D` : '(none)'}
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && <AdvisorSkeleton />}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
          <button onClick={handleClear} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Analyzed Word Label */}
          {analyzedWord && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-apple-blue" />
                Analyzed Word
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-apple-text-dark">
                  &ldquo;{analyzedWord}&rdquo;
                </span>
              </div>
            </div>
          )}

          {/* Definition */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
              Definition
            </label>
            <p className="text-sm text-apple-text-dark leading-relaxed">
              {result.definition}
            </p>
          </div>

          <div className="border-t border-gray-200" />

          {/* Alternatives */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
              Alternatives
            </label>
            <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {result.alternatives.map((alt, idx) => {
                const isSelected = selectedAlternative === alt.word;
                return (
                  <button
                    key={`${alt.word}-${idx}`}
                    onClick={() => setSelectedAlternative(isSelected ? null : alt.word)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-1',
                      isSelected
                        ? 'border-apple-blue bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn(
                        'text-sm font-semibold',
                        isSelected ? 'text-apple-blue' : 'text-apple-text-dark'
                      )}>
                        &ldquo;{alt.word}&rdquo;
                      </span>
                      <StrengthIndicator strength={alt.strength} />
                    </div>
                    <p className="text-xs text-apple-text-light leading-relaxed">
                      {alt.rationale}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand Voice Match */}
          {result.brandVoiceMatch && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-apple-blue" />
                  Brand Voice Match
                </label>
                <p className="text-sm text-apple-text-dark leading-relaxed">
                  {result.brandVoiceMatch}
                </p>
              </div>
            </>
          )}

          {/* Persona Insight */}
          {result.personaInsight && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-apple-blue" />
                  Persona Insight
                </label>
                <p className="text-sm text-apple-text-dark leading-relaxed">
                  {result.personaInsight}
                </p>
              </div>
            </>
          )}

          {/* Context Note */}
          {result.contextNote && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  Context Note
                </label>
                <p className="text-sm text-apple-text-light leading-relaxed">
                  {result.contextNote}
                </p>
              </div>
            </>
          )}

          <div className="border-t border-gray-200" />

          {/* Apply Word Button */}
          {appliedWord ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                Replaced with &ldquo;{appliedWord}&rdquo;
              </span>
            </div>
          ) : (
            <button
              onClick={handleApplyWord}
              disabled={!selectedAlternative}
              className={cn(
                'w-full py-2.5 px-4 rounded-lg',
                'font-medium text-sm text-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'transition-all duration-200',
                selectedAlternative
                  ? 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow'
                  : 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
              )}
            >
              {selectedAlternative
                ? `Apply "${selectedAlternative}"`
                : 'Select an alternative to apply'}
            </button>
          )}

          <div className="border-t border-gray-200" />

          {/* Analyze another word — kept inline with the analysis because it is
              contextual to the result view (a "re-analyze" affordance). The
              tool-global Analyze Word lives in the StickyActionBar pre-result. */}
          <button
            onClick={handleAnalyze}
            disabled={!hasSelection}
            className={cn(
              'w-full py-2 px-4 rounded-lg',
              'font-medium text-sm',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'transition-all duration-200',
              'flex items-center justify-center gap-2',
              hasSelection
                ? 'border border-[#006EE6] text-[#006EE6] bg-white hover:bg-blue-50'
                : 'border border-gray-200 text-apple-text-light bg-white cursor-not-allowed'
            )}
          >
            <Search className="w-4 h-4" />
            Analyze Word
          </button>
        </>
      )}

      {/* Sticky primary action — hidden once an analysis is displayed. The
          results section above owns its own Apply "{word}" and re-analyze
          buttons, which stay visually grouped with the analysis they act on. */}
      {!result && (
        <StickyActionBar>
          <button
            onClick={handleAnalyze}
            disabled={!hasSelection || loading}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg',
              'font-medium text-sm',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'transition-all duration-200',
              'flex items-center justify-center gap-2',
              loading && 'aiworx-gradient-animated cursor-wait text-white',
              !loading && hasSelection && 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] text-white shadow-sm hover:shadow',
              !loading && !hasSelection && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
            )}
          >
            {loading ? (
              <AIWorxButtonLoader />
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analyze Word
              </>
            )}
          </button>
        </StickyActionBar>
      )}
    </div>
  );
}
