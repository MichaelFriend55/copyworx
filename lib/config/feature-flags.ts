/**
 * @file lib/config/feature-flags.ts
 * @description Environment-variable-based feature flags for CopyWorx.
 *
 * All flags read from NEXT_PUBLIC_* environment variables so they are
 * available in both client and server code. A missing variable is always
 * treated as `false` — features ship dark by default and must be explicitly
 * enabled.
 *
 * To enable a flag locally, set the variable in .env.local and restart the
 * dev server. In Vercel, set it under Project Settings -> Environment Variables
 * scoped to ALL environments (Production, Preview, and Development).
 */

export const featureFlags = {
  /**
   * WORX DESK — AI-assisted brief-to-copy on-ramp.
   * When enabled, users can paste or upload a creative brief, receive a
   * Strategic Review, answer clarifying questions, and generate copy directly
   * into the editor. Controlled by NEXT_PUBLIC_WORXDESK_ENABLED.
   */
  worxdeskEnabled: process.env.NEXT_PUBLIC_WORXDESK_ENABLED === 'true',
} as const;
