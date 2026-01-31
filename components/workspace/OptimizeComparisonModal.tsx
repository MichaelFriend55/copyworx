/**
 * @file components/workspace/OptimizeComparisonModal.tsx
 * @description Side-by-side comparison modal for alignment optimization results
 * 
 * Shows original vs optimized copy with:
 * - Side-by-side comparison view
 * - Changes summary
 * - Accept/Reject/Edit options
 * - Character count comparison
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  XCircle, 
  Edit3, 
  ArrowRight,
  FileText,
  Sparkles,
  AlertTriangle,
  Copy as CopyIcon
} from 'lucide-react';
import { 
  useOptimizeAlignmentResult,
  useOptimizeAlignmentChangesSummary,
  useOptimizeAlignmentLoading,
  useOptimizeAlignmentError,
  useOptimizeAlignmentTargetName,
  useOptimizeAlignmentType,
  useOptimizeAlignmentOriginalText,
  useOptimizeAlignmentModalOpen,
  useOptimizeAlignmentActions,
} from '@/lib/stores/workspaceStore';
import { AIWorxLoader } from '@/components/ui/AIWorxLoader';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';
import { createDocumentVersion } from '@/lib/storage/unified-storage';
import { toast } from 'sonner';

interface OptimizeComparisonModalProps {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Active project ID for versioning */
  projectId: string | null;
  /** Active document ID for versioning */
  documentId: string | null;
}

/**
 * Calculate word count from text/HTML
 */
function getWordCount(content: string): number {
  if (!content) return 0;
  const textOnly = content.replace(/<[^>]*>/g, ' ');
  const words = textOnly.split(/\s+/).filter(word => word.trim().length > 0);
  return words.length;
}

/**
 * Calculate character count from text/HTML
 */
function getCharCount(content: string): number {
  if (!content) return 0;
  const textOnly = content.replace(/<[^>]*>/g, '');
  return textOnly.length;
}

/**
 * OptimizeComparisonModal component
 */
export function OptimizeComparisonModal({ 
  editor, 
  projectId,
  documentId 
}: OptimizeComparisonModalProps) {
  // State from store
  const result = useOptimizeAlignmentResult();
  const changesSummary = useOptimizeAlignmentChangesSummary();
  const loading = useOptimizeAlignmentLoading();
  const error = useOptimizeAlignmentError();
  const targetName = useOptimizeAlignmentTargetName();
  const type = useOptimizeAlignmentType();
  const originalText = useOptimizeAlignmentOriginalText();
  const modalOpen = useOptimizeAlignmentModalOpen();
  const { clearOptimizeAlignmentResult, setOptimizeAlignmentModalOpen, acceptOptimizeResult } = useOptimizeAlignmentActions();

  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedResult, setEditedResult] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Update edited result when result changes
  useEffect(() => {
    if (result) {
      setEditedResult(result);
    }
  }, [result]);

  // Don't render if not open
  if (!modalOpen && !loading) {
    return null;
  }

  // Calculate stats
  const originalWordCount = originalText ? getWordCount(originalText) : 0;
  const originalCharCount = originalText ? getCharCount(originalText) : 0;
  const newWordCount = editedResult ? getWordCount(editedResult) : (result ? getWordCount(result) : 0);
  const newCharCount = editedResult ? getCharCount(editedResult) : (result ? getCharCount(result) : 0);
  const charDiff = newCharCount - originalCharCount;
  const charDiffPercent = originalCharCount > 0 ? Math.round((charDiff / originalCharCount) * 100) : 0;

  /**
   * Handle accepting the optimized result
   */
  const handleAccept = async () => {
    if (!editor) return;

    // Save current version before replacing (if we have project/document context)
    if (projectId && documentId) {
      setIsSavingVersion(true);
      try {
        // Get current editor content
        const currentContent = editor.getHTML();
        
        // Create a new version with the current content before replacing
        await createDocumentVersion(projectId, documentId, currentContent);
        logger.log('✅ Document version saved before optimization');
        toast.success('Original version saved to history');
      } catch (err) {
        logger.error('❌ Failed to save document version:', err);
        toast.error('Could not save original version, but proceeding with replacement');
      } finally {
        setIsSavingVersion(false);
      }
    }

    // Use the edited result if user was editing, otherwise use the original result
    const contentToInsert = isEditing ? editedResult : result;
    
    if (contentToInsert) {
      // Update store result if edited
      if (isEditing && editedResult !== result) {
        // We need to manually insert since store has original
        const { insertTextAtSelection } = await import('@/lib/editor-utils');
        const success = insertTextAtSelection(editor, editedResult, { isHTML: true });
        if (success) {
          clearOptimizeAlignmentResult();
          toast.success('Optimized copy accepted');
        }
      } else {
        acceptOptimizeResult(editor);
        toast.success('Optimized copy accepted');
      }
    }
  };

  /**
   * Handle rejecting the result
   */
  const handleReject = () => {
    clearOptimizeAlignmentResult();
    setIsEditing(false);
    setEditedResult('');
    toast.info('Kept original copy');
  };

  /**
   * Handle closing the modal
   */
  const handleClose = () => {
    setOptimizeAlignmentModalOpen(false);
    setIsEditing(false);
  };

  /**
   * Handle copy to clipboard
   */
  const handleCopy = async (content: string) => {
    try {
      // Copy plain text version
      const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      await navigator.clipboard.writeText(textContent);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Show loading state as overlay
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4">
          <div className="flex flex-col items-center gap-4">
            <AIWorxLoader message="Optimizing with AI@Worx™" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-apple-text-dark">
                Optimizing for {targetName || (type === 'persona' ? 'Persona' : 'Brand')}
              </h3>
              <p className="text-sm text-apple-text-light mt-1">
                Rewriting copy to fix alignment issues...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md mx-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Optimization Failed
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={handleReject}
              className="w-full py-2 px-4 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if no result
  if (!result || !originalText) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-lg font-semibold text-apple-text-dark">
                Optimized for {targetName}
              </h2>
              <p className="text-xs text-apple-text-light">
                {type === 'persona' ? 'Persona' : 'Brand'} alignment optimization complete
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Changes Summary */}
        {changesSummary.length > 0 && (
          <div className="px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <div className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium text-green-900">What Changed:</span>
                <ul className="mt-1 space-y-0.5">
                  {changesSummary.map((change, index) => (
                    <li key={index} className="text-sm text-green-700">• {change}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Length Warning */}
        {charDiff > 0 && charDiffPercent > 20 && (
          <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              Note: Optimized copy is {charDiffPercent}% longer ({charDiff} characters more)
            </p>
          </div>
        )}

        {/* Comparison Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Original Side */}
          <div className="w-1/2 flex flex-col border-r border-gray-200">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Original</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{originalWordCount} words</span>
                <span className="text-xs text-gray-500">{originalCharCount} chars</span>
                <button
                  onClick={() => handleCopy(originalText)}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  title="Copy original"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div 
                className="prose prose-sm max-w-none text-apple-text-dark"
                dangerouslySetInnerHTML={{ __html: originalText }}
              />
            </div>
          </div>

          {/* Optimized Side */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-2 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">
                  Optimized for {targetName}
                </span>
                {isEditing && (
                  <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                    Editing
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-purple-600">{newWordCount} words</span>
                <span className={cn(
                  "text-xs",
                  charDiff > 0 ? "text-yellow-600" : charDiff < 0 ? "text-green-600" : "text-purple-600"
                )}>
                  {newCharCount} chars
                  {charDiff !== 0 && (
                    <span className="ml-1">
                      ({charDiff > 0 ? '+' : ''}{charDiff})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handleCopy(isEditing ? editedResult : result)}
                  className="p-1 rounded hover:bg-purple-100 transition-colors"
                  title="Copy optimized"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-purple-600" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isEditing ? (
                <textarea
                  value={editedResult}
                  onChange={(e) => setEditedResult(e.target.value)}
                  className="w-full h-full min-h-[200px] p-3 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Edit the optimized copy..."
                />
              ) : (
                <div 
                  className="prose prose-sm max-w-none text-apple-text-dark"
                  dangerouslySetInnerHTML={{ __html: result }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                'flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                isEditing 
                  ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              )}
            >
              <Edit3 className="w-4 h-4" />
              {isEditing ? 'Preview' : 'Edit Before Accepting'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReject}
              className="flex items-center gap-2 py-2 px-4 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Keep Original
            </button>
            <button
              onClick={handleAccept}
              disabled={isSavingVersion}
              className={cn(
                'flex items-center gap-2 py-2 px-5 rounded-lg text-sm font-medium transition-all',
                'bg-gradient-to-r from-green-600 to-emerald-600 text-white',
                'hover:from-green-700 hover:to-emerald-700',
                'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                'shadow-sm hover:shadow',
                isSavingVersion && 'opacity-50 cursor-wait'
              )}
            >
              <Check className="w-4 h-4" />
              {isSavingVersion ? 'Saving Version...' : 'Accept Rewrite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
