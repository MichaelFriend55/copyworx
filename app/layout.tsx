/**
 * @file app/layout.tsx
 * @description Root layout for the CopyWorx application
 * 
 * Provides:
 * - Clerk authentication provider
 * - Global font loading (Inter + Crimson Pro)
 * - Metadata configuration
 * - Global styles wrapper
 */

import type { Metadata } from 'next';
import { Inter, Crimson_Pro } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

/**
 * Inter - Clean sans-serif font for body text
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Crimson Pro - Elegant serif font for display text
 * Used for headings to create a premium writing-tool aesthetic
 */
const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-crimson',
});

/**
 * Application metadata for SEO and social sharing
 */
export const metadata: Metadata = {
  title: {
    default: 'CopyWorx - Professional Copywriting Tool',
    template: '%s | CopyWorx',
  },
  description: 'Create compelling copy that converts. CopyWorx provides AI-powered templates and tools for professional copywriters.',
  keywords: [
    'copywriting',
    'AI writing',
    'content creation',
    'marketing copy',
    'sales copy',
    'copywriting templates',
  ],
  authors: [{ name: 'CopyWorx' }],
  creator: 'CopyWorx',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://copyworx.app',
    title: 'CopyWorx - Professional Copywriting Tool',
    description: 'Create compelling copy that converts. AI-powered templates and tools for professional copywriters.',
    siteName: 'CopyWorx',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CopyWorx - Professional Copywriting Tool',
    description: 'Create compelling copy that converts.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Root layout component
 * Wraps all pages with ClerkProvider and global styles
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#F59E0B',
          colorTextOnPrimaryBackground: '#1e2433',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#1e2433',
          borderRadius: '0.625rem',
        },
        elements: {
          formButtonPrimary: 
            'bg-amber-500 hover:bg-amber-400 text-ink-900 shadow-lg',
          card: 'shadow-xl border border-border/50',
          headerTitle: 'font-display text-ink-900',
          headerSubtitle: 'text-ink-600',
          socialButtonsBlockButton: 
            'border border-border hover:bg-ink-50 transition-colors',
          formFieldInput: 
            'border-border focus:ring-amber-500 focus:border-amber-500',
          footerActionLink: 'text-amber-600 hover:text-amber-700',
        },
      }}
    >
      <html 
        lang="en" 
        className={`${inter.variable} ${crimsonPro.variable}`}
        suppressHydrationWarning
      >
        <body className="min-h-screen bg-background font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
