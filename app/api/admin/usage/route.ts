/**
 * @file app/api/admin/usage/route.ts
 * @description Admin API route to fetch all users' API usage statistics
 * 
 * Protected endpoint - only accessible to admin users.
 * Returns aggregated usage data for all users from api_usage_logs.
 * 
 * @endpoint GET /api/admin/usage
 * @auth Required (Admin only)
 */

import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Constants
// ============================================================================

/** Admin email addresses that can access this endpoint */
const ADMIN_EMAILS = ['michaelfriend55@gmail.com'];

// ============================================================================
// Types
// ============================================================================

/**
 * User usage record structure
 */
interface UserUsageRecord {
  userId: string;
  totalApiCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  lastApiCall: string | null;
  percentOfLimit: number;
  isOverLimit: boolean;
}

/**
 * Success response structure
 */
interface AdminUsageResponse {
  users: UserUsageRecord[];
  summary: {
    totalUsers: number;
    totalCost: number;
    averageCostPerUser: number;
    usersOverLimit: number;
  };
  fetchedAt: string;
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
 * GET /api/admin/usage
 * 
 * Fetches all users' API usage statistics for admin dashboard.
 * Only accessible to admin users defined in ADMIN_EMAILS.
 */
export async function GET(): Promise<NextResponse<AdminUsageResponse | ErrorResponse>> {
  try {
    // ------------------------------------------------------------------------
    // 1. Verify admin access
    // ------------------------------------------------------------------------
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Unauthorized', details: 'You must be logged in' },
        { status: 401 }
      );
    }

    // Get current user's email
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (!userEmail || !ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      logger.log('🚫 Non-admin user attempted to access admin usage:', {
        userId: userId.substring(0, 8) + '...',
        email: userEmail || 'unknown',
      });
      
      return NextResponse.json<ErrorResponse>(
        { error: 'Forbidden', details: 'Admin access required' },
        { status: 403 }
      );
    }

    logger.log('✅ Admin access granted:', userEmail);

    // ------------------------------------------------------------------------
    // 2. Check Supabase configuration
    // ------------------------------------------------------------------------
    
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Service unavailable', details: 'Database not configured' },
        { status: 503 }
      );
    }

    // ------------------------------------------------------------------------
    // 3. Fetch all users' usage from user_usage_summary view
    // ------------------------------------------------------------------------
    
    const { data, error } = await (supabaseAdmin
      .from('user_usage_summary') as any)
      .select('*')
      .order('total_cost_usd', { ascending: false });

    if (error) {
      logger.error('❌ Failed to fetch admin usage data:', error);
      return NextResponse.json<ErrorResponse>(
        { error: 'Database error', details: 'Failed to fetch usage data' },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------------
    // 4. Transform data and calculate summary
    // ------------------------------------------------------------------------
    
    const BETA_LIMIT = 5.00;
    
    const users: UserUsageRecord[] = (data || []).map((row: any) => ({
      userId: row.user_id,
      totalApiCalls: row.total_api_calls || 0,
      totalInputTokens: row.total_input_tokens || 0,
      totalOutputTokens: row.total_output_tokens || 0,
      totalTokens: row.total_tokens_used || 0,
      totalCost: row.total_cost_usd || 0,
      lastApiCall: row.last_api_call || null,
      percentOfLimit: ((row.total_cost_usd || 0) / BETA_LIMIT) * 100,
      isOverLimit: (row.total_cost_usd || 0) >= BETA_LIMIT,
    }));

    const totalCost = users.reduce((sum, u) => sum + u.totalCost, 0);
    const usersOverLimit = users.filter(u => u.isOverLimit).length;

    const summary = {
      totalUsers: users.length,
      totalCost,
      averageCostPerUser: users.length > 0 ? totalCost / users.length : 0,
      usersOverLimit,
    };

    logger.log('📊 Admin usage data fetched:', {
      totalUsers: summary.totalUsers,
      totalCost: `$${summary.totalCost.toFixed(4)}`,
    });

    // ------------------------------------------------------------------------
    // 5. Return response
    // ------------------------------------------------------------------------
    
    return NextResponse.json<AdminUsageResponse>({
      users,
      summary,
      fetchedAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('❌ Unexpected error in admin usage API:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
