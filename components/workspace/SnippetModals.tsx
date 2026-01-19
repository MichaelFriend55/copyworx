/**
 * @file components/workspace/SnippetModals.tsx
 * @description Modal components for creating and editing snippets
 * 
 * Components:
 * - AddSnippetModal: Modal for creating new snippets
 * - EditSnippetModal: Modal for editing existing snippets
 * - SaveAsSnippetModal: Modal for saving selected text as a new snippet
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Scissors, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Snippet, CreateSnippetInput } from '@/lib/types/snippet';
import {
  useSnippetStore,
  useAddSnippetModalOpen,
  useEditSnippetModal,
  useSaveAsSnippetModal,
  useSnippetActions,
  useSnippetError,
  useSnippetLoading,
} from '@/lib/stores/snippetStore';

// ============================================================================
// Types
// ============================================================================

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

interface SnippetFormProps {
  initialName?: string;
  initialContent?: string;
  initialDescription?: string;
  onSubmit: (input: CreateSnippetInput) => void;
  submitLabel: string;
  isLoading?: boolean;
  error?: string | null;
}

// ============================================================================
// Modal Base Component
// ============================================================================

function ModalBase({ isOpen, onClose, title, children }: ModalBaseProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Handle mount state for SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);
  
  if (!isMounted || !isOpen) return null;
  
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" />
      
      {/* Modal */}
      <div
        className={cn(
          'relative bg-white rounded-xl shadow-2xl',
          'w-full max-w-lg mx-4',
          'transform transition-all duration-200',
          'animate-in fade-in-0 zoom-in-95'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Scissors className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg text-gray-400',
              'hover:text-gray-600 hover:bg-gray-100',
              'transition-colors'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================================
// Snippet Form Component
// ============================================================================

function SnippetForm({
  initialName = '',
  initialContent = '',
  initialDescription = '',
  onSubmit,
  submitLabel,
  isLoading = false,
  error = null,
}: SnippetFormProps) {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState(initialContent);
  const [description, setDescription] = useState(initialDescription);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Reset form when initial values change
  useEffect(() => {
    setName(initialName);
    setContent(initialContent);
    setDescription(initialDescription);
  }, [initialName, initialContent, initialDescription]);
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!name.trim()) {
      setValidationError('Snippet name is required');
      return;
    }
    
    if (!content.trim()) {
      setValidationError('Snippet content is required');
      return;
    }
    
    setValidationError(null);
    
    onSubmit({
      name: name.trim(),
      content: content.trim(),
      description: description.trim() || undefined,
    });
  }, [name, content, description, onSubmit]);
  
  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error display */}
      {displayError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
      
      {/* Name field */}
      <div>
        <label htmlFor="snippet-name" className="block text-sm font-medium text-gray-700 mb-1.5">
          Snippet Name <span className="text-red-500">*</span>
        </label>
        <Input
          id="snippet-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Hero CTA, Email Sign-off"
          className="w-full"
          autoFocus
          maxLength={100}
        />
        <p className="mt-1 text-xs text-gray-400">
          A short, memorable name for this snippet
        </p>
      </div>
      
      {/* Content field */}
      <div>
        <label htmlFor="snippet-content" className="block text-sm font-medium text-gray-700 mb-1.5">
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          id="snippet-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter the reusable copy text..."
          className={cn(
            'w-full min-h-[120px] px-3 py-2 text-sm',
            'border border-gray-300 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
            'placeholder:text-gray-400 resize-y'
          )}
          maxLength={50000}
        />
        <p className="mt-1 text-xs text-gray-400">
          The actual copy text that will be inserted
        </p>
      </div>
      
      {/* Description field (optional) */}
      <div>
        <label htmlFor="snippet-description" className="block text-sm font-medium text-gray-700 mb-1.5">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <Input
          id="snippet-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="When to use this snippet..."
          className="w-full"
          maxLength={200}
        />
      </div>
      
      {/* Submit button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Add Snippet Modal
// ============================================================================

export function AddSnippetModal() {
  const isOpen = useAddSnippetModalOpen();
  const isLoading = useSnippetLoading();
  const error = useSnippetError();
  const { createSnippet, closeAddModal, clearError } = useSnippetActions();
  
  // Handle close
  const handleClose = useCallback(() => {
    clearError();
    closeAddModal();
  }, [clearError, closeAddModal]);
  
  // Handle submit
  const handleSubmit = useCallback(async (input: CreateSnippetInput) => {
    await createSnippet(input);
  }, [createSnippet]);
  
  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Snippet"
    >
      <SnippetForm
        onSubmit={handleSubmit}
        submitLabel="Add Snippet"
        isLoading={isLoading}
        error={error}
      />
    </ModalBase>
  );
}

// ============================================================================
// Edit Snippet Modal
// ============================================================================

export function EditSnippetModal() {
  const { isOpen, snippet } = useEditSnippetModal();
  const isLoading = useSnippetLoading();
  const error = useSnippetError();
  const { updateSnippet, closeEditModal, clearError } = useSnippetActions();
  
  // Handle close
  const handleClose = useCallback(() => {
    clearError();
    closeEditModal();
  }, [clearError, closeEditModal]);
  
  // Handle submit
  const handleSubmit = useCallback(async (input: CreateSnippetInput) => {
    if (!snippet) return;
    
    await updateSnippet(snippet.id, {
      name: input.name,
      content: input.content,
      description: input.description,
    });
  }, [snippet, updateSnippet]);
  
  if (!snippet) return null;
  
  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Snippet"
    >
      <SnippetForm
        initialName={snippet.name}
        initialContent={snippet.content}
        initialDescription={snippet.description || ''}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        isLoading={isLoading}
        error={error}
      />
    </ModalBase>
  );
}

// ============================================================================
// Save As Snippet Modal
// ============================================================================

export function SaveAsSnippetModal() {
  const { isOpen, selectedText } = useSaveAsSnippetModal();
  const isLoading = useSnippetLoading();
  const error = useSnippetError();
  const { createSnippet, closeSaveAsSnippet, clearError } = useSnippetActions();
  
  // Handle close
  const handleClose = useCallback(() => {
    clearError();
    closeSaveAsSnippet();
  }, [clearError, closeSaveAsSnippet]);
  
  // Handle submit
  const handleSubmit = useCallback(async (input: CreateSnippetInput) => {
    await createSnippet(input);
  }, [createSnippet]);
  
  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      title="Save as Snippet"
    >
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 mb-1">Selected text:</p>
        <p className="text-sm text-gray-700 max-h-20 overflow-y-auto">
          {selectedText ? (
            selectedText.length > 200 
              ? selectedText.substring(0, 200) + '...' 
              : selectedText
          ) : (
            <span className="text-gray-400 italic">No text selected</span>
          )}
        </p>
      </div>
      
      <SnippetForm
        initialContent={selectedText}
        onSubmit={handleSubmit}
        submitLabel="Save Snippet"
        isLoading={isLoading}
        error={error}
      />
    </ModalBase>
  );
}

// ============================================================================
// Combined Export for Convenience
// ============================================================================

export function SnippetModals() {
  return (
    <>
      <AddSnippetModal />
      <EditSnippetModal />
      <SaveAsSnippetModal />
    </>
  );
}

export default SnippetModals;
