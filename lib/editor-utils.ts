/**
 * @file lib/editor-utils.ts
 * @description Utility functions for TipTap editor operations
 * 
 * Provides abstraction layer over TipTap API for common operations:
 * - Getting selected text and range
 * - Inserting text at selection
 * - Replacing selection with new content
 */

import type { Editor } from '@tiptap/react';

/**
 * Selection data returned by getEditorSelection
 */
export interface EditorSelection {
  text: string;
  html: string;
  range: {
    from: number;
    to: number;
  };
}

/**
 * Gets the current text selection from the editor
 * 
 * @param editor - TipTap editor instance
 * @returns Selection data or null if no selection or editor unavailable
 * 
 * @example
 * ```ts
 * const selection = getEditorSelection(editor);
 * if (selection) {
 *   console.log('Selected:', selection.text);
 *   console.log('Range:', selection.range);
 * }
 * ```
 */
export function getEditorSelection(editor: Editor | null): EditorSelection | null {
  if (!editor) {
    console.warn('⚠️ getEditorSelection: No editor instance');
    return null;
  }

  try {
    const { from, to } = editor.state.selection;
    
    // No selection (cursor is just positioned, from === to)
    if (from === to) {
      console.log('📍 No text selected (cursor only)');
      return null;
    }

    // Get the selected text (plain text)
    const text = editor.state.doc.textBetween(from, to, ' ');
    
    // Get the selected HTML content
    const html = editor.getHTML().substring(from, to);
    
    if (!text || text.trim().length === 0) {
      console.log('⚠️ Selection is empty');
      return null;
    }

    return {
      text: text.trim(),
      html,
      range: { from, to },
    };
  } catch (error) {
    console.error('❌ Error getting editor selection:', error);
    return null;
  }
}

/**
 * Inserts or replaces text at the current selection in the editor
 * 
 * If there's a selection, it will be replaced with the new text.
 * If there's no selection (just a cursor), the text will be inserted at the cursor position.
 * 
 * @param editor - TipTap editor instance
 * @param text - Text content to insert (can be plain text or HTML)
 * @param options - Optional configuration
 * @param options.isHTML - Whether the text is HTML (default: false)
 * @param options.selectInserted - Whether to select the inserted text after insertion (default: false)
 * @returns true if successful, false otherwise
 * 
 * @example
 * ```ts
 * // Replace selection with plain text
 * insertTextAtSelection(editor, 'New text here');
 * 
 * // Replace selection with HTML
 * insertTextAtSelection(editor, '<p>HTML content</p>', { isHTML: true });
 * 
 * // Insert and select the new text
 * insertTextAtSelection(editor, 'New text', { selectInserted: true });
 * ```
 */
export function insertTextAtSelection(
  editor: Editor | null,
  text: string,
  options: {
    isHTML?: boolean;
    selectInserted?: boolean;
  } = {}
): boolean {
  if (!editor) {
    console.error('❌ insertTextAtSelection: No editor instance');
    return false;
  }

  if (!text) {
    console.warn('⚠️ insertTextAtSelection: No text provided');
    return false;
  }

  const { isHTML = false, selectInserted = false } = options;

  try {
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    console.log('📝 Inserting text at selection:', {
      from,
      to,
      hasSelection,
      textLength: text.length,
      isHTML,
      selectInserted,
    });

    // Use TipTap commands to replace selection with new content
    // Using deleteSelection() ensures proper transaction handling and update events
    if (hasSelection) {
      editor
        .chain()
        .focus()
        .deleteSelection() // Delete current selection (preferred over deleteRange)
        .insertContent(text) // Insert new content
        .run();
    } else {
      // No selection - just insert at cursor
      editor
        .chain()
        .focus()
        .insertContent(text)
        .run();
    }

    // Optionally select the inserted text
    if (selectInserted && hasSelection) {
      const newTo = from + text.length;
      editor.commands.setTextSelection({ from, to: newTo });
    }

    console.log('✅ Text inserted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error inserting text at selection:', error);
    return false;
  }
}

/**
 * Replaces the entire editor content
 * 
 * @param editor - TipTap editor instance
 * @param content - New content (HTML string)
 * @returns true if successful, false otherwise
 * 
 * @example
 * ```ts
 * replaceEditorContent(editor, '<p>New document content</p>');
 * ```
 */
export function replaceEditorContent(
  editor: Editor | null,
  content: string
): boolean {
  if (!editor) {
    console.error('❌ replaceEditorContent: No editor instance');
    return false;
  }

  try {
    editor.commands.setContent(content);
    console.log('✅ Editor content replaced');
    return true;
  } catch (error) {
    console.error('❌ Error replacing editor content:', error);
    return false;
  }
}

/**
 * Gets the full text content of the editor (plain text, no HTML)
 * 
 * @param editor - TipTap editor instance
 * @returns Plain text content or empty string if unavailable
 */
export function getEditorText(editor: Editor | null): string {
  if (!editor) {
    return '';
  }
  
  return editor.getText();
}

/**
 * Gets the full HTML content of the editor
 * 
 * @param editor - TipTap editor instance
 * @returns HTML content or empty string if unavailable
 */
export function getEditorHTML(editor: Editor | null): string {
  if (!editor) {
    return '';
  }
  
  return editor.getHTML();
}

/**
 * Checks if the editor has any selected text
 * 
 * @param editor - TipTap editor instance
 * @returns true if text is selected, false otherwise
 */
export function hasSelection(editor: Editor | null): boolean {
  if (!editor) {
    return false;
  }

  const { from, to } = editor.state.selection;
  return from !== to;
}
