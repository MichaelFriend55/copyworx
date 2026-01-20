/**
 * @file lib/tools/toolRegistry.ts
 * @description Centralized tool registry for CopyWorx workspace
 * 
 * Manages all tools available in the workspace with their metadata,
 * organization into sections, and helper functions for tool lookup.
 * 
 * Architecture:
 * - LEFT SIDEBAR: Tool selector with collapsible sections
 * - RIGHT SIDEBAR: Active tool interface dynamically rendered
 */

import type { LucideIcon } from 'lucide-react';
import {
  Wand2,
  Maximize2,
  Minimize2,
  Repeat,
  Users,
  Volume2,
  Target,
  UserCheck,
  Zap,
} from 'lucide-react';

/**
 * Tool section types for organizing tools in the left sidebar
 */
export type ToolSection = 'optimizer' | 'brand' | 'insights';

/**
 * Tool configuration interface
 */
export interface ToolConfig {
  /** Unique identifier for the tool */
  id: string;
  
  /** Display name of the tool */
  name: string;
  
  /** Lucide icon component */
  icon: LucideIcon;
  
  /** Section this tool belongs to */
  section: ToolSection;
  
  /** Short description */
  description: string;
  
  /** Optional: Whether tool requires a document to be open */
  requiresDocument?: boolean;
  
  /** Optional: Badge text (e.g., "NEW", "BETA") */
  badge?: string;
}

/**
 * Complete tool registry
 * All tools available in CopyWorx workspace
 */
export const TOOLS: ToolConfig[] = [
  // ═══════════════════════════════════════════════════════════
  // MY COPY OPTIMIZER
  // ═══════════════════════════════════════════════════════════
  {
    id: 'tone-shifter',
    name: 'Tone Shifter',
    icon: Wand2,
    section: 'optimizer',
    description: 'Rewrite in different tones',
    requiresDocument: true,
  },
  {
    id: 'expand',
    name: 'Expand',
    icon: Maximize2,
    section: 'optimizer',
    description: 'Make copy longer and more detailed',
    requiresDocument: true,
  },
  {
    id: 'shorten',
    name: 'Shorten',
    icon: Minimize2,
    section: 'optimizer',
    description: 'Make copy more concise',
    requiresDocument: true,
  },
  {
    id: 'rewrite-channel',
    name: 'Rewrite for Channel',
    icon: Repeat,
    section: 'optimizer',
    description: 'Adapt for different platforms',
    requiresDocument: true,
  },
  
  // ═══════════════════════════════════════════════════════════
  // MY BRAND & AUDIENCE
  // ═══════════════════════════════════════════════════════════
  {
    id: 'personas',
    name: 'Personas',
    icon: Users,
    section: 'brand',
    description: 'Target audience profiles',
    requiresDocument: false,
  },
  {
    id: 'brand-voice',
    name: 'Brand Voice',
    icon: Volume2,
    section: 'brand',
    description: 'Brand tone & style guidelines',
    requiresDocument: false,
  },
  
  // ═══════════════════════════════════════════════════════════
  // MY INSIGHTS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'competitor-analyzer',
    name: 'Competitor Analyzer',
    icon: Target,
    section: 'insights',
    description: 'Analyze competitor copy',
    requiresDocument: false,
  },
  {
    id: 'persona-alignment',
    name: 'Persona Alignment',
    icon: UserCheck,
    section: 'insights',
    description: 'Check persona fit',
    requiresDocument: true,
  },
  {
    id: 'brand-alignment',
    name: 'Brand Alignment',
    icon: Zap,
    section: 'insights',
    description: 'Check brand consistency',
    requiresDocument: true,
  },
];

/**
 * Section metadata for organizing the left sidebar
 */
export interface SectionConfig {
  id: ToolSection;
  name: string;
  icon: LucideIcon;
  description: string;
  defaultExpanded?: boolean;
}

export const SECTIONS: SectionConfig[] = [
  {
    id: 'optimizer',
    name: 'My Copy Optimizer',
    icon: Wand2,
    description: 'Improve and refine your copy',
    defaultExpanded: true,
  },
  {
    id: 'brand',
    name: 'Brand & Audience',
    icon: Users,
    description: 'Brand voice and target personas',
    defaultExpanded: false,
  },
  {
    id: 'insights',
    name: 'My Insights',
    icon: Target,
    description: 'Analyze and align your copy',
    defaultExpanded: false,
  },
];

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get a tool by its ID
 * @param id Tool identifier
 * @returns Tool configuration or undefined
 */
export function getToolById(id: string): ToolConfig | undefined {
  return TOOLS.find((tool) => tool.id === id);
}

/**
 * Get all tools in a specific section
 * @param section Section identifier
 * @returns Array of tools in that section
 */
export function getToolsBySection(section: ToolSection): ToolConfig[] {
  return TOOLS.filter((tool) => tool.section === section);
}

/**
 * Get section configuration by ID
 * @param id Section identifier
 * @returns Section configuration or undefined
 */
export function getSectionById(id: ToolSection): SectionConfig | undefined {
  return SECTIONS.find((section) => section.id === id);
}

/**
 * Check if a tool requires an active document
 * @param toolId Tool identifier
 * @returns True if tool requires a document
 */
export function toolRequiresDocument(toolId: string): boolean {
  const tool = getToolById(toolId);
  return tool?.requiresDocument ?? false;
}

/**
 * Get all tool IDs
 * @returns Array of all tool IDs
 */
export function getAllToolIds(): string[] {
  return TOOLS.map((tool) => tool.id);
}

/**
 * Get all section IDs
 * @returns Array of all section IDs
 */
export function getAllSectionIds(): ToolSection[] {
  return SECTIONS.map((section) => section.id);
}

/**
 * Validate if a tool ID exists
 * @param toolId Tool identifier to validate
 * @returns True if tool exists
 */
export function isValidToolId(toolId: string): boolean {
  return TOOLS.some((tool) => tool.id === toolId);
}

/**
 * Validate if a section ID exists
 * @param sectionId Section identifier to validate
 * @returns True if section exists
 */
export function isValidSectionId(sectionId: string): sectionId is ToolSection {
  return SECTIONS.some((section) => section.id === sectionId);
}
