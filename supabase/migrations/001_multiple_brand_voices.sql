-- ============================================================================
-- Migration: Multiple Brand Voices Per User
-- ============================================================================
-- 
-- This migration allows users to create multiple brand voices that exist
-- independently of projects. Brand voices can optionally be assigned to projects.
--
-- Changes:
-- 1. Drop UNIQUE constraint on project_id (allows multiple brand voices)
-- 2. Make project_id nullable (brand voices can exist without a project)
-- 3. Add brand_voice_id column to projects table (to assign a default brand voice)
-- 
-- ============================================================================

-- Step 1: Drop the unique constraint on project_id
ALTER TABLE brand_voices DROP CONSTRAINT IF EXISTS brand_voices_project_id_key;

-- Step 2: Make project_id nullable (brand voices can exist independently)
ALTER TABLE brand_voices ALTER COLUMN project_id DROP NOT NULL;

-- Step 3: Add brand_voice_id to projects table (for assigning a brand voice to a project)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_voice_id UUID REFERENCES brand_voices(id) ON DELETE SET NULL;

-- Step 4: Create index on brand_voice_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_brand_voice_id ON projects(brand_voice_id);

-- ============================================================================
-- Notes:
-- - Existing brand voices with project_id set will continue to work
-- - New brand voices can be created without a project_id
-- - Projects can reference a brand_voice_id for their default brand voice
-- - When a brand voice is deleted, projects.brand_voice_id is set to NULL
-- ============================================================================
