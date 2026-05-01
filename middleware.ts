/**
 * @file middleware.ts
 * @description Clerk authentication middleware with subscription gating (Clerk 5.x)
 *
 * Protects all routes under /worxspace, /templates, /projects.
 * Checks subscription status (stored in Clerk publicMetadata) and
 * redirects inactive users to /#pricing — unless the user has `is_admin`
 * set in the Supabase `users` table, which grants unconditional access.
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Routes accessible without authentication
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/home',
  '/pricing',
  '/subscription-expired',
  '/privacy',
  '/terms',
  '/cookies',
  '/disclaimer',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api(.*)',
]);

/**
 * Routes that require an active subscription in addition to authentication.
 * Pricing page is intentionally excluded so users can subscribe.
 */
const isSubscriptionRoute = createRouteMatcher([
  '/worxspace(.*)',
  '/projects(.*)',
  '/templates(.*)',
]);

/**
 * Check if a user has the is_admin flag set in Supabase.
 * Only called when the subscription check would otherwise fail,
 * so paying users incur no extra latency.
 */
async function isAdminUser(userId: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return false;
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return (data as { is_admin?: boolean }).is_admin === true;
  } catch {
    return false;
  }
}

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  const session = await auth();

  if (!session.userId) {
    return session.redirectToSignIn();
  }

  if (isSubscriptionRoute(request)) {
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev) {
      const metadata = session.sessionClaims?.metadata as
        | { subscriptionStatus?: string }
        | undefined;

      const status = metadata?.subscriptionStatus;

      if (status !== 'active' && status !== 'trialing') {
        const adminBypass = await isAdminUser(session.userId);
        if (!adminBypass) {
          const hasLapsedSubscription =
            status === 'cancelled' ||
            status === 'canceled' ||
            status === 'past_due';

          const redirectPath = hasLapsedSubscription
            ? '/subscription-expired'
            : '/#pricing';

          return NextResponse.redirect(new URL(redirectPath, request.url));
        }
      }
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
