/**
 * @file components/tools/BrandVoice.tsx
 * @description Brand voice consistency checker
 */

'use client';

import React from 'react';
import { Building2, Shield, AlertCircle } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface BrandVoiceProps {
  editor: Editor | null;
}

export function BrandVoice({ editor }: BrandVoiceProps) {
  const hasContent = editor?.getText().trim().length ?? 0 > 0;

  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Brand Voice
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Maintain brand consistency across your copy
        </p>
      </div>

      {/* Content */}
      {!hasContent ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">
            Start writing to check brand voice
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Placeholder brand check */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                Brand Consistency
              </span>
            </div>
            <p className="text-xs text-purple-700">
              Coming Soon - Check copy against your brand guidelines
            </p>
          </div>

          {/* Coming soon message */}
          <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Under Development
            </p>
            <p className="text-xs text-gray-500">
              Ensure your copy aligns with your brand voice and guidelines
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
