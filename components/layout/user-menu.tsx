/**
 * @file components/layout/user-menu.tsx
 * @description Client component wrapping Clerk's UserButton with custom menu items
 *
 * Adds Billing & Subscription, Account Settings, and User Guide actions
 * to the standard Clerk user popover menu.
 */

'use client';

import { UserButton } from '@clerk/nextjs';
import { CreditCard, Settings, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * UserMenu renders the Clerk UserButton with custom menu actions.
 * Must be a client component because it uses useRouter and event handlers.
 */
export default function UserMenu() {
  const router = useRouter();

  /** Open the Stripe Billing Portal via our API route */
  async function handleBilling() {
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
    }
  }

  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: 'h-9 w-9',
          userButtonPopoverCard: 'shadow-xl border border-border/50',
          userButtonPopoverActionButton: 'hover:bg-ink-50',
          userButtonPopoverActionButtonText: 'text-ink-700',
          userButtonPopoverActionButtonIcon: 'text-ink-500',
          userButtonPopoverFooter: 'hidden',
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Action
          label="Billing & Subscription"
          labelIcon={<CreditCard className="h-4 w-4" />}
          onClick={handleBilling}
        />
        <UserButton.Action
          label="Account Settings"
          labelIcon={<Settings className="h-4 w-4" />}
          onClick={() => router.push('/worxspace/settings')}
        />
        <UserButton.Action
          label="User Guide"
          labelIcon={<BookOpen className="h-4 w-4" />}
          onClick={() => router.push('/worxspace/guide')}
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
