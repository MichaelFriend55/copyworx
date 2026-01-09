/**
 * @file app/copyworx/workspace/page.tsx
 * @description Main workspace page with tool selector architecture
 * 
 * Features:
 * - Three-column layout (tool selector, editor, active tool)
 * - Collapsible tool sections in left sidebar
 * - Dynamic tool rendering in right sidebar
 * - Tool registry integration
 * - Automatic document creation
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { WorkspaceLayout, ToneShifter } from '@/components/workspace';
import { EditorArea } from '@/components/workspace';
import { TemplatesModal } from '@/components/workspace/TemplatesModal';
import { TemplateGenerator } from '@/components/workspace/TemplateGenerator';
import { ExpandTool } from '@/components/workspace/ExpandTool';
import { ShortenTool } from '@/components/workspace/ShortenTool';
import { RewriteChannelTool } from '@/components/workspace/RewriteChannelTool';
import { BrandVoiceTool } from '@/components/workspace/BrandVoiceTool';
import { PersonasTool } from '@/components/workspace/PersonasTool';
import { ProjectSelector } from '@/components/workspace/ProjectSelector';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { initializeProjectSystem } from '@/lib/utils/project-utils';
import { getTemplateById } from '@/lib/data/templates';
import { SECTIONS, getToolsBySection } from '@/lib/tools';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/react';

/**
 * Placeholder component for tools under development
 */
function PlaceholderTool({ title, description }: { title: string; description: string; editor: Editor | null }) {
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
  'competitor-analyzer': (props) => <PlaceholderTool {...props} title="Competitor Analyzer" description="Analyze competitor copy" />,
  'persona-alignment': (props) => <PlaceholderTool {...props} title="Persona Alignment" description="Check persona fit" />,
  'brand-alignment': (props) => <PlaceholderTool {...props} title="Brand Alignment" description="Check brand consistency" />,
};

/**
 * Left sidebar content - Tool selector with collapsible sections
 */
function LeftSidebarContent() {
  const { 
    activeToolId, 
    setActiveTool, 
    refreshProjects,
    // State clearing functions
    clearToneShiftResult,
    clearExpandResult,
    clearShortenResult,
    clearRewriteChannelResult,
    clearBrandAlignmentResult,
    setSelectedTemplateId,
    setIsGeneratingTemplate,
  } = useWorkspaceStore();
  
  // Track which sections are expanded (Projects and Optimizer start expanded)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['projects', 'optimizer'])
  );

  // Templates modal state
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  
  // Initialize projects on mount - FIX: Empty deps array to run only once
  useEffect(() => {
    refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Clear all tool states before switching tools
   */
  const clearAllToolStates = () => {
    // Clear Copy Optimizer results
    clearToneShiftResult();
    clearExpandResult();
    clearShortenResult();
    clearRewriteChannelResult();
    
    // Clear Brand & Audience results
    clearBrandAlignmentResult();
    
    // Clear template state
    setSelectedTemplateId(null);
    setIsGeneratingTemplate(false);
  };

  /**
   * Handle tool selection with automatic state clearing
   */
  const handleToolClick = (toolId: string) => {
    // Only clear if switching to a different tool
    if (activeToolId !== toolId) {
      console.log('🧹 Clearing all tool states before switching to:', toolId);
      clearAllToolStates();
    }
    setActiveTool(toolId);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isProjectsExpanded = expandedSections.has('projects');

  return (
    <div className="space-y-1">
      {/* Templates Modal */}
      <TemplatesModal
        isOpen={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
      />
      {/* MY PROJECTS SECTION - NEW */}
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
          <div className="ml-6 py-3 space-y-3">
            {/* Project Selector */}
            <ProjectSelector />
            
            {/* Future: Documents & Folders */}
            <div className="pt-2">
              <p className="text-xs text-gray-500 italic">
                Documents & Folders coming soon
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-2" />

      {/* AI@WORX TEMPLATES SECTION */}
      <div className="mb-2">
        <button
          onClick={() => {
            console.log('🎨 Opening Templates Modal');
            setTemplatesModalOpen(true);
          }}
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

      {/* EXISTING TOOL SECTIONS */}
      {SECTIONS.map((section) => {
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
    </div>
  );
}

/**
 * Right sidebar content - Dynamic tool rendering
 */
function RightSidebarContent({ editor }: { editor: Editor | null }) {
  const activeToolId = useWorkspaceStore((state) => state.activeToolId);
  const activeDocument = useWorkspaceStore((state) => state.activeDocument);
  const selectedTemplateId = useWorkspaceStore((state) => state.selectedTemplateId);
  const setSelectedTemplateId = useWorkspaceStore((state) => state.setSelectedTemplateId);
  const setActiveTool = useWorkspaceStore((state) => state.setActiveTool);
  
  // Get active project for template generation - FIX: Use selector to prevent infinite loop
  const activeProject = useWorkspaceStore((state) => {
    const project = state.projects.find((p) => p.id === state.activeProjectId);
    return project || null;
  });

  // Get the active tool component
  const ActiveToolComponent = activeToolId ? TOOL_COMPONENTS[activeToolId] : null;
  
  // Get selected template if in template generation mode
  const selectedTemplate = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;
  
  /**
   * Handle template generator cancel
   */
  const handleTemplateCancel = () => {
    setSelectedTemplateId(null);
    setActiveTool(null);
  };

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
      {/* Header - Always Shows "AI@Worx™ Analysis" */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-apple-blue" />
        <h2 className="text-lg font-semibold text-apple-text-dark">
          AI@Worx™ Analysis
        </h2>
      </div>

      {/* Dynamic Tool Rendering - FIXED: Check tool selection FIRST */}
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
      ) : !activeDocument ? (
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

/**
 * Main workspace page component
 */
export default function WorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  
  const createDocument = useWorkspaceStore((state) => state.createDocument);
  const activeDocument = useWorkspaceStore((state) => state.activeDocument);

  // Store editor instance to pass to ToneShifter
  const [editor, setEditor] = useState<Editor | null>(null);

  // Initialize project system on mount
  useEffect(() => {
    console.log('🚀 Initializing workspace...');
    
    // Initialize project system (creates default project if needed, migrates legacy data)
    initializeProjectSystem();
    
    // Clean URL on mount
    if (action) {
      router.replace('/copyworx/workspace', { scroll: false });
    }

    // Only create new document if:
    // 1. User explicitly requested "new" AND
    // 2. No document currently exists
    if (action === 'new' && !activeDocument) {
      createDocument('Untitled Document');
      console.log('🆕 Creating new blank document');
    } else if (activeDocument) {
      console.log('📄 Loading existing document:', activeDocument.id.substring(0, 8));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  return (
    <WorkspaceLayout
      leftSidebar={<LeftSidebarContent />}
      rightSidebar={<RightSidebarContent editor={editor} />}
    >
      <EditorArea onEditorReady={setEditor} />
    </WorkspaceLayout>
  );
}
