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

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FilePlus,
  Sparkles,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, useActiveProjectId } from '@/lib/stores/workspaceStore';
import { createDocument } from '@/lib/storage/document-storage';
import { TemplatesModal } from '@/components/workspace/TemplatesModal';

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

  const handleNewDocument = () => {
    if (!activeProjectId) {
      console.warn('⚠️ No active project, going to workspace anyway');
      router.push('/copyworx/workspace?action=new');
      return;
    }
    
    try {
      // Create document in localStorage via document-storage
      const newDoc = createDocument(activeProjectId, 'Untitled Document');
      
      // Set active document ID in Zustand
      useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);
      
      console.log('✅ Created new document:', newDoc.id);
      router.push('/copyworx/workspace?action=new');
    } catch (error) {
      console.error('❌ Failed to create document:', error);
      // Still navigate to workspace
      router.push('/copyworx/workspace?action=new');
    }
  };

  const handleAITemplate = () => {
    console.log('🎨 Opening Templates Modal from Splash Page');
    setTemplatesModalOpen(true);
  };

  const handleImport = () => {
    router.push('/copyworx/workspace?action=import');
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
          © {new Date().getFullYear()} CopyWorx™ Studio. All rights reserved.
        </p>
        <p className="mt-1">
          CopyWorx™ and AI@Worx™ are trademarks of CopyWorx Studio LLC.
        </p>
      </footer>

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
      />
    </div>
  );
}

