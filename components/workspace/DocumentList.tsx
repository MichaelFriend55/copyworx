/**
 * @file components/workspace/DocumentList.tsx
 * @description Context-aware document list with version control and individual document renaming
 * 
 * Features:
 * - Dynamic header showing active project name
 * - Full document titles (baseTitle + version)
 * - Collapsible version groups (shows latest by default)
 * - Individual document rename (creates new document family)
 * - Hover-to-reveal actions
 * - Selected document highlighting
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ProjectDocument } from '@/lib/types/project';
import { useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import {
  getAllDocuments,
  createDocument,
  deleteDocument,
  renameDocument,
} from '@/lib/storage/document-storage';
import { FileText, Plus, Trash2, ChevronRight, Pencil } from 'lucide-react';
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
  isLatest: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  onSelect: (doc: ProjectDocument) => void;
  onDelete: (doc: ProjectDocument) => void;
  onStartRename: (doc: ProjectDocument) => void;
  onEditValueChange: (value: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
}

function DocumentRow({
  doc,
  isLatest,
  isSelected,
  isEditing,
  editValue,
  onSelect,
  onDelete,
  onStartRename,
  onEditValueChange,
  onSaveRename,
  onCancelRename,
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
            isSelected && 'font-medium',
            isLatest && 'text-foreground',
            !isLatest && 'text-muted-foreground'
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
      
      {/* Latest badge - only for latest version in multi-version groups */}
      {!isEditing && isLatest && (
        <span className="flex-shrink-0 text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
          latest
        </span>
      )}
      
      {/* Rename button - visible on hover */}
      {!isEditing && (
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
      )}
      
      {/* Delete button - visible on hover */}
      {!isEditing && (
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
  
  // Individual document editing state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  // ---------------------------------------------------------------------------
  // Derived State - Dynamic Labels
  // ---------------------------------------------------------------------------
  
  // Get active project for dynamic button text
  const activeProject = projects.find(p => p.id === activeProjectId);
  
  // Dynamic button text - shows "New {Project} Doc"
  const newDocButtonText = activeProject
    ? `New ${activeProject.name} Doc`
    : 'New Doc';
  
  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------
  
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
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
      setDocuments([]);
      setGroupedDocs(new Map());
    }
  }, [activeProjectId]);
  
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);
  
  // ---------------------------------------------------------------------------
  // Handlers
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
      
      loadDocuments();
      
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
  }, [editingDocId, editValue, activeProjectId, documents, loadDocuments, onDocumentClick]);
  
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
      loadDocuments();
      onDocumentClick(newDoc);
      setSelectedDocId(newDoc.id);
    } catch (error) {
      console.error('❌ Failed to create document:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to create document');
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, activeProject, loadDocuments, onDocumentClick]);
  
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
      loadDocuments();
      if (selectedDocId === doc.id) {
        setSelectedDocId(null);
      }
    } catch (error) {
      console.error('❌ Failed to delete document:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to delete document');
    }
  }, [activeProjectId, groupedDocs, loadDocuments, selectedDocId]);
  
  /** Select and load document */
  const handleSelect = useCallback((doc: ProjectDocument) => {
    setSelectedDocId(doc.id);
    onDocumentClick(doc);
  }, [onDocumentClick]);
  
  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with New Doc button only (section title is in collapsible header) */}
      <div className="px-2 py-1.5 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateDocument}
          disabled={!activeProjectId || isLoading}
          className="h-7 px-2 text-xs w-full justify-start"
        >
          <Plus className="h-3 w-3 mr-1.5" />
          {newDocButtonText}
        </Button>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {/* No project selected */}
        {!activeProjectId && (
          <div className="text-center text-muted-foreground py-6">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No project selected</p>
          </div>
        )}

        {/* Document groups */}
        {activeProjectId && Array.from(groupedDocs.entries()).map(([baseTitle, versions]) => {
          const isExpanded = expandedGroups.has(baseTitle);
          const latestVersion = versions[versions.length - 1];
          const hasMultipleVersions = versions.length > 1;
          
          return (
            <div key={baseTitle} className="mb-1">
              {/* Group header - only show for multi-version groups */}
              {hasMultipleVersions && (
                <div
                  className={cn(
                    'flex items-center gap-1 px-1.5 py-1 rounded',
                    'hover:bg-accent/40 cursor-pointer',
                    'transition-colors duration-100'
                  )}
                  onClick={() => toggleGroup(baseTitle)}
                >
                  {/* Expand/collapse chevron */}
                  <ChevronRight className={cn(
                    'h-3 w-3 text-muted-foreground transition-transform duration-150',
                    isExpanded && 'rotate-90'
                  )} />
                  
                  {/* Group title */}
                  <span className="flex-1 text-xs font-medium truncate">
                    {baseTitle}
                  </span>
                  
                  {/* Version count */}
                  <span className="text-[10px] text-muted-foreground mr-1">
                    {versions.length} versions
                  </span>
                </div>
              )}

              {/* Document rows */}
              <div className={cn(hasMultipleVersions && 'ml-3')}>
                {hasMultipleVersions ? (
                  isExpanded ? (
                    // Show all versions when expanded
                    versions.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        isLatest={doc.id === latestVersion.id}
                        isSelected={doc.id === selectedDocId}
                        isEditing={editingDocId === doc.id}
                        editValue={editValue}
                        onSelect={handleSelect}
                        onDelete={handleDelete}
                        onStartRename={startRename}
                        onEditValueChange={setEditValue}
                        onSaveRename={saveRename}
                        onCancelRename={cancelRename}
                      />
                    ))
                  ) : (
                    // Show only latest when collapsed
                    <DocumentRow
                      doc={latestVersion}
                      isLatest={false}
                      isSelected={latestVersion.id === selectedDocId}
                      isEditing={editingDocId === latestVersion.id}
                      editValue={editValue}
                      onSelect={handleSelect}
                      onDelete={handleDelete}
                      onStartRename={startRename}
                      onEditValueChange={setEditValue}
                      onSaveRename={saveRename}
                      onCancelRename={cancelRename}
                    />
                  )
                ) : (
                  // Single version document - show directly without group header
                  <DocumentRow
                    doc={latestVersion}
                    isLatest={false}
                    isSelected={latestVersion.id === selectedDocId}
                    isEditing={editingDocId === latestVersion.id}
                    editValue={editValue}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    onStartRename={startRename}
                    onEditValueChange={setEditValue}
                    onSaveRename={saveRename}
                    onCancelRename={cancelRename}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {documents.length === 0 && activeProjectId && (
          <div className="text-center text-muted-foreground py-6">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No documents yet</p>
            <p className="text-[10px] mt-0.5 opacity-70">
              Click "{newDocButtonText}" to create one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
