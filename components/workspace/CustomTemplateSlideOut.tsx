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

import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface CustomTemplateSlideOutProps {
  /** Whether the panel is currently open */
  isOpen: boolean;
  
  /** Callback when panel should close (ESC or backdrop click) */
  onClose: () => void;
  
  /** Panel content */
  children: React.ReactNode;
  
  /** Panel width in pixels (default: 650px) */
  width?: number;
}

/**
 * CustomTemplateSlideOut - Minimal slide-out for custom templates
 * 
 * Provides slide-out behavior (backdrop, animation, ESC key, etc.)
 * without built-in header/padding that custom templates already have.
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
        onClick={(e) => e.stopPropagation()}
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
