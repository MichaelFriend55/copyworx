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
import { HeadlineGeneratorTool } from '@/components/workspace/HeadlineGeneratorTool';
import { WordAdvisor } from '@/components/workspace/WordAdvisor';
import { CompetitiveAnalysis } from '@/components/workspace/CompetitiveAnalysis';
import { BrandCheck } from '@/components/workspace/BrandCheck';
import { PersonaCheck } from '@/components/workspace/PersonaCheck';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { getTemplateById } from '@/lib/data/templates';
import { toolRequiresDocument } from '@/lib/tools/toolRegistry';

/**
 * Template IDs that use custom components instead of the standard TemplateGenerator.
 * Each gets its own rendering branch in the component below.
 */
const CUSTOM_COMPONENT_TEMPLATE_IDS = ['brochure-multi-section', 'brand-messaging-framework', 'case-study', 'linkedin-thought-leadership'];
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/react';
import type { Project } from '@/lib/types/project';

interface RightSidebarContentProps {
  /** TipTap editor instance */
  editor: Editor | null;
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
  'headline-generator': HeadlineGeneratorTool,
  'word-advisor': WordAdvisor,
  'competitive-analysis': CompetitiveAnalysis,

  // MY BRAND & AUDIENCE
  // NOTE: brand-voice and personas open slide-outs (uiSurface: 'slideout' in
  // toolRegistry) and are therefore NOT registered here. Only right-sidebar
  // tools appear in TOOL_COMPONENTS.
  'brand-check': BrandCheck,
  'persona-check': PersonaCheck,
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
  
  /**
   * Handle template generator cancel
   * Uses getState() to avoid stale closures and dependency issues
   */
  const handleTemplateCancel = useCallback(() => {
    const store = useWorkspaceStore.getState();
    store.setSelectedTemplateId(null);
    store.setActiveTool(null);
  }, []);

  // PRIORITY 1: Check for templates FIRST (before showing empty tool state)
  // Check the template ID directly to avoid race conditions with memos
  
  // Note: Custom component templates (brochure-multi-section, brand-messaging-framework)
  // are rendered in dedicated slide-out panels in the workspace page, not in the right sidebar.
  // This is because they need more width than the 320px right sidebar provides.
  
  // Special case: Regular Template Generator
  // Only render if we have a template ID and it's NOT a custom-component template
  if (selectedTemplateId && !CUSTOM_COMPONENT_TEMPLATE_IDS.includes(selectedTemplateId)) {
    const selectedTemplate = getTemplateById(selectedTemplateId);
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
  }

  // PRIORITY 2: If no template is selected, show tools or empty state
  // Only show the toolbox header and empty states if NO template is active
  // Don't show anything if we're waiting for a template to load
  if (!ActiveToolComponent && !selectedTemplateId) {
    return (
      <div className="space-y-6">
        {/* Header - Always Shows "AI@Worx ToolBox" */}
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
            AI@Worx ToolBox
          </h2>
        </div>

        {/* Empty state - no tool selected */}
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            Select a Tool
          </p>
          <p className="text-xs text-gray-500">
            Choose a tool from the left sidebar to get started
          </p>
        </div>
      </div>
    );
  }

  // Show tool content if a tool is selected
  if (ActiveToolComponent) {
    // Layout (absolute-positioned StickyActionBar strategy):
    //
    // Outer wrapper uses `h-full` (not `min-h-full`) so it exactly fills the
    // Sidebar scroll container. This intentionally neutralizes Sidebar's own
    // `overflow-y-auto` — scrolling is relocated one level down into the tool
    // cell's inner scroll region, which is the only scroll surface in this
    // subtree.
    //
    // The tool cell is `flex-1 relative min-h-0`: it claims all vertical space
    // below the toolbox header AND serves as the `position: relative`
    // containing block for the tool's inner `StickyActionBar` (which renders
    // with `variant="absolute"`, i.e. `position: absolute; bottom: 0;
    // left: 0; right: 0`). `min-h-0` is flexbox hygiene — without it, a long
    // tool would refuse to shrink below its min-content height and would
    // overflow the parent.
    //
    // Inside the tool cell, a child div with `absolute inset-0 overflow-y-auto`
    // becomes the actual scroll surface for tool content. `pb-36` (144px)
    // reserves breathing room above the StickyActionBar so content never
    // scrolls underneath it. 144px was sized against the tallest bar observed
    // (BrandCheck / PersonaCheck post-analysis stacked two-button bars, ~121px)
    // plus ~23px buffer.
    //
    // Because `overflow` does not establish a containing block for absolutely
    // positioned descendants, the tool's StickyActionBar escapes this scroll
    // region and anchors to the `relative` wrapper above it — pinning the bar
    // to the tool cell's bottom regardless of scroll position.
    return (
      <div className="flex flex-col h-full gap-6">
        {/* Header - Always Shows "AI@Worx ToolBox" */}
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
            AI@Worx ToolBox
          </h2>
        </div>

        {/* Tool cell: relative containing block for the absolute StickyActionBar,
            AND a flex column so the scroll surface below can claim remaining
            height via `flex-1` without needing `position: absolute`. This is
            critical: if the scroll surface is itself absolutely positioned, it
            becomes the containing block for its absolute-positioned descendants
            — and the tool's StickyActionBar would then anchor to the scroll
            surface's bottom (which scrolls with content) instead of to this
            tool cell's bottom (which stays pinned to the viewport bottom). */}
        <div className="flex-1 relative min-h-0 flex flex-col">
          {/* Scroll surface: `flex-1` fills remaining height inside the tool
              cell's flex column; `min-h-0` is flex hygiene so long content
              can shrink and scroll rather than overflow; `overflow-y-auto` is
              the scroll behavior; `pb-36` reserves 144px above the action bar
              so content never scrolls underneath it. Intentionally NOT
              positioned — the tool's inner StickyActionBar (position:absolute)
              must skip past this div in the ancestor chain and anchor to the
              relative tool cell above. */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-36 min-h-0">
            {!hasActiveDocument && activeToolId && toolRequiresDocument(activeToolId) ? (
              // Tool selected but no document open (only for document-requiring tools)
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
              <ActiveToolComponent editor={editor} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // If we get here, something is loading (likely a template that hasn't rendered yet)
  // Show nothing or a minimal loading state
  return null;
}
