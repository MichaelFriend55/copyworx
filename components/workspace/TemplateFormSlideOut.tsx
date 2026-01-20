/**
 * @file components/workspace/TemplateFormSlideOut.tsx
 * @description Template form slide-out panel - Opens from right when template is selected
 * 
 * Features:
 * - 550px wide right slide-out panel
 * - Dynamic form fields based on selected template
 * - Brand voice integration
 * - Persona selection
 * - Form validation
 * - Generates copy and inserts into editor
 * - Can be open simultaneously with templates browser (left)
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { Button } from '@/components/ui/button';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { TemplateFormField, OTHER_OPTION_VALUE } from './TemplateFormField';
import { cn } from '@/lib/utils';
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
import { updateDocument as updateDocumentInStorage } from '@/lib/storage/document-storage';
import { getProjectPersonas } from '@/lib/storage/persona-storage';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { useSlideOutActions } from '@/lib/stores/slideOutStore';
import type { Template, TemplateFormData } from '@/lib/types/template';
import type { Project, Persona } from '@/lib/types/project';
import type { Editor } from '@tiptap/react';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Unique ID for the template form slide-out panel */
export const TEMPLATE_FORM_PANEL_ID = 'template-form';

/**
 * Get the suffix used for storing custom "Other" values
 */
const getOtherFieldId = (fieldId: string): string => `${fieldId}_other`;

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface TemplateFormSlideOutProps {
  /** Whether the slide-out is open */
  isOpen: boolean;
  
  /** Callback when slide-out should close */
  onClose: () => void;
  
  /** Selected template to generate from */
  template: Template | null;
  
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Active project for brand voice and personas */
  activeProject: Project | null;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function TemplateFormSlideOut({
  isOpen,
  onClose,
  template,
  editor,
  activeProject,
}: TemplateFormSlideOutProps) {
  // Store actions
  const { closeSlideOut } = useSlideOutActions();
  const activeDocumentId = useWorkspaceStore((state) => state.activeDocumentId);
  
  // Form state
  const [formData, setFormData] = useState<TemplateFormData>({});
  const [errors, setErrors] = useState<{ [fieldId: string]: string }>({});
  
  // Settings state
  const [applyBrandVoice, setApplyBrandVoice] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  
  // Get personas for current project
  const personas = activeProject ? getProjectPersonas(activeProject.id) : [];
  const hasBrandVoice = activeProject?.brandVoice?.brandName ? true : false;
  
  // Get the icon component from lucide-react
  const IconComponent = template 
    ? ((LucideIcons as unknown as Record<string, LucideIcon>)[template.icon] || Sparkles)
    : Sparkles;
  
  // Initialize form data when template changes
  useEffect(() => {
    if (!template) return;
    
    const initialData: TemplateFormData = {};
    template.fields.forEach((field) => {
      initialData[field.id] = '';
      // Also initialize the _other field for select fields that have "Other" option
      if (field.type === 'select' && field.options?.includes(OTHER_OPTION_VALUE)) {
        initialData[getOtherFieldId(field.id)] = '';
      }
    });
    setFormData(initialData);
    setErrors({});
    setGenerationError(null);
    setGenerationSuccess(false);
  }, [template]);
  
  /**
   * Validate form fields
   */
  const validateForm = useCallback((): boolean => {
    if (!template) return false;
    
    const newErrors: { [fieldId: string]: string } = {};
    
    template.fields.forEach((field) => {
      const value = formData[field.id] || '';
      
      // Required field check
      if (field.required && !value.trim()) {
        newErrors[field.id] = `${field.label} is required`;
        return;
      }
      
      // Check if "Other" is selected but custom value not provided
      if (
        field.type === 'select' &&
        value === OTHER_OPTION_VALUE &&
        field.options?.includes(OTHER_OPTION_VALUE)
      ) {
        const otherValue = formData[getOtherFieldId(field.id)] || '';
        if (!otherValue.trim()) {
          newErrors[getOtherFieldId(field.id)] = 'Please specify your custom option';
          return;
        }
      }
      
      // Max length check
      if (field.maxLength && value.length > field.maxLength) {
        newErrors[field.id] = `Maximum ${field.maxLength} characters allowed`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [template, formData]);
  
  /**
   * Build the AI prompt from template and form data
   */
  const buildPrompt = useCallback((): string => {
    if (!template) return '';
    
    let prompt = template.systemPrompt;
    
    // Replace field placeholders
    template.fields.forEach((field) => {
      let value = formData[field.id] || '';
      
      // If "Other" is selected, use the custom value instead
      if (value === OTHER_OPTION_VALUE) {
        value = formData[getOtherFieldId(field.id)] || value;
      }
      
      prompt = prompt.replace(new RegExp(`\\{${field.id}\\}`, 'g'), value);
    });
    
    // Brand voice instructions
    if (applyBrandVoice && activeProject?.brandVoice) {
      const { brandName, brandTone, brandValues } = activeProject.brandVoice;
      const brandInstructions = `
BRAND VOICE GUIDELINES:
- Brand: ${brandName}
- Tone: ${brandTone}
- Core Values: ${brandValues.join(', ')}

Apply this brand voice throughout the copy. Maintain consistency with the brand's tone and values.
`;
      prompt = prompt.replace('{brandVoiceInstructions}', brandInstructions);
    } else {
      prompt = prompt.replace('{brandVoiceInstructions}', '');
    }
    
    // Persona instructions
    if (selectedPersonaId) {
      const persona = personas.find((p) => p.id === selectedPersonaId);
      if (persona) {
        const personaInstructions = `
PERSONA TARGET:
Write specifically for this persona:
- Name: ${persona.name}
- Demographics: ${persona.demographics}
- Goals: ${persona.goals}
- Pain Points: ${persona.painPoints}
- Psychographics: ${persona.psychographics}

Tailor the copy to resonate with this specific persona's needs and characteristics.
`;
        prompt = prompt.replace('{personaInstructions}', personaInstructions);
      } else {
        prompt = prompt.replace('{personaInstructions}', '');
      }
    } else {
      prompt = prompt.replace('{personaInstructions}', '');
    }
    
    return prompt;
  }, [template, formData, applyBrandVoice, selectedPersonaId, activeProject, personas]);
  
  /**
   * Handle form field change
   */
  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error for this field
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);
  
  /**
   * Handle template generation
   */
  const handleGenerate = useCallback(async () => {
    if (!template || !editor || !activeDocumentId || !activeProject) return;
    
    // Validate form
    if (!validateForm()) {
      setGenerationError('Please fill in all required fields');
      return;
    }
    
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(false);
    
    try {
      const prompt = buildPrompt();
      
      console.log('🎨 Generating template copy:', template.name);
      console.log('📝 Prompt length:', prompt.length);
      
      // Call Claude API
      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          prompt,
          formData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate copy');
      }
      
      const data = await response.json();
      const generatedCopy = data.generatedCopy;
      
      console.log('✅ Generated copy length:', generatedCopy.length);
      
      // Format the generated content
      const formattedContent = formatGeneratedContent(generatedCopy);
      
      // Insert into editor
      editor.commands.setContent(formattedContent);
      
      // Update document in storage
      try {
        updateDocumentInStorage(activeProject.id, activeDocumentId, {
          content: formattedContent,
        });
        console.log('💾 Document saved with generated content');
      } catch (storageError) {
        console.error('⚠️ Failed to save document:', storageError);
        // Continue anyway - content is in editor
      }
      
      // Success!
      setGenerationSuccess(true);
      
      // Close both slide-outs after 1.5 seconds
      setTimeout(() => {
        closeSlideOut(TEMPLATE_FORM_PANEL_ID);
        // Also close templates browser if open
        closeSlideOut('templates-browser');
        
        // Clear selected template
        useWorkspaceStore.getState().setSelectedTemplateId(null);
      }, 1500);
      
    } catch (error) {
      console.error('❌ Template generation error:', error);
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate copy'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [template, editor, activeDocumentId, validateForm, buildPrompt, formData, closeSlideOut]);
  
  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);
  
  // If no template, don't render
  if (!template) return null;
  
  // Panel footer with action buttons
  const panelFooter = (
    <div className="flex gap-3">
      <Button
        variant="outline"
        size="default"
        onClick={handleCancel}
        disabled={isGenerating}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        variant={generationSuccess ? 'default' : isGenerating ? 'default' : 'brand'}
        size="default"
        onClick={handleGenerate}
        disabled={isGenerating || !editor || !activeDocumentId || generationSuccess}
        className={cn(
          'flex-1',
          // Animated gradient when generating (override background)
          isGenerating && 'aiworx-gradient-animated',
          // Green when success
          generationSuccess && 'bg-green-500 hover:bg-green-600'
        )}
      >
        {isGenerating ? (
          <AIWorxButtonLoader />
        ) : generationSuccess ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Generated!
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Copy
          </>
        )}
      </Button>
    </div>
  );
  
  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      title={template.name}
      subtitle={template.description}
      footer={panelFooter}
    >
      <div className="space-y-6">
        {/* Template info */}
        <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-apple-blue flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                {template.complexity}
              </span>
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Clock className="w-3 h-3" />
                <span>{template.estimatedTime}</span>
              </div>
            </div>
            <p className="text-sm text-blue-700">
              Fill out the form below to generate professional copy
            </p>
          </div>
        </div>

        {/* Generation error */}
        {generationError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">
                Generation Failed
              </p>
              <p className="text-sm text-red-700">{generationError}</p>
            </div>
          </div>
        )}

        {/* Generation success */}
        {generationSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 mb-1">
                Copy Generated Successfully!
              </p>
              <p className="text-sm text-green-700">
                The generated content has been inserted into your document
              </p>
            </div>
          </div>
        )}

        {/* Brand voice toggle */}
        {hasBrandVoice && (
          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={applyBrandVoice}
                onChange={(e) => setApplyBrandVoice(e.target.checked)}
                disabled={isGenerating}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-apple-blue focus:ring-apple-blue disabled:opacity-50"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 group-hover:text-apple-blue transition-colors">
                  Apply Brand Voice
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Generate copy using {activeProject?.brandVoice?.brandName}'s brand guidelines
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Persona selector */}
        {personas.length > 0 && (
          <div className="space-y-2">
            <label
              htmlFor="persona-select"
              className="text-sm font-medium text-gray-900"
            >
              Target Persona (Optional)
            </label>
            <select
              id="persona-select"
              value={selectedPersonaId || ''}
              onChange={(e) => setSelectedPersonaId(e.target.value || null)}
              disabled={isGenerating}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'disabled:bg-gray-50 disabled:opacity-50'
              )}
            >
              <option value="">No specific persona</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Tailor the copy to a specific audience persona
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Dynamic form fields */}
        <div className="space-y-4">
          {template.fields.map((field) => (
            <TemplateFormField
              key={field.id}
              field={field}
              value={formData[field.id] || ''}
              onChange={(value) => handleFieldChange(field.id, value)}
              otherValue={formData[getOtherFieldId(field.id)] || ''}
              onOtherChange={(value) => handleFieldChange(getOtherFieldId(field.id), value)}
              error={errors[field.id]}
              otherError={errors[getOtherFieldId(field.id)]}
              disabled={isGenerating || generationSuccess}
            />
          ))}
        </div>

        {/* No document warning */}
        {!activeDocumentId && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Please create or open a document to generate template content.
            </p>
          </div>
        )}
      </div>
    </SlideOutPanel>
  );
}
