/**
 * @file components/workspace/ViewModeSelector.tsx
 * @description Segmented control for selecting editor view mode
 * 
 * Features:
 * - Three view modes: Page, Scrolling, Focus
 * - Segmented button control with icons
 * - Active state highlighting
 * - Tooltips for each mode
 * - Apple-style aesthetic matching existing toolbar
 * 
 * @example
 * ```tsx
 * <ViewModeSelector
 *   viewMode={viewMode}
 *   onViewModeChange={setViewMode}
 * />
 * ```
 */

'use client';

import React from 'react';
import { FileText, ArrowUpDown, Focus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/lib/types';

interface ViewModeSelectorProps {
  /** Current active view mode */
  viewMode: ViewMode;
  
  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void;
  
  /** Whether the selector is disabled */
  disabled?: boolean;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * View mode configuration with icons and labels
 */
const VIEW_MODES: {
  mode: ViewMode;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
}[] = [
  {
    mode: 'page',
    icon: <FileText className="w-4 h-4" />,
    label: 'Page',
    tooltip: 'Page Mode - Fixed width document layout',
  },
  {
    mode: 'scrolling',
    icon: <ArrowUpDown className="w-4 h-4" />,
    label: 'Scroll',
    tooltip: 'Scrolling Mode - Continuous full-width view',
  },
  {
    mode: 'focus',
    icon: <Focus className="w-4 h-4" />,
    label: 'Focus',
    tooltip: 'Focus Mode - Distraction-free writing',
  },
];

/**
 * Segmented control component for selecting editor view mode
 * Provides three view options: Page, Scrolling, and Focus modes
 */
export function ViewModeSelector({
  viewMode,
  onViewModeChange,
  disabled = false,
  className,
}: ViewModeSelectorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center',
        'bg-apple-gray-bg rounded-lg p-0.5',
        'border border-gray-200/50',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      role="group"
      aria-label="View mode selector"
    >
      {VIEW_MODES.map(({ mode, icon, label, tooltip }) => {
        const isActive = viewMode === mode;
        
        return (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            disabled={disabled}
            title={tooltip}
            aria-pressed={isActive}
            aria-label={tooltip}
            className={cn(
              'flex items-center gap-1.5',
              'px-2.5 py-1.5 rounded-md',
              'text-xs font-medium',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-inset',
              isActive
                ? 'bg-white text-apple-text-dark shadow-sm'
                : 'text-gray-500 hover:text-apple-text-dark hover:bg-gray-100/50'
            )}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ViewModeSelector;
