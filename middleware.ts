/**
 * @file middleware.ts
 * @description Clerk authentication middleware for route protection
 * 
 * Protects all routes under /dashboard, /templates, /projects
 * Keeps marketing pages, auth pages, and API routes public
 */

import { authMiddleware } from '@clerk/nextjs';

/**
 * Clerk middleware configuration
 * 
 * Public routes:
 * - / (homepage)
 * - /about
 * - /pricing
 * - /sign-in, /sign-up (auth pages)
 * - /api/* (API routes)
 * - /_next/* (Next.js internals)
 * - Static files (favicon, images, etc.)
 * 
 * Protected routes:
 * - /dashboard
 * - /templates
 * - /projects
 * - All other routes under (app) group
 */
export default authMiddleware({
  // Routes that don't require authentication
  publicRoutes: [
    '/',
    '/about',
    '/pricing',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api(.*)',
  ],
  
  // Routes that are always accessible (static files, etc.)
  ignoredRoutes: [
    '/_next(.*)',
    '/favicon.ico',
    '/images(.*)',
    '/fonts(.*)',
  ],
});

/**
 * Middleware matcher configuration
 * Specifies which routes the middleware should run on
 */
export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    '/((?!.+\\.[\\w]+$|_next).*)',
    // Always run for API routes
    '/',
    '/(api|trpc)(.*)',
  ],
};

