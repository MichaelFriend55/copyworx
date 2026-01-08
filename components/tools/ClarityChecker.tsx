/**
 * @file components/tools/ClarityChecker.tsx
 * @description Clarity and readability analysis tool
 */

'use client';

import React from 'react';
import { FileSearch, BarChart3, AlertCircle } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface ClarityCheckerProps {
  editor: Editor | null;
}

export function ClarityChecker({ editor }: ClarityCheckerProps) {
  const hasContent = editor?.getText().trim().length ?? 0 > 0;

  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Clarity Checker
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Analyze readability and clarity of your copy
        </p>
      </div>

      {/* Content */}
      {!hasContent ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            Start writing to analyze clarity
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Placeholder metrics */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Readability Score
              </span>
            </div>
            <p className="text-xs text-blue-700">
              Coming Soon - Flesch Reading Ease, Grade Level, and more
            </p>
          </div>

          {/* Coming soon message */}
          <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Under Development
            </p>
            <p className="text-xs text-gray-500">
              This tool will analyze your copy for clarity, readability, and comprehension
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
