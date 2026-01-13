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
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { initializeProjectSystem } from '@/lib/utils/project-utils';
import type { Editor } from '@tiptap/react';
import type { ProjectDocument } from '@/lib/types/project';

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
  
  // Show loading during SSR/hydration
  if (!mounted) {
    return <LoadingSpinner />;
  }
  
  return (
    <WorkspaceLayout
      leftSidebar={<LeftSidebarContent onDocumentClick={handleDocumentClick} />}
      rightSidebar={<RightSidebarContent editor={editor} />}
    >
      <EditorArea ref={editorRef} onEditorReady={handleEditorReady} />
    </WorkspaceLayout>
  );
}
