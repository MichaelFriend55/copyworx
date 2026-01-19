/**
 * @file components/workspace/WorkspaceLayout.tsx
 * @description Three-column workspace layout container
 * 
 * Features:
 * - Three-column grid layout
 * - Left sidebar: 280px (tools/templates)
 * - Center: Flexible width (editor)
 * - Right sidebar: 320px (AI analysis)
 * - Handles sidebar collapse/expand
 * - Smooth transitions
 * - Responsive breakpoints
 * - Apple-style aesthetic
 * 
 * @example
 * ```tsx
 * <WorkspaceLayout
 *   leftSidebar={<div>Tools</div>}
 *   rightSidebar={<div>AI Analysis</div>}
 * >
 *   <EditorArea />
 * </WorkspaceLayout>
 * ```
 */

'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { useLeftSidebarOpen, useRightSidebarOpen, useUIActions, useViewMode } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils';

interface WorkspaceLayoutProps {
  /** Content for left sidebar */
  leftSidebar?: React.ReactNode;
  
  /** Content for right sidebar */
  rightSidebar?: React.ReactNode;
  
  /** Main editor content */
  children: React.ReactNode;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * Three-column workspace layout with collapsible sidebars
 */
export function WorkspaceLayout({
  leftSidebar,
  rightSidebar,
  children,
  className,
}: WorkspaceLayoutProps) {
  // Optimized selectors
  const leftSidebarOpen = useLeftSidebarOpen();
  const rightSidebarOpen = useRightSidebarOpen();
  const viewMode = useViewMode();
  const { toggleLeftSidebar, toggleRightSidebar } = useUIActions();

  // In Focus Mode, force close both sidebars but keep them in DOM
  const isFocusMode = viewMode === 'focus';

  return (
    <div className={cn('h-screen w-screen flex flex-col overflow-hidden', className)}>
      {/* Top toolbar */}
      <Toolbar />

      {/* Main workspace area */}
      <div className="flex-1 flex overflow-hidden transition-all duration-300">
        {/* Left sidebar - always rendered but collapsed in Focus Mode */}
        {leftSidebar && (
          <Sidebar
            side="left"
            isOpen={leftSidebarOpen && !isFocusMode}
            onToggle={toggleLeftSidebar}
          >
            {leftSidebar}
          </Sidebar>
        )}

        {/* Center editor area */}
        <main 
          className={cn(
            'flex-1 h-full overflow-hidden transition-all duration-300',
            isFocusMode && 'mx-auto w-full'
          )}
        >
          {children}
        </main>

        {/* Right sidebar - always rendered but collapsed in Focus Mode */}
        {rightSidebar && (
          <Sidebar
            side="right"
            isOpen={rightSidebarOpen && !isFocusMode}
            onToggle={toggleRightSidebar}
          >
            {rightSidebar}
          </Sidebar>
        )}
      </div>
    </div>
  );
}



