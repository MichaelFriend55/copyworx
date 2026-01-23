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
 * - Zoom controls for editor view (50%-200%)
 * - Two view modes: Scrolling (default) and Focus
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
import Dropcursor from '@tiptap/extension-dropcursor';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { FontSize } from '@/lib/tiptap/font-size';
import { useWorkspaceStore, useActiveProjectId, useActiveDocumentId, useViewMode } from '@/lib/stores/workspaceStore';
import { useSnippetStore } from '@/lib/stores/snippetStore';
import { getDocument, updateDocument, createDocumentVersion } from '@/lib/storage/unified-storage';
import { getEditorSelection } from '@/lib/editor-utils';
import { cn } from '@/lib/utils';
import type { ProjectDocument } from '@/lib/types/project';
import { ZoomIn, ZoomOut, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { TemplateResumeBanner } from './TemplateResumeBanner';
import { logger } from '@/lib/utils/logger';

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

/** Available zoom levels for the editor (percentages) */
const ZOOM_LEVELS = [50, 75, 90, 100, 110, 125, 150, 175, 200] as const;

/** Default zoom level */
const DEFAULT_ZOOM = 100;

/**
 * Main editor area with TipTap rich text editor
 * Document content is loaded/saved directly to localStorage
 */
export const EditorArea = forwardRef<EditorAreaHandle, EditorAreaProps>(
  function EditorArea({ className, onEditorReady }, ref) {
  
  // Get IDs from Zustand (no content!)
  const activeProjectId = useActiveProjectId();
  const activeDocumentId = useActiveDocumentId();
  const viewMode = useViewMode();
  
  // Get actions via getState to avoid re-render loops
  const setSelectedTextRef = useRef(useWorkspaceStore.getState().setSelectedText);
  const setActiveDocumentIdRef = useRef(useWorkspaceStore.getState().setActiveDocumentId);
  
  // Check view mode - only focus mode has special styling now
  const isFocusMode = viewMode === 'focus';
  
  // Local state for document data loaded from localStorage
  const [currentDocument, setCurrentDocument] = useState<ProjectDocument | null>(null);
  
  // Auto-save status indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-save debounce timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Zoom level state (view preference, not saved to document)
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM);
  
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
      Dropcursor.configure({
        color: '#0071E3',
        width: 2,
      }),
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize.configure({
        sizes: ['8px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '72px'],
      }),
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
    },
    onDestroy: () => {
      onEditorReady?.(null);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[800px] text-apple-text-dark',
      },
      handleDOMEvents: {
        drop: () => false,
        dragstart: () => false,
      },
    },
  });

  /**
   * Save document content to storage (cloud with localStorage fallback)
   */
  const saveToLocalStorage = useCallback(async (content: string) => {
    if (!activeProjectId || !currentDocument?.id) {
      logger.warn('⚠️ Cannot save: missing projectId or documentId');
      setSaveStatus('idle');
      return;
    }
    
    try {
      await updateDocument(activeProjectId, currentDocument.id, { content });
      setSaveStatus('saved');
      
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
      
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
      
    } catch (error) {
      logger.error('❌ Failed to save document:', error);
      setSaveStatus('idle');
    }
  }, [activeProjectId, currentDocument?.id]);

  /**
   * Handle editor content changes
   */
  const handleEditorUpdate = useCallback(() => {
    if (isLoadingRef.current) return;
    if (!editor) return;
    
    setSaveStatus('saving');
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      const html = editor.getHTML();
      saveToLocalStorage(html);
      
      setCurrentDocument((prev) => prev ? {
        ...prev,
        content: html,
        modifiedAt: new Date().toISOString(),
      } : null);
    }, AUTO_SAVE_DELAY);
  }, [editor, saveToLocalStorage]);

  /**
   * Load document from storage (cloud with localStorage fallback)
   */
  const loadDocumentFromStorage = useCallback(async (docId: string) => {
    if (!activeProjectId || !editor) {
      logger.warn('⚠️ Cannot load document: missing projectId or editor');
      return;
    }
    
    isLoadingRef.current = true;
    
    try {
      const doc = await getDocument(activeProjectId, docId);
      
      if (!doc) {
        logger.warn('⚠️ Document not found:', docId);
        setCurrentDocument(null);
        editor.commands.setContent('');
        isLoadingRef.current = false;
        return;
      }
      
      setCurrentDocument(doc);
      editor.commands.setContent(doc.content || '');
    } catch (error) {
      logger.error('❌ Failed to load document:', error);
      setCurrentDocument(null);
      editor.commands.setContent('');
    } finally {
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    }
  }, [activeProjectId, editor]);

  /**
   * Load document when activeDocumentId changes
   */
  useEffect(() => {
    if (!editor) return;
    
    if (activeDocumentId) {
      loadDocumentFromStorage(activeDocumentId);
    } else {
      setCurrentDocument(null);
      isLoadingRef.current = true;
      editor.commands.setContent('');
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    }
  }, [editor, activeDocumentId, loadDocumentFromStorage]);

  /**
   * Listen for document updates from external sources
   */
  useEffect(() => {
    const handleDocumentUpdated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { projectId, documentId } = customEvent.detail;
      
      if (projectId === activeProjectId && documentId === activeDocumentId && editor) {
        try {
          const doc = await getDocument(projectId, documentId);
          if (doc) {
            setCurrentDocument(doc);
            logger.log('✅ Document metadata refreshed:', doc.title);
          }
        } catch (error) {
          logger.error('❌ Failed to refresh document:', error);
        }
      }
    };

    window.addEventListener('documentUpdated', handleDocumentUpdated);
    return () => window.removeEventListener('documentUpdated', handleDocumentUpdated);
  }, [activeProjectId, activeDocumentId, editor]);

  /**
   * Listen to editor updates for auto-save
   */
  useEffect(() => {
    if (!editor) return;
    
    editor.on('update', handleEditorUpdate);
    
    return () => {
      editor.off('update', handleEditorUpdate);
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
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
          setSelectedTextRef.current(selection.text, selection.html, selection.range);
        } else {
          setSelectedTextRef.current(null, null, null);
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
   * Register editor with snippet store
   */
  useEffect(() => {
    useSnippetStore.getState().setEditorRef(editor);
    return () => {
      useSnippetStore.getState().setEditorRef(null);
    };
  }, [editor]);

  /**
   * Handle loading a document from external source
   */
  const handleLoadDocument = useCallback((doc: ProjectDocument) => {
    if (!editor) {
      logger.warn('⚠️ Editor not ready');
      return;
    }
    
    isLoadingRef.current = true;
    setActiveDocumentIdRef.current(doc.id);
    setCurrentDocument(doc);
    editor.commands.setContent(doc.content || '');
    
    logger.log('📄 Document loaded via click:', {
      id: doc.id,
      title: doc.title,
      version: doc.version,
    });
    
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [editor]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel((current) => {
      const currentIndex = ZOOM_LEVELS.indexOf(current as typeof ZOOM_LEVELS[number]);
      if (currentIndex === -1) {
        const nextLevel = ZOOM_LEVELS.find((level) => level > current);
        return nextLevel ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
      }
      if (currentIndex < ZOOM_LEVELS.length - 1) {
        return ZOOM_LEVELS[currentIndex + 1];
      }
      return current;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((current) => {
      const currentIndex = ZOOM_LEVELS.indexOf(current as typeof ZOOM_LEVELS[number]);
      if (currentIndex === -1) {
        const prevLevels = ZOOM_LEVELS.filter((level) => level < current);
        return prevLevels.length > 0 ? prevLevels[prevLevels.length - 1] : ZOOM_LEVELS[0];
      }
      if (currentIndex > 0) {
        return ZOOM_LEVELS[currentIndex - 1];
      }
      return current;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(DEFAULT_ZOOM);
  }, []);

  const handleSliderChange = useCallback((value: number[]) => {
    if (value[0] !== undefined) {
      setZoomLevel(value[0]);
    }
  }, []);

  const canZoomIn = zoomLevel < ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  const canZoomOut = zoomLevel > ZOOM_LEVELS[0];

  /**
   * Parse version number from document title
   */
  const parseVersionFromTitle = useCallback((title: string): { base: string; version: number | null } => {
    const regex = /\s+v(\d+)$/i;
    const match = title.match(regex);
    
    if (match) {
      const version = parseInt(match[1], 10);
      const base = title.slice(0, match.index).trim();
      return { base, version };
    }
    
    return { base: title, version: null };
  }, []);

  /**
   * Handle "Save as New Version"
   */
  const handleSaveAsNewVersion = useCallback(async () => {
    if (!currentDocument || !activeProjectId || !editor) {
      logger.error('❌ Cannot save version: missing document, project, or editor');
      return;
    }

    try {
      const currentContent = editor.getHTML();
      const { base, version } = parseVersionFromTitle(currentDocument.title);
      const currentVersion = version ?? 1;
      const newVersion = currentVersion + 1;
      
      const newDoc = await createDocumentVersion(activeProjectId, currentDocument.id, currentContent);
      const newTitle = `${base} v${newVersion}`;
      
      await updateDocument(activeProjectId, newDoc.id, { 
        title: newTitle,
        baseTitle: base,
        version: newVersion 
      });
      
      setCurrentDocument({
        ...newDoc,
        title: newTitle,
        baseTitle: base,
        version: newVersion,
        content: currentContent,
      });
      
      setActiveDocumentIdRef.current(newDoc.id);
      toast.success(`Created ${newTitle}`);
      
      logger.log('✅ New version created:', {
        originalTitle: currentDocument.title,
        newTitle,
        newVersion,
        newId: newDoc.id,
      });
    } catch (error) {
      logger.error('❌ Failed to create new version:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create new version');
    }
  }, [currentDocument, activeProjectId, editor, parseVersionFromTitle]);

  // Expose loadDocument via ref
  useImperativeHandle(ref, () => ({
    loadDocument: handleLoadDocument,
  }), [handleLoadDocument]);

  return (
    <div
      className={cn(
        'relative h-full w-full',
        'overflow-y-auto custom-scrollbar',
        'transition-all duration-300',
        isFocusMode 
          ? 'bg-white py-8 px-4'
          : 'bg-apple-editor-bg py-12 px-8',
        'flex items-start justify-center',
        className
      )}
      data-print-content
      data-tour="editor"
    >
      {/* Template Resume Banner */}
      <TemplateResumeBanner />
      
      {/* Paper Container */}
      <div
        className={cn(
          'w-full',
          'bg-white',
          'relative',
          'transition-all duration-300',
          isFocusMode 
            ? 'max-w-[750px] shadow-none min-h-screen'
            : 'max-w-[850px] rounded-sm min-h-[11in]',
        )}
        style={{
          boxShadow: isFocusMode ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {currentDocument ? (
          <>
            {/* Document header */}
            <div
              className={cn(
                'transition-all duration-300',
                isFocusMode 
                  ? 'px-8 py-3 border-b border-gray-100 space-y-2'
                  : 'px-16 py-3 border-b border-gray-200 space-y-2'
              )}
              data-print-hide
            >
              {/* LINE 1: Document title and Save as New Version button */}
              <div className="flex items-start justify-between gap-4">
                <h1 
                  className="text-xl font-sans font-semibold text-black leading-tight max-w-[70%]"
                  title={currentDocument.title}
                >
                  {currentDocument.title}
                </h1>
                
                <button
                  onClick={handleSaveAsNewVersion}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md flex-shrink-0',
                    'text-sm font-medium',
                    'bg-primary/10 text-primary',
                    'hover:bg-primary/20 active:bg-primary/25',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30'
                  )}
                  title="Save as New Version"
                  aria-label="Save as New Version"
                >
                  <Copy className="w-4 h-4" />
                  <span>Save as New Version</span>
                </button>
              </div>

              {/* LINE 2: Zoom controls and Save status */}
              <div className="flex items-center justify-between">
                {/* Zoom controls */}
                <div className="flex items-center gap-2 border border-gray-200 rounded-md bg-gray-50/50 px-2 py-1.5">
                  <button
                    onClick={handleZoomOut}
                    disabled={!canZoomOut}
                    className={cn(
                      'p-1 rounded transition-colors duration-150',
                      'hover:bg-gray-100 active:bg-gray-200',
                      'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset'
                    )}
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4 text-gray-600" />
                  </button>

                  <div className="w-px h-5 bg-gray-200" />

                  <div className="w-[120px] px-1">
                    <Slider
                      value={[zoomLevel]}
                      onValueChange={handleSliderChange}
                      min={50}
                      max={200}
                      step={5}
                      className="cursor-pointer"
                      aria-label="Zoom level"
                    />
                  </div>

                  <div className="w-px h-5 bg-gray-200" />

                  <button
                    onClick={handleZoomReset}
                    className={cn(
                      'px-2 py-1 min-w-[52px] text-center',
                      'text-xs font-medium text-gray-700',
                      'hover:bg-gray-100 active:bg-gray-200',
                      'transition-colors duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset',
                      zoomLevel !== DEFAULT_ZOOM && 'text-primary'
                    )}
                    title="Reset to 100%"
                    aria-label={`Current zoom: ${zoomLevel}%. Click to reset to 100%`}
                  >
                    {zoomLevel}%
                  </button>

                  <div className="w-px h-5 bg-gray-200" />

                  <button
                    onClick={handleZoomIn}
                    disabled={!canZoomIn}
                    className={cn(
                      'p-1 rounded transition-colors duration-150',
                      'hover:bg-gray-100 active:bg-gray-200',
                      'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset'
                    )}
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Save status */}
                <div className="flex items-center gap-3 text-xs text-gray-500 whitespace-nowrap">
                  <span>
                    Saved{' '}
                    {new Date(currentDocument.modifiedAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  <span className="min-w-[60px]">
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
                  </span>
                </div>
              </div>
            </div>

            {/* TipTap editor with zoom */}
            <div
              className="overflow-auto transition-all duration-300 print-editor-wrapper"
              style={{
                paddingLeft: isFocusMode ? '40px' : '60px',
                paddingRight: isFocusMode ? '40px' : '60px',
                paddingTop: isFocusMode ? '60px' : '40px',
                paddingBottom: isFocusMode ? '120px' : '40px',
              }}
            >
              <div
                className="editor-zoom-container"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top left',
                  transition: 'transform 150ms ease-out',
                  width: `${10000 / zoomLevel}%`,
                }}
              >
                {/* This is the actual print content - ID used by print CSS */}
                <div id="print-content">
                  <EditorContent
                    editor={editor}
                    className={cn(
                      'tiptap-editor',
                      'text-base leading-relaxed',
                      'focus-within:outline-none'
                    )}
                  />
                </div>
              </div>
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

        .ProseMirror .ProseMirror-dropcursor {
          border-left: 2px solid #0071E3;
          pointer-events: none;
          position: absolute;
        }

        .editor-zoom-container {
          will-change: transform;
        }

        .editor-zoom-container .ProseMirror {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
      `}</style>
    </div>
  );
});
