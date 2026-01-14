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
 * - Project selector section
 * - Document list with version control
 * - AI@Worx Templates modal trigger
 * - Collapsible tool sections (My Copy Optimizer, My Brand & Audience)
 * - Active tool highlighting
 * - AI@Worx™ Live document insights panel at bottom
 * 
 * Note: The "My Insights" section has been replaced by the AI@Worx™ Live panel
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { TemplatesModal } from '@/components/workspace/TemplatesModal';
import { ProjectSelector } from '@/components/workspace/ProjectSelector';
import DocumentList from '@/components/workspace/DocumentList';
import { DocumentInsights } from '@/components/workspace/DocumentInsights';
import { useWorkspaceStore, useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
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
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  // Get active project for dynamic section title
  const activeProject = projects.find(p => p.id === activeProjectId);
  const documentsSectionTitle = activeProject 
    ? `${activeProject.name} Projects`
    : 'Projects';
  
  // Track which sections are expanded (Projects, Documents, and Optimizer start expanded)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['projects', 'documents', 'optimizer'])
  );

  // Templates modal state
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  
  // NOTE: Project initialization is now handled in the parent WorkspacePage
  // This prevents duplicate refreshProjects() calls that could cause issues

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
   */
  const handleToolClick = useCallback((toolId: string) => {
    const currentToolId = useWorkspaceStore.getState().activeToolId;
    
    // Only clear if switching to a different tool
    if (currentToolId !== toolId) {
      console.log('🧹 Clearing all tool states before switching to:', toolId);
      clearAllToolStates();
    }
    useWorkspaceStore.getState().setActiveTool(toolId);
  }, [clearAllToolStates]);

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

  /**
   * Open templates modal
   */
  const openTemplatesModal = useCallback(() => {
    console.log('🎨 Opening Templates Modal');
    setTemplatesModalOpen(true);
  }, []);

  /**
   * Close templates modal
   */
  const closeTemplatesModal = useCallback(() => {
    setTemplatesModalOpen(false);
  }, []);

  const isProjectsExpanded = expandedSections.has('projects');

  return (
    <div className="space-y-1 px-4">
      {/* Templates Modal */}
      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={closeTemplatesModal}
      />
      
      {/* MY PROJECTS SECTION */}
      <div className="space-y-1">
        {/* Section Header - Collapsible */}
        <button
          onClick={() => toggleSection('projects')}
          className={cn(
            'w-full flex items-center justify-between p-2 rounded-lg',
            'hover:bg-apple-gray-bg transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
          )}
          aria-expanded={isProjectsExpanded}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-apple-text-dark" />
            <span className="font-semibold text-sm text-apple-text-dark uppercase tracking-wide">
              My Projects
            </span>
          </div>
          {isProjectsExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Projects Content */}
        {isProjectsExpanded && (
          <div className="py-3 space-y-3">
            {/* Project Selector */}
            <ProjectSelector />
          </div>
        )}
      </div>

      {/* DOCUMENTS SECTION - Dynamic title based on active project */}
      <div className="space-y-1">
        {/* Section Header - Collapsible */}
        <button
          onClick={() => toggleSection('documents')}
          className={cn(
            'w-full flex items-center justify-between p-2 rounded-lg',
            'hover:bg-apple-gray-bg transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
          )}
          aria-expanded={expandedSections.has('documents')}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-apple-text-dark" />
            <span className="font-semibold text-sm text-apple-text-dark uppercase tracking-wide">
              {documentsSectionTitle}
            </span>
          </div>
          {expandedSections.has('documents') ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Documents Content - negative margin to cancel parent padding, allowing full-width buttons */}
        {/* Scrollable document list with proper height constraints */}
        {expandedSections.has('documents') && (
          <div className="max-h-[400px] overflow-y-auto overflow-x-hidden -mx-4">
            <DocumentList 
              onDocumentClick={(doc) => {
                console.log('📄 Document selected:', doc.title);
                onDocumentClick?.(doc);
              }}
            />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-2" />

      {/* AI@WORX TEMPLATES SECTION */}
      <div className="mb-2">
        <button
          onClick={openTemplatesModal}
          className={cn(
            'w-full flex items-center justify-between px-3 py-3 rounded-lg',
            'hover:bg-apple-gray-bg transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'group'
          )}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
            <div className="text-left">
              <div className="font-medium text-sm text-apple-text-dark">
                AI@Worx™ Templates
              </div>
              <div className="text-xs text-gray-500">
                Create from templates
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-2" />

      {/* EXISTING TOOL SECTIONS - Exclude 'insights' section (replaced by AI@Worx™ Live) */}
      {SECTIONS.filter(section => section.id !== 'insights').map((section) => {
        const tools = getToolsBySection(section.id);
        const isExpanded = expandedSections.has(section.id);
        const SectionIcon = section.icon;

        return (
          <div key={section.id} className="space-y-1">
            {/* Section Header - Collapsible */}
            <button
              onClick={() => toggleSection(section.id)}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-lg',
                'hover:bg-apple-gray-bg transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
              )}
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-2">
                <SectionIcon className="w-4 h-4 text-apple-text-dark" />
                <span className="font-semibold text-sm text-apple-text-dark uppercase tracking-wide">
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
                      onClick={() => {
                        console.log('🖱️ Tool clicked:', tool.id);
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
        );
      })}

      {/* AI@Worx™ Live - Document Insights Panel */}
      <DocumentInsights />
    </div>
  );
}
