/**
 * @file app/(marketing)/pricing/page.tsx
 * @description Client-side redirect from /pricing to /#pricing.
 *
 * The standalone /pricing page was retired; the homepage is now the single
 * source of truth for pricing. Visitors arriving at /pricing (old bookmarks,
 * SEO results, external links, the Stripe cancel_url, the in-app middleware
 * gate for inactive subscribers, etc.) need to land on the homepage scrolled
 * to the #pricing section.
 *
 * Why this is a client component instead of a next.config.js redirect:
 *
 * Next.js server-side redirects (both `redirects()` in next.config.js and
 * `NextResponse.redirect()` in middleware) STRIP URL fragments — a 308 to
 * "/#pricing" reaches the browser as "/" and the user sees the top of the
 * homepage instead of the pricing section. Client-side navigation via
 * `router.replace()` does NOT strip fragments, so we render this tiny page
 * for ~50–100ms, then bounce to "/#pricing" with the fragment intact.
 *
 * Trade-off: one extra round-trip + a brief blank flash. Acceptable.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PricingRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/#pricing');
  }, [router]);

  return null;
}
