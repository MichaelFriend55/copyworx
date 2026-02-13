/**
 * @file components/workspace/TemplatesSlideOut.tsx
 * @description AI@Worx Templates slide-out panel - Browse templates from left sidebar
 * 
 * Features:
 * - 450px wide left slide-out panel
 * - Search templates by name/description
 * - Collapsible category sections
 * - Template cards with name, description, icon
 * - Clicking a template opens the template form in right slide-out
 * - Can have both browser (left) and form (right) open simultaneously
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Mail,
  Megaphone,
  Target,
  MessageSquare,
  FileText,
  Globe,
  Clock,
  Sparkles,
  Share2,
  Info,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ALL_TEMPLATES, getCategoriesSorted } from '@/lib/data/templates';
import { createDocument } from '@/lib/storage/unified-storage';
import type { Template, TemplateCategory, TemplateCategoryConfig } from '@/lib/types/template';
import { useWorkspaceStore, useUIActions, useTemplateActions } from '@/lib/stores/workspaceStore';
import { useSlideOutActions as useGlobalSlideOutActions } from '@/lib/stores/slideOutStore';
import { TEMPLATE_FORM_PANEL_ID } from './TemplateFormSlideOut';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Unique ID for the templates slide-out panel */
export const TEMPLATES_PANEL_ID = 'templates-browser';

/**
 * Icon mapping from category icon names to Lucide components
 */
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Target,
  Mail,
  Globe,
  Megaphone,
  Share2,
  FileText,
};

/**
 * Icon mapping from template icon names to Lucide icons
 */
const ICON_MAP: Record<string, LucideIcon> = {
  DollarSign: LucideIcons.DollarSign,
  Target,
  Mail,
  Megaphone,
  MessageSquare,
  FileText,
  Globe,
  Compass: LucideIcons.Compass,
  LayoutTemplate: LucideIcons.LayoutTemplate,
  Newspaper: LucideIcons.Newspaper,
  Radio: LucideIcons.Radio,
  BookOpen: LucideIcons.BookOpen,
  Share2,
};

/**
 * Category help text for tooltips
 * Explains the distinction between similar categories
 */
const CATEGORY_HELP: Record<TemplateCategory, string> = {
  strategy: 'Foundation messaging that feeds all other categories',
  email: 'One-to-one or list-based email communication',
  website: 'Lives on your domain (sales pages, product pages)',
  advertising: 'You\'re paying to show this (Facebook Ads, Google Ads)',
  social: 'Organic posts you publish for free (Instagram, LinkedIn)',
  collateral: 'Downloadable/printable materials (case studies, one-pagers)',
};

/**
 * Difficulty badge colors
 */
const DIFFICULTY_COLORS: Record<Template['complexity'], string> = {
  Beginner: 'bg-green-100 text-green-800 border-green-200',
  Intermediate: 'bg-blue-100 text-blue-800 border-blue-200',
  Advanced: 'bg-purple-100 text-purple-800 border-purple-200',
};

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface TemplatesSlideOutProps {
  /** Whether the slide-out is open */
  isOpen: boolean;
  
  /** Callback when slide-out should close */
  onClose: () => void;
}

interface TemplateCategoryGroupProps {
  /** Category configuration from TEMPLATE_CATEGORIES */
  category: TemplateCategoryConfig;

  /** Resolved Lucide icon component for the category */
  icon: LucideIcon;
  
  /** Templates in this category */
  templates: Template[];
  
  /** Whether section is expanded */
  isExpanded: boolean;
  
  /** Callback to toggle expansion */
  onToggle: () => void;
  
  /** Callback when template is selected */
  onSelectTemplate: (template: Template) => void;
  
  /** Currently selected template ID */
  selectedTemplateId: string | null;
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

/**
 * Template Card Component
 */
function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const IconComponent = ICON_MAP[template.icon] || Sparkles;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all duration-200',
        'hover:shadow-md hover:border-apple-blue/50',
        'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
        'group',
        isSelected
          ? 'bg-apple-blue/5 border-apple-blue shadow-sm'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            'transition-colors duration-200',
            isSelected
              ? 'bg-apple-blue text-white'
              : 'bg-gray-100 text-gray-600 group-hover:bg-apple-blue group-hover:text-white'
          )}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4
              className={cn(
                'font-semibold text-sm',
                isSelected ? 'text-apple-blue' : 'text-gray-900'
              )}
            >
              {template.name}
            </h4>
            <span
              className={cn(
                'flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full border',
                DIFFICULTY_COLORS[template.complexity]
              )}
            >
              {template.complexity}
            </span>
          </div>

          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {template.description}
          </p>

          <div className="flex items-center gap-1 text-[11px] text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{template.estimatedTime}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Template Category Group Component
 * 
 * Renders a collapsible category section with:
 * - Icon + name header with template count badge
 * - Tooltip description on hover
 * - Premium accent for Strategy category
 * - Expandable template card list
 */
function TemplateCategoryGroup({
  category,
  icon: GroupIcon,
  templates,
  isExpanded,
  onToggle,
  onSelectTemplate,
  selectedTemplateId,
}: TemplateCategoryGroupProps) {
  if (templates.length === 0) return null;

  const isPremium = category.isPremium === true;
  const helpText = CATEGORY_HELP[category.id];

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <button
        onClick={onToggle}
        title={helpText}
        className={cn(
          'w-full flex items-center justify-between p-2.5 rounded-lg',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          isPremium
            ? 'hover:bg-amber-50 border border-transparent hover:border-amber-200'
            : 'hover:bg-gray-100'
        )}
      >
        <div className="flex items-center gap-2.5">
          <GroupIcon
            className={cn(
              'w-4.5 h-4.5',
              isPremium ? 'text-amber-500' : 'text-ink-500'
            )}
          />
          <span
            className={cn(
              'font-semibold text-sm uppercase tracking-wide',
              isPremium ? 'text-amber-700' : 'text-ink-600'
            )}
          >
            {category.name}
          </span>
          {/* Template count badge */}
          <span
            className={cn(
              'px-2 py-0.5 text-xs rounded-full font-medium',
              isPremium
                ? 'bg-amber-100 text-amber-700'
                : 'bg-ink-100 text-ink-600'
            )}
          >
            {templates.length}
          </span>
          {/* Premium badge */}
          {isPremium && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded">
              Pro
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Info icon for tooltip */}
          <span title={helpText}>
            <Info className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 transition-colors" />
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Category description (shown when expanded) */}
      {isExpanded && (
        <p className="text-[11px] text-gray-400 px-2.5 -mt-1 mb-1 italic">
          {category.description}
        </p>
      )}

      {/* Templates List */}
      {isExpanded && (
        <div className="space-y-2 pl-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              onSelect={() => onSelectTemplate(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function TemplatesSlideOut({
  isOpen,
  onClose,
}: TemplatesSlideOutProps) {
  // Store actions
  const { setActiveTool, setRightSidebarOpen } = useUIActions();
  const { 
    setSelectedTemplateId, 
    setIsGeneratingTemplate,
    clearToneShiftResult,
    clearExpandResult,
    clearShortenResult,
    clearRewriteChannelResult,
    clearBrandAlignmentResult,
  } = useTemplateActions();
  const { openSlideOut } = useGlobalSlideOutActions();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set() // Start with all categories closed - clean, predictable UX
  );
  const [selectedTemplateId, setLocalSelectedTemplateId] = useState<string | null>(null);

  // Reset accordion state when panel opens - ensures clean state every time
  useEffect(() => {
    if (isOpen) {
      setExpandedGroups(new Set()); // Close all accordions when opening templates panel
      setSearchQuery(''); // Clear search too
    }
  }, [isOpen]);

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return ALL_TEMPLATES;
    
    const query = searchQuery.toLowerCase();
    return ALL_TEMPLATES.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Get sorted category configs and group templates by category
  const sortedCategories = useMemo(() => getCategoriesSorted(), []);

  const groupedTemplates = useMemo(() => {
    return sortedCategories.map((cat) => ({
      category: cat,
      icon: CATEGORY_ICON_MAP[cat.icon] || Sparkles,
      templates: filteredTemplates.filter((t) => t.category === cat.id),
    }));
  }, [filteredTemplates, sortedCategories]);

  // Toggle category expansion - TRUE ACCORDION BEHAVIOR
  // Opening one category closes all others (only one can be open at a time)
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      // If clicking the currently open group, close it
      if (prev.has(groupId)) {
        return new Set(); // Close all
      }
      // Otherwise, open this group and close all others
      return new Set([groupId]); // Only this group is open
    });
  }, []);

  // Handle template selection
  const handleSelectTemplate = useCallback(
    async (template: Template) => {
      logger.log('🎨 Selected template:', template.id, template.name);
      
      // Set local selected state for visual feedback
      setLocalSelectedTemplateId(template.id);
      
      // Clear all other tool states first
      logger.log('🧹 Clearing all tool states before opening template');
      clearToneShiftResult();
      clearExpandResult();
      clearShortenResult();
      clearRewriteChannelResult();
      clearBrandAlignmentResult();
      setIsGeneratingTemplate(false);
      
      // Custom-component templates use their own component in the right sidebar
      // instead of the standard TemplateFormSlideOut
      const isCustomComponentTemplate =
        template.id === 'brochure-multi-section' ||
        template.id === 'brand-messaging-framework';
      
      if (isCustomComponentTemplate) {
        const store = useWorkspaceStore.getState();
        const { activeProjectId } = store;
        
        // Always create a new document for custom-component templates
        if (activeProjectId) {
          try {
            const newDoc = await createDocument(activeProjectId, template.name);
            store.setActiveDocumentId(newDoc.id);
            logger.log('✅ Created new document for custom template:', {
              id: newDoc.id,
              title: newDoc.title
            });
          } catch (error) {
            logger.error('❌ Failed to create document:', error);
          }
        } else {
          logger.error('❌ No active project - cannot create document');
        }
      }
      
      // Set selected template ID in store
      setSelectedTemplateId(template.id);
      
      // Clear active tool (template generator is special - not a tool in the sidebar)
      setActiveTool(null);
      
      // Open template form slide-out from right for ALL templates
      // (custom templates now use dedicated slide-outs instead of right sidebar)
      openSlideOut(TEMPLATE_FORM_PANEL_ID);
      logger.log('✅ Opening template slideout panel for', template.id);
      
      // NOTE: Do NOT close the templates browser - allow both panels to be open
    },
    [
      setSelectedTemplateId,
      setIsGeneratingTemplate,
      setActiveTool,
      setRightSidebarOpen,
      openSlideOut,
      clearToneShiftResult,
      clearExpandResult,
      clearShortenResult,
      clearRewriteChannelResult,
      clearBrandAlignmentResult,
    ]
  );

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      title="AI@Worx Templates"
      subtitle={`${ALL_TEMPLATES.length} professional templates`}
    >
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Info message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> Select a template to open the form in the right panel.
            Hover category names for help choosing the right one.
          </p>
        </div>

        {/* Category groups */}
        <div className="space-y-3">
          {groupedTemplates.map(({ category, icon, templates }) => (
            <TemplateCategoryGroup
              key={category.id}
              category={category}
              icon={icon}
              templates={templates}
              isExpanded={expandedGroups.has(category.id)}
              onToggle={() => toggleGroup(category.id)}
              onSelectTemplate={handleSelectTemplate}
              selectedTemplateId={selectedTemplateId}
            />
          ))}

          {/* Empty state */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No templates found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try a different search term
              </p>
            </div>
          )}
        </div>

        {/* Complexity Legend */}
        {filteredTemplates.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Complexity Guide:
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Beginner */}
                <div className="flex flex-col items-start gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 border border-green-200">
                    Beginner
                  </span>
                  <div className="text-gray-600 space-y-0.5">
                    <div className="font-medium text-gray-700">5-10 min</div>
                    <div className="text-gray-600">3-5 fields</div>
                    <div className="text-gray-500">Basic info</div>
                  </div>
                </div>
                
                {/* Intermediate */}
                <div className="flex flex-col items-start gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    Intermediate
                  </span>
                  <div className="text-gray-600 space-y-0.5">
                    <div className="font-medium text-gray-700">15-20 min</div>
                    <div className="text-gray-600">5-8 fields</div>
                    <div className="text-gray-500">Strategy needed</div>
                  </div>
                </div>
                
                {/* Advanced */}
                <div className="flex flex-col items-start gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200">
                    Advanced
                  </span>
                  <div className="text-gray-600 space-y-0.5">
                    <div className="font-medium text-gray-700">20-30 min</div>
                    <div className="text-gray-600">8-12+ fields</div>
                    <div className="text-gray-500">Comprehensive</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SlideOutPanel>
  );
}
