/**
 * @file app/sign-up/[[...sign-up]]/page.tsx
 * @description Sign-up page using Clerk's SignUp component
 * 
 * Features:
 * - Clerk SignUp component with custom styling
 * - Centered layout with benefits side panel
 * - Brand-consistent orange/amber theme
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { Feather, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your CopyWorx account and start writing better copy.',
};

/**
 * Benefits list for the sign-up page
 */
const benefits = [
  '50+ AI-powered copywriting templates',
  'Unlimited projects and organization',
  'Brand voice customization',
  'Collaboration tools for teams',
  '14-day free trial, no credit card required',
] as const;

/**
 * Sign-up page component
 * 
 * Uses Clerk's SignUp component with custom appearance
 * configured in the root layout's ClerkProvider.
 */
export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-amber-50 via-white to-ink-50 items-center justify-center p-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid opacity-40" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-ink-400/10 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative max-w-md">
          <h2 className="font-sans text-4xl font-bold text-ink-900 mb-6">
            Start creating copy that converts today
          </h2>
          <p className="text-ink-600 leading-relaxed mb-8">
            Join over 10,000 marketers and copywriters who trust CopyWorx 
            to help them create compelling content every day.
          </p>
          
          {/* Benefits List */}
          <ul className="space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-ink-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Side - Form */}
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
            <span className="font-sans text-2xl font-bold text-ink-900">
              CopyWorx
            </span>
          </div>

          {/* Clerk SignUp Component */}
          <SignUp 
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none p-0 w-full',
                headerTitle: 'font-sans text-2xl font-bold text-ink-900',
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
            forceRedirectUrl="/dashboard"
            signInUrl="/sign-in"
          />
          
          {/* Terms */}
          <p className="text-xs text-ink-400 text-center mt-6">
            By signing up, you agree to our{' '}
            <Link href="#" className="text-amber-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="text-amber-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
