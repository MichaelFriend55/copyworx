/**
 * @file app/(marketing)/layout.tsx
 * @description Layout for marketing pages (public-facing).
 *
 * Includes:
 * - Sticky top Navbar (auth-aware via Clerk - replaces the previous
 *   floating top-right auth widget so there is a single source of nav
 *   chrome and no z-index collisions).
 * - Marketing footer.
 */

import { Navbar } from '@/components/layout/navbar';
import { MarketingFooter } from '@/components/layout/marketing-footer';

/**
 * Marketing layout component.
 *
 * Wraps all public-facing pages with the sticky Navbar and footer. The
 * Navbar handles its own client-side state (scroll-shadow, mobile menu,
 * auth-state branching) so this layout can stay a server component.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
