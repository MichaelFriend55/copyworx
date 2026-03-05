/**
 * @file app/sign-in/[[...sign-in]]/page.tsx
 * @description Sign-in page with two-panel layout
 *
 * Left panel: Clerk SignIn form with brand-styled appearance
 * Right panel: Branding with logo, headline, and decorative elements
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your CopyWorx Studio account.',
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Form */}
      <div className="w-full lg:w-[45%] flex flex-col bg-white px-10 py-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/copyworx-logo-v2.png"
            alt="CopyWorx Studio™"
            width={40}
            height={40}
          />
          <span className="font-sans text-lg font-semibold text-ink-900">
            CopyWorx Studio™
          </span>
        </div>

        {/* Back link */}
        <Link
          href="/"
          className="mt-4 inline-flex items-center text-sm text-ink-500 hover:text-ink-700 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to home
        </Link>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  cardBox: 'w-full max-w-[420px]',
                  card: 'w-full shadow-none border-0 px-6 py-4',
                  formButtonPrimary:
                    'bg-gradient-to-r from-[#006EE6] to-[#A755F7] hover:opacity-90 text-white shadow-lg',
                  formFieldInput:
                    'border-ink-200 focus:border-[#006EE6] focus:ring-[#006EE6]/20 py-3',
                  formFieldLabel: 'text-ink-700 font-medium',
                  headerTitle: 'text-2xl font-bold text-ink-900',
                  headerSubtitle: 'text-ink-500',
                  socialButtonsBlockButton:
                    'border-ink-200 hover:bg-ink-50 py-3',
                  footerActionLink:
                    'text-[#006EE6] hover:text-[#006EE6]/80',
                  card__signIn: 'gap-6',
                  dividerLine: 'bg-border',
                  dividerText: 'text-ink-400 text-xs',
                  identityPreviewEditButton:
                    'text-[#006EE6] hover:text-[#006EE6]/80',
                  formFieldAction:
                    'text-[#006EE6] hover:text-[#006EE6]/80',
                  alert: 'border-red-200 bg-red-50 text-red-800',
                },
              }}
              forceRedirectUrl="/worxspace"
              signUpUrl="/sign-up"
            />
          </div>
        </div>
      </div>

      {/* Right Panel — Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-ink-50 to-[#006EE6]/5 items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#006EE6]/[0.06] blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col items-center text-center">
          {/* Large logo */}
          <Image
            src="/copyworx-logo-v2.png"
            alt="CopyWorx Studio™"
            width={120}
            height={120}
            className="mb-8"
          />

          <h2 className="font-sans text-3xl md:text-4xl font-bold text-ink-900 max-w-lg">
            Write to win with the first AI-powered platform built by a professional copywriter
          </h2>

          <p className="text-lg text-ink-600 max-w-md mt-4">
            Specifically for copywriters, content creators, and marketers.
          </p>
        </div>
      </div>
    </div>
  );
}
