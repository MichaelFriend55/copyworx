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
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { clerkUserId: userId },
      subscription_data: { metadata: { clerkUserId: userId } },
      success_url: `${baseUrl}/worxspace?subscription=success`,
      cancel_url: `${baseUrl}/pricing`,
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
    logger.error('Failed to create checkout session:', error);
    return internalErrorResponse(error) as NextResponse<ErrorResponse>;
  }
}
