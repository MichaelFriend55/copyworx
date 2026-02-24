/**
 * @file lib/stripe.ts
 * @description Stripe client configuration for server-side and client-side usage
 *
 * Provides:
 * - Server-side Stripe instance for API routes (checkout sessions, webhook verification)
 * - Client-side loadStripe promise for Stripe.js (checkout redirect)
 */

import Stripe from 'stripe';
import { loadStripe, type Stripe as StripeClient } from '@stripe/stripe-js';

/**
 * Server-side Stripe instance
 * Uses the secret key — only import this in API routes / server code
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

/** Cached client-side Stripe promise (singleton) */
let stripePromise: Promise<StripeClient | null> | null = null;

/**
 * Get the client-side Stripe.js instance (lazy-loaded singleton)
 * Safe to call from React components
 */
export function getStripe(): Promise<StripeClient | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    );
  }
  return stripePromise;
}
