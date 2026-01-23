/**
 * @file components/workspace/ViewModeSelector.tsx
 * @description View mode selector with Export to PDF button
 * 
 * Features:
 * - Two view modes: Scrolling, Focus
 * - Export to PDF button (uses browser print dialog)
 */

'use client';

import React, { useCallback, useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { ArrowUpDown, Focus, FileDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ViewMode } from '@/lib/types';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * View mode configuration
 */
const VIEW_MODES: {
  mode: ViewMode;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
}[] = [
  {
    mode: 'scrolling',
    icon: <ArrowUpDown className="w-4 h-4" />,
    label: 'Scroll',
    tooltip: 'Scrolling Mode - Continuous document view',
  },
  {
    mode: 'focus',
    icon: <Focus className="w-4 h-4" />,
    label: 'Focus',
    tooltip: 'Focus Mode - Distraction-free writing',
  },
];

/**
 * ViewModeSelector with Export to PDF
 */
export function ViewModeSelector({
  viewMode,
  onViewModeChange,
  disabled = false,
  className,
}: ViewModeSelectorProps) {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Export to PDF using browser print dialog
   * User can choose "Save as PDF" in the print dialog
   */
  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    
    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Open browser print dialog
      // User can select "Save as PDF" as the destination
      window.print();
      
      toast.success('Print dialog opened. Select "Save as PDF" to export.');
    } catch (error) {
      logger.error('Export failed:', error);
      toast.error('Failed to open print dialog');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* View Mode Toggle */}
      <div
        className={cn(
          'inline-flex items-center',
          'bg-apple-gray-bg rounded-lg p-0.5',
          'border border-gray-200/50'
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

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Export to PDF Button */}
      <button
        onClick={handleExportPDF}
        disabled={disabled || isExporting}
        title="Export to PDF (opens print dialog)"
        aria-label="Export to PDF"
        className={cn(
          'flex items-center gap-1.5',
          'px-3 py-1.5 rounded-lg',
          'text-xs font-medium',
          'bg-gray-600 text-white',
          'hover:bg-gray-700 active:bg-gray-800',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-gray-400/30',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Export PDF</span>
      </button>
    </div>
  );
}

export default ViewModeSelector;
