/**
 * @file components/workspace/EditorArea.tsx
 * @description TipTap rich text editor - REBUILT FOR PROPER PERSISTENCE
 * 
 * Features:
 * - TipTap editor with full formatting
 * - Automatic content persistence
 * - Real-time word/character count
 * - Apple-style aesthetic
 */

'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { cn } from '@/lib/utils';

interface EditorAreaProps {
  className?: string;
  /** Callback to pass the editor instance to parent component */
  onEditorReady?: (editor: Editor | null) => void;
}

/**
 * Main editor area with TipTap rich text editor
 */
export function EditorArea({ className, onEditorReady }: EditorAreaProps) {
  const activeDocument = useWorkspaceStore((state) => state.activeDocument);
  const updateDocumentTitle = useWorkspaceStore((state) => state.updateDocumentTitle);

  // Initialize TipTap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your copy...',
      }),
      CharacterCount,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-apple-blue underline cursor-pointer hover:text-apple-blue-dark',
        },
      }),
      Typography,
    ],
    content: '', // Start empty, will be loaded from store
    onCreate: ({ editor }) => {
      // Pass editor instance to parent when created
      onEditorReady?.(editor);
      console.log('✅ Editor instance passed to parent');
    },
    onDestroy: () => {
      // Clear editor instance from parent when destroyed
      onEditorReady?.(null);
      console.log('🗑️ Editor instance cleared from parent');
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[800px] text-apple-text-dark',
      },
    },
  });

  // Load content when activeDocument changes
  useEffect(() => {
    if (editor && activeDocument?.content) {
      const currentContent = editor.getHTML();
      const newContent = activeDocument.content;
      
      // Only update if content is different
      if (currentContent !== newContent) {
        editor.commands.setContent(newContent);
        console.log('📄 Loaded content from store:', {
          id: activeDocument.id,
          contentLength: newContent.length,
        });
      }
    }
  }, [editor, activeDocument?.id]); // Only re-run when document ID changes

  // Enable auto-save
  useAutoSave(editor);

  // Export editor instance for toolbar
  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      (window as any).__tiptapEditor = editor;
      console.log('🔗 Editor instance exported to window');
    }
  }, [editor]);

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateDocumentTitle(e.target.value);
  };

  // Get word and character count
  const wordCount = editor?.storage.characterCount.words() || 0;
  const characterCount = editor?.storage.characterCount.characters() || 0;

  return (
    <div
      className={cn(
        'relative h-full w-full',
        'bg-apple-editor-bg',
        'flex items-start justify-center',
        'overflow-y-auto custom-scrollbar',
        'py-12 px-8',
        className
      )}
    >
      {/* Paper container */}
      <div
        className={cn(
          'w-full max-w-[850px]',
          'bg-white',
          'rounded-sm',
          'min-h-[11in]',
          'relative',
          'transition-all duration-300'
        )}
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {activeDocument ? (
          <>
            {/* Document header */}
            <div
              className="px-16 pt-10 pb-6 border-b border-gray-200"
              style={{ paddingTop: '40px' }}
            >
              {/* Title input */}
              <input
                type="text"
                value={activeDocument.title}
                onChange={handleTitleChange}
                className={cn(
                  'w-full text-3xl font-display font-semibold',
                  'text-black',
                  'border-none outline-none',
                  'bg-transparent',
                  'placeholder-gray-400',
                  'focus:ring-0'
                )}
                placeholder="Untitled Document"
                aria-label="Document title"
              />

              {/* Document metadata */}
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{characterCount} characters</span>
                <span>•</span>
                <span>
                  Last edited{' '}
                  {new Date(activeDocument.modifiedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* TipTap editor */}
            <div
              className="px-16 py-8"
              style={{
                paddingLeft: '60px',
                paddingRight: '60px',
                paddingTop: '40px',
                paddingBottom: '40px',
              }}
            >
              <EditorContent
                editor={editor}
                className={cn(
                  'tiptap-editor',
                  'text-base leading-relaxed',
                  'focus-within:outline-none'
                )}
              />
            </div>

            {/* Word count footer */}
            <div className="px-16 pb-8 flex justify-end">
              <div className="text-sm text-gray-500">
                {wordCount} words • {characterCount} characters
              </div>
            </div>
          </>
        ) : (
          // No document state
          <div className="flex flex-col items-center justify-center min-h-[600px] text-center p-16">
            <div className="text-gray-400 text-lg font-medium mb-2">
              No document open
            </div>
            <p className="text-gray-400 text-sm max-w-md">
              Create a new document or open an existing one to start writing
            </p>
          </div>
        )}

        {/* Paper shadow effect */}
        <div
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.03)',
          }}
        />
      </div>

      {/* TipTap styles */}
      <style jsx global>{`
        .tiptap-editor {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #1D1D1F;
        }

        .tiptap-editor .ProseMirror {
          outline: none;
        }

        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #86868B;
          font-style: italic;
          pointer-events: none;
          height: 0;
        }

        .tiptap-editor h1 {
          font-size: 2em;
          font-weight: 700;
          margin-top: 1em;
          margin-bottom: 0.5em;
          line-height: 1.2;
        }

        .tiptap-editor h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
          line-height: 1.3;
        }

        .tiptap-editor h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin-top: 1em;
          margin-bottom: 0.5em;
          line-height: 1.4;
        }

        .tiptap-editor ul,
        .tiptap-editor ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }

        .tiptap-editor ul {
          list-style-type: disc;
        }

        .tiptap-editor ol {
          list-style-type: decimal;
        }

        .tiptap-editor li {
          margin: 0.25em 0;
        }

        .tiptap-editor strong {
          font-weight: 600;
        }

        .tiptap-editor em {
          font-style: italic;
        }

        .tiptap-editor u {
          text-decoration: underline;
        }

        .tiptap-editor a {
          color: #0071E3;
          text-decoration: underline;
          cursor: pointer;
        }

        .tiptap-editor a:hover {
          color: #0062CC;
        }

        .tiptap-editor code {
          background-color: #f5f5f7;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }

        .tiptap-editor blockquote {
          border-left: 3px solid #d2d2d7;
          padding-left: 1em;
          margin-left: 0;
          font-style: italic;
          color: #6e6e73;
        }

        .tiptap-editor [data-text-align="left"] {
          text-align: left;
        }

        .tiptap-editor [data-text-align="center"] {
          text-align: center;
        }

        .tiptap-editor [data-text-align="right"] {
          text-align: right;
        }

        .tiptap-editor [data-text-align="justify"] {
          text-align: justify;
        }
      `}</style>
    </div>
  );
}
