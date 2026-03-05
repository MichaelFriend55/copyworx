/**
 * @file app/api/subscription/status/route.ts
 * @description Returns the authenticated user's subscription status and trial end date
 *
 * Used by the trial banner component to display days remaining.
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserId, unauthorizedResponse, internalErrorResponse } from '@/lib/utils/api-auth';
import { logger } from '@/lib/utils/logger';

interface StatusResponse {
  status: string | null;
  endDate: string | null;
}

interface ErrorResponse {
  error: string;
  details: string;
}

export async function GET(): Promise<NextResponse<StatusResponse | ErrorResponse>> {
  try {
    const userId = await getUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    if (!supabaseAdmin) {
      logger.error('Supabase admin client is not configured');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Database is not configured.' },
        { status: 500 }
      );
    }

    const { data: user, error: dbError } = await (supabaseAdmin
      .from('users') as any)
      .select('subscription_status, subscription_end_date')
      .eq('user_id', userId)
      .single();

    if (dbError) {
      logger.error('Failed to look up subscription status:', dbError);
      return NextResponse.json(
        { error: 'Database error', details: 'Unable to look up subscription status.' },
        { status: 500 }
      );
    }

    logger.log('Subscription status fetched', {
      userId: userId.substring(0, 8) + '...',
      status: user?.subscription_status ?? 'none',
    });

    return NextResponse.json<StatusResponse>({
      status: user?.subscription_status ?? null,
      endDate: user?.subscription_end_date ?? null,
    });
  } catch (error) {
    return internalErrorResponse(error) as NextResponse<ErrorResponse>;
  }
}
