/**
 * @file components/workspace/Sidebar.tsx
 * @description Reusable collapsible sidebar component for workspace
 * 
 * Features:
 * - Smooth slide animation (300ms)
 * - Collapse/expand button
 * - Works for both left and right sidebars
 * - Responsive design
 * - Apple-style aesthetic
 * 
 * @example
 * ```tsx
 * <Sidebar
 *   side="left"
 *   isOpen={leftSidebarOpen}
 *   onToggle={toggleLeftSidebar}
 * >
 *   <div>Sidebar content</div>
 * </Sidebar>
 * ```
 */

'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  /** Which side of the screen this sidebar appears on */
  side: 'left' | 'right';
  
  /** Controls sidebar visibility */
  isOpen: boolean;
  
  /** Callback when toggle button is clicked */
  onToggle: () => void;
  
  /** Sidebar content */
  children: React.ReactNode;
  
  /** Optional CSS classes */
  className?: string;
  
  /** Optional width override (default: 280px for left, 320px for right) */
  width?: number;
}

/**
 * Collapsible sidebar component with smooth animations
 */
export function Sidebar({
  side,
  isOpen,
  onToggle,
  children,
  className,
  width,
}: SidebarProps) {
  const defaultWidth = side === 'left' ? 300 : 320;
  const sidebarWidth = width || defaultWidth;

  return (
    <div className="relative h-full">
      {/* Toggle button - always visible outside sidebar */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute top-4 z-20',
          'w-6 h-6 rounded-full',
          'bg-white border border-apple-gray-light',
          'flex items-center justify-center',
          'hover:bg-apple-gray-bg hover:border-apple-gray',
          'transition-all duration-200',
          'shadow-sm hover:shadow',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          side === 'left' 
            ? (isOpen ? 'left-[297px]' : 'left-0')
            : (isOpen ? 'right-[317px]' : 'right-0')
        )}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${side} sidebar`}
        title={`${isOpen ? 'Collapse' : 'Expand'} ${side} sidebar`}
        data-print-hide
      >
        {side === 'left' ? (
          isOpen ? (
            <ChevronLeft className="w-4 h-4 text-apple-text-dark" />
          ) : (
            <ChevronRight className="w-4 h-4 text-apple-text-dark" />
          )
        ) : isOpen ? (
          <ChevronRight className="w-4 h-4 text-apple-text-dark" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-apple-text-dark" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'relative h-full bg-white border-apple-gray-light',
          'transition-all duration-300 ease-in-out',
          'shadow-sm',
          side === 'left' ? 'border-r' : 'border-l',
          className
        )}
        style={{
          width: isOpen ? `${sidebarWidth}px` : '0px',
          minWidth: isOpen ? `${sidebarWidth}px` : '0px',
          maxWidth: isOpen ? `${sidebarWidth}px` : '0px',
        }}
        aria-label={`${side} sidebar`}
        aria-expanded={isOpen}
        data-sidebar={side}
        data-tour={side === 'right' ? 'toolbox' : undefined}
        data-print-hide
      >
        {/* Sidebar content with overflow handling */}
        <div
          className={cn(
            'h-full overflow-hidden',
            'transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* py-6 px-2 - minimal breathing room from edges */}
          <div className="h-full overflow-y-auto custom-scrollbar py-6 px-2">
            {children}
          </div>
        </div>
      </aside>
    </div>
  );
}



