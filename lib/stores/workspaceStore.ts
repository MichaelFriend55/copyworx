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

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Document, ToolCategory, AIAnalysisMode } from '@/lib/types';
import type { Editor } from '@tiptap/react';
import type { Project, Snippet } from '@/lib/types/project';
import type { BrandVoice, BrandAlignmentResult } from '@/lib/types/brand';
import {
  getAllProjects,
  getActiveProjectId,
  setActiveProjectId as setStorageActiveProjectId,
  updateProject as updateStorageProject,
  deleteProject as deleteStorageProject,
} from '@/lib/storage/project-storage';
import {
  updateDocument as updateStorageDocument,
} from '@/lib/storage/document-storage';
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
  
  // Document Insights state
  documentInsights: DocumentInsightsState;
  
  // Project actions
  setProjects: (projects: Project[]) => void;
  setActiveProjectId: (id: string) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  refreshProjects: () => void;
  
  // Snippet actions
  createSnippet: (name: string, content: string, description?: string) => Snippet | null;
  updateSnippet: (snippetId: string, updates: Partial<Pick<Snippet, 'name' | 'description' | 'content'>>) => void;
  deleteSnippet: (snippetId: string) => void;
  duplicateSnippet: (snippetId: string) => Snippet | null;
  getSnippetsForActiveProject: () => Snippet[];
  searchSnippets: (query: string) => Snippet[];
  
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
        
        // SAFETY: Ensure projects is always an array (defensive coding)
        const safeProjects = Array.isArray(projects) ? projects : [];
        
        set({ projects: safeProjects, activeProjectId });
        console.log('🔄 Projects refreshed:', safeProjects.length);
      },

      // Snippet actions
      createSnippet: (name: string, content: string, description?: string): Snippet | null => {
        const { projects, activeProjectId, updateProject } = get();
        
        if (!activeProjectId) {
          console.error('❌ Cannot create snippet: No active project');
          return null;
        }
        
        // Validate name
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length > 100) {
          console.error('❌ Snippet name is required and must be under 100 characters');
          return null;
        }
        
        // Validate content
        if (!content || content.length > 10000) {
          console.error('❌ Snippet content is required and must be under 10,000 characters');
          return null;
        }
        
        // Validate description
        if (description && description.length > 200) {
          console.error('❌ Snippet description must be under 200 characters');
          return null;
        }
        
        const project = projects.find((p) => p.id === activeProjectId);
        if (!project) {
          console.error('❌ Active project not found:', activeProjectId);
          return null;
        }
        
        // Check snippet limit
        const currentSnippets = project.snippets || [];
        if (currentSnippets.length >= 100) {
          console.error('❌ Snippet limit reached (100 per project)');
          return null;
        }
        
        const now = new Date().toISOString();
        const newSnippet: Snippet = {
          id: crypto.randomUUID(),
          projectId: activeProjectId,
          name: trimmedName,
          description: description?.trim() || undefined,
          content,
          createdAt: now,
          updatedAt: now,
        };
        
        // Update project with new snippet
        const updatedSnippets = [...currentSnippets, newSnippet];
        updateProject(activeProjectId, { snippets: updatedSnippets });
        
        console.log('✅ Snippet created:', newSnippet.name);
        return newSnippet;
      },
      
      updateSnippet: (snippetId: string, updates: Partial<Pick<Snippet, 'name' | 'description' | 'content'>>) => {
        const { projects, activeProjectId, updateProject } = get();
        
        if (!activeProjectId) {
          console.error('❌ Cannot update snippet: No active project');
          return;
        }
        
        const project = projects.find((p) => p.id === activeProjectId);
        if (!project) {
          console.error('❌ Active project not found:', activeProjectId);
          return;
        }
        
        const snippets = project.snippets || [];
        const snippetIndex = snippets.findIndex((s) => s.id === snippetId);
        
        if (snippetIndex === -1) {
          console.error('❌ Snippet not found:', snippetId);
          return;
        }
        
        // Validate updates
        if (updates.name !== undefined) {
          const trimmedName = updates.name.trim();
          if (!trimmedName || trimmedName.length > 100) {
            console.error('❌ Snippet name is required and must be under 100 characters');
            return;
          }
          updates.name = trimmedName;
        }
        
        if (updates.content !== undefined && updates.content.length > 10000) {
          console.error('❌ Snippet content must be under 10,000 characters');
          return;
        }
        
        if (updates.description !== undefined && updates.description.length > 200) {
          console.error('❌ Snippet description must be under 200 characters');
          return;
        }
        
        // Update snippet
        const updatedSnippets = [...snippets];
        updatedSnippets[snippetIndex] = {
          ...updatedSnippets[snippetIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        
        updateProject(activeProjectId, { snippets: updatedSnippets });
        console.log('✅ Snippet updated:', snippetId);
      },
      
      deleteSnippet: (snippetId: string) => {
        const { projects, activeProjectId, updateProject } = get();
        
        if (!activeProjectId) {
          console.error('❌ Cannot delete snippet: No active project');
          return;
        }
        
        const project = projects.find((p) => p.id === activeProjectId);
        if (!project) {
          console.error('❌ Active project not found:', activeProjectId);
          return;
        }
        
        const snippets = project.snippets || [];
        const filteredSnippets = snippets.filter((s) => s.id !== snippetId);
        
        if (filteredSnippets.length === snippets.length) {
          console.error('❌ Snippet not found:', snippetId);
          return;
        }
        
        updateProject(activeProjectId, { snippets: filteredSnippets });
        console.log('🗑️ Snippet deleted:', snippetId);
      },
      
      duplicateSnippet: (snippetId: string): Snippet | null => {
        const { projects, activeProjectId, updateProject } = get();
        
        if (!activeProjectId) {
          console.error('❌ Cannot duplicate snippet: No active project');
          return null;
        }
        
        const project = projects.find((p) => p.id === activeProjectId);
        if (!project) {
          console.error('❌ Active project not found:', activeProjectId);
          return null;
        }
        
        const snippets = project.snippets || [];
        const originalSnippet = snippets.find((s) => s.id === snippetId);
        
        if (!originalSnippet) {
          console.error('❌ Snippet not found:', snippetId);
          return null;
        }
        
        // Check snippet limit
        if (snippets.length >= 100) {
          console.error('❌ Snippet limit reached (100 per project)');
          return null;
        }
        
        const now = new Date().toISOString();
        const duplicatedSnippet: Snippet = {
          id: crypto.randomUUID(),
          projectId: activeProjectId,
          name: `${originalSnippet.name} (copy)`,
          description: originalSnippet.description,
          content: originalSnippet.content,
          createdAt: now,
          updatedAt: now,
        };
        
        const updatedSnippets = [...snippets, duplicatedSnippet];
        updateProject(activeProjectId, { snippets: updatedSnippets });
        
        console.log('✅ Snippet duplicated:', duplicatedSnippet.name);
        return duplicatedSnippet;
      },
      
      getSnippetsForActiveProject: (): Snippet[] => {
        const { projects, activeProjectId } = get();
        
        if (!activeProjectId) return [];
        
        const project = projects.find((p) => p.id === activeProjectId);
        return project?.snippets || [];
      },
      
      searchSnippets: (query: string): Snippet[] => {
        const { getSnippetsForActiveProject } = get();
        const snippets = getSnippetsForActiveProject();
        
        if (!query.trim()) return snippets;
        
        const lowerQuery = query.toLowerCase().trim();
        
        return snippets.filter((snippet) => {
          const nameMatch = snippet.name.toLowerCase().includes(lowerQuery);
          const descriptionMatch = snippet.description?.toLowerCase().includes(lowerQuery) || false;
          const contentMatch = snippet.content.toLowerCase().substring(0, 100).includes(lowerQuery);
          
          return nameMatch || descriptionMatch || contentMatch;
        });
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
        // DIAGNOSTIC: Log at start of function
        console.log('🔧 updateDocumentContent called', { 
          documentId: get().activeDocument?.id,
          projectId: get().activeProjectId,
          contentLength: content?.length,
          getStateActiveDocId: get().activeDocument?.id,
          thisActiveDocId: this?.activeDocument?.id
        });

        const { activeDocument, activeProjectId } = get();
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
        
        // Update Zustand store (in-memory)
        set({ activeDocument: updated });
        console.log('💾 Content saved to Zustand store:', {
          id: updated.id,
          contentLength: content.length,
          wordCount,
          preview: content.substring(0, 50) + '...',
        });

        // CRITICAL FIX: Also persist to project storage layer (localStorage)
        // This ensures content survives page refresh
        if (activeProjectId && activeDocument.id) {
          try {
            // DIAGNOSTIC: Log before calling updateStorageDocument
            console.log('💾 About to call updateStorageDocument', { 
              projectId: activeProjectId, 
              documentId: activeDocument.id, 
              hasContent: !!content,
              contentLength: content.length,
            });

            updateStorageDocument(activeProjectId, activeDocument.id, { 
              content 
            });

            // DIAGNOSTIC: Log after successful call
            console.log('✅ updateStorageDocument completed successfully');

            console.log('💾 Content persisted to project storage:', {
              projectId: activeProjectId,
              documentId: activeDocument.id,
            });
          } catch (error) {
            // DIAGNOSTIC: Enhanced error logging
            console.error('❌ updateStorageDocument failed:', error);
            console.error('❌ Failed to persist content to project storage:', error);
            logError(error, 'Document content persistence');
          }
        } else {
          console.warn('⚠️ Cannot persist to project storage: missing projectId or documentId', {
            hasProjectId: !!activeProjectId,
            hasDocumentId: !!activeDocument.id,
          });
        }
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
      // NOTE: Console logs removed to prevent performance issues during text selection
      setSelectedText: (text: string | null, range: { from: number; to: number } | null) => {
        console.log('🔍 SELECTION DEBUG:', { 
          hasText: !!text, 
          textLength: text?.length,
          preview: text?.substring(0, 50)
        });
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
      
      // Document Insights actions
      setDocumentInsightsActive: (isActive: boolean) => {
        set((state) => ({
          documentInsights: { ...state.documentInsights, isActive }
        }));
        console.log('📊 Document insights active:', isActive);
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
        console.log('📊 Insights update frequency:', frequency);
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
        
        // Skip if no AI metrics are enabled
        const { tone, brandVoice: brandVoiceEnabled, persona: personaEnabled } = documentInsights.enabledMetrics;
        if (!tone && !brandVoiceEnabled && !personaEnabled) {
          return;
        }
        
        // Skip if content hasn't changed (cache check)
        const contentHash = content.substring(0, 100) + content.length;
        if (contentHash === documentInsights.lastAnalyzedContent) {
          console.log('📊 Skipping AI analysis - content unchanged');
          return;
        }
        
        // Build metrics array
        const metricsToAnalyze: string[] = [];
        if (tone) metricsToAnalyze.push('tone');
        if (brandVoiceEnabled && brandVoice) metricsToAnalyze.push('brand');
        if (personaEnabled && persona) metricsToAnalyze.push('persona');
        
        if (metricsToAnalyze.length === 0) {
          console.log('📊 No AI metrics to analyze');
          return;
        }
        
        // Set loading state
        set((state) => ({
          documentInsights: {
            ...state.documentInsights,
            aiMetricsLoading: true,
            aiMetricsError: null,
          }
        }));
        
        console.log('📊 Starting AI analysis:', { metrics: metricsToAnalyze });
        
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
          
          // Update metrics
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
          
          console.log('📊 AI analysis complete:', data);
          
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
        console.log('🧹 AI metrics cleared');
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
      // Persist only what we need
      partialize: (state) => ({
        activeDocument: state.activeDocument,
        activeProjectId: state.activeProjectId, // Persist active project
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        activeToolId: state.activeToolId, // Updated: persist tool ID
        aiAnalysisMode: state.aiAnalysisMode,
        // Persist document insights settings (but not the actual metrics)
        documentInsights: {
          isActive: state.documentInsights.isActive,
          isExpanded: state.documentInsights.isExpanded,
          updateFrequency: state.documentInsights.updateFrequency,
          enabledMetrics: state.documentInsights.enabledMetrics,
          // Don't persist transient AI metrics
          aiMetrics: { tone: null, brandAlignment: null, personaAlignment: null },
          aiMetricsLoading: false,
          aiMetricsError: null,
          lastAnalyzedAt: null,
          lastAnalyzedContent: null,
        },
      }),
      onRehydrateStorage: () => (state) => {
        // Called when rehydration is complete
        if (state) {
          console.log('💾 Store rehydrated from localStorage', {
            hasDocument: !!state.activeDocument,
            activeProjectId: state.activeProjectId,
          });
        }
      },
    }
  )
);

/**
 * Hook to check if we're on the client side and ready for client-only operations
 * This ensures we don't run localStorage operations during SSR
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
 * SAFETY: useProjects ensures we always return an array to prevent ".find is not a function" errors
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
 * Action selector hooks (using shallow equality for stable references to prevent re-renders)
 * 
 * IMPORTANT: These hooks use shallow equality to prevent infinite render loops.
 * Without shallow comparison, returning a new object on every render triggers re-renders.
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
    createDocument: state.createDocument,
    updateDocumentTitle: state.updateDocumentTitle,
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
