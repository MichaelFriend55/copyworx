/**
 * @file app/api/db/brand-voices/route.ts
 * @description API route for brand voice CRUD operations
 * 
 * Endpoints:
 * - GET: Fetch brand voice by ID or for a project
 * - POST: Create a new brand voice (project_id is optional)
 * - PUT: Update an existing brand voice
 * - DELETE: Delete brand voice by ID or project_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { 
  requireUserId, 
  unauthorizedResponse, 
  badRequestResponse, 
  notFoundResponse,
  internalErrorResponse,
  verifyProjectOwnership,
} from '@/lib/utils/api-auth';

// ============================================================================
// GET - Fetch brand voice by ID or for a project
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('project_id');

    // Fetch by ID takes precedence
    if (id) {
      const { data: brandVoice, error } = await (supabase
        .from('brand_voices') as any)
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('Brand voice');
        }
        return internalErrorResponse(error);
      }

      return NextResponse.json(brandVoice);
    }

    // Fetch by project_id (legacy support)
    if (projectId) {
      const { data: brandVoice, error } = await (supabase
        .from('brand_voices') as any)
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single();

      if (error) {
        // No brand voice found is not an error - return null
        if (error.code === 'PGRST116') {
          return NextResponse.json(null);
        }
        return internalErrorResponse(error);
      }

      return NextResponse.json(brandVoice);
    }

    return badRequestResponse('Either ID or Project ID is required');

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// POST - Create a new brand voice (project_id is now optional)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const {
      project_id, // Optional - brand voices can exist independently
      brand_name,
      brand_tone,
      approved_phrases,
      forbidden_words,
      brand_values,
      mission_statement,
      writing_samples,
    } = body;

    // Validate required fields
    if (!brand_name || typeof brand_name !== 'string' || brand_name.trim().length === 0) {
      return badRequestResponse('Brand name is required');
    }

    // When project_id is supplied on create, verify caller owns that project.
    // project_id is optional for brand voices (migration 001), so we only run
    // the check when a value is present. 403 on mismatch, 500 on query error.
    if (project_id !== undefined && project_id !== null) {
      if (typeof project_id !== 'string' || project_id.length === 0) {
        return badRequestResponse('project_id must be a non-empty string');
      }
      const ownership = await verifyProjectOwnership(supabase, project_id, userId);
      if (!ownership.ok) {
        return ownership.response;
      }
    }

    // Sanitize writing samples: non-string entries are dropped; strings are
    // trimmed; empties filtered; max 5 enforced. 20-char minimum is a UI
    // validation — the DB accepts whatever the client submits after filtering.
    const sanitizedWritingSamples = Array.isArray(writing_samples)
      ? writing_samples
          .filter((s: unknown): s is string => typeof s === 'string')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
          .slice(0, 5)
      : [];

    // Create new brand voice (project_id is optional)
    const insertData: Record<string, unknown> = {
      user_id: userId,
      brand_name: brand_name.trim(),
      brand_tone: typeof brand_tone === 'string' ? brand_tone : '',
      approved_phrases: Array.isArray(approved_phrases) ? approved_phrases : [],
      forbidden_words: Array.isArray(forbidden_words) ? forbidden_words : [],
      brand_values: Array.isArray(brand_values) ? brand_values : [],
      mission_statement: typeof mission_statement === 'string' ? mission_statement : '',
      writing_samples: sanitizedWritingSamples,
    };

    // Only add project_id if provided
    if (project_id) {
      insertData.project_id = project_id;
    }

    const { data, error } = await (supabase
      .from('brand_voices') as any)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating brand voice:', error);
      
      // Check for unique constraint violation
      if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return NextResponse.json(
          { 
            error: 'Brand voice already exists',
            details: 'A brand voice already exists for this project. To enable multiple brand voices, please run the database migration: supabase/migrations/001_multiple_brand_voices.sql'
          },
          { status: 409 }
        );
      }
      
      // Check for NOT NULL violation (project_id required)
      if (error.code === '23502' || error.message?.includes('not-null') || error.message?.includes('null value')) {
        return NextResponse.json(
          { 
            error: 'Project ID required',
            details: 'The database requires a project_id. To create brand voices without a project, please run the database migration: supabase/migrations/001_multiple_brand_voices.sql'
          },
          { status: 400 }
        );
      }
      
      return internalErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// PUT - Update an existing brand voice
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return badRequestResponse('Brand voice ID is required');
    }

    // Filter allowed update fields
    const allowedFields = [
      'brand_name', 'brand_tone', 'approved_phrases',
      'forbidden_words', 'brand_values', 'mission_statement',
      'writing_samples', 'project_id'
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    // Validate brand_name if being updated
    if (filteredUpdates.brand_name !== undefined) {
      const brandName = filteredUpdates.brand_name as string;
      if (typeof brandName !== 'string' || brandName.trim().length === 0) {
        return badRequestResponse('Brand name cannot be empty');
      }
      filteredUpdates.brand_name = brandName.trim();
    }

    // Sanitize writing_samples if present on update
    if (filteredUpdates.writing_samples !== undefined) {
      const raw = filteredUpdates.writing_samples;
      filteredUpdates.writing_samples = Array.isArray(raw)
        ? raw
            .filter((s: unknown): s is string => typeof s === 'string')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)
            .slice(0, 5)
        : [];
    }

    // If caller is reassigning the brand voice to a different project, verify
    // they own the target project. project_id may be explicitly null (move
    // brand voice to "unassigned"), which is allowed without an ownership
    // check. Only a non-null string triggers validation. 403 on mismatch,
    // 500 on query error.
    if (filteredUpdates.project_id !== undefined && filteredUpdates.project_id !== null) {
      const targetProjectId = filteredUpdates.project_id;
      if (typeof targetProjectId !== 'string' || targetProjectId.length === 0) {
        return badRequestResponse('project_id must be a non-empty string or null');
      }
      const ownership = await verifyProjectOwnership(supabase, targetProjectId, userId);
      if (!ownership.ok) {
        return ownership.response;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return badRequestResponse('No valid updates provided');
    }

    // Update the brand voice
    const { data, error } = await (supabase
      .from('brand_voices') as any)
      .update(filteredUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Brand voice');
      }
      console.error('Supabase error updating brand voice:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(data);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// DELETE - Delete brand voice by ID or project_id
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('project_id');

    // Delete by ID takes precedence
    if (id) {
      const { error } = await (supabase
        .from('brand_voices') as any)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase error deleting brand voice:', error);
        return internalErrorResponse(error);
      }

      return NextResponse.json({ success: true, id });
    }

    // Delete by project_id (legacy support)
    if (projectId) {
      const { error } = await (supabase
        .from('brand_voices') as any)
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase error deleting brand voice:', error);
        return internalErrorResponse(error);
      }

      return NextResponse.json({ success: true, project_id: projectId });
    }

    return badRequestResponse('Either ID or Project ID is required');

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}
