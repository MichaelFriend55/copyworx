/**
 * @file app/waitlist/page.tsx
 * @description Waitlist page for users not yet approved for full access
 * 
 * Displays a centered message card informing users they are on the waitlist
 * and provides contact information for immediate access requests.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Feather, Clock, Mail, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Waitlist',
  description: 'You are on the CopyWorx waitlist. We will notify you when your account is approved.',
};

/**
 * Waitlist page component
 * 
 * A simple, centered page that informs users they are on the waitlist.
 * No navigation or sidebar - just a clean message card.
 */
export default function WaitlistPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50/50 via-white to-ink-50/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-ink-400/10 rounded-full blur-3xl" />
      
      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-900 shadow-lg">
            <Feather className="h-6 w-6 text-amber-400" />
          </div>
          <span className="font-sans text-3xl font-bold text-ink-900">
            CopyWorx
          </span>
        </div>

        {/* Waitlist Card */}
        <Card className="border-border/50 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            {/* Status Badge */}
            <Badge variant="amber" className="mb-6 px-4 py-1.5">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              Private Beta
            </Badge>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <span className="text-4xl">🎉</span>
              </div>
            </div>

            {/* Heading */}
            <h1 className="font-sans text-2xl font-bold text-ink-900 mb-3">
              Thanks for your interest in CopyWorx!
            </h1>

            {/* Message */}
            <p className="text-ink-600 leading-relaxed mb-6">
              We're currently in private beta. Your account is on the waitlist and we'll notify you as soon as access becomes available.
            </p>

            {/* Contact Info */}
            <div className="bg-ink-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-ink-700 mb-2">
                <strong>Need immediate access?</strong>
              </p>
              <a 
                href="mailto:michael@copyworx.io"
                className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                <Mail className="h-4 w-4" />
                michael@copyworx.io
              </a>
            </div>

            {/* Back to Home */}
            <Button variant="ghost" asChild className="text-ink-500 hover:text-ink-700">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to home
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Footer Text */}
        <p className="text-center text-sm text-ink-500 mt-6">
          We're adding new users every week. Thanks for your patience!
        </p>
      </div>
    </div>
  );
}
