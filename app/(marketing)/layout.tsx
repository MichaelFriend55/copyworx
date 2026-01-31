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

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
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
              <Link href="/worxspace">Worxspace</Link>
            </Button>
            <UserButton 
              afterSignOutUrl="/home"
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9 shadow-lg',
                  userButtonPopoverCard: 'shadow-xl border border-border/50',
                  userButtonPopoverActionButton: 'hover:bg-ink-50',
                  userButtonPopoverActionButtonText: 'text-ink-700',
                  userButtonPopoverActionButtonIcon: 'text-ink-500',
                  userButtonPopoverFooter: 'hidden',
                },
              }}
            />
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
