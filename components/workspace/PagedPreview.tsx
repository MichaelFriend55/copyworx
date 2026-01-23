/**
 * @file components/workspace/PagedPreview.tsx
 * @description Professional print preview component using Paged.js
 * 
 * Features:
 * - True pagination using Paged.js W3C Paged Media implementation
 * - US Letter size (8.5" x 11") with 1" margins
 * - Automatic page numbering
 * - Proper page break handling (no widows/orphans)
 * - Headings stay with following content
 * - Loading state while rendering
 * - Smooth zoom controls
 * 
 * CRITICAL FIX: Proper React lifecycle handling to prevent
 * "Cannot read properties of null (reading 'getBoundingClientRect')" error
 */

'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Previewer } from 'pagedjs';
import { cn } from '@/lib/utils';
import { X, ZoomIn, ZoomOut, Printer, RefreshCw } from 'lucide-react';

interface PagedPreviewProps {
  /** HTML content to render with pagination */
  content: string;
  /** Document title for display */
  title?: string;
  /** Callback when preview is closed */
  onClose: () => void;
  /** Optional CSS classes */
  className?: string;
}

/** Zoom levels available */
const ZOOM_LEVELS = [50, 75, 100, 125, 150] as const;
const DEFAULT_ZOOM = 75;

/**
 * PagedPreview - Professional print preview with Paged.js pagination
 * 
 * Renders HTML content through Paged.js to create true paginated output
 * with proper page breaks, margins, and page numbering.
 */
export function PagedPreview({
  content,
  title = 'Document Preview',
  onClose,
  className,
}: PagedPreviewProps) {
  // State
  const [isMounted, setIsMounted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const contentSourceRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<Previewer | null>(null);
  const styleBlobUrlRef = useRef<string | null>(null);
  
  /**
   * CSS stylesheet for paged content
   * Uses both modern (break-*) and legacy (page-break-*) properties
   */
  const pagedStyles = useMemo(() => `
    /* PAGE SETUP - US Letter with 1" margins */
    @page {
      size: 8.5in 11in;
      margin: 1in;
    }
    
    /* GLOBAL TYPOGRAPHY */
    body, .pagedjs_page_content, .paged-content-wrapper {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1D1D1F;
    }
    
    /* HEADINGS - Must stay with following content */
    h1, h2, h3, h4, h5, h6 {
      break-after: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    h1 {
      font-size: 24pt;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 12pt;
      line-height: 1.2;
    }
    
    h2 {
      font-size: 18pt;
      font-weight: 600;
      margin-top: 18pt;
      margin-bottom: 9pt;
      line-height: 1.3;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: 600;
      margin-top: 14pt;
      margin-bottom: 7pt;
      line-height: 1.4;
    }
    
    h4 {
      font-size: 12pt;
      font-weight: 600;
      margin-top: 12pt;
      margin-bottom: 6pt;
      line-height: 1.4;
    }
    
    /* PARAGRAPHS - Prevent widows and orphans */
    p {
      margin-top: 0;
      margin-bottom: 9pt;
      orphans: 3;
      widows: 3;
    }
    
    /* LISTS - Keep together when possible */
    ul, ol {
      margin: 9pt 0;
      padding-left: 24pt;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    
    li {
      margin-bottom: 4pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    /* BLOCKQUOTES */
    blockquote {
      margin: 12pt 0;
      padding-left: 18pt;
      border-left: 3px solid #d2d2d7;
      font-style: italic;
      color: #6e6e73;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    /* INLINE ELEMENTS */
    a { color: #0071E3; text-decoration: underline; }
    code {
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 10pt;
      background-color: #f5f5f7;
      padding: 2pt 4pt;
      border-radius: 2pt;
    }
    strong { font-weight: 600; }
    em { font-style: italic; }
    u { text-decoration: underline; }
    
    /* IMAGES */
    img {
      max-width: 100%;
      height: auto;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #d2d2d7;
      padding: 6pt 9pt;
      text-align: left;
    }
    th { background-color: #f5f5f7; font-weight: 600; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    
    /* HORIZONTAL RULES */
    hr {
      border: none;
      border-top: 1px solid #d2d2d7;
      margin: 18pt 0;
    }
  `, []);

  /**
   * Mark component as mounted after initial render
   */
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  /**
   * Generate preview with Paged.js
   * CRITICAL: Wait for DOM to be fully painted before calling Paged.js
   */
  const generatePreview = useCallback(async () => {
    // Guard: Ensure component is mounted
    if (!isMounted) {
      console.log('📄 Paged.js: Component not yet mounted, waiting...');
      return;
    }
    
    // Guard: Check refs exist
    if (!previewContainerRef.current) {
      console.error('❌ Paged.js: Preview container ref is null');
      setError('Preview container not ready. Please try again.');
      return;
    }
    
    // Guard: Check content exists
    if (!content || content.trim() === '') {
      console.error('❌ Paged.js: No content to preview');
      setError('No content to preview');
      return;
    }
    
    console.log('📄 Paged.js: Starting preview generation...');
    console.log('📄 Content length:', content.length, 'characters');
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Clean up previous preview
      if (previewerRef.current) {
        try {
          previewerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        previewerRef.current = null;
      }
      
      // Clear previous content
      previewContainerRef.current.innerHTML = '';
      
      // Clean up previous blob URL
      if (styleBlobUrlRef.current) {
        URL.revokeObjectURL(styleBlobUrlRef.current);
        styleBlobUrlRef.current = null;
      }
      
      // CRITICAL: Wait for DOM to be fully painted
      // This prevents the "getBoundingClientRect" error
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      
      // Double-check refs still exist after waiting
      if (!previewContainerRef.current || !isMounted) {
        console.warn('⚠️ Paged.js: Container no longer available');
        return;
      }
      
      // Create Blob URL for stylesheet
      const styleBlob = new Blob([pagedStyles], { type: 'text/css' });
      const styleBlobUrl = URL.createObjectURL(styleBlob);
      styleBlobUrlRef.current = styleBlobUrl;
      
      // Inject styles into document head
      let styleEl = document.getElementById('pagedjs-custom-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'pagedjs-custom-styles';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = pagedStyles;
      
      // Create content with embedded styles
      const contentWithStyles = `
        <style>${pagedStyles}</style>
        <div class="paged-content-wrapper">
          ${content}
        </div>
      `;
      
      console.log('📄 Paged.js: Creating Previewer...');
      
      // Create and run previewer
      const previewer = new Previewer();
      previewerRef.current = previewer;
      
      // Final check before calling preview
      if (!previewContainerRef.current) {
        throw new Error('Preview container became null');
      }
      
      console.log('📄 Paged.js: Calling preview()...');
      
      const result = await previewer.preview(
        contentWithStyles,
        [styleBlobUrl],
        previewContainerRef.current
      );
      
      console.log('✅ Paged.js: Preview generated successfully!');
      console.log('📄 Total pages:', result.total);
      
      setPageCount(result.total);
      setCurrentPage(1);
      setIsGenerating(false);
      
    } catch (err) {
      console.error('❌ Paged.js error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';
      setError(errorMessage);
      setIsGenerating(false);
    }
  }, [isMounted, content, pagedStyles]);

  /**
   * Trigger preview generation when mounted and content is available
   */
  useEffect(() => {
    if (!isMounted || !content) {
      return;
    }
    
    // Add delay to ensure DOM is stable
    const timer = setTimeout(() => {
      generatePreview();
    }, 200);
    
    return () => clearTimeout(timer);
  }, [isMounted, content, retryCount, generatePreview]);

  /**
   * Handle retry button click
   */
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clean up previewer
      if (previewerRef.current) {
        try {
          previewerRef.current.destroy();
        } catch (e) {
          // Ignore errors
        }
        previewerRef.current = null;
      }
      
      // Clean up blob URL
      if (styleBlobUrlRef.current) {
        URL.revokeObjectURL(styleBlobUrlRef.current);
        styleBlobUrlRef.current = null;
      }
      
      // Clean up injected styles
      const styleEl = document.getElementById('pagedjs-custom-styles');
      if (styleEl) {
        styleEl.remove();
      }
    };
  }, []);

  /**
   * Track scroll position to update current page
   */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || pageCount === 0) return;
    
    const handleScroll = () => {
      const pages = container.querySelectorAll('.pagedjs_page');
      if (pages.length === 0) return;
      
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollMiddle = scrollTop + containerHeight / 2;
      
      let currentPageNum = 1;
      pages.forEach((page, index) => {
        const pageEl = page as HTMLElement;
        const pageTop = pageEl.offsetTop;
        const pageBottom = pageTop + pageEl.offsetHeight;
        
        if (scrollMiddle >= pageTop && scrollMiddle < pageBottom) {
          currentPageNum = index + 1;
        }
      });
      
      setCurrentPage(currentPageNum);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pageCount]);

  /**
   * Zoom handlers
   */
  const handleZoomIn = useCallback(() => {
    setZoom((current) => {
      const idx = ZOOM_LEVELS.indexOf(current as typeof ZOOM_LEVELS[number]);
      return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : current;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((current) => {
      const idx = ZOOM_LEVELS.indexOf(current as typeof ZOOM_LEVELS[number]);
      return idx > 0 ? ZOOM_LEVELS[idx - 1] : current;
    });
  }, []);

  const handlePrint = useCallback(() => {
    // Import and use PDF export utility for proper filename
    import('@/lib/utils/pdf-export').then(({ printWithTitle }) => {
      printWithTitle(title);
    });
  }, [title]);

  const canZoomIn = zoom < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  const canZoomOut = zoom > ZOOM_LEVELS[0];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex flex-col',
        'bg-gray-100',
        className
      )}
    >
      {/* Header toolbar */}
      <div
        className={cn(
          'flex items-center justify-between',
          'px-4 py-3',
          'bg-white border-b border-gray-200',
          'shadow-sm'
        )}
      >
        {/* Left: Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[300px]">
            {title}
          </h1>
          <span className="text-sm text-gray-500">
            Print Preview
          </span>
        </div>
        
        {/* Center: Zoom controls */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
          <button
            onClick={handleZoomOut}
            disabled={!canZoomOut || isGenerating}
            className={cn(
              'p-1.5 rounded transition-colors',
              'hover:bg-gray-100 active:bg-gray-200',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-gray-600" />
          </button>
          
          <span className="px-2 min-w-[60px] text-center text-sm font-medium text-gray-700">
            {zoom}%
          </span>
          
          <button
            onClick={handleZoomIn}
            disabled={!canZoomIn || isGenerating}
            className={cn(
              'p-1.5 rounded transition-colors',
              'hover:bg-gray-100 active:bg-gray-200',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={isGenerating || !!error}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md',
              'bg-primary text-white text-sm font-medium',
              'hover:bg-primary/90 active:bg-primary/80',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-md',
              'hover:bg-gray-100 active:bg-gray-200',
              'transition-colors'
            )}
            title="Close preview"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Preview container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
        style={{ background: '#e8e8e8' }}
      >
        {/* Loading state */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div 
              className="w-10 h-10 border-4 border-gray-300 border-t-primary rounded-full animate-spin" 
            />
            <p className="text-sm text-gray-600">Generating preview...</p>
            <p className="text-xs text-gray-400">This may take a moment for longer documents</p>
          </div>
        )}
        
        {/* Error state */}
        {error && !isGenerating && (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="text-5xl">⚠️</div>
            <p className="text-base font-medium text-gray-900">Preview Generation Failed</p>
            <p className="text-sm text-red-600 max-w-md text-center">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md',
                  'bg-primary text-white text-sm font-medium',
                  'hover:bg-primary/90 active:bg-primary/80',
                  'transition-colors'
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={onClose}
                className={cn(
                  'px-4 py-2 rounded-md',
                  'bg-gray-200 text-gray-700 text-sm font-medium',
                  'hover:bg-gray-300 active:bg-gray-400',
                  'transition-colors'
                )}
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {/* Preview render container */}
        <div
          ref={previewContainerRef}
          className={cn(
            'pagedjs-render-container',
            'py-6',
            (isGenerating || error) && 'hidden'
          )}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            minHeight: `${100 / (zoom / 100)}%`,
          }}
        />
        
        {/* Hidden content source (for debugging) */}
        <div
          ref={contentSourceRef}
          style={{ display: 'none' }}
          dangerouslySetInnerHTML={{ __html: content || '' }}
        />
      </div>
      
      {/* Page count badge */}
      {!isGenerating && !error && pageCount > 0 && (
        <div
          className={cn(
            'fixed bottom-6 right-6',
            'flex items-center gap-1.5',
            'px-3 py-1.5 rounded-full',
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
      )}
      
      {/* Global styles for Paged.js output */}
      <style jsx global>{`
        /* Container for all pages */
        .pagedjs_pages {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          padding: 24px;
        }
        
        /* Individual page */
        .pagedjs_page {
          background: white;
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.08),
            0 4px 12px rgba(0, 0, 0, 0.05),
            0 0 0 1px rgba(0, 0, 0, 0.03);
          border-radius: 2px;
        }
        
        /* Page content area */
        .pagedjs_pagebox {
          position: relative;
        }
        
        /* Page margin boxes */
        .pagedjs_margin-bottom-center {
          position: absolute;
          bottom: 0.25in;
          left: 0;
          right: 0;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 10pt;
          color: #666;
        }
        
        /* Hide page number on first page */
        .pagedjs_first_page .pagedjs_margin-bottom-center {
          display: none;
        }
        
        /* Print styles */
        @media print {
          .pagedjs_pages {
            padding: 0;
            gap: 0;
          }
          
          .pagedjs_page {
            box-shadow: none;
            border-radius: 0;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}

export default PagedPreview;
