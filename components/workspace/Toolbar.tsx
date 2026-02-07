/**
 * @file components/workspace/Toolbar.tsx
 * @description Top toolbar with file menu, formatting controls, and view modes
 * 
 * Features:
 * - Left: File operations (Home, Undo, Redo)
 * - Center: Rich text formatting controls
 * - Right: View mode selector, user menu, help button
 * - Apple-style aesthetic with smooth interactions
 * - Keyboard shortcut tooltips
 * 
 * @example
 * ```tsx
 * <Toolbar />
 * ```
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Editor } from '@tiptap/react';
import {
  FolderOpen,
  Undo,
  Redo,
  FileText,
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
  FileDown,
  FileUp,
  Printer,
  ChevronRight,
  FilePlus,
  Plus,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useActiveDocumentId, useActiveProjectId, useProjects, useUIActions, useViewMode, useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { getDocument, updateDocument, createDocument } from '@/lib/storage/unified-storage';
import { toast } from 'sonner';
import { ViewModeSelector } from './ViewModeSelector';
import { SaveAsSnippetButton } from './SaveAsSnippetButton';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';

interface ToolbarProps {
  /** Optional CSS classes */
  className?: string;
  /** Callback to restart the product tour */
  onRestartTour?: () => void;
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
  { label: 'Amber', value: '#EFBF04' },
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
 * Document menu dropdown component
 * Handles import, export, and print operations
 */
function DocumentMenu({ 
  editor, 
  documentTitle,
  activeProjectId,
  activeDocumentId,
  onTitleUpdate,
  onNewDocument,
}: { 
  editor: Editor | null; 
  documentTitle?: string;
  activeProjectId: string | null;
  activeDocumentId: string | null;
  onTitleUpdate: (newTitle: string) => void;
  /** Callback to create a new document (shared with toolbar "+" button) */
  onNewDocument: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showImportSubmenu, setShowImportSubmenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingImportType, setPendingImportType] = useState<'txt' | 'md' | 'docx' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Clear export message after a delay
  useEffect(() => {
    if (exportMessage) {
      const timer = setTimeout(() => {
        setExportMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exportMessage]);

  // Close menu and submenus
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setShowImportSubmenu(false);
    setShowExportSubmenu(false);
  }, []);

  // Handle ESC key and click outside to close menu
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    // Add listeners after a small delay to prevent immediate closure
    // Increased from 0ms to 100ms to ensure click event finishes propagating
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }, 100);

    // Cleanup event listeners
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, closeMenu]);

  // Close submenus when main menu closes
  useEffect(() => {
    if (!isOpen) {
      setShowImportSubmenu(false);
      setShowExportSubmenu(false);
    }
  }, [isOpen]);

  /**
   * Check if editor has content (not empty or just whitespace)
   * 
   * @returns true if editor has meaningful content, false if empty
   */
  const hasEditorContent = useCallback((): boolean => {
    if (!editor) return false;
    
    // Get plain text content and check if it's not just whitespace
    const text = editor.getText().trim();
    return text.length > 0;
  }, [editor]);

  /**
   * Handle confirming overwrite - proceed with file import
   */
  const handleConfirmOverwrite = useCallback(() => {
    if (!pendingImportType) return;
    
    // Close modal
    setShowOverwriteModal(false);
    
    // Proceed with import
    triggerFileInput(pendingImportType);
    
    // Clear pending import type
    setPendingImportType(null);
  }, [pendingImportType]);

  /**
   * Handle canceling overwrite - abort import
   */
  const handleCancelOverwrite = useCallback(() => {
    setShowOverwriteModal(false);
    setPendingImportType(null);
  }, []);

  /**
   * Trigger file input for import
   * 
   * @param fileType - Type of file to import
   */
  const triggerFileInput = (fileType: 'txt' | 'md' | 'docx') => {
    // Store the file type so we can validate it when file is selected
    fileInputRef.current?.setAttribute('data-import-type', fileType);
    
    // Set accept attribute based on file type
    if (fileInputRef.current) {
      switch (fileType) {
        case 'txt':
          fileInputRef.current.accept = '.txt,text/plain';
          break;
        case 'md':
          fileInputRef.current.accept = '.md,text/markdown';
          break;
        case 'docx':
          fileInputRef.current.accept = '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
      }
    }
    
    // Trigger file input
    fileInputRef.current?.click();
    closeMenu();
  };

  // Handle import file selection - check for content first
  const handleImportClick = (fileType: 'txt' | 'md' | 'docx') => {
    // Check if editor has content
    if (hasEditorContent()) {
      // Show overwrite confirmation modal
      setPendingImportType(fileType);
      setShowOverwriteModal(true);
      closeMenu();
    } else {
      // No content, proceed directly with import
      triggerFileInput(fileType);
    }
  };

  /**
   * Extract filename without extension
   * Handles edge cases like multiple dots and no extension
   * 
   * @param filename - Full filename with extension
   * @returns Filename without extension
   * @example
   * extractFilenameWithoutExtension('Marketing Brief.docx') => 'Marketing Brief'
   * extractFilenameWithoutExtension('report.v2.final.txt') => 'report.v2.final'
   * extractFilenameWithoutExtension('readme') => 'readme'
   */
  const extractFilenameWithoutExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No extension found, return full filename
      return filename;
    }
    // Return everything before the last dot
    return filename.substring(0, lastDotIndex);
  };

  // Handle file import after file is selected
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) {
      return;
    }

    try {
      setIsExporting(true);
      setExportMessage(null);

      // Import the file dynamically
      const { importDocument } = await import('@/lib/utils/document-import');
      
      const result = await importDocument(editor, file);
      
      if (result.success) {
        // Extract filename without extension
        const newTitle = extractFilenameWithoutExtension(file.name);
        
        // Update document title if we have an active document
        if (activeProjectId && activeDocumentId) {
          try {
            // FIX: Added await to ensure title update completes before continuing
            await updateDocument(activeProjectId, activeDocumentId, {
              title: newTitle,
              baseTitle: newTitle
            });
            
            // Update the Toolbar's local state so title displays immediately
            onTitleUpdate(newTitle);
            
            // Dispatch custom event to notify EditorArea to reload document
            window.dispatchEvent(new CustomEvent('documentUpdated', {
              detail: { projectId: activeProjectId, documentId: activeDocumentId }
            }));
            
            logger.log('✅ Document title updated to:', newTitle);
          } catch (updateError) {
            logger.warn('⚠️ Could not update document title:', updateError);
            // Don't fail the import if title update fails
          }
        }
        
        setExportMessage({ 
          type: 'success', 
          text: `Imported ${file.name}` 
        });
        logger.log('✅ Import successful:', file.name);
      } else {
        setExportMessage({ 
          type: 'error', 
          text: result.error || 'Import failed' 
        });
        logger.error('❌ Import failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      setExportMessage({ type: 'error', text: errorMessage });
      logger.error('❌ Import error:', error);
    } finally {
      setIsExporting(false);
      // Reset file input so the same file can be imported again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Handle export with proper async handling
  const handleExportClick = async (fileType: 'txt' | 'md' | 'docx') => {
    try {
      if (!editor) {
        setExportMessage({ type: 'error', text: 'No editor available' });
        return;
      }

      // Import export function dynamically to avoid SSR issues
      const { exportDocument } = await import('@/lib/utils/document-export');
      
      setIsExporting(true);
      closeMenu();
      
      const result = await exportDocument(editor, fileType, documentTitle);
      
      if (result.success) {
        setExportMessage({ 
          type: 'success', 
          text: `Exported as ${result.filename}` 
        });
      } else {
        setExportMessage({ 
          type: 'error', 
          text: result.error || 'Export failed' 
        });
        logger.error('❌ Export failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setExportMessage({ type: 'error', text: errorMessage });
      logger.error('❌ Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle print
  const handlePrintClick = () => {
    // Import print utility dynamically to avoid SSR issues
    import('@/lib/utils/pdf-export').then(({ printWithTitle }) => {
      printWithTitle(documentTitle);
    });
    closeMenu();
  };

  return (
    <div ref={menuContainerRef} className="relative z-[200]">
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log('Document button clicked, isOpen:', isOpen);
          setIsOpen(!isOpen);
        }}
        className={cn(
          'px-3 py-2 rounded-lg',
          'flex items-center gap-2',
          'text-sm font-medium text-apple-text-dark',
          'hover:bg-apple-gray-bg',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
        )}
        title="Document Menu"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">Document</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          {/* Dropdown menu */}
          <div className="absolute top-full left-0 mt-1 z-[100] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[220px] overflow-visible">
            {/* New Document */}
            <button
              onClick={() => {
                closeMenu();
                onNewDocument();
              }}
              onMouseEnter={() => {
                setShowImportSubmenu(false);
                setShowExportSubmenu(false);
              }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm',
                'hover:text-apple-blue',
                'transition-colors duration-150',
                'text-apple-text-dark',
                'flex items-center justify-between'
              )}
            >
              <span className="flex items-center gap-2">
                <FilePlus className="w-4 h-4" />
                New Document
              </span>
              <span className="text-xs text-gray-400">⌘N</span>
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-gray-200" />

            {/* Import Document */}
            <div className="relative">
              <button
                onClick={() => setShowImportSubmenu(!showImportSubmenu)}
                onMouseEnter={() => setShowImportSubmenu(true)}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm',
                  'hover:text-apple-blue',
                  'transition-colors duration-150',
                  'text-apple-text-dark',
                  'flex items-center justify-between'
                )}
              >
                <span className="flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  Import Document
                </span>
                <ChevronRight className="w-3 h-3" />
              </button>

              {/* Import Submenu */}
              {showImportSubmenu && (
                <div className="absolute left-full top-0 ml-1 z-[110] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]">
                  <button
                    onClick={() => handleImportClick('docx')}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm',
                      'hover:text-apple-blue',
                      'transition-colors duration-150',
                      'text-apple-text-dark'
                    )}
                  >
                    Word Document (.docx)
                  </button>
                  <button
                    onClick={() => handleImportClick('txt')}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm',
                      'hover:text-apple-blue',
                      'transition-colors duration-150',
                      'text-apple-text-dark'
                    )}
                  >
                    Plain Text (.txt)
                  </button>
                  <button
                    onClick={() => handleImportClick('md')}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm',
                      'hover:text-apple-blue',
                      'transition-colors duration-150',
                      'text-apple-text-dark'
                    )}
                  >
                    Markdown (.md)
                  </button>
                </div>
              )}
            </div>

            {/* Export Document */}
            <div className="relative">
              <button
                onClick={() => setShowExportSubmenu(!showExportSubmenu)}
                onMouseEnter={() => setShowExportSubmenu(true)}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm',
                  'hover:text-apple-blue',
                  'transition-colors duration-150',
                  'text-apple-text-dark',
                  'flex items-center justify-between'
                )}
              >
                <span className="flex items-center gap-2">
                  <FileDown className="w-4 h-4" />
                  Export Document
                </span>
                <ChevronRight className="w-3 h-3" />
              </button>

              {/* Export Submenu */}
              {showExportSubmenu && (
                <div className="absolute left-full top-0 ml-1 z-[110] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]">
                  <button
                    onClick={() => handleExportClick('docx')}
                    disabled={isExporting || !editor}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm',
                      'transition-colors duration-150',
                      'text-apple-text-dark',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'hover:text-apple-blue disabled:hover:text-apple-text-dark'
                    )}
                  >
                    Word Document (.docx)
                  </button>
                  <button
                    onClick={() => handleExportClick('txt')}
                    disabled={isExporting || !editor}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm',
                      'transition-colors duration-150',
                      'text-apple-text-dark',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'hover:text-apple-blue disabled:hover:text-apple-text-dark'
                    )}
                  >
                    Plain Text (.txt)
                  </button>
                  <button
                    onClick={() => handleExportClick('md')}
                    disabled={isExporting || !editor}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm',
                      'transition-colors duration-150',
                      'text-apple-text-dark',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'hover:text-apple-blue disabled:hover:text-apple-text-dark'
                    )}
                  >
                    Markdown (.md)
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="my-1 border-t border-gray-200" />

            {/* Export PDF */}
            <button
              onClick={handlePrintClick}
              onMouseEnter={() => {
                // Close any open submenus when hovering over Export PDF
                setShowExportSubmenu(false);
                setShowImportSubmenu(false);
              }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm',
                'hover:text-apple-blue',
                'transition-colors duration-150',
                'text-apple-text-dark',
                'flex items-center justify-between'
              )}
            >
              <span className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Export PDF
              </span>
              <span className="text-xs text-gray-400">⌘P</span>
            </button>
          </div>
        </>
      )}

      {/* Hidden file input for importing */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.txt,.md"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* Import/Export Loading Indicator */}
      {isExporting && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
          <div className="w-4 h-4 border-2 border-apple-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-apple-text-dark">Processing...</span>
        </div>
      )}

      {/* Import/Export Message Toast */}
      {exportMessage && (
        <div 
          className={cn(
            'fixed top-20 right-6 z-50 px-4 py-2 rounded-lg shadow-lg border',
            'flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200',
            exportMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          {exportMessage.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm">{exportMessage.text}</span>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      <ConfirmationModal
        isOpen={showOverwriteModal}
        title="Overwrite Current Document?"
        message={`Importing will replace all content in '${documentTitle || 'this document'}'. This action cannot be undone.`}
        confirmLabel="Import Anyway"
        cancelLabel="Cancel"
        onClose={handleCancelOverwrite}
        onConfirm={handleConfirmOverwrite}
        isDestructive={false}
      />
    </div>
  );
}

/**
 * Top toolbar component with file menu and formatting controls
 */
export function Toolbar({ className, onRestartTour }: ToolbarProps) {
  // Optimized selectors
  const activeDocumentId = useActiveDocumentId();
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const { toggleRightSidebar, setViewMode } = useUIActions();
  const viewMode = useViewMode();
  
  // Check if we have an active document
  const hasActiveDocument = !!activeDocumentId;

  const [editor, setEditor] = useState<Editor | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string | undefined>(undefined);
  // Force re-render counter for editor state updates (undo/redo availability)
  const [, forceUpdate] = useState(0);
  // Track if new document creation is in progress
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  
  // Scroll indicator states
  const [isScrolledLeft, setIsScrolledLeft] = useState(false);
  const [isScrolledRight, setIsScrolledRight] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

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

  // Subscribe to editor transactions to update undo/redo button states
  useEffect(() => {
    if (!editor) return;

    // This handler triggers re-render when editor state changes
    // so that can().undo() and can().redo() are re-evaluated
    const handleUpdate = () => {
      forceUpdate(n => n + 1);
    };

    editor.on('transaction', handleUpdate);

    return () => {
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  // Get document title from localStorage when document changes
  useEffect(() => {
    // Safety check: only run in browser
    if (typeof window === 'undefined') return;
    
    const loadDocumentTitle = async () => {
      try {
        if (activeProjectId && activeDocumentId) {
          const document = await getDocument(activeProjectId, activeDocumentId);
          if (document) {
            // Use baseTitle for cleaner filename (without version suffix)
            setDocumentTitle(document.baseTitle || document.title);
          } else {
            setDocumentTitle(undefined);
          }
        } else {
          setDocumentTitle(undefined);
        }
      } catch (error) {
        logger.error('Error getting document title:', error);
        setDocumentTitle(undefined);
      }
    };
    
    loadDocumentTitle();
  }, [activeProjectId, activeDocumentId]);

  // Scroll indicator detection
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateScrollIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = header;
      
      // Show left fade when scrolled away from left edge
      setIsScrolledLeft(scrollLeft > 0);
      
      // Show right fade when there's more content to scroll to
      // Add 1px tolerance to handle subpixel rendering issues
      setIsScrolledRight(scrollLeft < scrollWidth - clientWidth - 1);
    };

    // Check on mount
    updateScrollIndicators();

    // Listen for scroll events
    header.addEventListener('scroll', updateScrollIndicators);

    // Listen for window resize (affects clientWidth)
    window.addEventListener('resize', updateScrollIndicators);

    // Cleanup
    return () => {
      header.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, []);


  /**
   * Resolve the target project for new document creation.
   * Priority: activeProjectId > first available project > null
   */
  const resolveTargetProject = useCallback((): { id: string; name: string } | null => {
    // (a) Active project from Zustand (persisted, covers both open doc and last-used)
    if (activeProjectId) {
      const project = projects.find(p => p.id === activeProjectId);
      if (project) {
        return { id: project.id, name: project.name };
      }
    }

    // (b) Fallback to the first available project
    if (projects.length > 0) {
      return { id: projects[0].id, name: projects[0].name };
    }

    // (c) No projects exist at all
    return null;
  }, [activeProjectId, projects]);

  /**
   * Create a new blank document in the currently active project.
   * Used by both the Document dropdown menu item and the toolbar "+" button.
   * 
   * Flow:
   * 1. Resolve target project
   * 2. Create "Untitled Document" via unified-storage
   * 3. Set as active document in Zustand (triggers EditorArea load)
   * 4. Show toast notification
   * 5. Focus the editor
   */
  const handleNewDocument = useCallback(async () => {
    if (isCreatingDocument) return;

    const targetProject = resolveTargetProject();

    if (!targetProject) {
      toast.error('No projects found. Create a project first.');
      return;
    }

    setIsCreatingDocument(true);

    try {
      const newDoc = await createDocument(targetProject.id, 'Untitled Document');

      // Switch to the target project if different from current
      if (targetProject.id !== activeProjectId) {
        await useWorkspaceStore.getState().setActiveProjectId(targetProject.id);
      }

      // Set new document as active (triggers EditorArea to load it)
      useWorkspaceStore.getState().setActiveDocumentId(newDoc.id);

      // Refresh projects so sidebar reflects the new document
      useWorkspaceStore.getState().refreshProjects();

      // Show toast notification (blue with white text for visibility)
      toast.success(`New document created in ${targetProject.name}`, {
        duration: 3000,
        style: {
          background: '#0071E3',
          color: '#ffffff',
          border: 'none',
        },
      });

      // Focus the editor after a brief delay for render
      setTimeout(() => {
        const tiptapEditor = (window as unknown as Record<string, unknown>).__tiptapEditor as Editor | undefined;
        if (tiptapEditor) {
          tiptapEditor.commands.focus();
        }
      }, 300);

      logger.log('✅ New document created:', newDoc.id, 'in project:', targetProject.name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create document';
      toast.error(errorMessage);
      logger.error('❌ Failed to create new document:', error);
    } finally {
      setIsCreatingDocument(false);
    }
  }, [isCreatingDocument, resolveTargetProject, activeProjectId]);

  /**
   * Global keyboard shortcut: Cmd/Ctrl+N for new document
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key === 'n') {
        event.preventDefault();
        handleNewDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewDocument]);

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
    <div 
      className={cn(
        'relative w-full h-16',
        'sticky top-0 z-50',
        className
      )}
      data-print-hide
    >
      <header
        ref={headerRef}
        className={cn(
          'w-full bg-white',
          'px-6',
          'border-b border-gray-200',
          'transition-all duration-300',
          'h-16',
          // Horizontal scrolling support - removed overflow to allow dropdown
          // 'overflow-x-auto',
          'scrollbar-hide' // Hide scrollbar while keeping scroll functionality
        )}
        style={{
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          scrollBehavior: 'smooth', // Smooth scrolling
        }}
      >
      {/* Inner wrapper - forces horizontal scroll on small screens */}
      <div className={cn(
        'flex items-center justify-between',
        'gap-2 sm:gap-4 lg:gap-8',
        'min-w-[1400px]',
        'w-full',
        'h-full'
      )}>
        {/* Left section - File operations */}
        <div className={cn(
          'flex items-center gap-1.5 sm:gap-2 transition-all duration-300',
          'flex-shrink-0' // Prevent shrinking on small screens
        )}>
        <Link href="/home">
          <button
            className={cn(
              'px-3 py-2 rounded-lg',
              'text-sm font-medium text-apple-text-dark',
              'hover:bg-apple-gray-bg',
              'transition-colors duration-150',
              'flex items-center gap-2',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
            )}
            title="Back to App Home"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </Link>

        <DocumentMenu 
          editor={editor} 
          documentTitle={documentTitle}
          activeProjectId={activeProjectId}
          activeDocumentId={activeDocumentId}
          onTitleUpdate={setDocumentTitle}
          onNewDocument={handleNewDocument}
        />

        {/* New Document "+" button - fast-access method */}
        <button
          onClick={handleNewDocument}
          disabled={isCreatingDocument}
          className={cn(
            'w-7 h-7 rounded-md',
            'flex items-center justify-center',
            'bg-apple-blue text-white',
            'hover:bg-apple-blue/90',
            'active:scale-95',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-sm'
          )}
          title="New Document (⌘N)"
        >
          {isCreatingDocument ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          )}
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

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
      <div className={cn(
        'flex-1 flex items-center justify-center gap-0.5 sm:gap-1 transition-all duration-300',
        'min-w-0', // Allow shrinking but maintain space for content
        'overflow-hidden' // Prevent overflow from pushing other sections
      )}>
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

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Save as Snippet */}
            <SaveAsSnippetButton variant="toolbar" dataTour="snippets" />
          </>
        ) : (
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>CopyWorx Studio™</span>
          </div>
        )}
      </div>

      {/* Right section - View Mode and Tour Button */}
      <div className={cn(
        'flex items-center gap-2 sm:gap-3',
        'flex-shrink-0', // Prevent shrinking on small screens
        'ml-auto' // Push to right edge
      )}>
        {/* View Mode Selector - Always visible */}
        <ViewModeSelector
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          disabled={!hasActiveDocument}
          documentTitle={documentTitle}
        />
        
        {/* User Menu Button */}
        <UserButton 
          afterSignOutUrl="/home"
          appearance={{
            elements: {
              avatarBox: 'h-9 w-9 shadow-lg',
              userButtonPopoverCard: 'shadow-xl border border-border/50',
              userButtonPopoverActionButton: 'hover:bg-gray-50',
              userButtonPopoverActionButtonText: 'text-gray-700',
              userButtonPopoverActionButtonIcon: 'text-gray-500',
              userButtonPopoverFooter: 'hidden',
            },
          }}
        />
        
        {/* Product Tour Button */}
        <button 
          onClick={onRestartTour}
          className={cn(
            'w-8 h-8 rounded-full',
            'bg-gray-100 hover:bg-[#006EE6] hover:text-white',
            'text-gray-600',
            'flex items-center justify-center',
            'text-lg font-bold',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[#006EE6] focus:ring-offset-2',
            'flex-shrink-0' // Ensure button doesn't shrink
          )}
          title="Take Product Tour"
        >
          ?
        </button>
      </div>
      </div> {/* End inner wrapper */}

        {/* Hide scrollbar CSS while maintaining scroll functionality */}
        <style jsx>{`
          header::-webkit-scrollbar {
            display: none;
          }
          header {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
        `}</style>
      </header>

      {/* Scroll Indicator Fades - positioned outside scrolling header */}
      {isScrolledLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none z-10 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to right, rgba(0, 0, 0, 0.15) 0%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      )}
      
      {isScrolledRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none z-10 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(to left, rgba(0, 0, 0, 0.15) 0%, transparent 100%)',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
