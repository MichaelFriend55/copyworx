/**
 * @file app/api/usage/route.ts
 * @description API route to fetch user's API usage statistics
 * 
 * Queries the user_usage_summary view in Supabase to get aggregated
 * usage data for the authenticated user. Used by the useApiUsage hook.
 * 
 * @endpoint GET /api/usage
 * @auth Required (Clerk authentication)
 */

import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/utils/api-auth';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Success response structure
 */
interface UsageResponse {
  totalTokens: number;
  totalCost: number;
  totalApiCalls: number;
  lastApiCall: string | null;
}

/**
 * Error response structure
 */
interface ErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * GET /api/usage
 * 
 * Fetches the authenticated user's API usage statistics from Supabase.
 * Returns aggregated data from the user_usage_summary view.
 * 
 * @returns {UsageResponse} Aggregated usage statistics
 * @returns {ErrorResponse} Error details if request fails
 */
export async function GET(): Promise<NextResponse<UsageResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Check authentication
    // ------------------------------------------------------------------------
    
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Unauthorized',
          details: 'You must be logged in to view usage data',
        },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------------------
    // 2. Check Supabase configuration
    // ------------------------------------------------------------------------
    
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      logger.log('⚠️ Supabase not configured, returning zero usage');
      
      // Return zero usage if Supabase isn't configured
      // This allows the app to function in development without Supabase
      return NextResponse.json<UsageResponse>({
        totalTokens: 0,
        totalCost: 0,
        totalApiCalls: 0,
        lastApiCall: null,
      });
    }

    // ------------------------------------------------------------------------
    // 3. Query user_usage_summary view
    // ------------------------------------------------------------------------
    
    const { data, error } = await (supabaseAdmin
      .from('user_usage_summary') as any)
      .select('*')
      .eq('user_id', userId)
      .single();

    // Handle case where user has no usage records yet
    if (error && error.code === 'PGRST116') {
      // No rows found - user hasn't used the API yet
      logger.log('📊 No usage records found for user:', userId.substring(0, 8) + '...');
      
      return NextResponse.json<UsageResponse>({
        totalTokens: 0,
        totalCost: 0,
        totalApiCalls: 0,
        lastApiCall: null,
      });
    }

    if (error) {
      logger.error('❌ Failed to fetch usage data:', error);
      return NextResponse.json<ErrorResponse>(
        {
          error: 'Database error',
          details: 'Failed to fetch usage data. Please try again.',
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------------
    // 4. Return usage data
    // ------------------------------------------------------------------------
    
    logger.log('📊 Usage data fetched for user:', {
      userId: userId.substring(0, 8) + '...',
      totalCost: `$${data.total_cost_usd?.toFixed(4) || '0.0000'}`,
      totalTokens: data.total_tokens_used || 0,
    });

    return NextResponse.json<UsageResponse>({
      totalTokens: data.total_tokens_used || 0,
      totalCost: data.total_cost_usd || 0,
      totalApiCalls: data.total_api_calls || 0,
      lastApiCall: data.last_api_call || null,
    });

  } catch (error) {
    logger.error('❌ Unexpected error in /api/usage:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
