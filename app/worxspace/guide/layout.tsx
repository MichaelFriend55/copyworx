/**
 * @file app/worxspace/guide/layout.tsx
 * @description Standalone layout for the User Guide page.
 *
 * Intentionally lives outside the (app) route group so the guide page
 * renders its own sidebar instead of inheriting the standard application
 * sidebar, notification bell, and duplicate user header.
 *
 * Authentication is enforced by Clerk middleware (all /worxspace/* routes
 * are protected), not by this component.
 *
 * Structure this layout provides:
 *   - Optional TrialBanner (auto-hides unless user is trialing)
 *   - Slim header: right-aligned user name + avatar only, NO notification bell
 *   - <main> with no padding – the guide page manages its own inner layout
 */

import { currentUser } from '@clerk/nextjs/server';
import UserMenu from '@/components/layout/user-menu';
import TrialBanner from '@/components/layout/trial-banner';

export default async function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ink-50">
      {/* Trial banner – renders nothing unless the user is trialing */}
      <TrialBanner />

      {/* Header – user profile name + avatar only. No notification bell. */}
      <header className="h-16 shrink-0 border-b border-border bg-white flex items-center justify-end px-6">
        <div className="flex items-center gap-4">
          {/* Name + email – hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-border">
            <div className="text-right">
              <p className="text-sm font-medium text-ink-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-ink-500">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
          </div>

          {/* Avatar / user menu */}
          <UserMenu />
        </div>
      </header>

      {/* Content area – no padding; the guide page owns its layout */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
