/**
 * @file app/(app)/worxspace/guide/page.tsx
 * @description User guide page with collapsible sections for each feature area
 *
 * Uses native <details>/<summary> elements for zero-JS accordion behavior.
 * Content is placeholder — to be filled with detailed guides later.
 */

import type { Metadata } from 'next';
import {
  Rocket,
  Wand2,
  FileText,
  Palette,
  Users,
  FolderOpen,
  CreditCard,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'User Guide',
  description: 'Learn how to use every feature in CopyWorx Studio.',
};

const GUIDE_SECTIONS = [
  {
    icon: Rocket,
    title: 'Getting Started',
    body: 'Learn how to set up your first project, configure your brand voice, and create your first document.',
  },
  {
    icon: Wand2,
    title: 'Copy Optimizer Suite',
    body: 'Master the Tone Shifter, Expand, Shorten, and Rewrite for Channel tools.',
  },
  {
    icon: FileText,
    title: 'AI@Worx Templates',
    body: 'Use pre-built templates for sales emails, landing page heroes, and more.',
  },
  {
    icon: Palette,
    title: 'Brand Voice',
    body: 'Set up and manage your brand voice profiles for consistent messaging.',
  },
  {
    icon: Users,
    title: 'Personas',
    body: 'Create target audience personas to align your copy with reader expectations.',
  },
  {
    icon: FolderOpen,
    title: 'Projects & Documents',
    body: 'Organize your work with projects, folders, and cloud-synced documents.',
  },
  {
    icon: CreditCard,
    title: 'Account & Billing',
    body: 'Manage your subscription, view usage, and update payment methods.',
  },
] as const;

export default function GuidePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-ink-900">
          User Guide
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Everything you need to know about CopyWorx Studio™
        </p>
      </div>

      {/* Support notice */}
      <Card className="border-[#006EE6]/20 bg-[#006EE6]/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Mail className="h-5 w-5 shrink-0 text-[#006EE6] mt-0.5" />
          <p className="text-sm text-ink-700 leading-relaxed">
            We&apos;re building out detailed guides for every feature.
            In the meantime, email{' '}
            <Link
              href="mailto:support@copyworx.io"
              className="font-medium text-[#006EE6] hover:underline"
            >
              support@copyworx.io
            </Link>{' '}
            with any questions.
          </p>
        </CardContent>
      </Card>

      {/* Accordion sections */}
      <Card>
        <CardContent className="divide-y divide-border py-2">
          {GUIDE_SECTIONS.map((section) => (
            <details key={section.title} className="group">
              <summary className="flex cursor-pointer items-center gap-3 py-4 text-sm font-medium text-ink-900 select-none list-none [&::-webkit-details-marker]:hidden">
                <section.icon className="h-5 w-5 shrink-0 text-[#006EE6]" />
                <span className="flex-1">{section.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-90" />
              </summary>
              <div className="pb-4 pl-8 pr-4">
                <p className="text-sm text-ink-500 leading-relaxed italic">
                  {section.body}
                </p>
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
