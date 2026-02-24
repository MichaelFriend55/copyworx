/**
 * @file middleware.ts
 * @description Clerk authentication middleware with subscription gating (Clerk 5.x)
 *
 * Protects all routes under /worxspace, /templates, /projects.
 * Additionally checks subscription status (stored in Clerk publicMetadata)
 * and redirects inactive users to /pricing.
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Routes accessible without authentication
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/home',
  '/about',
  '/pricing',
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

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  const session = await auth();

  if (!session.userId) {
    return session.redirectToSignIn();
  }

  if (isSubscriptionRoute(request)) {
    const metadata = session.sessionClaims?.metadata as
      | { subscriptionStatus?: string }
      | undefined;

    const status = metadata?.subscriptionStatus;

    if (status !== 'active') {
      const pricingUrl = new URL('/pricing', request.url);
      return NextResponse.redirect(pricingUrl);
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
