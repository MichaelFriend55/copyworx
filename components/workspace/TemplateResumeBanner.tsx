/**
 * @file components/workspace/TemplateResumeBanner.tsx
 * @description Banner component that appears when a document has incomplete template progress
 * 
 * Shows:
 * - Template name and current section
 * - Continue button to resume generation
 * - View Progress button to see completed sections
 * - Exit button to clear template mode
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  ListChecks,
  X,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { getDocument, updateDocument as updateDocumentInStorage } from '@/lib/storage/document-storage';
import { BROCHURE_SECTIONS } from '@/lib/templates/brochure-multi-section-config';
import type { TemplateProgress } from '@/lib/types/template-progress';

interface TemplateResumeBannerProps {
  /** Callback when Continue is clicked */
  onContinue?: () => void;
}

/**
 * Resume banner that appears when a document has incomplete template progress
 */
export function TemplateResumeBanner({ onContinue }: TemplateResumeBannerProps) {
  const activeDocumentId = useWorkspaceStore((state) => state.activeDocumentId);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const selectedTemplateId = useWorkspaceStore((state) => state.selectedTemplateId);
  
  const [templateProgress, setTemplateProgress] = useState<TemplateProgress | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Check for template progress when document changes
  useEffect(() => {
    if (!activeDocumentId || !activeProjectId) {
      setTemplateProgress(null);
      setIsDismissed(false);
      return;
    }
    
    const doc = getDocument(activeProjectId, activeDocumentId);
    if (doc?.templateProgress && !doc.templateProgress.isComplete) {
      setTemplateProgress(doc.templateProgress);
      setIsDismissed(false);
    } else {
      setTemplateProgress(null);
    }
  }, [activeDocumentId, activeProjectId]);
  
  /**
   * Handle Continue - opens the multi-section template
   */
  const handleContinue = useCallback(() => {
    if (!templateProgress) return;
    
    // Set the template ID in store to open the multi-section template
    useWorkspaceStore.getState().setSelectedTemplateId(templateProgress.templateId);
    useWorkspaceStore.getState().setRightSidebarOpen(true);
    
    onContinue?.();
  }, [templateProgress, onContinue]);
  
  /**
   * Handle Exit - clears template progress from document
   */
  const handleExit = useCallback(() => {
    if (!activeProjectId || !activeDocumentId) return;
    
    const confirmed = window.confirm(
      'Exit template mode? Your generated sections will be kept, but you won\'t be able to continue the template workflow.'
    );
    
    if (!confirmed) return;
    
    try {
      updateDocumentInStorage(activeProjectId, activeDocumentId, {
        templateProgress: undefined,
      });
      setTemplateProgress(null);
    } catch (error) {
      console.error('❌ Failed to clear template progress:', error);
    }
  }, [activeProjectId, activeDocumentId]);
  
  /**
   * Handle dismiss - temporarily hides the banner
   */
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);
  
  // Don't show if no template progress, already complete, dismissed, or template already open
  if (!templateProgress || templateProgress.isComplete || isDismissed || selectedTemplateId) {
    return null;
  }
  
  // Get current section info
  const currentSectionIndex = templateProgress.currentSection;
  const currentSection = BROCHURE_SECTIONS[currentSectionIndex];
  const completedCount = templateProgress.completedSections.length;
  const totalCount = templateProgress.totalSections;
  
  return (
    <div 
      className={cn(
        'mx-4 mt-4 p-4 rounded-lg border',
        'bg-purple-50 border-purple-200',
        'animate-in fade-in slide-in-from-top-2 duration-300'
      )}
      data-print-hide
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-purple-900">
              Continue Brochure Generation
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {completedCount}/{totalCount} sections
            </span>
          </div>
          
          <p className="text-sm text-purple-700 mb-3">
            Next up: <strong>{currentSection?.name || 'Unknown Section'}</strong>
          </p>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleContinue}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'bg-purple-500 text-white',
                'hover:bg-purple-600 transition-colors duration-200',
                'flex items-center gap-2'
              )}
            >
              <Play className="w-4 h-4" />
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleExit}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium',
                'text-purple-700 hover:bg-purple-100',
                'transition-colors duration-200'
              )}
            >
              Exit Template Mode
            </button>
          </div>
        </div>
        
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-purple-400 hover:text-purple-600 hover:bg-purple-100 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
