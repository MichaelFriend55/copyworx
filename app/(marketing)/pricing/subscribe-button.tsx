/**
 * @file app/(marketing)/pricing/subscribe-button.tsx
 * @description Client component that calls the create-checkout-session API
 * and redirects the user to Stripe Checkout.
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Safely parse a fetch response as JSON.
 * Returns null if the body is not valid JSON (e.g. an HTML 404 page).
 */
async function safeJson<T = Record<string, unknown>>(
  response: Response
): Promise<T | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function SubscribeButton() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (!isSignedIn) {
      router.push('/sign-up');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await safeJson<{ details?: string }>(response);
        const message =
          data?.details || `Checkout failed (${response.status})`;
        throw new Error(message);
      }

      const data = await safeJson<{ url?: string }>(response);

      if (!data?.url) {
        throw new Error('No checkout URL returned from server');
      }

      window.location.href = data.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong';
      console.error('Checkout error:', error);
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#006EE6] to-[#A755F7] px-8 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:opacity-90 hover:shadow-xl active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to checkout…
        </>
      ) : isSignedIn ? (
        'Subscribe — $49/month'
      ) : (
        'Sign up to subscribe'
      )}
    </button>
  );
}
