/**
 * @file components/workspace/TemplatesModal.tsx
 * @description AI@Worx Templates Modal - Browse and select copywriting templates
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Mail,
  Megaphone,
  Layout,
  MessageSquare,
  FileText,
  Globe,
  CheckCircle,
  Clock,
  FileEdit,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIActions, useTemplateActions } from '@/lib/stores/workspaceStore';
import { ALL_TEMPLATES } from '@/lib/data/templates';
import type { Template, TemplateCategory as ImportedTemplateCategory } from '@/lib/types/template';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

type ModalTemplateCategory = 'all' | ImportedTemplateCategory;

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// CATEGORY CONFIGURATION
// ═══════════════════════════════════════════════════════════

const CATEGORIES: { id: ModalTemplateCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'advertising', label: 'Ads', icon: Megaphone },
  { id: 'landing-page', label: 'Landing', icon: Layout },
  { id: 'social', label: 'Social', icon: MessageSquare },
  { id: 'collateral', label: 'Collateral', icon: FileText },
  { id: 'website', label: 'Website', icon: Globe },
];

// ═══════════════════════════════════════════════════════════
// DIFFICULTY COLORS
// ═══════════════════════════════════════════════════════════

const DIFFICULTY_COLORS: Record<Template['complexity'], string> = {
  Beginner: 'bg-green-100 text-green-800 border-green-200',
  Intermediate: 'bg-blue-100 text-blue-800 border-blue-200',
  Advanced: 'bg-purple-100 text-purple-800 border-purple-200',
};

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function TemplatesModal({ isOpen, onClose }: TemplatesModalProps) {
  const [activeCategory, setActiveCategory] = useState<ModalTemplateCategory>('all');
  
  // Optimized action selectors - only re-render when actions change (never)
  const { setRightSidebarOpen, setActiveTool } = useUIActions();
  const { 
    setSelectedTemplateId, 
    setIsGeneratingTemplate,
    clearToneShiftResult,
    clearExpandResult,
    clearShortenResult,
    clearRewriteChannelResult,
    clearBrandAlignmentResult,
  } = useTemplateActions();

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filter templates by category
  const filteredTemplates =
    activeCategory === 'all'
      ? ALL_TEMPLATES
      : ALL_TEMPLATES.filter((template) => template.category === activeCategory);

  // Handle template selection
  const handleSelectTemplate = (template: Template): void => {
    console.log('🎨 Selected template:', template.id, template.name);
    
    // Clear all other tool states first
    console.log('🧹 Clearing all tool states before opening template');
    clearToneShiftResult();
    clearExpandResult();
    clearShortenResult();
    clearRewriteChannelResult();
    clearBrandAlignmentResult();
    setIsGeneratingTemplate(false);
    
    // Set selected template ID in store
    setSelectedTemplateId(template.id);
    
    // Clear active tool (template generator is special - not a tool in the sidebar)
    setActiveTool(null);
    
    // Open right sidebar to show template form
    setRightSidebarOpen(true);
    
    // Close modal
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[90vh] overflow-hidden pointer-events-auto transform transition-all duration-300 ease-out"
          role="dialog"
          aria-modal="true"
          aria-labelledby="templates-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-6 py-5 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-6 h-6 text-[#007AFF]" />
                  <h2
                    id="templates-modal-title"
                    className="text-xl font-semibold text-[#1d1d1f]"
                  >
                    AI@Worx™ Templates
                  </h2>
                </div>
                <p className="text-sm text-[#86868b]">
                  Select a template to create high-quality content with AI assistance
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-6 py-4 border-b border-gray-200 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {CATEGORIES.map((category) => {
                const CategoryIcon = category.icon;
                const isActive = activeCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2',
                      isActive
                        ? 'bg-[#007AFF] text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <CategoryIcon className="w-4 h-4" />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Grid */}
          <div className="p-6 pb-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16">
                <FileEdit className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No templates in this category yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => {
                    // Get icon component dynamically from Lucide
                    const TemplateIcon = (LucideIcons as unknown as Record<string, LucideIcon>)[template.icon] || FileText;

                    return (
                      <div
                        key={template.id}
                        className={cn(
                          'group relative bg-white border border-[#d2d2d7] rounded-xl p-5',
                          'transition-all duration-200 hover:shadow-lg hover:border-[#007AFF]',
                          'flex flex-col'
                        )}
                      >
                        {/* Category Badge */}
                        <div className="absolute top-4 right-4">
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full capitalize">
                            {template.category.replace('-', ' ')}
                          </span>
                        </div>

                        {/* Icon */}
                        <div className="mb-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                            <TemplateIcon className="w-6 h-6 text-[#007AFF]" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 mb-4">
                          <h3 className="text-base font-semibold text-[#1d1d1f] mb-2">
                            {template.name}
                          </h3>
                          <p className="text-sm text-[#86868b] leading-relaxed">
                            {template.description}
                          </p>
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center gap-3 mb-4 text-xs">
                          <span
                            className={cn(
                              'px-2 py-1 rounded border font-medium',
                              DIFFICULTY_COLORS[template.complexity]
                            )}
                          >
                            {template.complexity}
                          </span>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{template.estimatedTime}</span>
                          </div>
                        </div>

                        {/* Select Button */}
                        <button
                          onClick={() => handleSelectTemplate(template)}
                          className={cn(
                            'w-full py-2.5 px-4 rounded-lg font-medium text-sm',
                            'bg-[#007AFF] text-white',
                            'hover:bg-[#0071e3] transition-colors duration-200',
                            'focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2',
                            'flex items-center justify-center gap-2'
                          )}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Select Template</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Complexity Legend */}
                <div className="mt-8 pt-4 border-t border-gray-200">
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Complexity Guide:
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Beginner */}
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200 flex-shrink-0">
                          Beginner
                        </span>
                        <div className="text-gray-600">
                          <div className="font-medium text-gray-700">5-10 min</div>
                          <div className="text-gray-500">3-5 fields, basic info</div>
                        </div>
                      </div>
                      
                      {/* Intermediate */}
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 flex-shrink-0">
                          Intermediate
                        </span>
                        <div className="text-gray-600">
                          <div className="font-medium text-gray-700">15-20 min</div>
                          <div className="text-gray-500">5-8 fields, strategy needed</div>
                        </div>
                      </div>
                      
                      {/* Advanced */}
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 flex-shrink-0">
                          Advanced
                        </span>
                        <div className="text-gray-600">
                          <div className="font-medium text-gray-700">20-30 min</div>
                          <div className="text-gray-500">8-12+ fields, comprehensive</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
