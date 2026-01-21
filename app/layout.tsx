/**
 * @file app/layout.tsx
 * @description Root layout for the CopyWorx application
 * 
 * Provides:
 * - Clerk authentication provider
 * - Global font loading (Inter)
 * - Metadata configuration
 * - Global styles wrapper
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';

/**
 * Inter - Clean sans-serif font for all text throughout the application
 * Provides consistent, professional typography across the entire UI
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

/**
 * Additional Google Fonts TEMPORARILY DISABLED to speed up build
 * Will re-enable once font loading timeout issue is resolved
 */
// const roboto = Roboto({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-roboto',
//   weight: ['400', '500', '700'],
// });

// const openSans = Open_Sans({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-open-sans',
//   weight: ['400', '500', '600', '700'],
// });

// const lato = Lato({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-lato',
//   weight: ['400', '700'],
// });

// const montserrat = Montserrat({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-montserrat',
//   weight: ['400', '500', '600', '700'],
// });

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
 * 
 * Note: In Clerk 5.x, ClerkProvider must be inside the <body> tag
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable}`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
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
              headerTitle: 'font-sans font-semibold text-ink-900',
              headerSubtitle: 'text-ink-600',
              socialButtonsBlockButton: 
                'border border-border hover:bg-ink-50 transition-colors',
              formFieldInput: 
                'border-border focus:ring-amber-500 focus:border-amber-500',
              footerActionLink: 'text-amber-600 hover:text-amber-700',
            },
          }}
        >
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              },
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  );
}
