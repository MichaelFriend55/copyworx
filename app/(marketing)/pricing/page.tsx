/**
 * @file app/(marketing)/pricing/page.tsx
 * @description Pricing page for CopyWorx Studio™ — single $49/month plan
 *
 * Shows the plan, features, a Subscribe button that creates a Stripe
 * Checkout session, and an FAQ section.
 */

import type { Metadata } from 'next';
import { Check, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { SubscribeButton } from './subscribe-button';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'CopyWorx Studio™ — Professional AI copywriting tools for $49/month.',
};

const FEATURES = [
  'Unlimited "AI@Worx" AI-powered rewrites',
  'Access to all copywriting templates',
  'Brand voice alignment & analysis',
  'Persona targeting & analysis',
  'Multi-channel adaptation',
  'Cloud sync across devices',
  'Priority email support',
  'New features as they ship',
] as const;

const FAQ_ITEMS = [
  {
    question: 'Can I cancel anytime?',
    answer:
      'Absolutely. Cancel your subscription with one click — no penalties, no questions asked. You keep access until the end of your billing period.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'Your documents are encrypted at rest and in transit. We never train AI models on your content.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit and debit cards (Visa, Mastercard, Amex) through our secure Stripe payment processing.',
  },
  {
    question: 'Do you offer annual billing?',
    answer:
      'Not yet — but it\'s on the roadmap. Subscribe monthly for now and we\'ll notify you when annual plans are available.',
  },
] as const;

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-12 md:py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-[#006EE6]/10 via-transparent to-transparent" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="brand" className="mb-3">
              Pricing
            </Badge>
            <h1 className="font-sans text-4xl md:text-5xl lg:text-6xl font-bold text-ink-900 mb-4">
              One plan. Everything included.
            </h1>
            <p className="text-lg md:text-xl text-ink-600 leading-relaxed">
              No tiers, no limits, no surprises. Get full access to every CopyWorx Studio™ feature.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <Card className="relative border-[#006EE6]/40 shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white rounded-full px-0.5">
                <Badge variant="brand" className="shadow-lg">
                  Full Access
                </Badge>
              </div>

              <CardHeader className="pb-3 pt-6 text-center">
                <CardTitle className="font-sans text-2xl">
                  CopyWorx Studio™
                </CardTitle>
                <CardDescription>
                  Professional AI copywriting toolkit
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Price */}
                <div className="mb-5 text-center">
                  <span className="font-sans text-6xl font-bold text-ink-900">
                    $49
                  </span>
                  <span className="text-ink-500 ml-2 text-lg">/month</span>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[#006EE6] shrink-0 mt-0.5" />
                      <span className="text-sm text-ink-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-2">
                <SubscribeButton />
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-white to-ink-50/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-3">
                FAQ
              </Badge>
              <h2 className="font-sans text-3xl md:text-4xl font-bold text-ink-900 mb-4">
                Frequently asked questions
              </h2>
              <p className="text-ink-600">
                Can&apos;t find what you&apos;re looking for?{' '}
                <Link
                  href="mailto:support@copyworx.io"
                  className="text-[#006EE6] hover:underline"
                >
                  Contact our support team
                </Link>
              </p>
            </div>

            <div className="space-y-2">
              {FAQ_ITEMS.map((item) => (
                <Card key={item.question} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <HelpCircle className="h-5 w-5 text-[#006EE6] shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-ink-900 mb-1">
                          {item.question}
                        </h3>
                        <p className="text-ink-600 text-sm leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
