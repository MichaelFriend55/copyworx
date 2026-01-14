/**
 * @file components/workspace/TemplateGenerator.tsx
 * @description Main template generation component with dynamic form
 * 
 * Features:
 * - Renders dynamic form based on template definition
 * - Brand voice integration toggle
 * - Persona selection dropdown
 * - Form validation (including "Other" custom fields)
 * - Loading states during generation
 * - Inserts generated copy into editor
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Clock,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { getProjectPersonas } from '@/lib/storage/persona-storage';
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import { TemplateFormField, OTHER_OPTION_VALUE } from './TemplateFormField';
import type { Editor } from '@tiptap/react';
import type { Template, TemplateFormData } from '@/lib/types/template';
import type { Project, Persona } from '@/lib/types/project';
import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface TemplateGeneratorProps {
  /** Selected template to generate from */
  template: Template;
  
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Active project for brand voice and personas */
  activeProject: Project | null;
  
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Get the suffix used for storing custom "Other" values
 */
const getOtherFieldId = (fieldId: string): string => `${fieldId}_other`;

/**
 * TemplateGenerator Component
 * Dynamic form for generating copy from templates
 */
export function TemplateGenerator({
  template,
  editor,
  activeProject,
  onCancel,
}: TemplateGeneratorProps) {
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
  const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[template.icon] || Sparkles;
  
  // Initialize form data with empty strings
  useEffect(() => {
    const initialData: TemplateFormData = {};
    template.fields.forEach((field) => {
      initialData[field.id] = '';
      // Also initialize the _other field for select fields that have "Other" option
      if (field.type === 'select' && field.options?.includes(OTHER_OPTION_VALUE)) {
        initialData[getOtherFieldId(field.id)] = '';
      }
    });
    setFormData(initialData);
  }, [template]);
  
  /**
   * Validate form fields
   * @returns true if valid, false if errors
   */
  const validateForm = (): boolean => {
    const newErrors: { [fieldId: string]: string } = {};
    
    template.fields.forEach((field) => {
      const value = formData[field.id] || '';
      const otherValue = formData[getOtherFieldId(field.id)] || '';
      
      // Check required fields
      if (field.required && value.trim().length === 0) {
        newErrors[field.id] = 'This field is required';
      }
      
      // Check max length
      if (field.maxLength && value.length > field.maxLength) {
        newErrors[field.id] = `Exceeds maximum length of ${field.maxLength} characters`;
      }
      
      // Check select has value
      if (field.type === 'select' && field.required && !value) {
        newErrors[field.id] = 'Please select an option';
      }
      
      // Check "Other" custom value when "Other (specify)" is selected
      if (
        field.type === 'select' &&
        value === OTHER_OPTION_VALUE &&
        field.options?.includes(OTHER_OPTION_VALUE)
      ) {
        if (field.required && otherValue.trim().length === 0) {
          newErrors[getOtherFieldId(field.id)] = 'Please specify your custom option';
        }
        if (otherValue.length > 100) {
          newErrors[getOtherFieldId(field.id)] = 'Custom option must be 100 characters or less';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  /**
   * Resolve form data, replacing "Other (specify)" with actual custom values
   * This is what gets sent to the AI
   */
  const resolveFormData = (): TemplateFormData => {
    const resolved: TemplateFormData = {};
    
    template.fields.forEach((field) => {
      const value = formData[field.id] || '';
      const otherValue = formData[getOtherFieldId(field.id)] || '';
      
      // If "Other (specify)" is selected, use the custom value instead
      if (
        field.type === 'select' &&
        value === OTHER_OPTION_VALUE &&
        otherValue.trim().length > 0
      ) {
        resolved[field.id] = otherValue.trim();
      } else {
        resolved[field.id] = value;
      }
    });
    
    return resolved;
  };
  
  /**
   * Handle field change
   * Performance: Memoized to prevent re-creating on every render
   */
  const handleFieldChange = useCallback((fieldId: string, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    
    // Clear error for this field when typing
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  }, []);
  
  /**
   * Handle "Other" custom value change
   */
  const handleOtherChange = useCallback((fieldId: string, value: string): void => {
    const otherFieldId = getOtherFieldId(fieldId);
    setFormData((prev) => ({
      ...prev,
      [otherFieldId]: value,
    }));
    
    // Clear error for this "Other" field when typing
    setErrors((prev) => {
      if (!prev[otherFieldId]) return prev;
      const newErrors = { ...prev };
      delete newErrors[otherFieldId];
      return newErrors;
    });
  }, []);
  
  /**
   * Handle form submission
   */
  const handleGenerate = async () => {
    // Validate form
    if (!validateForm()) {
      console.warn('⚠️ Form validation failed');
      return;
    }
    
    // Check editor is available
    if (!editor) {
      setGenerationError('Editor not available. Please try again.');
      return;
    }
    
    // Set loading state
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(false);
    
    try {
      // Get selected persona if any
      const selectedPersona = selectedPersonaId
        ? personas.find((p) => p.id === selectedPersonaId)
        : null;
      
      // Resolve form data (replace "Other" with custom values)
      const resolvedFormData = resolveFormData();
      
      // Build request body
      const requestBody = {
        templateId: template.id,
        formData: resolvedFormData,
        applyBrandVoice: applyBrandVoice && hasBrandVoice,
        brandVoice: applyBrandVoice && activeProject?.brandVoice ? activeProject.brandVoice : undefined,
        personaId: selectedPersonaId || undefined,
        persona: selectedPersona || undefined,
      };
      
      console.log('🚀 Generating template:', {
        templateId: template.id,
        applyBrandVoice,
        personaId: selectedPersonaId,
        resolvedFormData,
      });
      
      // Call API
      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'API request failed',
          details: `Status: ${response.status}`,
        }));
        
        throw new Error(errorData.details || errorData.error || 'Failed to generate copy');
      }
      
      // Parse response
      const data = await response.json();
      
      if (!data.generatedCopy) {
        throw new Error('No generated copy received from API');
      }
      
      // Check if editor has content - prompt for confirmation
      const currentContent = editor.getText().trim();
      if (currentContent.length > 0) {
        const confirmed = window.confirm(
          'The editor has existing content. Replace it with the generated copy?'
        );
        
        if (!confirmed) {
          setIsGenerating(false);
          return;
        }
      }
      
      // Format HTML content from Claude (use email processor for email templates)
      const isEmailTemplate = template.id.includes('email') || template.category === 'email';
      const formattedContent = formatGeneratedContent(data.generatedCopy, isEmailTemplate);
      
      console.log('📝 Formatted content for editor:', {
        templateType: isEmailTemplate ? 'email' : 'regular',
        originalLength: data.generatedCopy.length,
        formattedLength: formattedContent.length,
      });
      
      // Insert formatted copy into editor
      editor
        .chain()
        .focus()
        .clearContent()
        .insertContent(formattedContent)
        .run();
      
      // Update document in store with formatted content
      const { updateDocumentContent } = useWorkspaceStore.getState();
      updateDocumentContent(formattedContent);
      
      console.log('✅ Template generation successful');
      
      // Show success state
      setGenerationSuccess(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({});
        setGenerationSuccess(false);
        
        // Re-initialize form
        const initialData: TemplateFormData = {};
        template.fields.forEach((field) => {
          initialData[field.id] = '';
          if (field.type === 'select' && field.options?.includes(OTHER_OPTION_VALUE)) {
            initialData[getOtherFieldId(field.id)] = '';
          }
        });
        setFormData(initialData);
      }, 2000);
      
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'An unexpected error occurred';
      
      setGenerationError(errorMessage);
      console.error('❌ Template generation error:', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Get complexity badge color
   */
  const getComplexityColor = () => {
    switch (template.complexity) {
      case 'Beginner':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Intermediate':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Advanced':
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{template.name}</h2>
              <p className="text-sm text-blue-100 mt-0.5">{template.description}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Meta info */}
        <div className="flex items-center gap-3 text-sm">
          <span className={cn('px-2 py-0.5 rounded border bg-white/10 border-white/20')}>
            {template.complexity}
          </span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{template.estimatedTime}</span>
          </div>
        </div>
      </div>
      
      {/* Form content - scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Brand Voice Toggle */}
        {hasBrandVoice && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1">
              <label
                htmlFor="apply-brand-voice"
                className="text-sm font-medium text-blue-900 cursor-pointer"
              >
                Apply Brand Voice
              </label>
              <p className="text-xs text-blue-700 mt-0.5">
                Use {activeProject?.brandVoice?.brandName} brand guidelines
              </p>
            </div>
            <input
              id="apply-brand-voice"
              type="checkbox"
              checked={applyBrandVoice}
              onChange={(e) => setApplyBrandVoice(e.target.checked)}
              disabled={isGenerating}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        )}
        
        {/* No Brand Voice Message */}
        {!hasBrandVoice && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              Set up brand voice in your project to apply it to generated copy
            </p>
          </div>
        )}
        
        {/* Persona Selection */}
        {personas.length > 0 && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="persona-select"
              className="text-sm font-medium text-apple-text-dark"
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
                'text-sm text-apple-text-dark bg-white',
                'border-apple-gray-light hover:border-apple-gray',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'disabled:bg-gray-50 disabled:cursor-not-allowed'
              )}
            >
              <option value="">No persona selected</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-apple-text-light">
              Generate copy specifically for this persona
            </p>
          </div>
        )}
        
        {/* No Personas Message */}
        {personas.length === 0 && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              Create personas in your project to target specific audiences
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
              onOtherChange={(value) => handleOtherChange(field.id, value)}
              error={errors[field.id]}
              otherError={errors[getOtherFieldId(field.id)]}
              disabled={isGenerating}
            />
          ))}
        </div>
        
        {/* Generation Error */}
        {generationError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Generation Failed</p>
              <p className="text-xs text-red-700 mt-1">{generationError}</p>
            </div>
            <button
              onClick={() => setGenerationError(null)}
              className="text-red-600 hover:text-red-800"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Success Message */}
        {generationSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-900 font-medium">
              Copy generated and inserted into editor!
            </p>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || generationSuccess}
          className={cn(
            'w-full py-3 px-4 rounded-lg font-medium text-sm',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'flex items-center justify-center gap-2',
            // Keep blue gradient during loading
            'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow',
            'disabled:from-blue-500 disabled:to-blue-600 disabled:text-white disabled:cursor-wait',
            // Green background only for success state
            generationSuccess && 'bg-green-500 from-green-500 to-green-500'
          )}
        >
          {isGenerating ? (
            <AIWorxButtonLoader />
          ) : generationSuccess ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Generated!
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate with AI
            </>
          )}
        </button>
        
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className={cn(
            'w-full py-2 px-4 rounded-lg font-medium text-sm',
            'border border-gray-300 text-gray-700 bg-white',
            'hover:bg-gray-50 transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
