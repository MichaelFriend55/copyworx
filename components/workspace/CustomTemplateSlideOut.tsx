/**
 * @file components/workspace/CustomTemplateSlideOut.tsx
 * @description Minimal slide-out wrapper for custom template components
 * 
 * This is a simplified version of SlideOutPanel specifically for custom templates
 * that have their own complete UI (headers, close buttons, etc.).
 * 
 * Unlike SlideOutPanel, this does NOT include:
 * - Built-in header/title
 * - Built-in close button
 * - Content padding
 * 
 * The wrapped component is responsible for its own layout.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface CustomTemplateSlideOutProps {
  /** Whether the panel is currently open */
  isOpen: boolean;
  
  /** Callback when panel should close (via explicit close button) */
  onClose: () => void;
  
  /** Panel content */
  children: React.ReactNode;
  
  /** Panel width in pixels (default: 650px) */
  width?: number;
}

/**
 * CustomTemplateSlideOut - Minimal slide-out for custom templates
 * 
 * Provides slide-out behavior (backdrop, animation, etc.)
 * without built-in header/padding that custom templates already have.
 * Closes only via explicit close button — no backdrop click or ESC dismiss.
 */
export function CustomTemplateSlideOut({
  isOpen,
  onClose,
  children,
  width = 650,
}: CustomTemplateSlideOutProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  
  // Handle mount state for SSR compatibility
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);
  
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
        'transition-opacity duration-300 ease-out',
        isAnimating ? 'opacity-100' : 'opacity-0'
      )}
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
      
      {/* Panel - NO built-in header, padding, or footer */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'fixed top-0 right-0 bottom-0 flex flex-col',
          'bg-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          'rounded-l-2xl',
          // Slide animation
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: `${width}px` }}
      >
        {/* Content - let the template handle its own layout */}
        <div className="h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
  
  // Render using portal to document.body
  return createPortal(panelContent, document.body);
}
