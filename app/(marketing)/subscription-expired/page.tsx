/**
 * @file app/(marketing)/subscription-expired/page.tsx
 * @description Landing page shown to users whose subscription has ended
 *
 * Provides a clear message that their account is intact and a CTA
 * to resubscribe via the pricing page.
 */

import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Subscription Ended',
  description: 'Your CopyWorx Studio subscription has ended.',
};

export default function SubscriptionExpiredPage() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-[#006EE6]/10 via-transparent to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-md mx-auto">
          <Card className="relative border-[#006EE6]/40 shadow-xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-0.5">
              <Badge variant="brand" className="shadow-lg">
                Subscription Ended
              </Badge>
            </div>

            <CardHeader className="pb-3 pt-8 text-center">
              <CardTitle className="font-sans text-2xl">
                Your Subscription Has Ended
              </CardTitle>
              <CardDescription className="mt-2 text-sm leading-relaxed">
                Your CopyWorx Studio™ subscription is no longer active.
                Resubscribe to regain access to your projects and AI
                copywriting tools. All your previous work is saved and
                waiting for you.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 pb-2" />

            <CardFooter className="flex flex-col gap-4">
              <Link
                href="/#pricing"
                className="inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-[#006EE6] to-[#A755F7] px-8 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:opacity-90 hover:shadow-xl active:scale-[0.98]"
              >
                Resubscribe — $49/month
              </Link>
              <p className="text-center text-sm text-ink-500">
                Questions?{' '}
                <Link
                  href="mailto:support@copyworx.io"
                  className="text-[#006EE6] hover:underline"
                >
                  Contact support@copyworx.io
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
