/**
 * @file components/workspace/DocumentInsights.tsx
 * @description AI@Worx™ Live - Controls panel for real-time document insights
 * 
 * This component provides controls for AI@Worx™ Live in the left sidebar.
 * Results are displayed in the InsightsSlideOut panel on the right side.
 * 
 * Features:
 * - Basic metrics (word count, character count, reading time)
 * - Update frequency controls (Pause, On Save, Real-time)
 * - Metric toggles (Readability, Tone, Brand Voice, Persona)
 * - View Results button to open slide-out panel
 */

'use client';

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  PanelRightOpen,
} from 'lucide-react';
import {
  useDocumentInsights,
  useDocumentInsightsActions,
  useActiveProjectId,
  useActiveDocumentId,
  useProjects,
  useInsightsPanelActions,
  type InsightsUpdateFrequency,
} from '@/lib/stores/workspaceStore';
import { getDocument } from '@/lib/storage/document-storage';
import { analyzeDocument, type DocumentMetrics } from '@/lib/utils/readability';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/** Debounce delay for real-time updates (ms) */
const REALTIME_DEBOUNCE = 1000;

/** Debounce delay for on-pause updates (ms) */
const ON_PAUSE_DEBOUNCE = 2000;

// ============================================================================
// Helper Components
// ============================================================================

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
 * DocumentInsights - AI@Worx™ Live controls panel
 * 
 * Controls only - results are shown in InsightsSlideOut
 */
export function DocumentInsights() {
  const activeProjectId = useActiveProjectId();
  const activeDocumentId = useActiveDocumentId();
  const projects = useProjects();
  
  // Load document content from localStorage
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  
  useEffect(() => {
    if (activeProjectId && activeDocumentId) {
      const doc = getDocument(activeProjectId, activeDocumentId);
      setDocumentContent(doc?.content || null);
    } else {
      setDocumentContent(null);
    }
  }, [activeProjectId, activeDocumentId]);
  
  const insights = useDocumentInsights();
  const {
    setDocumentInsightsActive,
    setDocumentInsightsExpanded,
    setInsightsUpdateFrequency,
    toggleInsightsMetric,
    runAIAnalysis,
    clearAIMetrics,
  } = useDocumentInsightsActions();
  
  const { openInsightsPanel } = useInsightsPanelActions();
  
  // Get active project for brand voice and personas
  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  const brandVoice = activeProject?.brandVoice;
  const activePersona = activeProject?.personas?.[0]; // Use first persona for now
  
  // Refs for debouncing and mount tracking
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');
  const isInitialMountRef = useRef<boolean>(true);
  
  /**
   * Reset initial mount flag when document changes
   * This prevents auto-opening the sidebar when switching documents
   */
  useEffect(() => {
    isInitialMountRef.current = true;
  }, [activeDocumentId]);
  
  // Calculate basic metrics from document content
  const documentMetrics = useMemo((): DocumentMetrics | null => {
    if (!documentContent) return null;
    return analyzeDocument(documentContent);
  }, [documentContent]);
  
  /**
   * Trigger AI analysis with optional panel auto-open
   * @param shouldOpenPanel - Whether to automatically open the panel after analysis
   */
  const triggerAIAnalysis = useCallback((shouldOpenPanel: boolean = true) => {
    if (!insights.isActive) return;
    if (!documentContent) return;
    
    // Check if any AI metrics are enabled
    const { tone, brandVoice: brandEnabled, persona: personaEnabled } = insights.enabledMetrics;
    if (!tone && !brandEnabled && !personaEnabled) return;
    
    // Run AI analysis
    runAIAnalysis(
      documentContent,
      brandEnabled ? brandVoice : null,
      personaEnabled && activePersona ? {
        name: activePersona.name,
        demographics: activePersona.demographics,
        psychographics: activePersona.psychographics,
        painPoints: activePersona.painPoints,
        goals: activePersona.goals,
      } : null
    );
    
    // Only open the slide-out panel if explicitly requested
    if (shouldOpenPanel) {
      openInsightsPanel('aiworx-live');
    }
  }, [
    insights.isActive,
    insights.enabledMetrics,
    documentContent,
    brandVoice,
    activePersona,
    runAIAnalysis,
    openInsightsPanel,
  ]);
  
  /**
   * Handle content changes based on update frequency
   */
  useEffect(() => {
    if (!insights.isActive) return;
    if (!documentContent) return;
    
    const content = documentContent;
    
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
      // On initial mount, run analysis but don't auto-open panel
      // On subsequent content changes, run analysis and auto-open panel
      const shouldOpenPanel = !isInitialMountRef.current;
      triggerAIAnalysis(shouldOpenPanel);
      
      // Mark that we've completed the initial mount
      isInitialMountRef.current = false;
    }, delay);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    insights.isActive,
    insights.updateFrequency,
    documentContent,
    triggerAIAnalysis,
  ]);
  
  /**
   * Handle manual refresh - explicitly opens panel
   */
  const handleRefresh = useCallback(() => {
    clearAIMetrics();
    triggerAIAnalysis(true); // Explicitly open panel for manual refresh
  }, [clearAIMetrics, triggerAIAnalysis]);
  
  /**
   * Handle view results button
   */
  const handleViewResults = useCallback(() => {
    openInsightsPanel('aiworx-live');
  }, [openInsightsPanel]);
  
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
  
  // Check if any results are available
  const hasResults = !!(
    insights.aiMetrics.tone ||
    insights.aiMetrics.brandAlignment ||
    insights.aiMetrics.personaAlignment
  );
  
  return (
    <div className="border-t border-gray-200 pt-1.5 mt-1.5">
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
          'bg-gray-50 hover:bg-gray-100 transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          'relative pl-5 border-l-[3px] border-transparent',
          'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0',
          'before:w-[3px] before:rounded-l-lg',
          'before:bg-gradient-to-b before:from-[#006EE6] before:to-[#7A3991]'
        )}
        aria-expanded={insights.isExpanded}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm text-gray-900 tracking-wide uppercase">
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
                ? 'bg-[#006EE6] text-white hover:bg-[#0062CC]'
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
      
      {/* Content */}
      {insights.isExpanded && (
        <div className="px-1.5 pb-1.5 space-y-1.5">
          {/* Settings Section */}
          <div className="bg-gray-50 rounded p-1.5 space-y-1">
            {/* Update Frequency */}
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
            
            {/* Metrics to Show */}
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
          
          {/* Metrics Display */}
          {insights.isActive && (
            <div className="space-y-1.5">
              {/* Basic Metrics - Word/Char/Time counts */}
              <div className="text-[11px] text-gray-600 flex items-center gap-1.5 py-0.5">
                <span className="font-medium text-gray-900">{documentMetrics?.wordCount.toLocaleString() ?? '0'}</span> words
                <span className="text-gray-400">•</span>
                <span className="font-medium text-gray-900">{documentMetrics?.characterCount.toLocaleString() ?? '0'}</span> chars
                <span className="text-gray-400">•</span>
                <span className="font-medium text-gray-900">{documentMetrics?.readingTimeFormatted ?? '< 1 sec'}</span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-1.5">
                {/* Analyze Button */}
                <button
                  onClick={handleRefresh}
                  disabled={insights.aiMetricsLoading || !documentContent}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded',
                    'text-[10px] font-medium transition-colors',
                    'bg-blue-500 text-white hover:bg-blue-600',
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
                      Analyze
                    </>
                  )}
                </button>
                
                {/* View Results Button */}
                <button
                  onClick={handleViewResults}
                  disabled={!hasResults && !insights.aiMetricsLoading}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded',
                    'text-[10px] font-medium transition-colors',
                    hasResults
                      ? 'bg-[#A755F7] text-white hover:bg-[#9333EA]'
                      : 'border border-gray-200 text-gray-400',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <PanelRightOpen className="w-2.5 h-2.5" />
                  View Results
                </button>
              </div>
              
              {/* No Content State */}
              {!documentContent && (
                <div className="text-center py-1">
                  <p className="text-[10px] text-gray-400">
                    Start writing to see insights
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Inactive State */}
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
