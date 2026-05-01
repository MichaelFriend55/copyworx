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
 * homepage instead of the pricing section. We need a browser-side navigation
 * to preserve the fragment.
 *
 * Why `window.location.replace` instead of `router.replace`:
 *
 * Next.js App Router has documented regressions where hash-fragment
 * navigation doesn't reliably trigger the browser's scroll-to-anchor
 * behavior (see vercel/next.js issues #46995, #88030, #88345). Using
 * `window.location.replace` bypasses the App Router entirely and performs
 * a full browser-level navigation, which honors the URL fragment and
 * guarantees native scroll-to-anchor. The trade-off is a full page reload,
 * which is fine here: this page renders nothing and holds no state worth
 * preserving.
 *
 * Trade-off: one extra round-trip + a brief blank flash. Acceptable.
 */

'use client';

import { useEffect } from 'react';

export default function PricingRedirect(): null {
  useEffect(() => {
    window.location.replace('/#pricing');
  }, []);

  return null;
}
