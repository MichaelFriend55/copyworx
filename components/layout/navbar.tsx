/**
 * @file components/layout/navbar.tsx
 * @description Main navigation component for the marketing site
 * 
 * Features:
 * - Responsive design with mobile menu
 * - Authentication state awareness
 * - UserButton for logged-in users
 * - Glass morphism effect on scroll
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Menu, X, Feather } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Navigation links configuration
 */
const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/pricing', label: 'Pricing' },
] as const;

/**
 * Navbar component
 * 
 * Main navigation bar for the marketing site with:
 * - Logo and brand
 * - Navigation links
 * - Auth buttons (Sign In/Get Started) or UserButton
 * - Mobile responsive menu
 */
export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const pathname = usePathname();

  // Track scroll position for glass effect
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'glass border-b border-border/50 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 shadow-lg">
              <Feather className="h-5 w-5 text-amber-400" />
            </div>
            <span className="font-display text-xl font-bold text-ink-900">
              CopyWorx
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors link-underline',
                  pathname === link.href
                    ? 'text-ink-900'
                    : 'text-ink-600 hover:text-ink-900'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {/* Show when user is NOT signed in */}
            <SignedOut>
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button variant="amber" asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </SignedOut>

            {/* Show when user IS signed in */}
            <SignedIn>
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-9 w-9',
                    userButtonPopoverCard: 'shadow-xl border border-border/50',
                    userButtonPopoverActionButton: 'hover:bg-ink-50',
                    userButtonPopoverActionButtonText: 'text-ink-700',
                    userButtonPopoverActionButtonIcon: 'text-ink-500',
                    userButtonPopoverFooter: 'hidden',
                  },
                }}
              />
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-ink-700 hover:bg-ink-100 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'block px-3 py-2 rounded-md text-base font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-ink-100 text-ink-900'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                )}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Mobile Auth Section */}
            <div className="pt-4 border-t border-border space-y-2">
              {/* Show when user is NOT signed in */}
              <SignedOut>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button variant="amber" className="w-full" asChild>
                  <Link href="/sign-up">Get Started</Link>
                </Button>
              </SignedOut>

              {/* Show when user IS signed in */}
              <SignedIn>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <div className="flex items-center justify-center pt-2">
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: 'h-10 w-10',
                      },
                    }}
                  />
                </div>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
