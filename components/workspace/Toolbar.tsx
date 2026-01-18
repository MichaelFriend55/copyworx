/**
 * @file components/workspace/Toolbar.tsx
 * @description Top toolbar with file menu, formatting controls, and settings
 * 
 * Features:
 * - Left: File operations (Home, Save, Undo, Redo)
 * - Center: Rich text formatting controls
 * - Right: Settings button
 * - Apple-style aesthetic with smooth interactions
 * - Keyboard shortcut tooltips
 * 
 * @example
 * ```tsx
 * <Toolbar />
 * ```
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Editor } from '@tiptap/react';
import {
  Save,
  FolderOpen,
  Undo,
  Redo,
  FileText,
  Settings,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  RemoveFormatting,
  ChevronDown,
} from 'lucide-react';
import { useActiveDocumentId, useUIActions } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  /** Optional CSS classes */
  className?: string;
}

/**
 * Formatting button component
 */
interface FormatButtonProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

function FormatButton({
  icon,
  title,
  onClick,
  isActive = false,
  disabled = false,
}: FormatButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-8 h-8 rounded-md',
        'flex items-center justify-center',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : isActive
          ? 'bg-apple-blue text-white shadow-sm'
          : 'text-apple-text-dark hover:bg-apple-gray-bg'
      )}
    >
      {icon}
    </button>
  );
}

/**
 * Font family options - web-safe fonts plus modern fonts
 */
const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  // Web-safe fonts
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS' },
  // Modern fonts (require Google Fonts or system availability)
  { label: 'Inter', value: 'Inter' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat' },
];

/**
 * Font size options
 */
const FONT_SIZES = [
  { label: '8', value: '8px' },
  { label: '10', value: '10px' },
  { label: '11', value: '11px' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
  { label: '36', value: '36px' },
  { label: '48', value: '48px' },
  { label: '72', value: '72px' },
];

/**
 * Font family dropdown component
 */
function FontFamilyDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!editor) return null;

  // Get current font family from editor attributes
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';
  const currentLabel = FONT_FAMILIES.find(f => f.value === currentFontFamily)?.label || 'Font';

  const handleSetFont = (fontFamily: string) => {
    if (fontFamily === '') {
      // Unset font family to use default
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(fontFamily).run();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-2 h-8 rounded-md',
          'flex items-center gap-1',
          'text-sm text-apple-text-dark',
          'hover:bg-apple-gray-bg',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          'min-w-[120px] max-w-[150px]'
        )}
        title="Font Family"
      >
        <span className="truncate flex-1 text-left">{currentLabel}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] max-h-[300px] overflow-y-auto">
            {FONT_FAMILIES.map((font) => (
              <button
                key={font.label}
                onClick={() => handleSetFont(font.value)}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm',
                  'hover:bg-apple-gray-bg',
                  'transition-colors duration-150',
                  currentFontFamily === font.value
                    ? 'bg-apple-blue/10 text-apple-blue font-medium'
                    : 'text-apple-text-dark'
                )}
                style={{ fontFamily: font.value || 'inherit' }}
              >
                {font.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Font size dropdown component
 */
function FontSizeDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!editor) return null;

  // Get current font size from editor attributes
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '';
  const currentLabel = FONT_SIZES.find(s => s.value === currentFontSize)?.label || '16';

  const handleSetSize = (size: string) => {
    if (size === '16px') {
      // 16px is the default, so unset to use default
      editor.chain().focus().unsetFontSize().run();
    } else {
      editor.chain().focus().setFontSize(size).run();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-2 h-8 rounded-md',
          'flex items-center gap-1',
          'text-sm text-apple-text-dark',
          'hover:bg-apple-gray-bg',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          'min-w-[60px] max-w-[80px]'
        )}
        title="Font Size"
      >
        <span className="truncate flex-1 text-left">{currentLabel}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[80px] max-h-[300px] overflow-y-auto">
            {FONT_SIZES.map((size) => (
              <button
                key={size.value}
                onClick={() => handleSetSize(size.value)}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm',
                  'hover:bg-apple-gray-bg',
                  'transition-colors duration-150',
                  currentFontSize === size.value
                    ? 'bg-apple-blue/10 text-apple-blue font-medium'
                    : 'text-apple-text-dark'
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Text style dropdown component
 */
function TextStyleDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!editor) return null;

  const currentStyle = editor.isActive('heading', { level: 1 })
    ? 'Heading 1'
    : editor.isActive('heading', { level: 2 })
    ? 'Heading 2'
    : editor.isActive('heading', { level: 3 })
    ? 'Heading 3'
    : 'Paragraph';

  const styles = [
    {
      label: 'Paragraph',
      action: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: 'Heading 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Heading 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-3 h-8 rounded-md',
          'flex items-center gap-2',
          'text-sm font-medium text-apple-text-dark',
          'hover:bg-apple-gray-bg',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
        )}
      >
        <span>{currentStyle}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
            {styles.map((style) => (
              <button
                key={style.label}
                onClick={() => {
                  style.action();
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm',
                  'hover:bg-apple-gray-bg',
                  'transition-colors duration-150',
                  currentStyle === style.label
                    ? 'bg-apple-blue/10 text-apple-blue font-medium'
                    : 'text-apple-text-dark'
                )}
              >
                {style.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Top toolbar component with file menu and formatting controls
 */
export function Toolbar({ className }: ToolbarProps) {
  // Optimized selectors
  const activeDocumentId = useActiveDocumentId();
  const { toggleRightSidebar } = useUIActions();
  
  // Check if we have an active document
  const hasActiveDocument = !!activeDocumentId;

  const [editor, setEditor] = useState<Editor | null>(null);

  // Get editor instance from window (set by EditorArea)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.__tiptapEditor) {
        setEditor(window.__tiptapEditor);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);


  // Insert link handler
  const handleInsertLink = (): void => {
    if (!editor) return;

    const url = window.prompt('Enter URL:');
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  };

  return (
    <header
      className={cn(
        'w-full h-16 bg-white',
        'flex items-center justify-between',
        'px-6 gap-8',
        'sticky top-0 z-50',
        'border-b border-gray-200',
        className
      )}
      style={{
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
      }}
    >
      {/* Left section - File operations */}
      <div className="flex items-center gap-2">
        <Link href="/copyworx">
          <button
            className={cn(
              'px-3 py-2 rounded-lg',
              'text-sm font-medium text-apple-text-dark',
              'hover:bg-apple-gray-bg',
              'transition-colors duration-150',
              'flex items-center gap-2',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
            )}
            title="Back to CopyWorx Home"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </Link>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        <button
          className={cn(
            'px-3 py-2 rounded-lg',
            'text-sm font-medium',
            hasActiveDocument
              ? 'text-apple-text-dark hover:bg-apple-gray-bg'
              : 'text-gray-400 cursor-not-allowed',
            'transition-colors duration-150',
            'flex items-center gap-2',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
          )}
          disabled={!hasActiveDocument}
          title="Save (⌘S)"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          className={cn(
            'p-2 rounded-lg',
            'text-apple-text-dark hover:bg-apple-gray-bg',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
          title="Undo (⌘Z)"
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          className={cn(
            'p-2 rounded-lg',
            'text-apple-text-dark hover:bg-apple-gray-bg',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'disabled:opacity-30 disabled:cursor-not-allowed'
          )}
          title="Redo (⌘⇧Z)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Center section - Formatting controls */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {hasActiveDocument && editor ? (
          <>
            {/* Font controls - placed at LEFT */}
            <FontFamilyDropdown editor={editor} />
            <FontSizeDropdown editor={editor} />

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Text style dropdown */}
            <TextStyleDropdown editor={editor} />

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Bold */}
            <FormatButton
              icon={<Bold className="w-4 h-4" />}
              title="Bold (⌘B)"
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
            />

            {/* Italic */}
            <FormatButton
              icon={<Italic className="w-4 h-4" />}
              title="Italic (⌘I)"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
            />

            {/* Underline */}
            <FormatButton
              icon={<UnderlineIcon className="w-4 h-4" />}
              title="Underline (⌘U)"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
            />

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Bullet list */}
            <FormatButton
              icon={<List className="w-4 h-4" />}
              title="Bullet List"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
            />

            {/* Numbered list */}
            <FormatButton
              icon={<ListOrdered className="w-4 h-4" />}
              title="Numbered List"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
            />

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Align left */}
            <FormatButton
              icon={<AlignLeft className="w-4 h-4" />}
              title="Align Left"
              onClick={() =>
                editor.chain().focus().setTextAlign('left').run()
              }
              isActive={editor.isActive({ textAlign: 'left' })}
            />

            {/* Align center */}
            <FormatButton
              icon={<AlignCenter className="w-4 h-4" />}
              title="Align Center"
              onClick={() =>
                editor.chain().focus().setTextAlign('center').run()
              }
              isActive={editor.isActive({ textAlign: 'center' })}
            />

            {/* Align right */}
            <FormatButton
              icon={<AlignRight className="w-4 h-4" />}
              title="Align Right"
              onClick={() =>
                editor.chain().focus().setTextAlign('right').run()
              }
              isActive={editor.isActive({ textAlign: 'right' })}
            />

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Insert link */}
            <FormatButton
              icon={<LinkIcon className="w-4 h-4" />}
              title="Insert Link (⌘K)"
              onClick={handleInsertLink}
              isActive={editor.isActive('link')}
            />

            {/* Clear formatting */}
            <FormatButton
              icon={<RemoveFormatting className="w-4 h-4" />}
              title="Clear Formatting"
              onClick={() =>
                editor.chain().focus().clearNodes().unsetAllMarks().run()
              }
            />
          </>
        ) : (
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>CopyWorx™ Studio</span>
          </div>
        )}
      </div>

      {/* Right section - Settings */}
      <div className="flex items-center gap-2">
        <button
          className={cn(
            'p-2 rounded-lg',
            'text-apple-text-dark hover:bg-apple-gray-bg',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
          )}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
