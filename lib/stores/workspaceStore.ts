/**
 * @file lib/stores/workspaceStore.ts
 * @description Zustand store for managing workspace UI state
 * 
 * ARCHITECTURE (Simplified):
 * - Zustand tracks UI state ONLY (sidebar visibility, active IDs, tool results)
 * - Document CONTENT is stored in localStorage via document-storage.ts
 * - No document content caching in Zustand = no sync issues
 * 
 * Manages:
 * - Active document ID (not content!)
 * - Active project ID
 * - Sidebar visibility
 * - Tool and AI analysis state
 * - Tone Shifter, Expand, Shorten, Rewrite functionality
 */

'use client';

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { ToolCategory, AIAnalysisMode, ViewMode } from '@/lib/types';
import type { Editor } from '@tiptap/react';
import type { Project } from '@/lib/types/project';
import type { BrandVoice, BrandAlignmentResult } from '@/lib/types/brand';
import type { Persona } from '@/lib/types/project';
import { logger } from '@/lib/utils/logger';

/**
 * Insights panel types for the right slide-out
 */
export type InsightsPanelType = 'brand-alignment' | 'persona-alignment' | null;

/**
 * Persona alignment result from AI analysis
 */
export interface PersonaAlignmentResult {
  score: number;
  assessment: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}
import {
  getAllProjects,
  getActiveProjectId,
  setActiveProjectId as setStorageActiveProjectId,
  updateProject as updateStorageProject,
  deleteProject as deleteStorageProject,
} from '@/lib/storage/unified-storage';
import { 
  fetchWithTimeout, 
  retryWithBackoff, 
  formatErrorForUser, 
  validateTextLength, 
  validateNotEmpty,
  logError
} from '@/lib/utils/error-handling';
import {
  type ToneType,
  TONE_SHIFTER_SYSTEM_PROMPT,
  buildToneShifterUserPrompt,
} from '@/lib/prompts/tone-shifter';
import type { HeadlineResult, HeadlineFormData } from '@/lib/prompts/headline-generator';

// Re-export ToneType for components that import from this file
export type { ToneType } from '@/lib/prompts/tone-shifter';

/**
 * Workspace state interface
 * 
 * IMPORTANT: No document content storage here!
 * Document content lives in localStorage via document-storage.ts
 */
interface WorkspaceState {
  // Project state
  projects: Project[];
  activeProjectId: string | null;
  
  // Document state - ONLY the ID, not content!
  activeDocumentId: string | null;
  
  // UI state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeToolId: string | null;
  aiAnalysisMode: AIAnalysisMode;
  viewMode: ViewMode;
  
  // Editor selection state
  selectedText: string | null;
  selectedHTML: string | null;
  selectionRange: { from: number; to: number } | null;
  
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
  
  // Headline Generator Tool state
  headlineResults: HeadlineResult[];
  headlineRawText: string | null;
  headlineLoading: boolean;
  headlineError: string | null;
  
  // Brand Alignment Tool state
  brandAlignmentResult: BrandAlignmentResult | null;
  brandAlignmentLoading: boolean;
  brandAlignmentError: string | null;
  /** Brand name that was analyzed against */
  brandAlignmentBrandName: string | null;
  /** Text that was analyzed (stored for optimization) */
  brandAlignmentAnalyzedText: string | null;
  
  // Persona Alignment Tool state
  personaAlignmentResult: PersonaAlignmentResult | null;
  personaAlignmentLoading: boolean;
  personaAlignmentError: string | null;
  /** Persona name that was analyzed against */
  personaAlignmentPersonaName: string | null;
  /** Text that was analyzed (stored for optimization) */
  personaAlignmentAnalyzedText: string | null;
  
  // Optimize Alignment Tool state (rewrite to optimize)
  optimizeAlignmentResult: string | null;
  optimizeAlignmentChangesSummary: string[];
  optimizeAlignmentLoading: boolean;
  optimizeAlignmentError: string | null;
  /** Target name (persona or brand) for optimization */
  optimizeAlignmentTargetName: string | null;
  /** Type of optimization (persona or brand) */
  optimizeAlignmentType: 'persona' | 'brand' | null;
  /** Original text being optimized */
  optimizeAlignmentOriginalText: string | null;
  /** Whether comparison modal is open */
  optimizeAlignmentModalOpen: boolean;
  
  // Template Generator state
  selectedTemplateId: string | null;
  isGeneratingTemplate: boolean;
  
  // Active insights panel for right slide-out
  activeInsightsPanel: InsightsPanelType;
  
  // Pending edit targets for slide-outs
  pendingBrandVoiceEdit: string | null; // Brand name to edit
  pendingPersonaEdit: string | null; // Persona ID to edit
  
  // Project actions
  setProjects: (projects: Project[]) => void;
  setActiveProjectId: (id: string) => Promise<void>;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  
  // Document actions - SIMPLIFIED
  setActiveDocumentId: (id: string | null) => void;
  
  // UI actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setActiveTool: (toolId: string | null) => void;
  clearActiveTool: () => void;
  setAIAnalysisMode: (mode: AIAnalysisMode) => void;
  setViewMode: (mode: ViewMode) => void;
  
  // Editor selection actions
  setSelectedText: (text: string | null, html: string | null, range: { from: number; to: number } | null) => void;
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
  
  // Headline Generator Tool actions
  runHeadlineGenerator: (formData: HeadlineFormData, append?: boolean) => Promise<void>;
  clearHeadlineResults: () => void;
  
  // Brand Alignment Tool actions
  runBrandAlignment: (text: string, brandVoice: BrandVoice) => Promise<void>;
  clearBrandAlignmentResult: () => void;
  
  // Persona Alignment Tool actions
  runPersonaAlignment: (text: string, persona: Persona) => Promise<void>;
  clearPersonaAlignmentResult: () => void;
  
  // Optimize Alignment Tool actions (rewrite to optimize)
  runOptimizeAlignment: (
    text: string,
    type: 'persona' | 'brand',
    analysisResult: PersonaAlignmentResult | BrandAlignmentResult,
    personaOrBrand: Persona | BrandVoice
  ) => Promise<void>;
  clearOptimizeAlignmentResult: () => void;
  setOptimizeAlignmentModalOpen: (open: boolean) => void;
  acceptOptimizeResult: (editor: Editor) => void;
  
  // Template Generator actions
  setSelectedTemplateId: (id: string | null) => void;
  setIsGeneratingTemplate: (isGenerating: boolean) => void;
  
  // Insights panel actions
  setActiveInsightsPanel: (panel: InsightsPanelType) => void;
  openInsightsPanel: (panel: InsightsPanelType) => void;
  closeInsightsPanel: () => void;
  
  // Pending edit actions
  setPendingBrandVoiceEdit: (brandName: string | null) => void;
  setPendingPersonaEdit: (personaId: string | null) => void;
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
      
      // Initial document state - ONLY ID
      activeDocumentId: null,
      
      // Initial UI state
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      activeToolId: null,
      aiAnalysisMode: null,
      viewMode: 'scrolling' as ViewMode,
      
      // Editor selection initial state
      selectedText: null,
      selectedHTML: null,
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
      
      // Headline Generator Tool initial state
      headlineResults: [],
      headlineRawText: null,
      headlineLoading: false,
      headlineError: null,
      
      // Brand Alignment Tool initial state
      brandAlignmentResult: null,
      brandAlignmentLoading: false,
      brandAlignmentError: null,
      brandAlignmentBrandName: null,
      brandAlignmentAnalyzedText: null,
      
      // Persona Alignment Tool initial state
      personaAlignmentResult: null,
      personaAlignmentLoading: false,
      personaAlignmentError: null,
      personaAlignmentPersonaName: null,
      personaAlignmentAnalyzedText: null,
      
      // Optimize Alignment Tool initial state
      optimizeAlignmentResult: null,
      optimizeAlignmentChangesSummary: [],
      optimizeAlignmentLoading: false,
      optimizeAlignmentError: null,
      optimizeAlignmentTargetName: null,
      optimizeAlignmentType: null,
      optimizeAlignmentOriginalText: null,
      optimizeAlignmentModalOpen: false,
      
      // Template Generator initial state
      selectedTemplateId: null,
      isGeneratingTemplate: false,
      
      // Active insights panel - null means closed
      activeInsightsPanel: null,
      
      // Pending edit targets - null means no pending edit
      pendingBrandVoiceEdit: null,
      pendingPersonaEdit: null,

      // Project actions
      setProjects: (projects: Project[]) => {
        set({ projects });
      },

      setActiveProjectId: async (id: string) => {
        set({ activeProjectId: id, activeDocumentId: null }); // Clear doc when switching projects
        await setStorageActiveProjectId(id);
        
        // Clear tool results when switching projects
        set({
          brandAlignmentResult: null,
          brandAlignmentError: null,
          personaAlignmentResult: null,
          personaAlignmentError: null,
          toneShiftResult: null,
          toneShiftError: null,
          expandResult: null,
          expandError: null,
          shortenResult: null,
          shortenError: null,
          rewriteChannelResult: null,
          rewriteChannelError: null,
          headlineResults: [],
          headlineRawText: null,
          headlineError: null,
        });
      },

      addProject: (project: Project) => {
        const { projects } = get();
        set({ projects: [...projects, project] });
      },

      updateProject: (id: string, updates: Partial<Project>) => {
        const { projects } = get();
        const index = projects.findIndex((p) => p.id === id);
        
        if (index === -1) {
          logger.error('❌ Project not found:', id);
          return;
        }
        
        // Update in storage (async but we don't wait)
        updateStorageProject(id, updates);
        
        // Update in state
        const updatedProjects = [...projects];
        updatedProjects[index] = {
          ...updatedProjects[index],
          ...updates,
          id: updatedProjects[index].id,
          updatedAt: new Date().toISOString(),
        };
        
        set({ projects: updatedProjects });
      },

      deleteProject: async (id: string) => {
        const { projects } = get();
        
        try {
          await deleteStorageProject(id);
          const updatedProjects = projects.filter((p) => p.id !== id);
          set({ projects: updatedProjects });
        } catch (error) {
          logger.error('❌ Failed to delete project:', error);
        }
      },

      refreshProjects: async () => {
        try {
          const projects = await getAllProjects();
          const activeProjectId = await getActiveProjectId();
          const safeProjects = Array.isArray(projects) ? projects : [];
          set({ projects: safeProjects, activeProjectId });
        } catch (error) {
          logger.error('❌ Failed to refresh projects:', error);
        }
      },

      // Document actions - SIMPLIFIED
      setActiveDocumentId: (id: string | null) => {
        set({ activeDocumentId: id });
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
        
        if (toolId !== null && !get().rightSidebarOpen) {
          set({ rightSidebarOpen: true });
        }
      },

      clearActiveTool: () => {
        set({ activeToolId: null });
      },

      setAIAnalysisMode: (mode: AIAnalysisMode) => {
        set({ aiAnalysisMode: mode });
        
        if (mode !== null && !get().rightSidebarOpen) {
          set({ rightSidebarOpen: true });
        }
      },

      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },

      // Editor selection actions
      setSelectedText: (text: string | null, html: string | null, range: { from: number; to: number } | null) => {
        set({ 
          selectedText: text,
          selectedHTML: html,
          selectionRange: range 
        });
      },

      clearSelection: () => {
        set({ 
          selectedText: null,
          selectedHTML: null,
          selectionRange: null 
        });
      },

      // Tone Shifter actions
      setSelectedTone: (tone: ToneType | null) => {
        set({ selectedTone: tone });
        logger.log('🎨 Selected tone:', tone);
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

        set({ 
          toneShiftLoading: true, 
          toneShiftError: null,
          toneShiftResult: null 
        });

        try {
          // Build the user prompt with tone-specific instructions
          const userPrompt = buildToneShifterUserPrompt(text, tone);

          const data = await retryWithBackoff(async () => {
            // Call centralized Claude API with feature tracking
            const response = await fetchWithTimeout('/api/claude', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [{ role: 'user', content: userPrompt }],
                system: TONE_SHIFTER_SYSTEM_PROMPT,
                feature: 'tone_shifter',
                maxTokens: 4000,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ 
                error: 'API request failed',
                details: `Status: ${response.status}` 
              }));
              throw new Error(errorData.details || errorData.error || 'Failed to rewrite copy');
            }

            const data = await response.json();
            if (!data.text) {
              throw new Error('No rewritten text received from API');
            }
            return data;
          }, 2);

          set({ 
            toneShiftResult: data.text, // Changed from data.rewrittenText
            toneShiftLoading: false,
            toneShiftError: null 
          });

        } catch (error) {
          set({ 
            toneShiftError: formatErrorForUser(error, 'Tone shift'),
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
      },

      insertToneShiftResult: (editor: Editor) => {
        const { toneShiftResult } = get();
        
        if (!toneShiftResult) {
          logger.warn('⚠️ No tone shift result to insert');
          return;
        }

        if (!editor) {
          logger.error('❌ No editor instance provided');
          set({ toneShiftError: 'Editor not available' });
          return;
        }

        try {
          editor.commands.setContent(toneShiftResult);
          set({ toneShiftResult: null, toneShiftError: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to insert content';
          set({ toneShiftError: errorMessage });
          logger.error('❌ Failed to insert tone shift result:', errorMessage);
        }
      },

      // Expand Tool actions
      runExpand: async (text: string) => {
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

        set({ 
          expandLoading: true, 
          expandError: null,
          expandResult: null 
        });

        try {
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/expand', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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

          set({ 
            expandResult: data.expandedText,
            expandLoading: false,
            expandError: null 
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
        set({ expandResult: null, expandError: null });
      },

      insertExpandResult: (editor: Editor) => {
        const { expandResult } = get();
        
        if (!expandResult || !editor) return;

        try {
          editor.commands.setContent(expandResult);
          set({ expandResult: null, expandError: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to insert content';
          set({ expandError: errorMessage });
        }
      },

      // Shorten Tool actions
      runShorten: async (text: string) => {
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

        set({ 
          shortenLoading: true, 
          shortenError: null,
          shortenResult: null 
        });

        try {
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/shorten', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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

          set({ 
            shortenResult: data.shortenedText,
            shortenLoading: false,
            shortenError: null 
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
        set({ shortenResult: null, shortenError: null });
      },

      insertShortenResult: (editor: Editor) => {
        const { shortenResult } = get();
        
        if (!shortenResult || !editor) return;

        try {
          editor.commands.setContent(shortenResult);
          set({ shortenResult: null, shortenError: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to insert content';
          set({ shortenError: errorMessage });
        }
      },

      // Rewrite Channel Tool actions
      runRewriteChannel: async (text: string, channel: string) => {
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

        set({ 
          rewriteChannelLoading: true, 
          rewriteChannelError: null,
          rewriteChannelResult: null 
        });

        try {
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/rewrite-channel', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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

          set({ 
            rewriteChannelResult: data.rewrittenText,
            rewriteChannelLoading: false,
            rewriteChannelError: null 
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
        set({ rewriteChannelResult: null, rewriteChannelError: null });
      },

      insertRewriteChannelResult: (editor: Editor) => {
        const { rewriteChannelResult } = get();
        
        if (!rewriteChannelResult || !editor) return;

        try {
          editor.commands.setContent(rewriteChannelResult);
          set({ rewriteChannelResult: null, rewriteChannelError: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to insert content';
          set({ rewriteChannelError: errorMessage });
        }
      },

      // Headline Generator Tool actions
      runHeadlineGenerator: async (formData: HeadlineFormData, append = false) => {
        const currentResults = append ? get().headlineResults : [];
        
        set({
          headlineLoading: true,
          headlineError: null,
          // Keep existing results if appending, clear if not
          headlineResults: currentResults,
          headlineRawText: null,
        });

        try {
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/headline-generator', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            }, 60000); // 60-second timeout

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({
                error: 'API request failed',
                details: `Status: ${response.status}`,
              }));
              throw new Error(errorData.details || errorData.error || 'Failed to generate headlines');
            }

            const responseData = await response.json();
            if (!responseData.headlines && !responseData.rawText) {
              throw new Error('No headlines received from API');
            }
            return responseData;
          }, 2);

          set({
            // Append new headlines to existing ones if append=true
            headlineResults: append 
              ? [...currentResults, ...(data.headlines || [])]
              : data.headlines || [],
            headlineRawText: data.rawText || null,
            headlineLoading: false,
            headlineError: null,
          });
        } catch (error) {
          set({
            headlineError: formatErrorForUser(error, 'Headline generator'),
            headlineLoading: false,
            headlineResults: currentResults, // Preserve existing results on error
            headlineRawText: null,
          });
          logError(error, 'Headline generator');
        }
      },

      clearHeadlineResults: () => {
        set({
          headlineResults: [],
          headlineRawText: null,
          headlineError: null,
        });
      },

      // Brand Alignment Tool actions
      runBrandAlignment: async (text: string, brandVoice: BrandVoice): Promise<void> => {
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

        set({ 
          brandAlignmentLoading: true, 
          brandAlignmentError: null,
          brandAlignmentResult: null,
          brandAlignmentBrandName: null,
          brandAlignmentAnalyzedText: text, // Store the text being analyzed
        });

        try {
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/brand-alignment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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

          set({ 
            brandAlignmentResult: data.result,
            brandAlignmentLoading: false,
            brandAlignmentError: null,
            brandAlignmentBrandName: data.brandName || brandVoice.brandName,
            // Keep brandAlignmentAnalyzedText as set above
          });

        } catch (error) {
          set({ 
            brandAlignmentError: formatErrorForUser(error, 'Brand alignment'),
            brandAlignmentLoading: false,
            brandAlignmentResult: null,
            brandAlignmentBrandName: null,
            brandAlignmentAnalyzedText: null,
          });
          logError(error, 'Brand alignment');
        }
      },

      clearBrandAlignmentResult: () => {
        set({ brandAlignmentResult: null, brandAlignmentError: null, brandAlignmentBrandName: null, brandAlignmentAnalyzedText: null });
      },

      // Persona Alignment Tool actions
      runPersonaAlignment: async (text: string, persona: Persona): Promise<void> => {
        // Validate inputs
        try {
          validateNotEmpty(text, 'Text');
          validateTextLength(text, 'Text');
          validateNotEmpty(persona.name, 'Persona name');
        } catch (error) {
          set({ 
            personaAlignmentError: formatErrorForUser(error, 'Validation'),
            personaAlignmentLoading: false 
          });
          return;
        }

        // Set loading state
        set({ 
          personaAlignmentLoading: true, 
          personaAlignmentError: null,
          personaAlignmentResult: null,
          personaAlignmentPersonaName: null,
          personaAlignmentAnalyzedText: text, // Store the text being analyzed
        });

        try {
          const response = await retryWithBackoff(
            () => fetchWithTimeout('/api/persona-alignment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, persona }),
            }),
            2, // maxRetries
            1000 // baseDelay
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || 'Failed to check persona alignment');
          }

          const data = await response.json();
          
          set({ 
            personaAlignmentResult: data.result,
            personaAlignmentLoading: false,
            personaAlignmentError: null,
            personaAlignmentPersonaName: data.personaName || persona.name,
            // Keep personaAlignmentAnalyzedText as set above
          });
        } catch (error) {
          set({ 
            personaAlignmentError: formatErrorForUser(error, 'Persona alignment'),
            personaAlignmentLoading: false,
            personaAlignmentResult: null,
            personaAlignmentPersonaName: null,
            personaAlignmentAnalyzedText: null,
          });
          logError(error, 'Persona alignment');
        }
      },

      clearPersonaAlignmentResult: () => {
        set({ personaAlignmentResult: null, personaAlignmentError: null, personaAlignmentPersonaName: null, personaAlignmentAnalyzedText: null });
      },

      // Optimize Alignment Tool actions
      runOptimizeAlignment: async (
        text: string,
        type: 'persona' | 'brand',
        analysisResult: PersonaAlignmentResult | BrandAlignmentResult,
        personaOrBrand: Persona | BrandVoice
      ): Promise<void> => {
        // Validate inputs
        try {
          validateNotEmpty(text, 'Text');
          validateTextLength(text, 'Text');
        } catch (error) {
          set({ 
            optimizeAlignmentError: formatErrorForUser(error, 'Validation'),
            optimizeAlignmentLoading: false 
          });
          logError(error, 'Optimize alignment validation');
          return;
        }

        // Set loading state and store original text
        set({ 
          optimizeAlignmentLoading: true, 
          optimizeAlignmentError: null,
          optimizeAlignmentResult: null,
          optimizeAlignmentChangesSummary: [],
          optimizeAlignmentTargetName: null,
          optimizeAlignmentType: type,
          optimizeAlignmentOriginalText: text,
          optimizeAlignmentModalOpen: false,
        });

        try {
          // Build the request based on type
          const analysisContext = {
            score: analysisResult.score,
            assessment: analysisResult.assessment,
            strengths: type === 'persona' 
              ? (analysisResult as PersonaAlignmentResult).strengths 
              : (analysisResult as BrandAlignmentResult).matches,
            issues: type === 'persona'
              ? (analysisResult as PersonaAlignmentResult).improvements
              : (analysisResult as BrandAlignmentResult).violations,
            recommendations: analysisResult.recommendations,
          };

          const requestBody: Record<string, unknown> = {
            text,
            type,
            analysisContext,
          };

          if (type === 'persona') {
            const persona = personaOrBrand as Persona;
            requestBody.personaContext = {
              name: persona.name,
              demographics: persona.demographics,
              psychographics: persona.psychographics,
              painPoints: persona.painPoints,
              goals: persona.goals,
            };
          } else {
            const brand = personaOrBrand as BrandVoice;
            requestBody.brandContext = {
              brandName: brand.brandName,
              brandTone: brand.brandTone,
              missionStatement: brand.missionStatement,
              brandValues: brand.brandValues,
              approvedPhrases: brand.approvedPhrases,
              forbiddenWords: brand.forbiddenWords,
            };
          }

          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/optimize-alignment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }, 60000); // 60 second timeout for optimization

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ 
                error: 'API request failed',
                details: `Status: ${response.status}` 
              }));
              throw new Error(errorData.details || errorData.error || 'Failed to optimize alignment');
            }

            const responseData = await response.json();
            if (!responseData.rewrittenText) {
              throw new Error('No result received from API');
            }
            return responseData;
          }, 2);

          set({ 
            optimizeAlignmentResult: data.rewrittenText,
            optimizeAlignmentChangesSummary: data.changesSummary || [],
            optimizeAlignmentLoading: false,
            optimizeAlignmentError: null,
            optimizeAlignmentTargetName: data.targetName,
            optimizeAlignmentModalOpen: true, // Open the comparison modal
            // rightSidebarOpen already closed at the start, keep it closed
          });

        } catch (error) {
          set({ 
            optimizeAlignmentError: formatErrorForUser(error, 'Optimize alignment'),
            optimizeAlignmentLoading: false,
            optimizeAlignmentResult: null,
            optimizeAlignmentChangesSummary: [],
            optimizeAlignmentTargetName: null,
            optimizeAlignmentModalOpen: false,
          });
          logError(error, 'Optimize alignment');
        }
      },

      clearOptimizeAlignmentResult: () => {
        set({ 
          optimizeAlignmentResult: null, 
          optimizeAlignmentChangesSummary: [],
          optimizeAlignmentError: null, 
          optimizeAlignmentTargetName: null,
          optimizeAlignmentType: null,
          optimizeAlignmentOriginalText: null,
          optimizeAlignmentModalOpen: false,
        });
      },

      setOptimizeAlignmentModalOpen: (open: boolean) => {
        set({ optimizeAlignmentModalOpen: open });
      },

      acceptOptimizeResult: (editor: Editor) => {
        const { optimizeAlignmentResult, selectionRange } = get();
        
        if (!optimizeAlignmentResult) {
          logger.warn('⚠️ No optimize result to accept');
          return;
        }

        try {
          // Import the insert function dynamically to avoid circular deps
          const { insertTextAtSelection } = require('@/lib/editor-utils');
          
          // If we have a selection range, replace that selection
          if (selectionRange) {
            const success = insertTextAtSelection(editor, optimizeAlignmentResult, { isHTML: true });
            if (success) {
              logger.log('✅ Optimized content inserted at selection');
            }
          } else {
            // Otherwise replace entire content
            editor.commands.setContent(optimizeAlignmentResult);
            logger.log('✅ Optimized content replaced entire document');
          }

          // Clear the result after inserting
          set({
            optimizeAlignmentResult: null,
            optimizeAlignmentChangesSummary: [],
            optimizeAlignmentTargetName: null,
            optimizeAlignmentType: null,
            optimizeAlignmentOriginalText: null,
            optimizeAlignmentModalOpen: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to insert content';
          set({ optimizeAlignmentError: errorMessage });
          logError(error, 'Accept optimize result');
        }
      },
      
      // Template Generator actions
      setSelectedTemplateId: (id: string | null) => {
        set({ selectedTemplateId: id });
      },
      
      setIsGeneratingTemplate: (isGenerating: boolean) => {
        set({ isGeneratingTemplate: isGenerating });
      },
      
      // Insights panel actions
      setActiveInsightsPanel: (panel: InsightsPanelType) => {
        set({ activeInsightsPanel: panel });
      },
      
      openInsightsPanel: (panel: InsightsPanelType) => {
        set({ activeInsightsPanel: panel });
      },
      
      closeInsightsPanel: () => {
        set({ activeInsightsPanel: null });
      },
      
      // Pending edit actions
      setPendingBrandVoiceEdit: (brandName: string | null) => {
        set({ pendingBrandVoiceEdit: brandName });
      },
      
      setPendingPersonaEdit: (personaId: string | null) => {
        set({ pendingPersonaEdit: personaId });
      },
    }),
    {
      name: 'copyworx-workspace',
      // Persist ONLY UI state - NO document content!
      partialize: (state) => ({
        activeDocumentId: state.activeDocumentId,
        activeProjectId: state.activeProjectId,
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        activeToolId: state.activeToolId,
        aiAnalysisMode: state.aiAnalysisMode,
        viewMode: state.viewMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          logger.log('💾 Store rehydrated from localStorage', {
            activeDocumentId: state.activeDocumentId,
            activeProjectId: state.activeProjectId,
          });
        }
      },
    }
  )
);

/**
 * Hook to check if we're on the client side
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient;
}

/**
 * Selector hooks for optimized re-renders
 */
export const useActiveDocumentId = () => useWorkspaceStore((state) => state.activeDocumentId);
export const useLeftSidebarOpen = () => useWorkspaceStore((state) => state.leftSidebarOpen);
export const useRightSidebarOpen = () => useWorkspaceStore((state) => state.rightSidebarOpen);
export const useActiveToolId = () => useWorkspaceStore((state) => state.activeToolId);
export const useAIAnalysisMode = () => useWorkspaceStore((state) => state.aiAnalysisMode);
export const useViewMode = () => useWorkspaceStore((state) => state.viewMode);
export const useSetViewMode = () => useWorkspaceStore((state) => state.setViewMode);

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
 * Headline Generator Tool selector hooks
 */
export const useHeadlineResults = () => useWorkspaceStore((state) => state.headlineResults);
export const useHeadlineRawText = () => useWorkspaceStore((state) => state.headlineRawText);
export const useHeadlineLoading = () => useWorkspaceStore((state) => state.headlineLoading);
export const useHeadlineError = () => useWorkspaceStore((state) => state.headlineError);

/**
 * Brand Alignment Tool selector hooks
 */
export const useBrandAlignmentResult = () => useWorkspaceStore((state) => state.brandAlignmentResult);
export const useBrandAlignmentLoading = () => useWorkspaceStore((state) => state.brandAlignmentLoading);
export const useBrandAlignmentError = () => useWorkspaceStore((state) => state.brandAlignmentError);
export const useBrandAlignmentBrandName = () => useWorkspaceStore((state) => state.brandAlignmentBrandName);
export const useBrandAlignmentAnalyzedText = () => useWorkspaceStore((state) => state.brandAlignmentAnalyzedText);

/**
 * Persona Alignment Tool selector hooks
 */
export const usePersonaAlignmentResult = () => useWorkspaceStore((state) => state.personaAlignmentResult);
export const usePersonaAlignmentLoading = () => useWorkspaceStore((state) => state.personaAlignmentLoading);
export const usePersonaAlignmentError = () => useWorkspaceStore((state) => state.personaAlignmentError);
export const usePersonaAlignmentPersonaName = () => useWorkspaceStore((state) => state.personaAlignmentPersonaName);
export const usePersonaAlignmentAnalyzedText = () => useWorkspaceStore((state) => state.personaAlignmentAnalyzedText);

/**
 * Editor selection selector hooks
 */
export const useSelectedText = () => useWorkspaceStore((state) => state.selectedText);
export const useSelectedHTML = () => useWorkspaceStore((state) => state.selectedHTML);
export const useSelectionRange = () => useWorkspaceStore((state) => state.selectionRange);

/**
 * Project selector hooks
 */
export const useProjects = () => useWorkspaceStore((state) => 
  Array.isArray(state.projects) ? state.projects : []
);
export const useActiveProjectId = () => useWorkspaceStore((state) => state.activeProjectId);

/**
 * Template Generator selector hooks
 */
export const useSelectedTemplateId = () => useWorkspaceStore((state) => state.selectedTemplateId);
export const useIsGeneratingTemplate = () => useWorkspaceStore((state) => state.isGeneratingTemplate);

/**
 * Action selector hooks
 */
export const useToneShiftActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runToneShift: state.runToneShift,
    clearToneShiftResult: state.clearToneShiftResult,
    insertToneShiftResult: state.insertToneShiftResult,
    setSelectedTone: state.setSelectedTone,
  }))
);

export const useExpandActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runExpand: state.runExpand,
    clearExpandResult: state.clearExpandResult,
    insertExpandResult: state.insertExpandResult,
  }))
);

export const useShortenActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runShorten: state.runShorten,
    clearShortenResult: state.clearShortenResult,
    insertShortenResult: state.insertShortenResult,
  }))
);

export const useRewriteChannelActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runRewriteChannel: state.runRewriteChannel,
    clearRewriteChannelResult: state.clearRewriteChannelResult,
    insertRewriteChannelResult: state.insertRewriteChannelResult,
  }))
);

export const useHeadlineGeneratorActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runHeadlineGenerator: state.runHeadlineGenerator,
    clearHeadlineResults: state.clearHeadlineResults,
  }))
);

export const useBrandAlignmentActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runBrandAlignment: state.runBrandAlignment,
    clearBrandAlignmentResult: state.clearBrandAlignmentResult,
  }))
);

export const usePersonaAlignmentActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runPersonaAlignment: state.runPersonaAlignment,
    clearPersonaAlignmentResult: state.clearPersonaAlignmentResult,
  }))
);

// Optimize Alignment selectors
export const useOptimizeAlignmentResult = () => useWorkspaceStore((state) => state.optimizeAlignmentResult);
export const useOptimizeAlignmentChangesSummary = () => useWorkspaceStore((state) => state.optimizeAlignmentChangesSummary);
export const useOptimizeAlignmentLoading = () => useWorkspaceStore((state) => state.optimizeAlignmentLoading);
export const useOptimizeAlignmentError = () => useWorkspaceStore((state) => state.optimizeAlignmentError);
export const useOptimizeAlignmentTargetName = () => useWorkspaceStore((state) => state.optimizeAlignmentTargetName);
export const useOptimizeAlignmentType = () => useWorkspaceStore((state) => state.optimizeAlignmentType);
export const useOptimizeAlignmentOriginalText = () => useWorkspaceStore((state) => state.optimizeAlignmentOriginalText);
export const useOptimizeAlignmentModalOpen = () => useWorkspaceStore((state) => state.optimizeAlignmentModalOpen);

export const useOptimizeAlignmentActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runOptimizeAlignment: state.runOptimizeAlignment,
    clearOptimizeAlignmentResult: state.clearOptimizeAlignmentResult,
    setOptimizeAlignmentModalOpen: state.setOptimizeAlignmentModalOpen,
    acceptOptimizeResult: state.acceptOptimizeResult,
  }))
);

export const useProjectActions = () => useWorkspaceStore(
  useShallow((state) => ({
    setActiveProjectId: state.setActiveProjectId,
    addProject: state.addProject,
    updateProject: state.updateProject,
    deleteProject: state.deleteProject,
    refreshProjects: state.refreshProjects,
  }))
);

export const useDocumentActions = () => useWorkspaceStore(
  useShallow((state) => ({
    setActiveDocumentId: state.setActiveDocumentId,
    setSelectedText: state.setSelectedText,
  }))
);

export const useUIActions = () => useWorkspaceStore(
  useShallow((state) => ({
    toggleLeftSidebar: state.toggleLeftSidebar,
    toggleRightSidebar: state.toggleRightSidebar,
    setLeftSidebarOpen: state.setLeftSidebarOpen,
    setRightSidebarOpen: state.setRightSidebarOpen,
    setActiveTool: state.setActiveTool,
    clearActiveTool: state.clearActiveTool,
    setAIAnalysisMode: state.setAIAnalysisMode,
    setViewMode: state.setViewMode,
  }))
);

export const useTemplateActions = () => useWorkspaceStore(
  useShallow((state) => ({
    setSelectedTemplateId: state.setSelectedTemplateId,
    setIsGeneratingTemplate: state.setIsGeneratingTemplate,
    clearToneShiftResult: state.clearToneShiftResult,
    clearExpandResult: state.clearExpandResult,
    clearShortenResult: state.clearShortenResult,
    clearRewriteChannelResult: state.clearRewriteChannelResult,
    clearHeadlineResults: state.clearHeadlineResults,
    clearBrandAlignmentResult: state.clearBrandAlignmentResult,
  }))
);

/**
 * Insights panel selector hooks
 */
export const useActiveInsightsPanel = () => useWorkspaceStore((state) => state.activeInsightsPanel);
export const useInsightsPanelActions = () => useWorkspaceStore(
  useShallow((state) => ({
    setActiveInsightsPanel: state.setActiveInsightsPanel,
    openInsightsPanel: state.openInsightsPanel,
    closeInsightsPanel: state.closeInsightsPanel,
  }))
);

/**
 * Pending edit selector hooks
 */
export const usePendingBrandVoiceEdit = () => useWorkspaceStore((state) => state.pendingBrandVoiceEdit);
export const usePendingPersonaEdit = () => useWorkspaceStore((state) => state.pendingPersonaEdit);
export const usePendingEditActions = () => useWorkspaceStore(
  useShallow((state) => ({
    setPendingBrandVoiceEdit: state.setPendingBrandVoiceEdit,
    setPendingPersonaEdit: state.setPendingPersonaEdit,
  }))
);

// ============================================================================
// LEGACY COMPATIBILITY - Keep these for components that haven't been updated
// ============================================================================

/**
 * @deprecated Use useActiveDocumentId instead. This is kept for backward compatibility.
 * Returns null always since we no longer store document content in Zustand.
 */
export const useActiveDocument = () => {
  logger.warn('⚠️ useActiveDocument is deprecated. Use useActiveDocumentId and load from localStorage.');
  return null;
};
