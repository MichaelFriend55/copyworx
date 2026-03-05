/**
 * @file app/(marketing)/cookies/page.tsx
 * @description Cookie Policy page — embeds the Termageddon-hosted policy document
 */

import type { Metadata } from 'next';
import { TermageddonEmbed } from '@/components/legal/termageddon-embed';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'CopyWorx Studio™ Cookie Policy',
};

/**
 * Cookie Policy page
 * Policy content is loaded dynamically via the Termageddon embed script.
 */
export default function CookiesPage() {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="font-sans text-3xl md:text-4xl font-bold text-ink-900 mb-8">
          Cookie Policy
        </h1>
        <TermageddonEmbed
          embedId="YldoTVFWbDZTbUV4Ym1Wc05IYzlQUT09"
          policyUrl="https://policies.termageddon.com/api/policy/YldoTVFWbDZTbUV4Ym1Wc05IYzlQUT09"
        />
      </div>
    </section>
  );
}
