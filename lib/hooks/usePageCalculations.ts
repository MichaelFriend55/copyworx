/**
 * @file lib/hooks/usePageCalculations.ts
 * @description Hook for calculating page boundaries and page numbers in Page Mode
 * 
 * Uses US Letter dimensions (8.5" x 11") scaled for screen display.
 * Content remains in a single TipTap editor; page breaks are visual overlays.
 * 
 * @example
 * ```tsx
 * const { pageCount, pageBreakPositions, currentPage } = usePageCalculations({
 *   contentRef,
 *   enabled: viewMode === 'page',
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * US Letter dimensions at 96 DPI
 * 8.5" x 11" = 816px x 1056px
 */
const PAGE_DIMENSIONS = {
  /** Full page width in pixels (8.5" at 96 DPI) */
  WIDTH: 816,
  /** Full page height in pixels (11" at 96 DPI) */
  HEIGHT: 1056,
  /** Margin size in pixels (1" at 96 DPI) */
  MARGIN: 96,
} as const;

/**
 * Scaled dimensions for screen display
 * We use a slightly smaller scale for comfortable viewing
 */
export const PAGE_CONFIG = {
  /** Displayed page width */
  pageWidth: 816,
  /** Displayed page height (content area only) */
  pageHeight: 1056,
  /** Top/bottom margin */
  marginY: 96,
  /** Left/right margin */
  marginX: 96,
  /** Usable content height per page (height - top margin - bottom margin) */
  contentHeight: 1056 - 96 - 96, // 864px
  /** Gap between pages */
  pageGap: 40,
} as const;

interface UsePageCalculationsProps {
  /** Ref to the content container element */
  contentRef: React.RefObject<HTMLDivElement>;
  /** Whether Page Mode is enabled */
  enabled: boolean;
  /** Optional zoom level (default 100) */
  zoomLevel?: number;
}

interface PageCalculationsResult {
  /** Total number of pages based on content height */
  pageCount: number;
  /** Array of Y positions where page breaks should appear */
  pageBreakPositions: number[];
  /** Current page number based on scroll position */
  currentPage: number;
  /** Total content height in pixels */
  contentHeight: number;
  /** Whether calculations are ready */
  isReady: boolean;
}

/**
 * Hook to calculate page boundaries and current page for Page Mode
 * 
 * Monitors content height and scroll position to determine:
 * - How many pages the content spans
 * - Where to render page break indicators
 * - Which page is currently visible
 */
export function usePageCalculations({
  contentRef,
  enabled,
  zoomLevel = 100,
}: UsePageCalculationsProps): PageCalculationsResult {
  const [pageCount, setPageCount] = useState(1);
  const [pageBreakPositions, setPageBreakPositions] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  /**
   * Calculate page breaks based on content height
   */
  const calculatePages = useCallback(() => {
    if (!contentRef.current || !enabled) {
      setIsReady(false);
      return;
    }

    const element = contentRef.current;
    const height = element.scrollHeight;
    const scaledContentHeight = PAGE_CONFIG.contentHeight * (zoomLevel / 100);
    
    // Calculate number of pages needed
    const pages = Math.max(1, Math.ceil(height / scaledContentHeight));
    
    // Calculate Y positions for page breaks
    const breaks: number[] = [];
    for (let i = 1; i < pages; i++) {
      breaks.push(i * scaledContentHeight);
    }
    
    setContentHeight(height);
    setPageCount(pages);
    setPageBreakPositions(breaks);
    setIsReady(true);
    
    console.log('📄 Page calculations updated:', {
      contentHeight: height,
      pageCount: pages,
      pageBreakCount: breaks.length,
      scaledContentHeight,
    });
  }, [contentRef, enabled, zoomLevel]);

  /**
   * Update current page based on scroll position
   */
  const updateCurrentPage = useCallback(() => {
    if (!scrollContainerRef.current || !enabled) return;
    
    const scrollTop = scrollContainerRef.current.scrollTop;
    const scaledContentHeight = PAGE_CONFIG.contentHeight * (zoomLevel / 100);
    const scaledPageGap = PAGE_CONFIG.pageGap;
    
    // Calculate which page is at the top of the viewport
    // Account for page gaps in calculation
    const pageWithGap = scaledContentHeight + scaledPageGap;
    const page = Math.floor(scrollTop / pageWithGap) + 1;
    
    setCurrentPage(Math.min(Math.max(1, page), pageCount));
  }, [enabled, pageCount, zoomLevel]);

  /**
   * Set up ResizeObserver to watch content changes
   */
  useEffect(() => {
    if (!enabled || !contentRef.current) {
      setIsReady(false);
      return;
    }

    // Find the scrollable parent container
    scrollContainerRef.current = contentRef.current.closest('.overflow-y-auto');

    // Initial calculation
    calculatePages();

    // Set up ResizeObserver for content changes
    resizeObserverRef.current = new ResizeObserver(() => {
      calculatePages();
    });

    resizeObserverRef.current.observe(contentRef.current);

    // Set up scroll listener for current page tracking
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateCurrentPage);
      updateCurrentPage(); // Initial check
    }

    return () => {
      resizeObserverRef.current?.disconnect();
      scrollContainer?.removeEventListener('scroll', updateCurrentPage);
    };
  }, [enabled, contentRef, calculatePages, updateCurrentPage]);

  /**
   * Recalculate when zoom changes
   */
  useEffect(() => {
    if (enabled) {
      calculatePages();
    }
  }, [zoomLevel, enabled, calculatePages]);

  return {
    pageCount,
    pageBreakPositions,
    currentPage,
    contentHeight,
    isReady,
  };
}

export default usePageCalculations;
