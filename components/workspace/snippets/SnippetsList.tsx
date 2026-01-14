/**
 * @file components/workspace/snippets/SnippetsList.tsx
 * @description Collapsible snippets section for the left sidebar
 * 
 * Features:
 * - Displays all snippets for the active project
 * - Search/filter functionality
 * - Click to insert snippet at cursor
 * - Hover preview with tooltip
 * - Right-click context menu (edit, duplicate, delete)
 * - "+ New Snippet" button
 */

'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  Paperclip, 
  ChevronRight, 
  ChevronDown, 
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  X
} from 'lucide-react';
import { useWorkspaceStore, useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils';
import type { Snippet } from '@/lib/types/project';

/**
 * Props for SnippetsList
 */
interface SnippetsListProps {
  /** Callback when user wants to create a new snippet */
  onCreateSnippet: () => void;
  /** Callback when user wants to edit a snippet */
  onEditSnippet: (snippet: Snippet) => void;
  /** Callback to insert snippet content into editor */
  onInsertSnippet: (snippet: Snippet) => void;
}

/**
 * Strip HTML tags and return plain text preview
 */
function stripHtml(html: string): string {
  const div = typeof document !== 'undefined' 
    ? document.createElement('div') 
    : null;
  
  if (div) {
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
  
  // Fallback for SSR
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
}

/**
 * Individual snippet item with hover preview and context menu
 */
interface SnippetItemProps {
  snippet: Snippet;
  onInsert: (snippet: Snippet) => void;
  onEdit: (snippet: Snippet) => void;
  onDuplicate: (snippetId: string) => void;
  onDelete: (snippetId: string) => void;
}

function SnippetItem({ 
  snippet, 
  onInsert, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: SnippetItemProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const plainTextPreview = useMemo(() => {
    return truncate(stripHtml(snippet.content), 150);
  }, [snippet.content]);
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);
  
  const handleClick = useCallback(() => {
    onInsert(snippet);
  }, [snippet, onInsert]);
  
  const handleMouseEnter = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
    setShowContextMenu(false);
  }, []);
  
  // Close context menu when clicking elsewhere
  React.useEffect(() => {
    if (showContextMenu) {
      const handleClickOutside = () => setShowContextMenu(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);
  
  return (
    <div 
      ref={itemRef}
      className="relative"
      onMouseLeave={handleMouseLeave}
    >
      {/* Snippet Item */}
      <div
        className={cn(
          'group px-1.5 py-0.5 rounded cursor-pointer',
          'hover:bg-accent/60 transition-colors duration-100'
        )}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
      >
        <div className="flex items-start gap-1.5">
          {/* Paperclip icon */}
          <Paperclip className="w-2.5 h-2.5 text-amber-500 mt-0.5 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            {/* Snippet name - bold */}
            <div className="text-[11px] font-semibold text-foreground truncate leading-tight">
              {snippet.name}
            </div>
            
            {/* Description - gray italic */}
            {snippet.description && (
              <div className="text-[9px] text-muted-foreground/70 italic truncate leading-tight">
                {snippet.description}
              </div>
            )}
          </div>
          
          {/* Action buttons - visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-0.5 rounded hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(snippet);
              }}
              title="Edit snippet"
            >
              <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
            <button
              className="p-0.5 rounded hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(snippet.id);
              }}
              title="Duplicate snippet"
            >
              <Copy className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
            <button
              className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(snippet.id);
              }}
              title="Delete snippet"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Hover Tooltip Preview */}
      {showTooltip && (
        <div 
          className={cn(
            'absolute z-50 left-full ml-2 top-0',
            'w-64 p-3 rounded-lg shadow-lg',
            'bg-popover border border-border',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
        >
          <div className="font-semibold text-sm text-foreground mb-1">
            {snippet.name}
          </div>
          
          {snippet.description && (
            <>
              <div className="border-t border-border my-2" />
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Description:</span> {snippet.description}
              </div>
            </>
          )}
          
          <div className="border-t border-border my-2" />
          
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Preview:</span>
            <div className="mt-1 text-foreground/80 italic">
              "{plainTextPreview}"
            </div>
          </div>
          
          <div className="border-t border-border my-2" />
          
          <div className="text-[10px] text-muted-foreground">
            Click to insert
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      {showContextMenu && (
        <div 
          className={cn(
            'fixed z-50 min-w-[140px] p-1 rounded-lg shadow-lg',
            'bg-popover border border-border',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
            onClick={() => {
              setShowContextMenu(false);
              onEdit(snippet);
            }}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
            onClick={() => {
              setShowContextMenu(false);
              onDuplicate(snippet.id);
            }}
          >
            <Copy className="w-3 h-3" />
            Duplicate
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={() => {
              setShowContextMenu(false);
              onDelete(snippet.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * SnippetsList - Collapsible section showing project snippets
 */
export function SnippetsList({ 
  onCreateSnippet, 
  onEditSnippet, 
  onInsertSnippet 
}: SnippetsListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const duplicateSnippet = useWorkspaceStore((state) => state.duplicateSnippet);
  const deleteSnippet = useWorkspaceStore((state) => state.deleteSnippet);
  
  // Get active project - DIRECTLY from projects array for reactivity
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId);
  }, [projects, activeProjectId]);
  
  // Get all snippets for active project - DIRECTLY from project object
  const allSnippets = useMemo(() => {
    if (!activeProject) return [];
    return activeProject.snippets || [];
  }, [activeProject]);
  
  // Filter snippets based on search query
  const snippets = useMemo(() => {
    if (!searchQuery.trim()) return allSnippets;
    
    const lowerQuery = searchQuery.toLowerCase().trim();
    
    return allSnippets.filter((snippet) => {
      const nameMatch = snippet.name.toLowerCase().includes(lowerQuery);
      const descriptionMatch = snippet.description?.toLowerCase().includes(lowerQuery) || false;
      const contentMatch = stripHtml(snippet.content).toLowerCase().substring(0, 100).includes(lowerQuery);
      
      return nameMatch || descriptionMatch || contentMatch;
    });
  }, [allSnippets, searchQuery]);
  
  const snippetCount = allSnippets.length;
  
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  const handleDuplicate = useCallback((snippetId: string) => {
    const duplicated = duplicateSnippet(snippetId);
    if (duplicated) {
      console.log('✅ Snippet duplicated:', duplicated.name);
    }
  }, [duplicateSnippet]);
  
  const handleDelete = useCallback((snippetId: string) => {
    const snippet = snippets.find(s => s.id === snippetId);
    if (!snippet) return;
    
    const confirmed = window.confirm(
      `Delete snippet "${snippet.name}"?\n\nThis cannot be undone.`
    );
    
    if (confirmed) {
      deleteSnippet(snippetId);
      console.log('🗑️ Snippet deleted');
    }
  }, [snippets, deleteSnippet]);
  
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);
  
  // Don't render if no active project
  if (!activeProjectId) {
    return null;
  }
  
  // Get project name for header
  const projectName = activeProject?.name || 'PROJECT';
  const headerTitle = `${projectName.toUpperCase()} SNIPPETS`;
  
  return (
    <div className="space-y-0.5 border-t border-gray-200 pt-1.5 mt-1.5">
      {/* Section Header */}
      <button
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between px-2 py-1.5 rounded-lg',
          'hover:bg-apple-gray-bg transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-[11px] text-apple-text-dark uppercase tracking-wide">
            {headerTitle}
          </span>
          <span className="text-[9px] px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            {snippetCount}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-1 pl-1.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-6 pr-6 py-1 text-[11px] rounded-md',
                'bg-muted/50 border border-transparent',
                'focus:border-primary focus:bg-background focus:outline-none',
                'placeholder:text-muted-foreground/60',
                'transition-colors duration-150'
              )}
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent"
              >
                <X className="w-2.5 h-2.5 text-muted-foreground" />
              </button>
            )}
          </div>
          
          {/* Snippets List */}
          <div className="max-h-[300px] overflow-y-auto space-y-0">
            {snippets.length === 0 ? (
              <div className="text-center py-3">
                {searchQuery ? (
                  <p className="text-[11px] text-muted-foreground">
                    No snippets found matching "{searchQuery}"
                  </p>
                ) : (
                  <>
                    <Paperclip className="w-5 h-5 mx-auto mb-1 text-muted-foreground/40" />
                    <p className="text-[11px] text-muted-foreground">
                      No snippets yet
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                      Save reusable copy for quick access
                    </p>
                  </>
                )}
              </div>
            ) : (
              snippets.map((snippet) => (
                <SnippetItem
                  key={snippet.id}
                  snippet={snippet}
                  onInsert={onInsertSnippet}
                  onEdit={onEditSnippet}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
          
          {/* New Snippet Button */}
          <button
            onClick={onCreateSnippet}
            className={cn(
              'w-full flex items-center justify-center gap-1 px-2 py-1',
              'text-[11px] font-medium text-amber-600 hover:text-amber-700',
              'bg-amber-50 hover:bg-amber-100 rounded-md',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2'
            )}
          >
            <Plus className="w-2.5 h-2.5" />
            New Snippet
          </button>
        </div>
      )}
    </div>
  );
}
