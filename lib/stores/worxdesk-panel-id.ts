/**
 * @file lib/stores/worxdesk-panel-id.ts
 * @description Single source of truth for the WORX DESK slide-out panel id.
 *
 * Lives in its own file to avoid a circular dependency between
 * `components/workspace/WorxDeskSlideOut.tsx` (which imports hooks from
 * `worxdeskStore.ts`) and `worxdeskStore.ts` (which needs the constant to
 * programmatically close the panel via `useSlideOutStore`).
 *
 * Both modules import from here. No circular dep.
 */

/** Unique panel id for the WORX DESK on-ramp slide-out. */
export const WORXDESK_PANEL_ID = 'worxdesk-onramp';
