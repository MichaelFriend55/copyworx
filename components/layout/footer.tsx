/**
 * @file components/layout/footer.tsx
 * @description Footer component for the marketing site
 * 
 * Contains:
 * - Company info and links
 * - Navigation sections
 * - Social links
 * - Copyright notice
 */

import Link from 'next/link';
import { Feather, Twitter, Github, Linkedin, Mail } from 'lucide-react';

/**
 * Footer link sections configuration
 */
const footerSections = [
  {
    title: 'Product',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/templates', label: 'Templates' },
      { href: '#features', label: 'Features' },
      { href: '#integrations', label: 'Integrations' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '#careers', label: 'Careers' },
      { href: '#blog', label: 'Blog' },
      { href: '#press', label: 'Press' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '#docs', label: 'Documentation' },
      { href: '#tutorials', label: 'Tutorials' },
      { href: '#support', label: 'Support' },
      { href: '#community', label: 'Community' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#privacy', label: 'Privacy' },
      { href: '#terms', label: 'Terms' },
      { href: '#cookies', label: 'Cookies' },
      { href: '#security', label: 'Security' },
    ],
  },
] as const;

/**
 * Social links configuration
 */
const socialLinks = [
  { href: '#twitter', icon: Twitter, label: 'Twitter' },
  { href: '#github', icon: Github, label: 'GitHub' },
  { href: '#linkedin', icon: Linkedin, label: 'LinkedIn' },
  { href: 'mailto:hello@copyworx.app', icon: Mail, label: 'Email' },
] as const;

/**
 * Footer component
 * 
 * Full-width footer with multiple sections, social links, and newsletter signup.
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-ink-950 text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Brand Section */}
            <div className="col-span-2 md:col-span-6 lg:col-span-4">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 mb-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 shadow-lg">
                  <Feather className="h-5 w-5 text-ink-900" />
                </div>
                <span className="font-sans text-xl font-bold text-white">
                  CopyWorx
                </span>
              </Link>
              <p className="text-ink-300 text-sm leading-relaxed max-w-xs mb-6">
                Create compelling copy that converts. AI-powered templates and tools for professional copywriters and marketers.
              </p>
              {/* Social Links */}
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-800 text-ink-300 hover:bg-amber-500 hover:text-ink-900 transition-all duration-300"
                    aria-label={social.label}
                  >
                    <social.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Footer Sections */}
            {footerSections.map((section) => (
              <div key={section.title} className="col-span-1 lg:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-400 hover:text-amber-400 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-ink-800 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-ink-400">
              © {currentYear} CopyWorx. All rights reserved.
            </p>
            <p className="text-sm text-ink-500">
              Crafted with care for copywriters everywhere.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

