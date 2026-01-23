/**
 * @file lib/types/pagedjs.d.ts
 * @description TypeScript type declarations for Paged.js library
 * 
 * Paged.js is a free and open source JavaScript library that paginates content
 * in the browser to create PDF output from any HTML content.
 * 
 * @see https://www.pagedjs.org/
 */

declare module 'pagedjs' {
  /**
   * Configuration options for the Paged.js Previewer
   */
  export interface PreviewerOptions {
    /** The content to paginate (HTML string or DOM element) */
    content?: string | HTMLElement;
    
    /** CSS stylesheets to apply */
    stylesheets?: string[];
    
    /** Container element to render pages into */
    renderTo?: HTMLElement;
    
    /** Whether to use polisher for CSS processing */
    polisher?: boolean;
    
    /** Whether to automatically start preview */
    autoStart?: boolean;
  }

  /**
   * Represents a single rendered page
   */
  export interface RenderedPage {
    /** Page index (0-based) */
    id: number;
    
    /** DOM element containing the page */
    element: HTMLElement;
    
    /** Page width in pixels */
    width: number;
    
    /** Page height in pixels */
    height: number;
    
    /** Whether this is a left or right page (for spreads) */
    side?: 'left' | 'right';
  }

  /**
   * Result returned after preview completes
   */
  export interface PreviewResult {
    /** Total number of pages */
    total: number;
    
    /** Array of rendered page objects */
    pages: RenderedPage[];
    
    /** The container element with all pages */
    container: HTMLElement;
  }

  /**
   * The Previewer class - main entry point for rendering paginated content
   */
  export class Previewer {
    /**
     * Creates a new Previewer instance
     * @param options - Configuration options
     */
    constructor(options?: PreviewerOptions);

    /**
     * Preview content and render pages
     * @param content - HTML content to paginate
     * @param stylesheets - Array of CSS stylesheet URLs
     * @param renderTo - Container element to render into
     * @returns Promise resolving to preview result
     */
    preview(
      content?: string | HTMLElement,
      stylesheets?: string[],
      renderTo?: HTMLElement
    ): Promise<PreviewResult>;

    /**
     * Destroy the previewer and clean up resources
     */
    destroy(): void;

    /**
     * Get all rendered pages
     */
    pages: RenderedPage[];

    /**
     * Total number of pages
     */
    total: number;

    /**
     * Register hooks for various stages of the rendering process
     */
    registerHandlers(handlers: object): void;
  }

  /**
   * The Chunker class - handles content chunking for pagination
   */
  export class Chunker {
    constructor();
    
    /**
     * Chunk content into pages
     */
    flow(content: HTMLElement, renderTo: HTMLElement): Promise<void>;
  }

  /**
   * The Polisher class - processes CSS for paged media
   */
  export class Polisher {
    constructor();
    
    /**
     * Add CSS stylesheets for processing
     */
    add(...sheets: (string | CSSStyleSheet)[]): Promise<void>;
    
    /**
     * Get the processed CSS
     */
    toString(): string;
  }

  /**
   * Handler class for customizing pagination behavior
   */
  export class Handler {
    constructor();
  }

  /**
   * Initialize Paged.js polyfill (for automatic pagination on page load)
   */
  export function initializeHandler(): void;

  /**
   * Register custom handlers
   */
  export function registerHandlers(...handlers: Handler[]): void;
}
