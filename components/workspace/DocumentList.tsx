/**
 * @file components/workspace/DocumentList.tsx
 * @description Context-aware document list with folder tree view and version control
 * 
 * Features:
 * - Folder tree view with collapsible folders and highly visible tree connector lines
 * - Nested folder support (folders within folders)
 * - Clear visual hierarchy with proper indentation
 * - Dynamic header showing active project name
 * - Full document titles (baseTitle + version)
 * - Collapsible version groups (shows latest by default)
 * - Individual document rename (creates new document family)
 * - Hover-to-reveal actions
 * - Selected document highlighting
 * - Auto-refresh after all operations
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ProjectDocument, Folder } from '@/lib/types/project';
import { useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  getAllDocuments,
  createDocument,
  deleteDocument,
  renameDocument,
  updateDocument,
} from '@/lib/storage/document-storage';
import {
  getAllFolders,
  createFolder,
  deleteFolder,
  moveFolder,
  updateFolder,
} from '@/lib/storage/folder-storage';
import { 
  FileText, 
  FilePlus,
  Trash2, 
  ChevronRight, 
  Pencil, 
  Folder as FolderIcon,
  FolderPlus,
  FolderInput,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface DocumentListProps {
  /** Callback when user clicks a document to load it in the editor */
  onDocumentClick: (doc: ProjectDocument) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Groups documents by baseTitle and sorts versions within each group
 */
function groupDocumentsByBaseTitle(
  docs: ProjectDocument[]
): Map<string, ProjectDocument[]> {
  const grouped = new Map<string, ProjectDocument[]>();
  
  for (const doc of docs) {
    const existing = grouped.get(doc.baseTitle) || [];
    existing.push(doc);
    grouped.set(doc.baseTitle, existing);
  }
  
  // Sort versions ascending (latest at end)
  for (const [baseTitle, versions] of grouped) {
    versions.sort((a, b) => a.version - b.version);
    grouped.set(baseTitle, versions);
  }
  
  return grouped;
}

// ============================================================================
// DocumentRow Component (with inline rename)
// ============================================================================

interface DocumentRowProps {
  doc: ProjectDocument;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  onSelect: (doc: ProjectDocument) => void;
  onDelete: (doc: ProjectDocument) => void;
  onStartRename: (doc: ProjectDocument) => void;
  onEditValueChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  /** Callback when move button is clicked */
  onMove: (doc: ProjectDocument) => void;
  /** Show horizontal connector line */
  showConnector?: boolean;
}

function DocumentRow({
  doc,
  isSelected,
  isEditing,
  editValue,
  onSelect,
  onDelete,
  onStartRename,
  onEditValueChange,
  onSaveRename,
  onCancelRename,
  onMove,
  showConnector = false,
}: DocumentRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelRename();
    }
  };
  
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer',
        'transition-colors duration-100',
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-accent/60'
      )}
      onClick={() => !isEditing && onSelect(doc)}
    >
      {/* Horizontal connector line - dark and visible */}
      {showConnector && (
        <div className="w-3 h-px bg-foreground/30 -ml-2 flex-shrink-0" />
      )}
      
      {/* File icon */}
      <FileText className={cn(
        'h-3 w-3 flex-shrink-0',
        isSelected ? 'text-primary' : 'text-muted-foreground'
      )} />
      
      {/* Title - editable or display */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onSaveRename}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex-1 text-xs bg-background min-w-0',
            'border border-primary rounded px-1 py-0.5',
            'focus:outline-none focus:ring-1 focus:ring-primary'
          )}
          placeholder="Enter new name..."
        />
      ) : (
        <span
          className={cn(
            'flex-1 truncate text-xs',
            isSelected ? 'font-medium text-primary' : 'text-foreground'
          )}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartRename(doc);
          }}
          title={doc.title}
        >
          {doc.title}
        </span>
      )}
      
      {/* Action buttons - visible on hover */}
      {!isEditing && (
        <>
          {/* Rename button */}
          <button
            className={cn(
              'flex-shrink-0 p-0.5 rounded',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-accent',
              'transition-opacity duration-100'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onStartRename(doc);
            }}
            title="Rename (creates new document)"
          >
            <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
          
          {/* Move button */}
          <button
            className={cn(
              'flex-shrink-0 p-0.5 rounded',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-accent',
              'transition-opacity duration-100'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onMove(doc);
            }}
            title="Move to folder"
          >
            <FolderInput className="h-3 w-3 text-muted-foreground" />
          </button>
          
          {/* Delete button */}
          <button
            className={cn(
              'flex-shrink-0 p-0.5 rounded',
              'opacity-0 group-hover:opacity-100',
              'hover:bg-destructive/10 hover:text-destructive',
              'transition-opacity duration-100'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc);
            }}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Document Group Component
// ============================================================================

interface DocumentGroupProps {
  baseTitle: string;
  versions: ProjectDocument[];
  isExpanded: boolean;
  selectedDocId: string | null;
  editingDocId: string | null;
  editValue: string;
  onToggle: () => void;
  onSelect: (doc: ProjectDocument) => void;
  onDelete: (doc: ProjectDocument) => void;
  onStartRename: (doc: ProjectDocument) => void;
  onEditValueChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  /** Callback when move button is clicked */
  onMove: (doc: ProjectDocument) => void;
  /** Show border-left tree line */
  showTreeLine?: boolean;
}

function DocumentGroup({
  baseTitle,
  versions,
  isExpanded,
  selectedDocId,
  editingDocId,
  editValue,
  onToggle,
  onSelect,
  onDelete,
  onStartRename,
  onEditValueChange,
  onSaveRename,
  onCancelRename,
  onMove,
  showTreeLine = false,
}: DocumentGroupProps) {
  const latestVersion = versions[versions.length - 1];
  const hasMultipleVersions = versions.length > 1;
  
  // Single version - just show the document
  if (!hasMultipleVersions) {
    return (
      <div className={cn(showTreeLine && 'border-l-2 border-foreground/30 ml-2')}>
        <DocumentRow
          doc={latestVersion}
          isSelected={latestVersion.id === selectedDocId}
          isEditing={editingDocId === latestVersion.id}
          editValue={editValue}
          onSelect={onSelect}
          onDelete={onDelete}
          onStartRename={onStartRename}
          onEditValueChange={onEditValueChange}
          onSaveRename={onSaveRename}
          onCancelRename={onCancelRename}
          onMove={onMove}
          showConnector={showTreeLine}
        />
      </div>
    );
  }
  
  // Multiple versions - show group header with expandable versions
  return (
    <div className={cn(showTreeLine && 'border-l-2 border-foreground/30 ml-2')}>
      {/* Group header */}
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded',
          'hover:bg-accent/40 cursor-pointer',
          'transition-colors duration-100'
        )}
        onClick={onToggle}
      >
        {/* Horizontal connector - dark and visible */}
        {showTreeLine && (
          <div className="w-3 h-px bg-foreground/30 -ml-2 flex-shrink-0" />
        )}
        
        {/* Expand/collapse chevron */}
        <ChevronRight className={cn(
          'h-3 w-3 text-muted-foreground transition-transform duration-150',
          isExpanded && 'rotate-90'
        )} />
        
        {/* Group title - medium weight */}
        <span className="flex-1 text-xs font-medium truncate text-foreground">
          {baseTitle}
        </span>
        
        {/* Version count badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
          {versions.length}v
        </span>
      </div>
      
      {/* Expanded versions - indented with dark tree line */}
      {isExpanded && (
        <div className="pl-4 border-l-2 border-foreground/30 ml-2">
          {versions.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              isSelected={doc.id === selectedDocId}
              isEditing={editingDocId === doc.id}
              editValue={editValue}
              onSelect={onSelect}
              onDelete={onDelete}
              onStartRename={onStartRename}
              onEditValueChange={onEditValueChange}
              onSaveRename={onSaveRename}
              onCancelRename={onCancelRename}
              onMove={onMove}
              showConnector={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DocumentList({ onDocumentClick }: DocumentListProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [groupedDocs, setGroupedDocs] = useState<Map<string, ProjectDocument[]>>(new Map());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Individual document editing state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Folder editing state
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Drag-and-drop state
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dragActiveType, setDragActiveType] = useState<'folder' | 'document' | null>(null);
  
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  // ---------------------------------------------------------------------------
  // Drag-and-Drop Configuration
  // ---------------------------------------------------------------------------
  
  /** Configure sensors for drag detection - requires 8px movement to start drag */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // ---------------------------------------------------------------------------
  // Derived State - Dynamic Labels
  // ---------------------------------------------------------------------------
  
  // Get active project for dynamic button text
  const activeProject = projects.find(p => p.id === activeProjectId);
  
  // Dynamic button text - shortened to fit sidebar width
  // Shows "{Project} Doc" instead of "New {Project} Doc"
  const newDocButtonText = activeProject
    ? `${activeProject.name} Doc`
    : 'New Doc';
  
  // Dynamic folder button text - shortened to fit sidebar width
  // Shows "{Project} Folder" instead of "New {Project} Folder"
  const newFolderButtonText = activeProject
    ? `${activeProject.name} Folder`
    : 'New Folder';
  
  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------
  
  /** Load documents from storage */
  const loadDocuments = useCallback(() => {
    if (!activeProjectId) {
      setDocuments([]);
      setGroupedDocs(new Map());
      return;
    }
    
    try {
      const docs = getAllDocuments(activeProjectId);
      setDocuments(docs);
      setGroupedDocs(groupDocumentsByBaseTitle(docs));
      console.log(`📄 Loaded ${docs.length} document(s)`);
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
      setDocuments([]);
      setGroupedDocs(new Map());
    }
  }, [activeProjectId]);
  
  /** Load folders from storage */
  const loadFolders = useCallback(() => {
    if (!activeProjectId) {
      setFolders([]);
      return;
    }
    
    try {
      const projectFolders = getAllFolders(activeProjectId);
      setFolders(projectFolders);
      console.log(`📁 Loaded ${projectFolders.length} folder(s)`);
    } catch (error) {
      console.error('❌ Failed to load folders:', error);
      setFolders([]);
    }
  }, [activeProjectId]);
  
  /** Refresh all data (documents and folders) - fixes auto-refresh issues */
  const refreshAll = useCallback(() => {
    loadDocuments();
    loadFolders();
  }, [loadDocuments, loadFolders]);
  
  // Load data on mount and when active project changes
  useEffect(() => {
    if (activeProjectId) {
      loadDocuments();
      loadFolders();
    } else {
      setDocuments([]);
      setFolders([]);
      setGroupedDocs(new Map());
    }
  }, [activeProjectId, loadDocuments, loadFolders]);
  
  // ---------------------------------------------------------------------------
  // Folder Handlers
  // ---------------------------------------------------------------------------
  
  /** Toggle folder expansion */
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);
  
  /** Create a new folder */
  const handleCreateFolder = useCallback(() => {
    if (!activeProjectId) return;
    
    const name = window.prompt('Folder name:');
    if (!name?.trim()) return;
    
    try {
      createFolder(activeProjectId, name.trim(), currentFolderId || undefined);
      refreshAll();
      console.log('✅ Folder created:', name);
    } catch (error) {
      console.error('❌ Failed to create folder:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to create folder');
    }
  }, [activeProjectId, currentFolderId, refreshAll]);
  
  /** Delete a folder */
  const handleDeleteFolder = useCallback((folder: Folder) => {
    if (!activeProjectId) return;
    
    const confirmed = window.confirm(
      `Delete folder "${folder.name}"?\n\nNote: Folders must be empty before deletion.`
    );
    
    if (!confirmed) return;
    
    try {
      deleteFolder(activeProjectId, folder.id);
      refreshAll();
      console.log('✅ Folder deleted:', folder.name);
    } catch (error) {
      console.error('❌ Failed to delete folder:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to delete folder');
    }
  }, [activeProjectId, refreshAll]);
  
  /** Start inline rename for a folder */
  const startFolderRename = useCallback((folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  }, []);
  
  /** Save folder rename */
  const saveFolderRename = useCallback((folderId: string) => {
    if (!activeProjectId || !editingFolderName.trim()) {
      setEditingFolderId(null);
      setEditingFolderName('');
      return;
    }
    
    try {
      updateFolder(activeProjectId, folderId, { name: editingFolderName.trim() });
      refreshAll();
      console.log('✅ Folder renamed');
    } catch (error) {
      console.error('❌ Failed to rename folder:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to rename folder');
    } finally {
      setEditingFolderId(null);
      setEditingFolderName('');
    }
  }, [activeProjectId, editingFolderName, refreshAll]);
  
  /** Cancel folder rename */
  const cancelFolderRename = useCallback(() => {
    setEditingFolderId(null);
    setEditingFolderName('');
  }, []);
  
  /** Move folder to another folder */
  const handleMoveFolder = useCallback((folderId: string) => {
    if (!activeProjectId) return;
    
    // Get all folders except the one being moved
    const allFolders = getAllFolders(activeProjectId).filter(f => f.id !== folderId);
    
    if (allFolders.length === 0) {
      const moveToRoot = window.confirm('No other folders. Move to root level?');
      if (moveToRoot) {
        try {
          moveFolder(activeProjectId, folderId, null);
          refreshAll();
          console.log('✅ Folder moved to root');
        } catch (error) {
          window.alert(error instanceof Error ? error.message : 'Failed to move folder');
        }
      }
      return;
    }
    
    // Build prompt with folder options
    const folderOptions = allFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = window.prompt(
      `Move folder into:\n\n${folderOptions}\n\n0. Move to root\n\nEnter number:`
    );
    
    if (choice === null) return; // Cancelled
    
    const index = parseInt(choice) - 1;
    
    try {
      if (choice === '0') {
        moveFolder(activeProjectId, folderId, null);
      } else if (index >= 0 && index < allFolders.length) {
        moveFolder(activeProjectId, folderId, allFolders[index].id);
      } else {
        window.alert('Invalid choice');
        return;
      }
      
      refreshAll();
      console.log('✅ Folder moved');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to move folder');
      console.error('❌ Failed to move folder:', error);
    }
  }, [activeProjectId, refreshAll]);
  
  // ---------------------------------------------------------------------------
  // Document Handlers
  // ---------------------------------------------------------------------------
  
  /** Toggle version group expansion */
  const toggleGroup = useCallback((baseTitle: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(baseTitle)) {
        next.delete(baseTitle);
      } else {
        next.add(baseTitle);
      }
      return next;
    });
  }, []);
  
  /** Start inline rename for a specific document */
  const startRename = useCallback((doc: ProjectDocument) => {
    setEditingDocId(doc.id);
    setEditValue(doc.baseTitle);
  }, []);
  
  /** 
   * Save rename - renames individual document to a new family
   * The document becomes v1 of a NEW baseTitle, breaking away from original group
   */
  const saveRename = useCallback(() => {
    if (!editingDocId || !activeProjectId || !editValue.trim()) {
      setEditingDocId(null);
      setEditValue('');
      return;
    }
    
    // Find the document being edited
    const doc = documents.find(d => d.id === editingDocId);
    if (!doc) {
      setEditingDocId(null);
      setEditValue('');
      return;
    }
    
    const newTitle = editValue.trim();
    
    // If title unchanged, just cancel
    if (newTitle === doc.baseTitle) {
      setEditingDocId(null);
      setEditValue('');
      return;
    }
    
    try {
      // Rename document to new family (becomes v1 of new baseTitle)
      const renamedDoc = renameDocument(activeProjectId, doc.id, newTitle);
      
      console.log('✅ Renamed document:', {
        id: renamedDoc.id,
        oldTitle: doc.title,
        newTitle: renamedDoc.title,
      });
      
      refreshAll();
      
      // Update selection to the renamed document
      setSelectedDocId(renamedDoc.id);
      onDocumentClick(renamedDoc);
      
    } catch (error) {
      console.error('❌ Failed to rename document:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to rename document');
    } finally {
      setEditingDocId(null);
      setEditValue('');
    }
  }, [editingDocId, editValue, activeProjectId, documents, refreshAll, onDocumentClick]);
  
  /** Cancel rename */
  const cancelRename = useCallback(() => {
    setEditingDocId(null);
    setEditValue('');
  }, []);
  
  /** Create new document */
  const handleCreateDocument = useCallback(() => {
    if (!activeProjectId) return;
    
    const defaultName = activeProject ? `${activeProject.name} Doc` : 'New Document';
    const title = window.prompt('Document title:', defaultName);
    if (!title?.trim()) return;
    
    try {
      setIsLoading(true);
      const newDoc = createDocument(activeProjectId, title.trim());
      
      // If currently viewing a folder, place document in that folder
      if (currentFolderId) {
        updateDocument(activeProjectId, newDoc.id, { folderId: currentFolderId });
      }
      
      refreshAll();
      onDocumentClick(newDoc);
      setSelectedDocId(newDoc.id);
      console.log('✅ Document created:', title.trim());
    } catch (error) {
      console.error('❌ Failed to create document:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to create document');
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, activeProject, currentFolderId, refreshAll, onDocumentClick]);
  
  /** Delete a document */
  const handleDelete = useCallback((doc: ProjectDocument) => {
    if (!activeProjectId) return;
    
    // Get version count for this baseTitle
    const versions = groupedDocs.get(doc.baseTitle) || [];
    const versionInfo = versions.length > 1 
      ? `\n\nNote: This will only delete "${doc.title}". ${versions.length - 1} other version(s) will remain.`
      : '';
    
    const confirmed = window.confirm(
      `Delete "${doc.title}"?${versionInfo}\n\nThis cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      deleteDocument(activeProjectId, doc.id);
      refreshAll();
      if (selectedDocId === doc.id) {
        setSelectedDocId(null);
      }
      console.log('✅ Document deleted:', doc.title);
    } catch (error) {
      console.error('❌ Failed to delete document:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to delete document');
    }
  }, [activeProjectId, groupedDocs, refreshAll, selectedDocId]);
  
  /** Select and load document */
  const handleSelect = useCallback((doc: ProjectDocument) => {
    setSelectedDocId(doc.id);
    onDocumentClick(doc);
  }, [onDocumentClick]);
  
  /** Move document to a folder */
  const handleMoveDocument = useCallback((docId: string) => {
    if (!activeProjectId) return;
    
    // Get all folders for picker
    const allFolders = getAllFolders(activeProjectId);
    
    if (allFolders.length === 0) {
      window.alert('No folders available. Create a folder first.');
      return;
    }
    
    // Build prompt with folder options
    const folderOptions = allFolders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const choice = window.prompt(
      `Move document to folder:\n\n${folderOptions}\n\n0. Move to root (no folder)\n\nEnter number:`
    );
    
    if (choice === null) return; // Cancelled
    
    const index = parseInt(choice) - 1;
    
    try {
      if (choice === '0') {
        // Move to root (remove from folder)
        updateDocument(activeProjectId, docId, { folderId: undefined });
      } else if (index >= 0 && index < allFolders.length) {
        // Move to selected folder
        updateDocument(activeProjectId, docId, { folderId: allFolders[index].id });
      } else {
        window.alert('Invalid choice');
        return;
      }
      
      refreshAll();
      console.log('✅ Document moved');
    } catch (error) {
      console.error('❌ Failed to move document:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to move document');
    }
  }, [activeProjectId, refreshAll]);
  
  /** Move a document directly to root (no folder) */
  const handleMoveDocumentToRoot = useCallback((docId: string) => {
    if (!activeProjectId) return;
    
    try {
      updateDocument(activeProjectId, docId, { folderId: undefined });
      refreshAll();
      console.log('✅ Document moved to root');
    } catch (error) {
      console.error('❌ Failed to move document:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to move document');
    }
  }, [activeProjectId, refreshAll]);
  
  /** Move a folder directly to root (no parent) */
  const handleMoveFolderToRoot = useCallback((folderId: string) => {
    if (!activeProjectId) return;
    
    try {
      moveFolder(activeProjectId, folderId, null);
      refreshAll();
      console.log('✅ Folder moved to root');
    } catch (error) {
      console.error('❌ Failed to move folder:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to move folder');
    }
  }, [activeProjectId, refreshAll]);
  
  // ---------------------------------------------------------------------------
  // Drag-and-Drop Handlers
  // ---------------------------------------------------------------------------
  
  /** Handle drag start - track what's being dragged */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const idString = active.id as string;
    const [type, id] = idString.split(':');
    setDragActiveId(id);
    setDragActiveType(type as 'folder' | 'document');
    console.log('🎯 Drag started:', type, id);
  }, []);
  
  /** Handle drag end - perform the move operation */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !activeProjectId) {
      setDragActiveId(null);
      setDragActiveType(null);
      return;
    }
    
    const activeIdString = active.id as string;
    const overIdString = over.id as string;
    const [activeType, activeId] = activeIdString.split(':');
    const [overType, overId] = overIdString.split(':');
    
    console.log('📍 Drag ended:', { activeType, activeId, overType, overId });
    
    try {
      if (activeType === 'document') {
        // Dragging a document
        if (overType === 'folder') {
          // Drop document into folder
          updateDocument(activeProjectId, activeId, { folderId: overId });
          console.log('✅ Document moved to folder');
        } else if (overType === 'root') {
          // Drop document to root
          updateDocument(activeProjectId, activeId, { folderId: undefined });
          console.log('✅ Document moved to root');
        }
      } else if (activeType === 'folder') {
        // Dragging a folder
        if (overType === 'folder' && overId !== activeId) {
          // Drop folder into another folder (nest it)
          moveFolder(activeProjectId, activeId, overId);
          console.log('✅ Folder moved into folder');
        } else if (overType === 'root') {
          // Drop folder to root
          moveFolder(activeProjectId, activeId, null);
          console.log('✅ Folder moved to root');
        }
      }
      
      refreshAll();
    } catch (error) {
      console.error('❌ Failed to move item:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to move item');
    }
    
    setDragActiveId(null);
    setDragActiveType(null);
  }, [activeProjectId, refreshAll]);
  
  // ---------------------------------------------------------------------------
  // Root Drop Target - entire content area is droppable
  // ---------------------------------------------------------------------------
  
  /** Make the entire content area droppable for moving items to root */
  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: 'root:root',
  });
  
  // ---------------------------------------------------------------------------
  // Draggable Folder Item Component
  // ---------------------------------------------------------------------------
  
  /** Individual draggable/droppable folder item */
  const DraggableFolderItem = useCallback(({ 
    folder, 
    level,
  }: { 
    folder: Folder; 
    level: number;
  }) => {
    const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
      id: `folder:${folder.id}`,
    });
    
    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: `folder:${folder.id}`,
    });
    
    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = folders.filter(f => f.parentFolderId === folder.id);
    const folderDocs = documents.filter(d => d.folderId === folder.id);
    const folderGroupedDocs = groupDocumentsByBaseTitle(folderDocs);
    const isEmpty = childFolders.length === 0 && folderDocs.length === 0;
    
    const groupEntries = Array.from(folderGroupedDocs.entries());
    
    // Root folders (level 0) have NO border or margin
    // Nested folders have tree line
    const isNested = level > 0;
    
    const isEditingThisFolder = editingFolderId === folder.id;
    
    return (
      <div 
        style={{ opacity: isDragging ? 0.5 : 1 }}
        className={cn(isNested && 'border-l-2 border-foreground/30 ml-2')}
      >
        {/* Folder header - draggable AND droppable */}
        <div 
          ref={(node) => {
            // Combine both refs - this div is both draggable and a drop target
            setDragRef(node);
            setDropRef(node);
          }}
          {...attributes}
          {...listeners}
          className={cn(
            'group flex items-center gap-1 px-2 py-1.5 hover:bg-accent rounded cursor-pointer',
            'transition-colors duration-100',
            isOver && 'bg-accent ring-2 ring-primary'
          )}
          onClick={() => !isEditingThisFolder && toggleFolder(folder.id)}
        >
          {/* Horizontal connector for nested folders - dark and visible */}
          {isNested && (
            <div className="w-3 h-px bg-foreground/30 -ml-2 flex-shrink-0" />
          )}
          
          {/* Chevron icon */}
          <ChevronRight 
            className={cn(
              'h-3 w-3 transition-transform duration-150 text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing',
              isExpanded && 'rotate-90'
            )} 
          />
          
          {/* Blue folder icon */}
          <FolderIcon className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          
          {/* Folder name - editable or display */}
          {isEditingThisFolder ? (
            <input
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={() => saveFolderRename(folder.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveFolderRename(folder.id);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelFolderRename();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex-1 text-xs font-semibold bg-background min-w-0',
                'border border-primary rounded px-1 py-0.5',
                'focus:outline-none focus:ring-1 focus:ring-primary'
              )}
              autoFocus
              placeholder="Folder name..."
            />
          ) : (
            <span 
              className="flex-1 truncate text-xs font-semibold text-foreground"
              onDoubleClick={(e) => {
                e.stopPropagation();
                startFolderRename(folder);
              }}
              title={folder.name}
            >
              {folder.name}
            </span>
          )}
          
          {/* Document count badge */}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
            {folderDocs.length}
          </span>
          
          {/* Action buttons - visible on hover */}
          {!isEditingThisFolder && (
            <>
              {/* Rename folder button */}
              <button
                className={cn(
                  'flex-shrink-0 p-0.5 rounded',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-accent',
                  'transition-opacity duration-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  startFolderRename(folder);
                }}
                title="Rename folder"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
              
              {/* Delete folder button */}
              <button
                className={cn(
                  'flex-shrink-0 p-0.5 rounded',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-destructive/10 hover:text-destructive',
                  'transition-opacity duration-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder);
                }}
                title="Delete folder"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
        
        {/* Folder contents (when expanded) */}
        {isExpanded && (
          <div className="pl-4">
            {/* Empty folder message */}
            {isEmpty && (
              <div className="border-l-2 border-foreground/30 ml-2">
                <div className="flex items-center px-2 py-1.5">
                  <div className="w-3 h-px bg-foreground/30 -ml-2 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground italic ml-1">
                    Drop documents here
                  </span>
                </div>
              </div>
            )}
            
            {/* Subfolders */}
            {childFolders.map((subfolder) => (
              <DraggableFolderItem 
                key={subfolder.id} 
                folder={subfolder} 
                level={level + 1}
              />
            ))}
            
            {/* Documents in this folder - grouped by baseTitle */}
            {groupEntries.map(([baseTitle, versions]) => (
              <DraggableDocumentGroup
                key={baseTitle}
                baseTitle={baseTitle}
                versions={versions}
                showTreeLine={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [
    expandedFolders, 
    folders, 
    documents, 
    editingFolderId,
    editingFolderName,
    toggleFolder, 
    handleDeleteFolder,
    handleMoveFolder,
    handleMoveFolderToRoot,
    startFolderRename,
    saveFolderRename,
    cancelFolderRename,
  ]);
  
  // ---------------------------------------------------------------------------
  // Draggable Document Group Component
  // ---------------------------------------------------------------------------
  
  /** Document group with draggable documents */
  const DraggableDocumentGroup = useCallback(({
    baseTitle,
    versions,
    showTreeLine = false,
  }: {
    baseTitle: string;
    versions: ProjectDocument[];
    showTreeLine?: boolean;
  }) => {
    const latestVersion = versions[versions.length - 1];
    const hasMultipleVersions = versions.length > 1;
    const isExpanded = expandedGroups.has(baseTitle);
    
    // Single version - just show the draggable document
    if (!hasMultipleVersions) {
      return (
        <div className={cn(showTreeLine && 'border-l-2 border-foreground/30 ml-2')}>
          <DraggableDocumentRow
            doc={latestVersion}
            showConnector={showTreeLine}
          />
        </div>
      );
    }
    
    // Multiple versions - show group header with expandable versions
    return (
      <div className={cn(showTreeLine && 'border-l-2 border-foreground/30 ml-2')}>
        {/* Group header */}
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded',
            'hover:bg-accent/40 cursor-pointer',
            'transition-colors duration-100'
          )}
          onClick={() => toggleGroup(baseTitle)}
        >
          {/* Horizontal connector - dark and visible */}
          {showTreeLine && (
            <div className="w-3 h-px bg-foreground/30 -ml-2 flex-shrink-0" />
          )}
          
          {/* Expand/collapse chevron */}
          <ChevronRight className={cn(
            'h-3 w-3 text-muted-foreground transition-transform duration-150',
            isExpanded && 'rotate-90'
          )} />
          
          {/* Group title - medium weight */}
          <span className="flex-1 text-xs font-medium truncate text-foreground">
            {baseTitle}
          </span>
          
          {/* Version count badge */}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {versions.length}v
          </span>
        </div>
        
        {/* Expanded versions - indented with dark tree line */}
        {isExpanded && (
          <div className="pl-4 border-l-2 border-foreground/30 ml-2">
            {versions.map((doc) => (
              <DraggableDocumentRow
                key={doc.id}
                doc={doc}
                showConnector={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [expandedGroups, toggleGroup]);
  
  // ---------------------------------------------------------------------------
  // Draggable Document Row Component
  // ---------------------------------------------------------------------------
  
  /** Individual draggable document row */
  const DraggableDocumentRow = useCallback(({
    doc,
    showConnector = false,
  }: {
    doc: ProjectDocument;
    showConnector?: boolean;
  }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `document:${doc.id}`,
    });
    
    const isSelected = doc.id === selectedDocId;
    const isEditing = editingDocId === doc.id;
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Focus input when entering edit mode
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelRename();
      }
    };
    
    // Stop propagation to prevent folder from capturing drag events
    const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
    };
    
    return (
      <div
        ref={setNodeRef}
        style={{ opacity: isDragging ? 0.5 : 1 }}
        className={cn(
          'group flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer',
          'transition-colors duration-100',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-accent/60'
        )}
        onClick={(e) => {
          e.stopPropagation(); // Stop click from bubbling to folder
          if (!isEditing) handleSelect(doc);
        }}
        onMouseDown={handleMouseDown} // Stop drag events from bubbling to folder
      >
        {/* Horizontal connector line - dark and visible */}
        {showConnector && (
          <div className="w-3 h-px bg-foreground/30 -ml-2 flex-shrink-0" />
        )}
        
        {/* Drag handle */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <FileText className={cn(
            'h-3 w-3 flex-shrink-0',
            isSelected ? 'text-primary' : 'text-muted-foreground'
          )} />
        </div>
        
        {/* Title - editable or display */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveRename}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'flex-1 text-xs bg-background min-w-0',
              'border border-primary rounded px-1 py-0.5',
              'focus:outline-none focus:ring-1 focus:ring-primary'
            )}
            placeholder="Enter new name..."
          />
        ) : (
          <span
            className={cn(
              'flex-1 truncate text-xs',
              isSelected ? 'font-medium text-primary' : 'text-foreground'
            )}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startRename(doc);
            }}
            title={doc.title}
          >
            {doc.title}
          </span>
        )}
        
        {/* Action buttons - visible on hover */}
        {!isEditing && (
          <>
            {/* Rename button */}
            <button
              className={cn(
                'flex-shrink-0 p-0.5 rounded',
                'opacity-0 group-hover:opacity-100',
                'hover:bg-accent',
                'transition-opacity duration-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                startRename(doc);
              }}
              title="Rename (creates new document)"
            >
              <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
            
            {/* Move to root button - only for docs in folders */}
            {doc.folderId && (
              <button
                className={cn(
                  'flex-shrink-0 p-0.5 rounded',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-accent',
                  'transition-opacity duration-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveDocumentToRoot(doc.id);
                }}
                title="Move to root"
              >
                <Home className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
            
            {/* Delete button */}
            <button
              className={cn(
                'flex-shrink-0 p-0.5 rounded',
                'opacity-0 group-hover:opacity-100',
                'hover:bg-destructive/10 hover:text-destructive',
                'transition-opacity duration-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(doc);
              }}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    );
  }, [selectedDocId, editingDocId, editValue, handleSelect, handleDelete, startRename, saveRename, cancelRename, handleMoveDocumentToRoot]);
  
  // ---------------------------------------------------------------------------
  // Legacy Folder Tree Item Component (kept for reference)
  // ---------------------------------------------------------------------------
  
  const FolderTreeItem = useCallback(({ 
    folder, 
    level,
  }: { 
    folder: Folder; 
    level: number;
  }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = folders.filter(f => f.parentFolderId === folder.id);
    const folderDocs = documents.filter(d => d.folderId === folder.id);
    const folderGroupedDocs = groupDocumentsByBaseTitle(folderDocs);
    const isEmpty = childFolders.length === 0 && folderDocs.length === 0;
    
    const groupEntries = Array.from(folderGroupedDocs.entries());
    
    // Root folders (level 0) have NO border or margin
    // Nested folders have tree line
    const isNested = level > 0;
    
    const isEditingThisFolder = editingFolderId === folder.id;
    
    return (
      <div className={cn(isNested && 'border-l-2 border-foreground/30 ml-2')}>
        {/* Folder header */}
        <div 
          className={cn(
            'group flex items-center gap-1 px-2 py-1.5 hover:bg-accent rounded cursor-pointer',
            'transition-colors duration-100'
          )}
          onClick={() => !isEditingThisFolder && toggleFolder(folder.id)}
        >
          {/* Horizontal connector for nested folders - dark and visible */}
          {isNested && (
            <div className="w-3 h-px bg-foreground/30 -ml-2 flex-shrink-0" />
          )}
          
          {/* Expand/collapse chevron */}
          <ChevronRight 
            className={cn(
              'h-3 w-3 transition-transform duration-150 text-muted-foreground flex-shrink-0',
              isExpanded && 'rotate-90'
            )} 
          />
          
          {/* Blue folder icon */}
          <FolderIcon className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          
          {/* Folder name - editable or display */}
          {isEditingThisFolder ? (
            <input
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={() => saveFolderRename(folder.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveFolderRename(folder.id);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelFolderRename();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex-1 text-xs font-semibold bg-background min-w-0',
                'border border-primary rounded px-1 py-0.5',
                'focus:outline-none focus:ring-1 focus:ring-primary'
              )}
              autoFocus
              placeholder="Folder name..."
            />
          ) : (
            <span 
              className="flex-1 truncate text-xs font-semibold text-foreground"
              onDoubleClick={(e) => {
                e.stopPropagation();
                startFolderRename(folder);
              }}
              title={folder.name}
            >
              {folder.name}
            </span>
          )}
          
          {/* Document count badge */}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
            {folderDocs.length}
          </span>
          
          {/* Action buttons - visible on hover */}
          {!isEditingThisFolder && (
            <>
              {/* Rename folder button */}
              <button
                className={cn(
                  'flex-shrink-0 p-0.5 rounded',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-accent',
                  'transition-opacity duration-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  startFolderRename(folder);
                }}
                title="Rename folder"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
              
              {/* Move folder button */}
              <button
                className={cn(
                  'flex-shrink-0 p-0.5 rounded',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-accent',
                  'transition-opacity duration-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveFolder(folder.id);
                }}
                title="Move folder"
              >
                <FolderInput className="h-3 w-3 text-muted-foreground" />
              </button>
              
              {/* Move to root button - only for nested folders */}
              {folder.parentFolderId && (
                <button
                  className={cn(
                    'flex-shrink-0 p-0.5 rounded',
                    'opacity-0 group-hover:opacity-100',
                    'hover:bg-accent',
                    'transition-opacity duration-100'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveFolderToRoot(folder.id);
                  }}
                  title="Move to root"
                >
                  <Home className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
              
              {/* Delete folder button */}
              <button
                className={cn(
                  'flex-shrink-0 p-0.5 rounded',
                  'opacity-0 group-hover:opacity-100',
                  'hover:bg-destructive/10 hover:text-destructive',
                  'transition-opacity duration-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder);
                }}
                title="Delete folder"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
        
        {/* Folder contents (when expanded) */}
        {isExpanded && (
          <div className="pl-4">
            {/* Empty folder message */}
            {isEmpty && (
              <div className="border-l-2 border-foreground/30 ml-2">
                <div className="flex items-center px-2 py-1.5">
                  <div className="w-3 h-px bg-foreground/30 -ml-2 flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground italic ml-1">
                    No documents in this folder
                  </span>
                </div>
              </div>
            )}
            
            {/* Subfolders */}
            {childFolders.map((subfolder) => (
              <FolderTreeItem 
                key={subfolder.id} 
                folder={subfolder} 
                level={level + 1}
              />
            ))}
            
            {/* Documents in this folder - grouped by baseTitle */}
            {groupEntries.map(([baseTitle, versions]) => (
              <DocumentGroup
                key={baseTitle}
                baseTitle={baseTitle}
                versions={versions}
                isExpanded={expandedGroups.has(baseTitle)}
                selectedDocId={selectedDocId}
                editingDocId={editingDocId}
                editValue={editValue}
                onToggle={() => toggleGroup(baseTitle)}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onStartRename={startRename}
                onEditValueChange={setEditValue}
                onSaveRename={saveRename}
                onCancelRename={cancelRename}
                onMove={(doc) => handleMoveDocument(doc.id)}
                showTreeLine={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [
    expandedFolders, 
    expandedGroups, 
    folders, 
    documents, 
    selectedDocId, 
    editingDocId, 
    editValue, 
    editingFolderId,
    editingFolderName,
    toggleFolder, 
    toggleGroup,
    handleSelect,
    handleDelete,
    handleDeleteFolder,
    handleMoveFolder,
    startRename,
    saveRename,
    cancelRename,
    startFolderRename,
    saveFolderRename,
    cancelFolderRename,
  ]);
  
  // ---------------------------------------------------------------------------
  // Derived Data for Render
  // ---------------------------------------------------------------------------
  
  // Get root-level folders
  const rootFolders = folders.filter(f => !f.parentFolderId);
  
  // Get root-level documents (not in any folder)
  const rootDocuments = documents.filter(d => !d.folderId);
  const rootGroupedDocs = groupDocumentsByBaseTitle(rootDocuments);
  const rootGroupEntries = Array.from(rootGroupedDocs.entries());
  
  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  
  // Find active item for drag overlay
  const activeDragFolder = dragActiveType === 'folder' 
    ? folders.find(f => f.id === dragActiveId) 
    : null;
  const activeDragDocument = dragActiveType === 'document'
    ? documents.find(d => d.id === dragActiveId)
    : null;
  
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Header with New Folder and New Doc buttons - fixed at top, doesn't scroll */}
        <div className="shrink-0 px-2 py-2 border-b border-border">
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateFolder}
              disabled={!activeProjectId || isLoading}
              className="flex-1 justify-start text-xs h-7 px-2 min-w-0"
              title="Create new folder"
            >
              <FolderPlus className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <span className="truncate">{newFolderButtonText}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateDocument}
              disabled={!activeProjectId || isLoading}
              className="flex-1 justify-start text-xs h-7 px-2 min-w-0"
              title="Create new document"
            >
              <FilePlus className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <span className="truncate">{newDocButtonText}</span>
            </Button>
          </div>
        </div>

        {/* Scrollable content area - ENTIRE AREA is droppable for root */}
        <div 
          ref={setRootDropRef}
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden transition-colors duration-200',
            isOverRoot && 'bg-primary/5'
          )}
        >
          {/* No project selected */}
          {!activeProjectId && (
            <div className="text-center text-muted-foreground py-6 px-2">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No project selected</p>
            </div>
          )}

          {activeProjectId && (
            <div className="px-2 pb-4 min-h-full">
              {/* Show hint when dragging over empty areas */}
              {isOverRoot && (
                <div className="sticky top-2 mb-3 p-2 bg-primary/10 border border-primary/20 rounded-lg text-xs text-center text-primary font-medium z-10">
                  📂 Release to move to root level
                </div>
              )}
              
              {/* Root-level folders - draggable and droppable */}
              {rootFolders.map((folder) => (
                <DraggableFolderItem 
                  key={folder.id}
                  folder={folder}
                  level={0}
                />
              ))}
              
              {/* Root-level documents (not in any folder) - draggable */}
              {rootGroupEntries.map(([baseTitle, versions]) => (
                <DraggableDocumentGroup
                  key={baseTitle}
                  baseTitle={baseTitle}
                  versions={versions}
                  showTreeLine={false}
                />
              ))}
              
              {/* Empty state */}
              {documents.length === 0 && folders.length === 0 && (
                <div className="text-center text-muted-foreground py-6">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No documents yet</p>
                  <p className="text-[10px] mt-0.5 opacity-70">
                    Create a folder or document to get started
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Drag overlay - shows what's being dragged */}
      <DragOverlay>
        {activeDragFolder && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-lg">
            <FolderIcon className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold">{activeDragFolder.name}</span>
          </div>
        )}
        {activeDragDocument && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-lg">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">{activeDragDocument.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
