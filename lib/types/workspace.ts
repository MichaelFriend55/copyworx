/**
 * @file lib/types/workspace.ts
 * @description Workspace-specific type definitions for Zustand store
 * 
 * Defines the shape of the workspace state and all available actions
 */

import { Document, ToolCategory, AIAnalysisMode } from './index';

/**
 * Workspace state shape
 * Used by Zustand store to manage application state
 */
export interface WorkspaceState {
  // Sidebar visibility
  /** Controls left sidebar visibility */
  leftSidebarOpen: boolean;
  
  /** Controls right sidebar visibility */
  rightSidebarOpen: boolean;
  
  // Document state
  /** Currently active document in the editor */
  activeDocument: Document | null;
  
  /** List of all documents in workspace */
  documents: Document[];
  
  // Tool state
  /** Currently selected tool in left sidebar */
  activeTool: ToolCategory | null;
  
  /** Current AI analysis mode in right sidebar */
  aiAnalysisMode: AIAnalysisMode;
  
  // Actions
  /** Toggle left sidebar visibility */
  toggleLeftSidebar: () => void;
  
  /** Toggle right sidebar visibility */
  toggleRightSidebar: () => void;
  
  /** Set left sidebar visibility explicitly */
  setLeftSidebarOpen: (open: boolean) => void;
  
  /** Set right sidebar visibility explicitly */
  setRightSidebarOpen: (open: boolean) => void;
  
  /** Create a new document */
  createDocument: (title?: string) => void;
  
  /** Set active document by ID */
  setActiveDocument: (documentId: string | null) => void;
  
  /** Update document content */
  updateDocument: (documentId: string, content: Partial<Document>) => void;
  
  /** Delete document by ID */
  deleteDocument: (documentId: string) => void;
  
  /** Set active tool */
  setActiveTool: (tool: ToolCategory | null) => void;
  
  /** Set AI analysis mode */
  setAIAnalysisMode: (mode: AIAnalysisMode) => void;
  
  /** Load document from external source */
  loadDocument: (document: Document) => void;
  
  /** Reset workspace to initial state */
  resetWorkspace: () => void;
}



