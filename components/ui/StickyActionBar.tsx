/**
 * @file components/ui/StickyActionBar.tsx
 * @description Reusable sticky action bar for slide-outs and right-sidebar tool panels.
 *
 * Purpose:
 * Primary action buttons (Save, Generate, Shift Tone, Accept Rewrite, etc.) need to
 * remain visible at the bottom of their containing panel regardless of scroll position.
 * This component encapsulates the visual treatment (thin top border, subtle shadow,
 * matching background) and — via the `variant` prop — the positioning strategy.
 *
 * Two positioning variants exist because the two contexts this bar appears in have
 * fundamentally different layouts:
 *
 * 1. `variant="static"` — used inside SlideOutPanel's `footer` slot. That slot is a
 *    `flex-shrink-0` row inside a fixed flex-column panel. The slot already reserves
 *    the bar's natural height, so the bar only needs visual chrome — no positioning
 *    classes. Without them, the scrolling content region above (`flex-1 overflow-y-auto`)
 *    correctly shrinks to `panel height − header − footer` and content cannot overlap
 *    the bar. This is the approach used by BrandVoiceSlideOut, PersonasSlideOut (list
 *    view and, post-migration, create/edit view), MyProjectsSlideOut, and
 *    TemplateFormSlideOut.
 *
 * 2. `variant="absolute"` — used inside right-sidebar tool panels. Each tool renders
 *    its StickyActionBar as the last child of a scrolling flex column that lives inside
 *    a `position: relative` bounded-height wrapper provided by `RightSidebarContent`.
 *    Because `overflow: auto` does not establish a containing block for absolutely
 *    positioned descendants, the bar escapes the scroll region and anchors to the
 *    nearest positioned ancestor — the tool cell's relative wrapper. This keeps the
 *    bar pinned to the panel's viewport bottom regardless of content length and
 *    regardless of scroll position. The sibling scroll region carries `pb-36` to
 *    reserve breathing room above the bar so content never scrolls underneath it.
 *
 * The bar renders null when it has no meaningful children, so panels in states with no
 * primary action (e.g. a tool showing results where the result card owns its own
 * actions) simply do not render a bar.
 *
 * Consumers own their button layout (composability via children). This component
 * only provides the chrome and positioning.
 *
 * Call-site convention: every consumer passes `variant` explicitly. The default is
 * `static`, but explicit intent at the call site is preferred over inherited defaults
 * so a reader can tell which positioning strategy is in use without cross-referencing.
 *
 * @example Slide-out footer usage
 * ```tsx
 * <SlideOutPanel
 *   footer={
 *     <StickyActionBar variant="static">
 *       <Button>Save</Button>
 *     </StickyActionBar>
 *   }
 * >
 *   …
 * </SlideOutPanel>
 * ```
 *
 * @example Right-sidebar tool usage
 * ```tsx
 * <StickyActionBar variant="absolute">
 *   <button className="btn-primary w-full">Generate</button>
 * </StickyActionBar>
 * ```
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Positioning strategy for the action bar.
 *
 * - `static`: no positioning classes. Bar is a normal block; its parent is expected
 *   to reserve space for it (e.g. SlideOutPanel's `flex-shrink-0` footer slot).
 * - `absolute`: `position: absolute; bottom: 0; left: 0; right: 0; z-10`. Bar anchors
 *   to the nearest positioned ancestor; parent is expected to be `position: relative`
 *   and to pad its scrolling content with ≥`pb-36` so content does not scroll
 *   underneath the bar.
 */
export type StickyActionBarVariant = 'static' | 'absolute';

export interface StickyActionBarProps {
  /**
   * Action buttons to render inside the bar. When empty/null, the bar renders null.
   */
  children?: React.ReactNode;

  /**
   * Positioning strategy. See {@link StickyActionBarVariant}. Defaults to `static`,
   * but every call site should pass this explicitly — intent at the call site is
   * preferred over default inheritance so the positioning strategy is self-evident
   * when reading a consumer.
   */
  variant?: StickyActionBarVariant;

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
 * Positioning classes per variant. Kept as a lookup so the intent of each
 * variant is readable at a glance.
 */
const VARIANT_POSITIONING: Record<StickyActionBarVariant, string> = {
  static: '',
  absolute: 'absolute bottom-0 left-0 right-0 z-10',
};

/**
 * StickyActionBar — shared bottom bar for panel primary actions.
 *
 * Visual spec (applied in both variants):
 * - White background to match panels.
 * - 1px top border in gray-200.
 * - Soft upward shadow to reinforce layering.
 * - Vertical padding `py-3` (works in the 320px right-sidebar and in wider slide-outs).
 * - Horizontal padding `px-4`; consumers can override via className for edge cases.
 *
 * Positioning spec varies by variant — see {@link StickyActionBarVariant}.
 */
export function StickyActionBar({
  children,
  variant = 'static',
  className,
}: StickyActionBarProps) {
  if (!hasRenderableChildren(children)) {
    return null;
  }

  return (
    <div
      className={cn(
        VARIANT_POSITIONING[variant],
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
