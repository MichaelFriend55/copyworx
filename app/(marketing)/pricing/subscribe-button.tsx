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
        const data = await response.json();
        throw new Error(data.details || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
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
