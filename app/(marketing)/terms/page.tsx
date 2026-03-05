/**
 * @file app/(marketing)/terms/page.tsx
 * @description Terms of Service page — embeds the Termageddon-hosted policy document
 */

import type { Metadata } from 'next';
import { TermageddonEmbed } from '@/components/legal/termageddon-embed';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'CopyWorx Studio™ Terms of Service',
};

/**
 * Terms of Service page
 * Policy content is loaded dynamically via the Termageddon embed script.
 */
export default function TermsPage() {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="font-sans text-3xl md:text-4xl font-bold text-ink-900 mb-8">
          Terms of Service
        </h1>
        <TermageddonEmbed
          embedId="VmpORk0wWjBVM05RT1cxdmIwRTlQUT09"
          policyUrl="https://policies.termageddon.com/api/policy/VmpORk0wWjBVM05RT1cxdmIwRTlQUT09"
        />
      </div>
    </section>
  );
}
