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
import type { Project } from '@/lib/types/project';
import type { BrandVoice, BrandAlignmentResult } from '@/lib/types/brand';
import {
  getAllProjects,
  getActiveProjectId,
  setActiveProjectId as setStorageActiveProjectId,
  updateProject as updateStorageProject,
  deleteProject as deleteStorageProject,
} from '@/lib/storage/project-storage';
import { 
  fetchWithTimeout, 
  retryWithBackoff, 
  formatErrorForUser, 
  validateTextLength, 
  validateNotEmpty,
  logError
} from '@/lib/utils/error-handling';

/**
 * Tone types for the Tone Shifter
 */
export type ToneType = 'professional' | 'casual' | 'urgent' | 'friendly' | 'techy' | 'playful';

/**
 * Workspace state interface
 */
interface WorkspaceState {
  // Project state
  projects: Project[];
  activeProjectId: string | null;
  
  // Document state
  activeDocument: Document | null;
  
  // UI state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeToolId: string | null; // New: tracks which tool is active in right sidebar
  aiAnalysisMode: AIAnalysisMode;
  
  // Editor selection state
  selectedText: string | null; // The actual selected text content
  selectionRange: { from: number; to: number } | null; // Position in editor
  
  // Tone Shifter state
  toneShiftResult: string | null;
  toneShiftLoading: boolean;
  toneShiftError: string | null;
  selectedTone: ToneType | null;
  
  // Expand Tool state
  expandResult: string | null;
  expandLoading: boolean;
  expandError: string | null;
  
  // Shorten Tool state
  shortenResult: string | null;
  shortenLoading: boolean;
  shortenError: string | null;
  
  // Rewrite Channel Tool state
  rewriteChannelResult: string | null;
  rewriteChannelLoading: boolean;
  rewriteChannelError: string | null;
  
  // Brand Alignment Tool state
  brandAlignmentResult: BrandAlignmentResult | null;
  brandAlignmentLoading: boolean;
  brandAlignmentError: string | null;
  
  // Template Generator state
  selectedTemplateId: string | null;
  isGeneratingTemplate: boolean;
  
  // Project actions
  setProjects: (projects: Project[]) => void;
  setActiveProjectId: (id: string) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  refreshProjects: () => void;
  
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
  
  // Editor selection actions
  setSelectedText: (text: string | null, range: { from: number; to: number } | null) => void;
  clearSelection: () => void;
  
  // Tone Shifter actions
  setSelectedTone: (tone: ToneType | null) => void;
  runToneShift: (text: string, tone: ToneType) => Promise<void>;
  clearToneShiftResult: () => void;
  insertToneShiftResult: (editor: Editor) => void;
  
  // Expand Tool actions
  runExpand: (text: string) => Promise<void>;
  clearExpandResult: () => void;
  insertExpandResult: (editor: Editor) => void;
  
  // Shorten Tool actions
  runShorten: (text: string) => Promise<void>;
  clearShortenResult: () => void;
  insertShortenResult: (editor: Editor) => void;
  
  // Rewrite Channel Tool actions
  runRewriteChannel: (text: string, channel: string) => Promise<void>;
  clearRewriteChannelResult: () => void;
  insertRewriteChannelResult: (editor: Editor) => void;
  
  // Brand Alignment Tool actions
  runBrandAlignment: (text: string, brandVoice: BrandVoice) => Promise<void>;
  clearBrandAlignmentResult: () => void;
  
  // Template Generator actions
  setSelectedTemplateId: (id: string | null) => void;
  setIsGeneratingTemplate: (isGenerating: boolean) => void;
}

/**
 * Zustand store with persistence
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Initial project state
      projects: [],
      activeProjectId: null,
      
      // Initial state
      activeDocument: null,
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      activeToolId: null, // Updated: now using tool ID
      aiAnalysisMode: null,
      
      // Editor selection initial state
      selectedText: null,
      selectionRange: null,
      
      // Tone Shifter initial state
      toneShiftResult: null,
      toneShiftLoading: false,
      toneShiftError: null,
      selectedTone: null,
      
      // Expand Tool initial state
      expandResult: null,
      expandLoading: false,
      expandError: null,
      
      // Shorten Tool initial state
      shortenResult: null,
      shortenLoading: false,
      shortenError: null,
      
      // Rewrite Channel Tool initial state
      rewriteChannelResult: null,
      rewriteChannelLoading: false,
      rewriteChannelError: null,
      
      // Brand Alignment Tool initial state
      brandAlignmentResult: null,
      brandAlignmentLoading: false,
      brandAlignmentError: null,
      
      // Template Generator initial state
      selectedTemplateId: null,
      isGeneratingTemplate: false,

      // Project actions
      setProjects: (projects: Project[]) => {
        set({ projects });
        console.log('📂 Projects set:', projects.length);
      },

      setActiveProjectId: (id: string) => {
        set({ activeProjectId: id });
        setStorageActiveProjectId(id);
        console.log('✅ Active project set:', id);
        
        // Clear tool results when switching projects
        set({
          brandAlignmentResult: null,
          brandAlignmentError: null,
          toneShiftResult: null,
          toneShiftError: null,
          expandResult: null,
          expandError: null,
          shortenResult: null,
          shortenError: null,
          rewriteChannelResult: null,
          rewriteChannelError: null,
        });
      },

      addProject: (project: Project) => {
        const { projects } = get();
        set({ projects: [...projects, project] });
        console.log('➕ Project added:', project.name);
      },

      updateProject: (id: string, updates: Partial<Project>) => {
        const { projects } = get();
        const index = projects.findIndex((p) => p.id === id);
        
        if (index === -1) {
          console.error('❌ Project not found:', id);
          return;
        }
        
        // Update in storage
        updateStorageProject(id, updates);
        
        // Update in state
        const updatedProjects = [...projects];
        updatedProjects[index] = {
          ...updatedProjects[index],
          ...updates,
          id: updatedProjects[index].id, // Prevent ID change
          updatedAt: new Date().toISOString(),
        };
        
        set({ projects: updatedProjects });
        console.log('✅ Project updated:', id);
      },

      deleteProject: (id: string) => {
        const { projects } = get();
        
        // Prevent deletion of last project
        if (projects.length <= 1) {
          console.error('❌ Cannot delete last project');
          return;
        }
        
        try {
          // Delete from storage
          deleteStorageProject(id);
          
          // Remove from state
          const updatedProjects = projects.filter((p) => p.id !== id);
          set({ projects: updatedProjects });
          
          console.log('🗑️ Project deleted:', id);
        } catch (error) {
          console.error('❌ Failed to delete project:', error);
        }
      },

      refreshProjects: () => {
        const projects = getAllProjects();
        const activeProjectId = getActiveProjectId();
        
        set({ projects, activeProjectId });
        console.log('🔄 Projects refreshed:', projects.length);
      },

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

      // Editor selection actions
      setSelectedText: (text: string | null, range: { from: number; to: number } | null) => {
        set({ 
          selectedText: text, 
          selectionRange: range 
        });
        
        if (text && text.length > 0) {
          console.log('📝 Text selected:', {
            length: text.length,
            range,
            preview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
          });
        }
      },

      clearSelection: () => {
        set({ 
          selectedText: null, 
          selectionRange: null 
        });
        console.log('🧹 Selection cleared');
      },

      // Tone Shifter actions
      setSelectedTone: (tone: ToneType | null) => {
        set({ selectedTone: tone });
        console.log('🎨 Selected tone:', tone);
      },

      runToneShift: async (text: string, tone: ToneType) => {
        // Validate inputs
        try {
          validateNotEmpty(text, 'Text');
          validateTextLength(text, 'Text');
        } catch (error) {
          set({ 
            toneShiftError: formatErrorForUser(error, 'Validation'),
            toneShiftLoading: false 
          });
          logError(error, 'Tone shift validation');
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
          // Call API with retry logic
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/tone-shift', {
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

            return data;
          }, 2); // Retry up to 2 times

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
          // Handle errors with user-friendly message
          const errorMessage = formatErrorForUser(error, 'Tone shift');
          
          set({ 
            toneShiftError: errorMessage,
            toneShiftLoading: false,
            toneShiftResult: null 
          });
          
          logError(error, 'Tone shift');
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

      // Expand Tool actions
      runExpand: async (text: string) => {
        // Validate inputs
        try {
          validateNotEmpty(text, 'Text');
          validateTextLength(text, 'Text');
        } catch (error) {
          set({ 
            expandError: formatErrorForUser(error, 'Validation'),
            expandLoading: false 
          });
          logError(error, 'Expand validation');
          return;
        }

        // Set loading state
        set({ 
          expandLoading: true, 
          expandError: null,
          expandResult: null 
        });
        console.log('🔄 Starting expand:', { textLength: text.length });

        try {
          // Call API with retry logic
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/expand', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ 
                error: 'API request failed',
                details: `Status: ${response.status}` 
              }));
              throw new Error(errorData.details || errorData.error || 'Failed to expand copy');
            }

            const data = await response.json();
            if (!data.expandedText) {
              throw new Error('No expanded text received from API');
            }

            return data;
          }, 2);

          // Update state with result
          set({ 
            expandResult: data.expandedText,
            expandLoading: false,
            expandError: null 
          });
          
          console.log('✅ Expand complete:', {
            originalLength: data.originalLength,
            newLength: data.newLength,
            preview: data.expandedText.substring(0, 50) + '...'
          });

        } catch (error) {
          set({ 
            expandError: formatErrorForUser(error, 'Expand'),
            expandLoading: false,
            expandResult: null 
          });
          logError(error, 'Expand');
        }
      },

      clearExpandResult: () => {
        set({ 
          expandResult: null,
          expandError: null 
        });
        console.log('🧹 Expand result cleared');
      },

      insertExpandResult: (editor: Editor) => {
        const { expandResult } = get();
        
        if (!expandResult) {
          console.warn('⚠️ No expand result to insert');
          return;
        }

        if (!editor) {
          console.error('❌ No editor instance provided');
          set({ expandError: 'Editor not available' });
          return;
        }

        try {
          // Replace all content in the editor with the expanded copy
          editor.commands.setContent(expandResult);
          
          // Update the document content in the store
          get().updateDocumentContent(expandResult);
          
          console.log('✅ Expand result inserted into editor');
          
          // Clear the result after inserting
          set({ 
            expandResult: null,
            expandError: null 
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to insert content';
          
          set({ expandError: errorMessage });
          console.error('❌ Failed to insert expand result:', errorMessage);
        }
      },

      // Shorten Tool actions
      runShorten: async (text: string) => {
        // Validate inputs
        try {
          validateNotEmpty(text, 'Text');
          validateTextLength(text, 'Text');
        } catch (error) {
          set({ 
            shortenError: formatErrorForUser(error, 'Validation'),
            shortenLoading: false 
          });
          logError(error, 'Shorten validation');
          return;
        }

        // Set loading state
        set({ 
          shortenLoading: true, 
          shortenError: null,
          shortenResult: null 
        });
        console.log('🔄 Starting shorten:', { textLength: text.length });

        try {
          // Call API with retry logic
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/shorten', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ 
                error: 'API request failed',
                details: `Status: ${response.status}` 
              }));
              throw new Error(errorData.details || errorData.error || 'Failed to shorten copy');
            }

            const data = await response.json();
            if (!data.shortenedText) {
              throw new Error('No shortened text received from API');
            }

            return data;
          }, 2);

          // Update state with result
          set({ 
            shortenResult: data.shortenedText,
            shortenLoading: false,
            shortenError: null 
          });
          
          console.log('✅ Shorten complete:', {
            originalLength: data.originalLength,
            newLength: data.newLength,
            preview: data.shortenedText.substring(0, 50) + '...'
          });

        } catch (error) {
          set({ 
            shortenError: formatErrorForUser(error, 'Shorten'),
            shortenLoading: false,
            shortenResult: null 
          });
          logError(error, 'Shorten');
        }
      },

      clearShortenResult: () => {
        set({ 
          shortenResult: null,
          shortenError: null 
        });
        console.log('🧹 Shorten result cleared');
      },

      insertShortenResult: (editor: Editor) => {
        const { shortenResult } = get();
        
        if (!shortenResult) {
          console.warn('⚠️ No shorten result to insert');
          return;
        }

        if (!editor) {
          console.error('❌ No editor instance provided');
          set({ shortenError: 'Editor not available' });
          return;
        }

        try {
          // Replace all content in the editor with the shortened copy
          editor.commands.setContent(shortenResult);
          
          // Update the document content in the store
          get().updateDocumentContent(shortenResult);
          
          console.log('✅ Shorten result inserted into editor');
          
          // Clear the result after inserting
          set({ 
            shortenResult: null,
            shortenError: null 
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to insert content';
          
          set({ shortenError: errorMessage });
          console.error('❌ Failed to insert shorten result:', errorMessage);
        }
      },

      // Rewrite Channel Tool actions
      runRewriteChannel: async (text: string, channel: string) => {
        // Validate inputs
        try {
          validateNotEmpty(text, 'Text');
          validateTextLength(text, 'Text');
          validateNotEmpty(channel, 'Channel');
        } catch (error) {
          set({ 
            rewriteChannelError: formatErrorForUser(error, 'Validation'),
            rewriteChannelLoading: false 
          });
          logError(error, 'Rewrite channel validation');
          return;
        }

        // Set loading state
        set({ 
          rewriteChannelLoading: true, 
          rewriteChannelError: null,
          rewriteChannelResult: null 
        });
        console.log('🔄 Starting rewrite channel:', { channel, textLength: text.length });

        try {
          // Call API with retry logic
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/rewrite-channel', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text, channel }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ 
                error: 'API request failed',
                details: `Status: ${response.status}` 
              }));
              throw new Error(errorData.details || errorData.error || 'Failed to rewrite copy');
            }

            const data = await response.json();
            if (!data.rewrittenText) {
              throw new Error('No rewritten text received from API');
            }

            return data;
          }, 2);

          // Update state with result
          set({ 
            rewriteChannelResult: data.rewrittenText,
            rewriteChannelLoading: false,
            rewriteChannelError: null 
          });
          
          console.log('✅ Rewrite channel complete:', {
            channel,
            originalLength: data.originalLength,
            newLength: data.newLength,
            preview: data.rewrittenText.substring(0, 50) + '...'
          });

        } catch (error) {
          set({ 
            rewriteChannelError: formatErrorForUser(error, 'Rewrite channel'),
            rewriteChannelLoading: false,
            rewriteChannelResult: null 
          });
          logError(error, 'Rewrite channel');
        }
      },

      clearRewriteChannelResult: () => {
        set({ 
          rewriteChannelResult: null,
          rewriteChannelError: null 
        });
        console.log('🧹 Rewrite channel result cleared');
      },

      insertRewriteChannelResult: (editor: Editor) => {
        const { rewriteChannelResult } = get();
        
        if (!rewriteChannelResult) {
          console.warn('⚠️ No rewrite channel result to insert');
          return;
        }

        if (!editor) {
          console.error('❌ No editor instance provided');
          set({ rewriteChannelError: 'Editor not available' });
          return;
        }

        try {
          // Replace all content in the editor with the rewritten copy
          editor.commands.setContent(rewriteChannelResult);
          
          // Update the document content in the store
          get().updateDocumentContent(rewriteChannelResult);
          
          console.log('✅ Rewrite channel result inserted into editor');
          
          // Clear the result after inserting
          set({ 
            rewriteChannelResult: null,
            rewriteChannelError: null 
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to insert content';
          
          set({ rewriteChannelError: errorMessage });
          console.error('❌ Failed to insert rewrite channel result:', errorMessage);
        }
      },

      // Brand Alignment Tool actions
      runBrandAlignment: async (text: string, brandVoice: BrandVoice): Promise<void> => {
        // Validate inputs
        try {
          validateNotEmpty(text, 'Text');
          validateTextLength(text, 'Text');
          
          if (!brandVoice || !brandVoice.brandName) {
            throw new Error('Please set up your brand voice first');
          }
        } catch (error) {
          set({ 
            brandAlignmentError: formatErrorForUser(error, 'Validation'),
            brandAlignmentLoading: false 
          });
          logError(error, 'Brand alignment validation');
          return;
        }

        // Set loading state
        set({ 
          brandAlignmentLoading: true, 
          brandAlignmentError: null,
          brandAlignmentResult: null 
        });
        console.log('🔄 Starting brand alignment check:', { textLength: text.length, brand: brandVoice.brandName });

        try {
          // Call API with retry logic
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/brand-alignment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text, brandVoice }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ 
                error: 'API request failed',
                details: `Status: ${response.status}` 
              }));
              throw new Error(errorData.details || errorData.error || 'Failed to check brand alignment');
            }

            const data = await response.json();
            if (!data.result) {
              throw new Error('No result received from API');
            }

            return data;
          }, 2);

          // Update state with result
          set({ 
            brandAlignmentResult: data.result,
            brandAlignmentLoading: false,
            brandAlignmentError: null 
          });
          
          console.log('✅ Brand alignment check complete:', {
            score: data.result.score,
            matches: data.result.matches.length,
            violations: data.result.violations.length
          });

        } catch (error) {
          set({ 
            brandAlignmentError: formatErrorForUser(error, 'Brand alignment'),
            brandAlignmentLoading: false,
            brandAlignmentResult: null 
          });
          logError(error, 'Brand alignment');
        }
      },

      clearBrandAlignmentResult: () => {
        set({ 
          brandAlignmentResult: null,
          brandAlignmentError: null 
        });
        console.log('🧹 Brand alignment result cleared');
      },
      
      // Template Generator actions
      setSelectedTemplateId: (id: string | null) => {
        set({ selectedTemplateId: id });
        console.log('📝 Selected template ID:', id);
      },
      
      setIsGeneratingTemplate: (isGenerating: boolean) => {
        set({ isGeneratingTemplate: isGenerating });
        console.log('🔄 Template generation loading:', isGenerating);
      },
    }),
    {
      name: 'copyworx-workspace',
      // Persist only what we need
      partialize: (state) => ({
        activeDocument: state.activeDocument,
        activeProjectId: state.activeProjectId, // Persist active project
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

/**
 * Expand Tool selector hooks
 */
export const useExpandResult = () => useWorkspaceStore((state) => state.expandResult);
export const useExpandLoading = () => useWorkspaceStore((state) => state.expandLoading);
export const useExpandError = () => useWorkspaceStore((state) => state.expandError);

/**
 * Shorten Tool selector hooks
 */
export const useShortenResult = () => useWorkspaceStore((state) => state.shortenResult);
export const useShortenLoading = () => useWorkspaceStore((state) => state.shortenLoading);
export const useShortenError = () => useWorkspaceStore((state) => state.shortenError);

/**
 * Rewrite Channel Tool selector hooks
 */
export const useRewriteChannelResult = () => useWorkspaceStore((state) => state.rewriteChannelResult);
export const useRewriteChannelLoading = () => useWorkspaceStore((state) => state.rewriteChannelLoading);
export const useRewriteChannelError = () => useWorkspaceStore((state) => state.rewriteChannelError);

/**
 * Brand Alignment Tool selector hooks
 */
export const useBrandAlignmentResult = () => useWorkspaceStore((state) => state.brandAlignmentResult);
export const useBrandAlignmentLoading = () => useWorkspaceStore((state) => state.brandAlignmentLoading);
export const useBrandAlignmentError = () => useWorkspaceStore((state) => state.brandAlignmentError);

/**
 * Editor selection selector hooks
 */
export const useSelectedText = () => useWorkspaceStore((state) => state.selectedText);
export const useSelectionRange = () => useWorkspaceStore((state) => state.selectionRange);

/**
 * Project selector hooks
 */
export const useProjects = () => useWorkspaceStore((state) => state.projects);
export const useActiveProjectId = () => useWorkspaceStore((state) => state.activeProjectId);

/**
 * Template Generator selector hooks
 */
export const useSelectedTemplateId = () => useWorkspaceStore((state) => state.selectedTemplateId);
export const useIsGeneratingTemplate = () => useWorkspaceStore((state) => state.isGeneratingTemplate);

/**
 * Action selector hooks (for stable references to prevent re-renders)
 */
export const useToneShiftActions = () => useWorkspaceStore((state) => ({
  runToneShift: state.runToneShift,
  clearToneShiftResult: state.clearToneShiftResult,
  insertToneShiftResult: state.insertToneShiftResult,
  setSelectedTone: state.setSelectedTone,
}));

export const useExpandActions = () => useWorkspaceStore((state) => ({
  runExpand: state.runExpand,
  clearExpandResult: state.clearExpandResult,
  insertExpandResult: state.insertExpandResult,
}));

export const useShortenActions = () => useWorkspaceStore((state) => ({
  runShorten: state.runShorten,
  clearShortenResult: state.clearShortenResult,
  insertShortenResult: state.insertShortenResult,
}));

export const useRewriteChannelActions = () => useWorkspaceStore((state) => ({
  runRewriteChannel: state.runRewriteChannel,
  clearRewriteChannelResult: state.clearRewriteChannelResult,
  insertRewriteChannelResult: state.insertRewriteChannelResult,
}));

export const useBrandAlignmentActions = () => useWorkspaceStore((state) => ({
  runBrandAlignment: state.runBrandAlignment,
  clearBrandAlignmentResult: state.clearBrandAlignmentResult,
}));

export const useProjectActions = () => useWorkspaceStore((state) => ({
  setActiveProjectId: state.setActiveProjectId,
  addProject: state.addProject,
  updateProject: state.updateProject,
  deleteProject: state.deleteProject,
  refreshProjects: state.refreshProjects,
}));

export const useDocumentActions = () => useWorkspaceStore((state) => ({
  createDocument: state.createDocument,
  updateDocumentTitle: state.updateDocumentTitle,
  setSelectedText: state.setSelectedText,
  setSelectionRange: state.setSelectionRange,
}));

export const useUIActions = () => useWorkspaceStore((state) => ({
  toggleLeftSidebar: state.toggleLeftSidebar,
  toggleRightSidebar: state.toggleRightSidebar,
  setLeftSidebarOpen: state.setLeftSidebarOpen,
  setRightSidebarOpen: state.setRightSidebarOpen,
  setActiveToolId: state.setActiveToolId,
  setActiveTool: state.setActiveTool,
  setAIAnalysisMode: state.setAIAnalysisMode,
}));

export const useTemplateActions = () => useWorkspaceStore((state) => ({
  setSelectedTemplateId: state.setSelectedTemplateId,
  setIsGeneratingTemplate: state.setIsGeneratingTemplate,
  clearToneShiftResult: state.clearToneShiftResult,
  clearExpandResult: state.clearExpandResult,
  clearShortenResult: state.clearShortenResult,
  clearRewriteChannelResult: state.clearRewriteChannelResult,
  clearBrandAlignmentResult: state.clearBrandAlignmentResult,
}));
