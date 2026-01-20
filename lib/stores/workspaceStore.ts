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
 * Document insights update frequency options
 */
export type InsightsUpdateFrequency = 'onPause' | 'onSave' | 'realtime';

/**
 * AI-powered metrics that require API calls
 */
export interface AIMetrics {
  /** Detected tone with confidence */
  tone: {
    label: string;
    confidence: number;
  } | null;
  
  /** Brand voice alignment score */
  brandAlignment: {
    score: number;
    feedback: string;
  } | null;
  
  /** Persona alignment score */
  personaAlignment: {
    score: number;
    feedback: string;
  } | null;
}

/**
 * Document insights state
 */
export interface DocumentInsightsState {
  /** Whether the insights panel is active */
  isActive: boolean;
  
  /** Whether the insights panel is expanded */
  isExpanded: boolean;
  
  /** How often to update metrics */
  updateFrequency: InsightsUpdateFrequency;
  
  /** Which metrics are enabled */
  enabledMetrics: {
    readability: boolean;
    tone: boolean;
    brandVoice: boolean;
    persona: boolean;
  };
  
  /** AI-powered metrics (requires API) */
  aiMetrics: AIMetrics;
  
  /** Loading state for AI metrics */
  aiMetricsLoading: boolean;
  
  /** Error state for AI metrics */
  aiMetricsError: string | null;
  
  /** Timestamp of last analysis */
  lastAnalyzedAt: number | null;
  
  /** Cache key for deduplication */
  lastAnalyzedContent: string | null;
}

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
  
  // Brand Alignment Tool state
  brandAlignmentResult: BrandAlignmentResult | null;
  brandAlignmentLoading: boolean;
  brandAlignmentError: string | null;
  
  // Template Generator state
  selectedTemplateId: string | null;
  isGeneratingTemplate: boolean;
  
  // Document Insights state
  documentInsights: DocumentInsightsState;
  
  // Project actions
  setProjects: (projects: Project[]) => void;
  setActiveProjectId: (id: string) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  refreshProjects: () => void;
  
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
  
  // Document Insights actions
  setDocumentInsightsActive: (isActive: boolean) => void;
  setDocumentInsightsExpanded: (isExpanded: boolean) => void;
  setInsightsUpdateFrequency: (frequency: InsightsUpdateFrequency) => void;
  toggleInsightsMetric: (metric: keyof DocumentInsightsState['enabledMetrics']) => void;
  runAIAnalysis: (content: string, brandVoice?: BrandVoice | null, persona?: { name: string; demographics: string; psychographics: string; painPoints: string; goals: string } | null) => Promise<void>;
  clearAIMetrics: () => void;
  setAIMetrics: (metrics: Partial<AIMetrics>) => void;
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
      
      // Document Insights initial state
      documentInsights: {
        isActive: true,
        isExpanded: true,
        updateFrequency: 'onPause' as InsightsUpdateFrequency,
        enabledMetrics: {
          readability: true,
          tone: true,
          brandVoice: true,
          persona: true,
        },
        aiMetrics: {
          tone: null,
          brandAlignment: null,
          personaAlignment: null,
        },
        aiMetricsLoading: false,
        aiMetricsError: null,
        lastAnalyzedAt: null,
        lastAnalyzedContent: null,
      },

      // Project actions
      setProjects: (projects: Project[]) => {
        set({ projects });
      },

      setActiveProjectId: (id: string) => {
        set({ activeProjectId: id, activeDocumentId: null }); // Clear doc when switching projects
        setStorageActiveProjectId(id);
        
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
          id: updatedProjects[index].id,
          updatedAt: new Date().toISOString(),
        };
        
        set({ projects: updatedProjects });
      },

      deleteProject: (id: string) => {
        const { projects } = get();
        
        try {
          deleteStorageProject(id);
          const updatedProjects = projects.filter((p) => p.id !== id);
          set({ projects: updatedProjects });
        } catch (error) {
          console.error('❌ Failed to delete project:', error);
        }
      },

      refreshProjects: () => {
        const projects = getAllProjects();
        const activeProjectId = getActiveProjectId();
        const safeProjects = Array.isArray(projects) ? projects : [];
        set({ projects: safeProjects, activeProjectId });
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
      setSelectedText: (text: string | null, range: { from: number; to: number } | null) => {
        set({ 
          selectedText: text, 
          selectionRange: range 
        });
      },

      clearSelection: () => {
        set({ 
          selectedText: null, 
          selectionRange: null 
        });
      },

      // Tone Shifter actions
      setSelectedTone: (tone: ToneType | null) => {
        set({ selectedTone: tone });
        console.log('🎨 Selected tone:', tone);
      },

      runToneShift: async (text: string, tone: ToneType) => {
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
          const data = await retryWithBackoff(async () => {
            const response = await fetchWithTimeout('/api/tone-shift', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, tone }),
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
            toneShiftResult: data.rewrittenText,
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
          console.warn('⚠️ No tone shift result to insert');
          return;
        }

        if (!editor) {
          console.error('❌ No editor instance provided');
          set({ toneShiftError: 'Editor not available' });
          return;
        }

        try {
          editor.commands.setContent(toneShiftResult);
          set({ toneShiftResult: null, toneShiftError: null });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to insert content';
          set({ toneShiftError: errorMessage });
          console.error('❌ Failed to insert tone shift result:', errorMessage);
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
          brandAlignmentResult: null 
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
            brandAlignmentError: null 
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
        set({ brandAlignmentResult: null, brandAlignmentError: null });
      },
      
      // Template Generator actions
      setSelectedTemplateId: (id: string | null) => {
        set({ selectedTemplateId: id });
      },
      
      setIsGeneratingTemplate: (isGenerating: boolean) => {
        set({ isGeneratingTemplate: isGenerating });
      },
      
      // Document Insights actions
      setDocumentInsightsActive: (isActive: boolean) => {
        set((state) => ({
          documentInsights: { ...state.documentInsights, isActive }
        }));
      },
      
      setDocumentInsightsExpanded: (isExpanded: boolean) => {
        set((state) => ({
          documentInsights: { ...state.documentInsights, isExpanded }
        }));
      },
      
      setInsightsUpdateFrequency: (frequency: InsightsUpdateFrequency) => {
        set((state) => ({
          documentInsights: { ...state.documentInsights, updateFrequency: frequency }
        }));
      },
      
      toggleInsightsMetric: (metric: keyof DocumentInsightsState['enabledMetrics']) => {
        set((state) => ({
          documentInsights: {
            ...state.documentInsights,
            enabledMetrics: {
              ...state.documentInsights.enabledMetrics,
              [metric]: !state.documentInsights.enabledMetrics[metric]
            }
          }
        }));
      },
      
      runAIAnalysis: async (content: string, brandVoice?: BrandVoice | null, persona?: { name: string; demographics: string; psychographics: string; painPoints: string; goals: string } | null) => {
        const { documentInsights } = get();
        
        const { tone, brandVoice: brandVoiceEnabled, persona: personaEnabled } = documentInsights.enabledMetrics;
        if (!tone && !brandVoiceEnabled && !personaEnabled) {
          return;
        }
        
        const contentHash = content.substring(0, 100) + content.length;
        if (contentHash === documentInsights.lastAnalyzedContent) {
          return;
        }
        
        const metricsToAnalyze: string[] = [];
        if (tone) metricsToAnalyze.push('tone');
        if (brandVoiceEnabled && brandVoice) metricsToAnalyze.push('brand');
        if (personaEnabled && persona) metricsToAnalyze.push('persona');
        
        if (metricsToAnalyze.length === 0) {
          return;
        }
        
        set((state) => ({
          documentInsights: {
            ...state.documentInsights,
            aiMetricsLoading: true,
            aiMetricsError: null,
          }
        }));
        
        try {
          const response = await fetchWithTimeout('/api/analyze-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content,
              brandVoice: brandVoiceEnabled ? brandVoice : undefined,
              persona: personaEnabled ? persona : undefined,
              metricsToAnalyze,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Analysis failed' }));
            throw new Error(errorData.details || errorData.error || 'Analysis failed');
          }
          
          const data = await response.json();
          
          set((state) => ({
            documentInsights: {
              ...state.documentInsights,
              aiMetrics: {
                tone: data.tone || state.documentInsights.aiMetrics.tone,
                brandAlignment: data.brandAlignment || state.documentInsights.aiMetrics.brandAlignment,
                personaAlignment: data.personaAlignment || state.documentInsights.aiMetrics.personaAlignment,
              },
              aiMetricsLoading: false,
              aiMetricsError: null,
              lastAnalyzedAt: Date.now(),
              lastAnalyzedContent: contentHash,
            }
          }));
          
        } catch (error) {
          const errorMessage = formatErrorForUser(error, 'Document analysis');
          
          set((state) => ({
            documentInsights: {
              ...state.documentInsights,
              aiMetricsLoading: false,
              aiMetricsError: errorMessage,
            }
          }));
          
          logError(error, 'AI document analysis');
        }
      },
      
      clearAIMetrics: () => {
        set((state) => ({
          documentInsights: {
            ...state.documentInsights,
            aiMetrics: {
              tone: null,
              brandAlignment: null,
              personaAlignment: null,
            },
            aiMetricsError: null,
            lastAnalyzedAt: null,
            lastAnalyzedContent: null,
          }
        }));
      },
      
      setAIMetrics: (metrics: Partial<AIMetrics>) => {
        set((state) => ({
          documentInsights: {
            ...state.documentInsights,
            aiMetrics: {
              ...state.documentInsights.aiMetrics,
              ...metrics,
            }
          }
        }));
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
        documentInsights: {
          isActive: state.documentInsights.isActive,
          isExpanded: state.documentInsights.isExpanded,
          updateFrequency: state.documentInsights.updateFrequency,
          enabledMetrics: state.documentInsights.enabledMetrics,
          // Don't persist transient data
          aiMetrics: { tone: null, brandAlignment: null, personaAlignment: null },
          aiMetricsLoading: false,
          aiMetricsError: null,
          lastAnalyzedAt: null,
          lastAnalyzedContent: null,
        },
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('💾 Store rehydrated from localStorage', {
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

export const useBrandAlignmentActions = () => useWorkspaceStore(
  useShallow((state) => ({
    runBrandAlignment: state.runBrandAlignment,
    clearBrandAlignmentResult: state.clearBrandAlignmentResult,
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
    clearBrandAlignmentResult: state.clearBrandAlignmentResult,
  }))
);

/**
 * Document Insights selector hooks
 */
export const useDocumentInsights = () => useWorkspaceStore((state) => state.documentInsights);
export const useDocumentInsightsActive = () => useWorkspaceStore((state) => state.documentInsights.isActive);
export const useDocumentInsightsExpanded = () => useWorkspaceStore((state) => state.documentInsights.isExpanded);
export const useInsightsUpdateFrequency = () => useWorkspaceStore((state) => state.documentInsights.updateFrequency);
export const useEnabledMetrics = () => useWorkspaceStore((state) => state.documentInsights.enabledMetrics);
export const useAIMetrics = () => useWorkspaceStore((state) => state.documentInsights.aiMetrics);
export const useAIMetricsLoading = () => useWorkspaceStore((state) => state.documentInsights.aiMetricsLoading);
export const useAIMetricsError = () => useWorkspaceStore((state) => state.documentInsights.aiMetricsError);

export const useDocumentInsightsActions = () => useWorkspaceStore(
  useShallow((state) => ({
    setDocumentInsightsActive: state.setDocumentInsightsActive,
    setDocumentInsightsExpanded: state.setDocumentInsightsExpanded,
    setInsightsUpdateFrequency: state.setInsightsUpdateFrequency,
    toggleInsightsMetric: state.toggleInsightsMetric,
    runAIAnalysis: state.runAIAnalysis,
    clearAIMetrics: state.clearAIMetrics,
    setAIMetrics: state.setAIMetrics,
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
  console.warn('⚠️ useActiveDocument is deprecated. Use useActiveDocumentId and load from localStorage.');
  return null;
};
