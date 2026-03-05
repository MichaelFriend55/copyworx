/**
 * @file components/layout/trial-banner.tsx
 * @description Displays a dismissable banner showing trial days remaining
 *
 * Only renders when the user's subscription status is 'trialing'.
 * Switches to amber urgency styling when 2 or fewer days remain.
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

/** Calculate whole days remaining from an ISO date string */
function daysUntil(endDate: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / msPerDay);
}

export default function TrialBanner() {
  const { user } = useUser();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isTrialing =
    (user?.publicMetadata as Record<string, unknown>)?.subscriptionStatus === 'trialing';

  useEffect(() => {
    if (!isTrialing) return;

    let cancelled = false;

    async function fetchStatus() {
      try {
        const response = await fetch('/api/subscription/status');
        if (!response.ok) return;

        const data = await response.json();
        if (cancelled) return;

        if (data?.endDate) {
          setDaysLeft(daysUntil(data.endDate));
        }
      } catch {
        // Silently fail — banner just won't show
      }
    }

    fetchStatus();
    return () => { cancelled = true; };
  }, [isTrialing]);

  if (!isTrialing || daysLeft === null || dismissed) {
    return null;
  }

  const isUrgent = daysLeft <= 2;

  const bannerClasses = isUrgent
    ? 'bg-amber-50 border-b border-amber-200'
    : 'bg-gradient-to-r from-[#006EE6]/10 to-[#A755F7]/10 border-b border-[#006EE6]/20';

  const textClasses = isUrgent ? 'text-amber-800' : 'text-ink-700';
  const iconClasses = isUrgent ? 'text-amber-600' : 'text-[#006EE6]';

  async function handleAddPayment() {
    setPortalLoading(true);
    const toastId = toast.loading('Opening billing portal…');

    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.details || 'Failed to open billing portal');
      }

      if (!data?.url) {
        throw new Error('No portal URL returned');
      }

      toast.dismiss(toastId);
      window.location.href = data.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong';
      toast.error(message, { id: toastId });
      setPortalLoading(false);
    }
  }

  const daysText = daysLeft === 1 ? '1 day' : `${daysLeft} days`;

  return (
    <div className={`flex items-center justify-between px-6 py-2.5 ${bannerClasses}`}>
      <div className="flex items-center gap-2">
        <Clock className={`h-4 w-4 shrink-0 ${iconClasses}`} />
        <span className={`text-sm font-medium ${textClasses}`}>
          You have {daysText} left in your free trial
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAddPayment}
          disabled={portalLoading}
          className={`text-sm font-semibold underline underline-offset-2 transition-opacity hover:opacity-80 disabled:opacity-50 ${textClasses}`}
        >
          {portalLoading ? 'Redirecting…' : 'Add Payment Method'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={`rounded p-0.5 transition-colors hover:bg-black/5 ${iconClasses}`}
          aria-label="Dismiss trial banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
