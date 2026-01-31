/**
 * @file components/ApiUsageDisplay.tsx
 * @description Displays API usage statistics for the current user
 * 
 * Features:
 * - Progress bar showing usage against $5.00 beta limit
 * - Color-coded status (green/yellow/red)
 * - Loading skeleton state
 * - Tooltip with beta info
 * - Responsive design for sidebar/topbar placement
 * 
 * @example
 * ```tsx
 * // In sidebar or dashboard
 * <ApiUsageDisplay />
 * 
 * // Compact variant for header
 * <ApiUsageDisplay variant="compact" />
 * ```
 */

'use client';

import React, { useState } from 'react';
import { useApiUsage } from '@/lib/hooks/useApiUsage';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, RefreshCw } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ApiUsageDisplayProps {
  /** Display variant */
  variant?: 'default' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Skeleton loader for the usage display
 */
function UsageSkeleton({ variant }: { variant: 'default' | 'compact' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-2 w-16 bg-ink-200 dark:bg-ink-700 rounded-full" />
        <div className="h-3 w-12 bg-ink-200 dark:bg-ink-700 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 bg-ink-200 dark:bg-ink-700 rounded" />
        <div className="h-3 w-12 bg-ink-200 dark:bg-ink-700 rounded" />
      </div>
      <div className="h-2 w-full bg-ink-200 dark:bg-ink-700 rounded-full" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 bg-ink-200 dark:bg-ink-700 rounded" />
        <div className="h-3 w-16 bg-ink-200 dark:bg-ink-700 rounded" />
      </div>
    </div>
  );
}

/**
 * Tooltip component for displaying beta info
 */
function Tooltip({ 
  children, 
  content 
}: { 
  children: React.ReactNode; 
  content: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 text-xs text-white bg-ink-900 dark:bg-ink-700 rounded-lg shadow-lg whitespace-nowrap max-w-[250px] text-center"
          role="tooltip"
        >
          {content}
          {/* Arrow pointing up */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-ink-900 dark:border-b-ink-700" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Progress Bar Colors
// ============================================================================

/**
 * Get progress bar color based on percentage used
 */
function getProgressColor(percentUsed: number): string {
  if (percentUsed >= 80) {
    return 'bg-red-500'; // #ef4444
  }
  if (percentUsed >= 50) {
    return 'bg-amber-500'; // #f59e0b
  }
  return 'bg-emerald-500'; // #10b981
}

/**
 * Get text color based on percentage used
 */
function getTextColor(percentUsed: number, isOverLimit: boolean): string {
  if (isOverLimit) {
    return 'text-red-600 dark:text-red-400 font-semibold';
  }
  if (percentUsed >= 80) {
    return 'text-red-600 dark:text-red-400';
  }
  if (percentUsed >= 50) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-ink-600 dark:text-ink-300';
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * API Usage Display component
 * 
 * Shows the user's API usage progress toward the $5.00 beta limit
 * with color-coded status indicators and helpful tooltips.
 */
export function ApiUsageDisplay({ 
  variant = 'default',
  className 
}: ApiUsageDisplayProps) {
  const {
    totalCost,
    percentUsed,
    remainingBudget,
    isOverLimit,
    isLoading,
    error,
    refetch,
  } = useApiUsage();

  // Format currency to 2 decimal places
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  // Format percentage (cap display at 100% for visual, show actual in text)
  const displayPercent = Math.min(percentUsed, 100);
  const percentText = `${Math.round(percentUsed)}%`;

  // Handle error state
  if (error && !isLoading) {
    return (
      <div className={cn('text-xs text-red-500', className)}>
        <span>Unable to load usage</span>
      </div>
    );
  }

  // ============================================================================
  // Compact Variant
  // ============================================================================
  
  if (variant === 'compact') {
    if (isLoading) {
      return <UsageSkeleton variant="compact" />;
    }

    return (
      <Tooltip content="Beta users have $5 API credit. Contact support to upgrade.">
        <div 
          className={cn(
            'flex items-center gap-1.5 cursor-help',
            'min-w-[75px] max-w-[90px]', // Constrain width to prevent overlap
            className
          )}
        >
          {/* Mini progress bar */}
          <div className="w-12 sm:w-16 h-1.5 bg-ink-200 dark:bg-ink-700 rounded-full overflow-hidden flex-shrink-0">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                getProgressColor(percentUsed)
              )}
              style={{ width: `${displayPercent}%` }}
            />
          </div>
          
          {/* Cost text */}
          <span className={cn(
            'text-xs font-medium whitespace-nowrap',
            getTextColor(percentUsed, isOverLimit)
          )}>
            {formatCurrency(totalCost)}
          </span>

          {/* Warning icon if over limit */}
          {isOverLimit && (
            <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
          )}
        </div>
      </Tooltip>
    );
  }

  // ============================================================================
  // Default Variant
  // ============================================================================

  if (isLoading) {
    return (
      <div className={cn('p-3 rounded-lg bg-ink-50 dark:bg-ink-900/50', className)}>
        <UsageSkeleton variant="default" />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'p-3 rounded-lg bg-ink-50 dark:bg-ink-900/50 border border-ink-200 dark:border-ink-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Tooltip content="Beta users have $5 API credit. Contact support to upgrade.">
          <div className="flex items-center gap-1.5 cursor-help">
            <span className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">
              API Usage
            </span>
            <Info className="w-3 h-3 text-ink-400 dark:text-ink-500" />
          </div>
        </Tooltip>

        {/* Refresh button */}
        <button
          onClick={() => refetch()}
          className="p-1 rounded hover:bg-ink-200 dark:hover:bg-ink-800 transition-colors"
          title="Refresh usage data"
          aria-label="Refresh usage data"
        >
          <RefreshCw className="w-3 h-3 text-ink-400 dark:text-ink-500" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="h-2 bg-ink-200 dark:bg-ink-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              getProgressColor(percentUsed)
            )}
            style={{ width: `${displayPercent}%` }}
            role="progressbar"
            aria-valuenow={Math.round(percentUsed)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`API usage: ${percentText}`}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        {/* Cost display */}
        <span className={cn(
          'text-sm',
          getTextColor(percentUsed, isOverLimit)
        )}>
          {formatCurrency(totalCost)} / $5.00
        </span>

        {/* Percentage or Limit Badge */}
        {isOverLimit ? (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" />
            Limit Reached
          </div>
        ) : (
          <span className={cn(
            'text-xs',
            getTextColor(percentUsed, isOverLimit)
          )}>
            {percentText} used
          </span>
        )}
      </div>

      {/* Remaining budget (only show if not over limit) */}
      {!isOverLimit && remainingBudget > 0 && (
        <p className="text-xs text-ink-400 dark:text-ink-500 mt-1.5">
          {formatCurrency(remainingBudget)} remaining
        </p>
      )}

      {/* Over limit message */}
      {isOverLimit && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">
          Contact support to upgrade your plan.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Default Export
// ============================================================================

export default ApiUsageDisplay;
