/**
 * @file components/tools/GrammarPolish.tsx
 * @description Grammar and style correction tool
 */

'use client';

import React from 'react';
import { Type, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface GrammarPolishProps {
  editor: Editor | null;
}

export function GrammarPolish({ editor }: GrammarPolishProps) {
  const hasContent = editor?.getText().trim().length ?? 0 > 0;

  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Grammar Polish
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Fix grammar and style issues
        </p>
      </div>

      {/* Content */}
      {!hasContent ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            Start writing to check grammar
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Placeholder status */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                Grammar Check
              </span>
            </div>
            <p className="text-xs text-green-700">
              Coming Soon - Automatic grammar and style corrections
            </p>
          </div>

          {/* Coming soon message */}
          <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Under Development
            </p>
            <p className="text-xs text-gray-500">
              This tool will detect and fix grammar, punctuation, and style issues
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
