/**
 * @file components/workspace/snippets/SaveSnippetModal.tsx
 * @description Modal for saving selected text as a snippet
 * 
 * Features:
 * - Auto-fills name from first 50 chars of selection
 * - Description field (optional)
 * - Preview of selected content
 * - Shows which project snippet will be saved to
 * - Preserves HTML formatting from TipTap
 */

'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { X, Paperclip, AlertCircle, FileText } from 'lucide-react';
import { useWorkspaceStore, useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils';

/**
 * Props for SaveSnippetModal
 */
interface SaveSnippetModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The selected HTML content to save */
  selectedContent: string;
  /** The plain text version of the selection */
  selectedText: string;
  /** Optional callback when snippet is saved */
  onSaved?: () => void;
}

/**
 * Strip HTML tags and return plain text
 */
function stripHtml(html: string): string {
  const div = typeof document !== 'undefined' 
    ? document.createElement('div') 
    : null;
  
  if (div) {
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
  
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Generate default name from content
 */
function generateDefaultName(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  
  // Try to cut at a word boundary
  const truncated = cleaned.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 30) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * SaveSnippetModal - Modal for saving selected text as a snippet
 */
export function SaveSnippetModal({ 
  isOpen, 
  onClose, 
  selectedContent,
  selectedText,
  onSaved 
}: SaveSnippetModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const createSnippet = useWorkspaceStore((state) => state.createSnippet);
  
  // Get active project name
  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectName = activeProject?.name || 'Unknown Project';
  
  // Generate preview text
  const previewText = useMemo(() => {
    const plain = selectedText || stripHtml(selectedContent);
    const cleaned = plain.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 200) return cleaned;
    return cleaned.substring(0, 200) + '...';
  }, [selectedContent, selectedText]);
  
  // Auto-fill name when modal opens
  useEffect(() => {
    if (isOpen) {
      const plain = selectedText || stripHtml(selectedContent);
      const defaultName = generateDefaultName(plain);
      setName(defaultName);
      
      // Focus name input after a short delay
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, selectedContent, selectedText]);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);
  
  const handleSave = useCallback(async () => {
    setError(null);
    
    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      nameInputRef.current?.focus();
      return;
    }
    
    if (trimmedName.length > 100) {
      setError('Name must be 100 characters or less');
      return;
    }
    
    // Validate description
    if (description.length > 200) {
      setError('Description must be 200 characters or less');
      return;
    }
    
    // Validate content
    if (!selectedContent.trim()) {
      setError('No content to save');
      return;
    }
    
    if (selectedContent.length > 10000) {
      setError('Selection is too long (max 10,000 characters)');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const snippet = createSnippet(
        trimmedName,
        selectedContent,
        description.trim() || undefined
      );
      
      if (snippet) {
        console.log('✅ Snippet saved:', snippet.name);
        onSaved?.();
        onClose();
      } else {
        setError('Failed to save snippet. Please try again.');
      }
    } catch (err) {
      console.error('❌ Failed to save snippet:', err);
      setError(err instanceof Error ? err.message : 'Failed to save snippet');
    } finally {
      setIsSaving(false);
    }
  }, [name, description, selectedContent, createSnippet, onSaved, onClose]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  }, [onClose, handleSave]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-lg mx-4',
        'bg-background rounded-xl shadow-2xl',
        'animate-in fade-in-0 zoom-in-95 duration-200'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Save as Snippet
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter snippet name"
              maxLength={100}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg',
                'bg-muted/50 border border-border',
                'focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary',
                'placeholder:text-muted-foreground/60',
                'transition-colors duration-150'
              )}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {name.length}/100 characters
            </p>
          </div>
          
          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., tagline, legal, boilerplate"
              maxLength={200}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-lg',
                'bg-muted/50 border border-border',
                'focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary',
                'placeholder:text-muted-foreground/60',
                'transition-colors duration-150'
              )}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {description.length}/200 characters
            </p>
          </div>
          
          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Preview
            </label>
            <div className={cn(
              'px-3 py-2 rounded-lg',
              'bg-muted/30 border border-border',
              'max-h-[120px] overflow-y-auto'
            )}>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground/80 italic">
                  "{previewText}"
                </p>
              </div>
            </div>
          </div>
          
          {/* Project Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
            Will be saved to: <span className="font-medium text-foreground">{projectName}</span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isSaving}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-accent transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              'bg-amber-500 text-white',
              'hover:bg-amber-600 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            )}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Snippet'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
