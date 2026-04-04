/**
 * @file components/workspace/LeftSidebarContent.tsx
 * @description Left sidebar content with document list, tool selector, and collapsible sections
 * 
 * IMPORTANT: This component is extracted to its own file to prevent
 * infinite re-render loops. Defining components inline inside parent
 * components causes React to treat them as new component types on
 * every render, triggering unmount/remount cycles.
 * 
 * Features:
 * - Project selector section with slide-out panel trigger
 * - Document list with version control
 * - AI@Worx Templates slide-out browser
 * - Collapsible tool sections (My Copy Optimizer, My Brand & Audience)
 * - Active tool highlighting
 * - My Projects slide-out for full project navigation
 * - Templates slide-out for browsing and selecting templates
 */

'use client';

import React, { useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import DocumentList from './DocumentList';
import Image from 'next/image';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  PanelLeftOpen, 
  BookOpenText,
} from 'lucide-react';
import { MyProjectsSlideOut, MY_PROJECTS_PANEL_ID } from '@/components/workspace/MyProjectsSlideOut';
import { TemplatesSlideOut, TEMPLATES_PANEL_ID } from '@/components/workspace/TemplatesSlideOut';
import { BRAND_VOICE_PANEL_ID } from '@/components/workspace/BrandVoiceSlideOut';
import { PERSONAS_PANEL_ID } from '@/components/workspace/PersonasSlideOut';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { useIsSlideOutOpen, useSlideOutActions } from '@/lib/stores/slideOutStore';
import { SECTIONS, getToolsBySection } from '@/lib/tools';
import { cn } from '@/lib/utils';
import type { ProjectDocument } from '@/lib/types/project';

/**
 * Props for LeftSidebarContent
 */
interface LeftSidebarContentProps {
  /** Callback when a document is clicked in the DocumentList */
  onDocumentClick?: (doc: ProjectDocument) => void;
}

/**
 * Left sidebar content - Tool selector with collapsible sections
 * 
 * Extracted to prevent infinite re-render loops when defined inline.
 */
export function LeftSidebarContent({ onDocumentClick }: LeftSidebarContentProps) {
  const activeToolId = useWorkspaceStore((state) => state.activeToolId);
  
  // Slide-out state
  const isProjectsSlideOutOpen = useIsSlideOutOpen(MY_PROJECTS_PANEL_ID);
  const isTemplatesSlideOutOpen = useIsSlideOutOpen(TEMPLATES_PANEL_ID);
  const { openSlideOut, closeSlideOut } = useSlideOutActions();
  
  // Track which sections are expanded (all start collapsed by default)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([])
  );
  
  // NOTE: Project initialization is now handled in the parent WorkspacePage
  // This prevents duplicate refreshProjects() calls that could cause issues
  
  /**
   * Open the My Projects slide-out panel
   */
  const openProjectsSlideOut = useCallback(() => {
    openSlideOut(MY_PROJECTS_PANEL_ID);
  }, [openSlideOut]);
  
  /**
   * Close the My Projects slide-out panel
   */
  const closeProjectsSlideOut = useCallback(() => {
    closeSlideOut(MY_PROJECTS_PANEL_ID);
  }, [closeSlideOut]);
  
  /**
   * Open the Templates slide-out panel
   */
  const openTemplatesSlideOut = useCallback(() => {
    openSlideOut(TEMPLATES_PANEL_ID);
  }, [openSlideOut]);
  
  /**
   * Close the Templates slide-out panel
   */
  const closeTemplatesSlideOut = useCallback(() => {
    closeSlideOut(TEMPLATES_PANEL_ID);
  }, [closeSlideOut]);
  
  /**
   * Handle document click from slide-out panel
   */
  const handleSlideOutDocumentClick = useCallback((doc: ProjectDocument) => {
    onDocumentClick?.(doc);
  }, [onDocumentClick]);
  
  /**
   * Clear all tool states before switching tools
   * Uses getState() to get latest store functions without causing re-renders
   */
  const clearAllToolStates = useCallback(() => {
    const store = useWorkspaceStore.getState();
    // Clear Copy Optimizer results
    store.clearToneShiftResult();
    store.clearExpandResult();
    store.clearShortenResult();
    store.clearRewriteChannelResult();
    
    // Clear Brand & Audience results
    store.clearBrandAlignmentResult();
    
    // Clear template state
    store.setSelectedTemplateId(null);
    store.setIsGeneratingTemplate(false);
  }, []);

  /**
   * Handle tool selection with automatic state clearing
   * Special handling for brand-voice and personas which open slide-outs
   */
  const handleToolClick = useCallback((toolId: string) => {
    const currentToolId = useWorkspaceStore.getState().activeToolId;
    
    // Special handling for brand-voice and personas - open slide-outs instead
    if (toolId === 'brand-voice') {
      openSlideOut(BRAND_VOICE_PANEL_ID);
      return;
    }
    
    if (toolId === 'personas') {
      openSlideOut(PERSONAS_PANEL_ID);
      return;
    }
    
    // Only clear if switching to a different tool
    if (currentToolId !== toolId) {
      clearAllToolStates();
    }
    useWorkspaceStore.getState().setActiveTool(toolId);
  }, [clearAllToolStates, openSlideOut]);

  /**
   * Toggle section expansion
   */
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-1">
      {/* CopyWorx Logo Header */}
      <div className="bg-gray-200 -mx-2 -mt-6 mb-4 py-4 flex items-center justify-center">
        <Image
          src="/copyworx-logo-v2.png"
          alt="CopyWorx Studio"
          width={140}
          height={140}
          className="object-contain ml-2"
          priority
          unoptimized
        />
      </div>
      
      {/* Content with padding */}
      <div className="px-4 space-y-1">
        {/* My Projects Slide-Out Panel */}
        <MyProjectsSlideOut
        isOpen={isProjectsSlideOutOpen}
        onClose={closeProjectsSlideOut}
        onDocumentClick={handleSlideOutDocumentClick}
      />
      
      {/* Templates Slide-Out Panel */}
      <TemplatesSlideOut
        isOpen={isTemplatesSlideOutOpen}
        onClose={closeTemplatesSlideOut}
      />
      
      {/* MY PROJECTS SECTION */}
      <div className="space-y-1" data-tour="projects">
        {/* Section Header - Click to open full navigator slide-out */}
        <button
          onClick={openProjectsSlideOut}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
            'bg-gray-50 hover:bg-gray-100 transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'relative pl-5 border-l-[3px] border-transparent',
            'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0',
            'before:w-[3px] before:rounded-l-lg',
            'before:bg-gradient-to-b before:from-[#006EE6] before:to-[#7A3991]'
          )}
          aria-label="Open My Projects navigator"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-apple-text-dark" />
            <span className="font-semibold text-sm text-apple-text-dark uppercase tracking-normal">
              My Projects
            </span>
          </div>
          <PanelLeftOpen className="w-4 h-4 text-gray-400" />
        </button>

        {/* Document list with drag-and-drop — always visible */}
        <div className="mt-1 rounded-lg border border-gray-200 overflow-y-auto max-h-[280px]">
          <DocumentList onDocumentClick={onDocumentClick ?? (() => {})} showCreateButtons={false} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-2" />

      {/* AI@WORX TEMPLATES SECTION */}
      <div className="mb-2" data-tour="templates">
        <button
          onClick={openTemplatesSlideOut}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
            'bg-gray-50 hover:bg-gray-100 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'relative pl-5 border-l-[3px] border-transparent',
            'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0',
            'before:w-[3px] before:rounded-l-lg',
            'before:bg-gradient-to-b before:from-[#006EE6] before:to-[#7A3991]'
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-apple-text-dark" />
            <span className="font-semibold text-sm text-apple-text-dark uppercase tracking-normal">
              AI@Worx Templates
            </span>
          </div>
          <PanelLeftOpen className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-2" />

      {/* TOOL SECTIONS */}
      {SECTIONS.map((section) => {
        const dataTourAttr = section.id === 'optimizer' ? 'copy-optimizer' 
          : section.id === 'brand' ? 'brand-voice' 
          : undefined;
        const tools = getToolsBySection(section.id).filter(t => t.id !== 'word-advisor');
        const isExpanded = expandedSections.has(section.id);
        const SectionIcon = section.icon;

        return (
          <React.Fragment key={section.id}>
            <div className="space-y-1" data-tour={dataTourAttr}>
              {/* Section Header - Collapsible */}
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
                  'bg-gray-50 hover:bg-gray-100 transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                  'relative pl-5 border-l-[3px] border-transparent',
                  'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0',
                  'before:w-[3px] before:rounded-l-lg',
                  'before:bg-gradient-to-b before:from-[#006EE6] before:to-[#7A3991]'
                )}
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-2">
                  <SectionIcon className="w-4 h-4 text-apple-text-dark" />
                  <span className="font-semibold text-sm text-apple-text-dark uppercase tracking-normal">
                    {section.name}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Tools in Section */}
              {isExpanded && (
                <div className="ml-6 space-y-1">
                  {tools.map((tool) => {
                    const ToolIcon = tool.icon;
                    const isActive = activeToolId === tool.id;

                    return (
                      <button
                        key={tool.id}
                        data-tour={tool.id}
                        onClick={() => {
                          logger.log('🖱️ Tool clicked:', tool.id);
                          handleToolClick(tool.id);
                        }}
                        className={cn(
                          'w-full text-left p-2 rounded-lg',
                          'transition-all duration-200',
                          'flex items-center gap-2',
                          'group',
                          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                          isActive
                            ? 'bg-apple-blue text-white shadow-sm'
                            : 'hover:bg-apple-gray-bg text-apple-text-dark'
                        )}
                        title={tool.description}
                      >
                        <ToolIcon
                          className={cn(
                            'w-4 h-4 flex-shrink-0',
                            isActive ? 'text-white' : 'text-apple-blue'
                          )}
                        />
                        <span className="text-sm font-medium flex-1">{tool.name}</span>
                        {tool.badge && (
                          <span
                            className={cn(
                              'px-1.5 py-0.5 text-[10px] font-bold rounded uppercase',
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-green-100 text-green-700'
                            )}
                          >
                            {tool.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MY WORD ADVISOR – standalone item directly below MY COPY OPTIMIZER */}
            {section.id === 'optimizer' && (
              <div className="mt-1" data-tour="word-advisor">
                <button
                  onClick={() => {
                    logger.log('🖱️ Tool clicked: word-advisor');
                    handleToolClick('word-advisor');
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    'relative pl-5 border-l-[3px] border-transparent',
                    'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0',
                    'before:w-[3px] before:rounded-l-lg',
                    'before:bg-gradient-to-b before:from-[#006EE6] before:to-[#7A3991]',
                    'group',
                    activeToolId === 'word-advisor'
                      ? 'bg-apple-blue text-white shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100'
                  )}
                  title="Dictionary, thesaurus & copywriting intelligence"
                >
                  <BookOpenText className={cn(
                    'w-4 h-4 flex-shrink-0',
                    activeToolId === 'word-advisor'
                      ? 'text-white'
                      : 'text-apple-text-dark'
                  )} />
                  <span className={cn(
                    'font-semibold text-sm uppercase tracking-normal flex-1 whitespace-nowrap',
                    activeToolId === 'word-advisor' ? 'text-white' : 'text-apple-text-dark'
                  )}>
                    My Word Advisor
                  </span>
                </button>
              </div>
            )}
          </React.Fragment>
        );
      })}

      </div>
    </div>
  );
}
