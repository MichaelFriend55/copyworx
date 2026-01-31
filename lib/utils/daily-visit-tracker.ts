/**
 * @file lib/utils/daily-visit-tracker.ts
 * @description Utility for tracking first visit of the day and managing splash page redirects
 * 
 * Features:
 * - Tracks last visit date in localStorage
 * - Determines if current visit is first of the day
 * - Updates visit date when user interacts with splash page
 * - Prevents redirect loops by using session-based tracking
 * 
 * @example
 * ```ts
 * // Check if should redirect to splash
 * if (shouldRedirectToSplash()) {
 *   router.push('/home');
 * }
 * 
 * // After user clicks splash button, mark as visited
 * markDailyVisitComplete();
 * ```
 */

const LAST_VISIT_DATE_KEY = 'copyworx_last_visit_date';
const SPLASH_VIEWED_SESSION_KEY = 'copyworx_splash_viewed_session';

/**
 * Get today's date in YYYY-MM-DD format for consistent comparison
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if the user should be redirected to the splash page
 * 
 * Returns true if:
 * - No last visit date exists (first time ever), OR
 * - Last visit date is not today, AND
 * - Splash has not been viewed in this session (prevents redirect loops)
 * 
 * @returns {boolean} True if user should see splash page
 */
export function shouldRedirectToSplash(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Check if splash was already viewed in this session (prevents redirect loops)
    const splashViewedThisSession = sessionStorage.getItem(SPLASH_VIEWED_SESSION_KEY);
    if (splashViewedThisSession === 'true') {
      return false;
    }

    // Get last visit date from localStorage
    const lastVisitDate = localStorage.getItem(LAST_VISIT_DATE_KEY);
    const todayDate = getTodayDateString();

    // If no last visit date, or if last visit was not today, redirect to splash
    if (!lastVisitDate || lastVisitDate !== todayDate) {
      return true;
    }

    return false;
  } catch (error) {
    // If localStorage/sessionStorage is not available, don't redirect
    console.error('Error checking daily visit:', error);
    return false;
  }
}

/**
 * Mark that the user has completed their daily visit to the splash page
 * 
 * Call this when:
 * - User clicks any button on the splash page
 * - User navigates away from splash page
 * 
 * Updates both localStorage (persistent) and sessionStorage (prevents loops)
 */
export function markDailyVisitComplete(): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const todayDate = getTodayDateString();
    
    // Update last visit date in localStorage (persists across sessions)
    localStorage.setItem(LAST_VISIT_DATE_KEY, todayDate);
    
    // Mark splash as viewed in this session (prevents redirect loops)
    sessionStorage.setItem(SPLASH_VIEWED_SESSION_KEY, 'true');
    
    console.log('✅ Daily visit marked complete:', todayDate);
  } catch (error) {
    console.error('Error marking daily visit complete:', error);
  }
}

/**
 * Mark that the user has viewed the splash page (without navigation)
 * This sets the session flag to prevent redirect loops while on /home
 */
export function markSplashViewed(): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Mark splash as viewed in this session (prevents redirect loops)
    sessionStorage.setItem(SPLASH_VIEWED_SESSION_KEY, 'true');
    console.log('✅ Splash page viewed (session marked)');
  } catch (error) {
    console.error('Error marking splash viewed:', error);
  }
}

/**
 * Get the last visit date for debugging/testing purposes
 * 
 * @returns {string | null} Last visit date in YYYY-MM-DD format, or null if never visited
 */
export function getLastVisitDate(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(LAST_VISIT_DATE_KEY);
  } catch (error) {
    console.error('Error getting last visit date:', error);
    return null;
  }
}

/**
 * Clear visit tracking (useful for testing)
 * 
 * @example
 * ```ts
 * // Simulate "next day" by clearing the date
 * clearVisitTracking();
 * ```
 */
export function clearVisitTracking(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(LAST_VISIT_DATE_KEY);
    sessionStorage.removeItem(SPLASH_VIEWED_SESSION_KEY);
    console.log('🧹 Visit tracking cleared');
  } catch (error) {
    console.error('Error clearing visit tracking:', error);
  }
}

/**
 * Set a custom visit date (useful for testing "next day" scenarios)
 * 
 * @param {string} dateString - Date in YYYY-MM-DD format
 * 
 * @example
 * ```ts
 * // Simulate yesterday's visit
 * const yesterday = new Date();
 * yesterday.setDate(yesterday.getDate() - 1);
 * const dateStr = yesterday.toISOString().split('T')[0];
 * setCustomVisitDate(dateStr);
 * ```
 */
export function setCustomVisitDate(dateString: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LAST_VISIT_DATE_KEY, dateString);
    // Clear session flag so redirect can happen
    sessionStorage.removeItem(SPLASH_VIEWED_SESSION_KEY);
    console.log('🔧 Custom visit date set:', dateString);
  } catch (error) {
    console.error('Error setting custom visit date:', error);
  }
}
