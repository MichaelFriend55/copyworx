/**
 * @file lib/utils/api-auth.ts
 * @description Authentication and usage limit utilities for API routes
 * 
 * Provides helper functions to:
 * - Get authenticated user ID from Clerk
 * - Check if user is within API usage limits
 * - Create standardized error responses
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

/**
 * Error response for unauthorized requests
 */
export interface UnauthorizedResponse {
  error: string;
  details: string;
}

/**
 * Get the authenticated user ID from Clerk
 * Returns null if no user is authenticated
 */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get the authenticated user ID or throw an error
 * Use this when authentication is required
 */
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  
  return userId;
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(): NextResponse<UnauthorizedResponse> {
  return NextResponse.json(
    { 
      error: 'Unauthorized',
      details: 'You must be logged in to access this resource'
    },
    { status: 401 }
  );
}

/**
 * Create a not found response
 */
export function notFoundResponse(resource: string): NextResponse {
  return NextResponse.json(
    { 
      error: 'Not found',
      details: `${resource} not found`
    },
    { status: 404 }
  );
}

/**
 * Create a bad request response
 */
export function badRequestResponse(message: string): NextResponse {
  return NextResponse.json(
    { 
      error: 'Bad request',
      details: message
    },
    { status: 400 }
  );
}

/**
 * Create an internal error response
 */
export function internalErrorResponse(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  return NextResponse.json(
    { 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    },
    { status: 500 }
  );
}

/**
 * Create a 403 response for project ownership failures.
 *
 * Use this only after an ownership query succeeds but returns no rows
 * (meaning the project either does not exist or does not belong to the
 * authenticated user). The message is user-displayable as-is.
 */
export function projectAccessDeniedResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'Forbidden',
      details: 'Project not found or access denied',
    },
    { status: 403 }
  );
}

/**
 * Result of a project ownership check.
 *
 * - `ok: true`  — the authenticated user owns the project. Proceed.
 * - `ok: false` — caller must return `response` directly. The helper
 *   distinguishes between an infrastructure error (500) and a legitimate
 *   access-denied (403) via its own logic; callers do not need to branch.
 */
export type ProjectOwnershipResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Verify that a given project_id exists AND belongs to the authenticated user.
 *
 * Error contract (spec-mandated):
 * - Query execution error (DB down, malformed query, unexpected exception)
 *   → 500 Internal Server Error. This is distinct from an access denial and
 *   must not be conflated — precision on error codes matters for debugging.
 * - Query succeeds, no rows returned → 403 "Project not found or access denied".
 *   The authenticated user either supplied a non-existent id or tried to touch
 *   another user's project. We deliberately do not distinguish between these
 *   two cases in the response (no user enumeration).
 * - Query succeeds, row returned → `ok: true`.
 *
 * @param supabase - Supabase admin client
 * @param projectId - UUID of the project to validate
 * @param userId - Clerk user ID of the authenticated caller
 */
export async function verifyProjectOwnership(
  supabase: { from: (table: string) => any },
  projectId: string,
  userId: string
): Promise<ProjectOwnershipResult> {
  try {
    const { data, error } = await (supabase.from('projects') as any)
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('❌ Project ownership query failed:', error);
      return { ok: false, response: internalErrorResponse(error) };
    }

    if (!data) {
      return { ok: false, response: projectAccessDeniedResponse() };
    }

    return { ok: true };
  } catch (err) {
    logger.error('❌ Project ownership check threw:', err);
    return { ok: false, response: internalErrorResponse(err) };
  }
}

// ============================================================================
// Admin Check
// ============================================================================

/**
 * Check if a user has admin privileges in the database.
 * Admin users bypass subscription gating and usage limits.
 *
 * @param userId - Clerk user ID to check
 * @returns true if the user's `is_admin` flag is set in the `users` table
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return false;
  }

  try {
    const { data, error } = await (supabaseAdmin
      .from('users') as any)
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_admin === true;
  } catch {
    return false;
  }
}

// ============================================================================
// Usage Limit Checking
// ============================================================================

/** Monthly AI usage limit in USD */
const MONTHLY_LIMIT_USD = 5.00;

/**
 * Result of usage limit check
 */
export interface UsageLimitResult {
  /** Whether user is within the usage limit */
  withinLimit: boolean;
  /** Total cost spent by user in USD */
  totalCost: number;
  /** Remaining budget in USD */
  remainingBudget: number;
  /** The limit amount in USD */
  limit: number;
}

/**
 * Response structure for usage limit exceeded error
 */
export interface UsageLimitExceededResponse {
  error: string;
  details: string;
  usage: {
    totalCost: number;
    limit: number;
    percentUsed: number;
  };
}

/**
 * Check if a user is within their API usage limit
 * 
 * Queries the api_usage_logs table to sum up the user's total cost
 * and compares against the monthly limit ($5.00).
 * 
 * @param userId - Clerk user ID to check
 * @returns UsageLimitResult with limit status and usage details
 * 
 * @example
 * ```ts
 * const result = await checkUserWithinLimit(userId);
 * if (!result.withinLimit) {
 *   return usageLimitExceededResponse(result.totalCost);
 * }
 * ```
 */
export async function checkUserWithinLimit(userId: string): Promise<UsageLimitResult> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    logger.log('⚠️ Supabase not configured, skipping usage limit check');
    return {
      withinLimit: true,
      totalCost: 0,
      remainingBudget: MONTHLY_LIMIT_USD,
      limit: MONTHLY_LIMIT_USD,
    };
  }

  const isAdmin = await checkIsAdmin(userId);
  if (isAdmin) {
    logger.log('👑 Admin user — bypassing usage limit');
    return {
      withinLimit: true,
      totalCost: 0,
      remainingBudget: Infinity,
      limit: MONTHLY_LIMIT_USD,
    };
  }

  try {
    // Query the user_usage_summary view for aggregated usage
    const { data, error } = await (supabaseAdmin
      .from('user_usage_summary') as any)
      .select('total_cost_usd')
      .eq('user_id', userId)
      .single();

    // Handle case where user has no usage records yet
    if (error && error.code === 'PGRST116') {
      // No rows found - user hasn't used the API yet
      logger.log('📊 No usage records found for user, within limit');
      return {
        withinLimit: true,
        totalCost: 0,
        remainingBudget: MONTHLY_LIMIT_USD,
        limit: MONTHLY_LIMIT_USD,
      };
    }

    if (error) {
      // Log error but default to allowing the request
      // We don't want to block users due to database errors
      logger.error('❌ Error checking usage limit:', error);
      return {
        withinLimit: true,
        totalCost: 0,
        remainingBudget: MONTHLY_LIMIT_USD,
        limit: MONTHLY_LIMIT_USD,
      };
    }

    const totalCost = data?.total_cost_usd || 0;
    const withinLimit = totalCost < MONTHLY_LIMIT_USD;
    const remainingBudget = Math.max(0, MONTHLY_LIMIT_USD - totalCost);

    logger.log('📊 Usage limit check:', {
      userId: userId.substring(0, 8) + '...',
      totalCost: `$${totalCost.toFixed(4)}`,
      withinLimit,
      remainingBudget: `$${remainingBudget.toFixed(4)}`,
    });

    return {
      withinLimit,
      totalCost,
      remainingBudget,
      limit: MONTHLY_LIMIT_USD,
    };
  } catch (err) {
    // Log error but default to allowing the request
    logger.error('❌ Exception checking usage limit:', err);
    return {
      withinLimit: true,
      totalCost: 0,
      remainingBudget: MONTHLY_LIMIT_USD,
      limit: MONTHLY_LIMIT_USD,
    };
  }
}

/**
 * Create a 403 response for when user exceeds usage limit
 * 
 * @param totalCost - User's current total cost
 * @returns NextResponse with 403 status and usage details
 */
export function usageLimitExceededResponse(totalCost: number): NextResponse<UsageLimitExceededResponse> {
  const percentUsed = Math.round((totalCost / MONTHLY_LIMIT_USD) * 100);
  
  return NextResponse.json<UsageLimitExceededResponse>(
    {
      error: 'Usage limit exceeded',
      details: `API usage limit reached ($${MONTHLY_LIMIT_USD.toFixed(2)}). Please contact support to continue.`,
      usage: {
        totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
        limit: MONTHLY_LIMIT_USD,
        percentUsed,
      },
    },
    { status: 403 }
  );
}
