/**
 * @file components/layout/marketing-footer.tsx
 * @description Simplified footer component for the marketing site
 * 
 * Layout:
 * - Left: CopyWorx logo
 * - Right: Social media icons (LinkedIn, Facebook, X/Twitter, Email)
 * - Center: Copyright text below
 */

import Link from 'next/link';
import Image from 'next/image';
import { Linkedin, Facebook, Mail } from 'lucide-react';

/**
 * X/Twitter icon component (Lucide doesn't have the new X logo)
 */
function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Social links configuration
 * Using placeholder # links as requested
 */
const socialLinks = [
  { href: '#', icon: Linkedin, label: 'LinkedIn' },
  { href: '#', icon: Facebook, label: 'Facebook' },
  { href: '#', icon: XTwitterIcon, label: 'X (Twitter)' },
  { href: '#', icon: Mail, label: 'Email' },
];

/**
 * MarketingFooter component
 * 
 * Simplified footer with logo, social icons, and copyright.
 */
export function MarketingFooter() {
  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-8 flex flex-col lg:flex-row justify-between items-center gap-8">
          {/* Logo and Tagline */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Logo - White background version with padding for breathing room */}
            <Link 
              href="/home" 
              className="flex-shrink-0 flex items-center transition-opacity hover:opacity-80 bg-white rounded-md px-4 py-2"
            >
              <Image
                src="/CopyWorx_2_WB.png"
                alt="CopyWorx Studio Logo"
                width={304}
                height={85}
                className="h-[68px] w-auto"
              />
            </Link>
            
            {/* Tagline */}
            <p className="text-xs text-white/80 leading-relaxed max-w-md text-center md:text-left">
              CopyWorx™ Studio leverages proven, time-tested copywriting tools and combines them with the power of AI to create a platform any marketing professional can use — regardless of writing experience — to create professional, high-converting copy in minutes.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#006EE6] to-[#A755F7] text-white hover:opacity-80 transition-all duration-300"
                aria-label={social.label}
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Copyright - Centered */}
        <div className="border-t border-white/10 py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-white/60">
              © 2026 CopyWorx™ Studio LLC. All rights reserved.
            </p>
            <p className="text-xs text-white/40">
              CopyWorx™ and AI@Worx™ are trademarks of CopyWorx™ Studio LLC.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
