/**
 * @file components/workspace/BrandVoiceSection.tsx
 * @description Brand Voice list section for the My Projects slide-out
 * 
 * Features:
 * - Displays brand voices for a project
 * - Click to open brand voice in slide-out panel
 * - Collapsible section
 * - Shows brand name and tone preview
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Volume2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types/project';
import { useSlideOutActions } from '@/lib/stores/slideOutStore';
import { usePendingEditActions } from '@/lib/stores/workspaceStore';
import { BRAND_VOICE_PANEL_ID } from '@/components/workspace/BrandVoiceSlideOut';

// ============================================================================
// Types
// ============================================================================

interface BrandVoiceSectionProps {
  /** Project to display brand voices for */
  project: Project;
  /** Whether this project section is expanded */
  isExpanded: boolean;
  /** Search query for filtering */
  searchQuery?: string;
}

interface BrandVoiceRowProps {
  brandName: string;
  brandTone: string;
  isCurrent: boolean;
  onSelect: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

// ============================================================================
// BrandVoiceRow Component
// ============================================================================

function BrandVoiceRow({ brandName, brandTone, isCurrent, onSelect }: BrandVoiceRowProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-1.5 px-2 py-1.5 rounded-md cursor-pointer',
        'transition-colors duration-150',
        'hover:bg-gray-50'
      )}
      onClick={onSelect}
      title={`Click to view/edit "${brandName}"`}
    >
      <Volume2 className={cn(
        'h-3.5 w-3.5 flex-shrink-0 mt-px',
        'text-blue-500'
      )} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-medium truncate',
            'text-gray-900'
          )}>
            {brandName}
          </span>
        </div>
        {brandTone && (
          <p className="text-[10px] text-gray-500 truncate mt-0.5">
            {truncateText(brandTone, 60)}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// BrandVoiceSection Component
// ============================================================================

export function BrandVoiceSection({
  project,
  isExpanded,
  searchQuery = '',
}: BrandVoiceSectionProps) {
  const [sectionExpanded, setSectionExpanded] = useState(true);
  const { openSlideOut } = useSlideOutActions();
  const { setPendingBrandVoiceEdit } = usePendingEditActions();
  
  // Get brand voice from project
  const brandVoice = project.brandVoice;
  const hasBrandVoice = brandVoice !== null;
  
  // Filter by search query if provided
  const matchesSearch = useMemo(() => {
    if (!searchQuery.trim() || !brandVoice) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      brandVoice.brandName.toLowerCase().includes(query) ||
      brandVoice.brandTone.toLowerCase().includes(query)
    );
  }, [brandVoice, searchQuery]);
  
  // Don't render if project section is collapsed
  if (!isExpanded) {
    return null;
  }
  
  // Hide if search doesn't match
  const shouldShowBrandVoice = hasBrandVoice && matchesSearch;
  
  // Toggle section expanded state
  const toggleSection = () => {
    setSectionExpanded(prev => !prev);
  };
  
  // Handle brand voice selection - set pending edit then open
  const handleBrandVoiceClick = () => {
    if (brandVoice) {
      // Set the brand name to edit
      setPendingBrandVoiceEdit(brandVoice.brandName);
    }
    openSlideOut(BRAND_VOICE_PANEL_ID);
  };
  
  return (
    <div className="mt-2 ml-2 pl-2 border-l-2 border-blue-200">
      {/* Section header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer',
          'hover:bg-blue-50 transition-colors duration-150'
        )}
        onClick={toggleSection}
      >
        {sectionExpanded ? (
          <ChevronDown className="h-4 w-4 text-blue-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0" />
        )}
        
        <Volume2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
        
        <span className="flex-1 text-sm font-semibold text-blue-900">
          Brand Voice
        </span>
        
        {hasBrandVoice && (
          <span className="text-xs text-blue-500 px-2 py-0.5 bg-blue-100 rounded-full">
            1
          </span>
        )}
      </div>
      
      {/* Brand voice display */}
      {sectionExpanded && (
        <div className="mt-1 space-y-1">
          {shouldShowBrandVoice && brandVoice ? (
            <BrandVoiceRow
              brandName={brandVoice.brandName}
              brandTone={brandVoice.brandTone}
              isCurrent={true}
              onSelect={handleBrandVoiceClick}
            />
          ) : !hasBrandVoice ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">
                No brand voice set
              </p>
              <button
                onClick={handleBrandVoiceClick}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Set brand voice
              </button>
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic py-2 px-3">
              No brand voice matches &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BrandVoiceSection;
