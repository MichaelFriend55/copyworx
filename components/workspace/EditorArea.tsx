/**
 * @file components/workspace/EditorArea.tsx
 * @description TipTap rich text editor with version control
 * 
 * Features:
 * - TipTap editor with full formatting
 * - Automatic content persistence
 * - Real-time word/character count
 * - Version control (save vs save-as-new-version)
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
import { useWorkspaceStore, useActiveProjectId } from '@/lib/stores/workspaceStore';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { getEditorSelection } from '@/lib/editor-utils';
import { cn } from '@/lib/utils';
import { createDocumentVersion, updateDocument } from '@/lib/storage/document-storage';
import type { ProjectDocument } from '@/lib/types/project';
import { Button } from '@/components/ui/button';
import { Save, Copy, FileText } from 'lucide-react';

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

/**
 * Main editor area with TipTap rich text editor and version control
 */
export const EditorArea = forwardRef<EditorAreaHandle, EditorAreaProps>(
  function EditorArea({ className, onEditorReady }, ref) {
  const activeDocument = useWorkspaceStore((state) => state.activeDocument);
  const activeProjectId = useActiveProjectId();
  
  // ---------------------------------------------------------------------------
  // Version Control State
  // ---------------------------------------------------------------------------
  
  /** Currently loaded ProjectDocument with version info */
  const [currentDocument, setCurrentDocument] = useState<ProjectDocument | null>(null);
  
  /** Save operation loading state */
  const [isSaving, setIsSaving] = useState(false);
  
  /** Save operation status message */
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  
  // Use refs for store functions to avoid re-render loops in useEffect dependencies
  // These functions are stable in Zustand but selecting them creates new references
  const updateDocumentTitleRef = useRef(useWorkspaceStore.getState().updateDocumentTitle);
  const setSelectedTextRef = useRef(useWorkspaceStore.getState().setSelectedText);
  
  // Keep refs updated (but don't trigger re-renders)
  useEffect(() => {
    return useWorkspaceStore.subscribe((state) => {
      updateDocumentTitleRef.current = state.updateDocumentTitle;
      setSelectedTextRef.current = state.setSelectedText;
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
    ],
    content: '', // Start empty, will be loaded from store
    onCreate: ({ editor }) => {
      // Pass editor instance to parent when created
      onEditorReady?.(editor);
      console.log('✅ Editor instance passed to parent');
    },
    onDestroy: () => {
      // Clear editor instance from parent when destroyed
      onEditorReady?.(null);
      console.log('🗑️ Editor instance cleared from parent');
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[800px] text-apple-text-dark',
      },
    },
  });

  // Load content when activeDocument changes
  useEffect(() => {
    if (editor && activeDocument?.content) {
      const currentContent = editor.getHTML();
      const newContent = activeDocument.content;
      
      // Only update if content is different
      if (currentContent !== newContent) {
        editor.commands.setContent(newContent);
        console.log('📄 Loaded content from store:', {
          id: activeDocument.id,
          contentLength: newContent.length,
        });
      }
    }
  }, [editor, activeDocument?.id]); // Only re-run when document ID changes

  // Enable auto-save
  useAutoSave(editor);

  // Track text selection changes and update store
  // PERFORMANCE: Uses debouncing to prevent flooding during drag selection
  useEffect(() => {
    if (!editor) return;

    // Debounce timeout ref
    let debounceTimer: NodeJS.Timeout | null = null;
    
    // Handler for selection updates - DEBOUNCED to prevent UI freezing
    const handleSelectionUpdate = (): void => {
      // Clear any pending debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Debounce: wait 150ms after last selection change before updating store
      // This prevents hundreds of updates during drag selection
      debounceTimer = setTimeout(() => {
        const selection = getEditorSelection(editor);
        
        if (selection) {
          // User has text selected
          setSelectedTextRef.current(selection.text, selection.range);
        } else {
          // No selection (cursor only or empty selection)
          setSelectedTextRef.current(null, null);
        }
      }, 150);
    };

    // Listen to selection updates
    editor.on('selectionUpdate', handleSelectionUpdate);
    
    // Also track when content changes (in case selection becomes invalid)
    editor.on('update', handleSelectionUpdate);

    // Initial check (immediate, no debounce needed)
    const selection = getEditorSelection(editor);
    if (selection) {
      setSelectedTextRef.current(selection.text, selection.range);
    }

    // Cleanup
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('update', handleSelectionUpdate);
    };
  }, [editor]); // Only depend on editor - refs are stable

  // Export editor instance for toolbar
  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      window.__tiptapEditor = editor;
      console.log('🔗 Editor instance exported to window');
    }
  }, [editor]);

  // ---------------------------------------------------------------------------
  // Version Control Handlers
  // ---------------------------------------------------------------------------

  /**
   * Load a ProjectDocument into the editor
   * Called from DocumentList's onDocumentClick
   */
  const handleLoadDocument = useCallback((doc: ProjectDocument) => {
    if (!editor) {
      console.warn('⚠️ Editor not ready');
      return;
    }
    
    // Set the current document with version info
    setCurrentDocument(doc);
    
    // Load content into editor
    editor.commands.setContent(doc.content || '');
    
    // Clear any previous save status
    setSaveStatus(null);
    
    console.log('📄 Document loaded:', {
      id: doc.id,
      title: doc.title,
      version: doc.version,
      baseTitle: doc.baseTitle,
    });
  }, [editor]);

  /**
   * Save current content to the existing document version
   * Updates content without creating a new version
   */
  const handleSave = useCallback(async () => {
    if (!editor || !currentDocument || !activeProjectId) {
      console.warn('⚠️ Cannot save: missing editor, document, or project');
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveStatus(null);
      
      const content = editor.getHTML();
      
      // Update the existing document
      updateDocument(activeProjectId, currentDocument.id, {
        content,
        title: currentDocument.title, // Keep existing title
      });
      
      // Update local state with new modifiedAt
      setCurrentDocument((prev) => prev ? {
        ...prev,
        content,
        modifiedAt: new Date().toISOString(),
      } : null);
      
      setSaveStatus('Saved');
      console.log('✅ Document saved:', {
        id: currentDocument.id,
        version: currentDocument.version,
      });
      
      // Clear status after 2 seconds
      setTimeout(() => setSaveStatus(null), 2000);
      
    } catch (error) {
      console.error('❌ Failed to save document:', error);
      setSaveStatus('Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [editor, currentDocument, activeProjectId]);

  /**
   * Save current content as a new version
   * Creates a new document version, preserving the original
   */
  const handleSaveAsNewVersion = useCallback(async () => {
    if (!editor || !currentDocument || !activeProjectId) {
      console.warn('⚠️ Cannot save as new version: missing editor, document, or project');
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveStatus(null);
      
      const content = editor.getHTML();
      
      // Create new version from current document
      const newVersion = createDocumentVersion(
        activeProjectId,
        currentDocument.id,
        content
      );
      
      // Update to the new version
      setCurrentDocument(newVersion);
      
      setSaveStatus(`Created v${newVersion.version}`);
      console.log('✅ New version created:', {
        id: newVersion.id,
        title: newVersion.title,
        version: newVersion.version,
        parentVersionId: newVersion.parentVersionId,
      });
      
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
      
    } catch (error) {
      console.error('❌ Failed to create new version:', error);
      setSaveStatus('Version creation failed');
    } finally {
      setIsSaving(false);
    }
  }, [editor, currentDocument, activeProjectId]);

  // Expose loadDocument via ref for parent components
  useImperativeHandle(ref, () => ({
    loadDocument: handleLoadDocument,
  }), [handleLoadDocument]);

  // Handle title change - uses ref to avoid stale closure
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    updateDocumentTitleRef.current(e.target.value);
  }, []);

  // Get word and character count
  const wordCount = editor?.storage.characterCount.words() || 0;
  const characterCount = editor?.storage.characterCount.characters() || 0;

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
        {(activeDocument || currentDocument) ? (
          <>
            {/* Version Control Header */}
            {currentDocument && (
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                {/* Document info with version badge */}
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 truncate max-w-[300px]">
                      {currentDocument.baseTitle}
                    </span>
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded font-medium">
                      v{currentDocument.version}
                    </span>
                  </div>
                  {/* Save status indicator */}
                  {saveStatus && (
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      saveStatus.includes('failed') 
                        ? 'bg-destructive/10 text-destructive' 
                        : 'bg-green-100 text-green-700'
                    )}>
                      {saveStatus}
                    </span>
                  )}
                </div>

                {/* Save buttons */}
                <div className="flex items-center gap-2">
                  {/* Regular Save button */}
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    variant="outline"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>

                  {/* Save as new version button */}
                  <Button 
                    onClick={handleSaveAsNewVersion}
                    disabled={isSaving}
                    size="sm"
                    variant="default"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Save as v{currentDocument.version + 1}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Document header */}
            <div
              className="px-16 pt-10 pb-6 border-b border-gray-200"
              style={{ paddingTop: '40px' }}
            >
              {/* Title input */}
              <input
                type="text"
                value={currentDocument?.title || activeDocument?.title || 'Untitled'}
                onChange={handleTitleChange}
                className={cn(
                  'w-full text-3xl font-sans font-semibold',
                  'text-black',
                  'border-none outline-none',
                  'bg-transparent',
                  'placeholder-gray-400',
                  'focus:ring-0'
                )}
                placeholder="Untitled Document"
                aria-label="Document title"
                readOnly={!!currentDocument} // Read-only when using version control
              />

              {/* Document metadata */}
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{characterCount} characters</span>
                <span>•</span>
                <span>
                  Last edited{' '}
                  {new Date(currentDocument?.modifiedAt || activeDocument?.modifiedAt || new Date()).toLocaleDateString()}
                </span>
                {currentDocument?.parentVersionId && (
                  <>
                    <span>•</span>
                    <span className="text-gray-400">
                      Branched from earlier version
                    </span>
                  </>
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

            {/* Word count footer */}
            <div className="px-16 pb-8 flex justify-end">
              <div className="text-sm text-gray-500">
                {wordCount} words • {characterCount} characters
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
              Create a new document or open an existing one to start writing
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

        /* CONTROLLED PARAGRAPH SPACING - Professional email/document spacing */
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
