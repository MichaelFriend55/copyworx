/**
 * @file components/workspace/snippets/EditSnippetModal.tsx
 * @description Modal for editing existing snippets
 * 
 * Features:
 * - Pre-filled name, description, and content
 * - Rich text content editor (TipTap lite)
 * - Validation and error handling
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Paperclip, AlertCircle } from 'lucide-react';
import { useWorkspaceStore, useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import type { Snippet } from '@/lib/types/project';

/**
 * Props for EditSnippetModal
 */
interface EditSnippetModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The snippet to edit */
  snippet: Snippet | null;
  /** Optional callback when snippet is updated */
  onUpdated?: () => void;
}

/**
 * EditSnippetModal - Modal for editing existing snippets
 */
export function EditSnippetModal({ 
  isOpen, 
  onClose, 
  snippet,
  onUpdated 
}: EditSnippetModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const updateSnippet = useWorkspaceStore((state) => state.updateSnippet);
  
  // Get active project name
  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectName = activeProject?.name || 'Unknown Project';
  
  // Initialize TipTap editor for content
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration error
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none',
          'min-h-[120px] max-h-[200px] overflow-y-auto',
          'px-3 py-2 text-sm',
          'focus:outline-none'
        ),
      },
    },
  });
  
  // Populate form when snippet changes
  useEffect(() => {
    if (isOpen && snippet) {
      setName(snippet.name);
      setDescription(snippet.description || '');
      editor?.commands.setContent(snippet.content);
      
      // Focus name input after a short delay
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, snippet, editor]);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setError(null);
      setIsSaving(false);
      editor?.commands.setContent('');
    }
  }, [isOpen, editor]);
  
  const handleSave = useCallback(async () => {
    if (!snippet) return;
    
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
    const content = editor?.getHTML() || '';
    const plainText = editor?.getText() || '';
    
    if (!plainText.trim()) {
      setError('Content is required');
      editor?.commands.focus();
      return;
    }
    
    if (content.length > 10000) {
      setError('Content is too long (max 10,000 characters)');
      return;
    }
    
    setIsSaving(true);
    
    try {
      updateSnippet(snippet.id, {
        name: trimmedName,
        description: description.trim() || undefined,
        content,
      });
      
      console.log('✅ Snippet updated:', trimmedName);
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error('❌ Failed to update snippet:', err);
      setError(err instanceof Error ? err.message : 'Failed to update snippet');
    } finally {
      setIsSaving(false);
    }
  }, [snippet, name, description, editor, updateSnippet, onUpdated, onClose]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);
  
  if (!isOpen || !snippet) return null;
  
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
              Edit Snippet
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
              placeholder="e.g., Company Tagline"
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
          
          {/* Content Field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Content <span className="text-destructive">*</span>
            </label>
            <div className={cn(
              'rounded-lg border border-border overflow-hidden',
              'bg-muted/50 focus-within:border-primary focus-within:bg-background',
              'transition-colors duration-150'
            )}>
              {/* Mini Toolbar */}
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={cn(
                    'px-2 py-1 text-xs font-bold rounded',
                    'hover:bg-accent transition-colors',
                    editor?.isActive('bold') && 'bg-accent'
                  )}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={cn(
                    'px-2 py-1 text-xs italic rounded',
                    'hover:bg-accent transition-colors',
                    editor?.isActive('italic') && 'bg-accent'
                  )}
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt('Enter URL:');
                    if (url) {
                      editor?.chain().focus().setLink({ href: url }).run();
                    }
                  }}
                  className={cn(
                    'px-2 py-1 text-xs underline rounded',
                    'hover:bg-accent transition-colors',
                    editor?.isActive('link') && 'bg-accent'
                  )}
                >
                  Link
                </button>
              </div>
              
              {/* Editor */}
              <EditorContent editor={editor} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Supports bold, italic, and links
            </p>
          </div>
          
          {/* Project Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
            Saved in: <span className="font-medium text-foreground">{projectName}</span>
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
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
