/**
 * @file components/workspace/ToneShifter.tsx
 * @description AI-powered tone shifting component for rewriting copy
 * 
 * Features:
 * - Four tone options: Professional, Casual, Urgent, Friendly
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
  Loader2, 
  Check, 
  X,
  Copy,
  FileText
} from 'lucide-react';
import { useWorkspaceStore, type ToneType } from '@/lib/stores/workspaceStore';
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
];

/**
 * ToneShifter component - AI-powered copy rewriting tool
 */
export function ToneShifter({ editor, className }: ToneShifterProps) {
  const {
    selectedTone,
    toneShiftResult,
    toneShiftLoading,
    toneShiftError,
    setSelectedTone,
    runToneShift,
    clearToneShiftResult,
    insertToneShiftResult,
  } = useWorkspaceStore();

  // Check if editor has content
  const hasContent = editor?.getText().trim().length ?? 0 > 0;
  const canShift = hasContent && selectedTone && !toneShiftLoading;

  /**
   * Handle tone selection
   */
  const handleToneSelect = (tone: ToneType) => {
    setSelectedTone(tone === selectedTone ? null : tone);
  };

  /**
   * Handle tone shift action
   */
  const handleShiftTone = async () => {
    if (!editor || !selectedTone || !hasContent) return;
    
    const text = editor.getHTML();
    await runToneShift(text, selectedTone);
  };

  /**
   * Handle insert result into editor
   */
  const handleInsertResult = () => {
    if (!editor) return;
    insertToneShiftResult(editor);
  };

  /**
   * Handle copy result to clipboard
   */
  const handleCopyResult = async () => {
    if (!toneShiftResult) return;
    
    try {
      await navigator.clipboard.writeText(toneShiftResult);
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
          <FileText className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Tone Shifter
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Rewrite your copy in a different tone
        </p>
      </div>

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
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium">{tone.label}</span>
                  <span className={cn(
                    'text-xs',
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
          'disabled:opacity-50 disabled:cursor-not-allowed',
          canShift
            ? 'bg-apple-blue text-white hover:bg-blue-600 shadow-sm hover:shadow'
            : 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
        )}
      >
        {toneShiftLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Rewriting...
          </span>
        ) : (
          'Shift Tone'
        )}
      </button>

      {/* Helper Text */}
      {!hasContent && (
        <p className="text-xs text-apple-text-light text-center">
          Start writing in the editor to use Tone Shifter
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
              onClick={handleInsertResult}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg',
                'bg-green-600 text-white text-sm font-medium',
                'hover:bg-green-700 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                'flex items-center justify-center gap-2'
              )}
            >
              <Check className="w-4 h-4" />
              Insert
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
