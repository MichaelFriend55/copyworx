-- ============================================================================
-- CopyWorx Database Schema for Supabase
-- ============================================================================
-- 
-- Run this SQL in your Supabase SQL Editor to create the database schema.
-- 
-- IMPORTANT: Execute this in order - tables first, then indexes, then RLS.
-- ============================================================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Projects table - Top-level organizational unit
-- Each user can have multiple projects, each with its own brand voice, personas, docs
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand voices table - One per project (brand configuration)
CREATE TABLE IF NOT EXISTS brand_voices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_tone TEXT DEFAULT '',
  approved_phrases TEXT[] DEFAULT '{}',
  forbidden_words TEXT[] DEFAULT '{}',
  brand_values TEXT[] DEFAULT '{}',
  mission_statement TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One brand voice per project
  UNIQUE(project_id)
);

-- Personas table - Target audience profiles (multiple per project)
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  demographics TEXT DEFAULT '',
  psychographics TEXT DEFAULT '',
  pain_points TEXT DEFAULT '',
  language_patterns TEXT DEFAULT '',
  goals TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Folders table - Document organization (hierarchical)
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table - Copywriting content with version control
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  base_title TEXT NOT NULL,
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  content TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  template_progress JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Snippets table - Reusable copy elements
CREATE TABLE IF NOT EXISTS snippets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table - Store per-user preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  active_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- Brand voices indexes
CREATE INDEX IF NOT EXISTS idx_brand_voices_project_id ON brand_voices(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_voices_user_id ON brand_voices(user_id);

-- Personas indexes
CREATE INDEX IF NOT EXISTS idx_personas_project_id ON personas(project_id);
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);

-- Folders indexes
CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_folder_id ON folders(parent_folder_id);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_modified_at ON documents(modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_base_title ON documents(project_id, base_title);

-- Snippets indexes
CREATE INDEX IF NOT EXISTS idx_snippets_project_id ON snippets(project_id);
CREATE INDEX IF NOT EXISTS idx_snippets_user_id ON snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_snippets_modified_at ON snippets(modified_at DESC);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Projects
-- ============================================================================

-- Users can only view their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can only insert their own projects
CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can only update their own projects
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can only delete their own projects
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- RLS POLICIES - Brand Voices
-- ============================================================================

CREATE POLICY "Users can view own brand voices" ON brand_voices
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own brand voices" ON brand_voices
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own brand voices" ON brand_voices
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own brand voices" ON brand_voices
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- RLS POLICIES - Personas
-- ============================================================================

CREATE POLICY "Users can view own personas" ON personas
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own personas" ON personas
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own personas" ON personas
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own personas" ON personas
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- RLS POLICIES - Folders
-- ============================================================================

CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own folders" ON folders
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- RLS POLICIES - Documents
-- ============================================================================

CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- RLS POLICIES - Snippets
-- ============================================================================

CREATE POLICY "Users can view own snippets" ON snippets
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own snippets" ON snippets
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own snippets" ON snippets
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own snippets" ON snippets
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- RLS POLICIES - User Settings
-- ============================================================================

CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update modified_at timestamp (for documents/snippets)
CREATE OR REPLACE FUNCTION update_modified_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Projects: Auto-update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Brand voices: Auto-update updated_at
CREATE TRIGGER update_brand_voices_updated_at
  BEFORE UPDATE ON brand_voices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Personas: Auto-update updated_at
CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON personas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Folders: Auto-update updated_at
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Documents: Auto-update modified_at
CREATE TRIGGER update_documents_modified_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_at_column();

-- Snippets: Auto-update modified_at
CREATE TRIGGER update_snippets_modified_at
  BEFORE UPDATE ON snippets
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_at_column();

-- User settings: Auto-update updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================
-- 
-- 1. Run this entire script in Supabase SQL Editor
-- 2. The RLS policies use Clerk's JWT claims (request.jwt.claims->>'sub')
-- 3. Since we're using Clerk for auth (not Supabase Auth), we'll bypass RLS
--    in API routes using the service_role key
-- 4. All timestamps use TIMESTAMP WITH TIME ZONE for proper timezone handling
-- 5. Cascading deletes ensure data integrity when projects are deleted
-- 
-- ============================================================================
