/**
 * @file lib/stores/workspaceStore.ts
 * @description Zustand store for managing workspace state - REBUILT FOR PROPER PERSISTENCE
 * 
 * Manages:
 * - Active document with automatic persistence
 * - Sidebar visibility
 * - Tool and AI analysis state
 * - Document CRUD operations with debugging
 * - Tone Shifter functionality
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Document, ToolCategory, AIAnalysisMode } from '@/lib/types';
import type { Editor } from '@tiptap/react';

/**
 * Tone types for the Tone Shifter
 */
export type ToneType = 'professional' | 'casual' | 'urgent' | 'friendly';

/**
 * Workspace state interface
 */
interface WorkspaceState {
  // Document state
  activeDocument: Document | null;
  
  // UI state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeToolId: string | null; // New: tracks which tool is active in right sidebar
  aiAnalysisMode: AIAnalysisMode;
  
  // Tone Shifter state
  toneShiftResult: string | null;
  toneShiftLoading: boolean;
  toneShiftError: string | null;
  selectedTone: ToneType | null;
  
  // Document actions
  createDocument: (title: string) => void;
  updateDocumentContent: (content: string) => void;
  updateDocumentTitle: (title: string) => void;
  loadDocument: (id: string) => void;
  clearActiveDocument: () => void;
  
  // UI actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setActiveTool: (toolId: string | null) => void; // Updated: now accepts tool ID string
  clearActiveTool: () => void; // New: clear active tool
  setAIAnalysisMode: (mode: AIAnalysisMode) => void;
  
  // Tone Shifter actions
  setSelectedTone: (tone: ToneType | null) => void;
  runToneShift: (text: string, tone: ToneType) => Promise<void>;
  clearToneShiftResult: () => void;
  insertToneShiftResult: (editor: Editor) => void;
}

/**
 * Zustand store with persistence
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeDocument: null,
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      activeToolId: null, // Updated: now using tool ID
      aiAnalysisMode: null,
      
      // Tone Shifter initial state
      toneShiftResult: null,
      toneShiftLoading: false,
      toneShiftError: null,
      selectedTone: null,

      // Document actions
      createDocument: (title: string) => {
        const newDoc: Document = {
          id: crypto.randomUUID(),
          title: title || 'Untitled Document',
          content: '',
          createdAt: new Date(),
          modifiedAt: new Date(),
          metadata: {
            wordCount: 0,
            charCount: 0,
            tags: [],
          },
        };
        
        set({ activeDocument: newDoc });
        console.log('✅ Document created:', {
          id: newDoc.id,
          title: newDoc.title,
        });
      },

      updateDocumentContent: (content: string) => {
        const { activeDocument } = get();
        if (!activeDocument) {
          console.warn('⚠️ No active document to update');
          return;
        }

        // Calculate word count
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
        
        const updated: Document = {
          ...activeDocument,
          content,
          modifiedAt: new Date(),
          metadata: {
            ...activeDocument.metadata,
            wordCount,
            charCount: content.length,
          },
        };
        
        set({ activeDocument: updated });
        console.log('💾 Content saved to store:', {
          id: updated.id,
          contentLength: content.length,
          wordCount,
          preview: content.substring(0, 50) + '...',
        });
      },

      updateDocumentTitle: (title: string) => {
        const { activeDocument } = get();
        if (!activeDocument) return;

        const updated: Document = {
          ...activeDocument,
          title,
          modifiedAt: new Date(),
        };
        
        set({ activeDocument: updated });
        console.log('📝 Title updated:', title);
      },

      loadDocument: (id: string) => {
        console.log('📂 Loading document:', id);
        // Future: Load from documents array or API
      },

      clearActiveDocument: () => {
        set({ activeDocument: null });
        console.log('🗑️ Active document cleared');
      },

      // UI actions
      toggleLeftSidebar: () => {
        set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen }));
      },

      toggleRightSidebar: () => {
        set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }));
      },

      setLeftSidebarOpen: (open: boolean) => {
        set({ leftSidebarOpen: open });
      },

      setRightSidebarOpen: (open: boolean) => {
        set({ rightSidebarOpen: open });
      },

      setActiveTool: (toolId: string | null) => {
        set({ activeToolId: toolId });
        console.log('🔧 Active tool set:', toolId, '| Right sidebar open:', get().rightSidebarOpen);
        
        // Auto-open right sidebar when a tool is activated
        if (toolId !== null && !get().rightSidebarOpen) {
          set({ rightSidebarOpen: true });
          console.log('📂 Auto-opened right sidebar');
        }
      },

      clearActiveTool: () => {
        set({ activeToolId: null });
        console.log('🧹 Active tool cleared');
      },

      setAIAnalysisMode: (mode: AIAnalysisMode) => {
        set({ aiAnalysisMode: mode });
        
        // Auto-open right sidebar when analysis mode is activated
        if (mode !== null && !get().rightSidebarOpen) {
          set({ rightSidebarOpen: true });
        }
      },

      // Tone Shifter actions
      setSelectedTone: (tone: ToneType | null) => {
        set({ selectedTone: tone });
        console.log('🎨 Selected tone:', tone);
      },

      runToneShift: async (text: string, tone: ToneType) => {
        // Validate inputs
        if (!text || text.trim().length === 0) {
          set({ 
            toneShiftError: 'Please provide text to rewrite',
            toneShiftLoading: false 
          });
          console.warn('⚠️ Tone shift called with empty text');
          return;
        }

        // Set loading state
        set({ 
          toneShiftLoading: true, 
          toneShiftError: null,
          toneShiftResult: null 
        });
        console.log('🔄 Starting tone shift:', { tone, textLength: text.length });

        try {
          // Call the tone-shift API (relative URL)
          const response = await fetch('/api/tone-shift', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, tone }),
          });

          // Handle non-OK responses
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
              error: 'API request failed',
              details: `Status: ${response.status}` 
            }));
            
            throw new Error(errorData.details || errorData.error || 'Failed to rewrite copy');
          }

          // Parse successful response
          const data = await response.json();
          
          if (!data.rewrittenText) {
            throw new Error('No rewritten text received from API');
          }

          // Update state with result
          set({ 
            toneShiftResult: data.rewrittenText,
            toneShiftLoading: false,
            toneShiftError: null 
          });
          
          console.log('✅ Tone shift complete:', {
            originalLength: data.originalLength,
            newLength: data.newLength,
            preview: data.rewrittenText.substring(0, 50) + '...'
          });

        } catch (error) {
          // Handle errors
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'An unexpected error occurred';
          
          set({ 
            toneShiftError: errorMessage,
            toneShiftLoading: false,
            toneShiftResult: null 
          });
          
          console.error('❌ Tone shift error:', errorMessage);
        }
      },

      clearToneShiftResult: () => {
        set({ 
          toneShiftResult: null,
          toneShiftError: null,
          selectedTone: null 
        });
        console.log('🧹 Tone shift result cleared');
      },

      insertToneShiftResult: (editor: Editor) => {
        const { toneShiftResult } = get();
        
        if (!toneShiftResult) {
          console.warn('⚠️ No tone shift result to insert');
          return;
        }

        if (!editor) {
          console.error('❌ No editor instance provided');
          set({ toneShiftError: 'Editor not available' });
          return;
        }

        try {
          // Replace all content in the editor with the rewritten copy
          editor.commands.setContent(toneShiftResult);
          
          // Update the document content in the store
          get().updateDocumentContent(toneShiftResult);
          
          console.log('✅ Tone shift result inserted into editor');
          
          // Clear the result after inserting
          set({ 
            toneShiftResult: null,
            toneShiftError: null 
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to insert content';
          
          set({ toneShiftError: errorMessage });
          console.error('❌ Failed to insert tone shift result:', errorMessage);
        }
      },
    }),
    {
      name: 'copyworx-workspace',
      // Persist only what we need
      partialize: (state) => ({
        activeDocument: state.activeDocument,
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        activeToolId: state.activeToolId, // Updated: persist tool ID
        aiAnalysisMode: state.aiAnalysisMode,
      }),
    }
  )
);

/**
 * Selector hooks for optimized re-renders
 */
export const useActiveDocument = () => useWorkspaceStore((state) => state.activeDocument);
export const useLeftSidebarOpen = () => useWorkspaceStore((state) => state.leftSidebarOpen);
export const useRightSidebarOpen = () => useWorkspaceStore((state) => state.rightSidebarOpen);
export const useActiveToolId = () => useWorkspaceStore((state) => state.activeToolId); // Updated: renamed hook
export const useAIAnalysisMode = () => useWorkspaceStore((state) => state.aiAnalysisMode);

/**
 * Tone Shifter selector hooks
 */
export const useToneShiftResult = () => useWorkspaceStore((state) => state.toneShiftResult);
export const useToneShiftLoading = () => useWorkspaceStore((state) => state.toneShiftLoading);
export const useToneShiftError = () => useWorkspaceStore((state) => state.toneShiftError);
export const useSelectedTone = () => useWorkspaceStore((state) => state.selectedTone);
