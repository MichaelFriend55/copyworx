/**
 * @file lib/hooks/useAutoSave.ts
 * @description Auto-save hook for TipTap editor - REBUILT FOR RELIABILITY
 * 
 * Provides debounced auto-save functionality that saves directly to Zustand store.
 * The store's persist middleware then saves to localStorage automatically.
 * 
 * IMPORTANT: Uses getState() to avoid infinite render loops from function references
 * in useEffect dependencies.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import type { Editor } from '@tiptap/react';

/**
 * Auto-save hook that watches editor changes
 * 
 * @param editor - TipTap editor instance
 * @param delay - Debounce delay in milliseconds (default: 500ms)
 */
export function useAutoSave(editor: Editor | null, delay: number = 500) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!editor) {
      console.log('⏸️ Auto-save: No editor instance');
      return;
    }

    const handleUpdate = () => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        const html = editor.getHTML();
        // Use getState() to get the latest function without causing re-renders
        useWorkspaceStore.getState().updateDocumentContent(html);
        console.log('✅ Auto-save triggered');
      }, delay);
    };

    // Listen to editor updates
    editor.on('update', handleUpdate);
    console.log('👂 Auto-save listener attached');

    // Cleanup
    return () => {
      editor.off('update', handleUpdate);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      console.log('🔌 Auto-save listener detached');
    };
  }, [editor, delay]); // Only depend on editor and delay - no store functions
}
