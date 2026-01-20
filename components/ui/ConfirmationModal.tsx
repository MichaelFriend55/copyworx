/**
 * @file components/ui/ConfirmationModal.tsx
 * @description Reusable confirmation modal for destructive actions
 * 
 * Features:
 * - Clear warning message
 * - Customizable title and content
 * - Destructive action styling (red button)
 * - ESC key to cancel, click outside to cancel
 * - Loading state support
 * 
 * @example
 * ```tsx
 * <ConfirmationModal
 *   isOpen={showModal}
 *   title="Delete Item"
 *   message="Delete 'Item Name'?"
 *   description="This will permanently remove this item. This cannot be undone."
 *   confirmLabel="Delete Item"
 *   onClose={() => setShowModal(false)}
 *   onConfirm={() => handleDelete()}
 *   isConfirming={isDeleting}
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

export interface ConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Main message (can include item name) */
  message: string;
  /** Additional description/warning */
  description?: string;
  /** Label for confirm button */
  confirmLabel?: string;
  /** Label for cancel button */
  cancelLabel?: string;
  /** Callback when modal should close (cancel) */
  onClose: () => void;
  /** Callback when action is confirmed */
  onConfirm: () => void;
  /** Whether confirmation action is in progress */
  isConfirming?: boolean;
  /** Icon to show (defaults to AlertTriangle) */
  icon?: React.ReactNode;
  /** Whether this is a destructive action (red button) */
  isDestructive?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ConfirmationModal - Reusable confirmation dialog for important actions
 * 
 * Shows a clear warning with customizable message.
 * Uses portal to render above all other content.
 */
export function ConfirmationModal({
  isOpen,
  title,
  message,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
  isConfirming = false,
  icon,
  isDestructive = true,
}: ConfirmationModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  // Handle mount state for SSR compatibility
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen && !isConfirming) {
      onClose();
    }
  }, [isOpen, isConfirming, onClose]);
  
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
    if (e.target === e.currentTarget && !isConfirming) {
      onClose();
    }
  }, [isConfirming, onClose]);
  
  // Don't render on server or when not mounted/closed
  if (!isMounted || !isOpen) {
    return null;
  }
  
  const defaultIcon = (
    <div className={cn(
      'p-2 rounded-lg',
      isDestructive ? 'bg-red-100' : 'bg-yellow-100'
    )}>
      <AlertTriangle className={cn(
        'h-5 w-5',
        isDestructive ? 'text-red-600' : 'text-yellow-600'
      )} />
    </div>
  );
  
  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
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
            {icon || defaultIcon}
            <h2 
              id="confirmation-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isConfirming}
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
            {message}
          </p>
          {description && (
            <p className="text-sm text-gray-500 mb-6">
              {description}
            </p>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConfirming}
              className="px-4"
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isConfirming}
              className={cn(
                'px-4',
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : 'bg-apple-blue hover:bg-apple-blue/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  
  return createPortal(modalContent, document.body);
}

export default ConfirmationModal;
