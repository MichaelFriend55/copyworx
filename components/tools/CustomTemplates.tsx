/**
 * @file components/tools/CustomTemplates.tsx
 * @description Manage user's custom templates
 */

'use client';

import React from 'react';
import { FileText, Plus, Inbox } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface CustomTemplatesProps {
  editor: Editor | null;
}

export function CustomTemplates({ editor }: CustomTemplatesProps) {
  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            My Templates
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Your saved custom templates
        </p>
      </div>

      {/* Add template button */}
      <button
        disabled
        className="w-full py-3 px-4 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        Save Current as Template
      </button>

      {/* Empty state */}
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-600 mb-1">
          No Templates Yet
        </p>
        <p className="text-xs text-gray-500">
          Create and save your own templates
        </p>
      </div>

      {/* Coming soon message */}
      <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-sm font-medium text-gray-600 mb-1">
          Under Development
        </p>
        <p className="text-xs text-gray-500">
          Save and manage your custom templates
        </p>
      </div>
    </div>
  );
}
