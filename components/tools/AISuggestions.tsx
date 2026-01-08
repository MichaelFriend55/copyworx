/**
 * @file components/tools/AISuggestions.tsx
 * @description AI-powered improvement suggestions
 */

'use client';

import React from 'react';
import { Lightbulb, Sparkles, AlertCircle } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface AISuggestionsProps {
  editor: Editor | null;
}

export function AISuggestions({ editor }: AISuggestionsProps) {
  const hasContent = editor?.getText().trim().length ?? 0 > 0;

  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Header with NEW badge */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            AI Suggestions
          </h2>
          <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
            NEW
          </span>
        </div>
        <p className="text-sm text-apple-text-light">
          Get AI-powered improvement ideas
        </p>
      </div>

      {/* Content */}
      {!hasContent ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            Start writing to get AI suggestions
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Placeholder suggestions */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">
                AI Insights
              </span>
            </div>
            <p className="text-xs text-yellow-700">
              Coming Soon - Get intelligent suggestions to improve your copy
            </p>
          </div>

          {/* Coming soon message */}
          <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Under Development
            </p>
            <p className="text-xs text-gray-500">
              AI will analyze your copy and suggest improvements
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
