/**
 * @file app/api/stripe/webhook/route.ts
 * @description Handles Stripe webhook events for subscription lifecycle
 *
 * Events handled:
 * - checkout.session.completed  → activate subscription, store customer ID
 * - customer.subscription.updated → sync status changes (past_due, active, etc.)
 * - customer.subscription.deleted → mark subscription as cancelled
 *
 * Updates both Supabase (source of truth) and Clerk publicMetadata
 * so middleware can gate routes without a DB roundtrip.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { clerkClient } from '@clerk/nextjs/server';
import { logger } from '@/lib/utils/logger';
import type Stripe from 'stripe';

/**
 * Upsert the users row in Supabase with subscription data.
 * Uses supabaseAdmin (service role) to bypass RLS.
 */
async function upsertSubscription(
  clerkUserId: string,
  fields: {
    stripe_customer_id?: string;
    subscription_status: string;
    subscription_end_date?: string | null;
  }
): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    logger.warn('Supabase not configured — skipping subscription upsert');
    return;
  }

  const { error } = await (supabaseAdmin.from('users') as any).upsert(
    {
      user_id: clerkUserId,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    logger.error('Failed to upsert subscription in Supabase:', error);
    throw error;
  }
}

/**
 * Mirror subscription_status into Clerk publicMetadata
 * so middleware can check it without hitting the database.
 */
async function syncClerkMetadata(
  clerkUserId: string,
  subscriptionStatus: string
): Promise<void> {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { subscriptionStatus },
    });
    logger.log('Clerk metadata synced', { clerkUserId: clerkUserId.substring(0, 8) + '...', subscriptionStatus });
  } catch (error) {
    logger.error('Failed to sync Clerk metadata:', error);
  }
}

/**
 * Extract the Clerk user ID from Stripe object metadata.
 * Checks subscription metadata first, then session metadata.
 */
function extractClerkUserId(
  subscription?: Stripe.Subscription | null,
  session?: Stripe.Checkout.Session | null
): string | null {
  const fromSub = subscription?.metadata?.clerkUserId;
  if (fromSub) return fromSub;
  const fromSession = session?.metadata?.clerkUserId;
  if (fromSession) return fromSession;
  return null;
}

// Stripe sends raw body — disable Next.js body parsing
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  logger.log('Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.clerkUserId;

        if (!clerkUserId) {
          logger.error('checkout.session.completed missing clerkUserId metadata');
          break;
        }

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null;

        let endDate: string | null = null;
        if (session.subscription) {
          const subId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          const firstItem = sub.items.data[0];
          if (firstItem) {
            endDate = new Date(firstItem.current_period_end * 1000).toISOString();
          }
        }

        await upsertSubscription(clerkUserId, {
          stripe_customer_id: customerId ?? undefined,
          subscription_status: 'active',
          subscription_end_date: endDate,
        });

        await syncClerkMetadata(clerkUserId, 'active');

        logger.log('Subscription activated for', clerkUserId.substring(0, 8) + '...');
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId = extractClerkUserId(subscription);

        if (!clerkUserId) {
          logger.error('customer.subscription.updated missing clerkUserId metadata');
          break;
        }

        const status = subscription.status === 'active' ? 'active' : subscription.status;
        const firstItem = subscription.items.data[0];
        const endDate = firstItem
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : null;

        await upsertSubscription(clerkUserId, {
          subscription_status: status,
          subscription_end_date: endDate,
        });

        await syncClerkMetadata(clerkUserId, status);

        logger.log('Subscription updated to', status, 'for', clerkUserId.substring(0, 8) + '...');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId = extractClerkUserId(subscription);

        if (!clerkUserId) {
          logger.error('customer.subscription.deleted missing clerkUserId metadata');
          break;
        }

        await upsertSubscription(clerkUserId, {
          subscription_status: 'cancelled',
          subscription_end_date: null,
        });

        await syncClerkMetadata(clerkUserId, 'cancelled');

        logger.log('Subscription cancelled for', clerkUserId.substring(0, 8) + '...');
        break;
      }

      default:
        logger.log('Unhandled Stripe event type:', event.type);
    }
  } catch (error) {
    logger.error('Error processing webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
