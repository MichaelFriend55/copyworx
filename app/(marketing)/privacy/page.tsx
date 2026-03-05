/**
 * @file app/(marketing)/privacy/page.tsx
 * @description Privacy Policy page — embeds the Termageddon-hosted policy document
 */

import type { Metadata } from 'next';
import { TermageddonEmbed } from '@/components/legal/termageddon-embed';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'CopyWorx Studio™ Privacy Policy',
};

/**
 * Privacy Policy page
 * Policy content is loaded dynamically via the Termageddon embed script.
 */
export default function PrivacyPage() {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="font-sans text-3xl md:text-4xl font-bold text-ink-900 mb-8">
          Privacy Policy
        </h1>
        <TermageddonEmbed
          embedId="TTNsUlZFZFZjVVI0UVhaQlVsRTlQUT09"
          policyUrl="https://policies.termageddon.com/api/policy/TTNsUlZFZFZjVVI0UVhaQlVsRTlQUT09"
        />
      </div>
    </section>
  );
}
