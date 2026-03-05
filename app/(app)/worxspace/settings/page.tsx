/**
 * @file app/(app)/worxspace/settings/page.tsx
 * @description Account settings page showing subscription info and AI usage
 *
 * Two card sections:
 * 1. Subscription Info — status badge, plan, dates, manage button
 * 2. AI Usage This Month — cost progress bar, token/call counts
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreditCard, BarChart3, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Types
// ============================================================================

interface SubscriptionData {
  status: string | null;
  endDate: string | null;
}

interface UsageData {
  totalTokens: number;
  totalCost: number;
  totalApiCalls: number;
  lastApiCall: string | null;
}

// ============================================================================
// Constants
// ============================================================================

/** Must match MONTHLY_LIMIT_USD in lib/utils/api-auth.ts */
const USAGE_LIMIT_USD = 5.0;

const STATUS_CONFIG: Record<string, { label: string; variant: 'brand' | 'amber' | 'destructive'; className?: string }> = {
  active: { label: 'Active', variant: 'brand', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
  trialing: { label: 'Free Trial', variant: 'brand' },
  past_due: { label: 'Past Due', variant: 'amber' },
  cancelled: { label: 'Canceled', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'destructive' },
};

// ============================================================================
// Helpers
// ============================================================================

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCost(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ============================================================================
// Skeleton placeholders
// ============================================================================

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 rounded bg-ink-200 animate-pulse" />
        <div className="h-4 w-64 rounded bg-ink-100 animate-pulse mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 w-48 rounded bg-ink-100 animate-pulse" />
        <div className="h-4 w-56 rounded bg-ink-100 animate-pulse" />
        <div className="h-10 w-44 rounded-md bg-ink-200 animate-pulse mt-4" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <Badge variant="secondary">No Subscription</Badge>;
  }

  const config = STATUS_CONFIG[status];
  if (!config) {
    return <Badge variant="secondary">{status}</Badge>;
  }

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

function UsageProgressBar({ cost, limit }: { cost: number; limit: number }) {
  const percent = Math.min((cost / limit) * 100, 100);
  const isWarning = percent >= 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink-700">
          {formatCost(cost)} of {formatCost(limit)} used
        </span>
        <span className={isWarning ? 'font-semibold text-amber-600' : 'text-ink-500'}>
          {percent.toFixed(0)}%
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-ink-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isWarning ? 'bg-amber-500' : 'bg-[#006EE6]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-200">
      <CardContent className="flex items-center gap-4 py-6">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
        <div className="flex-1">
          <p className="text-sm text-red-700">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-red-600 hover:text-red-800 underline underline-offset-2"
        >
          Retry
        </button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [subError, setSubError] = useState<string | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    setSubLoading(true);
    setSubError(null);
    try {
      const res = await fetch('/api/subscription/status');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.details || 'Failed to load subscription info');
      }
      setSubscription(await res.json());
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubLoading(false);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const res = await fetch('/api/usage');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.details || 'Failed to load usage data');
      }
      setUsage(await res.json());
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    fetchUsage();
  }, [fetchSubscription, fetchUsage]);

  async function handleManageSubscription() {
    setPortalLoading(true);
    const toastId = toast.loading('Opening billing portal…');

    try {
      const res = await fetch('/api/stripe/billing-portal', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.details || 'Failed to open billing portal');
      }
      if (!data?.url) {
        throw new Error('No portal URL returned');
      }

      toast.dismiss(toastId);
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message, { id: toastId });
      setPortalLoading(false);
    }
  }

  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const dateLabel = isTrialing ? 'Trial ends' : isActive ? 'Next billing date' : 'Ended on';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-sans text-2xl font-bold text-ink-900">Account Settings</h1>
        <p className="text-sm text-ink-500 mt-1">
          Manage your subscription and monitor AI usage
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Subscription Info                                       */}
      {/* ------------------------------------------------------------------ */}
      {subLoading ? (
        <CardSkeleton />
      ) : subError ? (
        <ErrorCard message={subError} onRetry={fetchSubscription} />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#006EE6]" />
              <CardTitle className="text-lg">Subscription</CardTitle>
            </div>
            <CardDescription>
              CopyWorx Studio™ — $49/month
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-500">Status</span>
              <StatusBadge status={subscription?.status ?? null} />
            </div>

            {subscription?.endDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-500">{dateLabel}</span>
                <span className="text-sm font-medium text-ink-900">
                  {formatDate(subscription.endDate)}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#006EE6] to-[#A755F7] px-5 py-2.5 text-sm font-semibold text-white shadow transition-all duration-300 hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {portalLoading ? 'Redirecting…' : 'Manage Subscription'}
              {!portalLoading && <ExternalLink className="h-4 w-4" />}
            </button>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: AI Usage This Month                                     */}
      {/* ------------------------------------------------------------------ */}
      {usageLoading ? (
        <CardSkeleton />
      ) : usageError ? (
        <ErrorCard message={usageError} onRetry={fetchUsage} />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#A755F7]" />
              <CardTitle className="text-lg">AI Usage This Month</CardTitle>
            </div>
            <CardDescription>
              Token and API call consumption against your monthly allowance
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {usage && usage.totalApiCalls > 0 ? (
              <>
                <UsageProgressBar cost={usage.totalCost} limit={USAGE_LIMIT_USD} />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-ink-500 uppercase tracking-wide">API Calls</p>
                    <p className="text-lg font-semibold text-ink-900">
                      {usage.totalApiCalls.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500 uppercase tracking-wide">Tokens Used</p>
                    <p className="text-lg font-semibold text-ink-900">
                      {usage.totalTokens.toLocaleString()}
                    </p>
                  </div>
                </div>

                {subscription?.endDate && (
                  <p className="text-xs text-ink-400">
                    Usage resets on {formatDate(subscription.endDate)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-400 italic">
                No usage data available yet. Start using AI tools and your stats will appear here.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
