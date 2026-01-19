/**
 * @file components/ui/SlideOutPanel.tsx
 * @description Reusable slide-out panel component for navigation and forms
 * 
 * Features:
 * - Slides from left or right side of screen
 * - Left panels: 450px width (navigation/browsing)
 * - Right panels: 550px width (forms/configuration)
 * - Smooth 300ms slide animation
 * - Dark backdrop overlay (50% opacity)
 * - Click backdrop or ESC to close
 * - Header with title and close button
 * - Scrollable content area
 * - Optional footer for action buttons
 * - React Portal for proper z-index stacking
 * 
 * @example
 * ```tsx
 * <SlideOutPanel
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   side="left"
 *   title="Navigation"
 *   footer={<Button onClick={handleSave}>Save</Button>}
 * >
 *   <div>Panel content here</div>
 * </SlideOutPanel>
 * ```
 */

'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Panel width configuration by side
 */
const PANEL_WIDTHS = {
  left: 450,
  right: 550,
} as const;

/**
 * SlideOutPanel component props
 */
export interface SlideOutPanelProps {
  /** Whether the panel is currently open */
  isOpen: boolean;
  
  /** Callback when panel should close */
  onClose: () => void;
  
  /** Which side the panel slides from */
  side: 'left' | 'right';
  
  /** Panel header title */
  title: string;
  
  /** Panel content */
  children: React.ReactNode;
  
  /** Optional footer content (e.g., action buttons) */
  footer?: React.ReactNode;
  
  /** Optional additional CSS classes for the panel container */
  className?: string;
  
  /** Optional subtitle under the title */
  subtitle?: string;
  
  /** Optional custom width override (in pixels) */
  width?: number;
}

/**
 * SlideOutPanel - A reusable slide-out panel component
 * 
 * Renders a slide-out panel from either the left or right side of the screen.
 * Uses React Portal to render outside the normal DOM hierarchy for proper
 * z-index stacking.
 */
export function SlideOutPanel({
  isOpen,
  onClose,
  side,
  title,
  children,
  footer,
  className,
  subtitle,
  width,
}: SlideOutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  // Debug: Log when panel receives isOpen
  console.log(`🎨 SlideOutPanel "${title}" received isOpen:`, isOpen, 'side:', side);
  
  // Get panel width
  const panelWidth = width ?? PANEL_WIDTHS[side];
  
  // Handle mount state for SSR compatibility
  useEffect(() => {
    setIsMounted(true);
    console.log(`🎨 SlideOutPanel "${title}" mounted`);
  }, [title]);
  
  // Handle animation state
  useEffect(() => {
    console.log(`🎨 SlideOutPanel "${title}" isOpen changed to:`, isOpen, 'will animate:', isOpen);
    if (isOpen) {
      // Trigger animation on next frame for CSS transition
      requestAnimationFrame(() => {
        setIsAnimating(true);
        console.log(`🎨 SlideOutPanel "${title}" animation started`);
      });
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, title]);
  
  // Handle ESC key to close
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);
  
  // Focus trap - focus panel when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);
  
  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not the panel
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);
  
  // Don't render on server or when not mounted
  if (!isMounted) {
    return null;
  }
  
  // Don't render anything if closed and not animating
  if (!isOpen && !isAnimating) {
    return null;
  }
  
  const panelContent = (
    <div
      className={cn(
        'fixed inset-0 z-50',
        // Backdrop transition
        'transition-opacity duration-300 ease-out',
        isAnimating ? 'opacity-100' : 'opacity-0'
      )}
      onClick={handleBackdropClick}
      aria-hidden={!isOpen}
    >
      {/* Backdrop overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50',
          'transition-opacity duration-300 ease-out',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideout-panel-title"
        tabIndex={-1}
        className={cn(
          'fixed top-0 bottom-0 flex flex-col',
          'bg-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          // Position based on side
          side === 'left' ? 'left-0 rounded-r-2xl' : 'right-0 rounded-l-2xl',
          // Slide animation
          side === 'left'
            ? (isAnimating ? 'translate-x-0' : '-translate-x-full')
            : (isAnimating ? 'translate-x-0' : 'translate-x-full'),
          className
        )}
        style={{ width: `${panelWidth}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2
                id="slideout-panel-title"
                className="text-lg font-semibold text-gray-900 truncate"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className={cn(
                'flex-shrink-0 p-2 rounded-lg',
                'text-gray-400 hover:text-gray-600',
                'hover:bg-gray-100 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          {children}
        </div>
        
        {/* Footer - optional */}
        {footer && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
  
  // Render using portal to document.body
  return createPortal(panelContent, document.body);
}

/**
 * Default export for convenience
 */
export default SlideOutPanel;
