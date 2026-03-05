/**
 * @file app/(app)/layout.tsx
 * @description Layout for authenticated app pages
 * 
 * Includes:
 * - Sidebar navigation
 * - Header with user info and UserButton
 * - Main content area
 */

import { currentUser } from '@clerk/nextjs/server';
import UserMenu from '@/components/layout/user-menu';
import { Sidebar } from '@/components/layout/sidebar';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * App layout component
 * 
 * Wraps all authenticated pages with the app sidebar and header.
 * Protected by Clerk middleware - only accessible to authenticated users.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6">
          <div>
            {/* Breadcrumb or search could go here */}
          </div>
          
          {/* User Section */}
          <div className="flex items-center gap-4">
            {/* Notifications Button */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-ink-600" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-amber-500 rounded-full" />
            </Button>
            
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-3 pr-2 border-r border-border">
              <div className="text-right">
                <p className="text-sm font-medium text-ink-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-ink-500">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>
            
            {/* User Button */}
            <UserMenu />
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
