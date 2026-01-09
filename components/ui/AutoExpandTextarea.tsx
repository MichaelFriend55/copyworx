/**
 * @file components/ui/AutoExpandTextarea.tsx
 * @description Auto-expanding textarea component that adjusts height based on content
 * 
 * Features:
 * - Automatically expands as user types
 * - Shrinks when content is deleted
 * - Respects min/max height constraints
 * - Smooth transitions
 * - Works with controlled components
 * 
 * @example
 * ```tsx
 * <AutoExpandTextarea
 *   value={text}
 *   onChange={(e) => setText(e.target.value)}
 *   minHeight={80}
 *   maxHeight={400}
 *   placeholder="Enter text..."
 * />
 * ```
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AutoExpandTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Minimum height in pixels (default: 80) */
  minHeight?: number;
  
  /** Maximum height before scrolling kicks in (default: 400) */
  maxHeight?: number;
}

/**
 * AutoExpandTextarea component - Textarea that grows/shrinks with content
 */
export function AutoExpandTextarea({ 
  minHeight = 80,
  maxHeight = 400,
  className,
  value,
  onChange,
  ...props 
}: AutoExpandTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  /**
   * Adjust textarea height based on content
   */
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to minHeight to get accurate scrollHeight
    textarea.style.height = `${minHeight}px`;
    
    // Calculate new height based on content
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    // Set new height
    textarea.style.height = `${newHeight}px`;
    
    // Enable/disable overflow based on whether we've hit maxHeight
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }, [minHeight, maxHeight]);
  
  /**
   * Adjust height on mount and when value changes
   */
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);
  
  /**
   * Also adjust on window resize
   */
  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);
  
  /**
   * Handle change event and adjust height
   */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
    // Adjust height immediately
    requestAnimationFrame(() => adjustHeight());
  };
  
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      className={cn(
        'resize-none transition-[height] duration-150 ease-out',
        'overflow-x-hidden', // Prevent horizontal scrolling
        'whitespace-pre-wrap', // Wrap text properly
        'break-words', // Break long words
        className
      )}
      style={{ 
        minHeight: `${minHeight}px`,
        maxHeight: `${maxHeight}px`,
        height: `${minHeight}px`, // Set initial height
      }}
      {...props}
    />
  );
}
