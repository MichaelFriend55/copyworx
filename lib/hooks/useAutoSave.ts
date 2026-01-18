/**
 * @file lib/hooks/useAutoSave.ts
 * @description Auto-save hook - DEPRECATED
 * 
 * This hook is no longer used. Auto-save is now handled directly
 * in EditorArea.tsx which saves to localStorage via document-storage.ts.
 * 
 * Kept for backward compatibility - does nothing if called.
 */

'use client';

import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';

/**
 * Auto-save hook - DEPRECATED
 * 
 * Auto-save is now handled directly in EditorArea.tsx.
 * This hook is kept for backward compatibility and does nothing.
 * 
 * @deprecated Use EditorArea's built-in auto-save instead
 * @param _editor - TipTap editor instance (unused)
 * @param _delay - Debounce delay in milliseconds (unused)
 */
export function useAutoSave(_editor: Editor | null, _delay: number = 500): void {
  useEffect(() => {
    console.log('⚠️ useAutoSave is deprecated. Auto-save is handled by EditorArea.');
  }, []);
}
