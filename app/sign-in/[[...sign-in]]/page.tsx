/**
 * @file app/sign-in/[[...sign-in]]/page.tsx
 * @description Sign-in page using Clerk's SignIn component
 * 
 * Features:
 * - Clerk SignIn component with custom styling
 * - Centered layout with decorative side panel
 * - Brand-consistent orange/amber theme
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { Feather, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your CopyWorx account.',
};

/**
 * Sign-in page component
 * 
 * Uses Clerk's SignIn component with custom appearance
 * configured in the root layout's ClerkProvider.
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link 
            href="/"
            className="inline-flex items-center text-sm text-ink-500 hover:text-ink-700 mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-900 shadow-lg">
              <Feather className="h-5 w-5 text-amber-400" />
            </div>
            <span className="font-display text-2xl font-bold text-ink-900">
              CopyWorx
            </span>
          </div>

          {/* Clerk SignIn Component */}
          <SignIn 
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none p-0 w-full',
                headerTitle: 'font-display text-2xl font-bold text-ink-900',
                headerSubtitle: 'text-ink-600',
                socialButtonsBlockButton: 
                  'border border-border bg-white hover:bg-ink-50 text-ink-700 transition-colors',
                socialButtonsBlockButtonText: 'font-medium',
                dividerLine: 'bg-border',
                dividerText: 'text-ink-400 text-xs',
                formFieldLabel: 'text-sm font-medium text-ink-700',
                formFieldInput: 
                  'border-border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors',
                formButtonPrimary: 
                  'bg-amber-500 hover:bg-amber-400 text-ink-900 font-medium shadow-lg hover:shadow-xl transition-all rounded-md',
                footerActionLink: 
                  'text-amber-600 hover:text-amber-700 font-medium',
                identityPreviewEditButton: 'text-amber-600 hover:text-amber-700',
                formFieldAction: 'text-amber-600 hover:text-amber-700',
                alert: 'border-red-200 bg-red-50 text-red-800',
              },
            }}
            redirectUrl="/dashboard"
            signUpUrl="/sign-up"
          />
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-ink-950 items-center justify-center p-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-dark opacity-20" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ink-600/30 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative max-w-md text-center">
          <div className="text-6xl mb-6">✍️</div>
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Write copy that converts
          </h2>
          <p className="text-ink-300 leading-relaxed">
            Join thousands of copywriters and marketers using CopyWorx to create 
            compelling content that drives results.
          </p>
        </div>
      </div>
    </div>
  );
}
