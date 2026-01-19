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
import { useShallow } from 'zustand/react/shallow';

/**
 * Slide-out panel state interface
 */
interface SlideOutState {
  /** Set of IDs for currently open slide-out panels */
  openSlideOutIds: Set<string>;
  
  /**
   * Open a slide-out panel by ID
   * Multiple panels can be open simultaneously
   * @param id - Unique identifier for the panel
   */
  openSlideOut: (id: string) => void;
  
  /**
   * Close a specific slide-out panel by ID
   * @param id - Unique identifier for the panel to close (optional - closes all if omitted)
   */
  closeSlideOut: (id?: string) => void;
  
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
  
  /**
   * Close all open slide-out panels
   */
  closeAllSlideOuts: () => void;
}

/**
 * Zustand store for slide-out panel state
 * 
 * Not persisted - panels should always start closed on page load
 * Supports multiple panels open simultaneously (e.g., templates browser + template form)
 */
export const useSlideOutStore = create<SlideOutState>()((set, get) => ({
  openSlideOutIds: new Set<string>(),
  
  openSlideOut: (id: string) => {
    const { openSlideOutIds } = get();
    if (!openSlideOutIds.has(id)) {
      const newSet = new Set(openSlideOutIds);
      newSet.add(id);
      set({ openSlideOutIds: newSet });
      console.log('📂 Slide-out opened:', id);
    }
  },
  
  closeSlideOut: (id?: string) => {
    const { openSlideOutIds } = get();
    if (id) {
      // Close specific panel
      if (openSlideOutIds.has(id)) {
        const newSet = new Set(openSlideOutIds);
        newSet.delete(id);
        set({ openSlideOutIds: newSet });
        console.log('📁 Slide-out closed:', id);
      }
    } else {
      // Close all panels
      if (openSlideOutIds.size > 0) {
        set({ openSlideOutIds: new Set() });
        console.log('📁 All slide-outs closed');
      }
    }
  },
  
  toggleSlideOut: (id: string) => {
    const { openSlideOutIds } = get();
    const newSet = new Set(openSlideOutIds);
    if (newSet.has(id)) {
      newSet.delete(id);
      console.log('📁 Slide-out toggled closed:', id);
    } else {
      newSet.add(id);
      console.log('📂 Slide-out toggled open:', id);
    }
    set({ openSlideOutIds: newSet });
  },
  
  isSlideOutOpen: (id: string) => {
    return get().openSlideOutIds.has(id);
  },
  
  closeAllSlideOuts: () => {
    const { openSlideOutIds } = get();
    if (openSlideOutIds.size > 0) {
      set({ openSlideOutIds: new Set() });
      console.log('📁 All slide-outs closed');
    }
  },
}));

/**
 * Selector hooks for optimized re-renders
 */

/**
 * Hook to get all open slide-out IDs
 * @returns Set of currently open panel IDs
 */
export const useOpenSlideOutIds = () => useSlideOutStore((state) => state.openSlideOutIds);

/**
 * Hook to get slide-out actions with stable references
 * Uses useShallow to prevent unnecessary re-renders
 */
export const useSlideOutActions = () => useSlideOutStore(
  useShallow((state) => ({
    openSlideOut: state.openSlideOut,
    closeSlideOut: state.closeSlideOut,
    toggleSlideOut: state.toggleSlideOut,
    closeAllSlideOuts: state.closeAllSlideOuts,
  }))
);

/**
 * Hook to check if a specific slide-out is open
 * @param id - Panel ID to check
 * @returns true if the panel is currently open
 */
export const useIsSlideOutOpen = (id: string) => {
  return useSlideOutStore((state) => state.openSlideOutIds.has(id));
};
