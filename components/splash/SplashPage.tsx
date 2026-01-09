/**
 * @file components/splash/SplashPage.tsx
 * @description Entry splash page for CopyWorx v2
 * 
 * Features:
 * - Centered logo and title "CopyWorx™ Studio"
 * - Subtitle: "AI-Powered Writing Suite"
 * - Four large action buttons in a row
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
import {
  FilePlus,
  Sparkles,
  Upload,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentActions } from '@/lib/stores/workspaceStore';
import { TemplatesModal } from '@/components/workspace/TemplatesModal';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

/**
 * Large action button for splash page
 */
function ActionButton({ icon, label, description, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group',
        'flex flex-col items-center justify-center',
        'w-full sm:w-64 h-64',
        'bg-apple-blue hover:bg-apple-blue-dark',
        'text-white',
        'rounded-2xl',
        'shadow-lg hover:shadow-2xl',
        'transition-all duration-300',
        'transform hover:-translate-y-2',
        'focus:outline-none focus:ring-4 focus:ring-apple-blue/30 focus:ring-offset-4'
      )}
    >
      {/* Icon */}
      <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      {/* Label */}
      <div className="text-2xl font-semibold mb-2">
        {label}
      </div>

      {/* Description */}
      <div className="text-sm opacity-90 px-4 text-center">
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
  const { createDocument } = useDocumentActions();
  
  // Templates modal state
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  const handleNewDocument = () => {
    createDocument('Untitled Document');
    router.push('/copyworx/workspace?action=new');
  };

  const handleAITemplate = () => {
    console.log('🎨 Opening Templates Modal from Splash Page');
    setTemplatesModalOpen(true);
  };

  const handleImport = () => {
    router.push('/copyworx/workspace?action=import');
  };

  const handleOpenCWX = () => {
    router.push('/copyworx/workspace?action=open');
  };

  return (
    <div className="min-h-screen w-full bg-apple-gray-bg flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Logo placeholder & Title */}
        <div className="text-center mb-16 animate-fade-in">
          {/* Logo placeholder - you can replace with actual logo */}
          <div className="mb-6 flex justify-center">
            <div
              className={cn(
                'w-24 h-24 rounded-3xl',
                'bg-gradient-to-br from-apple-blue to-apple-blue-dark',
                'flex items-center justify-center',
                'shadow-2xl'
              )}
            >
              <Sparkles className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl font-sans font-bold text-apple-text-dark mb-4">
            CopyWorx™ Studio
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-600 font-medium">
            AI-Powered Writing Suite
          </p>
        </div>

        {/* Action buttons */}
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
            'gap-6 max-w-7xl w-full',
            'animate-fade-in-up'
          )}
        >
          <ActionButton
            icon={<FilePlus className="w-16 h-16" strokeWidth={1.5} />}
            label="New"
            description="Start fresh project"
            onClick={handleNewDocument}
          />

          <ActionButton
            icon={<Sparkles className="w-16 h-16" strokeWidth={1.5} />}
            label="AI@Worx™"
            description="Start from AI template"
            onClick={handleAITemplate}
          />

          <ActionButton
            icon={<Upload className="w-16 h-16" strokeWidth={1.5} />}
            label="Import"
            description="Open text file"
            onClick={handleImport}
          />

          <ActionButton
            icon={<FolderOpen className="w-16 h-16" strokeWidth={1.5} />}
            label="Open .cwx"
            description="CopyWorx format"
            onClick={handleOpenCWX}
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
          CopyWorx™ and AI@Worx™ are trademarks of CopyWorx Corporation.
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

