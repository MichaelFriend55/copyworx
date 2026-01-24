/**
 * @file components/workspace/BrandVoiceSlideOut.tsx
 * @description Brand Voice setup slide-out form
 * 
 * Features:
 * - 550px wide right slide-out panel
 * - Brand voice configuration form
 * - Saves to project in Zustand + localStorage
 * - Clean, spacious layout for comfortable editing
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Volume2,
  Save,
  CheckCircle,
  AlertTriangle,
  Folder,
  Trash2,
} from 'lucide-react';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';
import { Button } from '@/components/ui/button';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { cn } from '@/lib/utils';
import { useWorkspaceStore, useActiveProjectId, useProjects } from '@/lib/stores/workspaceStore';
import { saveBrandVoiceToProject, deleteBrandVoiceFromProject } from '@/lib/storage/unified-storage';
import type { BrandVoice } from '@/lib/types/brand';

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Unique ID for the brand voice slide-out panel */
export const BRAND_VOICE_PANEL_ID = 'brand-voice-setup';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface BrandVoiceSlideOutProps {
  /** Whether the slide-out is open */
  isOpen: boolean;
  
  /** Callback when slide-out should close */
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function BrandVoiceSlideOut({
  isOpen,
  onClose,
}: BrandVoiceSlideOutProps) {
  // Store state
  const activeProjectId = useActiveProjectId();
  const projects = useProjects();
  
  // Get active project
  const activeProject = React.useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );
  
  // Form state
  const [brandName, setBrandName] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [approvedPhrases, setApprovedPhrases] = useState('');
  const [forbiddenWords, setForbiddenWords] = useState('');
  const [brandValues, setBrandValues] = useState('');
  
  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Load brand voice from active project when panel opens
  useEffect(() => {
    if (!isOpen || !activeProjectId) {
      return;
    }
    
    // Get fresh project data
    const currentProjects = useWorkspaceStore.getState().projects;
    const currentProject = currentProjects.find((p) => p.id === activeProjectId);
    
    if (!currentProject) {
      // No active project - clear form
      setBrandName('');
      setBrandTone('');
      setApprovedPhrases('');
      setForbiddenWords('');
      setBrandValues('');
      return;
    }
    
    // Load brand voice from project
    const brandVoice = currentProject.brandVoice;
    
    if (brandVoice) {
      setBrandName(brandVoice.brandName);
      setBrandTone(brandVoice.brandTone);
      setApprovedPhrases(brandVoice.approvedPhrases.join('\n'));
      setForbiddenWords(brandVoice.forbiddenWords.join('\n'));
      setBrandValues(brandVoice.brandValues.join('\n'));
      logger.log('✅ Loaded brand voice from project:', currentProject.name);
    } else {
      // No brand voice - clear form
      setBrandName('');
      setBrandTone('');
      setApprovedPhrases('');
      setForbiddenWords('');
      setBrandValues('');
    }
  }, [isOpen, activeProjectId]);
  
  /**
   * Handle save brand voice
   */
  const handleSave = useCallback(async () => {
    // Clear previous errors
    setSaveError(null);
    setSaveSuccess(false);
    
    // Check if project exists
    if (!activeProject || !activeProjectId) {
      setSaveError('No active project. Please create a project first.');
      return;
    }
    
    // Validate required fields
    if (!brandName.trim()) {
      setSaveError('Brand Name is required');
      return;
    }
    
    // Create brand voice object
    const brandVoice: BrandVoice = {
      brandName: brandName.trim(),
      brandTone: brandTone.trim(),
      approvedPhrases: approvedPhrases
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean),
      forbiddenWords: forbiddenWords
        .split('\n')
        .map(w => w.trim())
        .filter(Boolean),
      brandValues: brandValues
        .split('\n')
        .map(v => v.trim())
        .filter(Boolean),
      missionStatement: '', // Not included in simplified form
      savedAt: new Date(),
    };
    
    // Save to active project
    try {
      await saveBrandVoiceToProject(activeProjectId, brandVoice);
      
      // Update Zustand store state directly (no storage call needed)
      // Brand voices are stored in a separate table, so no project update required
      const { projects } = useWorkspaceStore.getState();
      const updatedProjects = projects.map(p =>
        p.id === activeProjectId ? { ...p, brandVoice } : p
      );
      useWorkspaceStore.setState({ projects: updatedProjects });
      
      setSaveSuccess(true);
      
      logger.log('✅ Brand voice saved to project:', activeProject.name);
      
      // Close slide-out after 1.5 seconds
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to save brand voice. Please try again.';
      setSaveError(errorMessage);
      logger.error('❌ Failed to save brand voice:', error);
    }
  }, [activeProject, activeProjectId, brandName, brandTone, approvedPhrases, forbiddenWords, brandValues, onClose]);
  
  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);
  
  /**
   * Handle delete brand voice - show confirmation modal
   */
  const handleDelete = useCallback(() => {
    setShowDeleteModal(true);
  }, []);
  
  /**
   * Confirm delete brand voice
   */
  const confirmDelete = useCallback(async () => {
    if (!activeProjectId || !activeProject?.brandVoice) return;
    
    setIsDeleting(true);
    
    try {
      await deleteBrandVoiceFromProject(activeProjectId);
      
      // Update Zustand store state directly (no storage call needed)
      // Brand voices are stored in a separate table, so no project update required
      const { projects } = useWorkspaceStore.getState();
      const updatedProjects = projects.map(p =>
        p.id === activeProjectId ? { ...p, brandVoice: undefined } : p
      );
      useWorkspaceStore.setState({ projects: updatedProjects });
      
      // Clear form
      setBrandName('');
      setBrandTone('');
      setApprovedPhrases('');
      setForbiddenWords('');
      setBrandValues('');
      
      logger.log('✅ Brand voice deleted');
      
      // Close modal and slide-out
      setShowDeleteModal(false);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      logger.error('❌ Failed to delete brand voice:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to delete brand voice');
    } finally {
      setIsDeleting(false);
    }
  }, [activeProjectId, activeProject, onClose]);
  
  /**
   * Cancel delete
   */
  const cancelDelete = useCallback(() => {
    setShowDeleteModal(false);
  }, []);
  
  // Panel footer with action buttons
  const panelFooter = (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="default"
          onClick={handleCancel}
          disabled={saveSuccess}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          size="default"
          onClick={handleSave}
          disabled={!activeProject || saveSuccess}
          className="flex-1"
        >
          {saveSuccess ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Brand Voice
            </>
          )}
        </Button>
      </div>
      
      {/* Delete Button - Only show if brand voice exists */}
      {activeProject?.brandVoice && (
        <Button
          variant="outline"
          size="default"
          onClick={handleDelete}
          disabled={saveSuccess}
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Brand Voice
        </Button>
      )}
    </div>
  );
  
  return (
    <>
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      title="Brand Voice Setup"
      subtitle="Define your brand's tone, values, and voice guidelines"
      footer={panelFooter}
    >
      <div className="space-y-6">
        {/* Active Project Indicator */}
        {activeProject ? (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-900">
                Setting up brand voice for:
              </p>
              <p className="text-sm font-semibold text-blue-700 truncate">
                {activeProject.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                No Active Project
              </p>
              <p className="text-xs text-yellow-700 mt-0.5">
                Please create or select a project to set up brand voice
              </p>
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">
              Brand voice saved successfully!
            </p>
          </div>
        )}
        
        {/* Error Message */}
        {saveError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-xs text-red-700 mt-1">{saveError}</p>
            </div>
          </div>
        )}
        
        {/* Form Fields */}
        <div className="space-y-5">
          {/* Brand Name */}
          <div className="space-y-2">
            <label htmlFor="brandName" className="block text-sm font-medium text-gray-900">
              Brand Name <span className="text-red-600">*</span>
            </label>
            <input
              id="brandName"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              disabled={saveSuccess}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'disabled:bg-gray-50 disabled:opacity-50',
                'placeholder:text-gray-400'
              )}
            />
            <p className="text-xs text-gray-500">
              Your company or product name
            </p>
          </div>
          
          {/* Brand Tone Description */}
          <div className="space-y-2">
            <label htmlFor="brandTone" className="block text-sm font-medium text-gray-900">
              Brand Tone Description
            </label>
            <AutoExpandTextarea
              id="brandTone"
              value={brandTone}
              onChange={(e) => setBrandTone(e.target.value)}
              placeholder="e.g., Professional yet approachable, innovative, customer-focused, and results-driven"
              minHeight={100}
              maxHeight={300}
              disabled={saveSuccess}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'disabled:bg-gray-50 disabled:opacity-50',
                'placeholder:text-gray-400'
              )}
            />
            <p className="text-xs text-gray-500">
              How should your brand sound? Describe the personality and tone
            </p>
          </div>
          
          {/* Approved Phrases */}
          <div className="space-y-2">
            <label htmlFor="approvedPhrases" className="block text-sm font-medium text-gray-900">
              Approved Phrases
            </label>
            <AutoExpandTextarea
              id="approvedPhrases"
              value={approvedPhrases}
              onChange={(e) => setApprovedPhrases(e.target.value)}
              placeholder="world-class&#10;industry-leading&#10;trusted partner&#10;proven results"
              minHeight={120}
              maxHeight={300}
              disabled={saveSuccess}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white font-mono',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'disabled:bg-gray-50 disabled:opacity-50',
                'placeholder:text-gray-400'
              )}
            />
            <p className="text-xs text-gray-500">
              Key phrases that align with your brand (one per line)
            </p>
          </div>
          
          {/* Forbidden Words */}
          <div className="space-y-2">
            <label htmlFor="forbiddenWords" className="block text-sm font-medium text-red-600">
              Forbidden Words
            </label>
            <AutoExpandTextarea
              id="forbiddenWords"
              value={forbiddenWords}
              onChange={(e) => setForbiddenWords(e.target.value)}
              placeholder="cheap&#10;discount&#10;sale&#10;limited time"
              minHeight={120}
              maxHeight={300}
              disabled={saveSuccess}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-red-200 transition-all duration-200',
                'text-sm text-gray-900 bg-white font-mono',
                'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                'disabled:bg-gray-50 disabled:opacity-50',
                'placeholder:text-gray-400'
              )}
            />
            <p className="text-xs text-gray-500">
              Words and phrases to avoid (one per line)
            </p>
          </div>
          
          {/* Brand Values */}
          <div className="space-y-2">
            <label htmlFor="brandValues" className="block text-sm font-medium text-gray-900">
              Brand Values
            </label>
            <AutoExpandTextarea
              id="brandValues"
              value={brandValues}
              onChange={(e) => setBrandValues(e.target.value)}
              placeholder="Innovation&#10;Customer Success&#10;Integrity&#10;Excellence"
              minHeight={120}
              maxHeight={300}
              disabled={saveSuccess}
              className={cn(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'text-sm text-gray-900 bg-white font-mono',
                'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                'disabled:bg-gray-50 disabled:opacity-50',
                'placeholder:text-gray-400'
              )}
            />
            <p className="text-xs text-gray-500">
              Core values that drive your brand (one per line)
            </p>
          </div>
        </div>
      </div>
    </SlideOutPanel>
    
    {/* Delete Confirmation Modal */}
    <ConfirmationModal
      isOpen={showDeleteModal}
      title="Delete Brand Voice"
      message={`Delete "${activeProject?.brandVoice?.brandName}" brand voice?`}
      description="This will permanently remove this brand voice. This cannot be undone."
      confirmLabel="Delete Brand Voice"
      onClose={cancelDelete}
      onConfirm={confirmDelete}
      isConfirming={isDeleting}
      isDestructive={true}
    />
    </>
  );
}
