/**
 * @file lib/types/global.d.ts
 * @description Global TypeScript type declarations
 * 
 * Extends global interfaces and types used throughout the application
 */

import type { Editor } from '@tiptap/react';

/**
 * Extend Window interface to include custom properties
 */
declare global {
  interface Window {
    /**
     * TipTap editor instance exposed for debugging and toolbar access
     * @internal Used by EditorArea and Toolbar components
     */
    __tiptapEditor?: Editor;
  }
}

// This export is needed to make this file a module
export {};
