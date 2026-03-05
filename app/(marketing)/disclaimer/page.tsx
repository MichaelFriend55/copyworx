/**
 * @file app/(marketing)/disclaimer/page.tsx
 * @description Disclaimer page — embeds the Termageddon-hosted policy document
 */

import type { Metadata } from 'next';
import { TermageddonEmbed } from '@/components/legal/termageddon-embed';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'CopyWorx Studio™ Disclaimer',
};

/**
 * Disclaimer page
 * Policy content is loaded dynamically via the Termageddon embed script.
 */
export default function DisclaimerPage() {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="font-sans text-3xl md:text-4xl font-bold text-ink-900 mb-8">
          Disclaimer
        </h1>
        <TermageddonEmbed
          embedId="U2tKd2FrbzRWRnBKYnpSUFZIYzlQUT09"
          policyUrl="https://policies.termageddon.com/api/policy/U2tKd2FrbzRWRnBKYnpSUFZIYzlQUT09"
        />
      </div>
    </section>
  );
}
