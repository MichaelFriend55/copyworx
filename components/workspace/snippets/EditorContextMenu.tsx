/**
 * @file components/workspace/snippets/EditorContextMenu.tsx
 * @description Custom context menu for the editor with "Save as Snippet" option
 * 
 * Features:
 * - Shows on right-click when text is selected
 * - "Save as Snippet" option
 * - Positioned at mouse cursor
 * - Closes on click outside or ESC
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Paperclip, Copy, Scissors, ClipboardPaste } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props for EditorContextMenu
 */
interface EditorContextMenuProps {
  /** Whether the menu is visible */
  isVisible: boolean;
  /** Position of the menu */
  position: { x: number; y: number };
  /** Whether text is selected */
  hasSelection: boolean;
  /** The selected text (plain text) */
  selectedText: string;
  /** The selected HTML content */
  selectedHtml: string;
  /** Callback to close the menu */
  onClose: () => void;
  /** Callback when "Save as Snippet" is clicked */
  onSaveAsSnippet: (html: string, text: string) => void;
}

/**
 * EditorContextMenu - Custom right-click menu for the editor
 */
export function EditorContextMenu({
  isVisible,
  position,
  hasSelection,
  selectedText,
  selectedHtml,
  onClose,
  onSaveAsSnippet,
}: EditorContextMenuProps) {
  // Close on ESC key
  useEffect(() => {
    if (!isVisible) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);
  
  // Close on click outside
  useEffect(() => {
    if (!isVisible) return;
    
    const handleClickOutside = () => {
      onClose();
    };
    
    // Delay to prevent immediate close on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isVisible, onClose]);
  
  const handleSaveAsSnippet = useCallback(() => {
    onSaveAsSnippet(selectedHtml, selectedText);
    onClose();
  }, [selectedHtml, selectedText, onSaveAsSnippet, onClose]);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      console.log('📋 Text copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    onClose();
  }, [selectedText, onClose]);
  
  const handleCut = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      // Note: The actual cut operation would need to be handled by the editor
      console.log('✂️ Text cut to clipboard');
    } catch (err) {
      console.error('Failed to cut:', err);
    }
    onClose();
  }, [selectedText, onClose]);
  
  if (!isVisible) return null;
  
  // Adjust position to keep menu on screen
  const menuWidth = 200;
  const menuHeight = hasSelection ? 160 : 60;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 10);
  
  return (
    <div
      className={cn(
        'fixed z-[100] min-w-[180px] p-1 rounded-lg shadow-xl',
        'bg-popover border border-border',
        'animate-in fade-in-0 zoom-in-95 duration-100'
      )}
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      {hasSelection && (
        <>
          {/* Save as Snippet - Primary action */}
          <button
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md',
              'hover:bg-amber-50 hover:text-amber-700 transition-colors',
              'focus:outline-none focus:bg-amber-50'
            )}
            onClick={handleSaveAsSnippet}
          >
            <Paperclip className="w-4 h-4 text-amber-500" />
            <span className="font-medium">Save as Snippet</span>
          </button>
          
          <div className="border-t border-border my-1" />
          
          {/* Copy */}
          <button
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md',
              'hover:bg-accent transition-colors',
              'focus:outline-none focus:bg-accent'
            )}
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
            <span>Copy</span>
          </button>
          
          {/* Cut */}
          <button
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md',
              'hover:bg-accent transition-colors',
              'focus:outline-none focus:bg-accent'
            )}
            onClick={handleCut}
          >
            <Scissors className="w-4 h-4 text-muted-foreground" />
            <span>Cut</span>
          </button>
        </>
      )}
      
      {!hasSelection && (
        <div className="px-3 py-2 text-sm text-muted-foreground italic">
          Select text to see options
        </div>
      )}
    </div>
  );
}
