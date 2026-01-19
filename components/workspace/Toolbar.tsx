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
  Paintbrush,
  Highlighter,
  X,
} from 'lucide-react';
import { useActiveDocumentId, useUIActions, useViewMode } from '@/lib/stores/workspaceStore';
import { ViewModeSelector } from './ViewModeSelector';
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
 * Text color options for the color picker
 */
const TEXT_COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Dark Gray', value: '#4B5563' },
  { label: 'Gray', value: '#9CA3AF' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Yellow', value: '#EAB308' },
  { label: 'Lime', value: '#84CC16' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Emerald', value: '#10B981' },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Fuchsia', value: '#D946EF' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Rose', value: '#F43F5E' },
  { label: 'Brown', value: '#92400E' },
];

/**
 * Highlight/background color options
 */
const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#FEF08A' },
  { label: 'Lime', value: '#D9F99D' },
  { label: 'Green', value: '#BBF7D0' },
  { label: 'Cyan', value: '#A5F3FC' },
  { label: 'Blue', value: '#BFDBFE' },
  { label: 'Purple', value: '#DDD6FE' },
  { label: 'Pink', value: '#FBCFE8' },
  { label: 'Rose', value: '#FECDD3' },
  { label: 'Orange', value: '#FED7AA' },
  { label: 'Gray', value: '#E5E7EB' },
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
 * Text color picker dropdown component
 */
function TextColorDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!editor) return null;

  // Get current text color from editor attributes
  const currentColor = editor.getAttributes('textStyle').color || '#000000';

  const handleSetColor = (color: string) => {
    if (color === '#000000') {
      // Black is default, unset to use default
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
    setIsOpen(false);
    // Use setTimeout to ensure dropdown closes before clearing selection
    setTimeout(() => {
      editor.commands.blur();
    }, 50);
  };

  const handleRemoveColor = () => {
    editor.chain().focus().unsetColor().run();
    setIsOpen(false);
    setTimeout(() => {
      editor.commands.blur();
    }, 50);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-8 h-8 rounded-md',
          'flex items-center justify-center',
          'hover:bg-apple-gray-bg',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          'relative'
        )}
        title="Text Color"
      >
        <Paintbrush className="w-4 h-4 text-apple-text-dark" />
        {/* Color indicator bar */}
        <div
          className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded-full"
          style={{ backgroundColor: currentColor }}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Color palette dropdown */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-[180px]">
            <div className="text-xs text-gray-500 mb-2 px-1">Text Color</div>
            
            {/* Color grid */}
            <div className="grid grid-cols-5 gap-1 mb-2">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleSetColor(color.value)}
                  className={cn(
                    'w-7 h-7 rounded-md',
                    'transition-all duration-150',
                    'hover:scale-110',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue',
                    currentColor === color.value && 'ring-2 ring-apple-blue ring-offset-1'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>

            {/* Remove color button */}
            <button
              onClick={handleRemoveColor}
              className={cn(
                'w-full px-2 py-1.5 rounded-md',
                'text-xs text-apple-text-dark',
                'hover:bg-apple-gray-bg',
                'transition-colors duration-150',
                'flex items-center justify-center gap-1'
              )}
            >
              <X className="w-3 h-3" />
              <span>Remove Color</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Highlight/background color picker dropdown component
 */
function HighlightColorDropdown({ editor }: { editor: Editor | null }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!editor) return null;

  // Get current highlight color from editor
  const highlightAttrs = editor.getAttributes('highlight');
  const currentHighlight = highlightAttrs?.color || null;

  const handleSetHighlight = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
    setIsOpen(false);
    // Use setTimeout to ensure dropdown closes before clearing selection
    setTimeout(() => {
      editor.commands.blur();
    }, 50);
  };

  const handleRemoveHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
    setIsOpen(false);
    setTimeout(() => {
      editor.commands.blur();
    }, 50);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-8 h-8 rounded-md',
          'flex items-center justify-center',
          'hover:bg-apple-gray-bg',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          'relative'
        )}
        title="Highlight Color"
      >
        <Highlighter className="w-4 h-4 text-apple-text-dark" />
        {/* Highlight indicator bar */}
        {currentHighlight && (
          <div
            className="absolute bottom-1 left-1.5 right-1.5 h-0.5 rounded-full"
            style={{ backgroundColor: currentHighlight }}
          />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Highlight palette dropdown */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-[180px]">
            <div className="text-xs text-gray-500 mb-2 px-1">Highlight Color</div>
            
            {/* Color grid */}
            <div className="grid grid-cols-5 gap-1 mb-2">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleSetHighlight(color.value)}
                  className={cn(
                    'w-7 h-7 rounded-md border border-gray-200',
                    'transition-all duration-150',
                    'hover:scale-110',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue',
                    currentHighlight === color.value && 'ring-2 ring-apple-blue ring-offset-1'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>

            {/* Remove highlight button */}
            <button
              onClick={handleRemoveHighlight}
              className={cn(
                'w-full px-2 py-1.5 rounded-md',
                'text-xs text-apple-text-dark',
                'hover:bg-apple-gray-bg',
                'transition-colors duration-150',
                'flex items-center justify-center gap-1'
              )}
            >
              <X className="w-3 h-3" />
              <span>Remove Highlight</span>
            </button>
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
  const { toggleRightSidebar, setViewMode } = useUIActions();
  const viewMode = useViewMode();
  
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

            {/* Text Color */}
            <TextColorDropdown editor={editor} />

            {/* Highlight Color */}
            <HighlightColorDropdown editor={editor} />

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

      {/* Right section - View Mode & Settings */}
      <div className="flex items-center gap-3">
        {/* View Mode Selector */}
        <ViewModeSelector
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          disabled={!hasActiveDocument}
        />

        <div className="w-px h-6 bg-gray-200" />

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
