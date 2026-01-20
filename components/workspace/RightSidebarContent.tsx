/**
 * @file components/workspace/RightSidebarContent.tsx
 * @description Right sidebar content with dynamic tool rendering
 * 
 * IMPORTANT: This component is extracted to its own file to prevent
 * infinite re-render loops. Defining components inline inside parent
 * components causes React to treat them as new component types on
 * every render, triggering unmount/remount cycles.
 * 
 * Features:
 * - Dynamic tool component rendering based on activeToolId
 * - Template generator integration
 * - Empty state handling
 * - Placeholder components for tools under development
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { Sparkles, Layers } from 'lucide-react';
import { ToneShifter } from '@/components/workspace/ToneShifter';
import { TemplateGenerator } from '@/components/workspace/TemplateGenerator';
import { ExpandTool } from '@/components/workspace/ExpandTool';
import { ShortenTool } from '@/components/workspace/ShortenTool';
import { RewriteChannelTool } from '@/components/workspace/RewriteChannelTool';
import { BrandVoiceTool } from '@/components/workspace/BrandVoiceTool';
import { PersonasTool } from '@/components/workspace/PersonasTool';
import { BrandAlignmentTool } from '@/components/workspace/BrandAlignmentTool';
import { PersonaAlignmentTool } from '@/components/workspace/PersonaAlignmentTool';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { getTemplateById } from '@/lib/data/templates';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/react';
import type { Project } from '@/lib/types/project';

interface RightSidebarContentProps {
  /** TipTap editor instance */
  editor: Editor | null;
}

/**
 * Placeholder component for tools under development
 */
function PlaceholderTool({ 
  title, 
  description 
}: { 
  title: string; 
  description: string; 
  editor: Editor | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-apple-text-dark">{title}</h2>
        <p className="text-sm text-apple-text-light">{description}</p>
      </div>
      <div className="p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-sm font-medium text-gray-600 mb-1">Coming Soon</p>
        <p className="text-xs text-gray-500">This tool is under development</p>
      </div>
    </div>
  );
}

/**
 * Tool component map - Maps tool IDs to their components
 * Defined outside component to prevent recreation on every render
 */
const TOOL_COMPONENTS: Record<string, React.ComponentType<{ editor: Editor | null }>> = {
  // MY COPY OPTIMIZER
  'tone-shifter': ToneShifter,
  'expand': ExpandTool,
  'shorten': ShortenTool,
  'rewrite-channel': RewriteChannelTool,
  
  // MY BRAND & AUDIENCE
  'personas': PersonasTool,
  'brand-voice': BrandVoiceTool,
  
  // MY INSIGHTS
  'competitor-analyzer': (props) => (
    <PlaceholderTool {...props} title="Competitor Analyzer" description="Analyze competitor copy" />
  ),
  'persona-alignment': PersonaAlignmentTool,
  'brand-alignment': BrandAlignmentTool,
};

/**
 * Right sidebar content - Dynamic tool rendering
 * 
 * Extracted to prevent infinite re-render loops when defined inline.
 */
export function RightSidebarContent({ editor }: RightSidebarContentProps) {
  // Use stable selectors for primitives
  const activeToolId = useWorkspaceStore((state) => state.activeToolId);
  const activeDocumentId = useWorkspaceStore((state) => state.activeDocumentId);
  const selectedTemplateId = useWorkspaceStore((state) => state.selectedTemplateId);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const projects = useWorkspaceStore((state) => state.projects);
  
  // Check if we have an active document
  const hasActiveDocument = !!activeDocumentId;
  
  // Memoize the active project to prevent new object references on every render
  const activeProject = useMemo((): Project | null => {
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [activeProjectId, projects]);

  // Get the active tool component
  const ActiveToolComponent = activeToolId ? TOOL_COMPONENTS[activeToolId] : null;
  
  // Get selected template if in template generation mode
  const selectedTemplate = useMemo(() => {
    return selectedTemplateId ? getTemplateById(selectedTemplateId) : null;
  }, [selectedTemplateId]);
  
  /**
   * Handle template generator cancel
   * Uses getState() to avoid stale closures and dependency issues
   */
  const handleTemplateCancel = useCallback(() => {
    const store = useWorkspaceStore.getState();
    store.setSelectedTemplateId(null);
    store.setActiveTool(null);
  }, []);

  // Special case: Template Generator
  if (selectedTemplate) {
    return (
      <div className="h-full">
        <TemplateGenerator
          template={selectedTemplate}
          editor={editor}
          activeProject={activeProject}
          onCancel={handleTemplateCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Always Shows "AI@Worx™ ToolBox" */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-lg',
        'bg-gray-50',
        'relative pl-5 border-l-[3px] border-transparent',
        'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0',
        'before:w-[3px] before:rounded-l-lg',
        'before:bg-gradient-to-b before:from-[#006EE6] before:to-[#7A3991]'
      )}>
        <Sparkles className="w-5 h-5 text-apple-blue" />
        <h2 className="text-sm font-semibold text-apple-text-dark uppercase tracking-wide">
          AI@Worx™ ToolBox
        </h2>
      </div>

      {/* Dynamic Tool Rendering - Check tool selection FIRST */}
      {!ActiveToolComponent ? (
        // No tool selected
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            Select a Tool
          </p>
          <p className="text-xs text-gray-500">
            Choose a tool from the left sidebar to get started
          </p>
        </div>
      ) : !hasActiveDocument ? (
        // Tool selected but no document open
        <div className="text-center py-16 text-gray-400">
          <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            No Document Open
          </p>
          <p className="text-xs text-gray-500">
            Create a document to use this tool
          </p>
        </div>
      ) : (
        // Render active tool
        <ActiveToolComponent editor={editor} />
      )}
    </div>
  );
}
