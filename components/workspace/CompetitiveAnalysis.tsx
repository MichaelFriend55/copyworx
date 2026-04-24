/**
 * @file components/workspace/CompetitiveAnalysis.tsx
 * @description AI-powered competitive analysis tool for analyzing competitor copy
 *
 * Lets users paste competitor copy and receive a structured strategic teardown
 * covering messaging strategy, strengths, weaknesses, opportunities, and takeaways.
 *
 * @example
 * ```tsx
 * <CompetitiveAnalysis editor={editorInstance} />
 * ```
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  ScanSearch,
  Sparkles,
  X,
  Copy,
  ClipboardCheck,
  RotateCcw,
} from 'lucide-react';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import type { Editor } from '@tiptap/react';

// ============================================================================
// Constants
// ============================================================================

const COPY_TYPE_OPTIONS = [
  'Landing Page',
  'Sales Email',
  'Social Media Ad',
  'Social Media Post',
  'Blog Post',
  'Sales Page',
  'Website Copy',
  'Email Sequence',
  'Print Ad',
  'Brochure',
  'Press Release',
  'Radio Script',
] as const;

type CopyType = (typeof COPY_TYPE_OPTIONS)[number];

// ============================================================================
// Main Component
// ============================================================================

interface CompetitiveAnalysisProps {
  editor: Editor | null;
  className?: string;
}

/**
 * CompetitiveAnalysis — paste competitor copy for a strategic teardown
 */
export function CompetitiveAnalysis({ className }: CompetitiveAnalysisProps) {
  const [copyType, setCopyType] = useState<CopyType | ''>('');
  const [industryContext, setIndustryContext] = useState('');
  const [competitorCopy, setCompetitorCopy] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canAnalyze = competitorCopy.trim().length > 0 && copyType !== '' && !isLoading;

  /**
   * Submit competitor copy for AI analysis
   */
  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: competitorCopy.trim(),
          copyType,
          industryContext: industryContext.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data.analysis);

      logger.log('✅ Competitive analysis complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      logger.error('❌ Competitive analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [canAnalyze, competitorCopy, copyType, industryContext]);

  /**
   * Copy the analysis result as plain text to clipboard
   */
  const handleCopyAnalysis = useCallback(async () => {
    if (!result) return;

    try {
      const plainText = result
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy analysis:', err);
    }
  }, [result]);

  /**
   * Reset the form and clear results
   */
  const handleNewAnalysis = useCallback(() => {
    setCopyType('');
    setIndustryContext('');
    setCompetitorCopy('');
    setResult(null);
    setError(null);
    setCopied(false);
  }, []);

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Competitive Analysis
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Paste competitor copy for a strategic teardown
        </p>
      </div>

      {/* Copy Type Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1">
          Copy Type <span className="text-red-500">*</span>
        </label>
        <select
          value={copyType}
          onChange={(e) => setCopyType(e.target.value as CopyType | '')}
          disabled={isLoading}
          className={cn(
            'w-full px-3 py-2 rounded-lg border text-sm',
            'bg-white text-apple-text-dark',
            'border-apple-gray-light focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20',
            'transition-colors duration-200 cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            !copyType && 'text-gray-400'
          )}
        >
          <option value="">Select copy type...</option>
          {COPY_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Industry / Product Context */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
          Industry / Product Context
        </label>
        <input
          type="text"
          value={industryContext}
          onChange={(e) => setIndustryContext(e.target.value)}
          disabled={isLoading}
          maxLength={200}
          className="w-full px-3 py-2 text-sm border border-apple-gray-light rounded-lg bg-white text-apple-text-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent disabled:opacity-50"
          placeholder="e.g., project management SaaS, luxury skincare brand"
        />
      </div>

      {/* Competitor Copy Textarea */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1">
          Competitor Copy <span className="text-red-500">*</span>
        </label>
        <textarea
          value={competitorCopy}
          onChange={(e) => setCompetitorCopy(e.target.value)}
          disabled={isLoading}
          className={cn(
            'w-full px-3 py-2 text-sm border border-apple-gray-light rounded-lg',
            'bg-white text-apple-text-dark placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent',
            'resize-y disabled:opacity-50',
          )}
          style={{ minHeight: '200px' }}
          placeholder="Paste competitor copy here..."
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Results container */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
            <div
              className="text-sm text-apple-text-dark prose prose-sm max-w-none
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:first:mt-0
                [&_p]:my-1.5 [&_p]:leading-relaxed
                [&_ul]:my-2 [&_ul]:pl-5
                [&_li]:my-1"
              dangerouslySetInnerHTML={{ __html: result }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyAnalysis}
              className={cn(
                'flex-1 py-2.5 px-3 rounded-lg',
                'text-sm font-medium',
                'flex items-center justify-center gap-2',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                copied
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-[#006EE6] text-white hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow',
              )}
            >
              {copied ? (
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
                'py-2.5 px-4 rounded-lg',
                'text-sm font-medium',
                'border border-gray-300 text-gray-600',
                'hover:bg-gray-50 hover:border-gray-400 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
                'flex items-center justify-center gap-2',
              )}
            >
              <RotateCcw className="w-4 h-4" />
              New Analysis
            </button>
          </div>
        </div>
      )}

      {/* Sticky primary action — hidden once an analysis is displayed. The
          result section above owns its own Copy Analysis / New Analysis
          buttons, which stay visually grouped with the analysis they act on. */}
      {!result && (
        <StickyActionBar variant="absolute">
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={cn(
              'w-full py-3 px-4 rounded-lg',
              'font-medium text-sm text-white',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'flex items-center justify-center gap-2',
              isLoading && 'aiworx-gradient-animated cursor-wait',
              !isLoading && canAnalyze && 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200',
              !canAnalyze && !isLoading && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed',
            )}
          >
            {isLoading ? (
              <AIWorxButtonLoader />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Copy
              </>
            )}
          </button>
        </StickyActionBar>
      )}
    </div>
  );
}
