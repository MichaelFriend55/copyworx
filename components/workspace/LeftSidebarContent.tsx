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

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import Image from 'next/image';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  PanelLeftOpen, 
  Folder as FolderIcon,
  Zap,
  UserCheck,
  Target,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { MyProjectsSlideOut, MY_PROJECTS_PANEL_ID } from '@/components/workspace/MyProjectsSlideOut';
import { TemplatesSlideOut, TEMPLATES_PANEL_ID } from '@/components/workspace/TemplatesSlideOut';
import { BRAND_VOICE_PANEL_ID } from '@/components/workspace/BrandVoiceSlideOut';
import { PERSONAS_PANEL_ID } from '@/components/workspace/PersonasSlideOut';
import { InsightsSlideOut, INSIGHTS_PANEL_ID, type InsightsPanelType } from '@/components/workspace/InsightsSlideOut';
import { 
  useWorkspaceStore, 
  useActiveProjectId, 
  useProjects,
  useActiveInsightsPanel,
  useInsightsPanelActions,
  useSelectedText,
  useBrandAlignmentActions,
  usePersonaAlignmentActions,
} from '@/lib/stores/workspaceStore';
import { useIsSlideOutOpen, useSlideOutActions } from '@/lib/stores/slideOutStore';
import { SECTIONS, getToolsBySection } from '@/lib/tools';
import { cn } from '@/lib/utils';
import type { ProjectDocument } from '@/lib/types/project';
import type { BrandVoice } from '@/lib/types/brand';
import type { Persona } from '@/lib/types/project';

// ============================================================================
// Types for Brand Voice and Persona selectors
// ============================================================================

/**
 * Brand voice with project context for display in selectors
 */
interface BrandVoiceWithProject {
  id: string;
  projectId: string | null;
  projectName: string | null;
  brandName: string;
  brandTone: string;
  approvedPhrases: string[];
  forbiddenWords: string[];
  brandValues: string[];
  missionStatement: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Persona with project context for display in selectors
 */
interface PersonaWithProject {
  id: string;
  projectId: string | null;
  projectName: string | null;
  name: string;
  photoUrl?: string;
  demographics: string;
  psychographics: string;
  painPoints: string;
  languagePatterns: string;
  goals: string;
  createdAt: string;
  updatedAt: string;
}

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
  const selectedText = useSelectedText();
  
  // Slide-out state
  const isProjectsSlideOutOpen = useIsSlideOutOpen(MY_PROJECTS_PANEL_ID);
  const isTemplatesSlideOutOpen = useIsSlideOutOpen(TEMPLATES_PANEL_ID);
  const { openSlideOut, closeSlideOut } = useSlideOutActions();
  
  // Insights panel state
  const activeInsightsPanel = useActiveInsightsPanel();
  const { openInsightsPanel, closeInsightsPanel } = useInsightsPanelActions();
  const { runBrandAlignment, clearBrandAlignmentResult } = useBrandAlignmentActions();
  const { runPersonaAlignment, clearPersonaAlignmentResult } = usePersonaAlignmentActions();
  
  // Get active project for brand voice and personas
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  // Track which sections are expanded (all start collapsed by default)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([])
  );
  
  // ============================================================================
  // Brand Voice & Persona Selector State
  // ============================================================================
  
  // All brand voices for the user (across all projects)
  const [allBrandVoices, setAllBrandVoices] = useState<BrandVoiceWithProject[]>([]);
  const [brandVoicesLoading, setBrandVoicesLoading] = useState(true);
  const [brandVoicesError, setBrandVoicesError] = useState<string | null>(null);
  
  // All personas for the user (across all projects)
  const [allPersonas, setAllPersonas] = useState<PersonaWithProject[]>([]);
  const [personasLoading, setPersonasLoading] = useState(true);
  const [personasError, setPersonasError] = useState<string | null>(null);
  
  // Selected brand voice and persona IDs for insights analysis
  const [selectedBrandVoiceId, setSelectedBrandVoiceId] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  
  // Get the selected brand voice and persona objects
  const selectedBrandVoice = useMemo(
    () => allBrandVoices.find((bv) => bv.id === selectedBrandVoiceId),
    [allBrandVoices, selectedBrandVoiceId]
  );
  
  const selectedPersona = useMemo(
    () => allPersonas.find((p) => p.id === selectedPersonaId),
    [allPersonas, selectedPersonaId]
  );
  
  // ============================================================================
  // Fetch Brand Voices and Personas
  // ============================================================================
  
  useEffect(() => {
    const fetchAllBrandVoices = async () => {
      try {
        setBrandVoicesLoading(true);
        setBrandVoicesError(null);
        
        const response = await fetch('/api/db/all-brand-voices');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch brand voices');
        }
        
        const data = await response.json();
        setAllBrandVoices(data);
      } catch (error) {
        logger.error('Failed to fetch brand voices:', error);
        setBrandVoicesError(error instanceof Error ? error.message : 'Failed to load brand voices');
      } finally {
        setBrandVoicesLoading(false);
      }
    };
    
    const fetchAllPersonas = async () => {
      try {
        setPersonasLoading(true);
        setPersonasError(null);
        
        const response = await fetch('/api/db/all-personas');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch personas');
        }
        
        const data = await response.json();
        setAllPersonas(data);
      } catch (error) {
        logger.error('Failed to fetch personas:', error);
        setPersonasError(error instanceof Error ? error.message : 'Failed to load personas');
      } finally {
        setPersonasLoading(false);
      }
    };
    
    fetchAllBrandVoices();
    fetchAllPersonas();
  }, []);
  
  // Clear results when selection changes
  const handleBrandVoiceChange = useCallback((id: string | null) => {
    setSelectedBrandVoiceId(id);
    clearBrandAlignmentResult();
  }, [clearBrandAlignmentResult]);
  
  const handlePersonaChange = useCallback((id: string | null) => {
    setSelectedPersonaId(id);
    clearPersonaAlignmentResult();
  }, [clearPersonaAlignmentResult]);
  
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
   * Handle Check Brand Alignment click
   * Uses the selected brand voice from the dropdown
   */
  const handleCheckBrandAlignment = useCallback(() => {
    // Open the slide-out panel
    openInsightsPanel('brand-alignment');
    
    // If we have selected text and a selected brand voice, run the analysis
    if (selectedText && selectedText.trim() && selectedBrandVoice) {
      // Convert BrandVoiceWithProject to BrandVoice format for the API
      const brandVoice: BrandVoice = {
        brandName: selectedBrandVoice.brandName,
        brandTone: selectedBrandVoice.brandTone,
        approvedPhrases: selectedBrandVoice.approvedPhrases,
        forbiddenWords: selectedBrandVoice.forbiddenWords,
        brandValues: selectedBrandVoice.brandValues,
        missionStatement: selectedBrandVoice.missionStatement,
      };
      runBrandAlignment(selectedText, brandVoice);
    }
  }, [openInsightsPanel, selectedText, selectedBrandVoice, runBrandAlignment]);
  
  /**
   * Handle Check Persona Alignment click
   * Uses the selected persona from the dropdown
   */
  const handleCheckPersonaAlignment = useCallback(() => {
    // Open the slide-out panel
    openInsightsPanel('persona-alignment');
    
    // If we have selected text and a selected persona, run the analysis
    if (selectedText && selectedText.trim() && selectedPersona) {
      // Convert PersonaWithProject to Persona format for the API
      const persona: Persona = {
        id: selectedPersona.id,
        name: selectedPersona.name,
        photoUrl: selectedPersona.photoUrl,
        demographics: selectedPersona.demographics,
        psychographics: selectedPersona.psychographics,
        painPoints: selectedPersona.painPoints,
        languagePatterns: selectedPersona.languagePatterns,
        goals: selectedPersona.goals,
        createdAt: selectedPersona.createdAt,
        updatedAt: selectedPersona.updatedAt,
      };
      runPersonaAlignment(selectedText, persona);
    }
  }, [openInsightsPanel, selectedText, selectedPersona, runPersonaAlignment]);
  
  /**
   * Close insights panel
   */
  const handleCloseInsightsPanel = useCallback(() => {
    closeInsightsPanel();
  }, [closeInsightsPanel]);

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

  const isProjectsExpanded = expandedSections.has('projects');

  return (
    <div className="space-y-1">
      {/* CopyWorx Logo Header */}
      <div className="bg-gray-200 -mx-2 -mt-6 mb-4 py-4 flex items-center justify-center">
        <Image
          src="/copyworx-studio-logo.png"
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
      
      {/* Insights Slide-Out Panel */}
      <InsightsSlideOut
        isOpen={activeInsightsPanel !== null}
        onClose={handleCloseInsightsPanel}
        panelType={activeInsightsPanel}
        onCheckBrandAlignment={handleCheckBrandAlignment}
        onCheckPersonaAlignment={handleCheckPersonaAlignment}
      />
      
      {/* MY PROJECTS SECTION */}
      <div className="space-y-1" data-tour="projects">
        {/* Section Header - Click to open slide-out */}
        <div className="flex items-center gap-1">
          {/* Main header button - opens slide-out */}
          <button
            onClick={() => {
              openProjectsSlideOut();
            }}
            className={cn(
              'flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg',
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
              <span className="font-semibold text-sm text-apple-text-dark uppercase tracking-wide">
                My Projects
              </span>
            </div>
            <PanelLeftOpen className="w-4 h-4 text-gray-400" />
          </button>
          
          {/* Local collapse toggle button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSection('projects');
            }}
            className={cn(
              'p-2 rounded-lg',
              'text-gray-400 hover:text-gray-600 hover:bg-apple-gray-bg',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
            )}
            title="Show/hide project selector"
            aria-label="Toggle project selector visibility"
          >
            {isProjectsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Projects Content - Collapsed View - Simple project list */}
        {isProjectsExpanded && (
          <div className="py-2 space-y-1">
            {projects.length > 0 ? (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    openProjectsSlideOut();
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg',
                    'text-sm transition-all duration-200',
                    'hover:bg-apple-gray-bg',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    project.id === activeProjectId
                      ? 'bg-apple-blue/10 text-apple-blue font-medium'
                      : 'text-gray-700 hover:text-gray-900'
                  )}
                  title={`Open ${project.name} in navigator`}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className={cn(
                      'w-4 h-4 flex-shrink-0',
                      project.id === activeProjectId ? 'text-apple-blue' : 'text-gray-400'
                    )} />
                    <span className="truncate">{project.name}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-500">No projects yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-2" />

      {/* AI@WORX TEMPLATES SECTION */}
      <div className="mb-2" data-tour="templates">
        <button
          onClick={openTemplatesSlideOut}
          className={cn(
            'w-full flex items-center justify-between px-3 py-3 rounded-lg',
            'bg-gray-50 hover:bg-gray-100 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'relative pl-5 border-l-[3px] border-transparent',
            'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0',
            'before:w-[3px] before:rounded-l-lg',
            'before:bg-gradient-to-b before:from-[#006EE6] before:to-[#7A3991]',
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
                Browse templates
              </div>
            </div>
          </div>
          <PanelLeftOpen className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-2" />

      {/* EXISTING TOOL SECTIONS - Exclude 'insights' section (replaced by AI@Worx™ Live) */}
      {SECTIONS.filter(section => section.id !== 'insights').map((section) => {
        // Determine data-tour attribute for specific sections
        const dataTourAttr = section.id === 'optimizer' ? 'copy-optimizer' 
          : section.id === 'brand' ? 'brand-voice' 
          : undefined;
        const tools = getToolsBySection(section.id);
        const isExpanded = expandedSections.has(section.id);
        const SectionIcon = section.icon;

        return (
          <div key={section.id} className="space-y-1" data-tour={dataTourAttr}>
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
        );
      })}

      {/* Divider */}
      <div className="border-t border-gray-200 my-2" />

      {/* MY INSIGHTS SECTION - Dedicated buttons for alignment checks */}
      <div className="space-y-1" data-tour="insights">
        {/* Section Header */}
        <button
          onClick={() => toggleSection('insights')}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
            'bg-gray-50 hover:bg-gray-100 transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
            'relative pl-5 border-l-[3px] border-transparent',
            'before:content-[""] before:absolute before:left-0 before:top-0 before:bottom-0',
            'before:w-[3px] before:rounded-l-lg',
            'before:bg-gradient-to-b before:from-[#006EE6] before:to-[#7A3991]'
          )}
          aria-expanded={expandedSections.has('insights')}
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-apple-text-dark" />
            <span className="font-semibold text-sm text-apple-text-dark uppercase tracking-wide">
              My Insights
            </span>
          </div>
          {expandedSections.has('insights') ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Insights Content */}
        {expandedSections.has('insights') && (
          <div className="ml-2 space-y-4 py-2">
            {/* ============================================================ */}
            {/* BRAND ALIGNMENT SECTION */}
            {/* ============================================================ */}
            <div className="space-y-2">
              {/* Brand Voice Selector Label */}
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide px-2">
                Select Brand Voice
              </label>
              
              {/* Brand Voice Selector Dropdown */}
              {brandVoicesLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading brand voices...</span>
                </div>
              ) : brandVoicesError ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{brandVoicesError}</span>
                </div>
              ) : allBrandVoices.length === 0 ? (
                <div className="px-3 py-2 text-sm text-amber-600 bg-amber-50 rounded-lg">
                  <p className="font-medium">Create a brand voice first</p>
                  <p className="text-xs text-amber-500 mt-1">Go to Brand & Audience to set up your brand voice</p>
                </div>
              ) : (
                <select
                  value={selectedBrandVoiceId || ''}
                  onChange={(e) => handleBrandVoiceChange(e.target.value || null)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border text-sm',
                    'bg-white text-gray-900',
                    'border-gray-200 focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20',
                    'transition-colors duration-200',
                    'cursor-pointer'
                  )}
                >
                  <option value="">Choose a brand voice...</option>
                  {allBrandVoices.map((bv) => (
                    <option key={bv.id} value={bv.id}>
                      {bv.brandName}{bv.projectName ? ` (${bv.projectName})` : ''}
                    </option>
                  ))}
                </select>
              )}
              
              {/* Check Brand Alignment Button */}
              <button
                onClick={handleCheckBrandAlignment}
                disabled={!selectedBrandVoiceId || allBrandVoices.length === 0}
                className={cn(
                  'w-full text-left p-2 rounded-lg',
                  'transition-all duration-200',
                  'flex items-center gap-2',
                  'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                  !selectedBrandVoiceId || allBrandVoices.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : activeInsightsPanel === 'brand-alignment'
                      ? 'bg-apple-blue text-white shadow-sm'
                      : 'hover:bg-apple-gray-bg text-apple-text-dark'
                )}
                title={
                  !selectedBrandVoiceId 
                    ? 'Select a brand voice first' 
                    : 'Check how well your copy aligns with your brand voice'
                }
              >
                <Zap
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    !selectedBrandVoiceId || allBrandVoices.length === 0
                      ? 'text-gray-400'
                      : activeInsightsPanel === 'brand-alignment' 
                        ? 'text-white' 
                        : 'text-apple-blue'
                  )}
                />
                <span className="text-sm font-medium flex-1">Check Brand Alignment</span>
              </button>
            </div>
            
            {/* Divider */}
            <div className="border-t border-gray-200 mx-2" />
            
            {/* ============================================================ */}
            {/* PERSONA ALIGNMENT SECTION */}
            {/* ============================================================ */}
            <div className="space-y-2">
              {/* Persona Selector Label */}
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide px-2">
                Select Persona
              </label>
              
              {/* Persona Selector Dropdown */}
              {personasLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading personas...</span>
                </div>
              ) : personasError ? (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{personasError}</span>
                </div>
              ) : allPersonas.length === 0 ? (
                <div className="px-3 py-2 text-sm text-amber-600 bg-amber-50 rounded-lg">
                  <p className="font-medium">Create a persona first</p>
                  <p className="text-xs text-amber-500 mt-1">Go to Brand & Audience to set up your personas</p>
                </div>
              ) : (
                <select
                  value={selectedPersonaId || ''}
                  onChange={(e) => handlePersonaChange(e.target.value || null)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border text-sm',
                    'bg-white text-gray-900',
                    'border-gray-200 focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20',
                    'transition-colors duration-200',
                    'cursor-pointer'
                  )}
                >
                  <option value="">Choose a persona...</option>
                  {allPersonas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.projectName ? ` (${p.projectName})` : ''}
                    </option>
                  ))}
                </select>
              )}
              
              {/* Check Persona Alignment Button */}
              <button
                onClick={handleCheckPersonaAlignment}
                disabled={!selectedPersonaId || allPersonas.length === 0}
                className={cn(
                  'w-full text-left p-2 rounded-lg',
                  'transition-all duration-200',
                  'flex items-center gap-2',
                  'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                  !selectedPersonaId || allPersonas.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : activeInsightsPanel === 'persona-alignment'
                      ? 'bg-apple-blue text-white shadow-sm'
                      : 'hover:bg-apple-gray-bg text-apple-text-dark'
                )}
                title={
                  !selectedPersonaId 
                    ? 'Select a persona first' 
                    : 'Check how well your copy resonates with your target persona'
                }
              >
                <UserCheck
                  className={cn(
                    'w-4 h-4 flex-shrink-0',
                    !selectedPersonaId || allPersonas.length === 0
                      ? 'text-gray-400'
                      : activeInsightsPanel === 'persona-alignment' 
                        ? 'text-white' 
                        : 'text-apple-blue'
                  )}
                />
                <span className="text-sm font-medium flex-1">Check Persona Alignment</span>
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
