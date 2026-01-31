/**
 * @file components/workspace/SaveAsSnippetButton.tsx
 * @description Button component to save selected text as a snippet
 * 
 * Features:
 * - Appears when text is selected in the editor
 * - Opens the Save as Snippet modal
 * - Shows disabled state when no selection
 */

'use client';

import React, { useCallback } from 'react';
import { Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSelectedText, useActiveProjectId } from '@/lib/stores/workspaceStore';
import { useSnippetActions } from '@/lib/stores/snippetStore';

interface SaveAsSnippetButtonProps {
  /** Optional CSS classes */
  className?: string;
  /** Whether to show label text */
  showLabel?: boolean;
  /** Button variant */
  variant?: 'default' | 'toolbar';
  /** Optional data-tour attribute for product tour */
  dataTour?: string;
}

/**
 * Button to save selected text as a snippet
 * 
 * @example
 * ```tsx
 * // In toolbar
 * <SaveAsSnippetButton variant="toolbar" />
 * 
 * // In context menu
 * <SaveAsSnippetButton showLabel />
 * ```
 */
export function SaveAsSnippetButton({
  className,
  showLabel = false,
  variant = 'default',
  dataTour,
}: SaveAsSnippetButtonProps) {
  const selectedText = useSelectedText();
  const activeProjectId = useActiveProjectId();
  const { openSaveAsSnippet, loadSnippets } = useSnippetActions();
  
  // Check if we have text selected and a project
  const hasSelection = selectedText && selectedText.trim().length > 0;
  const hasProject = !!activeProjectId;
  const isDisabled = !hasSelection || !hasProject;
  
  // Handle click - open save as snippet modal
  const handleClick = useCallback(() => {
    if (isDisabled || !selectedText) return;
    
    // Load snippets for current project first
    if (activeProjectId) {
      loadSnippets(activeProjectId);
    }
    
    // Open the modal with selected text
    openSaveAsSnippet(selectedText);
  }, [isDisabled, selectedText, activeProjectId, loadSnippets, openSaveAsSnippet]);
  
  // Get button styles based on variant
  const buttonStyles = variant === 'toolbar'
    ? cn(
        'w-8 h-8 rounded-md',
        'flex items-center justify-center',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
        isDisabled
          ? 'opacity-30 cursor-not-allowed'
          : hasSelection
          ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
          : 'text-apple-text-dark hover:bg-apple-gray-bg'
      )
    : cn(
        'px-3 py-2 rounded-lg',
        'text-sm font-medium',
        'flex items-center gap-2',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
        isDisabled
          ? 'opacity-50 cursor-not-allowed text-gray-400'
          : 'text-purple-600 hover:bg-purple-50'
      );
  
  // Get title/tooltip
  const title = isDisabled
    ? !hasProject
      ? 'Select a project first'
      : 'Select text to save as snippet'
    : 'Save selection as snippet';

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
      className={cn(buttonStyles, className)}
      data-tour={dataTour}
    >
      <Scissors className={cn(
        variant === 'toolbar' ? 'w-4 h-4' : 'w-4 h-4',
        hasSelection && !isDisabled && 'text-purple-600'
      )} />
      {showLabel && (
        <span>Save as Snippet</span>
      )}
    </button>
  );
}

export default SaveAsSnippetButton;
