/**
 * @file components/workspace/MyProjectsSlideOut.tsx
 * @description Full-featured project navigator slide-out panel
 * 
 * Features:
 * - Search/filter bar
 * - Project tree with Projects → Folders → Documents hierarchy
 * - Snippets section (project-scoped)
 * - Full document names (no truncation)
 * - Current document highlighting
 * - New Project / New Folder buttons
 * - Metadata display (modified date, word count)
 * - Click document to open and close panel
 * 
 * @example
 * ```tsx
 * <MyProjectsSlideOut
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onDocumentClick={(doc) => handleDocumentSelect(doc)}
 * />
 * ```
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FileText,
  Trash2,
  Pencil,
  Plus,
  Calendar,
  Type,
  MoreHorizontal,
  Check,
  X,
  Scissors,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useWorkspaceStore,
  useProjects,
  useActiveProjectId,
  useActiveDocumentId,
  useProjectActions,
  useDocumentActions,
} from '@/lib/stores/workspaceStore';
import { useSlideOutActions } from '@/lib/stores/slideOutStore';
import {
  getAllDocuments,
  createDocument,
  deleteDocument,
  updateDocument,
} from '@/lib/storage/document-storage';
import {
  getAllFolders,
  createFolder,
  deleteFolder,
  updateFolder,
} from '@/lib/storage/folder-storage';
import { createProject } from '@/lib/storage/project-storage';
import type { Project, ProjectDocument, Folder } from '@/lib/types/project';
import type { Snippet } from '@/lib/types/snippet';
import { SnippetSection } from './SnippetSection';
import { SnippetModals } from './SnippetModals';
import { useSnippetActions, useSnippetStore } from '@/lib/stores/snippetStore';

// ============================================================================
// Constants
// ============================================================================

/** Slide-out panel ID for state management */
export const MY_PROJECTS_PANEL_ID = 'my-projects';

// ============================================================================
// Types
// ============================================================================

interface MyProjectsSlideOutProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Callback when a document is clicked */
  onDocumentClick?: (doc: ProjectDocument) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date to relative time (e.g., "2 days ago", "Just now")
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Group documents by baseTitle
 */
function groupDocumentsByBaseTitle(docs: ProjectDocument[]): Map<string, ProjectDocument[]> {
  const grouped = new Map<string, ProjectDocument[]>();
  
  for (const doc of docs) {
    const existing = grouped.get(doc.baseTitle) || [];
    existing.push(doc);
    grouped.set(doc.baseTitle, existing);
  }
  
  // Sort versions ascending
  for (const [baseTitle, versions] of grouped) {
    versions.sort((a, b) => a.version - b.version);
    grouped.set(baseTitle, versions);
  }
  
  return grouped;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Document row with metadata
 */
interface DocumentRowProps {
  doc: ProjectDocument;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  onSelect: (doc: ProjectDocument) => void;
  onStartEdit: () => void;
  onEditChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  indentLevel?: number;
}

function DocumentRow({
  doc,
  isSelected,
  isEditing,
  editValue,
  onSelect,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  indentLevel = 0,
}: DocumentRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer',
        'transition-colors duration-150',
        isSelected
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-gray-50'
      )}
      style={{ paddingLeft: `${12 + indentLevel * 16}px` }}
      onClick={() => !isEditing && onSelect(doc)}
    >
      <FileText className={cn(
        'h-4 w-4 flex-shrink-0',
        isSelected ? 'text-blue-600' : 'text-gray-400'
      )} />
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className={cn(
              'text-sm font-medium truncate',
              isSelected ? 'text-blue-900' : 'text-gray-900'
            )}>
              {doc.title}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {formatRelativeDate(doc.modifiedAt)}
              </span>
              {doc.metadata?.wordCount !== undefined && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Type className="h-3 w-3" />
                  {doc.metadata.wordCount} words
                </span>
              )}
            </div>
          </div>
          
          {/* Actions - visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Rename"
            >
              <Pencil className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded hover:bg-red-100 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Folder row with expand/collapse
 */
interface FolderRowProps {
  folder: Folder;
  isExpanded: boolean;
  documentCount: number;
  isEditing: boolean;
  editValue: string;
  onToggle: () => void;
  onStartEdit: () => void;
  onEditChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onCreateDocument: () => void;
  indentLevel?: number;
}

function FolderRow({
  folder,
  isExpanded,
  documentCount,
  isEditing,
  editValue,
  onToggle,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onCreateDocument,
  indentLevel = 0,
}: FolderRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer',
        'hover:bg-gray-50 transition-colors duration-150'
      )}
      style={{ paddingLeft: `${12 + indentLevel * 16}px` }}
      onClick={() => !isEditing && onToggle()}
    >
      {isExpanded ? (
        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
      )}
      
      <FolderIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
      
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
            className="p-1 text-gray-500 hover:bg-gray-100 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-semibold text-gray-900 truncate">
            {folder.name}
          </span>
          
          <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">
            {documentCount}
          </span>
          
          {/* Actions - visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onCreateDocument(); }}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="New document in folder"
            >
              <FilePlus className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Rename folder"
            >
              <Pencil className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded hover:bg-red-100 transition-colors"
              title="Delete folder"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Project section with documents, folders, and snippets
 */
interface ProjectSectionProps {
  project: Project;
  isActive: boolean;
  isExpanded: boolean;
  selectedDocId: string | null;
  searchQuery: string;
  onToggle: () => void;
  onSelect: () => void;
  onDocumentSelect: (doc: ProjectDocument) => void;
  onRefresh: () => void;
  onSnippetClick?: (snippet: Snippet) => void;
  onAddSnippet?: (projectId: string) => void;
  onEditSnippet?: (snippet: Snippet) => void;
}

function ProjectSection({
  project,
  isActive,
  isExpanded,
  selectedDocId,
  searchQuery,
  onToggle,
  onSelect,
  onDocumentSelect,
  onRefresh,
  onSnippetClick,
  onAddSnippet,
  onEditSnippet,
}: ProjectSectionProps) {
  // Local state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Load data when project changes or expands
  useEffect(() => {
    if (isExpanded) {
      const projectFolders = getAllFolders(project.id);
      const projectDocs = getAllDocuments(project.id);
      setFolders(projectFolders);
      setDocuments(projectDocs);
    }
  }, [project.id, isExpanded]);

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      doc.baseTitle.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  // Get root-level documents and folders
  const rootFolders = folders.filter(f => !f.parentFolderId);
  const rootDocs = filteredDocuments.filter(d => !d.folderId);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Document operations
  const handleStartDocEdit = (doc: ProjectDocument) => {
    setEditingDocId(doc.id);
    setEditValue(doc.title);
  };

  const handleSaveDocEdit = (docId: string) => {
    if (!editValue.trim()) {
      setEditingDocId(null);
      return;
    }
    try {
      // Direct localStorage update for title
      const PROJECTS_KEY = 'copyworx_projects';
      const rawData = localStorage.getItem(PROJECTS_KEY);
      if (rawData) {
        const projects = JSON.parse(rawData);
        const projectIndex = projects.findIndex((p: Project) => p.id === project.id);
        if (projectIndex !== -1) {
          const docIndex = projects[projectIndex].documents.findIndex((d: ProjectDocument) => d.id === docId);
          if (docIndex !== -1) {
            projects[projectIndex].documents[docIndex].title = editValue.trim();
            projects[projectIndex].documents[docIndex].modifiedAt = new Date().toISOString();
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
          }
        }
      }
      // Refresh local state
      setDocuments(getAllDocuments(project.id));
      onRefresh();
    } catch (error) {
      console.error('Failed to rename document:', error);
    }
    setEditingDocId(null);
    setEditValue('');
  };

  const handleDeleteDoc = (docId: string) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      deleteDocument(project.id, docId);
      setDocuments(getAllDocuments(project.id));
      onRefresh();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  // Folder operations
  const handleStartFolderEdit = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditValue(folder.name);
  };

  const handleSaveFolderEdit = (folderId: string) => {
    if (!editValue.trim()) {
      setEditingFolderId(null);
      return;
    }
    try {
      updateFolder(project.id, folderId, { name: editValue.trim() });
      setFolders(getAllFolders(project.id));
      onRefresh();
    } catch (error) {
      console.error('Failed to rename folder:', error);
    }
    setEditingFolderId(null);
    setEditValue('');
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!window.confirm('Delete this folder? It must be empty first.')) return;
    try {
      deleteFolder(project.id, folderId);
      setFolders(getAllFolders(project.id));
      onRefresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to delete folder');
    }
  };

  const handleCreateDocInFolder = (folderId: string) => {
    const title = window.prompt('Document title:');
    if (!title?.trim()) return;
    try {
      const newDoc = createDocument(project.id, title.trim());
      updateDocument(project.id, newDoc.id, { folderId });
      setDocuments(getAllDocuments(project.id));
      onRefresh();
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  // Render folder recursively
  const renderFolder = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderDocs = filteredDocuments.filter(d => d.folderId === folder.id);
    const childFolders = folders.filter(f => f.parentFolderId === folder.id);

    return (
      <div key={folder.id}>
        <FolderRow
          folder={folder}
          isExpanded={isExpanded}
          documentCount={folderDocs.length}
          isEditing={editingFolderId === folder.id}
          editValue={editValue}
          onToggle={() => toggleFolder(folder.id)}
          onStartEdit={() => handleStartFolderEdit(folder)}
          onEditChange={setEditValue}
          onSaveEdit={() => handleSaveFolderEdit(folder.id)}
          onCancelEdit={() => { setEditingFolderId(null); setEditValue(''); }}
          onDelete={() => handleDeleteFolder(folder.id)}
          onCreateDocument={() => handleCreateDocInFolder(folder.id)}
          indentLevel={level}
        />
        
        {isExpanded && (
          <div className="ml-4">
            {childFolders.map(child => renderFolder(child, level + 1))}
            {folderDocs.map(doc => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                isSelected={doc.id === selectedDocId}
                isEditing={editingDocId === doc.id}
                editValue={editValue}
                onSelect={onDocumentSelect}
                onStartEdit={() => handleStartDocEdit(doc)}
                onEditChange={setEditValue}
                onSaveEdit={() => handleSaveDocEdit(doc.id)}
                onCancelEdit={() => { setEditingDocId(null); setEditValue(''); }}
                onDelete={() => handleDeleteDoc(doc.id)}
                indentLevel={level + 1}
              />
            ))}
            {folderDocs.length === 0 && childFolders.length === 0 && (
              <div 
                className="text-xs text-gray-400 italic py-2"
                style={{ paddingLeft: `${28 + (level + 1) * 16}px` }}
              >
                Empty folder
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-4">
      {/* Project header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer',
          'transition-colors duration-150',
          isActive
            ? 'bg-blue-100 border border-blue-300'
            : 'hover:bg-gray-100 border border-transparent'
        )}
        onClick={() => {
          if (!isActive) {
            onSelect();
          }
          onToggle();
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
        
        <FolderIcon className={cn(
          'h-5 w-5',
          isActive ? 'text-blue-600' : 'text-gray-400'
        )} />
        
        <span className={cn(
          'flex-1 font-semibold',
          isActive ? 'text-blue-900' : 'text-gray-900'
        )}>
          {project.name}
        </span>
        
        {isActive && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            Active
          </span>
        )}
        
        <span className="text-xs text-gray-500">
          {documents.length} docs
        </span>
      </div>
      
      {/* Project contents */}
      {isExpanded && (
        <div className="mt-1 ml-2 pl-2 border-l-2 border-gray-200">
          {/* Folders */}
          {rootFolders.map(folder => renderFolder(folder))}
          
          {/* Root documents (not in folders) */}
          {rootDocs.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              isSelected={doc.id === selectedDocId}
              isEditing={editingDocId === doc.id}
              editValue={editValue}
              onSelect={onDocumentSelect}
              onStartEdit={() => handleStartDocEdit(doc)}
              onEditChange={setEditValue}
              onSaveEdit={() => handleSaveDocEdit(doc.id)}
              onCancelEdit={() => { setEditingDocId(null); setEditValue(''); }}
              onDelete={() => handleDeleteDoc(doc.id)}
            />
          ))}
          
          {/* Snippets section */}
          <SnippetSection
            projectId={project.id}
            isExpanded={isExpanded}
            searchQuery={searchQuery}
            onSnippetClick={onSnippetClick}
            onAddSnippet={onAddSnippet}
            onEditSnippet={onEditSnippet}
          />
          
          {/* Empty state */}
          {rootFolders.length === 0 && rootDocs.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">
              No documents in this project yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MyProjectsSlideOut({
  isOpen,
  onClose,
  onDocumentClick,
}: MyProjectsSlideOutProps) {
  // Debug: Log when component receives isOpen prop
  console.log('🟢 MyProjectsSlideOut rendered, isOpen:', isOpen);
  
  // Store state
  const projects = useProjects();
  const activeProjectId = useActiveProjectId();
  const activeDocumentId = useActiveDocumentId();
  const { setActiveProjectId } = useProjectActions();
  const { setActiveDocumentId } = useDocumentActions();
  const { closeSlideOut } = useSlideOutActions();
  
  // Snippet store actions
  const {
    loadSnippets,
    insertSnippet,
    openAddModal,
    openEditModal,
  } = useSnippetActions();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Track previous isOpen to detect open transitions
  const wasOpenRef = React.useRef(false);

  // Track isOpen changes
  useEffect(() => {
    console.log('🔄 MyProjectsSlideOut isOpen changed to:', isOpen);
  }, [isOpen]);

  // Auto-expand active project on open
  useEffect(() => {
    if (isOpen && activeProjectId) {
      console.log('📂 Auto-expanding active project:', activeProjectId);
      setExpandedProjects(prev => new Set([...prev, activeProjectId]));
    }
  }, [isOpen, activeProjectId]);

  // Refresh projects only when panel opens (not on every render)
  useEffect(() => {
    // Only refresh when transitioning from closed to open
    if (isOpen && !wasOpenRef.current) {
      console.log('🔄 Refreshing projects on panel open');
      // Use getState() to avoid dependency issues
      useWorkspaceStore.getState().refreshProjects();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Toggle project expansion
  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  // Handle document selection
  const handleDocumentSelect = useCallback((doc: ProjectDocument) => {
    // Set active document
    setActiveDocumentId(doc.id);
    
    // If document is in a different project, switch projects first
    if (doc.projectId !== activeProjectId) {
      setActiveProjectId(doc.projectId);
    }
    
    // Notify parent
    onDocumentClick?.(doc);
    
    // Close panel
    onClose();
  }, [activeProjectId, setActiveProjectId, setActiveDocumentId, onDocumentClick, onClose]);

  // Handle project selection
  const handleProjectSelect = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
  }, [setActiveProjectId]);

  // Create new project
  const handleCreateProject = useCallback(() => {
    const name = window.prompt('Project name:');
    if (!name?.trim()) return;
    
    try {
      const newProject = createProject(name.trim());
      // Use getState() to avoid dependency on refreshProjects
      useWorkspaceStore.getState().refreshProjects();
      setActiveProjectId(newProject.id);
      setExpandedProjects(prev => new Set([...prev, newProject.id]));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create project');
    }
  }, [setActiveProjectId]);

  // Create new folder in active project
  const handleCreateFolder = useCallback(() => {
    if (!activeProjectId) {
      window.alert('Please select a project first');
      return;
    }
    
    const name = window.prompt('Folder name:');
    if (!name?.trim()) return;
    
    try {
      createFolder(activeProjectId, name.trim());
      setRefreshKey(k => k + 1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create folder');
    }
  }, [activeProjectId]);

  // Create new document in active project
  const handleCreateDocument = useCallback(() => {
    if (!activeProjectId) {
      window.alert('Please select a project first');
      return;
    }
    
    const title = window.prompt('Document title:');
    if (!title?.trim()) return;
    
    try {
      const newDoc = createDocument(activeProjectId, title.trim());
      setRefreshKey(k => k + 1);
      handleDocumentSelect(newDoc);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to create document');
    }
  }, [activeProjectId, handleDocumentSelect]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);
  
  // Snippet handlers
  const handleSnippetClick = useCallback((snippet: Snippet) => {
    // Load snippets for the snippet's project if needed
    if (snippet.projectId !== activeProjectId) {
      loadSnippets(snippet.projectId);
    }
    // Insert snippet at cursor
    insertSnippet(snippet);
    // Optionally close the panel
    // onClose();
  }, [activeProjectId, loadSnippets, insertSnippet]);
  
  const handleAddSnippet = useCallback((projectId: string) => {
    // Load snippets for the specific project where "Add" was clicked
    loadSnippets(projectId);
    openAddModal();
  }, [loadSnippets, openAddModal]);
  
  const handleEditSnippet = useCallback((snippet: Snippet) => {
    // Ensure snippets are loaded for the snippet's project
    loadSnippets(snippet.projectId);
    openEditModal(snippet);
  }, [loadSnippets, openEditModal]);

  // Panel footer
  const panelFooter = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateFolder}
        disabled={!activeProjectId}
        className="flex-1"
      >
        <FolderPlus className="h-4 w-4 mr-2" />
        New Folder
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateDocument}
        disabled={!activeProjectId}
        className="flex-1"
      >
        <FilePlus className="h-4 w-4 mr-2" />
        New Document
      </Button>
    </div>
  );

  return (
    <>
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      title="My Projects"
      subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}
      footer={panelFooter}
    >
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* New Project button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateProject}
          className="w-full justify-start"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>

        {/* Project list */}
        <div className="space-y-2" key={refreshKey}>
          {projects.map(project => (
            <ProjectSection
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              isExpanded={expandedProjects.has(project.id)}
              selectedDocId={activeDocumentId}
              searchQuery={searchQuery}
              onToggle={() => toggleProject(project.id)}
              onSelect={() => handleProjectSelect(project.id)}
              onDocumentSelect={handleDocumentSelect}
              onRefresh={handleRefresh}
              onSnippetClick={handleSnippetClick}
              onAddSnippet={handleAddSnippet}
              onEditSnippet={handleEditSnippet}
            />
          ))}
          
          {/* Empty state */}
          {projects.length === 0 && (
            <div className="text-center py-8">
              <FolderIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No projects yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create a project to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </SlideOutPanel>
    
    {/* Snippet modals */}
    <SnippetModals />
  </>
  );
}

export default MyProjectsSlideOut;
