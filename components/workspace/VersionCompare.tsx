/**
 * @file components/workspace/VersionCompare.tsx
 * @description Read-only side-by-side version comparison with word-level diff highlighting.
 *
 * Uses jsdiff's diffWords() to compare plain text extracted from TipTap HTML.
 * Left pane shows the "before" (removals in red), right pane shows the "after"
 * (additions in green). Both panes are independently scrollable.
 */

'use client';

import React, { useMemo } from 'react';
import { diffWords } from 'diff';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface VersionDoc {
  title: string;
  version: number;
  content: string;
  modifiedAt: string;
}

interface VersionOption {
  version: number;
  id: string;
}

interface VersionCompareProps {
  leftDoc: VersionDoc;
  rightDoc: VersionDoc;
  allVersions: VersionOption[];
  onChangeLeft: (versionId: string) => void;
  onChangeRight: (versionId: string) => void;
  onClose: () => void;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Strip HTML tags from TipTap content, preserving paragraph/block-level breaks
 * as newlines so the diff output retains document structure.
 */
function stripHtml(html: string): string {
  if (!html) return '';

  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * Format an ISO date string as a readable short date.
 */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ============================================================================
// Sub-components
// ============================================================================

interface VersionSelectorProps {
  label: string;
  currentVersion: number;
  allVersions: VersionOption[];
  onChange: (versionId: string) => void;
}

function VersionSelector({ label, currentVersion, allVersions, onChange }: VersionSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="font-medium">{label}</span>
      <select
        value={allVersions.find((v) => v.version === currentVersion)?.id ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          'cursor-pointer',
        )}
      >
        {allVersions.map((v) => (
          <option key={v.id} value={v.id}>
            v{v.version}
          </option>
        ))}
      </select>
    </label>
  );
}

// ============================================================================
// Diff Rendering
// ============================================================================

interface DiffPaneProps {
  parts: ReturnType<typeof diffWords>;
  side: 'left' | 'right';
}

/**
 * Renders a single pane of the diff output. For the left pane we show removed
 * text highlighted; for the right pane we show added text highlighted.
 */
function DiffPane({ parts, side }: DiffPaneProps) {
  const rendered = useMemo(() => {
    const segments: React.ReactNode[] = [];
    let key = 0;

    for (const part of parts) {
      if (side === 'left' && part.added) continue;
      if (side === 'right' && part.removed) continue;

      const isHighlighted =
        (side === 'left' && part.removed) || (side === 'right' && part.added);

      const paragraphs = part.value.split('\n');

      for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
        const text = paragraphs[pIdx];

        if (pIdx > 0) {
          segments.push(<br key={`br-${key++}`} />);
        }

        if (text.length === 0) continue;

        if (isHighlighted) {
          segments.push(
            <span
              key={`hl-${key++}`}
              className={cn(
                'rounded-sm px-0.5 py-[1px]',
                side === 'left'
                  ? 'bg-red-50 text-red-700 line-through decoration-red-300'
                  : 'bg-emerald-50 text-emerald-700',
              )}
            >
              {text}
            </span>,
          );
        } else {
          segments.push(<span key={`txt-${key++}`}>{text}</span>);
        }
      }
    }

    return segments;
  }, [parts, side]);

  return (
    <div className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap font-sans">
      {rendered}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VersionCompare({
  leftDoc,
  rightDoc,
  allVersions,
  onChangeLeft,
  onChangeRight,
  onClose,
}: VersionCompareProps) {
  const leftText = useMemo(() => stripHtml(leftDoc.content), [leftDoc.content]);
  const rightText = useMemo(() => stripHtml(rightDoc.content), [rightDoc.content]);

  const diffParts = useMemo(() => diffWords(leftText, rightText), [leftText, rightText]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const part of diffParts) {
      const wordCount = part.value.split(/\s+/).filter(Boolean).length;
      if (part.added) added += wordCount;
      if (part.removed) removed += wordCount;
    }
    return { added, removed };
  }, [diffParts]);

  return (
    <div className="flex flex-col h-full w-full bg-white rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-gray-900">Compare Versions</h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {stats.removed > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                {stats.removed} removed
              </span>
            )}
            {stats.added > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                {stats.added} added
              </span>
            )}
            {stats.added === 0 && stats.removed === 0 && (
              <span className="text-gray-400">No differences</span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
            'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary/30',
          )}
          aria-label="Close comparison view"
        >
          <X className="w-4 h-4" />
          <span>Close</span>
        </button>
      </div>

      {/* Two-column pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left pane */}
        <div className="flex-1 flex flex-col border-r border-gray-200 min-w-0">
          {/* Left pane header */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/40 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <VersionSelector
                label="Version:"
                currentVersion={leftDoc.version}
                allVersions={allVersions}
                onChange={onChangeLeft}
              />
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDate(leftDoc.modifiedAt)}
              </span>
            </div>
          </div>
          {/* Left pane content */}
          <div className="flex-1 overflow-y-auto p-6">
            <DiffPane parts={diffParts} side="left" />
          </div>
        </div>

        {/* Right pane */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Right pane header */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/40 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <VersionSelector
                label="Version:"
                currentVersion={rightDoc.version}
                allVersions={allVersions}
                onChange={onChangeRight}
              />
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDate(rightDoc.modifiedAt)}
              </span>
            </div>
          </div>
          {/* Right pane content */}
          <div className="flex-1 overflow-y-auto p-6">
            <DiffPane parts={diffParts} side="right" />
          </div>
        </div>
      </div>
    </div>
  );
}
