/**
 * @file app/(marketing)/pricing/subscribe-button.tsx
 * @description Client component that calls the create-checkout-session API
 * and redirects the user to Stripe Checkout.
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
    <Button
      variant="amber"
      className="w-full"
      size="lg"
      onClick={handleSubscribe}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting to checkout…
        </>
      ) : isSignedIn ? (
        'Subscribe — $49/month'
      ) : (
        'Sign up to subscribe'
      )}
    </Button>
  );
}
