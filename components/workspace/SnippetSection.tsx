/**
 * @file components/workspace/SnippetSection.tsx
 * @description Snippet list section for the My Projects slide-out
 * 
 * Features:
 * - Displays snippets for a project
 * - Click to insert snippet at cursor position
 * - Add new snippet button
 * - Edit/delete options on hover
 * - Search filter integration
 * - Collapsible section
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Scissors,
  Plus,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Snippet } from '@/lib/types/snippet';
import { getAllSnippets, deleteSnippet } from '@/lib/storage/snippet-storage';
import { useSnippetStore } from '@/lib/stores/snippetStore';

// ============================================================================
// Types
// ============================================================================

interface SnippetSectionProps {
  /** Project ID to load snippets for */
  projectId: string;
  /** Whether this project section is expanded */
  isExpanded: boolean;
  /** Search query for filtering */
  searchQuery?: string;
  /** Callback when a snippet is clicked (for insertion) */
  onSnippetClick?: (snippet: Snippet) => void;
  /** Callback to open add snippet modal - receives projectId */
  onAddSnippet?: (projectId: string) => void;
  /** Callback to open edit snippet modal */
  onEditSnippet?: (snippet: Snippet) => void;
}

interface SnippetRowProps {
  snippet: Snippet;
  onSelect: (snippet: Snippet) => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Strip HTML tags from content for preview
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Format relative date
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// SnippetRow Component
// ============================================================================

function SnippetRow({ snippet, onSelect, onEdit, onDelete }: SnippetRowProps) {
  const [copied, setCopied] = useState(false);
  
  // Handle copy to clipboard
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const plainText = stripHtml(snippet.content);
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy:', error);
    }
  }, [snippet.content]);
  
  // Handle delete with confirmation
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete snippet "${snippet.name}"? This cannot be undone.`)) {
      onDelete(snippet);
    }
  }, [snippet, onDelete]);
  
  // Handle edit
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(snippet);
  }, [snippet, onEdit]);
  
  // Get preview text
  const previewText = truncateText(stripHtml(snippet.content), 60);

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
        'transition-colors duration-150',
        'hover:bg-purple-50 border border-transparent hover:border-purple-200'
      )}
      onClick={() => onSelect(snippet)}
      title={`Click to insert "${snippet.name}" at cursor position`}
    >
      <Scissors className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {snippet.name}
          </span>
          {snippet.usageCount > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {snippet.usageCount}×
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {previewText}
        </p>
        {snippet.description && (
          <p className="text-xs text-gray-400 italic truncate mt-0.5">
            {truncateText(snippet.description, 40)}
          </p>
        )}
      </div>
      
      {/* Actions - visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={handleCopy}
          className={cn(
            'p-1.5 rounded transition-colors',
            copied ? 'bg-green-100 text-green-600' : 'hover:bg-gray-200 text-gray-500'
          )}
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={handleEdit}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors"
          title="Edit snippet"
        >
          <Pencil className="h-3.5 w-3.5 text-gray-500" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded hover:bg-red-100 transition-colors"
          title="Delete snippet"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SnippetSection Component
// ============================================================================

export function SnippetSection({
  projectId,
  isExpanded,
  searchQuery = '',
  onSnippetClick,
  onAddSnippet,
  onEditSnippet,
}: SnippetSectionProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [sectionExpanded, setSectionExpanded] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Get store state and actions
  const insertSnippet = useSnippetStore((state) => state.insertSnippet);
  const storeSnippets = useSnippetStore((state) => state.snippets);
  const currentProjectId = useSnippetStore((state) => state.currentProjectId);
  
  // Load snippets when project section is expanded or store updates
  useEffect(() => {
    if (isExpanded && projectId) {
      const projectSnippets = getAllSnippets(projectId);
      setSnippets(projectSnippets);
    }
  }, [isExpanded, projectId, refreshTrigger]);
  
  // Sync with store when it updates for this project
  useEffect(() => {
    if (currentProjectId === projectId && storeSnippets.length >= 0) {
      // Store was updated for this project, refresh from localStorage
      const projectSnippets = getAllSnippets(projectId);
      setSnippets(projectSnippets);
    }
  }, [storeSnippets, currentProjectId, projectId]);
  
  // Filter snippets by search query
  const filteredSnippets = React.useMemo(() => {
    if (!searchQuery.trim()) return snippets;
    
    const query = searchQuery.toLowerCase();
    return snippets.filter(snippet =>
      snippet.name.toLowerCase().includes(query) ||
      snippet.content.toLowerCase().includes(query) ||
      snippet.description?.toLowerCase().includes(query)
    );
  }, [snippets, searchQuery]);
  
  // Handle snippet selection (insert into editor)
  const handleSnippetSelect = useCallback((snippet: Snippet) => {
    if (onSnippetClick) {
      onSnippetClick(snippet);
    } else {
      // Use store's insertSnippet method
      insertSnippet(snippet);
    }
  }, [onSnippetClick, insertSnippet]);
  
  // Handle snippet edit
  const handleEditSnippet = useCallback((snippet: Snippet) => {
    if (onEditSnippet) {
      onEditSnippet(snippet);
    }
  }, [onEditSnippet]);
  
  // Handle snippet delete
  const handleDeleteSnippet = useCallback((snippet: Snippet) => {
    try {
      deleteSnippet(projectId, snippet.id);
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      logger.error('Failed to delete snippet:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to delete snippet');
    }
  }, [projectId]);
  
  // Don't render if project section is collapsed
  if (!isExpanded) {
    return null;
  }
  
  // Toggle section expanded state
  const toggleSection = () => {
    setSectionExpanded(prev => !prev);
  };
  
  return (
    <div className="mt-2 ml-2 pl-2 border-l-2 border-purple-200">
      {/* Section header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer',
          'hover:bg-purple-50 transition-colors duration-150'
        )}
        onClick={toggleSection}
      >
        {sectionExpanded ? (
          <ChevronDown className="h-4 w-4 text-purple-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0" />
        )}
        
        <Scissors className="h-4 w-4 text-purple-500 flex-shrink-0" />
        
        <span className="flex-1 text-sm font-semibold text-purple-900">
          Snippets
        </span>
        
        <span className="text-xs text-purple-500 px-2 py-0.5 bg-purple-100 rounded-full">
          {snippets.length}
        </span>
        
        {/* Add button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddSnippet?.(projectId);
          }}
          className={cn(
            'p-1.5 rounded transition-colors',
            'hover:bg-purple-200 text-purple-600',
            'opacity-0 group-hover:opacity-100'
          )}
          title="Add new snippet"
          style={{ opacity: 1 }} // Always show for now
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Snippet list */}
      {sectionExpanded && (
        <div className="mt-1 space-y-1">
          {filteredSnippets.length > 0 ? (
            filteredSnippets.map(snippet => (
              <SnippetRow
                key={snippet.id}
                snippet={snippet}
                onSelect={handleSnippetSelect}
                onEdit={handleEditSnippet}
                onDelete={handleDeleteSnippet}
              />
            ))
          ) : snippets.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">
                No snippets yet
              </p>
              <button
                onClick={() => onAddSnippet?.(projectId)}
                className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add your first snippet
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic py-2 px-3">
              No snippets match &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SnippetSection;
