/**
 * @file app/copyworx/workspace/page.tsx
 * @description Main workspace page - FULLY REBUILT AND WORKING
 * 
 * Root cause of previous crashes: Zustand v5 requires useShallow wrapper
 * instead of shallow as second argument to selectors.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { EditorArea } from '@/components/workspace/EditorArea';
import { LeftSidebarContent } from '@/components/workspace/LeftSidebarContent';
import { RightSidebarContent } from '@/components/workspace/RightSidebarContent';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { initializeProjectSystem } from '@/lib/utils/project-utils';
import type { Editor } from '@tiptap/react';

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
  
  // Show loading during SSR/hydration
  if (!mounted) {
    return <LoadingSpinner />;
  }
  
  return (
    <WorkspaceLayout
      leftSidebar={<LeftSidebarContent />}
      rightSidebar={<RightSidebarContent editor={editor} />}
    >
      <EditorArea onEditorReady={handleEditorReady} />
    </WorkspaceLayout>
  );
}
