/**
 * @file components/workspace/InsightsSlideOut.tsx
 * @description Right slide-out panel for displaying analysis results
 * 
 * Supports two panel types:
 * - Brand Alignment Analysis
 * - Persona Alignment Analysis
 * 
 * Features:
 * - 550px wide right slide-out panel
 * - Clean, spacious layout for readable results
 * - Color-coded scores and feedback sections
 * - Refresh button for re-running analysis
 */

'use client';

import React, { useMemo } from 'react';
import {
  Zap,
  UserCheck,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Loader2,
  Target,
  Activity,
  X,
  Wand2,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { Button } from '@/components/ui/button';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { cn } from '@/lib/utils';
import {
  useWorkspaceStore,
  useBrandAlignmentResult,
  useBrandAlignmentLoading,
  useBrandAlignmentError,
  useBrandAlignmentActions,
  useBrandAlignmentBrandName,
  useBrandAlignmentAnalyzedText,
  usePersonaAlignmentResult,
  usePersonaAlignmentLoading,
  usePersonaAlignmentError,
  usePersonaAlignmentActions,
  usePersonaAlignmentPersonaName,
  usePersonaAlignmentAnalyzedText,
  useSelectedText,
  useOptimizeAlignmentLoading,
  useOptimizeAlignmentActions,
  useProjects,
  useActiveProjectId,
  useInsightsPanelActions,
} from '@/lib/stores/workspaceStore';
import type { Persona } from '@/lib/types/project';
import type { BrandVoice } from '@/lib/types/brand';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Unique ID for the insights slide-out panel */
export const INSIGHTS_PANEL_ID = 'insights-panel';

/** Panel type for insights */
export type InsightsPanelType = 'brand-alignment' | 'persona-alignment' | null;

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
  const brandName = useBrandAlignmentBrandName();
  const analyzedText = useBrandAlignmentAnalyzedText();
  const { clearBrandAlignmentResult } = useBrandAlignmentActions();
  const selectedText = useSelectedText();
  
  // Optimize alignment state
  const optimizeLoading = useOptimizeAlignmentLoading();
  const { runOptimizeAlignment } = useOptimizeAlignmentActions();
  
  // Insights panel actions
  const { closeInsightsPanel } = useInsightsPanelActions();
  
  // Get active project for brand voice data
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  
  const hasSelection = selectedText && selectedText.trim().length > 0;
  
  /**
   * Handle rewrite to optimize for brand
   */
  const handleRewriteToOptimize = async () => {
    if (!activeProject?.brandVoice || !result || !analyzedText) return;
    
    // Close the InsightsSlideOut panel immediately
    closeInsightsPanel();
    
    await runOptimizeAlignment(
      analyzedText,
      'brand',
      result,
      activeProject.brandVoice
    );
  };

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
        {!hasSelection ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Select Text to Analyze</p>
                <p className="text-sm text-blue-700 mt-1">
                  Highlight text in the editor and select a brand voice from the dropdown to analyze.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Select a brand voice and click "Check Brand Alignment" to analyze your text.
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Brand Name Banner */}
      {brandName && (
        <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              Analyzing against: <span className="font-semibold">{brandName}</span>
            </p>
          </div>
        </div>
      )}
      
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
      
      {/* Rewrite to Optimize Button */}
      <button
        onClick={handleRewriteToOptimize}
        disabled={optimizeLoading || !analyzedText}
        className={cn(
          'w-full py-3 px-4 rounded-lg',
          'font-medium text-sm text-white',
          'focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
          'flex items-center justify-center gap-2',
          'transition-all duration-200',
          optimizeLoading 
            ? 'aiworx-gradient-animated cursor-wait'
            : 'bg-[#006EE6] hover:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow',
          (optimizeLoading || !analyzedText) && !optimizeLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {optimizeLoading ? (
          <AIWorxButtonLoader />
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            {`Rewrite to Optimize for ${brandName || 'Brand'}`}
          </>
        )}
      </button>
      
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
  const personaName = usePersonaAlignmentPersonaName();
  const analyzedText = usePersonaAlignmentAnalyzedText();
  const { clearPersonaAlignmentResult } = usePersonaAlignmentActions();
  const selectedText = useSelectedText();
  
  // Optimize alignment state
  const optimizeLoading = useOptimizeAlignmentLoading();
  const { runOptimizeAlignment } = useOptimizeAlignmentActions();
  
  // Insights panel actions
  const { closeInsightsPanel } = useInsightsPanelActions();
  
  // Get active project for persona data
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const activeProject = projects.find((p) => p.id === activeProjectId);
  
  // Find the persona that was analyzed
  const selectedPersona = activeProject?.personas?.find(
    (p: Persona) => p.name === personaName
  );
  
  const hasSelection = selectedText && selectedText.trim().length > 0;
  
  /**
   * Handle rewrite to optimize for persona
   */
  const handleRewriteToOptimize = async () => {
    if (!selectedPersona || !result || !analyzedText) return;
    
    // Close the InsightsSlideOut panel immediately
    closeInsightsPanel();
    
    await runOptimizeAlignment(
      analyzedText,
      'persona',
      result,
      selectedPersona
    );
  };

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
        {!hasSelection ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Select Text to Analyze</p>
                <p className="text-sm text-blue-700 mt-1">
                  Highlight text in the editor and select a persona from the dropdown to analyze.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Select a persona and click "Check Persona Alignment" to analyze your text.
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Persona Name Banner */}
      {personaName && (
        <div className="p-3 bg-purple-100 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-medium text-purple-800">
              Analyzing against: <span className="font-semibold">{personaName}</span>
            </p>
          </div>
        </div>
      )}
      
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
      
      {/* Rewrite to Optimize Button */}
      <button
        onClick={handleRewriteToOptimize}
        disabled={optimizeLoading || !analyzedText || !selectedPersona}
        className={cn(
          'w-full py-3 px-4 rounded-lg',
          'font-medium text-sm text-white',
          'focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
          'flex items-center justify-center gap-2',
          'transition-all duration-200',
          optimizeLoading 
            ? 'aiworx-gradient-animated cursor-wait'
            : 'bg-[#006EE6] hover:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow',
          (optimizeLoading || !analyzedText || !selectedPersona) && !optimizeLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {optimizeLoading ? (
          <AIWorxButtonLoader />
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            {`Rewrite to Optimize for ${personaName || 'Persona'}`}
          </>
        )}
      </button>
      
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
