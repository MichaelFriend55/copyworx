/**
 * @file components/workspace/PageModeWrapper.tsx
 * @description Wrapper component that renders content in Page Mode with visual pagination
 * 
 * Features:
 * - Visual page boundaries (like Google Docs/Word)
 * - Page numbering
 * - US Letter size pages (8.5" x 11")
 * - 1" margins all around
 * - White pages on gray background
 * - Drop shadows for depth
 * 
 * @example
 * ```tsx
 * <PageModeWrapper
 *   pageCount={5}
 *   currentPage={2}
 *   contentHeight={4320}
 *   zoomLevel={100}
 * >
 *   <EditorContent editor={editor} />
 * </PageModeWrapper>
 * ```
 */

'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PAGE_CONFIG } from '@/lib/hooks/usePageCalculations';

interface PageModeWrapperProps {
  /** Content to render inside pages */
  children: React.ReactNode;
  /** Total number of pages */
  pageCount: number;
  /** Currently visible page (1-indexed) */
  currentPage: number;
  /** Total content height */
  contentHeight: number;
  /** Zoom level percentage */
  zoomLevel: number;
  /** Whether Page Mode is ready/enabled */
  isReady: boolean;
  /** Optional CSS classes */
  className?: string;
}

/**
 * Generates an array of page numbers from 1 to count
 */
function generatePageNumbers(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

/**
 * PageModeWrapper - Renders content with visual page boundaries
 * 
 * Creates the appearance of stacked pages while maintaining
 * TipTap's single-editor architecture. Page breaks are visual
 * overlays that don't affect the underlying content structure.
 */
export function PageModeWrapper({
  children,
  pageCount,
  currentPage,
  contentHeight,
  zoomLevel,
  isReady,
  className,
}: PageModeWrapperProps) {
  // Scale dimensions based on zoom level
  const scaledDimensions = useMemo(() => {
    const scale = zoomLevel / 100;
    return {
      pageWidth: PAGE_CONFIG.pageWidth * scale,
      pageHeight: PAGE_CONFIG.pageHeight * scale,
      contentHeight: PAGE_CONFIG.contentHeight * scale,
      marginX: PAGE_CONFIG.marginX * scale,
      marginY: PAGE_CONFIG.marginY * scale,
      pageGap: PAGE_CONFIG.pageGap * scale,
    };
  }, [zoomLevel]);

  // Generate page numbers array
  const pages = useMemo(() => generatePageNumbers(pageCount), [pageCount]);

  // Calculate total height needed for all pages
  const totalHeight = useMemo(() => {
    if (pageCount <= 0) return scaledDimensions.pageHeight;
    return (
      pageCount * scaledDimensions.pageHeight +
      (pageCount - 1) * scaledDimensions.pageGap
    );
  }, [pageCount, scaledDimensions]);

  return (
    <div
      className={cn(
        'page-mode-container',
        'relative',
        className
      )}
      style={{
        minHeight: totalHeight,
      }}
    >
      {/* Page backgrounds and shadows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {pages.map((pageNum) => {
          const topPosition =
            (pageNum - 1) * (scaledDimensions.pageHeight + scaledDimensions.pageGap);
          
          return (
            <div
              key={pageNum}
              className="page-background absolute left-1/2 bg-white"
              style={{
                width: scaledDimensions.pageWidth,
                height: scaledDimensions.pageHeight,
                top: topPosition,
                transform: 'translateX(-50%)',
                boxShadow: `
                  0 1px 3px rgba(0, 0, 0, 0.08),
                  0 4px 12px rgba(0, 0, 0, 0.05),
                  0 0 0 1px rgba(0, 0, 0, 0.03)
                `,
                borderRadius: '2px',
              }}
            />
          );
        })}
      </div>

      {/* Page break indicators */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {pages.slice(0, -1).map((pageNum) => {
          // Position page break at the bottom of each page (except last)
          const breakPosition =
            pageNum * scaledDimensions.pageHeight +
            (pageNum - 1) * scaledDimensions.pageGap +
            scaledDimensions.pageGap / 2;
          
          return (
            <div
              key={`break-${pageNum}`}
              className="page-break-indicator absolute left-0 right-0 flex items-center justify-center"
              style={{
                top: breakPosition,
                height: scaledDimensions.pageGap,
              }}
            >
              {/* Dashed line for page break */}
              <div
                className="absolute left-1/2 -translate-x-1/2 border-t border-dashed border-gray-300"
                style={{
                  width: scaledDimensions.pageWidth - 40,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Page numbers */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {pages.map((pageNum) => {
          // Position page number at the bottom of each page
          const numberPosition =
            pageNum * scaledDimensions.pageHeight +
            (pageNum - 1) * scaledDimensions.pageGap -
            (scaledDimensions.marginY * 0.6);
          
          return (
            <div
              key={`number-${pageNum}`}
              className="page-number absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
              style={{
                top: numberPosition,
                width: scaledDimensions.pageWidth,
              }}
            >
              <span
                className={cn(
                  'text-xs font-medium transition-colors duration-200',
                  pageNum === currentPage
                    ? 'text-gray-600'
                    : 'text-gray-400'
                )}
                style={{
                  fontSize: Math.max(10, 12 * (zoomLevel / 100)),
                }}
              >
                {pageNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Content layer - the actual editor content */}
      <div
        className="page-content relative z-10"
        style={{
          // No top padding - header will be at page top
          // Bottom padding for page margin
          paddingBottom: scaledDimensions.marginY,
        }}
      >
        <div
          className="mx-auto"
          style={{
            width: scaledDimensions.pageWidth,
            maxWidth: '100%',
          }}
        >
          {children}
        </div>
      </div>

      {/* Page count display (floating, follows scroll) */}
      {isReady && pageCount > 0 && (
        <div className="page-count-badge fixed bottom-6 right-6 z-50">
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              'bg-white/90 backdrop-blur-sm',
              'border border-gray-200/60',
              'shadow-lg shadow-black/5',
              'text-xs font-medium text-gray-600'
            )}
          >
            <span>Page</span>
            <span className="text-gray-900">{currentPage}</span>
            <span className="text-gray-400">/</span>
            <span>{pageCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PageModeWrapper;
