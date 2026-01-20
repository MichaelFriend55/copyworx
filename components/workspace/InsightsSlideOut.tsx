/**
 * @file components/workspace/InsightsSlideOut.tsx
 * @description Right slide-out panel for displaying analysis results
 * 
 * Supports three panel types:
 * - Brand Alignment Analysis
 * - Persona Alignment Analysis
 * - AI@Worx™ Live Analysis
 * 
 * Features:
 * - 550px wide right slide-out panel
 * - Clean, spacious layout for readable results
 * - Color-coded scores and feedback sections
 * - Refresh button for re-running analysis
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import {
  Zap,
  UserCheck,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  RefreshCw,
  Loader2,
  BookOpen,
  Palette,
  Target,
  User,
  Activity,
  X,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useWorkspaceStore,
  useActiveProjectId,
  useProjects,
  useBrandAlignmentResult,
  useBrandAlignmentLoading,
  useBrandAlignmentError,
  useBrandAlignmentActions,
  usePersonaAlignmentResult,
  usePersonaAlignmentLoading,
  usePersonaAlignmentError,
  usePersonaAlignmentActions,
  useDocumentInsights,
  useDocumentInsightsActions,
  useSelectedText,
} from '@/lib/stores/workspaceStore';
import type { BrandAlignmentResult } from '@/lib/types/brand';
import type { PersonaAlignmentResult } from '@/lib/stores/workspaceStore';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Unique ID for the insights slide-out panel */
export const INSIGHTS_PANEL_ID = 'insights-panel';

/** Panel type for insights */
export type InsightsPanelType = 'brand-alignment' | 'persona-alignment' | 'aiworx-live' | null;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface InsightsSlideOutProps {
  /** Whether the slide-out is open */
  isOpen: boolean;
  
  /** Callback when slide-out should close */
  onClose: () => void;
  
  /** Type of insights to display */
  panelType: InsightsPanelType;
  
  /** Callback to trigger brand alignment check */
  onCheckBrandAlignment?: () => void;
  
  /** Callback to trigger persona alignment check */
  onCheckPersonaAlignment?: () => void;
  
  /** Callback to refresh AI@Worx Live */
  onRefreshAIWorx?: () => void;
}

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Score indicator badge with color coding
 */
function ScoreBadge({ 
  score, 
  maxScore = 100,
  size = 'large',
}: { 
  score: number; 
  maxScore?: number;
  size?: 'small' | 'large';
}) {
  const normalizedScore = (score / maxScore) * 100;
  
  let colorClass = 'bg-red-100 text-red-700 border-red-200';
  let icon = <AlertCircle className={size === 'large' ? 'w-5 h-5' : 'w-3 h-3'} />;
  
  if (normalizedScore >= 80) {
    colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    icon = <CheckCircle className={size === 'large' ? 'w-5 h-5' : 'w-3 h-3'} />;
  } else if (normalizedScore >= 50) {
    colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
    icon = <Activity className={size === 'large' ? 'w-5 h-5' : 'w-3 h-3'} />;
  }
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold border',
      size === 'large' ? 'text-lg' : 'text-sm',
      colorClass
    )}>
      {icon}
      {score}%
    </span>
  );
}

/**
 * Section card for displaying lists of items
 */
function ResultSection({
  icon: Icon,
  title,
  items,
  variant = 'default',
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  if (!items || items.length === 0) return null;
  
  const variantStyles = {
    default: 'bg-gray-50 border-gray-200 text-gray-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  
  const iconStyles = {
    default: 'text-gray-500',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    info: 'text-purple-600',
  };
  
  const titleStyles = {
    default: 'text-gray-900',
    success: 'text-emerald-900',
    warning: 'text-amber-900',
    danger: 'text-red-900',
    info: 'text-purple-900',
  };
  
  return (
    <div className={cn('rounded-lg border p-4', variantStyles[variant])}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('w-5 h-5', iconStyles[variant])} />
        <h4 className={cn('font-semibold', titleStyles[variant])}>
          {title}
        </h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * AI@Worx Live metric row
 */
function AIWorxMetricRow({
  icon: Icon,
  label,
  value,
  score,
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  score?: number | null;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {isLoading ? (
            <p className="text-xs text-gray-500">Analyzing...</p>
          ) : value ? (
            <p className="text-xs text-gray-600">{value}</p>
          ) : (
            <p className="text-xs text-gray-400">Not analyzed yet</p>
          )}
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      ) : score !== undefined && score !== null ? (
        <ScoreBadge score={score} maxScore={10} size="small" />
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PANEL CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Brand Alignment Panel Content
 */
function BrandAlignmentContent() {
  const result = useBrandAlignmentResult();
  const isLoading = useBrandAlignmentLoading();
  const error = useBrandAlignmentError();
  const { clearBrandAlignmentResult } = useBrandAlignmentActions();
  const selectedText = useSelectedText();
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  const hasBrandVoice = !!activeProject?.brandVoice;
  const hasSelection = selectedText && selectedText.trim().length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 animate-spin text-apple-blue mb-4" />
        <p className="text-lg font-medium text-gray-900">Analyzing Brand Alignment</p>
        <p className="text-sm text-gray-500 mt-1">This may take a few seconds...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Analysis Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!result) {
    return (
      <div className="space-y-6">
        {!hasBrandVoice && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">No Brand Voice Set Up</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Set up your brand voice in the Brand & Audience section to check alignment.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {hasBrandVoice && !hasSelection && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Select Text to Analyze</p>
                <p className="text-sm text-blue-700 mt-1">
                  Highlight text in the editor and click "Check Brand Alignment" to analyze.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {hasBrandVoice && hasSelection && (
          <div className="text-center py-8">
            <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Click "Check Brand Alignment" to analyze your selected text.
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900">Alignment Score</h3>
          <ScoreBadge score={result.score} />
        </div>
        <p className="text-blue-700">{result.assessment}</p>
      </div>
      
      {/* Matches */}
      <ResultSection
        icon={ThumbsUp}
        title="What Matches Your Brand"
        items={result.matches}
        variant="success"
      />
      
      {/* Violations */}
      <ResultSection
        icon={ThumbsDown}
        title="Brand Violations"
        items={result.violations}
        variant="danger"
      />
      
      {/* Recommendations */}
      <ResultSection
        icon={Lightbulb}
        title="Recommendations"
        items={result.recommendations}
        variant="info"
      />
      
      {/* Clear Results */}
      <Button
        variant="outline"
        className="w-full"
        onClick={clearBrandAlignmentResult}
      >
        Clear Results
      </Button>
    </div>
  );
}

/**
 * Persona Alignment Panel Content
 */
function PersonaAlignmentContent() {
  const result = usePersonaAlignmentResult();
  const isLoading = usePersonaAlignmentLoading();
  const error = usePersonaAlignmentError();
  const { clearPersonaAlignmentResult } = usePersonaAlignmentActions();
  const selectedText = useSelectedText();
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  const hasPersonas = (activeProject?.personas?.length ?? 0) > 0;
  const hasSelection = selectedText && selectedText.trim().length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 animate-spin text-apple-blue mb-4" />
        <p className="text-lg font-medium text-gray-900">Analyzing Persona Alignment</p>
        <p className="text-sm text-gray-500 mt-1">This may take a few seconds...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Analysis Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!result) {
    return (
      <div className="space-y-6">
        {!hasPersonas && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">No Personas Set Up</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Create personas in the Brand & Audience section to check alignment.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {hasPersonas && !hasSelection && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Select Text to Analyze</p>
                <p className="text-sm text-blue-700 mt-1">
                  Highlight text in the editor and click "Check Persona Alignment" to analyze.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {hasPersonas && hasSelection && (
          <div className="text-center py-8">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Click "Check Persona Alignment" to analyze your selected text.
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-purple-900">Alignment Score</h3>
          <ScoreBadge score={result.score} />
        </div>
        <p className="text-purple-700">{result.assessment}</p>
      </div>
      
      {/* Strengths */}
      <ResultSection
        icon={ThumbsUp}
        title="Strengths"
        items={result.strengths}
        variant="success"
      />
      
      {/* Areas to Improve */}
      <ResultSection
        icon={AlertCircle}
        title="Areas to Improve"
        items={result.improvements}
        variant="warning"
      />
      
      {/* Recommendations */}
      <ResultSection
        icon={Lightbulb}
        title="Recommendations"
        items={result.recommendations}
        variant="info"
      />
      
      {/* Clear Results */}
      <Button
        variant="outline"
        className="w-full"
        onClick={clearPersonaAlignmentResult}
      >
        Clear Results
      </Button>
    </div>
  );
}

/**
 * AI@Worx Live Panel Content
 */
function AIWorxLiveContent({ onRefresh }: { onRefresh?: () => void }) {
  const insights = useDocumentInsights();
  const { clearAIMetrics } = useDocumentInsightsActions();
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  const hasBrandVoice = !!activeProject?.brandVoice?.brandName;
  const hasPersona = (activeProject?.personas?.length ?? 0) > 0;
  
  const { aiMetrics, aiMetricsLoading, aiMetricsError, enabledMetrics } = insights;
  
  return (
    <div className="space-y-6">
      {/* Error State */}
      {aiMetricsError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Analysis Error</p>
              <p className="text-sm text-red-700 mt-1">{aiMetricsError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Metrics */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">AI Analysis Results</h3>
        </div>
        <div className="p-4">
          {/* Readability */}
          {enabledMetrics.readability && (
            <AIWorxMetricRow
              icon={BookOpen}
              label="Readability"
              value={aiMetrics.tone ? 'Analyzed' : null}
              isLoading={aiMetricsLoading}
            />
          )}
          
          {/* Tone Detection */}
          {enabledMetrics.tone && (
            <AIWorxMetricRow
              icon={Palette}
              label="Detected Tone"
              value={aiMetrics.tone?.label ?? null}
              score={aiMetrics.tone?.confidence ? Math.round(aiMetrics.tone.confidence / 10) : null}
              isLoading={aiMetricsLoading}
            />
          )}
          
          {/* Brand Voice Alignment */}
          {enabledMetrics.brandVoice && (
            <AIWorxMetricRow
              icon={Target}
              label="Brand Voice Alignment"
              value={hasBrandVoice 
                ? (aiMetrics.brandAlignment?.feedback?.split('.')[0] ?? null)
                : 'No brand voice set'
              }
              score={aiMetrics.brandAlignment?.score ?? null}
              isLoading={aiMetricsLoading && hasBrandVoice}
            />
          )}
          
          {/* Persona Alignment */}
          {enabledMetrics.persona && (
            <AIWorxMetricRow
              icon={User}
              label="Persona Alignment"
              value={hasPersona 
                ? (aiMetrics.personaAlignment?.feedback?.split('.')[0] ?? null)
                : 'No personas set'
              }
              score={aiMetrics.personaAlignment?.score ?? null}
              isLoading={aiMetricsLoading && hasPersona}
            />
          )}
        </div>
      </div>
      
      {/* Detailed Feedback Sections */}
      {aiMetrics.brandAlignment && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">Brand Voice Feedback</h4>
          </div>
          <p className="text-sm text-blue-700">{aiMetrics.brandAlignment.feedback}</p>
        </div>
      )}
      
      {aiMetrics.personaAlignment && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-purple-900">Persona Feedback</h4>
          </div>
          <p className="text-sm text-purple-700">{aiMetrics.personaAlignment.feedback}</p>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={clearAIMetrics}
          disabled={aiMetricsLoading}
        >
          Clear Results
        </Button>
        <Button
          variant="default"
          className="flex-1 bg-apple-blue hover:bg-apple-blue/90"
          onClick={onRefresh}
          disabled={aiMetricsLoading}
        >
          {aiMetricsLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * InsightsSlideOut - Right slide-out panel for analysis results
 */
export function InsightsSlideOut({
  isOpen,
  onClose,
  panelType,
  onCheckBrandAlignment,
  onCheckPersonaAlignment,
  onRefreshAIWorx,
}: InsightsSlideOutProps) {
  // Get panel title and subtitle based on type
  const panelConfig = useMemo(() => {
    switch (panelType) {
      case 'brand-alignment':
        return {
          title: 'Brand Alignment Analysis',
          subtitle: 'See how well your copy aligns with your brand voice',
          icon: Zap,
        };
      case 'persona-alignment':
        return {
          title: 'Persona Alignment Analysis',
          subtitle: 'See how well your copy resonates with your target audience',
          icon: UserCheck,
        };
      case 'aiworx-live':
        return {
          title: 'AI@Worx™ Live Analysis',
          subtitle: 'Real-time document quality insights',
          icon: Sparkles,
        };
      default:
        return {
          title: 'Analysis',
          subtitle: 'View analysis results',
          icon: Sparkles,
        };
    }
  }, [panelType]);
  
  // Render content based on panel type
  const renderContent = () => {
    switch (panelType) {
      case 'brand-alignment':
        return <BrandAlignmentContent />;
      case 'persona-alignment':
        return <PersonaAlignmentContent />;
      case 'aiworx-live':
        return <AIWorxLiveContent onRefresh={onRefreshAIWorx} />;
      default:
        return (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Select an analysis type</p>
          </div>
        );
    }
  };
  
  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      title={panelConfig.title}
      subtitle={panelConfig.subtitle}
    >
      {renderContent()}
    </SlideOutPanel>
  );
}

export default InsightsSlideOut;
