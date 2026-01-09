/**
 * @file components/workspace/PersonaCard.tsx
 * @description Reusable persona card component for displaying persona summaries
 * 
 * Features:
 * - Photo or placeholder display
 * - Name and demographics preview
 * - Edit and delete actions
 * - Hover effects and animations
 * 
 * @example
 * ```tsx
 * <PersonaCard
 *   persona={persona}
 *   onEdit={() => handleEdit(persona)}
 *   onDelete={() => handleDelete(persona.id)}
 * />
 * ```
 */

'use client';

import React from 'react';
import { Edit2, Trash2, User } from 'lucide-react';
import type { Persona } from '@/lib/types/project';
import { cn } from '@/lib/utils';

interface PersonaCardProps {
  /** Persona data to display */
  persona: Persona;
  
  /** Callback when edit button is clicked */
  onEdit: () => void;
  
  /** Callback when delete button is clicked */
  onDelete: () => void;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * PersonaCard component - Displays persona summary in a card
 * 
 * Performance: Memoized to prevent re-renders when props haven't changed
 */
export const PersonaCard = React.memo(function PersonaCard({
  persona,
  onEdit,
  onDelete,
  className,
}: PersonaCardProps) {
  // Truncate demographics for preview
  const demographicsPreview =
    persona.demographics.length > 80
      ? `${persona.demographics.substring(0, 80)}...`
      : persona.demographics;

  return (
    <div
      className={cn(
        'group relative bg-white rounded-lg border border-gray-200',
        'hover:border-purple-300 hover:shadow-md',
        'transition-all duration-200',
        'overflow-hidden',
        className
      )}
    >
      {/* Photo Section */}
      <div className="relative h-48 bg-gradient-to-br from-purple-50 to-blue-50 overflow-hidden">
        {persona.photoUrl ? (
          <img
            src={persona.photoUrl}
            alt={persona.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <User className="w-24 h-24 text-purple-300" strokeWidth={1.5} />
          </div>
        )}
        
        {/* Action Buttons (show on hover) */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-purple-50 transition-colors shadow-sm"
            title="Edit persona"
            aria-label="Edit persona"
          >
            <Edit2 className="w-4 h-4 text-purple-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-red-50 transition-colors shadow-sm"
            title="Delete persona"
            aria-label="Delete persona"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-2">
        {/* Name */}
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          {persona.name}
        </h3>

        {/* Demographics Preview */}
        {persona.demographics && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {demographicsPreview}
          </p>
        )}

        {/* Metadata */}
        <div className="pt-2 text-xs text-gray-400">
          Created {new Date(persona.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Hover Overlay for Click to Edit */}
      <div
        onClick={onEdit}
        className="absolute inset-0 bg-purple-500/0 hover:bg-purple-500/5 cursor-pointer transition-colors duration-200"
        aria-label={`View details for ${persona.name}`}
      />
    </div>
  );
});
