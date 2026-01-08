/**
 * @file components/tools/TemplateBrowser.tsx
 * @description Browse and use copywriting templates
 */

'use client';

import React from 'react';
import { FileText, Search, Folder } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface TemplateBrowserProps {
  editor: Editor | null;
}

export function TemplateBrowser({ editor }: TemplateBrowserProps) {
  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Template Browser
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Browse professional copywriting templates
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates..."
          disabled
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 cursor-not-allowed"
        />
      </div>

      {/* Categories placeholder */}
      <div className="space-y-2">
        {['Email Marketing', 'Landing Pages', 'Social Media', 'Blog Posts'].map((category) => (
          <div
            key={category}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-50"
          >
            <Folder className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{category}</span>
          </div>
        ))}
      </div>

      {/* Coming soon message */}
      <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-sm font-medium text-gray-600 mb-1">
          Under Development
        </p>
        <p className="text-xs text-gray-500">
          Browse and use professional copywriting templates
        </p>
      </div>
    </div>
  );
}
