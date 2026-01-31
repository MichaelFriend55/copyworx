/**
 * @file components/workspace/BrandAlignmentTool.tsx
 * @description Standalone Brand Alignment checking tool
 * 
 * Features:
 * - Check selected copy against saved brand voice
 * - Display alignment score, matches, violations, and recommendations
 * - Requires brand voice to be set up first
 * - Apple-style design aesthetic
 * 
 * @example
 * ```tsx
 * <BrandAlignmentTool editor={editorInstance} />
 * ```
 */

'use client';

import React, { useMemo } from 'react';
import { 
  Zap,
  CheckCircle,
  AlertTriangle,
  X,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Sparkles,
  Folder,
  Volume2
} from 'lucide-react';
import { 
  useWorkspaceStore,
  useProjects, 
  useActiveProjectId, 
  useSelectedText,
  useBrandAlignmentResult,
  useBrandAlignmentLoading,
  useBrandAlignmentError,
  useBrandAlignmentActions,
} from '@/lib/stores/workspaceStore';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface BrandAlignmentToolProps {
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * BrandAlignmentTool component - Standalone brand alignment checking
 */
export function BrandAlignmentTool({ editor, className }: BrandAlignmentToolProps) {
  // Optimized selectors
  const selectedText = useSelectedText();
  const brandAlignmentResult = useBrandAlignmentResult();
  const brandAlignmentLoading = useBrandAlignmentLoading();
  const brandAlignmentError = useBrandAlignmentError();
  const { runBrandAlignment, clearBrandAlignmentResult } = useBrandAlignmentActions();
  
  // Get active project
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  // Check states
  const hasSelection = selectedText && selectedText.trim().length > 0;
  const hasBrandVoice = !!activeProject?.brandVoice;
  const canCheck = hasSelection && hasBrandVoice && !brandAlignmentLoading;

  /**
   * Handle check brand alignment
   */
  const handleCheckAlignment = async () => {
    if (!activeProject?.brandVoice || !selectedText) return;
    await runBrandAlignment(selectedText, activeProject.brandVoice);
  };

  /**
   * Navigate to Brand Voice setup
   */
  const handleGoToBrandVoice = () => {
    useWorkspaceStore.getState().setActiveTool('brand-voice');
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Check Brand Alignment
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Analyze how well your copy aligns with your brand voice
        </p>
      </div>

      {/* Brand Voice Status */}
      {hasBrandVoice ? (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Brand Voice: {activeProject?.brandVoice?.brandName}
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Ready to check copy alignment
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                No Brand Voice Set
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Set up your brand voice first to check alignment
              </p>
            </div>
          </div>
          <button
            onClick={handleGoToBrandVoice}
            className={cn(
              'w-full py-2 px-3 rounded-lg',
              'bg-yellow-600 text-white text-sm font-medium',
              'hover:bg-yellow-700 transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2',
              'flex items-center justify-center gap-2'
            )}
          >
            <Volume2 className="w-4 h-4" />
            Set Up Brand Voice
          </button>
        </div>
      )}

      {/* Active Project Indicator */}
      {activeProject && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <Folder className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <p className="text-xs text-gray-700 truncate">
            Project: <span className="font-medium">{activeProject.name}</span>
          </p>
        </div>
      )}

      {/* Selected Text Preview */}
      {hasSelection ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-apple-blue" />
            Selected Text ({selectedText?.length || 0} characters)
          </label>
          <div className="bg-apple-gray-bg border border-apple-gray-light rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar">
            <p className="text-sm text-apple-text-dark whitespace-pre-wrap">
              {selectedText}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Highlight text in the editor to check brand alignment
          </p>
        </div>
      )}

      {/* Check Alignment Button */}
      <button
        onClick={handleCheckAlignment}
        disabled={!canCheck}
        className={cn(
          'w-full py-3 px-4 rounded-lg',
          'font-medium text-sm text-white',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          // Animated gradient when loading
          brandAlignmentLoading && 'aiworx-gradient-animated cursor-wait',
          // Brand button with blue→purple active when not loading
          !brandAlignmentLoading && (hasSelection && hasBrandVoice) && 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200',
          // Gray background when truly disabled (not loading)
          (!hasSelection || !hasBrandVoice) && !brandAlignmentLoading && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
        )}
      >
        {brandAlignmentLoading ? (
          <AIWorxButtonLoader />
        ) : (
          'Check Brand Alignment'
        )}
      </button>

      {/* Helper Text */}
      {!hasSelection && hasBrandVoice && (
        <p className="text-xs text-apple-text-light text-center">
          Select text in the editor to check brand alignment
        </p>
      )}

      {/* Error Display */}
      {brandAlignmentError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{brandAlignmentError}</p>
          </div>
          <button
            onClick={clearBrandAlignmentResult}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results Display */}
      {brandAlignmentResult && (
        <div className="flex flex-col gap-4">
          {/* Analyzing Against Banner */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <Volume2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-900 truncate">
                Analyzing against: <span className="font-semibold">{activeProject?.brandVoice?.brandName}</span>
              </p>
            </div>
          </div>

          {/* Overall Score */}
          <div className="flex flex-col gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Alignment Score
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {brandAlignmentResult.score}%
              </span>
            </div>
            <p className="text-sm text-blue-700">
              {brandAlignmentResult.assessment}
            </p>
          </div>

          {/* Matches */}
          {brandAlignmentResult.matches.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  What Matches
                </span>
              </div>
              <ul className="ml-6 space-y-1">
                {brandAlignmentResult.matches.map((match: string, index: number) => (
                  <li key={index} className="text-sm text-green-700">
                    {match}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Violations */}
          {brandAlignmentResult.violations.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">
                  What Violates
                </span>
              </div>
              <ul className="ml-6 space-y-1">
                {brandAlignmentResult.violations.map((violation: string, index: number) => (
                  <li key={index} className="text-sm text-red-700">
                    {violation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {brandAlignmentResult.recommendations.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Recommendations
                </span>
              </div>
              <ul className="ml-6 space-y-1">
                {brandAlignmentResult.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-purple-700">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clear Button */}
          <button
            onClick={clearBrandAlignmentResult}
            className="w-full py-2 px-4 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
          >
            Clear Results
          </button>
        </div>
      )}
    </div>
  );
}
