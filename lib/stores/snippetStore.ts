/**
 * @file lib/stores/snippetStore.ts
 * @description Zustand store for managing snippet state and editor integration
 * 
 * Handles:
 * - Current project's snippets
 * - Snippet modal states (add/edit)
 * - Editor reference for snippet insertion
 * - Search/filter state
 */

'use client';

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Editor } from '@tiptap/react';
import type { Snippet, CreateSnippetInput, UpdateSnippetInput } from '@/lib/types/snippet';
import {
  getAllSnippets,
  searchSnippets as searchSnippetsStorage,
} from '@/lib/storage/snippet-storage';
import {
  createSnippet as unifiedCreateSnippet,
  updateSnippet as unifiedUpdateSnippet,
  deleteSnippet as unifiedDeleteSnippet,
  incrementSnippetUsage as unifiedIncrementSnippetUsage,
} from '@/lib/storage/unified-storage';
import { insertTextAtSelection } from '@/lib/editor-utils';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

interface SnippetState {
  // Snippet data
  snippets: Snippet[];
  currentProjectId: string | null;
  
  // Search/filter state
  searchQuery: string;
  filteredSnippets: Snippet[];
  
  // Modal states
  isAddModalOpen: boolean;
  isEditModalOpen: boolean;
  editingSnippet: Snippet | null;
  
  // Save as snippet modal
  isSaveAsSnippetOpen: boolean;
  selectedTextForSnippet: string;
  
  // Editor reference (stored outside React to avoid stale closures)
  editorRef: Editor | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadSnippets: (projectId: string) => void;
  refreshSnippets: () => void;
  
  // CRUD actions
  createSnippet: (input: CreateSnippetInput) => Promise<Snippet | null>;
  updateSnippet: (snippetId: string, updates: UpdateSnippetInput) => Promise<Snippet | null>;
  deleteSnippet: (snippetId: string) => Promise<boolean>;
  
  // Editor actions
  setEditorRef: (editor: Editor | null) => void;
  insertSnippet: (snippet: Snippet) => boolean;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  
  // Modal actions
  openAddModal: () => void;
  closeAddModal: () => void;
  openEditModal: (snippet: Snippet) => void;
  closeEditModal: () => void;
  openSaveAsSnippet: (selectedText: string) => void;
  closeSaveAsSnippet: () => void;
  
  // Error handling
  clearError: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useSnippetStore = create<SnippetState>()((set, get) => ({
  // Initial state
  snippets: [],
  currentProjectId: null,
  searchQuery: '',
  filteredSnippets: [],
  isAddModalOpen: false,
  isEditModalOpen: false,
  editingSnippet: null,
  isSaveAsSnippetOpen: false,
  selectedTextForSnippet: '',
  editorRef: null,
  isLoading: false,
  error: null,
  
  // Load snippets for a project
  loadSnippets: (projectId: string) => {
    if (!projectId) {
      set({ snippets: [], filteredSnippets: [], currentProjectId: null });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const snippets = getAllSnippets(projectId);
      set({ 
        snippets, 
        filteredSnippets: snippets,
        currentProjectId: projectId,
        isLoading: false,
        searchQuery: '', // Reset search on project change
      });
      logger.log(`📎 Loaded ${snippets.length} snippets for project ${projectId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load snippets';
      set({ error: errorMessage, isLoading: false });
      logger.error('❌ Failed to load snippets:', error);
    }
  },
  
  // Refresh snippets for current project
  refreshSnippets: () => {
    const { currentProjectId, searchQuery } = get();
    if (!currentProjectId) return;
    
    try {
      const snippets = getAllSnippets(currentProjectId);
      
      // Apply current search filter if any
      const filteredSnippets = searchQuery 
        ? searchSnippetsStorage(currentProjectId, searchQuery)
        : snippets;
      
      set({ snippets, filteredSnippets });
      logger.log('🔄 Snippets refreshed');
    } catch (error) {
      logger.error('❌ Failed to refresh snippets:', error);
    }
  },
  
  // Create a new snippet (uses unified storage for cloud + localStorage persistence)
  createSnippet: async (input: CreateSnippetInput): Promise<Snippet | null> => {
    const { currentProjectId } = get();
    if (!currentProjectId) {
      set({ error: 'No project selected' });
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Use unified storage to persist to both Supabase and localStorage
      const newSnippet = await unifiedCreateSnippet(currentProjectId, input);
      
      // Refresh snippets list from localStorage (now in sync with cloud)
      get().refreshSnippets();
      
      set({ isLoading: false, isAddModalOpen: false, isSaveAsSnippetOpen: false });
      logger.log('✅ Snippet created:', newSnippet.name);
      
      return newSnippet;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create snippet';
      set({ error: errorMessage, isLoading: false });
      logger.error('❌ Failed to create snippet:', error);
      return null;
    }
  },
  
  // Update an existing snippet (uses unified storage for cloud + localStorage persistence)
  updateSnippet: async (snippetId: string, updates: UpdateSnippetInput): Promise<Snippet | null> => {
    const { currentProjectId } = get();
    if (!currentProjectId) {
      set({ error: 'No project selected' });
      return null;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Use unified storage to persist to both Supabase and localStorage
      await unifiedUpdateSnippet(currentProjectId, snippetId, updates);
      
      // Refresh snippets list from localStorage (now in sync with cloud)
      get().refreshSnippets();
      
      // Get the updated snippet from the refreshed list for the return value
      const { snippets } = get();
      const updatedSnippet = snippets.find(s => s.id === snippetId) || null;
      
      set({ isLoading: false, isEditModalOpen: false, editingSnippet: null });
      logger.log('✅ Snippet updated:', updatedSnippet?.name ?? snippetId);
      
      return updatedSnippet;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update snippet';
      set({ error: errorMessage, isLoading: false });
      logger.error('❌ Failed to update snippet:', error);
      return null;
    }
  },
  
  // Delete a snippet (uses unified storage for cloud + localStorage persistence)
  deleteSnippet: async (snippetId: string): Promise<boolean> => {
    const { currentProjectId } = get();
    if (!currentProjectId) {
      set({ error: 'No project selected' });
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Use unified storage to delete from both Supabase and localStorage
      await unifiedDeleteSnippet(currentProjectId, snippetId);
      
      // Refresh snippets list from localStorage (now in sync with cloud)
      get().refreshSnippets();
      
      set({ isLoading: false });
      logger.log('🗑️ Snippet deleted');
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete snippet';
      set({ error: errorMessage, isLoading: false });
      logger.error('❌ Failed to delete snippet:', error);
      return false;
    }
  },
  
  // Set editor reference
  setEditorRef: (editor: Editor | null) => {
    set({ editorRef: editor });
  },
  
  // Insert snippet into editor
  insertSnippet: (snippet: Snippet): boolean => {
    const { editorRef, currentProjectId } = get();
    
    if (!editorRef) {
      logger.warn('⚠️ No editor reference available for snippet insertion');
      set({ error: 'Editor not available' });
      return false;
    }
    
    if (!snippet.content || snippet.content.trim().length === 0) {
      logger.warn('⚠️ Snippet has no content to insert:', snippet.id);
      set({ error: 'Snippet has no content' });
      return false;
    }
    
    try {
      // Insert the snippet content at cursor position
      const success = insertTextAtSelection(editorRef, snippet.content);
      
      if (success && currentProjectId) {
        // Increment usage count via unified storage (cloud + localStorage)
        unifiedIncrementSnippetUsage(currentProjectId, snippet.id).catch((error) => {
          logger.warn('⚠️ Failed to increment snippet usage:', error);
        });
        // Refresh to update usage count in UI
        get().refreshSnippets();
      }
      
      logger.log(success ? '✅ Snippet inserted' : '❌ Failed to insert snippet');
      return success;
    } catch (error) {
      logger.error('❌ Error inserting snippet:', error);
      set({ error: 'Failed to insert snippet' });
      return false;
    }
  },
  
  // Search actions
  setSearchQuery: (query: string) => {
    const { currentProjectId, snippets } = get();
    
    if (!query.trim()) {
      set({ searchQuery: '', filteredSnippets: snippets });
      return;
    }
    
    if (currentProjectId) {
      const filtered = searchSnippetsStorage(currentProjectId, query);
      set({ searchQuery: query, filteredSnippets: filtered });
    }
  },
  
  clearSearch: () => {
    const { snippets } = get();
    set({ searchQuery: '', filteredSnippets: snippets });
  },
  
  // Modal actions
  openAddModal: () => {
    set({ isAddModalOpen: true, error: null });
  },
  
  closeAddModal: () => {
    set({ isAddModalOpen: false, error: null });
  },
  
  openEditModal: (snippet: Snippet) => {
    set({ isEditModalOpen: true, editingSnippet: snippet, error: null });
  },
  
  closeEditModal: () => {
    set({ isEditModalOpen: false, editingSnippet: null, error: null });
  },
  
  openSaveAsSnippet: (selectedText: string) => {
    set({ isSaveAsSnippetOpen: true, selectedTextForSnippet: selectedText, error: null });
  },
  
  closeSaveAsSnippet: () => {
    set({ isSaveAsSnippetOpen: false, selectedTextForSnippet: '', error: null });
  },
  
  // Error handling
  clearError: () => {
    set({ error: null });
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook to get all snippets
 */
export const useSnippets = () => useSnippetStore((state) => state.filteredSnippets);

/**
 * Hook to get snippet search query
 */
export const useSnippetSearchQuery = () => useSnippetStore((state) => state.searchQuery);

/**
 * Hook to get snippet loading state
 */
export const useSnippetLoading = () => useSnippetStore((state) => state.isLoading);

/**
 * Hook to get snippet error
 */
export const useSnippetError = () => useSnippetStore((state) => state.error);

/**
 * Hook to get add modal state
 */
export const useAddSnippetModalOpen = () => useSnippetStore((state) => state.isAddModalOpen);

/**
 * Hook to get edit modal state
 */
export const useEditSnippetModal = () => useSnippetStore(
  useShallow((state) => ({
    isOpen: state.isEditModalOpen,
    snippet: state.editingSnippet,
  }))
);

/**
 * Hook to get save as snippet modal state
 */
export const useSaveAsSnippetModal = () => useSnippetStore(
  useShallow((state) => ({
    isOpen: state.isSaveAsSnippetOpen,
    selectedText: state.selectedTextForSnippet,
  }))
);

/**
 * Hook to get snippet actions
 */
export const useSnippetActions = () => useSnippetStore(
  useShallow((state) => ({
    loadSnippets: state.loadSnippets,
    refreshSnippets: state.refreshSnippets,
    createSnippet: state.createSnippet,
    updateSnippet: state.updateSnippet,
    deleteSnippet: state.deleteSnippet,
    insertSnippet: state.insertSnippet,
    setEditorRef: state.setEditorRef,
    setSearchQuery: state.setSearchQuery,
    clearSearch: state.clearSearch,
    openAddModal: state.openAddModal,
    closeAddModal: state.closeAddModal,
    openEditModal: state.openEditModal,
    closeEditModal: state.closeEditModal,
    openSaveAsSnippet: state.openSaveAsSnippet,
    closeSaveAsSnippet: state.closeSaveAsSnippet,
    clearError: state.clearError,
  }))
);
