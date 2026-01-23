/**
 * @file components/splash/SplashPage.tsx
 * @description Entry splash page for CopyWorx v2
 * 
 * Features:
 * - Centered CopyWorx Studio logo
 * - Subtitle: "AI-Powered Writing Suite"
 * - Three action buttons in a row
 * - Apple-style aesthetic with blue accent
 * - Responsive (stacks on mobile)
 * - Footer with copyright
 * 
 * @example
 * ```tsx
 * <SplashPage />
 * ```
 */

'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FilePlus,
  Sparkles,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, useActiveProjectId } from '@/lib/stores/workspaceStore';
import { createDocument } from '@/lib/storage/unified-storage';
import { TemplatesModal } from '@/components/workspace/TemplatesModal';
import { getTemplateById } from '@/lib/data/templates';
import { logger } from '@/lib/utils/logger';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

/**
 * Action button for splash page with full text
 */
function ActionButton({ icon, label, description, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group',
        'flex flex-col items-center justify-center',
        'w-32 h-32',
        'bg-apple-blue hover:bg-[#7A3991]',
        'text-white',
        'rounded-xl',
        'shadow-md hover:shadow-xl',
        'transition-all duration-300',
        'transform hover:-translate-y-1',
        'focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:ring-offset-2'
      )}
    >
      {/* Icon */}
      <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      {/* Label */}
      <div className="text-sm font-semibold mb-1">
        {label}
      </div>

      {/* Description */}
      <div className="text-xs opacity-90 px-2 text-center leading-tight">
        {description}
      </div>
    </button>
  );
}

/**
 * Splash page component with action buttons
 */
export function SplashPage() {
  const router = useRouter();
  const activeProjectId = useActiveProjectId();
  
  // Templates modal state
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  
  // File input ref for importing documents
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewDocument = () => {
    if (!activeProjectId) {
      logger.warn('⚠️ No active project, going to workspace anyway');
      router.push('/copyworx/workspace?action=new');
      return;
    }
    
    try {
      // Create document in localStorage via document-storage
      const newDoc = createDocument(activeProjectId, 'Untitled Document');
      
      // Set active document ID in Zustand
      useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);
      
      logger.log('✅ Created new document:', newDoc.id);
      router.push('/copyworx/workspace?action=new');
    } catch (error) {
      logger.error('❌ Failed to create document:', error);
      // Still navigate to workspace
      router.push('/copyworx/workspace?action=new');
    }
  };

  const handleAITemplate = () => {
    logger.log('🎨 Opening Templates Modal from Splash Page');
    setTemplatesModalOpen(true);
  };

  /**
   * Handle template selection from modal
   * Creates document immediately and navigates to workspace
   */
  const handleTemplateSelect = (templateId: string) => {
    logger.log('🎨 Template selected from splash page:', templateId);
    
    // Get template details to use its name for the document
    const template = getTemplateById(templateId);
    if (!template) {
      logger.error('❌ Template not found:', templateId);
      return;
    }
    
    // Check for active project
    if (!activeProjectId) {
      logger.warn('⚠️ No active project, cannot create document');
      router.push('/copyworx/workspace?template=' + templateId);
      return;
    }
    
    try {
      // Create document immediately with template name
      const newDoc = createDocument(activeProjectId, template.name);
      logger.log('✅ Created document for template:', newDoc.id, newDoc.title);
      
      // Set as active document in store
      useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);
      
      // Navigate to workspace with both template and document IDs
      router.push(`/copyworx/workspace?template=${templateId}&document=${newDoc.id}`);
    } catch (error) {
      logger.error('❌ Failed to create document for template:', error);
      // Still navigate to workspace with just template ID
      router.push('/copyworx/workspace?template=' + templateId);
    }
  };

  /**
   * Handle import button click - opens file picker
   */
  const handleImport = () => {
    // Set accept attribute to allow common document formats
    if (fileInputRef.current) {
      fileInputRef.current.accept = '.docx,.txt,.md';
    }
    
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  /**
   * Handle file selection for import
   * Creates document and navigates to workspace with file stored temporarily
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeProjectId) {
      logger.warn('⚠️ No file selected or no active project');
      return;
    }

    try {
      // Extract filename without extension for document title
      const fileName = file.name;
      const lastDotIndex = fileName.lastIndexOf('.');
      const documentTitle = lastDotIndex === -1 
        ? fileName 
        : fileName.substring(0, lastDotIndex);

      // Create a new document for the import
      const newDoc = createDocument(activeProjectId, documentTitle);
      logger.log('✅ Created document for import:', newDoc.id, newDoc.title);

      // Set as active document
      useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);

      // Store file data in localStorage temporarily
      // We'll read it as ArrayBuffer for binary files (docx) or text for txt/md
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const result = e.target?.result;
          
          // Store file metadata and content
          localStorage.setItem('pendingFileImport', JSON.stringify({
            documentId: newDoc.id,
            fileName: file.name,
            fileType: file.type,
            timestamp: Date.now()
          }));

          // Store the actual file content separately
          // For text files, store as text; for binary (docx), store as base64
          if (file.name.endsWith('.docx')) {
            // Convert ArrayBuffer to base64
            const base64 = btoa(
              new Uint8Array(result as ArrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            localStorage.setItem('pendingFileContent', base64);
          } else {
            // Store text directly
            localStorage.setItem('pendingFileContent', result as string);
          }

          // Navigate to workspace
          router.push(`/copyworx/workspace?document=${newDoc.id}&import=true`);
        } catch (error) {
          logger.error('❌ Failed to store file:', error);
          // Navigate anyway, document is created
          router.push(`/copyworx/workspace?document=${newDoc.id}`);
        }
      };

      reader.onerror = () => {
        logger.error('❌ Failed to read file');
        // Still navigate, workspace can handle empty document
        router.push(`/copyworx/workspace?document=${newDoc.id}`);
      };

      // Read file appropriately based on type
      if (file.name.endsWith('.docx')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }

      // Clear the file input for next use
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      logger.error('❌ Failed to handle file import:', error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-apple-gray-bg flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Logo & Subtitle */}
        <div className="text-center mb-12 animate-fade-in">
          {/* CopyWorx Studio Logo */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/copyworx-studio-logo.png"
              alt="CopyWorx Studio"
              width={256}
              height={256}
              className="object-contain"
              priority
              unoptimized
            />
          </div>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-[#58595b] font-medium">
            AI-Powered Writing Suite
          </p>
        </div>

        {/* Action buttons */}
        <div
          className={cn(
            'flex flex-row items-center justify-center',
            'gap-6',
            'animate-fade-in-up'
          )}
        >
          <ActionButton
            icon={<FilePlus className="w-8 h-8" strokeWidth={1.5} />}
            label="New"
            description="Start fresh project"
            onClick={handleNewDocument}
          />

          <ActionButton
            icon={<Sparkles className="w-8 h-8" strokeWidth={1.5} />}
            label="AI@Worx™"
            description="Start from AI template"
            onClick={handleAITemplate}
          />

          <ActionButton
            icon={<Upload className="w-8 h-8" strokeWidth={1.5} />}
            label="Import"
            description="Open text file"
            onClick={handleImport}
          />
        </div>

        {/* Quick access hint */}
        <div className="mt-16 text-center text-sm text-gray-500 animate-fade-in animation-delay-300">
          <p>
            Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-xs">⌘</kbd> +{' '}
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm font-mono text-xs">N</kbd>{' '}
            for new document
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-500 border-t border-gray-200">
        <p>
          © 2026 CopyWorx™ Studio LLC. All rights reserved.
        </p>
        <p className="mt-1">
          CopyWorx™ and AI@Worx™ are trademarks of CopyWorx™ Studio LLC.
        </p>
      </footer>

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        onTemplateSelect={handleTemplateSelect}
      />

      {/* Hidden file input for importing documents */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.txt,.md"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}

