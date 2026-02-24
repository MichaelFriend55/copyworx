-- ============================================================================
-- Migration: Add Stripe Subscription Fields to Users
-- ============================================================================
--
-- Creates a `users` table to store Stripe subscription data alongside
-- Clerk user IDs. This is the source of truth for subscription status.
--
-- Columns:
--   - stripe_customer_id: Stripe customer identifier
--   - subscription_status: Current subscription state (default 'inactive')
--   - subscription_end_date: When the current billing period ends
--
-- ============================================================================

-- Step 1: Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  subscription_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Add columns individually if table already exists but columns are missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Step 3: Index on user_id for fast lookups from Clerk auth
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Step 4: Index on stripe_customer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Step 5: Enable RLS (row level security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 6: Policy — users can only read their own record
CREATE POLICY IF NOT EXISTS "Users can read own record"
  ON users FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Step 7: Service role can do anything (for API routes with supabaseAdmin)
CREATE POLICY IF NOT EXISTS "Service role full access"
  ON users FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- ============================================================================
-- Notes:
-- - user_id stores the Clerk user ID (e.g., "user_2abc123...")
-- - subscription_status values: 'inactive', 'active', 'cancelled', 'past_due'
-- - subscription_end_date is set from Stripe's current_period_end
-- - The webhook handler uses supabaseAdmin (service role) to upsert records
-- ============================================================================
