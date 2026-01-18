/**
 * @file lib/tiptap/font-size.ts
 * @description Custom TipTap extension for font size support
 * 
 * This extension adds font-size styling capability to TipTap editor.
 * It works with the TextStyle extension to apply inline styles.
 * 
 * Usage:
 * - editor.chain().focus().setFontSize('16px').run()
 * - editor.chain().focus().unsetFontSize().run()
 * - editor.getAttributes('textStyle').fontSize
 */

import { Extension } from '@tiptap/core';

export interface FontSizeOptions {
  /**
   * Available font sizes that can be applied.
   * Default includes common sizes from 8px to 72px.
   */
  sizes: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size
       */
      setFontSize: (size: string) => ReturnType;
      /**
       * Unset the font size
       */
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * FontSize extension for TipTap
 * 
 * Adds font-size as a style attribute to the textStyle mark.
 * Requires @tiptap/extension-text-style to be installed.
 */
export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      sizes: ['8px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px', '72px'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

export default FontSize;
