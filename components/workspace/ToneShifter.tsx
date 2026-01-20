/**
 * @file components/workspace/ToneShifter.tsx
 * @description AI-powered tone shifting component for rewriting copy
 * 
 * Features:
 * - Six tone options: Professional, Casual, Urgent, Friendly, Techy, Playful
 * - Real-time loading states
 * - Result preview with insert/copy options
 * - Apple-style design aesthetic
 * - Full integration with Zustand store and TipTap editor
 * 
 * @example
 * ```tsx
 * <ToneShifter editor={editorInstance} />
 * ```
 */

'use client';

import React from 'react';
import { 
  Briefcase, 
  Smile, 
  Zap, 
  Heart, 
  Check, 
  X,
  Copy,
  FileText,
  Sparkles,
  Terminal,
  PartyPopper
} from 'lucide-react';
import { 
  useSelectedText,
  useSelectedHTML,
  useSelectionRange,
  useSelectedTone,
  useToneShiftResult,
  useToneShiftLoading,
  useToneShiftError,
  useToneShiftActions,
  type ToneType 
} from '@/lib/stores/workspaceStore';
import { insertTextAtSelection } from '@/lib/editor-utils';
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface ToneShifterProps {
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * Tone option configuration with icon and metadata
 */
const TONE_OPTIONS: {
  value: ToneType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}[] = [
  {
    value: 'professional',
    label: 'Professional',
    icon: Briefcase,
    description: 'Formal and business-appropriate',
    color: 'blue',
  },
  {
    value: 'casual',
    label: 'Casual',
    icon: Smile,
    description: 'Friendly and conversational',
    color: 'green',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    icon: Zap,
    description: 'Time-sensitive and action-oriented',
    color: 'red',
  },
  {
    value: 'friendly',
    label: 'Friendly',
    icon: Heart,
    description: 'Warm and approachable',
    color: 'pink',
  },
  {
    value: 'techy',
    label: 'Techy',
    icon: Terminal,
    description: 'Technical, precise, expertise-driven',
    color: 'purple',
  },
  {
    value: 'playful',
    label: 'Playful',
    icon: PartyPopper,
    description: 'Fun, energetic, lighthearted',
    color: 'orange',
  },
];

/**
 * ToneShifter component - AI-powered copy rewriting tool
 */
export function ToneShifter({ editor, className }: ToneShifterProps) {
  // Optimized selectors - only re-render when these specific values change
  const selectedText = useSelectedText();
  const selectedHTML = useSelectedHTML();
  const selectionRange = useSelectionRange();
  const selectedTone = useSelectedTone();
  const toneShiftResult = useToneShiftResult();
  const toneShiftLoading = useToneShiftLoading();
  const toneShiftError = useToneShiftError();
  const { runToneShift, clearToneShiftResult, insertToneShiftResult, setSelectedTone } = useToneShiftActions();

  // Check if user has text selected
  const hasSelection = selectedText && selectedText.trim().length > 0;
  const canShift = hasSelection && selectedTone && !toneShiftLoading;

  /**
   * Handle tone selection
   */
  const handleToneSelect = (tone: ToneType): void => {
    setSelectedTone(tone === selectedTone ? null : tone);
  };

  /**
   * Handle tone shift action
   * Uses HTML content to preserve formatting (bullets, headings, etc.)
   */
  const handleShiftTone = async (): Promise<void> => {
    if (!selectedTone) return;
    
    // Prefer HTML for formatting preservation, fallback to plain text
    const contentToShift = selectedHTML || selectedText;
    if (!contentToShift) return;
    
    console.log('📝 Tone shifting with formatting:', {
      hasHTML: !!selectedHTML,
      textLength: selectedText?.length || 0,
      htmlLength: selectedHTML?.length || 0,
      tone: selectedTone,
    });
    
    await runToneShift(contentToShift, selectedTone);
  };

  /**
   * Handle replace selection with result
   */
  const handleReplaceSelection = (): void => {
    if (!editor || !toneShiftResult || !selectionRange) return;
    
    // Format the HTML result (sanitize and remove excess whitespace)
    const formattedHTML = formatGeneratedContent(toneShiftResult, false);
    
    // Use editor utils to replace the selection with formatted HTML
    const success = insertTextAtSelection(editor, formattedHTML, { isHTML: true });
    
    if (success) {
      // Clear the result after replacing
      clearToneShiftResult();
      console.log('✅ Tone shifted content inserted with formatting preserved');
    }
  };

  /**
   * Handle insert result into editor (replaces entire document)
   */
  const handleInsertResult = (): void => {
    if (!editor) return;
    insertToneShiftResult(editor);
  };

  /**
   * Handle copy result to clipboard
   */
  const handleCopyResult = async (): Promise<void> => {
    if (!toneShiftResult) return;
    
    try {
      // Copy the HTML to clipboard (user can paste into editor or other tools)
      await navigator.clipboard.writeText(toneShiftResult);
      console.log('✅ Copied HTML to clipboard');
    } catch (error) {
      console.error('❌ Failed to copy:', error);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Tone Shifter
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Rewrite your copy in a different tone
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
            Highlight text in the editor to shift tone
          </p>
        </div>
      )}

      {/* Tone Selection Buttons */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
          Select Tone
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map((tone) => {
            const Icon = tone.icon;
            const isSelected = selectedTone === tone.value;
            
            return (
              <button
                key={tone.value}
                onClick={() => handleToneSelect(tone.value)}
                disabled={toneShiftLoading}
                className={cn(
                  'flex flex-col items-start gap-2 p-3 rounded-lg',
                  'border transition-all duration-200',
                  'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isSelected
                    ? 'bg-apple-blue text-white border-apple-blue shadow-sm'
                    : 'bg-white text-apple-text-dark border-apple-gray-light hover:border-apple-gray hover:bg-apple-gray-bg'
                )}
                title={tone.description}
              >
                <Icon className={cn('w-5 h-5', isSelected ? 'text-white' : 'text-apple-blue')} />
                <div className="flex flex-col items-start gap-0.5 w-full">
                  <span className="text-sm font-medium text-left">{tone.label}</span>
                  <span className={cn(
                    'text-xs text-left',
                    isSelected ? 'text-blue-100' : 'text-apple-text-light'
                  )}>
                    {tone.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleShiftTone}
        disabled={!canShift}
        className={cn(
          'w-full py-3 px-4 rounded-lg',
          'font-medium text-sm',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          // Keep blue background during loading
          'bg-apple-blue text-white hover:bg-blue-600 shadow-sm hover:shadow',
          'disabled:bg-apple-blue disabled:text-white disabled:cursor-wait',
          // Gray background only when truly disabled (not just loading)
          !hasSelection && !toneShiftLoading && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
        )}
      >
        {toneShiftLoading ? (
          <AIWorxButtonLoader />
        ) : (
          'Shift Tone'
        )}
      </button>

      {/* Helper Text */}
      {!hasSelection && (
        <p className="text-xs text-apple-text-light text-center">
          Select text in the editor to use Tone Shifter
        </p>
      )}

      {/* Error Display */}
      {toneShiftError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{toneShiftError}</p>
          </div>
          <button
            onClick={clearToneShiftResult}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Result Display */}
      {toneShiftResult && (
        <div className="flex flex-col gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          {/* Success Header */}
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Rewrite Complete
            </span>
          </div>

          {/* Result Preview */}
          <div className="bg-white border border-green-200 rounded p-3 max-h-48 overflow-y-auto custom-scrollbar">
            <div 
              className="text-sm text-apple-text-dark prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: toneShiftResult }}
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
              title="Replace selected text with rewritten version"
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
              onClick={clearToneShiftResult}
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
