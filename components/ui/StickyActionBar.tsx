/**
 * @file components/ui/StickyActionBar.tsx
 * @description Reusable sticky action bar for slide-outs and right-sidebar tool panels.
 *
 * Purpose:
 * Primary action buttons (Save, Generate, Shift Tone, Accept Rewrite, etc.) need to
 * remain visible at the bottom of their containing panel regardless of scroll position.
 * This component encapsulates the visual treatment (thin top border, subtle shadow,
 * matching background) and sticky behavior so every panel gets a consistent action bar.
 *
 * Behavior:
 * - Sticks to the bottom of the nearest scroll container (right-sidebar tools), or
 *   sits inside SlideOutPanel's footer slot (slide-outs). Both cases use the same
 *   visual treatment.
 * - Renders null when it has no meaningful children, so panels in states with no
 *   primary action (e.g. a tool showing results where the result card owns its own
 *   actions) simply do not render a bar.
 *
 * Consumers own their button layout (composability via children). This component
 * only provides the chrome.
 *
 * @example
 * ```tsx
 * <StickyActionBar>
 *   <button className="btn-primary w-full">Generate</button>
 * </StickyActionBar>
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface StickyActionBarProps {
  /**
   * Action buttons to render inside the bar. When empty/null, the bar renders null.
   */
  children?: React.ReactNode;

  /**
   * Optional class overrides. Use sparingly — the bar's default styling is
   * intentionally unified across the app.
   */
  className?: string;
}

/**
 * Returns true when `children` contains at least one renderable node.
 * Filters out null/undefined/false so conditional children don't force an
 * empty bar to render.
 */
function hasRenderableChildren(children: React.ReactNode): boolean {
  // React.Children.toArray already filters out null, undefined, and booleans,
  // so the array contains only the children React will actually render.
  const array = React.Children.toArray(children);
  return array.length > 0;
}

/**
 * StickyActionBar — shared sticky bottom bar for panel primary actions.
 *
 * Visual spec:
 * - `position: sticky; bottom: 0` inside the nearest scroll container.
 * - `z-10` so it paints above scrolling content but below modals/portals.
 * - White background to match panels.
 * - 1px top border in gray-200.
 * - Soft upward shadow to reinforce layering.
 * - Vertical padding py-3 (works in the 320px right-sidebar and in wider slide-outs).
 * - Horizontal padding px-4; consumers can override via className for edge cases.
 */
export function StickyActionBar({ children, className }: StickyActionBarProps) {
  if (!hasRenderableChildren(children)) {
    return null;
  }

  return (
    <div
      className={cn(
        'sticky bottom-0 z-10',
        'px-4 py-3',
        'bg-white',
        'border-t border-gray-200',
        'shadow-[0_-4px_6px_-4px_rgba(0,0,0,0.08)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export default StickyActionBar;
