/**
 * @file components/workspace/PersonaAlignmentTool.tsx
 * @description Standalone Persona Alignment checking tool
 * 
 * Features:
 * - Check selected copy against saved persona
 * - Display alignment score, strengths, improvements, and recommendations
 * - Requires at least one persona to be set up
 * - Persona selector dropdown
 * - Apple-style design aesthetic
 * 
 * @example
 * ```tsx
 * <PersonaAlignmentTool editor={editorInstance} />
 * ```
 */

'use client';

import React, { useMemo, useState } from 'react';
import { 
  UserCheck,
  CheckCircle,
  AlertTriangle,
  X,
  ThumbsUp,
  AlertCircle,
  Lightbulb,
  Sparkles,
  Folder,
  Users,
  ChevronDown,
  Wand2
} from 'lucide-react';
import { 
  useWorkspaceStore,
  useProjects, 
  useActiveProjectId, 
  useSelectedText,
  usePersonaAlignmentResult,
  usePersonaAlignmentLoading,
  usePersonaAlignmentError,
  usePersonaAlignmentActions,
  usePersonaAlignmentAnalyzedText,
  useOptimizeAlignmentLoading,
  useOptimizeAlignmentActions,
} from '@/lib/stores/workspaceStore';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import type { Editor } from '@tiptap/react';
import type { Persona } from '@/lib/types/project';
import { cn } from '@/lib/utils';

interface PersonaAlignmentToolProps {
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * PersonaAlignmentTool component - Standalone persona alignment checking
 */
export function PersonaAlignmentTool({ editor, className }: PersonaAlignmentToolProps) {
  // Optimized selectors
  const selectedText = useSelectedText();
  const personaAlignmentResult = usePersonaAlignmentResult();
  const personaAlignmentLoading = usePersonaAlignmentLoading();
  const personaAlignmentError = usePersonaAlignmentError();
  const personaAlignmentAnalyzedText = usePersonaAlignmentAnalyzedText();
  const { runPersonaAlignment, clearPersonaAlignmentResult } = usePersonaAlignmentActions();
  
  // Optimize alignment state
  const optimizeLoading = useOptimizeAlignmentLoading();
  const { runOptimizeAlignment } = useOptimizeAlignmentActions();
  
  // Get active project
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  // Local state for selected persona
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get personas from active project
  const personas = activeProject?.personas || [];
  const hasPersonas = personas.length > 0;
  
  // Get selected persona
  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId),
    [personas, selectedPersonaId]
  );

  // Check states
  const hasSelection = selectedText && selectedText.trim().length > 0;
  const canCheck = hasSelection && selectedPersona && !personaAlignmentLoading;

  /**
   * Handle check persona alignment
   */
  const handleCheckAlignment = async () => {
    if (!selectedPersona || !selectedText) return;
    await runPersonaAlignment(selectedText, selectedPersona);
  };

  /**
   * Navigate to Personas setup
   */
  const handleGoToPersonas = () => {
    useWorkspaceStore.getState().setActiveTool('personas');
  };

  /**
   * Handle rewrite to optimize for persona
   * Uses the analysis results to guide the rewrite
   */
  const handleRewriteToOptimize = async () => {
    if (!selectedPersona || !personaAlignmentResult) return;
    
    // Use the stored analyzed text (from when analysis was run)
    // This allows rewriting even if user has deselected the text
    const textToOptimize = personaAlignmentAnalyzedText;
    if (!textToOptimize) return;

    await runOptimizeAlignment(
      textToOptimize,
      'persona',
      personaAlignmentResult,
      selectedPersona
    );
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Check Persona Alignment
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Analyze how well your copy resonates with your target persona
        </p>
      </div>

      {/* Personas Status */}
      {hasPersonas ? (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
            Select Persona
          </label>
          
          {/* Persona Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                'w-full px-3 py-2.5 text-left text-sm',
                'border rounded-lg transition-all duration-200',
                'flex items-center justify-between gap-2',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                selectedPersona
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-white border-gray-300 text-apple-text-dark hover:border-gray-400'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  {selectedPersona ? selectedPersona.name : 'Choose a persona...'}
                </span>
              </div>
              <ChevronDown className={cn(
                'w-4 h-4 flex-shrink-0 transition-transform duration-200',
                isDropdownOpen && 'rotate-180'
              )} />
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {personas.map((persona) => (
                  <button
                    key={persona.id}
                    onClick={() => {
                      setSelectedPersonaId(persona.id);
                      setIsDropdownOpen(false);
                      clearPersonaAlignmentResult();
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm',
                      'hover:bg-gray-50 transition-colors duration-150',
                      'flex flex-col gap-0.5',
                      selectedPersonaId === persona.id && 'bg-blue-50'
                    )}
                  >
                    <span className="font-medium text-apple-text-dark">
                      {persona.name}
                    </span>
                    {persona.demographics && (
                      <span className="text-xs text-gray-500 truncate">
                        {persona.demographics}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Persona Preview */}
          {selectedPersona && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {selectedPersona.name}
                </span>
              </div>
              <p className="text-xs text-blue-700">
                Ready to check copy alignment
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                No Personas Set Up
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Create at least one persona to check alignment
              </p>
            </div>
          </div>
          <button
            onClick={handleGoToPersonas}
            className={cn(
              'w-full py-2 px-3 rounded-lg',
              'bg-yellow-600 text-white text-sm font-medium',
              'hover:bg-yellow-700 transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2',
              'flex items-center justify-center gap-2'
            )}
          >
            <Users className="w-4 h-4" />
            Create Persona
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
            Highlight text in the editor to check persona alignment
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
          personaAlignmentLoading && 'aiworx-gradient-animated cursor-wait',
          // Brand button with blue→purple active when not loading
          !personaAlignmentLoading && (hasSelection && selectedPersona) && 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200',
          // Gray background when truly disabled (not loading)
          (!hasSelection || !selectedPersona) && !personaAlignmentLoading && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
        )}
      >
        {personaAlignmentLoading ? (
          <AIWorxButtonLoader />
        ) : selectedPersona ? (
          `Check Alignment with ${selectedPersona.name}`
        ) : (
          'Select a Persona'
        )}
      </button>

      {/* Helper Text */}
      {!hasSelection && hasPersonas && selectedPersona && (
        <p className="text-xs text-apple-text-light text-center">
          Select text in the editor to check persona alignment
        </p>
      )}

      {/* Error Display */}
      {personaAlignmentError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{personaAlignmentError}</p>
          </div>
          <button
            onClick={clearPersonaAlignmentResult}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Results Display */}
      {personaAlignmentResult && selectedPersona && (
        <div className="flex flex-col gap-4">
          {/* Analyzing Against Banner */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-900 truncate">
                Analyzing against: <span className="font-semibold">{selectedPersona.name}</span>
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
                {personaAlignmentResult.score}%
              </span>
            </div>
            <p className="text-sm text-blue-700">
              {personaAlignmentResult.assessment}
            </p>
          </div>

          {/* Strengths */}
          {personaAlignmentResult.strengths.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  Strengths
                </span>
              </div>
              <ul className="ml-6 space-y-1">
                {personaAlignmentResult.strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-sm text-green-700">
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {personaAlignmentResult.improvements.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">
                  Areas to Improve
                </span>
              </div>
              <ul className="ml-6 space-y-1">
                {personaAlignmentResult.improvements.map((improvement: string, index: number) => (
                  <li key={index} className="text-sm text-orange-700">
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {personaAlignmentResult.recommendations.length > 0 && (
            <div className="flex flex-col gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Recommendations
                </span>
              </div>
              <ul className="ml-6 space-y-1">
                {personaAlignmentResult.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-purple-700">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rewrite to Optimize Button - Always show when there's a result */}
          <button
            onClick={handleRewriteToOptimize}
            disabled={optimizeLoading || !personaAlignmentAnalyzedText}
            className={cn(
              'w-full py-3 px-4 rounded-lg',
              'font-medium text-sm text-white',
              'focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2',
              'flex items-center justify-center gap-2',
              'transition-all duration-200',
              optimizeLoading 
                ? 'aiworx-gradient-animated cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-sm hover:shadow'
            )}
          >
            <Wand2 className="w-4 h-4" />
            {optimizeLoading 
              ? 'Rewriting...' 
              : `Rewrite to Optimize for ${selectedPersona.name}`
            }
          </button>

          {/* Clear Button */}
          <button
            onClick={clearPersonaAlignmentResult}
            className="w-full py-2 px-4 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
          >
            Clear Results
          </button>
        </div>
      )}
    </div>
  );
}
