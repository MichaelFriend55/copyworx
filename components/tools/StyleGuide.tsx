/**
 * @file components/tools/StyleGuide.tsx
 * @description Apply brand style guide rules
 */

'use client';

import React from 'react';
import { Palette, BookOpen, AlertCircle } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface StyleGuideProps {
  editor: Editor | null;
}

export function StyleGuide({ editor }: StyleGuideProps) {
  const hasContent = editor?.getText().trim().length ?? 0 > 0;

  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Style Guide
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Apply your style rules and preferences
        </p>
      </div>

      {/* Content */}
      {!hasContent ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            Start writing to apply style rules
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Placeholder style check */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">
                Style Rules
              </span>
            </div>
            <p className="text-xs text-indigo-700">
              Coming Soon - Apply custom style rules and formatting
            </p>
          </div>

          {/* Coming soon message */}
          <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Under Development
            </p>
            <p className="text-xs text-gray-500">
              Define and apply your custom style guide rules
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
