/**
 * @file lib/hooks/useProductTour.ts
 * @description Hook to manage product tour state with localStorage persistence
 * 
 * Features:
 * - Tracks whether user has completed the tour
 * - Provides functions to restart the tour
 * - Persists completion state in localStorage
 * - Auto-starts tour on first visit with delay
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

/** localStorage key for tour completion flag */
const TOUR_COMPLETED_KEY = 'copyworx_tour_completed';

/** localStorage key for tour version (allows re-showing after updates) */
const TOUR_VERSION_KEY = 'copyworx_tour_version';

/** Current tour version - increment to show tour again to all users */
const CURRENT_TOUR_VERSION = '1.0';

/** Delay before starting tour (ms) - gives UI time to fully render */
const TOUR_START_DELAY = 1500;

/**
 * Hook to manage product tour state
 * 
 * @returns Object with tour state and control functions
 * 
 * @example
 * ```tsx
 * const { runTour, completeTour, restartTour } = useProductTour();
 * 
 * return (
 *   <>
 *     <ProductTour run={runTour} onComplete={completeTour} />
 *     <button onClick={restartTour}>Take Tour Again</button>
 *   </>
 * );
 * ```
 */
export function useProductTour() {
  /** Whether the tour is currently running */
  const [runTour, setRunTour] = useState(false);
  
  /** Whether we've checked localStorage (prevents flash) */
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Check localStorage on mount to determine if tour should auto-start
   * Only runs on client side
   */
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Check if tour has been completed for current version
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    const tourVersion = localStorage.getItem(TOUR_VERSION_KEY);
    
    // Show tour if:
    // 1. Never completed, OR
    // 2. Completed for older version (tour was updated)
    const shouldShowTour = !tourCompleted || tourVersion !== CURRENT_TOUR_VERSION;
    
    if (shouldShowTour) {
      // Delay tour start to ensure UI is fully rendered
      const timer = setTimeout(() => {
        setRunTour(true);
      }, TOUR_START_DELAY);
      
      return () => clearTimeout(timer);
    }
    
    setIsInitialized(true);
  }, []);

  /**
   * Mark tour as completed
   * Saves to localStorage and stops the tour
   */
  const completeTour = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    localStorage.setItem(TOUR_VERSION_KEY, CURRENT_TOUR_VERSION);
    setRunTour(false);
    setIsInitialized(true);
    
    console.log('✅ Product tour completed');
  }, []);

  /**
   * Restart the tour
   * Clears completion state and starts the tour
   */
  const restartTour = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Clear completion flag to allow tour to run
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    
    // Start tour with small delay for UI updates
    setTimeout(() => {
      setRunTour(true);
    }, 100);
    
    console.log('🔄 Product tour restarted');
  }, []);

  /**
   * Skip the tour without completing it
   * Marks as completed but doesn't prevent future restart
   */
  const skipTour = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    localStorage.setItem(TOUR_VERSION_KEY, CURRENT_TOUR_VERSION);
    setRunTour(false);
    
    console.log('⏭️ Product tour skipped');
  }, []);

  /**
   * Check if tour has been completed
   * Useful for showing/hiding "Take Tour" buttons
   */
  const isTourCompleted = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
  }, []);

  /**
   * Reset tour for testing/development
   * Clears all tour-related localStorage
   */
  const resetTourForTesting = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    localStorage.removeItem(TOUR_VERSION_KEY);
    setRunTour(false);
    
    console.log('🧪 Tour reset for testing - refresh page to see tour');
  }, []);

  return {
    /** Whether the tour is currently running */
    runTour,
    
    /** Whether the hook has initialized (checked localStorage) */
    isInitialized,
    
    /** Mark tour as completed */
    completeTour,
    
    /** Restart the tour from beginning */
    restartTour,
    
    /** Skip the tour */
    skipTour,
    
    /** Check if tour has been completed */
    isTourCompleted,
    
    /** Reset tour for testing (dev only) */
    resetTourForTesting,
  };
}
