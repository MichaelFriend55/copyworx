/**
 * @file components/workspace/EditorArea.tsx
 * @description TipTap rich text editor with direct localStorage persistence
 * 
 * ARCHITECTURE (Simplified):
 * - Loads document content directly from localStorage (via document-storage.ts)
 * - Saves directly to localStorage on every change (debounced 500ms)
 * - NO Zustand caching of document content
 * - Zustand only provides activeDocumentId and activeProjectId
 * 
 * Features:
 * - TipTap editor with full formatting
 * - Automatic content persistence to localStorage
 * - Real-time word/character count
 * - Apple-style aesthetic
 */

'use client';

import React, { useEffect, useCallback, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { FontSize } from '@/lib/tiptap/font-size';
import { useWorkspaceStore, useActiveProjectId, useActiveDocumentId } from '@/lib/stores/workspaceStore';
import { getDocument, updateDocument } from '@/lib/storage/document-storage';
import { getEditorSelection } from '@/lib/editor-utils';
import { cn } from '@/lib/utils';
import type { ProjectDocument } from '@/lib/types/project';

interface EditorAreaProps {
  className?: string;
  /** Callback to pass the editor instance to parent component */
  onEditorReady?: (editor: Editor | null) => void;
}

/**
 * Ref handle for EditorArea - exposes loadDocument method
 */
export interface EditorAreaHandle {
  loadDocument: (doc: ProjectDocument) => void;
}

/** Debounce delay for auto-save (ms) */
const AUTO_SAVE_DELAY = 500;

/**
 * Main editor area with TipTap rich text editor
 * Document content is loaded/saved directly to localStorage
 */
export const EditorArea = forwardRef<EditorAreaHandle, EditorAreaProps>(
  function EditorArea({ className, onEditorReady }, ref) {
  
  // Get IDs from Zustand (no content!)
  const activeProjectId = useActiveProjectId();
  const activeDocumentId = useActiveDocumentId();
  
  // Get actions via getState to avoid re-render loops
  const setSelectedTextRef = useRef(useWorkspaceStore.getState().setSelectedText);
  const setActiveDocumentIdRef = useRef(useWorkspaceStore.getState().setActiveDocumentId);
  
  // Local state for document data loaded from localStorage
  const [currentDocument, setCurrentDocument] = useState<ProjectDocument | null>(null);
  
  // Auto-save status indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-save debounce timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if we're loading content to prevent save during load
  const isLoadingRef = useRef(false);
  
  // Keep refs updated
  useEffect(() => {
    return useWorkspaceStore.subscribe((state) => {
      setSelectedTextRef.current = state.setSelectedText;
      setActiveDocumentIdRef.current = state.setActiveDocumentId;
    });
  }, []);

  // Initialize TipTap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your copy...',
      }),
      CharacterCount,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-apple-blue underline cursor-pointer hover:text-apple-blue-dark',
        },
      }),
      Typography,
      // Font styling extensions
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize.configure({
        sizes: ['8px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '72px'],
      }),
      // Color extensions
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: '',
    onCreate: ({ editor }) => {
      onEditorReady?.(editor);
      console.log('✅ Editor instance created');
    },
    onDestroy: () => {
      onEditorReady?.(null);
      console.log('🗑️ Editor instance destroyed');
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[800px] text-apple-text-dark',
      },
    },
  });

  /**
   * Save document content to localStorage
   * Called on every editor change (debounced)
   */
  const saveToLocalStorage = useCallback((content: string) => {
    if (!activeProjectId || !currentDocument?.id) {
      console.warn('⚠️ Cannot save: missing projectId or documentId');
      setSaveStatus('idle');
      return;
    }
    
    try {
      updateDocument(activeProjectId, currentDocument.id, { content });
      console.log('💾 Document saved to localStorage:', {
        docId: currentDocument.id,
        contentLength: content.length,
      });
      
      // Update save status indicator
      setSaveStatus('saved');
      
      // Clear any existing timer
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
      
      // Return to idle after 2 seconds
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to save document:', error);
      setSaveStatus('idle');
    }
  }, [activeProjectId, currentDocument?.id]);

  /**
   * Handle editor content changes
   * Debounces and saves to localStorage
   */
  const handleEditorUpdate = useCallback(() => {
    // Don't save while loading
    if (isLoadingRef.current) return;
    
    if (!editor) return;
    
    // Show saving indicator immediately
    setSaveStatus('saving');
    
    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Debounce save
    autoSaveTimerRef.current = setTimeout(() => {
      const html = editor.getHTML();
      saveToLocalStorage(html);
      
      // Update local document state with new content
      setCurrentDocument((prev) => prev ? {
        ...prev,
        content: html,
        modifiedAt: new Date().toISOString(),
      } : null);
    }, AUTO_SAVE_DELAY);
  }, [editor, saveToLocalStorage]);

  /**
   * Load document from localStorage and display in editor
   */
  const loadDocumentFromStorage = useCallback((docId: string) => {
    if (!activeProjectId || !editor) {
      console.warn('⚠️ Cannot load document: missing projectId or editor');
      return;
    }
    
    isLoadingRef.current = true;
    
    try {
      const doc = getDocument(activeProjectId, docId);
      
      if (!doc) {
        console.warn('⚠️ Document not found:', docId);
        setCurrentDocument(null);
        editor.commands.setContent('');
        isLoadingRef.current = false;
        return;
      }
      
      // Set local state
      setCurrentDocument(doc);
      
      // Load content into editor
      editor.commands.setContent(doc.content || '');
      
      console.log('📄 Document loaded from localStorage:', {
        id: doc.id,
        title: doc.title,
        contentLength: doc.content?.length || 0,
      });
    } catch (error) {
      console.error('❌ Failed to load document:', error);
      setCurrentDocument(null);
      editor.commands.setContent('');
    } finally {
      // Use setTimeout to ensure content is set before allowing saves
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    }
  }, [activeProjectId, editor]);

  /**
   * Load document when activeDocumentId changes
   * This handles:
   * - Initial load on page mount
   * - Switching between documents
   * - Rehydration after page refresh
   */
  useEffect(() => {
    if (!editor) return;
    
    if (activeDocumentId) {
      loadDocumentFromStorage(activeDocumentId);
    } else {
      // No active document - clear editor
      setCurrentDocument(null);
      isLoadingRef.current = true;
      editor.commands.setContent('');
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    }
  }, [editor, activeDocumentId, loadDocumentFromStorage]);

  /**
   * Listen to editor updates for auto-save
   */
  useEffect(() => {
    if (!editor) return;
    
    editor.on('update', handleEditorUpdate);
    
    return () => {
      editor.off('update', handleEditorUpdate);
      // Clear any pending save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      // Clear status timer
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, [editor, handleEditorUpdate]);

  /**
   * Track text selection changes
   */
  useEffect(() => {
    if (!editor) return;

    let debounceTimer: NodeJS.Timeout | null = null;
    
    const handleSelectionUpdate = (): void => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        const selection = getEditorSelection(editor);
        
        if (selection) {
          setSelectedTextRef.current(selection.text, selection.range);
        } else {
          setSelectedTextRef.current(null, null);
        }
      }, 150);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('update', handleSelectionUpdate);

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('update', handleSelectionUpdate);
    };
  }, [editor]);

  /**
   * Export editor instance for toolbar
   */
  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      window.__tiptapEditor = editor;
    }
  }, [editor]);

  /**
   * Handle loading a document from external source (DocumentList click)
   */
  const handleLoadDocument = useCallback((doc: ProjectDocument) => {
    if (!editor) {
      console.warn('⚠️ Editor not ready');
      return;
    }
    
    isLoadingRef.current = true;
    
    // Update Zustand with new active document ID
    setActiveDocumentIdRef.current(doc.id);
    
    // Set local state
    setCurrentDocument(doc);
    
    // Load content into editor
    editor.commands.setContent(doc.content || '');
    
    console.log('📄 Document loaded via click:', {
      id: doc.id,
      title: doc.title,
      version: doc.version,
    });
    
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [editor]);

  // Expose loadDocument via ref for parent components
  useImperativeHandle(ref, () => ({
    loadDocument: handleLoadDocument,
  }), [handleLoadDocument]);

  return (
    <div
      className={cn(
        'relative h-full w-full',
        'bg-apple-editor-bg',
        'flex items-start justify-center',
        'overflow-y-auto custom-scrollbar',
        'py-12 px-8',
        className
      )}
    >
      {/* Paper container */}
      <div
        className={cn(
          'w-full max-w-[850px]',
          'bg-white',
          'rounded-sm',
          'min-h-[11in]',
          'relative',
          'transition-all duration-300'
        )}
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {currentDocument ? (
          <>
            {/* Document header */}
            <div
              className="px-16 py-3 border-b border-gray-200 flex items-center justify-between"
            >
              {/* Title display */}
              <div className="flex items-center gap-2 flex-1">
                <span
                  className={cn(
                    'text-xl font-sans font-semibold',
                    'text-black',
                    'truncate'
                  )}
                  title={currentDocument.title}
                >
                  {currentDocument.title}
                </span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                  v{currentDocument.version}
                </span>
              </div>

              {/* Last edited with auto-save indicator */}
              <div className="flex items-center gap-3 text-xs text-gray-500 whitespace-nowrap">
                <span>
                  Saved{' '}
                  {new Date(currentDocument.modifiedAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {saveStatus === 'saved' && (
                  <span className="text-green-500 text-xs flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    Saved
                  </span>
                )}
                {saveStatus === 'saving' && (
                  <span className="text-yellow-500 text-xs flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    Saving...
                  </span>
                )}
              </div>
            </div>

            {/* TipTap editor */}
            <div
              className="px-16 py-8"
              style={{
                paddingLeft: '60px',
                paddingRight: '60px',
                paddingTop: '40px',
                paddingBottom: '40px',
              }}
            >
              <EditorContent
                editor={editor}
                className={cn(
                  'tiptap-editor',
                  'text-base leading-relaxed',
                  'focus-within:outline-none'
                )}
              />
            </div>
          </>
        ) : (
          // No document state
          <div className="flex flex-col items-center justify-center min-h-[600px] text-center p-16">
            <div className="text-gray-400 text-lg font-medium mb-2">
              No document open
            </div>
            <p className="text-gray-400 text-sm max-w-md">
              Create a new document or select one from the left sidebar
            </p>
          </div>
        )}

        {/* Paper shadow effect */}
        <div
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.03)',
          }}
        />
      </div>

      {/* TipTap styles */}
      <style jsx global>{`
        .tiptap-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #1D1D1F;
        }

        .tiptap-editor .ProseMirror {
          outline: none;
        }

        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #86868B;
          font-style: italic;
          pointer-events: none;
          height: 0;
        }

        .tiptap-editor p {
          margin-top: 0;
          margin-bottom: 0.75rem;
        }

        .tiptap-editor p:first-child {
          margin-top: 0;
        }

        .tiptap-editor p:last-child {
          margin-bottom: 0;
        }

        .tiptap-editor h1 {
          font-size: 2em;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.2;
        }

        .tiptap-editor h1:first-child {
          margin-top: 0;
        }

        .tiptap-editor h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }

        .tiptap-editor h2:first-child {
          margin-top: 0;
        }

        .tiptap-editor h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .tiptap-editor h3:first-child {
          margin-top: 0;
        }

        .tiptap-editor ul,
        .tiptap-editor ol {
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }

        .tiptap-editor ul {
          list-style-type: disc;
        }

        .tiptap-editor ol {
          list-style-type: decimal;
        }

        .tiptap-editor li {
          margin-bottom: 0.25rem;
        }

        .tiptap-editor strong {
          font-weight: 600;
        }

        .tiptap-editor em {
          font-style: italic;
        }

        .tiptap-editor u {
          text-decoration: underline;
        }

        .tiptap-editor a {
          color: #0071E3;
          text-decoration: underline;
          cursor: pointer;
        }

        .tiptap-editor a:hover {
          color: #0062CC;
        }

        .tiptap-editor code {
          background-color: #f5f5f7;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }

        .tiptap-editor blockquote {
          border-left: 3px solid #d2d2d7;
          padding-left: 1em;
          margin-left: 0;
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          font-style: italic;
          color: #6e6e73;
        }

        .tiptap-editor [data-text-align="left"] {
          text-align: left;
        }

        .tiptap-editor [data-text-align="center"] {
          text-align: center;
        }

        .tiptap-editor [data-text-align="right"] {
          text-align: right;
        }

        .tiptap-editor [data-text-align="justify"] {
          text-align: justify;
        }
      `}</style>
    </div>
  );
});
