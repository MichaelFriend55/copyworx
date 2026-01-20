/**
 * @file components/workspace/ShortenTool.tsx
 * @description AI-powered copy shortening component
 * 
 * Features:
 * - Shortens copy while preserving core message and impact
 * - Real-time loading states
 * - Result preview with insert/copy options
 * - Apple-style design aesthetic
 * - Full integration with Zustand store and TipTap editor
 * 
 * @example
 * ```tsx
 * <ShortenTool editor={editorInstance} />
 * ```
 */

'use client';

import React from 'react';
import { 
  Minimize2, 
  Check, 
  X,
  Copy,
  FileText,
  Sparkles
} from 'lucide-react';
import { 
  useSelectedText,
  useSelectedHTML,
  useSelectionRange,
  useShortenResult,
  useShortenLoading,
  useShortenError,
  useShortenActions,
} from '@/lib/stores/workspaceStore';
import { insertTextAtSelection } from '@/lib/editor-utils';
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface ShortenToolProps {
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * ShortenTool component - AI-powered copy shortening tool
 */
export function ShortenTool({ editor, className }: ShortenToolProps) {
  // Optimized selectors - only re-render when these specific values change
  const selectedText = useSelectedText();
  const selectedHTML = useSelectedHTML();
  const selectionRange = useSelectionRange();
  const shortenResult = useShortenResult();
  const shortenLoading = useShortenLoading();
  const shortenError = useShortenError();
  const { runShorten, clearShortenResult, insertShortenResult } = useShortenActions();

  // Check if user has text selected
  const hasSelection = selectedText && selectedText.trim().length > 0;
  const canShorten = hasSelection && !shortenLoading;

  /**
   * Handle shorten action
   * Uses HTML content to preserve formatting (bullets, headings, etc.)
   */
  const handleShorten = async () => {
    // Prefer HTML for formatting preservation, fallback to plain text
    const contentToShorten = selectedHTML || selectedText;
    if (!contentToShorten) return;
    
    console.log('📝 Shortening with formatting:', {
      hasHTML: !!selectedHTML,
      textLength: selectedText?.length || 0,
      htmlLength: selectedHTML?.length || 0,
    });
    
    await runShorten(contentToShorten);
  };

  /**
   * Handle replace selection with result
   */
  const handleReplaceSelection = (): void => {
    if (!editor || !shortenResult || !selectionRange) return;
    
    // Format the HTML result (sanitize and remove excess whitespace)
    const formattedHTML = formatGeneratedContent(shortenResult, false);
    
    // Use editor utils to replace the selection with formatted HTML
    const success = insertTextAtSelection(editor, formattedHTML, { isHTML: true });
    
    if (success) {
      // Clear the result after replacing
      clearShortenResult();
      console.log('✅ Shortened content inserted with formatting preserved');
    }
  };

  /**
   * Handle insert result into editor (replaces entire document)
   */
  const handleInsertResult = (): void => {
    if (!editor) return;
    insertShortenResult(editor);
  };

  /**
   * Handle copy result to clipboard
   */
  const handleCopyResult = async (): Promise<void> => {
    if (!shortenResult) return;
    
    try {
      await navigator.clipboard.writeText(shortenResult);
      // TODO: Show toast notification
      console.log('✅ Copied to clipboard');
    } catch (error) {
      console.error('❌ Failed to copy:', error);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Minimize2 className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Shorten Copy
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Make your copy concise and impactful
        </p>
      </div>

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
            Highlight text in the editor to shorten
          </p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleShorten}
        disabled={!canShorten}
        className={cn(
          'w-full py-3 px-4 rounded-lg',
          'font-medium text-sm text-white',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          // Animated gradient when loading
          shortenLoading && 'aiworx-gradient-animated cursor-wait',
          // Brand button with blue→purple active when not loading
          !shortenLoading && hasSelection && 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200',
          // Gray background when truly disabled (not loading)
          !hasSelection && !shortenLoading && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
        )}
      >
        {shortenLoading ? (
          <AIWorxButtonLoader />
        ) : (
          'Shorten Copy'
        )}
      </button>

      {/* Helper Text */}
      {!hasSelection && (
        <p className="text-xs text-apple-text-light text-center">
          Select text in the editor to use Shorten
        </p>
      )}

      {/* Error Display */}
      {shortenError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{shortenError}</p>
          </div>
          <button
            onClick={clearShortenResult}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Result Display */}
      {shortenResult && (
        <div className="flex flex-col gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          {/* Success Header */}
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Shortened Complete
            </span>
          </div>

          {/* Result Preview */}
          <div className="bg-white border border-green-200 rounded p-3 max-h-48 overflow-y-auto custom-scrollbar">
            <div 
              className="text-sm text-apple-text-dark prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: shortenResult }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleReplaceSelection}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg',
                'bg-green-600 text-white text-sm font-medium',
                'hover:bg-green-700 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                'flex items-center justify-center gap-2'
              )}
              disabled={!selectionRange}
              title="Replace selected text with shortened version"
            >
              <Check className="w-4 h-4" />
              Replace Selection
            </button>
            <button
              onClick={handleCopyResult}
              className={cn(
                'py-2 px-3 rounded-lg',
                'bg-white border border-green-300 text-green-700 text-sm font-medium',
                'hover:bg-green-50 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                'flex items-center justify-center gap-2'
              )}
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={clearShortenResult}
              className={cn(
                'py-2 px-3 rounded-lg',
                'bg-white border border-green-300 text-green-700 text-sm font-medium',
                'hover:bg-green-50 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                'flex items-center justify-center gap-2'
              )}
              title="Clear result"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
