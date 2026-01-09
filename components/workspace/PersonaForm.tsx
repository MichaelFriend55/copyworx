/**
 * @file components/workspace/PersonaForm.tsx
 * @description Form component for creating/editing personas
 * 
 * Features:
 * - Photo upload with drag & drop
 * - All persona fields with validation
 * - Create/Edit modes
 * - Form validation
 * - Success/error handling
 * 
 * @example
 * ```tsx
 * <PersonaForm
 *   persona={existingPersona} // or null for create
 *   onSave={(persona) => handleSave(persona)}
 *   onCancel={() => setShowForm(false)}
 * />
 * ```
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, User, Loader2 } from 'lucide-react';
import type { Persona } from '@/lib/types/project';
import { processImageFile } from '@/lib/utils/image-utils';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { cn } from '@/lib/utils';

interface PersonaFormProps {
  /** Persona to edit (null for create mode) */
  persona: Persona | null;
  
  /** Callback when form is saved */
  onSave: (personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => void;
  
  /** Callback when form is cancelled */
  onCancel: () => void;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * PersonaForm component - Create/Edit form for personas
 */
export function PersonaForm({
  persona,
  onSave,
  onCancel,
  className,
}: PersonaFormProps) {
  // Form state
  const [name, setName] = useState(persona?.name || '');
  const [photoUrl, setPhotoUrl] = useState(persona?.photoUrl || '');
  const [demographics, setDemographics] = useState(persona?.demographics || '');
  const [psychographics, setPsychographics] = useState(persona?.psychographics || '');
  const [painPoints, setPainPoints] = useState(persona?.painPoints || '');
  const [languagePatterns, setLanguagePatterns] = useState(persona?.languagePatterns || '');
  const [goals, setGoals] = useState(persona?.goals || '');

  // UI state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode
  const isEditMode = !!persona;

  /**
   * Handle photo upload
   */
  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const processedImage = await processImageFile(file);
      setPhotoUrl(processedImage);
      console.log('✅ Photo uploaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo';
      setUploadError(errorMessage);
      console.error('❌ Photo upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  /**
   * Handle drag & drop
   */
  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    // Validate required fields
    if (!name.trim()) {
      alert('Persona name is required');
      return;
    }

    // Create persona data
    const personaData: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      photoUrl: photoUrl || undefined,
      demographics: demographics.trim(),
      psychographics: psychographics.trim(),
      painPoints: painPoints.trim(),
      languagePatterns: languagePatterns.trim(),
      goals: goals.trim(),
    };

    onSave(personaData);
  };

  /**
   * Remove photo
   */
  const handleRemovePhoto = (): void => {
    setPhotoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Photo Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Persona Photo <span className="text-gray-400">(optional)</span>
        </label>

        {photoUrl ? (
          // Photo Preview
          <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-gray-200">
            <img
              src={photoUrl}
              alt="Persona preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Upload Zone
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative w-full h-48 rounded-lg border-2 border-dashed',
              'flex flex-col items-center justify-center gap-3',
              'cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-sm text-gray-600">Processing image...</p>
              </>
            ) : (
              <>
                <div className="p-4 bg-purple-100 rounded-full">
                  <Upload className="w-8 h-8 text-purple-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Drop photo here or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, or WebP (max 2MB)
                  </p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {uploadError && (
          <p className="text-sm text-red-600">{uploadError}</p>
        )}
      </div>

      {/* Name & Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Name & Title <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g., "Sarah, the Startup Founder"'
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Demographics */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Demographics
        </label>
        <AutoExpandTextarea
          value={demographics}
          onChange={(e) => setDemographics(e.target.value)}
          placeholder="Age, income, location, job title"
          minHeight={80}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500">
          Example: Age 28-35, Tech-savvy, $500K-$2M revenue
        </p>
      </div>

      {/* Psychographics */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Psychographics
        </label>
        <AutoExpandTextarea
          value={psychographics}
          onChange={(e) => setPsychographics(e.target.value)}
          placeholder="Values, interests, lifestyle, personality traits"
          minHeight={80}
          maxHeight={400}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Pain Points */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Pain Points
        </label>
        <AutoExpandTextarea
          value={painPoints}
          onChange={(e) => setPainPoints(e.target.value)}
          placeholder="Problems and frustrations they face"
          minHeight={80}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500">
          Example: Time management, Scaling operations, Cash flow
        </p>
      </div>

      {/* Language Patterns */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Language Patterns
        </label>
        <AutoExpandTextarea
          value={languagePatterns}
          onChange={(e) => setLanguagePatterns(e.target.value)}
          placeholder="Words and phrases they use and respond to"
          minHeight={80}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500">
          Example: ROI, efficiency, move fast, scale, optimize
        </p>
      </div>

      {/* Goals & Aspirations */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Goals & Aspirations
        </label>
        <AutoExpandTextarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder="What they want to achieve"
          minHeight={80}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isUploading}
          className={cn(
            'flex-1 px-6 py-3 font-medium rounded-lg transition-all',
            'bg-gradient-to-r from-purple-600 to-blue-600',
            'text-white hover:from-purple-700 hover:to-blue-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-md hover:shadow-lg'
          )}
        >
          {isEditMode ? 'Update Persona' : 'Create Persona'}
        </button>
      </div>
    </form>
  );
}
