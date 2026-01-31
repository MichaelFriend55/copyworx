/**
 * @file app/api/db/run-migration/route.ts
 * @description API route to run database migrations via Supabase REST API
 * 
 * This endpoint allows running specific migrations to update the database schema.
 * Uses the Supabase REST API with service_role key to execute DDL commands.
 * 
 * Currently supports:
 * - multiple-brand-voices: Enables multiple brand voices per user
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { 
  requireUserId, 
  unauthorizedResponse, 
  badRequestResponse,
  internalErrorResponse 
} from '@/lib/utils/api-auth';

// ============================================================================
// Helper to execute SQL via Supabase REST API
// ============================================================================

async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Use the Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      // If RPC doesn't exist, try alternative method via pg_query
      const text = await response.text();
      return { success: false, error: `SQL execution failed: ${text}` };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ============================================================================
// POST - Run a specific migration
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    // Require authenticated user
    await requireUserId();
    
    const body = await request.json();
    const { migration } = body;

    if (!migration) {
      return badRequestResponse('Migration name is required');
    }

    if (migration === 'multiple-brand-voices') {
      const results: { step: string; success: boolean; error?: string }[] = [];
      
      // Try to execute migrations via SQL
      // Note: This requires the exec_sql function to be created in Supabase
      // If it doesn't exist, the user needs to run the migration manually
      
      // Step 1: Drop unique constraint
      const step1 = await executeSql(
        'ALTER TABLE brand_voices DROP CONSTRAINT IF EXISTS brand_voices_project_id_key;'
      );
      results.push({ step: 'Drop unique constraint', ...step1 });

      // Step 2: Make project_id nullable
      const step2 = await executeSql(
        'ALTER TABLE brand_voices ALTER COLUMN project_id DROP NOT NULL;'
      );
      results.push({ step: 'Make project_id nullable', ...step2 });

      // Step 3: Add brand_voice_id to projects
      const step3 = await executeSql(
        'ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_voice_id UUID REFERENCES brand_voices(id) ON DELETE SET NULL;'
      );
      results.push({ step: 'Add brand_voice_id column', ...step3 });

      // Step 4: Create index
      const step4 = await executeSql(
        'CREATE INDEX IF NOT EXISTS idx_projects_brand_voice_id ON projects(brand_voice_id);'
      );
      results.push({ step: 'Create index', ...step4 });

      const allSucceeded = results.every(r => r.success);
      const anyFailed = results.some(r => !r.success);

      if (anyFailed) {
        // Provide manual instructions
        return NextResponse.json({
          success: false,
          migration: 'multiple-brand-voices',
          results,
          message: 'Automatic migration failed. Please run the following SQL in your Supabase SQL Editor:',
          sql: `-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- Navigate to: SQL Editor > New Query

-- Step 1: Remove unique constraint (allows multiple brand voices)
ALTER TABLE brand_voices DROP CONSTRAINT IF EXISTS brand_voices_project_id_key;

-- Step 2: Make project_id optional (brand voices can exist without a project)
ALTER TABLE brand_voices ALTER COLUMN project_id DROP NOT NULL;

-- Step 3: Add brand_voice_id to projects (optional - for assigning brand voice to project)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_voice_id UUID REFERENCES brand_voices(id) ON DELETE SET NULL;

-- Step 4: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_brand_voice_id ON projects(brand_voice_id);

-- Done! You can now create multiple brand voices.`,
        }, { status: 200 });
      }

      return NextResponse.json({
        success: true,
        migration: 'multiple-brand-voices',
        results,
        message: 'Migration completed successfully! You can now create multiple brand voices.',
      });
    }

    return badRequestResponse(`Unknown migration: ${migration}`);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    console.error('Migration error:', error);
    return internalErrorResponse(error);
  }
}

// ============================================================================
// GET - Check migration status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    await requireUserId();
    const supabase = getSupabaseAdmin();

    // Check if multiple brand voices are enabled by checking constraints
    // Try to insert a brand voice without project_id and see if it fails
    
    // Instead, let's just check if we can create multiple brand voices for same project
    // by checking the constraint exists
    
    const status = {
      multipleBrandVoicesEnabled: false,
      message: 'Unknown status'
    };

    // Try a simple test: count brand voices per project
    const { data, error } = await (supabase
      .from('brand_voices') as any)
      .select('project_id')
      .limit(100);

    if (!error && data) {
      // Check if any project_id is null (would indicate migration ran)
      const hasNullProjectId = data.some((bv: any) => bv.project_id === null);
      
      if (hasNullProjectId) {
        status.multipleBrandVoicesEnabled = true;
        status.message = 'Multiple brand voices are enabled (project_id can be null)';
      } else {
        status.message = 'Migration may not have been run yet - project_id is still required';
      }
    }

    return NextResponse.json(status);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}
