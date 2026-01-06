/**
 * @file components/layout/sidebar.tsx
 * @description Sidebar navigation for the authenticated app area
 * 
 * Features:
 * - Collapsible sidebar
 * - Active state indicators
 * - Icon + text navigation
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Settings,
  HelpCircle,
  Feather,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Sidebar navigation items
 */
const navItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/templates',
    icon: FileText,
    label: 'Templates',
  },
  {
    href: '/projects',
    icon: FolderOpen,
    label: 'Projects',
  },
] as const;

/**
 * Bottom navigation items
 */
const bottomNavItems = [
  {
    href: '#settings',
    icon: Settings,
    label: 'Settings',
  },
  {
    href: '#help',
    icon: HelpCircle,
    label: 'Help & Support',
  },
] as const;

/**
 * Sidebar component
 * 
 * Collapsible sidebar for the authenticated app area.
 * Includes navigation links and user info.
 */
export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-ink-950 text-white border-r border-ink-800 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-ink-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 shadow-lg shrink-0">
            <Feather className="h-4 w-4 text-ink-900" />
          </div>
          {!isCollapsed && (
            <span className="font-display text-lg font-bold text-white">
              CopyWorx
            </span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-ink-300 hover:bg-ink-800 hover:text-white',
                isCollapsed && 'justify-center'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-amber-400')} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 px-2 border-t border-ink-800 space-y-1">
        {bottomNavItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-ink-400 hover:bg-ink-800 hover:text-white transition-all duration-200',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </div>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-ink-800">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-center text-ink-400 hover:text-white hover:bg-ink-800',
            isCollapsed && 'px-2'
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

