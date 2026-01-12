/**
 * @file components/workspace/BrandVoiceTool.tsx
 * @description Brand Voice setup and alignment checking tool
 * 
 * Features:
 * - Two-tab interface: Setup | Check Copy
 * - Setup: Form to define brand voice
 * - Check Copy: Analyze text alignment with brand voice
 * - Local storage persistence
 * - Apple-style design aesthetic
 * 
 * @example
 * ```tsx
 * <BrandVoiceTool editor={editorInstance} />
 * ```
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Volume2,
  Save,
  CheckCircle,
  Check, 
  X,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Sparkles,
  Folder
} from 'lucide-react';
import { 
  useWorkspaceStore,
  useProjects, 
  useActiveProjectId, 
  useSelectedText,
  useSelectionRange,
  useBrandAlignmentResult,
  useBrandAlignmentLoading,
  useBrandAlignmentError,
  useBrandAlignmentActions,
  useProjectActions,
} from '@/lib/stores/workspaceStore';
import { insertTextAtSelection } from '@/lib/editor-utils';
import { saveBrandVoiceToProject } from '@/lib/storage/project-storage';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import type { Editor } from '@tiptap/react';
import type { BrandVoice } from '@/lib/types/brand';
import { cn } from '@/lib/utils';

interface BrandVoiceToolProps {
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Optional CSS classes */
  className?: string;
}

type TabType = 'setup' | 'check';

/**
 * BrandVoiceTool component - Brand voice setup and alignment checking
 */
export function BrandVoiceTool({ editor, className }: BrandVoiceToolProps) {
  // Optimized selectors - only re-render when these specific values change
  const selectedText = useSelectedText();
  const selectionRange = useSelectionRange();
  const brandAlignmentResult = useBrandAlignmentResult();
  const brandAlignmentLoading = useBrandAlignmentLoading();
  const brandAlignmentError = useBrandAlignmentError();
  const { runBrandAlignment, clearBrandAlignmentResult } = useBrandAlignmentActions();
  const { updateProject } = useProjectActions();
  
  // Get active project - use projects array and ID separately to control re-renders
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  // Memoize the find operation to avoid creating new references
  const activeProject = React.useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('setup');

  // Form state
  const [brandName, setBrandName] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [approvedPhrases, setApprovedPhrases] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [brandValues, setBrandValues] = useState('');
  const [missionStatement, setMissionStatement] = useState('');
  
  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load brand voice from active project
  // IMPORTANT: Only use activeProjectId in dependency array to prevent cascading re-renders
  useEffect(() => {
    // Get fresh project data inside the effect
    const currentProjects = useWorkspaceStore.getState().projects;
    const currentProject = currentProjects.find((p) => p.id === activeProjectId);
    
    if (!currentProject) {
      // No active project - clear form
      setBrandName('');
      setBrandTone('');
      setApprovedPhrases('');
      setForbiddenWords('');
      setBrandValues('');
      setMissionStatement('');
      console.log('⚠️ No active project');
      return;
    }

    // Load brand voice from project
    const brandVoice = currentProject.brandVoice;
    
    if (brandVoice) {
      // Populate form with project's brand voice
      setBrandName(brandVoice.brandName);
      setBrandTone(brandVoice.brandTone);
      setApprovedPhrases(brandVoice.approvedPhrases.join('\n'));
      setForbiddenWords(brandVoice.forbiddenWords.join('\n'));
      setBrandValues(brandVoice.brandValues.join('\n'));
      setMissionStatement(brandVoice.missionStatement);
      
      console.log('✅ Loaded brand voice from project:', currentProject.name);
    } else {
      // No brand voice in project - clear form
      setBrandName('');
      setBrandTone('');
      setApprovedPhrases('');
      setForbiddenWords('');
      setBrandValues('');
      setMissionStatement('');
      
      console.log('ℹ️ No brand voice set for project:', currentProject.name);
    }
  }, [activeProjectId]); // Only depend on primitive ID, not derived objects

  /**
   * Handle save brand voice
   */
  const handleSaveBrandVoice = (): void => {
    // Clear previous errors
    setSaveError(null);
    setSaveSuccess(false);

    // Check if project exists
    if (!activeProject || !activeProjectId) {
      setSaveError('No active project. Please create a project first.');
      return;
    }

    // Validate required fields
    if (!brandName.trim()) {
      setSaveError('Brand Name is required');
      return;
    }

    // Create brand voice object
    const brandVoice: BrandVoice = {
      brandName: brandName.trim(),
      brandTone: brandTone.trim(),
      approvedPhrases: approvedPhrases
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean),
      forbiddenWords: forbiddenWords
        .split('\n')
        .map(w => w.trim())
        .filter(Boolean),
      brandValues: brandValues
        .split('\n')
        .map(v => v.trim())
        .filter(Boolean),
      missionStatement: missionStatement.trim(),
      savedAt: new Date(),
    };

    // Save to active project
    try {
      saveBrandVoiceToProject(activeProjectId, brandVoice);
      
      // Update Zustand store
      updateProject(activeProjectId, { brandVoice });
      
      setSaveSuccess(true);
      
      console.log('✅ Brand voice saved to project:', activeProject.name);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save brand voice. Please try again.';
      setSaveError(errorMessage);
      console.error('❌ Failed to save brand voice:', error);
    }
  };

  /**
   * Handle check brand alignment
   */
  const handleCheckAlignment = async () => {
    if (!activeProject?.brandVoice) {
      // Error is already shown in UI via the warning banner
      return;
    }

    if (!selectedText) {
      return;
    }

    await runBrandAlignment(selectedText, activeProject.brandVoice);
  };

  // Check if user has text selected
  const hasSelection = selectedText && selectedText.trim().length > 0;
  const canCheck = hasSelection && activeProject?.brandVoice && !brandAlignmentLoading;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Brand Voice
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Define your brand voice and check copy alignment
        </p>
        
        {/* Active Project Indicator */}
        {activeProject ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-900">
                Brand Voice for:
              </p>
              <p className="text-sm font-semibold text-blue-700 truncate">
                {activeProject.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-yellow-900">
                No Active Project
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Please create or select a project to set up brand voice
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('setup')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-all duration-200',
            'border-b-2 focus:outline-none',
            activeTab === 'setup'
              ? 'border-apple-blue text-apple-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          Setup
        </button>
        <button
          onClick={() => setActiveTab('check')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-all duration-200',
            'border-b-2 focus:outline-none',
            activeTab === 'check'
              ? 'border-apple-blue text-apple-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          Check Copy
        </button>
      </div>

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <div className="flex flex-col gap-4">
          {/* Brand Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
              Brand Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter your brand name"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent"
            />
          </div>

          {/* Brand Tone Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
              Brand Tone Description
            </label>
            <AutoExpandTextarea
              value={brandTone}
              onChange={(e) => setBrandTone(e.target.value)}
              placeholder="e.g., Professional, friendly, innovative, approachable"
              minHeight={80}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent"
            />
          </div>

          {/* Approved Phrases */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
              Approved Phrases
            </label>
            <AutoExpandTextarea
              value={approvedPhrases}
              onChange={(e) => setApprovedPhrases(e.target.value)}
              placeholder="One per line"
              minHeight={80}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-500">(one per line)</p>
          </div>

          {/* Forbidden Words */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-red-600 uppercase tracking-wide">
              Forbidden Words
            </label>
            <AutoExpandTextarea
              value={forbiddenWords}
              onChange={(e) => setForbiddenWords(e.target.value)}
              placeholder="One per line"
              minHeight={80}
              className="px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-500">(one per line)</p>
          </div>

          {/* Brand Values */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
              Brand Values
            </label>
            <AutoExpandTextarea
              value={brandValues}
              onChange={(e) => setBrandValues(e.target.value)}
              placeholder="One per line"
              minHeight={80}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-500">(one per line)</p>
          </div>

          {/* Mission Statement */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
              Mission Statement
            </label>
            <AutoExpandTextarea
              value={missionStatement}
              onChange={(e) => setMissionStatement(e.target.value)}
              placeholder="Our mission is to..."
              minHeight={100}
              maxHeight={300}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue focus:border-transparent"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveBrandVoice}
            className={cn(
              'w-full py-3 px-4 rounded-lg',
              'font-medium text-sm',
              'bg-apple-blue text-white hover:bg-blue-600',
              'transition-all duration-200 shadow-sm hover:shadow',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              'flex items-center justify-center gap-2'
            )}
          >
            <Save className="w-4 h-4" />
            Save Brand Voice
          </button>

          {/* Error Message */}
          {saveError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-xs text-red-700 mt-1">{saveError}</p>
              </div>
              <button
                onClick={() => setSaveError(null)}
                className="text-red-600 hover:text-red-800 focus:outline-none"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Brand voice saved successfully!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Check Copy Tab */}
      {activeTab === 'check' && (
        <div className="flex flex-col gap-6">
          {/* Brand Voice Status */}
          {activeProject?.brandVoice ? (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Brand Voice: {activeProject.brandVoice.brandName}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Ready to check copy alignment
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  No Brand Voice Set
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Please set up your brand voice in the Setup tab first
                </p>
              </div>
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
                Highlight text in the editor to check alignment
              </p>
            </div>
          )}

          {/* Check Alignment Button */}
          <button
            onClick={handleCheckAlignment}
            disabled={!canCheck}
            className={cn(
              'w-full py-3 px-4 rounded-lg',
              'font-medium text-sm',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
              // Keep blue background during loading
              'bg-apple-blue text-white hover:bg-blue-600 shadow-sm hover:shadow',
              'disabled:bg-apple-blue disabled:text-white disabled:cursor-wait',
              // Gray background only when truly disabled (not just loading)
              (!hasSelection || !activeProject?.brandVoice) && !brandAlignmentLoading && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
            )}
          >
            {brandAlignmentLoading ? (
              <AIWorxButtonLoader />
            ) : (
              'Check Brand Alignment'
            )}
          </button>

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
      )}
    </div>
  );
}
