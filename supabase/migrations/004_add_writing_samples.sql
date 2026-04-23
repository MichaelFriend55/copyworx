-- ============================================================================
-- Migration: Add Writing Samples to Brand Voices
-- ============================================================================
--
-- Adds a writing_samples column to the brand_voices table so users can paste
-- 2–5 pieces of existing brand copy. These samples are injected into every
-- AI prompt that uses the brand voice, dramatically improving output quality
-- because the model learns voice from examples better than from rules.
--
-- Column details:
--   - Name:     writing_samples
--   - Type:     jsonb (array of strings)
--   - Default:  '[]'::jsonb  (so existing rows stay valid)
--   - Nullable: yes (safety for existing rows, though default makes this moot)
--   - Index:    none (read alongside the full brand voice row, never queried)
--
-- Validation (max 5 samples, each >= 20 chars when non-empty) is enforced
-- in the application layer on write, not in the database. Storing as plain
-- JSONB keeps existing reads and sync transforms simple.
-- ============================================================================

-- UP ------------------------------------------------------------------------
ALTER TABLE brand_voices
  ADD COLUMN IF NOT EXISTS writing_samples jsonb DEFAULT '[]'::jsonb;

-- Backfill any existing NULL values (defensive; default handles new rows)
UPDATE brand_voices
  SET writing_samples = '[]'::jsonb
  WHERE writing_samples IS NULL;

-- ============================================================================
-- DOWN (rollback) -----------------------------------------------------------
-- Run this if you need to revert the migration:
--
--   ALTER TABLE brand_voices DROP COLUMN IF EXISTS writing_samples;
--
-- ============================================================================
