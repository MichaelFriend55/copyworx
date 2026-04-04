/**
 * @file app/(marketing)/layout.tsx
 * @description Layout for marketing pages (public-facing)
 * 
 * Includes:
 * - Minimal auth header (Clerk only, no navigation)
 * - Footer
 * - No navbar - hero starts at top
 */

'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import UserMenu from '@/components/layout/user-menu';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MarketingFooter } from '@/components/layout/marketing-footer';

/**
 * Marketing layout component
 * 
 * Wraps all public-facing pages with minimal auth header and footer.
 * No navigation bar - just Clerk auth components.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal Auth Header - Fixed top right */}
      <div className="fixed top-0 right-0 z-50 p-4">
        <div className="flex items-center gap-4">
          {/* Show when user IS signed in */}
          <SignedIn>
            <Button variant="ghost" className="bg-gradient-to-r from-[#006EE6] to-[#A755F7] text-white hover:opacity-90" asChild>
              <Link href="/worxspace">My Worxspace</Link>
            </Button>
            <UserMenu />
          </SignedIn>

          {/* Show when user is NOT signed in */}
          <SignedOut>
            <Button variant="ghost" className="bg-white/80 backdrop-blur-sm hover:bg-white" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </SignedOut>
        </div>
      </div>

      <main className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
