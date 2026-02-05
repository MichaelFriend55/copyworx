/**
 * @file components/workspace/HeadlineGeneratorTool.tsx
 * @description AI-powered headline generator with channel-specific optimization
 *
 * Features:
 * - 14 channel presets with auto-filled guidance + viewing context
 * - Multi-step form: channel -> details -> generate
 * - Tone multi-select chips
 * - Structured results with formula labels
 * - Individual copy buttons + "Copy All"
 * - "Generate More" for quick iteration
 * - Apple-style design consistent with other CopyWorx tools
 *
 * @example
 * ```tsx
 * <HeadlineGeneratorTool editor={editorInstance} />
 * ```
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Type,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import {
  useWorkspaceStore,
  useHeadlineResults,
  useHeadlineRawText,
  useHeadlineLoading,
  useHeadlineError,
  useHeadlineGeneratorActions,
} from '@/lib/stores/workspaceStore';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import {
  CHANNEL_PRESETS,
  TONE_OPTIONS,
  getChannelPreset,
} from '@/lib/prompts/headline-generator';
import type {
  HeadlineChannel,
  ToneOption,
  HeadlineFormData,
} from '@/lib/prompts/headline-generator';
import type { Editor } from '@tiptap/react';

// ============================================================================
// Constants
// ============================================================================

/** Default number of headline variations */
const DEFAULT_VARIATIONS = 15;

/** Variation count options */
const VARIATION_OPTIONS = [5, 10, 15, 20] as const;

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Inline label component for form fields
 */
function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1">
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}

/**
 * Single headline result card with copy button
 */
function HeadlineCard({
  formula,
  headline,
  index,
}: {
  formula: string;
  headline: string;
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(headline);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy headline:', err);
    }
  };

  return (
    <div className="group flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-apple-blue/30 hover:shadow-sm transition-all duration-200">
      {/* Index badge */}
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-500 flex items-center justify-center mt-0.5">
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-apple-blue/70 bg-blue-50 px-1.5 py-0.5 rounded mb-1.5">
          {formula}
        </span>
        <p className="text-sm text-apple-text-dark leading-relaxed break-words">
          {headline}
        </p>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={cn(
          'flex-shrink-0 p-1.5 rounded-md transition-all duration-200',
          'opacity-0 group-hover:opacity-100 focus:opacity-100',
          copied
            ? 'bg-green-100 text-green-600'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700',
        )}
        title={copied ? 'Copied!' : 'Copy headline'}
        aria-label={copied ? 'Copied!' : `Copy headline ${index + 1}`}
      >
        {copied ? (
          <ClipboardCheck className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface HeadlineGeneratorToolProps {
  /** TipTap editor instance (not used directly, but required by tool interface) */
  editor: Editor | null;
  /** Optional CSS classes */
  className?: string;
}

/**
 * HeadlineGeneratorTool — generates channel-optimized headline variations
 */
export function HeadlineGeneratorTool({ className }: HeadlineGeneratorToolProps) {
  // ── Zustand state ──
  const headlineResults = useHeadlineResults();
  const headlineRawText = useHeadlineRawText();
  const headlineLoading = useHeadlineLoading();
  const headlineError = useHeadlineError();
  const { runHeadlineGenerator, clearHeadlineResults } = useHeadlineGeneratorActions();

  // ── Local form state ──
  const [selectedChannel, setSelectedChannel] = useState<HeadlineChannel | null>(null);
  const [whatYourePromoting, setWhatYourePromoting] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyBenefit, setKeyBenefit] = useState('');
  const [uniqueAngle, setUniqueAngle] = useState('');
  const [numberOfVariations, setNumberOfVariations] = useState<number>(DEFAULT_VARIATIONS);
  const [selectedTones, setSelectedTones] = useState<ToneOption[]>(['Professional']);
  const [characterGuidance, setCharacterGuidance] = useState('');
  const [viewingContext, setViewingContext] = useState('');
  const [avoidWords, setAvoidWords] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  
  // ── Generation tracking for cumulative results ──
  const [generationCount, setGenerationCount] = useState(0);
  const [batchSizes, setBatchSizes] = useState<number[]>([]); // Track size of each batch for separators

  // ── Derived state ──
  const hasResults = headlineResults.length > 0;
  const canGenerate =
    selectedChannel &&
    whatYourePromoting.trim().length > 0 &&
    targetAudience.trim().length > 0 &&
    keyBenefit.trim().length > 0 &&
    characterGuidance.trim().length > 0 &&
    viewingContext.trim().length > 0 &&
    !headlineLoading;

  // ── Handlers ──

  /**
   * Handle channel selection — auto-fills guidance fields
   */
  const handleChannelSelect = useCallback((channelId: HeadlineChannel) => {
    setSelectedChannel(channelId);
    const preset = getChannelPreset(channelId);
    if (preset) {
      setCharacterGuidance(preset.characterGuidance);
      setViewingContext(preset.viewingContext);
    }
    // Clear previous results on channel change
    clearHeadlineResults();
    setGenerationCount(0);
    setBatchSizes([]);
  }, [clearHeadlineResults]);

  /**
   * Toggle a tone option on/off
   */
  const handleToneToggle = useCallback((tone: ToneOption) => {
    setSelectedTones((prev) => {
      if (prev.includes(tone)) {
        // Don't allow removing the last tone
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== tone);
      }
      return [...prev, tone];
    });
  }, []);

  /**
   * Submit the form to generate headlines (initial generation)
   */
  const handleGenerate = useCallback(async () => {
    if (!selectedChannel || !canGenerate) return;

    // Clear previous warnings
    setWarning(null);

    const formData: HeadlineFormData = {
      channel: selectedChannel,
      whatYourePromoting: whatYourePromoting.trim(),
      targetAudience: targetAudience.trim(),
      keyBenefit: keyBenefit.trim(),
      uniqueAngle: uniqueAngle.trim() || undefined,
      numberOfVariations,
      tonePreferences: selectedTones,
      characterGuidance: characterGuidance.trim(),
      viewingContext: viewingContext.trim(),
      avoidWords: avoidWords.trim() || undefined,
      additionalContext: additionalContext.trim() || undefined,
    };

    logger.log('📝 Generating initial headlines:', {
      channel: selectedChannel,
      variations: numberOfVariations,
      tones: selectedTones,
    });

    // First generation - don't append (replace)
    await runHeadlineGenerator(formData, false);

    // After generation, check if we got fewer headlines than expected
    // Note: This check happens after the state updates in runHeadlineGenerator
    setTimeout(() => {
      // Access store directly to get fresh state (avoid stale closure)
      const currentResults = useWorkspaceStore.getState().headlineResults;
      
      if (currentResults.length > 0) {
        // Track the first batch size
        setBatchSizes([currentResults.length]);
        setGenerationCount(1);
        
        if (currentResults.length < numberOfVariations) {
          setWarning(
            `Only ${currentResults.length} of ${numberOfVariations} headlines were captured. Some may not have been parsed correctly. Check raw output if needed.`
          );
        } else {
          // Clear any previous warnings on success
          setWarning(null);
        }
      }
    }, 100);
  }, [
    selectedChannel,
    canGenerate,
    whatYourePromoting,
    targetAudience,
    keyBenefit,
    uniqueAngle,
    numberOfVariations,
    selectedTones,
    characterGuidance,
    viewingContext,
    avoidWords,
    additionalContext,
    runHeadlineGenerator,
  ]);

  /**
   * Copy all headlines to clipboard
   */
  const handleCopyAll = useCallback(async () => {
    if (headlineResults.length === 0) return;

    const allText = headlineResults
      .map((h, i) => `${i + 1}. [${h.formula}] ${h.headline}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(allText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (err) {
      logger.error('Failed to copy all headlines:', err);
    }
  }, [headlineResults]);

  /**
   * Generate more headlines (appends to existing)
   */
  const handleGenerateMore = useCallback(async () => {
    if (!selectedChannel || !canGenerate) return;

    // Clear previous warnings
    setWarning(null);
    
    // Store the count before generation
    const prevCount = headlineResults.length;

    const formData: HeadlineFormData = {
      channel: selectedChannel,
      whatYourePromoting: whatYourePromoting.trim(),
      targetAudience: targetAudience.trim(),
      keyBenefit: keyBenefit.trim(),
      uniqueAngle: uniqueAngle.trim() || undefined,
      numberOfVariations,
      tonePreferences: selectedTones,
      characterGuidance: characterGuidance.trim(),
      viewingContext: viewingContext.trim(),
      avoidWords: avoidWords.trim() || undefined,
      additionalContext: additionalContext.trim() || undefined,
    };

    logger.log('📝 Generating additional headlines:', {
      channel: selectedChannel,
      variations: numberOfVariations,
      tones: selectedTones,
      currentCount: prevCount,
    });

    // Additional generation - append to existing
    await runHeadlineGenerator(formData, true);

    // After generation, check results and track batch
    setTimeout(() => {
      const currentResults = useWorkspaceStore.getState().headlineResults;
      const newHeadlinesAdded = currentResults.length - prevCount;
      
      if (newHeadlinesAdded > 0) {
        // Track this batch size
        setBatchSizes((prev) => [...prev, newHeadlinesAdded]);
        setGenerationCount((prev) => prev + 1);
        
        if (newHeadlinesAdded < numberOfVariations) {
          setWarning(
            `Only ${newHeadlinesAdded} of ${numberOfVariations} new headlines were captured. Some may not have been parsed correctly. Check raw output if needed.`
          );
        } else {
          setWarning(null);
        }
      }
    }, 100);
  }, [
    selectedChannel,
    canGenerate,
    whatYourePromoting,
    targetAudience,
    keyBenefit,
    uniqueAngle,
    numberOfVariations,
    selectedTones,
    characterGuidance,
    viewingContext,
    avoidWords,
    additionalContext,
    runHeadlineGenerator,
    headlineResults.length,
  ]);

  /**
   * Reset the entire form
   */
  const handleReset = useCallback(() => {
    clearHeadlineResults();
    setSelectedChannel(null);
    setWhatYourePromoting('');
    setTargetAudience('');
    setKeyBenefit('');
    setUniqueAngle('');
    setNumberOfVariations(DEFAULT_VARIATIONS);
    setSelectedTones(['Professional']);
    setCharacterGuidance('');
    setViewingContext('');
    setAvoidWords('');
    setAdditionalContext('');
    setShowAdvanced(false);
    setWarning(null);
    setShowRawOutput(false);
    setGenerationCount(0);
    setBatchSizes([]);
  }, [clearHeadlineResults]);

  // ── Render ──

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* ═══ Header ═══ */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Headline Generator
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Generate channel-optimized headline variations using proven copywriting formulas
        </p>
      </div>

      {/* ═══ Channel Selection ═══ */}
      <div className="flex flex-col gap-2.5">
        <FieldLabel required>Select Channel</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {CHANNEL_PRESETS.map((preset) => {
            const isSelected = selectedChannel === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleChannelSelect(preset.id)}
                disabled={headlineLoading}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium',
                  'border transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-1',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isSelected
                    ? 'bg-apple-blue text-white border-apple-blue shadow-sm'
                    : 'bg-white text-apple-text-dark border-apple-gray-light hover:border-apple-gray hover:bg-apple-gray-bg',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Form Fields (visible once channel is selected) ═══ */}
      {selectedChannel && (
        <>
          {/* Character Guidance (informational) */}
          <div className="flex flex-col gap-1.5 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
            <FieldLabel>Character Guidance</FieldLabel>
            <p className="text-sm text-gray-700 font-medium">
              {characterGuidance}
            </p>
          </div>

          {/* Viewing Context (informational) */}
          <div className="flex flex-col gap-1.5 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
            <FieldLabel>Viewing Context</FieldLabel>
            <p className="text-sm text-gray-700 font-medium">
              {viewingContext}
            </p>
          </div>

          {/* What You're Promoting */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>What You're Promoting</FieldLabel>
            <textarea
              value={whatYourePromoting}
              onChange={(e) => setWhatYourePromoting(e.target.value)}
              disabled={headlineLoading}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-apple-gray-light rounded-lg bg-white text-apple-text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent resize-none disabled:opacity-50"
              placeholder="e.g. SaaS project management tool for remote teams"
            />
          </div>

          {/* Target Audience */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>Target Audience</FieldLabel>
            <textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              disabled={headlineLoading}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-apple-gray-light rounded-lg bg-white text-apple-text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent resize-none disabled:opacity-50"
              placeholder="e.g. Marketing managers at mid-size companies, 30-45 years old"
            />
          </div>

          {/* Key Benefit */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>Key Benefit / Transformation</FieldLabel>
            <textarea
              value={keyBenefit}
              onChange={(e) => setKeyBenefit(e.target.value)}
              disabled={headlineLoading}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-apple-gray-light rounded-lg bg-white text-apple-text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent resize-none disabled:opacity-50"
              placeholder="e.g. Ship projects 2x faster without burnout"
            />
          </div>

          {/* Unique Angle (optional) */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Unique Angle / Differentiator</FieldLabel>
            <input
              type="text"
              value={uniqueAngle}
              onChange={(e) => setUniqueAngle(e.target.value)}
              disabled={headlineLoading}
              className="w-full px-3 py-2 text-sm border border-apple-gray-light rounded-lg bg-white text-apple-text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent disabled:opacity-50"
              placeholder="e.g. Built by ex-Googlers, AI-powered task prioritization"
            />
          </div>

          {/* Number of Variations */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Number of Variations</FieldLabel>
            <div className="flex gap-2">
              {VARIATION_OPTIONS.map((num) => (
                <button
                  key={num}
                  onClick={() => setNumberOfVariations(num)}
                  disabled={headlineLoading}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-1',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    numberOfVariations === num
                      ? 'bg-apple-blue text-white border-apple-blue'
                      : 'bg-white text-apple-text-dark border-apple-gray-light hover:bg-apple-gray-bg',
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Tone Preferences (multi-select chips) */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Tone Preferences</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((tone) => {
                const isSelected = selectedTones.includes(tone);
                return (
                  <button
                    key={tone}
                    onClick={() => handleToneToggle(tone)}
                    disabled={headlineLoading}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium',
                      'border transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-1',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50',
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                    {tone}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-medium text-apple-text-light hover:text-apple-text-dark transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>

          {/* Advanced Fields */}
          {showAdvanced && (
            <div className="flex flex-col gap-4 pl-3 border-l-2 border-gray-200">
              {/* Words to Avoid */}
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Words/Phrases to Avoid</FieldLabel>
                <input
                  type="text"
                  value={avoidWords}
                  onChange={(e) => setAvoidWords(e.target.value)}
                  disabled={headlineLoading}
                  className="w-full px-3 py-2 text-sm border border-apple-gray-light rounded-lg bg-white text-apple-text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent disabled:opacity-50"
                  placeholder="e.g. revolutionary, game-changing, synergy"
                />
              </div>

              {/* Additional Context */}
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Additional Context</FieldLabel>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  disabled={headlineLoading}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-apple-gray-light rounded-lg bg-white text-apple-text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent resize-none disabled:opacity-50"
                  placeholder="Any additional context or requirements..."
                />
              </div>
            </div>
          )}

          {/* ═══ Generate Button with Start Over ═══ */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generationCount > 0 || headlineLoading}
              className={cn(
                'flex-1 py-3 px-4 rounded-lg',
                'font-medium text-sm transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                headlineLoading && generationCount === 0
                  ? 'aiworx-gradient-animated cursor-wait text-white'
                  : generationCount > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                  : canGenerate
                  ? 'bg-[#006EE6] text-white hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow'
                  : 'bg-apple-gray-light text-apple-text-light cursor-not-allowed',
              )}
            >
              {headlineLoading && generationCount === 0 ? (
                <AIWorxButtonLoader />
              ) : (
                `Generate ${numberOfVariations} Headlines`
              )}
            </button>
            
            {/* Start Over button - appears after first generation */}
            {generationCount > 0 && (
              <button
                onClick={handleReset}
                disabled={headlineLoading}
                className={cn(
                  'px-4 py-3 rounded-lg text-sm font-medium',
                  'border border-gray-300 text-gray-600',
                  'hover:bg-gray-50 hover:border-gray-400 transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Start Over
              </button>
            )}
          </div>
        </>
      )}

      {/* ═══ Error Display ═══ */}
      {headlineError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{headlineError}</p>
          </div>
          <button
            onClick={() => {
              clearHeadlineResults();
              setWarning(null);
            }}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ Warning Display ═══ */}
      {warning && !headlineError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">Partial Success</p>
            <p className="text-xs text-amber-700 mt-1">{warning}</p>
          </div>
          <button
            onClick={() => setWarning(null)}
            className="text-amber-600 hover:text-amber-800 focus:outline-none"
            aria-label="Dismiss warning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══ Results Section ═══ */}
      {hasResults && (
        <div className="flex flex-col gap-3">
          {/* Results header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-apple-text-dark">
                {headlineResults.length} Headlines Generated
              </span>
            </div>
            <button
              onClick={handleCopyAll}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium',
                'border transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-1',
                copiedAll
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
              )}
            >
              {copiedAll ? (
                <>
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy All
                </>
              )}
            </button>
          </div>

          {/* Headline cards with batch separators */}
          <div className="flex flex-col gap-2">
            {headlineResults.map((result, index) => {
              // Calculate which batch this headline belongs to
              let cumulativeCount = 0;
              let batchNumber = 0;
              let shouldShowSeparator = false;
              
              for (let i = 0; i < batchSizes.length; i++) {
                if (index === cumulativeCount && i > 0) {
                  shouldShowSeparator = true;
                  batchNumber = i + 1;
                  break;
                }
                cumulativeCount += batchSizes[i];
              }
              
              return (
                <React.Fragment key={`${result.formula}-${index}`}>
                  {/* Batch separator */}
                  {shouldShowSeparator && (
                    <div className="my-2 pt-4 border-t-2 border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Additional Headlines (Generation {batchNumber})
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Headline card */}
                  <HeadlineCard
                    formula={result.formula}
                    headline={result.headline}
                    index={index}
                  />
                </React.Fragment>
              );
            })}
          </div>

          {/* Raw output toggle (if raw text is available) */}
          {headlineRawText && (
            <button
              onClick={() => setShowRawOutput(!showRawOutput)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors text-left"
            >
              {showRawOutput ? '▼ Hide' : '▶ Show'} raw output
            </button>
          )}

          {/* Raw output display */}
          {showRawOutput && headlineRawText && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto custom-scrollbar">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {headlineRawText}
              </pre>
            </div>
          )}

          {/* Generate More button - always at the bottom */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleGenerateMore}
              disabled={headlineLoading || !canGenerate}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg',
                'text-sm font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                headlineLoading && generationCount > 0
                  ? 'aiworx-gradient-animated cursor-wait text-white'
                  : canGenerate && !headlineLoading
                  ? 'bg-[#006EE6] text-white border border-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed',
              )}
            >
              {headlineLoading && generationCount > 0 ? (
                <AIWorxButtonLoader />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Generate {numberOfVariations} More
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Fallback: Raw text display if parsing failed ═══ */}
      {!hasResults && headlineRawText && !headlineLoading && !headlineError && (
        <div className="flex flex-col gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-medium text-amber-800">
            Headlines generated but couldn't be parsed. Here's the raw output:
          </p>
          <div className="bg-white border border-amber-200 rounded p-3 max-h-64 overflow-y-auto custom-scrollbar">
            <pre className="text-sm text-apple-text-dark whitespace-pre-wrap font-sans">
              {headlineRawText}
            </pre>
          </div>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(headlineRawText);
              } catch (err) {
                logger.error('Failed to copy raw text:', err);
              }
            }}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Raw Text
          </button>
        </div>
      )}
    </div>
  );
}
