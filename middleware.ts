/**
 * @file middleware.ts
 * @description Clerk authentication middleware for route protection (Clerk 5.x)
 * 
 * Protects all routes under /workspace, /templates, /projects
 * Keeps marketing pages, auth pages, and API routes public
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Define public routes that don't require authentication
 * 
 * Public routes:
 * - / (homepage)
 * - /about
 * - /pricing
 * - /sign-in, /sign-up (auth pages)
 * - /api/* (API routes - handle their own auth)
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/pricing',
  '/copyworx',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api(.*)',
]);

/**
 * Clerk middleware configuration
 * 
 * Uses clerkMiddleware with createRouteMatcher pattern (Clerk 5.x)
 * Protects all routes except those defined in isPublicRoute
 */
export default clerkMiddleware((auth, request) => {
  // If it's not a public route, require authentication
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

/**
 * Middleware matcher configuration
 * Specifies which routes the middleware should run on
 */
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
