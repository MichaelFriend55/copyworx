/**
 * @file components/tools/PerformanceMetrics.tsx
 * @description Track and analyze copy performance
 */

'use client';

import React from 'react';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface PerformanceMetricsProps {
  editor: Editor | null;
}

export function PerformanceMetrics({ editor }: PerformanceMetricsProps) {
  return (
    <div className={cn('flex flex-col gap-6')}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Performance Metrics
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Track how your copy performs
        </p>
      </div>

      {/* Placeholder metrics */}
      <div className="space-y-3">
        {[
          { label: 'Engagement Rate', icon: Activity, color: 'green' },
          { label: 'Conversion Rate', icon: TrendingUp, color: 'blue' },
          { label: 'A/B Test Results', icon: BarChart3, color: 'purple' },
        ].map(({ label, icon: Icon, color }) => (
          <div
            key={label}
            className={cn(
              'p-4 rounded-lg border-2',
              color === 'green' && 'bg-green-50 border-green-200',
              color === 'blue' && 'bg-blue-50 border-blue-200',
              color === 'purple' && 'bg-purple-50 border-purple-200'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn('w-4 h-4', `text-${color}-600`)} />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">No data yet</p>
          </div>
        ))}
      </div>

      {/* Coming soon message */}
      <div className="p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-sm font-medium text-gray-600 mb-1">
          Under Development
        </p>
        <p className="text-xs text-gray-500">
          Track engagement, conversions, and A/B test results
        </p>
      </div>
    </div>
  );
}
