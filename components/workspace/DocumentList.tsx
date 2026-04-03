/**
 * @file components/workspace/DocumentList.tsx
 * @description Sidebar document & folder tree with drag-and-drop, multi-select,
 * inline rename, and right-click context menu.
 *
 * All data mutations use unified-storage (Supabase + localStorage fallback).
 * UI updates are optimistic — local state mutates first, then persists async.
 */

'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import type { ProjectDocument, Folder } from '@/lib/types/project';
import { useActiveProjectId, useProjects, useDocumentListVersion } from '@/lib/stores/workspaceStore';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
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
  updateDocument,
  getAllFolders,
  createFolder,
  deleteFolder,
  moveFolder,
  updateFolder,
} from '@/lib/storage/unified-storage';
import {
  FileText,
  FilePlus,
  Trash2,
  ChevronRight,
  Pencil,
  Folder as FolderIcon,
  FolderPlus,
  FolderOutput,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

interface DocumentListProps {
  /** Callback when user clicks a document to load it in the editor */
  onDocumentClick: (doc: ProjectDocument) => void;
  /** Whether to show the New Folder and New Document create buttons (default: true) */
  showCreateButtons?: boolean;
}

/** Shape for right-click context menu state */
interface ContextMenuState {
  x: number;
  y: number;
  itemType: 'document' | 'folder';
  itemId: string;
  isInsideFolder: boolean;
}

/** Parsed drag ID */
interface DragMeta {
  type: 'document' | 'folder';
  id: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Parse a composite drag/drop ID like "doc:abc" or "folder:xyz" */
function parseDragId(raw: string): DragMeta | null {
  const idx = raw.indexOf(':');
  if (idx === -1) return null;
  const type = raw.slice(0, idx) as 'document' | 'folder';
  const id = raw.slice(idx + 1);
  if (type !== 'document' && type !== 'folder') return null;
  return { type, id };
}

/** Check if `candidateParentId` is a descendant of `folderId` (prevents circular nesting). */
function isDescendant(
  folderId: string,
  candidateParentId: string,
  folders: Folder[],
): boolean {
  let current: string | undefined = candidateParentId;
  const visited = new Set<string>();
  while (current) {
    if (current === folderId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    const parent = folders.find((f) => f.id === current);
    current = parent?.parentFolderId;
  }
  return false;
}

// ============================================================================
// ContextMenu (portal-rendered, position: fixed)
// ============================================================================

interface ContextMenuProps {
  state: ContextMenuState;
  onRename: () => void;
  onDelete: () => void;
  onMoveToRoot: () => void;
  onClose: () => void;
}

function ContextMenu({
  state,
  onRename,
  onDelete,
  onMoveToRoot,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  // Clamp position so menu doesn't overflow viewport
  const MENU_W = 160;
  const MENU_H = state.isInsideFolder ? 120 : 88;
  const left = Math.min(state.x, window.innerWidth - MENU_W - 8);
  const top = Math.min(state.y, window.innerHeight - MENU_H - 8);

  const itemClass =
    'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left rounded hover:bg-accent transition-colors cursor-pointer';

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[150px] bg-popover border border-border rounded-lg shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
      style={{ left, top }}
    >
      <button className={itemClass} onClick={onRename}>
        <Pencil className="h-3 w-3 text-muted-foreground" />
        Rename
      </button>
      <button
        className={cn(itemClass, 'hover:bg-destructive/10 hover:text-destructive')}
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
      {state.isInsideFolder && (
        <button className={itemClass} onClick={onMoveToRoot}>
          <FolderOutput className="h-3 w-3 text-muted-foreground" />
          Move to root
        </button>
      )}
    </div>,
    document.body,
  );
}

// ============================================================================
// InlineRenameInput
// ============================================================================

interface InlineRenameInputProps {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function InlineRenameInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Select all text on mount
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={cn(
        'flex-1 text-xs bg-background min-w-0',
        'border border-primary rounded px-1 py-0.5',
        'focus:outline-none focus:ring-1 focus:ring-primary',
      )}
      autoFocus
    />
  );
}

// ============================================================================
// DraggableDocumentRow (standalone — proper hooks usage)
// ============================================================================

interface DocRowProps {
  doc: ProjectDocument;
  depth: number;
  isEditorSelected: boolean;
  isMultiSelected: boolean;
  isEditing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onSelect: (doc: ProjectDocument) => void;
  onCtrlClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string, type: 'document', inFolder: boolean) => void;
  onDoubleClickName: (id: string) => void;
}

const DraggableDocumentRow = React.memo(function DraggableDocumentRow({
  doc,
  depth,
  isEditorSelected,
  isMultiSelected,
  isEditing,
  editValue,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onSelect,
  onCtrlClick,
  onContextMenu,
  onDoubleClickName,
}: DocRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `document:${doc.id}`,
  });

  const ctrlClickRef = useRef(false);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        paddingLeft: `${8 + depth * 12}px`,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        'group flex items-center gap-1.5 pr-2 py-1.5 rounded cursor-grab select-none touch-none',
        'transition-colors duration-100',
        isMultiSelected
          ? 'bg-blue-100 ring-1 ring-blue-400 text-blue-900'
          : isEditorSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-accent/60',
      )}
      onPointerDown={(e) => {
        if (e.metaKey || e.ctrlKey) {
          ctrlClickRef.current = true;
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          onCtrlClick(doc.id);
          return;
        }
        ctrlClickRef.current = false;
        (listeners?.onPointerDown as React.PointerEventHandler | undefined)?.(e);
      }}
      onClick={(e) => {
        if (ctrlClickRef.current) {
          ctrlClickRef.current = false;
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        e.stopPropagation();
        onSelect(doc);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, doc.id, 'document', !!doc.folderId);
      }}
    >
      <FileText
        className={cn(
          'h-3 w-3 flex-shrink-0',
          isMultiSelected
            ? 'text-blue-600'
            : isEditorSelected
              ? 'text-primary'
              : 'text-muted-foreground',
        )}
      />

      {isEditing ? (
        <InlineRenameInput
          value={editValue}
          onChange={onEditChange}
          onCommit={onEditCommit}
          onCancel={onEditCancel}
        />
      ) : (
        <span
          className={cn(
            'flex-1 text-xs leading-tight line-clamp-2 min-w-0',
            isMultiSelected
              ? 'font-medium text-blue-900'
              : isEditorSelected
                ? 'font-medium text-primary'
                : 'text-foreground',
          )}
          title={doc.title}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onDoubleClickName(doc.id);
          }}
        >
          {doc.title}
        </span>
      )}
    </div>
  );
});

// ============================================================================
// DraggableFolderRow (standalone — both draggable AND droppable)
// ============================================================================

interface FolderRowProps {
  folder: Folder;
  depth: number;
  isCollapsed: boolean;
  docCount: number;
  isMultiSelected: boolean;
  isOver: boolean;
  isEditing: boolean;
  editValue: string;
  onEditChange: (v: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onToggle: (id: string) => void;
  onCtrlClick: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string, type: 'folder', inFolder: boolean) => void;
  onDoubleClickName: (id: string) => void;
  children: React.ReactNode;
}

const DraggableFolderRow = React.memo(function DraggableFolderRow({
  folder,
  depth,
  isCollapsed,
  docCount,
  isMultiSelected,
  isOver,
  isEditing,
  editValue,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onToggle,
  onCtrlClick,
  onContextMenu,
  onDoubleClickName,
  children,
}: FolderRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id: `folder:${folder.id}` });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `folder:${folder.id}`,
    disabled: isDragging,
  });

  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  const ctrlClickRef = useRef(false);
  const isExpanded = !isCollapsed;

  return (
    <div style={{ opacity: isDragging ? 0.5 : 1 }}>
      {/* Folder header */}
      <div
        ref={combinedRef}
        {...attributes}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        className={cn(
          'group flex items-center gap-1 pr-2 py-1.5 rounded cursor-grab select-none touch-none',
          'transition-colors duration-100',
          isMultiSelected
            ? 'bg-blue-100 ring-1 ring-blue-400 text-blue-900'
            : isOver
              ? 'bg-blue-50 ring-2 ring-blue-400'
              : 'hover:bg-accent',
        )}
        onPointerDown={(e) => {
          if (e.metaKey || e.ctrlKey) {
            ctrlClickRef.current = true;
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            onCtrlClick(folder.id);
            return;
          }
          ctrlClickRef.current = false;
          (listeners?.onPointerDown as React.PointerEventHandler | undefined)?.(e);
        }}
        onClick={(e) => {
          if (ctrlClickRef.current) {
            ctrlClickRef.current = false;
            e.stopPropagation();
            e.preventDefault();
            return;
          }
          e.stopPropagation();
          if (!isEditing) onToggle(folder.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, folder.id, 'folder', !!folder.parentFolderId);
        }}
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 transition-transform duration-150 text-muted-foreground flex-shrink-0',
            isExpanded && 'rotate-90',
          )}
        />

        <FolderIcon className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />

        {isEditing ? (
          <InlineRenameInput
            value={editValue}
            onChange={onEditChange}
            onCommit={onEditCommit}
            onCancel={onEditCancel}
          />
        ) : (
          <span
            className="flex-1 truncate text-xs font-semibold text-foreground"
            title={folder.name}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDoubleClickName(folder.id);
            }}
          >
            {folder.name}
          </span>
        )}

        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
          {docCount}
        </span>
      </div>

      {/* Folder children */}
      {isExpanded && <div>{children}</div>}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export default function DocumentList({
  onDocumentClick,
  showCreateButtons = true,
}: DocumentListProps) {
  // ---- Store state ----
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  const documentListVersion = useDocumentListVersion();

  // ---- Local data state ----
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // ---- Multi-select: Map<itemId, projectId> ----
  const [multiSelected, setMultiSelected] = useState<Map<string, string>>(
    new Map(),
  );

  // ---- Folder collapse tracking (folders NOT in this set are expanded) ----
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    new Set(),
  );

  // ---- Inline rename state ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<'document' | 'folder' | null>(
    null,
  );
  const [editValue, setEditValue] = useState('');

  // ---- Context menu state ----
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ---- Drag state ----
  const [dragMeta, setDragMeta] = useState<DragMeta | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);

  // ---- Refs for click-outside ----
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- DnD sensors (8px activation distance) ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ---- Derived ----
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // --------------------------------------------------------------------------
  // Data Loading
  // --------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!activeProjectId) {
      setDocuments([]);
      setFolders([]);
      return;
    }
    try {
      const [docs, flds] = await Promise.all([
        getAllDocuments(activeProjectId),
        getAllFolders(activeProjectId),
      ]);
      setDocuments(docs);
      setFolders(flds);
    } catch (error) {
      logger.error('Failed to load documents/folders:', error);
      setDocuments([]);
      setFolders([]);
    }
  }, [activeProjectId, documentListVersion]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --------------------------------------------------------------------------
  // Tree structure helpers
  // --------------------------------------------------------------------------

  /** Child folders of a given parent (null = root). Sorted alphabetically. */
  const childFolders = useCallback(
    (parentId: string | null): Folder[] =>
      folders
        .filter((f) =>
          parentId === null
            ? !f.parentFolderId
            : f.parentFolderId === parentId,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [folders],
  );

  /** Documents inside a given folder (null = root). Sorted alphabetically. */
  const docsInFolder = useCallback(
    (folderId: string | null): ProjectDocument[] =>
      documents
        .filter((d) =>
          folderId === null ? !d.folderId : d.folderId === folderId,
        )
        .sort((a, b) => a.title.localeCompare(b.title)),
    [documents],
  );

  /** Recursively count all documents under a folder (including sub-folders). */
  const deepDocCount = useCallback(
    (folderId: string): number => {
      const directDocs = documents.filter((d) => d.folderId === folderId).length;
      const subFolders = folders.filter((f) => f.parentFolderId === folderId);
      return directDocs + subFolders.reduce((sum, sf) => sum + deepDocCount(sf.id), 0);
    },
    [documents, folders],
  );

  // --------------------------------------------------------------------------
  // Multi-select handlers
  // --------------------------------------------------------------------------

  const toggleMultiSelect = useCallback(
    (itemId: string) => {
      setMultiSelected((prev) => {
        const next = new Map(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.set(itemId, activeProjectId || '');
        }
        return next;
      });
    },
    [activeProjectId],
  );

  const clearSelection = useCallback(() => {
    setMultiSelected(new Map());
  }, []);

  // Click outside → clear selection
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        clearSelection();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [clearSelection]);

  // --------------------------------------------------------------------------
  // Document click (open + clear selection)
  // --------------------------------------------------------------------------

  const handleDocumentSelect = useCallback(
    (doc: ProjectDocument) => {
      clearSelection();
      setSelectedDocId(doc.id);
      onDocumentClick(doc);
    },
    [onDocumentClick, clearSelection],
  );

  // --------------------------------------------------------------------------
  // Folder toggle
  // --------------------------------------------------------------------------

  const toggleFolder = useCallback((folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  // --------------------------------------------------------------------------
  // Inline Rename
  // --------------------------------------------------------------------------

  const startRename = useCallback(
    (id: string, type: 'document' | 'folder') => {
      setEditingId(id);
      setEditingType(type);
      if (type === 'document') {
        const doc = documents.find((d) => d.id === id);
        setEditValue(doc?.title || '');
      } else {
        const folder = folders.find((f) => f.id === id);
        setEditValue(folder?.name || '');
      }
    },
    [documents, folders],
  );

  const commitRename = useCallback(async () => {
    if (!editingId || !editingType || !activeProjectId) {
      setEditingId(null);
      setEditingType(null);
      return;
    }

    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      setEditingType(null);
      return;
    }

    try {
      if (editingType === 'document') {
        // Optimistic update
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === editingId ? { ...d, title: trimmed, baseTitle: trimmed } : d,
          ),
        );
        await updateDocument(activeProjectId, editingId, { title: trimmed });
      } else {
        setFolders((prev) =>
          prev.map((f) =>
            f.id === editingId ? { ...f, name: trimmed } : f,
          ),
        );
        await updateFolder(activeProjectId, editingId, { name: trimmed });
      }
    } catch (error) {
      logger.error('Failed to rename:', error);
      await loadData();
    }

    setEditingId(null);
    setEditingType(null);
  }, [editingId, editingType, editValue, activeProjectId, loadData]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditingType(null);
    setEditValue('');
  }, []);

  // --------------------------------------------------------------------------
  // Context Menu
  // --------------------------------------------------------------------------

  const openContextMenu = useCallback(
    (
      e: React.MouseEvent,
      itemId: string,
      itemType: 'document' | 'folder',
      isInsideFolder: boolean,
    ) => {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        itemType,
        itemId,
        isInsideFolder,
      });
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextRename = useCallback(() => {
    if (!contextMenu) return;
    startRename(contextMenu.itemId, contextMenu.itemType);
    closeContextMenu();
  }, [contextMenu, startRename, closeContextMenu]);

  const handleContextDelete = useCallback(async () => {
    if (!contextMenu || !activeProjectId) return;
    const { itemId, itemType } = contextMenu;
    closeContextMenu();

    if (itemType === 'document') {
      const doc = documents.find((d) => d.id === itemId);
      const confirmed = window.confirm(
        `Delete "${doc?.title || 'Untitled'}"?\n\nThis cannot be undone.`,
      );
      if (!confirmed) return;

      setDocuments((prev) => prev.filter((d) => d.id !== itemId));
      if (selectedDocId === itemId) setSelectedDocId(null);
      try {
        await deleteDocument(activeProjectId, itemId);
      } catch (error) {
        logger.error('Failed to delete document:', error);
        await loadData();
      }
    } else {
      const folder = folders.find((f) => f.id === itemId);
      const confirmed = window.confirm(
        `Delete folder "${folder?.name || 'Untitled'}"?\n\nNote: Folders must be empty before deletion.`,
      );
      if (!confirmed) return;

      setFolders((prev) => prev.filter((f) => f.id !== itemId));
      try {
        await deleteFolder(activeProjectId, itemId);
      } catch (error) {
        logger.error('Failed to delete folder:', error);
        await loadData();
      }
    }
  }, [contextMenu, activeProjectId, documents, folders, selectedDocId, loadData, closeContextMenu]);

  const handleContextMoveToRoot = useCallback(async () => {
    if (!contextMenu || !activeProjectId) return;
    const { itemId, itemType } = contextMenu;
    closeContextMenu();

    try {
      if (itemType === 'document') {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === itemId ? { ...d, folderId: undefined } : d,
          ),
        );
        await updateDocument(activeProjectId, itemId, {
          folderId: undefined,
        });
      } else {
        setFolders((prev) =>
          prev.map((f) =>
            f.id === itemId ? { ...f, parentFolderId: undefined } : f,
          ),
        );
        await moveFolder(activeProjectId, itemId, null);
      }
    } catch (error) {
      logger.error('Failed to move to root:', error);
      await loadData();
    }
  }, [contextMenu, activeProjectId, loadData, closeContextMenu]);

  // --------------------------------------------------------------------------
  // Create handlers
  // --------------------------------------------------------------------------

  const handleCreateFolder = useCallback(async () => {
    if (!activeProjectId) return;
    const name = window.prompt('Folder name:');
    if (!name?.trim()) return;
    try {
      const newFolder = await createFolder(activeProjectId, name.trim());
      setFolders((prev) => [...prev, newFolder]);
    } catch (error) {
      logger.error('Failed to create folder:', error);
    }
  }, [activeProjectId]);

  const handleCreateDocument = useCallback(async () => {
    if (!activeProjectId) return;
    const defaultName = activeProject
      ? `${activeProject.name} Doc`
      : 'New Document';
    const title = window.prompt('Document title:', defaultName);
    if (!title?.trim()) return;
    try {
      setIsLoading(true);
      const newDoc = await createDocument(activeProjectId, title.trim());
      setDocuments((prev) => [...prev, newDoc]);
      setSelectedDocId(newDoc.id);
      onDocumentClick(newDoc);
    } catch (error) {
      logger.error('Failed to create document:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, activeProject, onDocumentClick]);

  // --------------------------------------------------------------------------
  // Drag-and-Drop
  // --------------------------------------------------------------------------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const parsed = parseDragId(event.active.id as string);
    if (parsed) setDragMeta(parsed);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverFolderId(null);
      return;
    }
    const overParsed = parseDragId(over.id as string);
    if (overParsed?.type === 'folder') {
      setOverFolderId(overParsed.id);
    } else {
      setOverFolderId(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setDragMeta(null);
      setOverFolderId(null);

      if (!over || !activeProjectId) return;

      const activeParsed = parseDragId(active.id as string);
      const overParsed = parseDragId(over.id as string);
      if (!activeParsed) return;

      const targetIsFolder = overParsed?.type === 'folder';
      const targetIsRoot = over.id === 'root:root';
      const targetFolderId = targetIsFolder ? overParsed!.id : null;

      // Prevent dropping folder into itself or its descendants
      if (
        activeParsed.type === 'folder' &&
        targetFolderId &&
        (targetFolderId === activeParsed.id ||
          isDescendant(activeParsed.id, targetFolderId, folders))
      ) {
        return;
      }

      // Determine which items to move
      const isBatch =
        multiSelected.has(activeParsed.id) && multiSelected.size > 1;
      const itemIds = isBatch
        ? Array.from(multiSelected.keys())
        : [activeParsed.id];

      // Separate document and folder IDs
      const docIds = itemIds.filter((id) => documents.some((d) => d.id === id));
      const folderIds = itemIds.filter((id) =>
        folders.some((f) => f.id === id),
      );

      // Single-item drag of an unselected item
      if (!isBatch) {
        if (activeParsed.type === 'document') {
          docIds.length = 0;
          docIds.push(activeParsed.id);
        } else {
          folderIds.length = 0;
          folderIds.push(activeParsed.id);
        }
      }

      // Optimistic UI updates
      if (targetIsFolder || targetIsRoot) {
        setDocuments((prev) =>
          prev.map((d) =>
            docIds.includes(d.id)
              ? { ...d, folderId: targetFolderId || undefined }
              : d,
          ),
        );
        setFolders((prev) =>
          prev.map((f) =>
            folderIds.includes(f.id)
              ? { ...f, parentFolderId: targetFolderId || undefined }
              : f,
          ),
        );
      }

      // Clear selection after drag
      clearSelection();

      // Persist
      try {
        await Promise.all([
          ...docIds.map((id) =>
            updateDocument(activeProjectId, id, {
              folderId: targetFolderId || undefined,
            }),
          ),
          ...folderIds.map((id) =>
            moveFolder(activeProjectId, id, targetFolderId),
          ),
        ]);
      } catch (error) {
        logger.error('Failed to move items:', error);
        await loadData();
      }
    },
    [activeProjectId, multiSelected, documents, folders, clearSelection, loadData],
  );

  // ---- Drag overlay data ----
  const dragOverlayLabel = useMemo(() => {
    if (!dragMeta) return null;
    if (dragMeta.type === 'document') {
      return documents.find((d) => d.id === dragMeta.id)?.title || 'Document';
    }
    return folders.find((f) => f.id === dragMeta.id)?.name || 'Folder';
  }, [dragMeta, documents, folders]);

  const dragOverlayIsBatch =
    dragMeta && multiSelected.has(dragMeta.id) && multiSelected.size > 1;
  const dragOverlayBatchCount = dragOverlayIsBatch
    ? multiSelected.size - 1
    : 0;

  // ---- Root drop target ----
  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: 'root:root',
  });

  // --------------------------------------------------------------------------
  // Dynamic button text
  // --------------------------------------------------------------------------

  const newDocButtonText = activeProject
    ? `${activeProject.name} Doc`
    : 'New Doc';
  const newFolderButtonText = activeProject
    ? `${activeProject.name} Folder`
    : 'New Folder';

  // --------------------------------------------------------------------------
  // Recursive folder renderer
  // --------------------------------------------------------------------------

  const renderFolder = useCallback(
    (folder: Folder, depth: number): React.ReactNode => {
      const isCollapsed = collapsedFolders.has(folder.id);
      const children = childFolders(folder.id);
      const docs = docsInFolder(folder.id);
      const count = deepDocCount(folder.id);

      return (
        <DraggableFolderRow
          key={folder.id}
          folder={folder}
          depth={depth}
          isCollapsed={isCollapsed}
          docCount={count}
          isMultiSelected={multiSelected.has(folder.id)}
          isOver={overFolderId === folder.id}
          isEditing={editingId === folder.id && editingType === 'folder'}
          editValue={editValue}
          onEditChange={setEditValue}
          onEditCommit={commitRename}
          onEditCancel={cancelRename}
          onToggle={toggleFolder}
          onCtrlClick={toggleMultiSelect}
          onContextMenu={openContextMenu}
          onDoubleClickName={(id) => startRename(id, 'folder')}
        >
          {/* Sub-folders first */}
          {children.map((child) => renderFolder(child, depth + 1))}
          {/* Then documents */}
          {docs.map((doc) => (
            <DraggableDocumentRow
              key={doc.id}
              doc={doc}
              depth={depth + 1}
              isEditorSelected={doc.id === selectedDocId}
              isMultiSelected={multiSelected.has(doc.id)}
              isEditing={editingId === doc.id && editingType === 'document'}
              editValue={editValue}
              onEditChange={setEditValue}
              onEditCommit={commitRename}
              onEditCancel={cancelRename}
              onSelect={handleDocumentSelect}
              onCtrlClick={toggleMultiSelect}
              onContextMenu={openContextMenu}
              onDoubleClickName={(id) => startRename(id, 'document')}
            />
          ))}
          {/* Empty folder hint */}
          {children.length === 0 && docs.length === 0 && (
            <div
              className="text-[10px] text-muted-foreground italic py-1.5"
              style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }}
            >
              Drop items here
            </div>
          )}
        </DraggableFolderRow>
      );
    },
    [
      collapsedFolders,
      childFolders,
      docsInFolder,
      deepDocCount,
      multiSelected,
      overFolderId,
      editingId,
      editingType,
      editValue,
      selectedDocId,
      commitRename,
      cancelRename,
      toggleFolder,
      toggleMultiSelect,
      openContextMenu,
      startRename,
      handleDocumentSelect,
    ],
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  const rootFolders = childFolders(null);
  const rootDocs = docsInFolder(null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div ref={containerRef} className="flex flex-col h-full">
        {/* Header with create buttons */}
        {showCreateButtons && (
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
        )}

        {/* Scrollable content area */}
        <div
          ref={setRootDropRef}
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden transition-colors duration-200',
            isOverRoot && 'bg-primary/5',
          )}
          onClick={(e) => {
            // Clicking empty space clears selection
            if (e.target === e.currentTarget && multiSelected.size > 0) {
              clearSelection();
            }
          }}
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
              {/* Multi-select badge */}
              {multiSelected.size >= 2 && (
                <div className="sticky top-0 z-10 mb-2 flex items-center justify-between px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xs font-medium text-blue-700">
                    {multiSelected.size} selected
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-0.5 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
                    title="Clear selection"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Root drop hint */}
              {isOverRoot && (
                <div className="sticky top-2 mb-3 p-2 bg-primary/10 border border-primary/20 rounded-lg text-xs text-center text-primary font-medium z-10">
                  Release to move to root level
                </div>
              )}

              {/* Root-level folders (sorted, rendered first) */}
              {rootFolders.map((folder) => renderFolder(folder, 0))}

              {/* Root-level documents */}
              {rootDocs.map((doc) => (
                <DraggableDocumentRow
                  key={doc.id}
                  doc={doc}
                  depth={0}
                  isEditorSelected={doc.id === selectedDocId}
                  isMultiSelected={multiSelected.has(doc.id)}
                  isEditing={
                    editingId === doc.id && editingType === 'document'
                  }
                  editValue={editValue}
                  onEditChange={setEditValue}
                  onEditCommit={commitRename}
                  onEditCancel={cancelRename}
                  onSelect={handleDocumentSelect}
                  onCtrlClick={toggleMultiSelect}
                  onContextMenu={openContextMenu}
                  onDoubleClickName={(id) => startRename(id, 'document')}
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

      {/* Drag overlay */}
      <DragOverlay>
        {dragMeta && dragOverlayLabel && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-lg">
            {dragMeta.type === 'folder' ? (
              <FolderIcon className="h-4 w-4 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-xs font-medium">{dragOverlayLabel}</span>
            {dragOverlayIsBatch && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                +{dragOverlayBatchCount}
              </span>
            )}
          </div>
        )}
      </DragOverlay>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onRename={handleContextRename}
          onDelete={handleContextDelete}
          onMoveToRoot={handleContextMoveToRoot}
          onClose={closeContextMenu}
        />
      )}
    </DndContext>
  );
}
