/**
 * @file app/api/stripe/create-checkout-session/route.ts
 * @description Creates a Stripe Checkout session for the $49/month subscription
 *
 * Flow:
 * 1. Authenticate user via Clerk
 * 2. Create Stripe Checkout session with the price from STRIPE_PRICE_ID
 * 3. Pass Clerk user ID as metadata for webhook reconciliation
 * 4. Return the session URL for client-side redirect
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getUserId, unauthorizedResponse, internalErrorResponse } from '@/lib/utils/api-auth';
import { logger } from '@/lib/utils/logger';

interface CheckoutSessionResponse {
  url: string;
}

interface ErrorResponse {
  error: string;
  details: string;
}

export async function POST(): Promise<NextResponse<CheckoutSessionResponse | ErrorResponse>> {
  try {
    const userId = await getUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      logger.error('STRIPE_PRICE_ID is not configured');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Stripe price is not configured.' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      payment_method_collection: 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { clerkUserId: userId },
      subscription_data: {
        metadata: { clerkUserId: userId },
        trial_period_days: 7,
        trial_settings: {
          end_behavior: { missing_payment_method: 'cancel' },
        },
      },
      success_url: `${baseUrl}/worxspace?subscription=success`,
      cancel_url: `${baseUrl}/#pricing`,
    });

    if (!session.url) {
      logger.error('Stripe returned a session without a URL');
      return NextResponse.json(
        { error: 'Checkout error', details: 'Unable to create checkout session.' },
        { status: 500 }
      );
    }

    logger.log('Stripe checkout session created', {
      sessionId: session.id,
      userId: userId.substring(0, 8) + '...',
    });

    return NextResponse.json<CheckoutSessionResponse>({ url: session.url });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('[Stripe Checkout] StripeError caught:', {
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
      console.error('[Stripe Checkout] Non-Stripe error caught:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error('[Stripe Checkout] Unknown error caught:', error);
    }

    console.error('[Stripe Checkout] Environment check:', {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...',
      priceId: process.env.STRIPE_PRICE_ID,
      nodeEnv: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
    });

    return internalErrorResponse(error) as NextResponse<ErrorResponse>;
  }
}
