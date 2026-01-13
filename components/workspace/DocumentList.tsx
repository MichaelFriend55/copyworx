/**
 * @file components/workspace/DocumentList.tsx
 * @description Document list component with version control display
 * 
 * Displays documents grouped by baseTitle, showing version history.
 * Supports creating new documents, deleting, and loading into editor.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ProjectDocument } from '@/lib/types/project';
import { useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import {
  getAllDocuments,
  createDocument,
  deleteDocument,
} from '@/lib/storage/document-storage';
import { FileText, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
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
 * 
 * @param docs - Array of documents to group
 * @returns Map with baseTitle as key and sorted versions as value
 */
function groupDocumentsByBaseTitle(
  docs: ProjectDocument[]
): Map<string, ProjectDocument[]> {
  const grouped = new Map<string, ProjectDocument[]>();
  
  // Group by baseTitle
  for (const doc of docs) {
    const existing = grouped.get(doc.baseTitle) || [];
    existing.push(doc);
    grouped.set(doc.baseTitle, existing);
  }
  
  // Sort versions within each group (ascending by version number)
  for (const [baseTitle, versions] of grouped) {
    versions.sort((a, b) => a.version - b.version);
    grouped.set(baseTitle, versions);
  }
  
  return grouped;
}

// ============================================================================
// Component
// ============================================================================

/**
 * DocumentList component
 * 
 * Displays documents grouped by baseTitle with version badges.
 * Supports create, delete, and click-to-load functionality.
 */
export default function DocumentList({ onDocumentClick }: DocumentListProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [groupedDocs, setGroupedDocs] = useState<Map<string, ProjectDocument[]>>(
    new Map()
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // ---------------------------------------------------------------------------
  // Store Hooks
  // ---------------------------------------------------------------------------
  
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  // ---------------------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------------------
  
  /**
   * Load documents from storage and group them
   */
  const loadDocuments = useCallback(() => {
    if (!activeProjectId) {
      setDocuments([]);
      setGroupedDocs(new Map());
      return;
    }
    
    try {
      const docs = getAllDocuments(activeProjectId);
      setDocuments(docs);
      
      // Group documents by baseTitle
      const grouped = groupDocumentsByBaseTitle(docs);
      setGroupedDocs(grouped);
      
      // Auto-expand all groups initially
      setExpandedGroups(new Set(grouped.keys()));
      
      console.log('📄 Documents loaded:', {
        count: docs.length,
        groups: grouped.size,
      });
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
      setDocuments([]);
      setGroupedDocs(new Map());
    }
  }, [activeProjectId]);
  
  // Load documents on mount and when activeProjectId changes
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);
  
  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------
  
  /**
   * Handle creating a new document
   */
  const handleCreateDocument = useCallback(() => {
    if (!activeProjectId) {
      console.warn('⚠️ No active project to create document in');
      return;
    }
    
    // Prompt for document title
    const title = window.prompt('Enter document title:');
    
    if (!title || title.trim().length === 0) {
      console.log('📝 Document creation cancelled');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const newDoc = createDocument(activeProjectId, title.trim());
      
      console.log('✅ Document created:', {
        id: newDoc.id,
        title: newDoc.title,
      });
      
      // Reload document list
      loadDocuments();
      
      // Optionally load the new document in the editor
      onDocumentClick(newDoc);
      
    } catch (error) {
      console.error('❌ Failed to create document:', error);
      window.alert(
        error instanceof Error
          ? error.message
          : 'Failed to create document. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, loadDocuments, onDocumentClick]);
  
  /**
   * Handle deleting a document
   */
  const handleDeleteDocument = useCallback(
    (docId: string, docTitle: string) => {
      if (!activeProjectId) {
        console.warn('⚠️ No active project');
        return;
      }
      
      // Confirm deletion
      const confirmed = window.confirm(
        `Are you sure you want to delete "${docTitle}"?\n\nThis action cannot be undone.`
      );
      
      if (!confirmed) {
        console.log('🚫 Document deletion cancelled');
        return;
      }
      
      try {
        deleteDocument(activeProjectId, docId);
        
        console.log('🗑️ Document deleted:', {
          id: docId,
          title: docTitle,
        });
        
        // Reload document list
        loadDocuments();
        
      } catch (error) {
        console.error('❌ Failed to delete document:', error);
        window.alert(
          error instanceof Error
            ? error.message
            : 'Failed to delete document. Please try again.'
        );
      }
    },
    [activeProjectId, loadDocuments]
  );
  
  /**
   * Handle clicking on a document
   */
  const handleDocumentClick = useCallback(
    (doc: ProjectDocument) => {
      console.log('📄 Document clicked:', {
        id: doc.id,
        title: doc.title,
      });
      onDocumentClick(doc);
    },
    [onDocumentClick]
  );
  
  /**
   * Toggle group expansion
   */
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
  
  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with New Document button */}
      <div className="p-4 border-b border-border">
        <Button
          onClick={handleCreateDocument}
          disabled={!activeProjectId || isLoading}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Show message if no active project */}
        {!activeProjectId && (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active project selected</p>
            <p className="text-sm mt-1">Select a project to view documents</p>
          </div>
        )}

        {/* Group documents by baseTitle */}
        {activeProjectId && Array.from(groupedDocs.entries()).map(([baseTitle, versions]) => {
          const isExpanded = expandedGroups.has(baseTitle);
          const hasMultipleVersions = versions.length > 1;
          
          return (
            <div key={baseTitle} className="mb-3">
              {/* Base title header (clickable to expand/collapse if multiple versions) */}
              <div
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md',
                  hasMultipleVersions && 'cursor-pointer hover:bg-accent/50'
                )}
                onClick={() => hasMultipleVersions && toggleGroup(baseTitle)}
              >
                {/* Expand/collapse icon for groups with multiple versions */}
                {hasMultipleVersions ? (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <div className="w-4" /> // Spacer for alignment
                )}
                
                <span className="font-medium text-sm flex-1 truncate">
                  {baseTitle}
                </span>
                
                {/* Version count badge */}
                {hasMultipleVersions && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {versions.length} versions
                  </span>
                )}
              </div>
              
              {/* Version list */}
              {(isExpanded || !hasMultipleVersions) && (
                <div className={cn('space-y-1', hasMultipleVersions && 'ml-6')}>
                  {versions.map((doc) => (
                    <div
                      key={doc.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md',
                        'hover:bg-accent cursor-pointer',
                        'transition-colors duration-150'
                      )}
                    >
                      {/* File icon */}
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      
                      {/* Document title with version badge */}
                      <div
                        className="flex-1 flex items-center gap-2 min-w-0"
                        onClick={() => handleDocumentClick(doc)}
                      >
                        <span className="truncate text-sm">
                          {hasMultipleVersions ? `Version ${doc.version}` : doc.title}
                        </span>
                        <span className="flex-shrink-0 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                          v{doc.version}
                        </span>
                      </div>
                      
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(doc.id, doc.title);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {documents.length === 0 && activeProjectId && (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents yet</p>
            <p className="text-sm mt-1">Create your first document!</p>
          </div>
        )}
      </div>
    </div>
  );
}
