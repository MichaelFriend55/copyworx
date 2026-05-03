-- ============================================================================
-- Migration: Add WORX DESK Metadata Column to Documents
-- ============================================================================
--
-- Adds a worxdesk_metadata column to the documents table to persist session
-- data from the WORX DESK on-ramp flow. Stores the original brief, deliverable
-- spec, supporting materials, AI Strategic Review output, clarifying Q&A,
-- extracted form data, and provenance metadata for every document created via
-- WORX DESK. Documents created through other flows leave this column NULL.
--
-- Column details:
--   - Name:     worxdesk_metadata
--   - Type:     jsonb
--   - Default:  NULL (most documents will not have WORX DESK metadata)
--   - Nullable: yes
--   - Index:    none (queried alongside the full document row, never filtered)
--
-- RLS note: Existing RLS policies on the documents table apply to entire rows
-- using user_id matching. They do not enumerate columns, so they automatically
-- cover this new column. No policy changes are required.
-- ============================================================================

-- UP ------------------------------------------------------------------------
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS worxdesk_metadata jsonb DEFAULT NULL;

-- ============================================================================
-- DOWN (rollback) -----------------------------------------------------------
-- Run this if you need to revert the migration:
--
--   ALTER TABLE documents DROP COLUMN IF EXISTS worxdesk_metadata;
--
-- ============================================================================
