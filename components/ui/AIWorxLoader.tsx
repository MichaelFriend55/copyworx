/**
 * @file components/ui/AIWorxLoader.tsx
 * @description Branded loading components for AI generation processes
 * 
 * Features:
 * - Shimmer animation on Sparkles icon
 * - Spinning outer ring
 * - Bouncing dots with staggered timing
 * - Consistent AI@Worx branding
 * - Button and full-width variants
 * 
 * Design:
 * - Apple blue color palette
 * - Smooth 60fps animations
 * - Accessible (aria-live regions)
 * 
 * @example
 * ```tsx
 * // Full-width loader
 * <AIWorxLoader message="Generating with AI@Worx..." />
 * 
 * // Button loader
 * <AIWorxButtonLoader />
 * ```
 */

'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIWorxLoaderProps {
  /** Custom loading message */
  message?: string;
}

/**
 * Full-width branded loader for AI generation processes
 * Use in tool panels when waiting for API responses
 */
export function AIWorxLoader({ 
  message = "Generating with AI@Worx..." 
}: AIWorxLoaderProps) {
  return (
    <div 
      className="flex items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Animated Sparkles Icon with Shimmer and Spinning Ring */}
      <div className="relative">
        {/* Sparkles icon with shimmer effect */}
        <Sparkles 
          className="w-6 h-6 text-white animate-shimmer" 
          fill="currentColor"
          aria-hidden="true"
        />
        
        {/* Spinning outer ring */}
        <div className="absolute inset-0 -m-2" aria-hidden="true">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
      
      {/* Loading Message */}
      <div className="flex items-center gap-1">
        <span className="text-white font-medium">
          {message}
        </span>
        
        {/* Animated bouncing dots */}
        <span className="flex gap-1" aria-hidden="true">
          <span 
            className="w-1 h-1 bg-white rounded-full animate-bounce" 
            style={{ animationDelay: '0ms' }} 
          />
          <span 
            className="w-1 h-1 bg-white rounded-full animate-bounce" 
            style={{ animationDelay: '150ms' }} 
          />
          <span 
            className="w-1 h-1 bg-white rounded-full animate-bounce" 
            style={{ animationDelay: '300ms' }} 
          />
        </span>
      </div>
    </div>
  );
}

/**
 * Inline button loader for AI generation processes
 * Use inside buttons when user triggers AI operations
 */
export function AIWorxButtonLoader() {
  return (
    <div 
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label="Generating with AI@Worx"
    >
      {/* Sparkles icon with shimmer */}
      <Sparkles 
        className="w-4 h-4 animate-shimmer" 
        fill="currentColor"
        aria-hidden="true"
      />
      
      {/* Text */}
      <span>Generating with AI@Worx</span>
      
      {/* Animated bouncing dots */}
      <span className="flex gap-0.5" aria-hidden="true">
        <span 
          className="w-1 h-1 bg-current rounded-full animate-bounce" 
          style={{ animationDelay: '0ms' }} 
        />
        <span 
          className="w-1 h-1 bg-current rounded-full animate-bounce" 
          style={{ animationDelay: '150ms' }} 
        />
        <span 
          className="w-1 h-1 bg-current rounded-full animate-bounce" 
          style={{ animationDelay: '300ms' }} 
        />
      </span>
    </div>
  );
}
