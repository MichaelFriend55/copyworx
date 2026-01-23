/**
 * @file lib/supabase.ts
 * @description Supabase client configuration for CopyWorx
 * 
 * Provides two clients:
 * - supabase: Public client for browser-side operations (uses anon key)
 * - supabaseAdmin: Server-side client for API routes (uses service role key)
 * 
 * IMPORTANT: Always use the appropriate client based on context:
 * - Components/Browser: Use `supabase` 
 * - API Routes: Use `supabaseAdmin` for elevated privileges
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation for required environment variables
if (!supabaseUrl) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL is not set. Supabase features will be disabled.');
}

if (!supabaseAnonKey) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Supabase features will be disabled.');
}

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Public Supabase client for browser-side operations
 * Uses anon key - respects Row Level Security (RLS) policies
 */
export const supabase: SupabaseClient<Database> | null = 
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, // We use Clerk for auth
          autoRefreshToken: false,
        },
      })
    : null;

/**
 * Admin Supabase client for server-side API routes
 * Uses service role key - bypasses RLS (use carefully!)
 * 
 * SECURITY: Only use in API routes, never expose to client
 */
export const supabaseAdmin: SupabaseClient<Database> | null =
  supabaseUrl && supabaseServiceKey
    ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

/**
 * Get a Supabase client, throwing if not configured
 * Use this when Supabase is required (not optional fallback)
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }
  return supabase;
}

/**
 * Get the admin Supabase client, throwing if not configured
 * Use this in API routes when elevated privileges are needed
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase admin is not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.'
    );
  }
  return supabaseAdmin;
}
