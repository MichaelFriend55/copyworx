/**
 * @file components/workspace/PersonaSection.tsx
 * @description Personas list section for the My Projects slide-out
 * 
 * Features:
 * - Displays personas for a project
 * - Click to open personas panel
 * - Collapsible section
 * - Shows persona name and demographics preview
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  User,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, Persona } from '@/lib/types/project';
import { useSlideOutActions } from '@/lib/stores/slideOutStore';
import { usePendingEditActions } from '@/lib/stores/workspaceStore';
import { PERSONAS_PANEL_ID } from '@/components/workspace/PersonasSlideOut';

// ============================================================================
// Types
// ============================================================================

interface PersonaSectionProps {
  /** Project to display personas for */
  project: Project;
  /** Whether this project section is expanded */
  isExpanded: boolean;
  /** Search query for filtering */
  searchQuery?: string;
}

interface PersonaRowProps {
  persona: Persona;
  onSelect: (personaId: string) => void;
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
// PersonaRow Component
// ============================================================================

function PersonaRow({ persona, onSelect }: PersonaRowProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-1.5 px-2 py-1.5 rounded-md cursor-pointer',
        'transition-colors duration-150',
        'hover:bg-gray-50'
      )}
      onClick={() => onSelect(persona.id)}
      title={`Click to view/edit "${persona.name}"`}
    >
      {persona.photoUrl ? (
        <img
          src={persona.photoUrl}
          alt={persona.name}
          className="h-3.5 w-3.5 rounded-full object-cover flex-shrink-0 mt-px"
        />
      ) : (
        <User className="h-3.5 w-3.5 text-purple-500 flex-shrink-0 mt-px" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-900 truncate">
            {persona.name}
          </span>
        </div>
        {persona.demographics && (
          <p className="text-[10px] text-gray-500 truncate mt-0.5">
            {truncateText(persona.demographics, 60)}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PersonaSection Component
// ============================================================================

export function PersonaSection({
  project,
  isExpanded,
  searchQuery = '',
}: PersonaSectionProps) {
  const [sectionExpanded, setSectionExpanded] = useState(true);
  const { openSlideOut } = useSlideOutActions();
  const { setPendingPersonaEdit } = usePendingEditActions();
  
  // Get personas from project
  const personas = project.personas || [];
  const hasPersonas = personas.length > 0;
  
  // Filter by search query if provided
  const filteredPersonas = useMemo(() => {
    if (!searchQuery.trim()) return personas;
    
    const query = searchQuery.toLowerCase();
    return personas.filter(persona =>
      persona.name.toLowerCase().includes(query) ||
      persona.demographics.toLowerCase().includes(query) ||
      persona.psychographics.toLowerCase().includes(query)
    );
  }, [personas, searchQuery]);
  
  // Don't render if project section is collapsed
  if (!isExpanded) {
    return null;
  }
  
  // Toggle section expanded state
  const toggleSection = () => {
    setSectionExpanded(prev => !prev);
  };
  
  // Handle persona selection - set pending edit then open
  const handlePersonaClick = (personaId: string) => {
    // Set the persona ID to edit
    setPendingPersonaEdit(personaId);
    openSlideOut(PERSONAS_PANEL_ID);
  };
  
  return (
    <div className="mt-2 ml-2 pl-2 border-l-2 border-purple-200">
      {/* Section header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer',
          'hover:bg-purple-50 transition-colors duration-150'
        )}
        onClick={toggleSection}
      >
        {sectionExpanded ? (
          <ChevronDown className="h-4 w-4 text-purple-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0" />
        )}
        
        <Users className="h-4 w-4 text-purple-500 flex-shrink-0" />
        
        <span className="flex-1 text-sm font-semibold text-purple-900">
          Personas
        </span>
        
        {hasPersonas && (
          <span className="text-xs text-purple-500 px-2 py-0.5 bg-purple-100 rounded-full">
            {personas.length}
          </span>
        )}
      </div>
      
      {/* Persona list */}
      {sectionExpanded && (
        <div className="mt-1 space-y-1">
          {filteredPersonas.length > 0 ? (
            filteredPersonas.map(persona => (
              <PersonaRow
                key={persona.id}
                persona={persona}
                onSelect={handlePersonaClick}
              />
            ))
          ) : hasPersonas ? (
            <div className="text-xs text-gray-400 italic py-2 px-3">
              No personas match &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">
                No personas yet
              </p>
              <button
                onClick={() => {
                  setPendingPersonaEdit(null);
                  openSlideOut(PERSONAS_PANEL_ID);
                }}
                className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add your first persona
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PersonaSection;
