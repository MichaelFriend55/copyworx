-- ============================================================================
-- Migration: Add Admin Bypass Flag
-- ============================================================================
--
-- Adds an `is_admin` boolean column to the `users` table.
-- Admin users bypass subscription and usage-limit checks entirely.
-- This flag is database-only — never exposed in UI or client metadata.
--
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Fast lookup when middleware checks admin status
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(user_id) WHERE is_admin = true;
