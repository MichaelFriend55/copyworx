/**
 * @file app/worxspace/page.tsx
 * @description Main workspace page with document version control
 * Route: /worxspace
 * 
 * Features:
 * - Document list with version grouping
 * - Editor with save/save-as-new-version
 * - Project switching
 * - AI tools
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
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
import { createDocument, getDocument } from '@/lib/storage/unified-storage';
import { useProductTour } from '@/lib/hooks/useProductTour';
import { logger } from '@/lib/utils/logger';
import type { Editor } from '@tiptap/react';
import type { ProjectDocument, Project } from '@/lib/types/project';

// Dynamic import for ProductTour to avoid SSR issues with react-joyride
const ProductTour = dynamic(() => import('@/components/ProductTour'), {
  ssr: false,
});

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
  const templateParam = searchParams.get('template');
  const documentParam = searchParams.get('document');
  const importParam = searchParams.get('import');
  
  // Client-side mounting state
  const [mounted, setMounted] = useState(false);
  
  // Editor instance state
  const [editor, setEditor] = useState<Editor | null>(null);
  
  // Ref for EditorArea to call loadDocument
  const editorRef = useRef<EditorAreaHandle>(null);
  
  // Prevent double initialization in StrictMode
  const initRef = useRef(false);
  
  // Product tour state
  const { runTour, completeTour, restartTour } = useProductTour();
  
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
    
    logger.log('🚀 Initializing workspace...');
    
    // Initialize project system
    initializeProjectSystem();
    
    // Refresh projects into store
    const store = useWorkspaceStore.getState();
    store.refreshProjects();
    
    // Note: Documents are created via DocumentList, not automatically here
    // The activeDocumentId will be restored from Zustand persistence if it exists
    logger.log('✅ Workspace initialized');
  }, [mounted, action]);
  
  // Handle template parameter from URL (coming from splash page)
  useEffect(() => {
    if (!mounted || !templateParam) return;
    
    logger.log('🎨 Template parameter detected:', templateParam);
    logger.log('📄 Document parameter:', documentParam);
    
    // Get store state
    const store = useWorkspaceStore.getState();
    
    // Check if we have an active project
    if (!store.activeProjectId) {
      logger.error('❌ No active project found');
      return;
    }
    
    const handleTemplateParam = async () => {
      // If document parameter exists, load that existing document
      if (documentParam) {
        try {
          const existingDoc = await getDocument(store.activeProjectId!, documentParam);
          
          if (existingDoc) {
            // Set as active document
            store.setActiveDocumentId(existingDoc.id);
            logger.log('✅ Loading existing document from splash page:', existingDoc.id, existingDoc.title);
            
            // Load the document into the editor
            if (editorRef.current) {
              editorRef.current.loadDocument(existingDoc);
            }
          } else {
            logger.error('❌ Document not found:', documentParam);
          }
        } catch (error) {
          logger.error('❌ Failed to load document:', error);
        }
      }
      // Fallback: create new document if no document parameter provided
      else if (!store.activeDocumentId) {
        try {
          const template = getTemplateById(templateParam);
          if (!template) {
            logger.error('❌ Template not found:', templateParam);
            return;
          }
          
          const newDoc = await createDocument(store.activeProjectId!, `${template.name}`);
          store.setActiveDocumentId(newDoc.id);
          logger.log('✅ Created new document for template:', newDoc.id, newDoc.title);
          
          // Load the document into the editor
          if (editorRef.current) {
            editorRef.current.loadDocument(newDoc);
          }
        } catch (error) {
          logger.error('❌ Failed to create document for template:', error);
        }
      }
      
      // Set the template if not already set
      if (!store.selectedTemplateId) {
        store.setSelectedTemplateId(templateParam);
      }
      
      // Ensure right sidebar is open
      if (!store.rightSidebarOpen) {
        store.setRightSidebarOpen(true);
      }
      
      logger.log('✅ Template slideout should be visible');
    };
    
    handleTemplateParam();
  }, [mounted, templateParam, documentParam]);
  
  // Handle file import from splash page
  useEffect(() => {
    if (!mounted || !importParam || !editor) return;
    
    logger.log('📥 Import parameter detected, checking for pending file...');
    
    // Check for pending file import in localStorage
    const pendingImportStr = localStorage.getItem('pendingFileImport');
    const pendingContent = localStorage.getItem('pendingFileContent');
    
    if (!pendingImportStr || !pendingContent) {
      logger.warn('⚠️ No pending import found');
      return;
    }
    
    try {
      const importData = JSON.parse(pendingImportStr);
      const { fileName, fileType, documentId } = importData;
      
      logger.log('📥 Processing import:', fileName);
      
      // Process the import based on file type
      const processImport = async () => {
        try {
          if (fileName.endsWith('.docx')) {
            // Decode base64 back to binary
            const binaryString = atob(pendingContent);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const file = new File([blob], fileName, { type: fileType });
            
            // Import using the document-import utility
            const { importDocument } = await import('@/lib/utils/document-import');
            const result = await importDocument(editor, file);
            
            if (result.success) {
              logger.log('✅ Successfully imported DOCX file');
            } else {
              logger.error('❌ Failed to import DOCX:', result.error);
            }
          } else {
            // For text files (txt, md), just set the content directly
            editor.commands.setContent(pendingContent);
            logger.log('✅ Successfully imported text file');
          }
          
          // Clear the pending import data
          localStorage.removeItem('pendingFileImport');
          localStorage.removeItem('pendingFileContent');
          
        } catch (error) {
          logger.error('❌ Error processing import:', error);
          // Clear the data anyway to prevent retry loop
          localStorage.removeItem('pendingFileImport');
          localStorage.removeItem('pendingFileContent');
        }
      };
      
      // Execute the import
      processImport();
      
    } catch (error) {
      logger.error('❌ Error parsing pending import:', error);
      // Clear corrupted data
      localStorage.removeItem('pendingFileImport');
      localStorage.removeItem('pendingFileContent');
    }
  }, [mounted, importParam, editor]);
  
  // Handle editor ready
  const handleEditorReady = React.useCallback((editorInstance: Editor | null) => {
    setEditor(editorInstance);
  }, []);
  
  /**
   * Handle document click from DocumentList
   * Loads the selected document into the editor
   */
  const handleDocumentClick = useCallback((doc: ProjectDocument) => {
    logger.log('📄 Document clicked in workspace:', {
      id: doc.id,
      title: doc.title,
      version: doc.version,
    });
    
    if (editorRef.current) {
      editorRef.current.loadDocument(doc);
    } else {
      logger.warn('⚠️ Editor ref not ready, cannot load document');
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
        onRestartTour={restartTour}
      >
        <EditorArea ref={editorRef} onEditorReady={handleEditorReady} />
      </WorkspaceLayout>
      
      {/* Template Form Slide-Out - Opens from right when template selected */}
      {/* Only render for non-multi-section templates - multi-section templates use RightSidebarContent */}
      {selectedTemplate && selectedTemplate.id !== 'brochure-multi-section' && (
        <TemplateFormSlideOut
          isOpen={isTemplateFormOpen}
          onClose={handleCloseTemplateForm}
          template={selectedTemplate}
          editor={editor}
          activeProject={activeProject}
        />
      )}
      
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
      
      {/* Product Tour - Shows on first visit */}
      <ProductTour run={runTour} onComplete={completeTour} />
    </>
  );
}
