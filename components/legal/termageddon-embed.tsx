/**
 * @file components/legal/termageddon-embed.tsx
 * @description Reusable client component that dynamically loads a Termageddon
 * hosted policy via their embed script. The script is appended to the container
 * div after mount and cleaned up on unmount to avoid duplicate script tags.
 */

'use client';

import { useEffect, useRef } from 'react';

interface TermageddonEmbedProps {
  /** The policy-specific ID string from the Termageddon embed snippet */
  embedId: string;
  /** Fallback direct URL to the hosted policy (opens in new tab) */
  policyUrl: string;
}

/**
 * Renders a Termageddon policy embed by injecting the embed script into the
 * container div after mount. Shows a fallback link while the policy loads.
 */
export function TermageddonEmbed({ embedId, policyUrl }: TermageddonEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement('script');
    script.src = `https://policies.termageddon.com/api/embed/${embedId}.js`;
    container.appendChild(script);

    return () => {
      if (container.contains(script)) {
        container.removeChild(script);
      }
    };
  }, [embedId]);

  return (
    <div
      ref={containerRef}
      id={embedId}
      className="policy_embed_div max-w-4xl mx-auto"
    >
      <p className="text-ink-600">
        Please wait while the policy loads. If it does not load,{' '}
        <a
          href={policyUrl}
          rel="nofollow noreferrer"
          target="_blank"
          className="text-amber-600 underline hover:text-amber-700"
        >
          click here to view the policy
        </a>
        .
      </p>
    </div>
  );
}
