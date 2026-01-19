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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { EditorArea, type EditorAreaHandle } from '@/components/workspace/EditorArea';
import { LeftSidebarContent } from '@/components/workspace/LeftSidebarContent';
import { RightSidebarContent } from '@/components/workspace/RightSidebarContent';
import { TemplateFormSlideOut, TEMPLATE_FORM_PANEL_ID } from '@/components/workspace/TemplateFormSlideOut';
import { BrandVoiceSlideOut, BRAND_VOICE_PANEL_ID } from '@/components/workspace/BrandVoiceSlideOut';
import { PersonasSlideOut, PERSONAS_PANEL_ID } from '@/components/workspace/PersonasSlideOut';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { useIsSlideOutOpen, useSlideOutActions } from '@/lib/stores/slideOutStore';
import { getTemplateById } from '@/lib/data/templates';
import { initializeProjectSystem } from '@/lib/utils/project-utils';
import type { Editor } from '@tiptap/react';
import type { ProjectDocument, Project } from '@/lib/types/project';

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
  
  // Slide-outs state
  const isTemplateFormOpen = useIsSlideOutOpen(TEMPLATE_FORM_PANEL_ID);
  const isBrandVoiceOpen = useIsSlideOutOpen(BRAND_VOICE_PANEL_ID);
  const isPersonasOpen = useIsSlideOutOpen(PERSONAS_PANEL_ID);
  const { closeSlideOut } = useSlideOutActions();
  const selectedTemplateId = useWorkspaceStore((state) => state.selectedTemplateId);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const projects = useWorkspaceStore((state) => state.projects);
  
  // Get selected template and active project
  const selectedTemplate = useMemo(() => {
    return selectedTemplateId ? getTemplateById(selectedTemplateId) ?? null : null;
  }, [selectedTemplateId]);
  
  const activeProject = useMemo((): Project | null => {
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [activeProjectId, projects]);
  
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
    
    // Note: Documents are created via DocumentList, not automatically here
    // The activeDocumentId will be restored from Zustand persistence if it exists
    console.log('✅ Workspace initialized');
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
   * Handle closing template form slide-out
   */
  const handleCloseTemplateForm = useCallback(() => {
    closeSlideOut(TEMPLATE_FORM_PANEL_ID);
  }, [closeSlideOut]);
  
  /**
   * Handle closing brand voice slide-out
   */
  const handleCloseBrandVoice = useCallback(() => {
    closeSlideOut(BRAND_VOICE_PANEL_ID);
  }, [closeSlideOut]);
  
  /**
   * Handle closing personas slide-out
   */
  const handleClosePersonas = useCallback(() => {
    closeSlideOut(PERSONAS_PANEL_ID);
  }, [closeSlideOut]);
  
  // Show loading during SSR/hydration
  if (!mounted) {
    return <LoadingSpinner />;
  }
  
  return (
    <>
      <WorkspaceLayout
        leftSidebar={<LeftSidebarContent onDocumentClick={handleDocumentClick} />}
        rightSidebar={<RightSidebarContent editor={editor} />}
      >
        <EditorArea ref={editorRef} onEditorReady={handleEditorReady} />
      </WorkspaceLayout>
      
      {/* Template Form Slide-Out - Opens from right when template selected */}
      <TemplateFormSlideOut
        isOpen={isTemplateFormOpen}
        onClose={handleCloseTemplateForm}
        template={selectedTemplate}
        editor={editor}
        activeProject={activeProject}
      />
      
      {/* Brand Voice Slide-Out - Opens from right when brand voice tool clicked */}
      <BrandVoiceSlideOut
        isOpen={isBrandVoiceOpen}
        onClose={handleCloseBrandVoice}
      />
      
      {/* Personas Slide-Out - Opens from right when personas tool clicked */}
      <PersonasSlideOut
        isOpen={isPersonasOpen}
        onClose={handleClosePersonas}
      />
    </>
  );
}
