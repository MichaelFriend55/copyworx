/**
 * @file components/layout/navbar.tsx
 * @description Sticky top navigation for the marketing site.
 *
 * Layout (Jakob's Law - standard SaaS pattern):
 *   [logo]  ........  [Features Demo Pricing FAQ]  ........  [Log in] [Try Free]
 *
 * Behavior:
 * - Sticky to the top of the viewport.
 * - Soft bottom border + shadow appears only after the user scrolls
 *   (Aesthetic-Usability Effect - chrome stays quiet at rest).
 * - Anchor links use the `/#section` form so they work from any page.
 *   On the homepage, clicks are intercepted and smooth-scroll to the
 *   target. On any other page, Next.js performs a normal route change to
 *   `/` and the browser jumps to the fragment automatically.
 * - Active route highlighting via `usePathname()` for non-hash links
 *   (e.g. when on /demo the Demo link gets a subtle filled state).
 * - Mobile (< md): center links + secondary auth link collapse into a
 *   hamburger drawer. The Try Free CTA stays visible at all breakpoints
 *   because it is the primary conversion action.
 * - Auth-aware: when signed out, shows Log in + Try Free; when signed in,
 *   shows My Worxspace + UserMenu (no Try Free since the user has already
 *   converted).
 *
 * Accessibility:
 * - Semantic <nav> wrapped in <header>, with aria-label="Primary".
 * - Hamburger is a real <button> with aria-expanded, aria-controls,
 *   aria-label that reflects open/closed state.
 * - Tab order follows visual order: logo -> center links -> auth -> CTA.
 * - Active link carries aria-current="page".
 * - Every interactive element on mobile is at least 44x44 px (Fitts's Law).
 *
 * Design tokens (from tailwind.config.ts / globals.css - no new tokens):
 * - Logo image: /copyworx-logo-v2.png at h-8.
 * - Try Free gradient: from-[#006EE6] to-[#A755F7] (matches the homepage
 *   primary CTA exactly).
 * - Text colors: ink-600 / ink-700 / ink-900.
 * - Hover surface: ink-50.
 * - Active surface: ink-100.
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import UserMenu from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavLink {
  readonly href: string;
  readonly label: string;
}

/**
 * Center nav links - order is fixed by spec.
 *
 * Hash hrefs are written as `/#section` (not `#section`) so that clicking
 * them from any page (e.g. /sign-in) navigates to the homepage and then
 * jumps to the anchor. When the user is already on the homepage,
 * `handleNavClick` intercepts the click and smooth-scrolls instead.
 *
 * All four entries are now hash links: the marketing site's pricing,
 * features, demo, and FAQ all live as sections on the homepage.
 */
const NAV_LINKS: readonly NavLink[] = [
  { href: '/#features', label: 'Features' },
  { href: '/#demo', label: 'Demo' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
] as const;

/**
 * Try Free CTA classes - identical gradient + text treatment to the
 * homepage hero "Start Your 7-Day Free Trial" button. h-11 on mobile to
 * guarantee a 44x44 touch target; h-10 on md+ for a tighter nav rhythm.
 */
const TRY_FREE_CLASSES =
  'bg-gradient-to-r from-[#006EE6] to-[#A755F7] text-white hover:opacity-90 ' +
  'font-semibold h-11 md:h-10 px-5 transition-all duration-200 shadow-sm';

/** Pixel threshold past which the sticky bar gains its border + shadow. */
const SCROLL_BORDER_THRESHOLD = 8;

/**
 * Click handler for nav links. Intercepts homepage anchor links so they
 * smooth-scroll instead of replacing the URL fragment without animation.
 *
 * Behavior:
 * - Anchor href (`/#section`) AND already on `/`: preventDefault, smooth
 *   scroll to the target, push the hash to history. No re-navigation.
 * - Anchor href (`/#section`) on any other page: do nothing here so
 *   Next.js's <Link> performs a normal route change to `/` - the browser
 *   then jumps to the fragment automatically.
 * - Page href (e.g. `/sign-in`): do nothing here, normal navigation.
 *
 * `onComplete` always fires (used to close the mobile drawer regardless
 * of which branch we took).
 *
 * @param event      Synthetic click event from the link
 * @param href       href value (e.g. "/#features" or "/sign-in")
 * @param pathname   Current route pathname (from `usePathname()`)
 * @param onComplete Optional callback invoked once handling is done
 */
function handleNavClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string | null,
  onComplete?: () => void
): void {
  if (href.startsWith('/#') && pathname === '/') {
    const hash = href.slice(1);
    const target = typeof document !== 'undefined' ? document.querySelector(hash) : null;
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', hash);
    }
  }
  onComplete?.();
}

/**
 * Determine whether a nav link should be rendered as the active page.
 * Hash links never claim active state - they're in-page anchors.
 *
 * @param href     The link's href
 * @param pathname Current route pathname from next/navigation
 */
function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href.includes('#')) return false;
  return pathname === href;
}

/**
 * Top navigation bar for the marketing site.
 *
 * Renders a sticky header that adapts auth state via Clerk. Designed to be
 * the only top-level chrome on marketing pages - no other nav/header
 * components should be mounted alongside it.
 */
export function Navbar(): React.ReactElement {
  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);
  const [isScrolled, setIsScrolled] = React.useState<boolean>(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const onScroll = (): void => {
      setIsScrolled(window.scrollY > SCROLL_BORDER_THRESHOLD);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const closeMenu = React.useCallback(() => setIsMenuOpen(false), []);

  return (
    <header
      className={cn(
        'sticky top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md',
        'transition-shadow duration-200 ease-out',
        isScrolled
          ? 'border-b border-border/60 shadow-sm'
          : 'border-b border-transparent'
      )}
    >
      <nav aria-label="Primary" className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-24 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="CopyWorx Studio - Home"
            className="flex h-11 items-center transition-opacity duration-150 hover:opacity-80"
          >
            <Image
              src="/copyworx-logo-v2.png"
              alt="CopyWorx Studio"
              width={200}
              height={50}
              priority
              className="h-12 w-auto"
            />
          </Link>

          <ul className="hidden md:flex md:items-center md:gap-1 lg:gap-2">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={(event) => handleNavClick(event, link.href, pathname, closeMenu)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex items-center rounded-md px-3 py-2 text-base font-medium transition-colors duration-150',
                      active
                        ? 'bg-ink-100 text-ink-900 font-semibold'
                        : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <SignedOut>
              <Button
                variant="ghost"
                asChild
                className="hidden h-10 px-4 text-ink-700 hover:text-ink-900 md:inline-flex"
              >
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button asChild className={TRY_FREE_CLASSES}>
                <Link href="/sign-up">Try Free</Link>
              </Button>
            </SignedOut>

            <SignedIn>
              <Button
                variant="ghost"
                asChild
                className="hidden h-10 px-4 text-ink-700 hover:text-ink-900 md:inline-flex"
              >
                <Link href="/worxspace">My Worxspace</Link>
              </Button>
              <div className="hidden md:flex md:items-center">
                <UserMenu />
              </div>
              <div className="flex items-center md:hidden">
                <UserMenu />
              </div>
            </SignedIn>

            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="primary-mobile-menu"
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-md md:hidden',
                'text-ink-700 transition-colors duration-150 hover:bg-ink-50 hover:text-ink-900'
              )}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <div
          id="primary-mobile-menu"
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-200 ease-out md:hidden',
            isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <ul className="space-y-1 py-3">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={(event) => handleNavClick(event, link.href, pathname, closeMenu)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-[44px] items-center rounded-md px-3 py-3 text-base transition-colors duration-150',
                      active
                        ? 'bg-ink-100 text-ink-900 font-semibold'
                        : 'font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}

            <li className="mt-2 border-t border-border pt-2">
              <SignedOut>
                <Link
                  href="/sign-in"
                  onClick={closeMenu}
                  className="flex min-h-[44px] items-center rounded-md px-3 py-3 text-base font-medium text-ink-600 transition-colors duration-150 hover:bg-ink-50 hover:text-ink-900"
                >
                  Log in
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/worxspace"
                  onClick={closeMenu}
                  className="flex min-h-[44px] items-center rounded-md px-3 py-3 text-base font-medium text-ink-600 transition-colors duration-150 hover:bg-ink-50 hover:text-ink-900"
                >
                  My Worxspace
                </Link>
              </SignedIn>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
