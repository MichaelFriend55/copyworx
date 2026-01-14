/**
 * @file components/workspace/DocumentInsights.tsx
 * @description AI@Worx™ Live - Real-time document insights panel
 * 
 * Provides instant feedback on document quality with:
 * - Basic metrics (word count, character count, reading time, readability)
 * - AI-powered metrics (tone detection, brand voice alignment, persona alignment)
 * - Configurable update frequency and metric toggles
 */

'use client';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Hash,
  Clock,
  Target,
  Palette,
  User,
  Activity,
} from 'lucide-react';
import {
  useWorkspaceStore,
  useDocumentInsights,
  useDocumentInsightsActions,
  useActiveProjectId,
  useProjects,
  type InsightsUpdateFrequency,
} from '@/lib/stores/workspaceStore';
import { analyzeDocument, type DocumentMetrics } from '@/lib/utils/readability';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/** Debounce delay for real-time updates (ms) */
const REALTIME_DEBOUNCE = 1000;

/** Debounce delay for on-pause updates (ms) */
const ON_PAUSE_DEBOUNCE = 2000;

/** Cache duration for AI metrics (ms) */
const AI_CACHE_DURATION = 30000;

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Score indicator badge with color coding - COMPACT VERSION
 */
function ScoreBadge({ 
  score, 
  maxScore = 10,
  showOutOf = true,
}: { 
  score: number; 
  maxScore?: number;
  showOutOf?: boolean;
}) {
  const normalizedScore = (score / maxScore) * 10;
  
  let colorClass = 'bg-red-100 text-red-700 border-red-200';
  let icon = <AlertCircle className="w-2.5 h-2.5" />;
  
  if (normalizedScore >= 8) {
    colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    icon = <CheckCircle className="w-2.5 h-2.5" />;
  } else if (normalizedScore >= 5) {
    colorClass = 'bg-amber-100 text-amber-700 border-amber-200';
    icon = <Activity className="w-2.5 h-2.5" />;
  }
  
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1 py-0 rounded-full text-[10px] font-medium border',
      colorClass
    )}>
      {icon}
      {showOutOf ? `${score}/${maxScore}` : score}
    </span>
  );
}

/**
 * Metric row component - COMPACT VERSION
 */
function MetricRow({
  icon: Icon,
  label,
  value,
  subValue,
  badge,
  isLoading,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  badge?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between py-0.5', className)}>
      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <Icon className="w-3 h-3 text-gray-400" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
        ) : (
          <>
            <span className="text-xs font-medium text-gray-900">{value}</span>
            {subValue && (
              <span className="text-[10px] text-gray-500">({subValue})</span>
            )}
            {badge}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Radio button for update frequency - COMPACT VERSION
 */
function FrequencyRadio({
  value,
  selected,
  onChange,
  label,
  warning,
}: {
  value: InsightsUpdateFrequency;
  selected: boolean;
  onChange: (value: InsightsUpdateFrequency) => void;
  label: string;
  warning?: boolean;
}) {
  return (
    <label className={cn(
      'flex items-center gap-1 cursor-pointer text-[11px]',
      selected ? 'text-gray-900 font-medium' : 'text-gray-500',
      warning && selected && 'text-amber-600'
    )}>
      <input
        type="radio"
        checked={selected}
        onChange={() => onChange(value)}
        className="w-2.5 h-2.5 text-blue-600 border-gray-300 focus:ring-blue-500"
      />
      <span>{label}</span>
    </label>
  );
}

/**
 * Checkbox for metric toggle - COMPACT VERSION
 */
function MetricCheckbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn(
      'flex items-center gap-1 cursor-pointer text-[11px]',
      disabled && 'opacity-50 cursor-not-allowed',
      checked ? 'text-gray-900' : 'text-gray-500'
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="w-2.5 h-2.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span>{label}</span>
    </label>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DocumentInsights - AI@Worx™ Live panel
 */
export function DocumentInsights() {
  const activeDocument = useWorkspaceStore((state) => state.activeDocument);
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  const insights = useDocumentInsights();
  const {
    setDocumentInsightsActive,
    setDocumentInsightsExpanded,
    setInsightsUpdateFrequency,
    toggleInsightsMetric,
    runAIAnalysis,
    clearAIMetrics,
  } = useDocumentInsightsActions();
  
  // Get active project for brand voice and personas
  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  const brandVoice = activeProject?.brandVoice;
  const activePersona = activeProject?.personas?.[0]; // Use first persona for now
  
  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');
  
  // Calculate basic metrics from document content
  const documentMetrics = useMemo((): DocumentMetrics | null => {
    if (!activeDocument?.content) return null;
    return analyzeDocument(activeDocument.content);
  }, [activeDocument?.content]);
  
  /**
   * Trigger AI analysis
   */
  const triggerAIAnalysis = useCallback(() => {
    if (!insights.isActive) return;
    if (!activeDocument?.content) return;
    
    // Check if any AI metrics are enabled
    const { tone, brandVoice: brandEnabled, persona: personaEnabled } = insights.enabledMetrics;
    if (!tone && !brandEnabled && !personaEnabled) return;
    
    // Run AI analysis
    runAIAnalysis(
      activeDocument.content,
      brandEnabled ? brandVoice : null,
      personaEnabled && activePersona ? {
        name: activePersona.name,
        demographics: activePersona.demographics,
        psychographics: activePersona.psychographics,
        painPoints: activePersona.painPoints,
        goals: activePersona.goals,
      } : null
    );
  }, [
    insights.isActive,
    insights.enabledMetrics,
    activeDocument?.content,
    brandVoice,
    activePersona,
    runAIAnalysis,
  ]);
  
  /**
   * Handle content changes based on update frequency
   */
  useEffect(() => {
    if (!insights.isActive) return;
    if (!activeDocument?.content) return;
    
    const content = activeDocument.content;
    
    // Skip if content hasn't changed
    if (content === lastContentRef.current) return;
    lastContentRef.current = content;
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Determine debounce delay based on frequency
    let delay: number;
    switch (insights.updateFrequency) {
      case 'realtime':
        delay = REALTIME_DEBOUNCE;
        break;
      case 'onPause':
        delay = ON_PAUSE_DEBOUNCE;
        break;
      case 'onSave':
        // Don't auto-trigger for onSave mode
        return;
      default:
        delay = ON_PAUSE_DEBOUNCE;
    }
    
    // Schedule AI analysis
    debounceTimerRef.current = setTimeout(() => {
      triggerAIAnalysis();
    }, delay);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    insights.isActive,
    insights.updateFrequency,
    activeDocument?.content,
    triggerAIAnalysis,
  ]);
  
  /**
   * Handle manual refresh
   */
  const handleRefresh = useCallback(() => {
    clearAIMetrics();
    triggerAIAnalysis();
  }, [clearAIMetrics, triggerAIAnalysis]);
  
  /**
   * Toggle active state
   */
  const toggleActive = useCallback(() => {
    const newActive = !insights.isActive;
    setDocumentInsightsActive(newActive);
    
    if (!newActive) {
      clearAIMetrics();
    }
  }, [insights.isActive, setDocumentInsightsActive, clearAIMetrics]);
  
  /**
   * Toggle expanded state
   */
  const toggleExpanded = useCallback(() => {
    setDocumentInsightsExpanded(!insights.isExpanded);
  }, [insights.isExpanded, setDocumentInsightsExpanded]);
  
  // Check if brand voice and persona are available
  const hasBrandVoice = !!brandVoice?.brandName;
  const hasPersona = !!activePersona?.name;
  
  return (
    <div className="border-t border-gray-200 pt-1.5 mt-1.5">
      {/* Header - LARGER to match other section headers */}
      <button
        onClick={toggleExpanded}
        className={cn(
          'w-full flex items-center justify-between p-2 rounded-lg',
          'hover:bg-gray-50 transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
        )}
        aria-expanded={insights.isExpanded}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm text-gray-900 tracking-wide">
            AI@Worx™ Live
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleActive();
            }}
            className={cn(
              'px-1.5 py-0.5 text-[10px] font-bold rounded uppercase transition-colors',
              insights.isActive
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            {insights.isActive ? 'Active' : 'Inactive'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {insights.isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Content - COMPACT */}
      {insights.isExpanded && (
        <div className="px-1.5 pb-1.5 space-y-1.5">
          {/* Settings Section - COMPACT */}
          <div className="bg-gray-50 rounded p-1.5 space-y-1">
            {/* Update Frequency - NO LABEL, ONE LINE */}
            <div className="flex items-center gap-x-2.5">
              <FrequencyRadio
                value="onPause"
                selected={insights.updateFrequency === 'onPause'}
                onChange={setInsightsUpdateFrequency}
                label="Pause (2s)"
              />
              <FrequencyRadio
                value="onSave"
                selected={insights.updateFrequency === 'onSave'}
                onChange={setInsightsUpdateFrequency}
                label="On Save"
              />
              <FrequencyRadio
                value="realtime"
                selected={insights.updateFrequency === 'realtime'}
                onChange={setInsightsUpdateFrequency}
                label="Real-time"
                warning
              />
            </div>
            {insights.updateFrequency === 'realtime' && (
              <p className="text-[9px] text-amber-600">
                ⚠️ Real-time uses more API credits
              </p>
            )}
            
            {/* Metrics to Show - NO LABEL, 2x2 GRID */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <MetricCheckbox
                label="Readability"
                checked={insights.enabledMetrics.readability}
                onChange={() => toggleInsightsMetric('readability')}
              />
              <MetricCheckbox
                label="Tone"
                checked={insights.enabledMetrics.tone}
                onChange={() => toggleInsightsMetric('tone')}
              />
              <MetricCheckbox
                label="Brand Voice"
                checked={insights.enabledMetrics.brandVoice}
                onChange={() => toggleInsightsMetric('brandVoice')}
                disabled={!hasBrandVoice}
              />
              <MetricCheckbox
                label="Persona"
                checked={insights.enabledMetrics.persona}
                onChange={() => toggleInsightsMetric('persona')}
                disabled={!hasPersona}
              />
            </div>
            {(!hasBrandVoice && insights.enabledMetrics.brandVoice || !hasPersona && insights.enabledMetrics.persona) && (
              <p className="text-[9px] text-gray-400">
                {!hasBrandVoice && insights.enabledMetrics.brandVoice && 'Set up Brand Voice • '}
                {!hasPersona && insights.enabledMetrics.persona && 'Add a Persona'}
              </p>
            )}
          </div>
          
          {/* Metrics Display - COMPACT */}
          {insights.isActive && (
            <div className="space-y-1">
              {/* Basic Metrics - COMBINED ON ONE LINE */}
              <div className="text-[11px] text-gray-600 flex items-center gap-1.5 py-0.5">
                <span className="font-medium text-gray-900">{documentMetrics?.wordCount.toLocaleString() ?? '0'}</span> words
                <span className="text-gray-400">•</span>
                <span className="font-medium text-gray-900">{documentMetrics?.characterCount.toLocaleString() ?? '0'}</span> chars
                <span className="text-gray-400">•</span>
                <span className="font-medium text-gray-900">{documentMetrics?.readingTimeFormatted ?? '< 1 sec'}</span>
              </div>
              
              {/* Readability Metrics - OPTIMIZED LAYOUT */}
              {insights.enabledMetrics.readability && documentMetrics && (
                <div className="border-t border-gray-100 pt-1">
                  <div className="flex items-center gap-1.5 py-0.5">
                    <BookOpen className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-600">Readability</span>
                    <ScoreBadge score={documentMetrics.normalizedScore} />
                    <span className="text-[10px] text-gray-500">
                      ({documentMetrics.gradeLevelLabel})
                    </span>
                  </div>
                </div>
              )}
              
              {/* AI Metrics - COMPACT */}
              {(insights.enabledMetrics.tone || 
                (insights.enabledMetrics.brandVoice && hasBrandVoice) || 
                (insights.enabledMetrics.persona && hasPersona)) && (
                <div className="border-t border-gray-100 pt-1 space-y-0">
                  {/* Tone Detection */}
                  {insights.enabledMetrics.tone && (
                    <MetricRow
                      icon={Palette}
                      label="Tone"
                      value={insights.aiMetrics.tone?.label ?? '—'}
                      subValue={insights.aiMetrics.tone 
                        ? `${insights.aiMetrics.tone.confidence}%`
                        : undefined}
                      isLoading={insights.aiMetricsLoading}
                    />
                  )}
                  
                  {/* Brand Voice Alignment */}
                  {insights.enabledMetrics.brandVoice && hasBrandVoice && (
                    <MetricRow
                      icon={Target}
                      label="Brand"
                      value={insights.aiMetrics.brandAlignment 
                        ? insights.aiMetrics.brandAlignment.feedback.split('.')[0] || 'Analyzed'
                        : '—'}
                      badge={insights.aiMetrics.brandAlignment && (
                        <ScoreBadge score={insights.aiMetrics.brandAlignment.score} />
                      )}
                      isLoading={insights.aiMetricsLoading}
                    />
                  )}
                  
                  {/* Persona Alignment */}
                  {insights.enabledMetrics.persona && hasPersona && (
                    <MetricRow
                      icon={User}
                      label="Persona"
                      value={insights.aiMetrics.personaAlignment
                        ? insights.aiMetrics.personaAlignment.feedback.split('.')[0] || 'Analyzed'
                        : '—'}
                      badge={insights.aiMetrics.personaAlignment && (
                        <ScoreBadge score={insights.aiMetrics.personaAlignment.score} />
                      )}
                      isLoading={insights.aiMetricsLoading}
                    />
                  )}
                </div>
              )}
              
              {/* Error State - COMPACT */}
              {insights.aiMetricsError && (
                <div className="bg-red-50 border border-red-100 rounded p-1">
                  <p className="text-[10px] text-red-600">{insights.aiMetricsError}</p>
                </div>
              )}
              
              {/* Refresh Button - COMPACT */}
              {(insights.enabledMetrics.tone || 
                insights.enabledMetrics.brandVoice || 
                insights.enabledMetrics.persona) && (
                <button
                  onClick={handleRefresh}
                  disabled={insights.aiMetricsLoading}
                  className={cn(
                    'w-full flex items-center justify-center gap-1 px-2 py-0.5 rounded',
                    'text-[10px] font-medium transition-colors',
                    'border border-gray-200 hover:border-gray-300',
                    'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {insights.aiMetricsLoading ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-2.5 h-2.5" />
                      Refresh
                    </>
                  )}
                </button>
              )}
              
              {/* No Content State - COMPACT */}
              {!activeDocument?.content && (
                <div className="text-center py-2">
                  <p className="text-[10px] text-gray-400">
                    Start writing to see insights
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Inactive State - COMPACT */}
          {!insights.isActive && (
            <div className="text-center py-2">
              <p className="text-[10px] text-gray-400">
                Enable AI@Worx™ Live to see insights
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
