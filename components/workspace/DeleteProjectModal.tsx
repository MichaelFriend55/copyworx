/**
 * @file components/workspace/DeleteProjectModal.tsx
 * @description Confirmation modal for deleting a project
 * 
 * Features:
 * - Clear warning about permanent deletion
 * - Shows project name in confirmation message
 * - Destructive action styling (red Delete button)
 * - Prevents deletion while save operation is in progress
 * - ESC key to cancel, click outside to cancel
 * 
 * @example
 * ```tsx
 * <DeleteProjectModal
 *   isOpen={showDeleteModal}
 *   projectName="Marketing Campaign"
 *   onClose={() => setShowDeleteModal(false)}
 *   onConfirm={() => handleDeleteProject()}
 *   isDeleting={isDeleting}
 * />
 * ```
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// Types
// ============================================================================

export interface DeleteProjectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Name of the project being deleted */
  projectName: string;
  /** Callback when modal should close (cancel) */
  onClose: () => void;
  /** Callback when delete is confirmed */
  onConfirm: () => void;
  /** Whether deletion is in progress */
  isDeleting?: boolean;
  /** Whether a save operation is in progress (prevents deletion) */
  isSaving?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * DeleteProjectModal - Confirmation dialog for project deletion
 * 
 * Shows a clear warning about permanent deletion with the project name.
 * Uses portal to render above all other content.
 */
export function DeleteProjectModal({
  isOpen,
  projectName,
  onClose,
  onConfirm,
  isDeleting = false,
  isSaving = false,
}: DeleteProjectModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Handle mount state for SSR compatibility
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen && !isDeleting) {
      onClose();
    }
  }, [isOpen, isDeleting, onClose]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);
  
  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  }, [isDeleting, onClose]);
  
  // Don't render on server or when not mounted/closed
  if (!isMounted || !isOpen) {
    return null;
  }
  
  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className={cn(
          'relative bg-white rounded-xl shadow-2xl',
          'w-full max-w-md mx-4',
          'transform transition-all duration-200',
          'animate-in fade-in-0 zoom-in-95'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 
              id="delete-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Delete Project
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className={cn(
              'p-2 rounded-lg text-gray-400',
              'hover:text-gray-600 hover:bg-gray-100',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-gray-700 mb-2">
            Delete <span className="font-semibold text-gray-900">"{projectName}"</span>?
          </p>
          <p className="text-sm text-gray-500 mb-6">
            This will permanently delete this project and all its documents. 
            This cannot be undone.
          </p>
          
          {/* Save in progress warning */}
          {isSaving && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Please wait for the save operation to complete before deleting.
              </p>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isDeleting || isSaving}
              className={cn(
                'px-4 bg-red-600 hover:bg-red-700 text-white',
                'focus:ring-red-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  
  return createPortal(modalContent, document.body);
}

export default DeleteProjectModal;
