/**
 * @file app/api/stripe/billing-portal/route.ts
 * @description Creates a Stripe Billing Portal session for subscription management
 *
 * Allows authenticated users to:
 * - Cancel their subscription
 * - Update payment method
 * - Download invoices
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserId, unauthorizedResponse, internalErrorResponse } from '@/lib/utils/api-auth';
import { logger } from '@/lib/utils/logger';

interface BillingPortalResponse {
  url: string;
}

interface ErrorResponse {
  error: string;
  details: string;
}

export async function POST(): Promise<NextResponse<BillingPortalResponse | ErrorResponse>> {
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
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (dbError) {
      logger.error('Failed to look up user in database:', dbError);
      return NextResponse.json(
        { error: 'Database error', details: 'Unable to look up billing account.' },
        { status: 500 }
      );
    }

    if (!user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account', details: 'No billing account found. Please subscribe first.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${baseUrl}/worxspace`,
    });

    logger.log('Stripe billing portal session created', {
      sessionId: session.id,
      userId: userId.substring(0, 8) + '...',
    });

    return NextResponse.json<BillingPortalResponse>({ url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('[Stripe Billing Portal] StripeError caught:', {
        type: error.type,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        requestId: error.requestId,
        decline_code: (error as Stripe.errors.StripeCardError).decline_code,
        param: error.param,
        rawType: error.rawType,
        headers: error.headers,
      });
    } else if (error instanceof Error) {
      console.error('[Stripe Billing Portal] Non-Stripe error caught:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('[Stripe Billing Portal] Unknown error caught:', error);
    }

    console.error('[Stripe Billing Portal] Environment check:', {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...',
      nodeEnv: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
    });

    return internalErrorResponse(error) as NextResponse<ErrorResponse>;
  }
}
