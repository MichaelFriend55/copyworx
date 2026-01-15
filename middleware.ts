import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Approved email addresses for full app access
 * Users not in this list will be redirected to the waitlist
 */
const approvedEmails = ['michaelfriend55@gmail.com'];

/**
 * Routes that require authentication
 */
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/copyworx(.*)',
  '/projects(.*)',
  '/templates(.*)',
]);

/**
 * Public routes accessible without authentication
 * Includes waitlist page for unapproved users
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/waitlist',
  '/about',
  '/pricing',
  '/api(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Protect routes that require authentication
  if (isProtectedRoute(request)) {
    // If not authenticated, redirect to sign-in
    if (!userId) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Fetch user data to check email
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const userEmail = user.emailAddresses[0]?.emailAddress;

      // Check if user's email is in the approved list
      if (!userEmail || !approvedEmails.includes(userEmail)) {
        // User is not approved - redirect to waitlist
        const waitlistUrl = new URL('/waitlist', request.url);
        return NextResponse.redirect(waitlistUrl);
      }

      // User is approved - allow access
      return NextResponse.next();
    } catch (error) {
      // If we can't verify the user, redirect to waitlist for safety
      console.error('Error fetching user data:', error);
      const waitlistUrl = new URL('/waitlist', request.url);
      return NextResponse.redirect(waitlistUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
