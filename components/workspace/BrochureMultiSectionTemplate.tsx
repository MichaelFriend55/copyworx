/**
 * @file components/workspace/BrochureMultiSectionTemplate.tsx
 * @description Multi-section brochure template component with progress persistence
 * 
 * Features:
 * - Section-by-section generation with context
 * - Progress persistence across sessions
 * - Resume functionality for incomplete templates
 * - Section management (view, regenerate, skip)
 * - Brand voice and persona integration
 * - Visual progress indicator
 * 
 * This component renders inline in the right sidebar, similar to TemplateGenerator.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  BookOpen,
  ChevronLeft,
  Sparkles,
  CheckCircle,
  Circle,
  SkipForward,
  AlertCircle,
  Play,
  RotateCcw,
  X,
  ListChecks,
  Eye,
  Clock,
} from 'lucide-react';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { cn } from '@/lib/utils';
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
import { updateDocument as updateDocumentInStorage, getDocument, getProjectPersonas } from '@/lib/storage/unified-storage';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { 
  BROCHURE_SECTIONS, 
  SECTION_SEPARATOR,
  getSectionById,
  BROCHURE_MULTI_SECTION_TEMPLATE
} from '@/lib/templates/brochure-multi-section-config';
import type { 
  TemplateProgress, 
  CompletedSection,
  TemplateSectionField 
} from '@/lib/types/template-progress';
import { createInitialProgress, generateContentHash } from '@/lib/types/template-progress';
import type { Project, Persona } from '@/lib/types/project';
import type { Editor } from '@tiptap/react';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Panel ID for slide-out */
export const BROCHURE_TEMPLATE_PANEL_ID = 'brochure-multi-section';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface BrochureMultiSectionTemplateProps {
  /** Callback when template should close */
  onClose: () => void;
  
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Active project for brand voice and personas */
  activeProject: Project | null;
}

type ViewState = 'section-form' | 'section-list' | 'completed';

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Progress indicator showing section completion status
 */
function ProgressIndicator({ 
  currentSection, 
  totalSections, 
  completedSections 
}: { 
  currentSection: number; 
  totalSections: number;
  completedSections: string[];
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {BROCHURE_SECTIONS.map((section, index) => {
        const isCompleted = completedSections.includes(section.id);
        const isCurrent = index === currentSection;
        const isPending = !isCompleted && index > currentSection;
        
        return (
          <React.Fragment key={section.id}>
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                isCompleted && 'bg-green-100 text-green-700 border-2 border-green-500',
                isCurrent && !isCompleted && 'bg-apple-blue text-white border-2 border-apple-blue',
                isPending && 'bg-gray-100 text-gray-400 border-2 border-gray-200'
              )}
              title={section.name}
            >
              {isCompleted ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < totalSections - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 transition-colors',
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Section form field renderer
 */
function SectionFormField({
  field,
  value,
  onChange,
  disabled,
  formData,
}: {
  field: TemplateSectionField;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  formData: Record<string, string>;
}) {
  // Handle conditional visibility
  if (field.conditionalOn) {
    const conditionValue = formData[field.conditionalOn.fieldId];
    const conditionMet = Array.isArray(field.conditionalOn.value)
      ? field.conditionalOn.value.includes(conditionValue)
      : conditionValue === field.conditionalOn.value;
    
    if (!conditionMet) return null;
  }

  const baseInputClasses = cn(
    'w-full px-3 py-2 rounded-lg border transition-all duration-200',
    'text-sm text-gray-900 bg-white',
    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
    'disabled:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
  );

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-900">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {field.type === 'textarea' ? (
        <AutoExpandTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseInputClasses}
          minHeight={80}
          maxHeight={200}
          maxLength={field.maxLength}
        />
      ) : field.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={baseInputClasses}
        >
          <option value="">Select an option...</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseInputClasses}
          maxLength={field.maxLength}
        />
      )}
      
      {field.helperText && (
        <p className="text-xs text-gray-500">{field.helperText}</p>
      )}
      
      {field.maxLength && value.length > 0 && (
        <p className={cn(
          'text-xs text-right',
          value.length > field.maxLength * 0.9 ? 'text-amber-500' : 'text-gray-400'
        )}>
          {value.length}/{field.maxLength}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function BrochureMultiSectionTemplate({
  onClose,
  editor,
  activeProject,
}: BrochureMultiSectionTemplateProps) {
  const activeDocumentId = useWorkspaceStore((state) => state.activeDocumentId);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  
  // Template state
  const [progress, setProgress] = useState<TemplateProgress | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [viewState, setViewState] = useState<ViewState>('section-form');
  
  // Settings state
  const [applyBrandVoice, setApplyBrandVoice] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Personas state
  const [personas, setPersonas] = useState<Persona[]>([]);
  
  const hasBrandVoice = activeProject?.brandVoice?.brandName ? true : false;
  
  // Current section
  const currentSection = progress ? BROCHURE_SECTIONS[progress.currentSection] : BROCHURE_SECTIONS[0];
  
  /**
   * Load or initialize template progress from document
   */
  useEffect(() => {
    const loadProgress = async () => {
      logger.log('🔄 BrochureMultiSectionTemplate: Checking progress...', {
        activeDocumentId,
        activeProjectId,
        hasProgress: !!progress
      });
      
      if (!activeDocumentId || !activeProjectId) {
        logger.warn('⚠️ Missing activeDocumentId or activeProjectId', {
          activeDocumentId,
          activeProjectId
        });
        return;
      }
      
      const doc = await getDocument(activeProjectId, activeDocumentId);
      if (!doc) {
        logger.error('❌ Document not found:', activeDocumentId);
        return;
      }
      
      logger.log('📄 Document loaded:', {
        id: doc.id,
        title: doc.title,
        hasTemplateProgress: !!doc.templateProgress
      });
    
    if (doc.templateProgress && doc.templateProgress.templateId === 'brochure-multi-section') {
      // Resume existing progress
      logger.log('🔄 Resuming existing template progress');
      const loadedProgress = doc.templateProgress;
      setProgress(loadedProgress);
      setApplyBrandVoice(loadedProgress.applyBrandVoice || false);
      setSelectedPersonaId(loadedProgress.selectedPersonaId || null);
      
      // If complete, show completion view
      if (loadedProgress.isComplete) {
        logger.log('✅ Template is complete');
        setViewState('completed');
      }
      
      // Load form data for current section
      const currentSectionIndex = loadedProgress.currentSection;
      const section = BROCHURE_SECTIONS[currentSectionIndex];
      
      if (section) {
        logger.log('📝 Loading form data for section:', section.name);
        // Check if we have saved form data for this section
        if (loadedProgress.sectionData[section.id]?.formData) {
          setFormData(loadedProgress.sectionData[section.id].formData);
        } else {
          // Initialize with empty values
          const initialData: Record<string, string> = {};
          section.fields.forEach((field) => {
            initialData[field.id] = '';
          });
          setFormData(initialData);
        }
      }
    } else {
      // Initialize new progress
      logger.log('✨ Initializing new template progress');
      const newProgress = createInitialProgress(
        'brochure-multi-section',
        BROCHURE_SECTIONS.length
      );
      setProgress(newProgress);
      logger.log('✅ Progress initialized:', newProgress);
      
      // Initialize form data for first section
      const section = BROCHURE_SECTIONS[0];
      if (section) {
        logger.log('📝 Initializing empty form data for first section:', section.name);
        const initialData: Record<string, string> = {};
        section.fields.forEach((field) => {
          initialData[field.id] = '';
        });
        setFormData(initialData);
      }
    }
    };
    
    loadProgress();
  }, [activeDocumentId, activeProjectId]);
  
  /**
   * Load personas for current project
   */
  useEffect(() => {
    const loadPersonas = async () => {
      if (!activeProject) {
        setPersonas([]);
        return;
      }
      
      try {
        const projectPersonas = await getProjectPersonas(activeProject.id);
        setPersonas(projectPersonas);
      } catch (error) {
        logger.error('❌ Failed to load personas:', error);
        setPersonas([]);
      }
    };
    
    loadPersonas();
  }, [activeProject]);
  
  /**
   * Initialize form data for a section
   * Loads saved data if available, otherwise initializes with empty values
   */
  const initializeFormData = useCallback((sectionIndex: number, currentProgress: TemplateProgress | null) => {
    const section = BROCHURE_SECTIONS[sectionIndex];
    if (!section) {
      logger.warn('⚠️ Section not found for index:', sectionIndex);
      return;
    }
    
    // Check if we have saved form data for this section
    if (currentProgress?.sectionData[section.id]?.formData) {
      logger.log('✅ Loading saved form data for section:', section.name);
      setFormData(currentProgress.sectionData[section.id].formData);
    } else {
      logger.log('📝 Initializing empty form data for section:', section.name);
      // Initialize with empty values
      const initialData: Record<string, string> = {};
      section.fields.forEach((field) => {
        initialData[field.id] = '';
      });
      setFormData(initialData);
    }
  }, []);
  
  /**
   * Save progress to document storage
   */
  const saveProgress = useCallback((updatedProgress: TemplateProgress) => {
    if (!activeProjectId || !activeDocumentId) return;
    
    try {
      updateDocumentInStorage(activeProjectId, activeDocumentId, {
        templateProgress: updatedProgress,
      });
      setProgress(updatedProgress);
    } catch (error) {
      logger.error('❌ Failed to save template progress:', error);
    }
  }, [activeProjectId, activeDocumentId]);
  
  /**
   * Update document content with all generated sections
   */
  const updateDocumentContent = useCallback((updatedProgress: TemplateProgress) => {
    if (!activeProjectId || !activeDocumentId || !editor) return;
    
    // Build content from all completed sections
    const contentParts: string[] = [];
    
    BROCHURE_SECTIONS.forEach((section) => {
      const sectionData = updatedProgress.sectionData[section.id];
      if (sectionData?.generatedContent) {
        // Add section header
        contentParts.push(`<h2>${section.name}</h2>`);
        contentParts.push(sectionData.generatedContent);
      }
    });
    
    const fullContent = contentParts.join(SECTION_SEPARATOR);
    
    // Update editor
    editor.commands.setContent(fullContent);
    
    // Save to storage
    try {
      updateDocumentInStorage(activeProjectId, activeDocumentId, {
        content: fullContent,
      });
    } catch (error) {
      logger.error('❌ Failed to save document content:', error);
    }
  }, [activeProjectId, activeDocumentId, editor]);
  
  /**
   * Get previous content for context
   */
  const getPreviousContent = useCallback((): string => {
    if (!progress) return '';
    
    const contentParts: string[] = [];
    
    BROCHURE_SECTIONS.forEach((section, index) => {
      if (index < (progress.currentSection || 0)) {
        const sectionData = progress.sectionData[section.id];
        if (sectionData?.generatedContent) {
          contentParts.push(`=== ${section.name} ===\n${sectionData.generatedContent}`);
        }
      }
    });
    
    return contentParts.join('\n\n');
  }, [progress]);
  
  /**
   * Handle form field change
   */
  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setGenerationError(null);
  }, []);
  
  /**
   * Validate current section form
   */
  const validateForm = useCallback((): boolean => {
    if (!currentSection) return false;
    
    for (const field of currentSection.fields) {
      if (!field.required) continue;
      
      // Handle conditional fields
      if (field.conditionalOn) {
        const conditionValue = formData[field.conditionalOn.fieldId];
        const conditionMet = Array.isArray(field.conditionalOn.value)
          ? field.conditionalOn.value.includes(conditionValue)
          : conditionValue === field.conditionalOn.value;
        
        if (!conditionMet) continue;
      }
      
      const value = formData[field.id]?.trim();
      if (!value) {
        setGenerationError(`Please fill in: ${field.label}`);
        return false;
      }
    }
    
    return true;
  }, [currentSection, formData]);
  
  /**
   * Generate current section
   */
  const handleGenerate = useCallback(async () => {
    if (!progress || !currentSection || !editor || !activeProjectId || !activeDocumentId) return;
    
    if (!validateForm()) return;
    
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      // Get persona data if selected
      const selectedPersona = selectedPersonaId 
        ? personas.find((p) => p.id === selectedPersonaId) 
        : undefined;
      
      // Build request
      const requestBody = {
        templateId: 'brochure-multi-section',
        sectionId: currentSection.id,
        sectionIndex: progress.currentSection,
        formData,
        previousContent: getPreviousContent(),
        applyBrandVoice,
        brandVoice: applyBrandVoice && activeProject?.brandVoice ? {
          brandName: activeProject.brandVoice.brandName,
          brandTone: activeProject.brandVoice.brandTone,
          approvedPhrases: activeProject.brandVoice.approvedPhrases,
          forbiddenWords: activeProject.brandVoice.forbiddenWords,
          brandValues: activeProject.brandVoice.brandValues,
          missionStatement: activeProject.brandVoice.missionStatement,
        } : undefined,
        persona: selectedPersona ? {
          name: selectedPersona.name,
          demographics: selectedPersona.demographics,
          psychographics: selectedPersona.psychographics,
          painPoints: selectedPersona.painPoints,
          languagePatterns: selectedPersona.languagePatterns,
          goals: selectedPersona.goals,
        } : undefined,
      };
      
      // Call API
      const response = await fetch('/api/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate section');
      }
      
      const data = await response.json();
      const generatedContent = formatGeneratedContent(data.generatedContent);
      
      // Create completed section data
      const completedSection: CompletedSection = {
        sectionId: currentSection.id,
        formData: { ...formData },
        generatedContent,
        completedAt: new Date().toISOString(),
        wasModified: false,
        contentHash: generateContentHash(generatedContent),
      };
      
      // Update progress
      const updatedProgress: TemplateProgress = {
        ...progress,
        completedSections: [...progress.completedSections, currentSection.id],
        sectionData: {
          ...progress.sectionData,
          [currentSection.id]: completedSection,
        },
        currentSection: progress.currentSection + 1,
        applyBrandVoice,
        selectedPersonaId: selectedPersonaId || undefined,
      };
      
      // Check if complete
      if (updatedProgress.currentSection >= BROCHURE_SECTIONS.length) {
        updatedProgress.isComplete = true;
        updatedProgress.completedAt = new Date().toISOString();
      }
      
      // Save progress and update document
      saveProgress(updatedProgress);
      updateDocumentContent(updatedProgress);
      
      // Move to next section or show completion
      if (updatedProgress.isComplete) {
        setViewState('completed');
      } else {
        initializeFormData(updatedProgress.currentSection, updatedProgress);
      }
      
    } catch (error) {
      logger.error('❌ Section generation error:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate section'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    progress, 
    currentSection, 
    editor, 
    activeProjectId, 
    activeDocumentId,
    validateForm, 
    formData, 
    selectedPersonaId, 
    personas, 
    applyBrandVoice, 
    activeProject,
    getPreviousContent,
    saveProgress,
    updateDocumentContent,
    initializeFormData
  ]);
  
  /**
   * Skip current section
   */
  const handleSkip = useCallback(() => {
    if (!progress) return;
    
    const nextSection = progress.currentSection + 1;
    
    const updatedProgress: TemplateProgress = {
      ...progress,
      currentSection: nextSection,
    };
    
    if (nextSection >= BROCHURE_SECTIONS.length) {
      updatedProgress.isComplete = true;
      updatedProgress.completedAt = new Date().toISOString();
      setViewState('completed');
    } else {
      initializeFormData(nextSection, updatedProgress);
    }
    
    saveProgress(updatedProgress);
  }, [progress, saveProgress, initializeFormData]);
  
  /**
   * Go to previous section
   */
  const handlePrevious = useCallback(() => {
    if (!progress || progress.currentSection === 0) return;
    
    const prevSection = progress.currentSection - 1;
    
    const updatedProgress: TemplateProgress = {
      ...progress,
      currentSection: prevSection,
      isComplete: false,
      completedAt: undefined,
    };
    
    saveProgress(updatedProgress);
    initializeFormData(prevSection, updatedProgress);
    setViewState('section-form');
  }, [progress, saveProgress, initializeFormData]);
  
  /**
   * Regenerate a specific section
   */
  const handleRegenerateSection = useCallback(async (sectionId: string) => {
    if (!progress) return;
    
    const sectionIndex = BROCHURE_SECTIONS.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;
    
    // Update progress to that section
    const updatedProgress: TemplateProgress = {
      ...progress,
      currentSection: sectionIndex,
      isComplete: false,
      completedAt: undefined,
    };
    
    saveProgress(updatedProgress);
    
    // Load the section's form data (will load saved data if available)
    initializeFormData(sectionIndex, updatedProgress);
    
    setViewState('section-form');
  }, [progress, saveProgress, initializeFormData]);
  
  /**
   * Exit template mode - closes UI but KEEPS progress for resume
   */
  const handleExitTemplate = useCallback(() => {
    const confirmed = window.confirm(
      'Close template? Your progress will be saved and you can resume later from the document.'
    );
    
    if (!confirmed) return;
    
    // Just close the template UI - progress stays in document
    logger.log('🚪 Closing template UI - progress saved for resume');
    
    // Clear selectedTemplateId so resume banner can show
    useWorkspaceStore.getState().setSelectedTemplateId(null);
    
    onClose();
  }, [onClose]);
  
  /**
   * Delete template progress completely
   */
  const handleDeleteProgress = useCallback(() => {
    if (!activeProjectId || !activeDocumentId) return;
    
    const confirmed = window.confirm(
      'Delete template progress? Your generated sections will be kept, but you won\'t be able to continue the template workflow.'
    );
    
    if (!confirmed) return;
    
    try {
      updateDocumentInStorage(activeProjectId, activeDocumentId, {
        templateProgress: undefined,
      });
      logger.log('🗑️ Template progress deleted');
    } catch (error) {
      logger.error('❌ Failed to delete template progress:', error);
    }
    
    onClose();
  }, [activeProjectId, activeDocumentId, onClose]);
  
  /**
   * Finish and close
   */
  const handleFinish = useCallback(() => {
    if (!progress) return;
    
    const updatedProgress: TemplateProgress = {
      ...progress,
      isComplete: true,
      completedAt: new Date().toISOString(),
    };
    
    saveProgress(updatedProgress);
    
    // Clear template state from store
    useWorkspaceStore.getState().setSelectedTemplateId(null);
    
    onClose();
  }, [progress, saveProgress, onClose]);

  // ═══════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Render section list view
   */
  const renderSectionList = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Template Sections</h3>
        <button
          onClick={() => setViewState('section-form')}
          className="text-sm text-apple-blue hover:underline"
        >
          Back to Form
        </button>
      </div>
      
      {BROCHURE_SECTIONS.map((section, index) => {
        const isCompleted = progress?.completedSections.includes(section.id);
        const isCurrent = index === progress?.currentSection;
        
        return (
          <div
            key={section.id}
            className={cn(
              'p-4 rounded-lg border transition-colors',
              isCompleted && 'bg-green-50 border-green-200',
              isCurrent && !isCompleted && 'bg-blue-50 border-blue-200',
              !isCompleted && !isCurrent && 'bg-gray-50 border-gray-200'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : isCurrent ? (
                  <Play className="w-5 h-5 text-apple-blue" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{section.name}</p>
                  <p className="text-xs text-gray-500">
                    {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'}
                  </p>
                </div>
              </div>
              
              {isCompleted && (
                <button
                  onClick={() => handleRegenerateSection(section.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium',
                    'border border-gray-300 text-gray-700 bg-white',
                    'hover:bg-gray-50 transition-colors duration-200',
                    'flex items-center gap-1'
                  )}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
  
  /**
   * Render completion view
   */
  const renderCompletion = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Brochure Complete!
      </h3>
      <p className="text-gray-600 mb-6">
        All sections have been generated. Your brochure is ready for review and editing.
      </p>
      
      <div className="space-y-3">
        <button
          onClick={handleFinish}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white',
            'bg-green-500 hover:bg-green-600 transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
          )}
        >
          Finish & Close
        </button>
        <button
          onClick={() => setViewState('section-list')}
          className={cn(
            'w-full py-2.5 px-4 rounded-lg font-medium text-sm',
            'border border-gray-300 text-gray-700 bg-white',
            'hover:bg-gray-50 transition-colors duration-200',
            'flex items-center justify-center gap-2'
          )}
        >
          <Eye className="w-4 h-4" />
          View Sections
        </button>
      </div>
    </div>
  );
  
  /**
   * Render section form
   */
  const renderSectionForm = () => {
    if (!currentSection || !progress) return null;
    
    return (
      <div className="space-y-6">
        {/* Section header */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-apple-blue flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Section {progress.currentSection + 1} of {BROCHURE_SECTIONS.length}: {currentSection.name}
              </h3>
              {currentSection.description && (
                <p className="text-sm text-blue-700 mt-1">
                  {currentSection.description}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Progress indicator */}
        <ProgressIndicator
          currentSection={progress.currentSection}
          totalSections={BROCHURE_SECTIONS.length}
          completedSections={progress.completedSections}
        />
        
        {/* Error display */}
        {generationError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Generation Failed</p>
              <p className="text-sm text-red-700">{generationError}</p>
            </div>
            <button onClick={() => setGenerationError(null)}>
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
        
        {/* Brand voice toggle (first section only) */}
        {progress.currentSection === 0 && hasBrandVoice && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={applyBrandVoice}
                onChange={(e) => setApplyBrandVoice(e.target.checked)}
                disabled={isGenerating}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-apple-blue focus:ring-apple-blue"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Apply Brand Voice
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Use {activeProject?.brandVoice?.brandName}'s guidelines for all sections
                </p>
              </div>
            </label>
          </div>
        )}
        
        {/* Persona selector (first section only) */}
        {progress.currentSection === 0 && personas.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">
              Target Persona (Optional)
            </label>
            <select
              value={selectedPersonaId || ''}
              onChange={(e) => setSelectedPersonaId(e.target.value || null)}
              disabled={isGenerating}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2'
              )}
            >
              <option value="">No specific persona</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Section form fields */}
        <div className="space-y-4">
          {currentSection.fields.map((field) => (
            <SectionFormField
              key={field.id}
              field={field}
              value={formData[field.id] || ''}
              onChange={(value) => handleFieldChange(field.id, value)}
              disabled={isGenerating}
              formData={formData}
            />
          ))}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-t-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{BROCHURE_MULTI_SECTION_TEMPLATE.name}</h2>
              <p className="text-sm text-purple-100 mt-0.5">{BROCHURE_MULTI_SECTION_TEMPLATE.description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logger.log('❌ Closing template - progress will be saved');
              // Clear selectedTemplateId so resume banner can show
              useWorkspaceStore.getState().setSelectedTemplateId(null);
              onClose();
            }}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close"
            title="Close template (progress saved)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Meta info */}
        <div className="flex items-center gap-3 text-sm">
          <span className="px-2 py-0.5 rounded border bg-white/10 border-white/20">
            {BROCHURE_MULTI_SECTION_TEMPLATE.complexity}
          </span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{BROCHURE_MULTI_SECTION_TEMPLATE.estimatedTime}</span>
          </div>
        </div>
      </div>
      
      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {/* Show message if no document is open */}
        {!activeDocumentId ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Document Selected
            </h3>
            <p className="text-sm text-gray-600 mb-4 max-w-xs mx-auto">
              Please create or select a document first to use the multi-section brochure template.
            </p>
            <button
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-sm',
                'border border-gray-300 text-gray-700 bg-white',
                'hover:bg-gray-50 transition-colors duration-200'
              )}
            >
              Close
            </button>
          </div>
        ) : !progress ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 mx-auto mb-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Loading template...</p>
          </div>
        ) : (
          <>
            {viewState === 'section-list' && renderSectionList()}
            {viewState === 'completed' && renderCompletion()}
            {viewState === 'section-form' && renderSectionForm()}
          </>
        )}
      </div>
      
      {/* Footer with action buttons */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 space-y-2">
        {viewState === 'completed' ? (
          <button
            onClick={handleFinish}
            className={cn(
              'w-full py-3 px-4 rounded-lg font-medium text-sm text-white',
              'bg-green-500 hover:bg-green-600',
              'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
              'flex items-center justify-center gap-2'
            )}
          >
            <CheckCircle className="w-5 h-5" />
            Finish & Close
          </button>
        ) : viewState === 'section-list' ? (
          <button
            onClick={() => setViewState('section-form')}
            className={cn(
              'w-full py-2 px-4 rounded-lg font-medium text-sm',
              'border border-gray-300 text-gray-700 bg-white',
              'hover:bg-gray-50 transition-colors duration-200'
            )}
          >
            Back to Current Section
          </button>
        ) : (
          <>
            <div className="flex gap-2">
              {progress && progress.currentSection > 0 && (
                <button
                  onClick={handlePrevious}
                  disabled={isGenerating}
                  className={cn(
                    'px-3 py-2.5 rounded-lg font-medium text-sm flex-shrink-0',
                    'border border-gray-300 text-gray-700 bg-white',
                    'hover:bg-gray-50 transition-colors duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center gap-1'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
              )}
              
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !editor || !activeProject}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg font-medium text-sm text-white',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
                  'flex items-center justify-center gap-2',
                  isGenerating && 'aiworx-gradient-animated cursor-wait',
                  !isGenerating && 'bg-purple-500 hover:bg-purple-600 transition-colors duration-200'
                )}
              >
                {isGenerating ? (
                  <AIWorxButtonLoader />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Section
                  </>
                )}
              </button>
              
              <button
                onClick={handleSkip}
                disabled={isGenerating}
                className={cn(
                  'px-3 py-2.5 rounded-lg font-medium text-sm flex-shrink-0',
                  'border border-gray-300 text-gray-700 bg-white',
                  'hover:bg-gray-50 transition-colors duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                title="Skip this section"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewState('section-list')}
                className="flex-1 text-xs text-gray-600 hover:text-gray-800 py-1.5 flex items-center justify-center gap-1"
              >
                <ListChecks className="w-3 h-3" />
                View All Sections
              </button>
              <button
                onClick={handleExitTemplate}
                className="flex-1 text-xs text-red-600 hover:text-red-700 py-1.5 flex items-center justify-center gap-1"
              >
                <X className="w-3 h-3" />
                Exit Template Mode
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
