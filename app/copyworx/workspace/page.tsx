/**
 * @file app/copyworx/workspace/page.tsx
 * @description Main workspace page with document version control
 * 
 * Features:
 * - Document list with version grouping
 * - Editor with save/save-as-new-version
 * - Project switching
 * - AI tools
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { EditorArea, type EditorAreaHandle } from '@/components/workspace/EditorArea';
import { LeftSidebarContent } from '@/components/workspace/LeftSidebarContent';
import { RightSidebarContent } from '@/components/workspace/RightSidebarContent';
import { EditorContextMenu, SaveSnippetModal } from '@/components/workspace/snippets';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { initializeProjectSystem } from '@/lib/utils/project-utils';
import type { Editor } from '@tiptap/react';
import type { ProjectDocument, Snippet } from '@/lib/types/project';

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f5f5f7]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#86868b]">Loading workspace...</p>
      </div>
    </div>
  );
}

/**
 * Main workspace page component
 */
export default function WorkspacePage() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  
  // Client-side mounting state
  const [mounted, setMounted] = useState(false);
  
  // Editor instance state
  const [editor, setEditor] = useState<Editor | null>(null);
  
  // Ref for EditorArea to call loadDocument
  const editorRef = useRef<EditorAreaHandle>(null);
  
  // Prevent double initialization in StrictMode
  const initRef = useRef(false);
  
  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  
  // Save as Snippet modal state
  const [saveSnippetModalOpen, setSaveSnippetModalOpen] = useState(false);
  const [snippetSelectionHtml, setSnippetSelectionHtml] = useState('');
  const [snippetSelectionText, setSnippetSelectionText] = useState('');
  
  // Wait for client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Initialize workspace
  useEffect(() => {
    if (!mounted || initRef.current) return;
    initRef.current = true;
    
    console.log('🚀 Initializing workspace...');
    
    // Initialize project system
    initializeProjectSystem();
    
    // Refresh projects into store
    const store = useWorkspaceStore.getState();
    store.refreshProjects();
    
    // Create document if needed
    setTimeout(() => {
      const currentDoc = useWorkspaceStore.getState().activeDocument;
      if (action === 'new' || !currentDoc) {
        useWorkspaceStore.getState().createDocument('Untitled Document');
        console.log('🆕 Created new document');
      } else {
        console.log('📄 Using existing document');
      }
    }, 50);
  }, [mounted, action]);
  
  // Handle editor ready
  const handleEditorReady = React.useCallback((editorInstance: Editor | null) => {
    setEditor(editorInstance);
  }, []);
  
  /**
   * Handle document click from DocumentList
   * Loads the selected document into the editor
   */
  const handleDocumentClick = useCallback((doc: ProjectDocument) => {
    console.log('📄 Document clicked in workspace:', {
      id: doc.id,
      title: doc.title,
      version: doc.version,
    });
    
    if (editorRef.current) {
      editorRef.current.loadDocument(doc);
    } else {
      console.warn('⚠️ Editor ref not ready, cannot load document');
    }
  }, []);
  
  /**
   * Handle snippet insertion from SnippetsList
   * Inserts the snippet content at the current cursor position
   */
  const handleInsertSnippet = useCallback((snippet: Snippet) => {
    if (!editor) {
      console.warn('⚠️ Editor not ready, cannot insert snippet');
      return;
    }
    
    console.log('📎 Inserting snippet:', snippet.name);
    
    // Insert the snippet content at the current cursor position
    // Using insertContent preserves the HTML formatting
    editor.chain().focus().insertContent(snippet.content).run();
    
    console.log('✅ Snippet inserted successfully');
  }, [editor]);
  
  /**
   * Handle right-click context menu
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only show custom context menu if we have an editor
    if (!editor) return;
    
    e.preventDefault();
    
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  }, [editor]);
  
  /**
   * Close context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenuVisible(false);
  }, []);
  
  /**
   * Handle "Save as Snippet" from context menu
   */
  const handleSaveAsSnippet = useCallback((html: string, text: string) => {
    setSnippetSelectionHtml(html);
    setSnippetSelectionText(text);
    setSaveSnippetModalOpen(true);
  }, []);
  
  /**
   * Close Save Snippet modal
   */
  const closeSaveSnippetModal = useCallback(() => {
    setSaveSnippetModalOpen(false);
    setSnippetSelectionHtml('');
    setSnippetSelectionText('');
  }, []);
  
  /**
   * Handle snippet saved - refresh projects to ensure UI updates
   */
  const handleSnippetSaved = useCallback(() => {
    const store = useWorkspaceStore.getState();
    store.refreshProjects();
    console.log('✅ Snippets list refreshed after saving from selection');
  }, []);
  
  // Get current selection from editor for context menu
  const getSelectionInfo = useCallback(() => {
    if (!editor) return { hasSelection: false, text: '', html: '' };
    
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    if (!hasSelection) return { hasSelection: false, text: '', html: '' };
    
    const text = editor.state.doc.textBetween(from, to, ' ');
    
    // Get HTML of selection
    const slice = editor.state.doc.slice(from, to);
    const tempDiv = document.createElement('div');
    const fragment = slice.content;
    
    // Convert ProseMirror fragment to HTML
    // Using the editor's schema to serialize
    const serializer = editor.view.dom.ownerDocument.createElement('div');
    const tempEditor = document.createElement('div');
    tempEditor.innerHTML = editor.getHTML();
    
    // For simplicity, we'll use the selected text wrapped in a paragraph
    // A more sophisticated approach would serialize the exact selection
    const html = `<p>${text}</p>`;
    
    return { hasSelection, text, html };
  }, [editor]);
  
  // Show loading during SSR/hydration
  if (!mounted) {
    return <LoadingSpinner />;
  }
  
  // Get selection info for context menu
  const selectionInfo = getSelectionInfo();
  
  return (
    <>
      <WorkspaceLayout
        leftSidebar={
          <LeftSidebarContent 
            onDocumentClick={handleDocumentClick}
            onInsertSnippet={handleInsertSnippet}
          />
        }
        rightSidebar={<RightSidebarContent editor={editor} />}
      >
        <div onContextMenu={handleContextMenu} className="h-full">
          <EditorArea ref={editorRef} onEditorReady={handleEditorReady} />
        </div>
      </WorkspaceLayout>
      
      {/* Editor Context Menu */}
      <EditorContextMenu
        isVisible={contextMenuVisible}
        position={contextMenuPosition}
        hasSelection={selectionInfo.hasSelection}
        selectedText={selectionInfo.text}
        selectedHtml={selectionInfo.html}
        onClose={closeContextMenu}
        onSaveAsSnippet={handleSaveAsSnippet}
      />
      
      {/* Save as Snippet Modal */}
      <SaveSnippetModal
        isOpen={saveSnippetModalOpen}
        onClose={closeSaveSnippetModal}
        selectedContent={snippetSelectionHtml}
        selectedText={snippetSelectionText}
        onSaved={handleSnippetSaved}
      />
    </>
  );
}
