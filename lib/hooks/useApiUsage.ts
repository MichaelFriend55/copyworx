/**
 * @file lib/hooks/useApiUsage.ts
 * @description React hook to fetch and track user's API usage from Supabase
 * 
 * Features:
 * - Fetches total tokens and cost from api_usage_logs
 * - Tracks progress toward $5.00 beta limit
 * - Caches results for 30 seconds to minimize DB calls
 * - Refetches on window focus for fresh data
 * - Provides loading and error states
 * 
 * @requires /api/usage endpoint to fetch server-side data
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

// ============================================================================
// Constants
// ============================================================================

/** Beta usage limit in USD */
const BETA_LIMIT_USD = 5.00;

/** Cache duration in milliseconds (30 seconds) */
const CACHE_DURATION_MS = 30_000;

// ============================================================================
// Types
// ============================================================================

/**
 * API response structure from /api/usage endpoint
 */
interface UsageApiResponse {
  totalTokens: number;
  totalCost: number;
  totalApiCalls: number;
  lastApiCall: string | null;
}

/**
 * Error response structure
 */
interface UsageApiError {
  error: string;
  details?: string;
}

/**
 * Return type for useApiUsage hook
 */
export interface ApiUsageData {
  /** Total cost in USD spent by the user */
  totalCost: number;
  
  /** Total number of tokens used (input + output) */
  totalTokens: number;
  
  /** Whether data is currently being fetched */
  isLoading: boolean;
  
  /** Whether user has reached or exceeded the $5.00 beta limit */
  isOverLimit: boolean;
  
  /** Remaining budget in USD (5.00 - totalCost) */
  remainingBudget: number;
  
  /** Percentage of budget used (0-100+) */
  percentUsed: number;
  
  /** Total number of API calls made */
  totalApiCalls: number;
  
  /** Timestamp of last API call, or null if none */
  lastApiCall: Date | null;
  
  /** Error message if fetch failed, null otherwise */
  error: string | null;
  
  /** Function to manually trigger a refetch */
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to fetch and track user's API usage
 * 
 * Fetches usage data from the /api/usage endpoint, caches results for 30 seconds,
 * and automatically refetches when the user returns to the tab.
 * 
 * @returns {ApiUsageData} Object containing usage stats and control functions
 * 
 * @example
 * ```tsx
 * function UsageDisplay() {
 *   const { 
 *     totalCost, 
 *     remainingBudget, 
 *     isOverLimit, 
 *     percentUsed,
 *     isLoading,
 *     refetch 
 *   } = useApiUsage();
 * 
 *   if (isLoading) return <Spinner />;
 * 
 *   return (
 *     <div>
 *       <p>Spent: ${totalCost.toFixed(2)} / $5.00</p>
 *       <p>Remaining: ${remainingBudget.toFixed(2)}</p>
 *       <progress value={percentUsed} max={100} />
 *       {isOverLimit && <p>You've reached your usage limit!</p>}
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useApiUsage(): ApiUsageData {
  // Get current user from Clerk
  const { user, isLoaded: isUserLoaded } = useUser();
  
  // State for usage data
  const [totalCost, setTotalCost] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [totalApiCalls, setTotalApiCalls] = useState<number>(0);
  const [lastApiCall, setLastApiCall] = useState<Date | null>(null);
  
  // State for loading and error handling
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track last fetch timestamp for caching
  const lastFetchTime = useRef<number>(0);
  
  // Ref to prevent concurrent fetches
  const isFetching = useRef<boolean>(false);

  /**
   * Fetch usage data from the API
   * Respects cache duration unless force=true
   */
  const fetchUsage = useCallback(async (force: boolean = false): Promise<void> => {
    // Skip if no user is logged in
    if (!user?.id) {
      setIsLoading(false);
      setTotalCost(0);
      setTotalTokens(0);
      setTotalApiCalls(0);
      setLastApiCall(null);
      return;
    }

    // Check cache validity (skip fetch if data is fresh)
    const now = Date.now();
    if (!force && lastFetchTime.current > 0 && now - lastFetchTime.current < CACHE_DURATION_MS) {
      return;
    }

    // Prevent concurrent fetches
    if (isFetching.current) {
      return;
    }

    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/usage', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData: UsageApiError = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch usage data');
      }

      const data: UsageApiResponse = await response.json();

      // Update state with fetched data
      setTotalCost(data.totalCost);
      setTotalTokens(data.totalTokens);
      setTotalApiCalls(data.totalApiCalls);
      setLastApiCall(data.lastApiCall ? new Date(data.lastApiCall) : null);
      
      // Update cache timestamp
      lastFetchTime.current = Date.now();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching usage';
      setError(errorMessage);
      console.error('❌ useApiUsage fetch error:', errorMessage);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [user?.id]);

  /**
   * Manual refetch function (exposed to consumers)
   * Always forces a fresh fetch, ignoring cache
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchUsage(true);
  }, [fetchUsage]);

  /**
   * Initial fetch when user is loaded
   */
  useEffect(() => {
    if (isUserLoaded) {
      fetchUsage();
    }
  }, [isUserLoaded, fetchUsage]);

  /**
   * Refetch on window focus (tab visibility change)
   * Only refetches if cache has expired
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        // Only fetch if cache has expired
        fetchUsage(false);
      }
    };

    const handleFocus = (): void => {
      // Only fetch if cache has expired
      fetchUsage(false);
    };

    // Listen for both visibility change and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchUsage]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  /** Whether user has exceeded the beta limit */
  const isOverLimit = totalCost >= BETA_LIMIT_USD;

  /** Remaining budget (can be negative if over limit) */
  const remainingBudget = Math.max(0, BETA_LIMIT_USD - totalCost);

  /** Percentage of budget used (can exceed 100%) */
  const percentUsed = (totalCost / BETA_LIMIT_USD) * 100;

  // ============================================================================
  // Return Value
  // ============================================================================

  return {
    totalCost,
    totalTokens,
    isLoading,
    isOverLimit,
    remainingBudget,
    percentUsed,
    totalApiCalls,
    lastApiCall,
    error,
    refetch,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default useApiUsage;
