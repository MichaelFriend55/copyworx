/**
 * @file lib/stores/slideOutStore.ts
 * @description Zustand store for managing slide-out panel state
 * 
 * Features:
 * - Track which panel is currently open (by ID)
 * - Only one panel can be open at a time
 * - Opening a new panel auto-closes the current one
 * - Clean open/close actions
 * 
 * @example
 * ```tsx
 * const { activeSlideOutId, openSlideOut, closeSlideOut } = useSlideOutStore();
 * 
 * // Open a panel
 * openSlideOut('navigation-panel');
 * 
 * // Close any open panel
 * closeSlideOut();
 * 
 * // Check if specific panel is open
 * const isOpen = activeSlideOutId === 'navigation-panel';
 * ```
 */

'use client';

import { create } from 'zustand';

/**
 * Slide-out panel state interface
 */
interface SlideOutState {
  /** ID of the currently open slide-out panel, null if none open */
  activeSlideOutId: string | null;
  
  /**
   * Open a slide-out panel by ID
   * Automatically closes any currently open panel
   * @param id - Unique identifier for the panel
   */
  openSlideOut: (id: string) => void;
  
  /**
   * Close the currently open slide-out panel
   */
  closeSlideOut: () => void;
  
  /**
   * Toggle a slide-out panel
   * If the panel is open, close it. If closed, open it.
   * @param id - Unique identifier for the panel
   */
  toggleSlideOut: (id: string) => void;
  
  /**
   * Check if a specific panel is open
   * @param id - Unique identifier for the panel
   * @returns true if the panel is open
   */
  isSlideOutOpen: (id: string) => boolean;
}

/**
 * Zustand store for slide-out panel state
 * 
 * Not persisted - panels should always start closed on page load
 */
export const useSlideOutStore = create<SlideOutState>()((set, get) => ({
  activeSlideOutId: null,
  
  openSlideOut: (id: string) => {
    set({ activeSlideOutId: id });
    console.log('📂 Slide-out opened:', id);
  },
  
  closeSlideOut: () => {
    const currentId = get().activeSlideOutId;
    if (currentId) {
      set({ activeSlideOutId: null });
      console.log('📁 Slide-out closed:', currentId);
    }
  },
  
  toggleSlideOut: (id: string) => {
    const { activeSlideOutId } = get();
    if (activeSlideOutId === id) {
      set({ activeSlideOutId: null });
      console.log('📁 Slide-out toggled closed:', id);
    } else {
      set({ activeSlideOutId: id });
      console.log('📂 Slide-out toggled open:', id);
    }
  },
  
  isSlideOutOpen: (id: string) => {
    return get().activeSlideOutId === id;
  },
}));

/**
 * Selector hooks for optimized re-renders
 */
export const useActiveSlideOutId = () => useSlideOutStore((state) => state.activeSlideOutId);
export const useSlideOutActions = () => useSlideOutStore((state) => ({
  openSlideOut: state.openSlideOut,
  closeSlideOut: state.closeSlideOut,
  toggleSlideOut: state.toggleSlideOut,
}));

/**
 * Hook to check if a specific slide-out is open
 * @param id - Panel ID to check
 * @returns true if the panel is currently open
 */
export const useIsSlideOutOpen = (id: string) => {
  return useSlideOutStore((state) => state.activeSlideOutId === id);
};
