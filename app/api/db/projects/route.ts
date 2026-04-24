/**
 * @file app/api/db/projects/route.ts
 * @description API route for project CRUD operations
 * 
 * Endpoints:
 * - GET: Fetch all projects for the authenticated user
 * - POST: Create a new project
 * - PUT: Update an existing project
 * - DELETE: Delete a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  requireUserId,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  internalErrorResponse,
  projectAccessDeniedResponse,
} from '@/lib/utils/api-auth';

// ============================================================================
// Type Definitions
// ============================================================================

interface ProjectResponse {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// GET - Fetch all projects
// ============================================================================

export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    // Fetch projects for this user
    const { data: projects, error } = await (supabase
      .from('projects') as any)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching projects:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(projects || []);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// POST - Create a new project
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    // Parse request body
    const body = await request.json();
    const { name } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return badRequestResponse('Project name is required');
    }

    if (name.trim().length > 100) {
      return badRequestResponse('Project name cannot exceed 100 characters');
    }

    // Create the project
    const { data: project, error } = await (supabase
      .from('projects') as any)
      .insert({
        user_id: userId,
        name: name.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating project:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(project, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// PUT - Update an existing project
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    // Parse request body. `brand_voice_id` is optional; it may be a UUID
    // string (Set Active) or explicitly `null` (clear the active pointer).
    const body = await request.json();
    const { id, name, brand_voice_id } = body as {
      id?: string;
      name?: string;
      brand_voice_id?: string | null;
    };

    // Validate required fields
    if (!id) {
      return badRequestResponse('Project ID is required');
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return badRequestResponse('Project name cannot be empty');
      }
      if (name.trim().length > 100) {
        return badRequestResponse('Project name cannot exceed 100 characters');
      }
      updates.name = name.trim();
    }

    // brand_voice_id handling. `undefined` means "not touching this field".
    // `null` clears the pointer. A string must reference a brand voice the
    // caller owns AND whose `project_id` matches the project being updated —
    // otherwise we would let callers activate a brand voice that doesn't
    // actually belong to this project.
    if (brand_voice_id !== undefined) {
      if (brand_voice_id === null) {
        updates.brand_voice_id = null;
      } else if (typeof brand_voice_id !== 'string' || brand_voice_id.length === 0) {
        return badRequestResponse('brand_voice_id must be a non-empty string or null');
      } else {
        const { data: bv, error: bvError } = await (supabase
          .from('brand_voices') as any)
          .select('id, project_id, user_id')
          .eq('id', brand_voice_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (bvError) {
          console.error('Error verifying brand voice ownership:', bvError);
          return internalErrorResponse(bvError);
        }
        if (!bv) {
          // Brand voice missing OR not owned — collapse to 403 so we do
          // not disclose existence to unauthorized callers.
          return projectAccessDeniedResponse();
        }
        if (bv.project_id !== id) {
          return badRequestResponse(
            'brand_voice_id must belong to this project'
          );
        }
        updates.brand_voice_id = brand_voice_id;
      }
    }

    if (Object.keys(updates).length === 0) {
      return badRequestResponse('No valid updates provided');
    }

    // Update the project. The `.eq('user_id', userId)` guarantees the caller
    // owns the project; combined with the brand-voice ownership check above,
    // both sides of the foreign key are validated.
    const { data: project, error } = await (supabase
      .from('projects') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Project');
      }
      console.error('Supabase error updating project:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(project);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// DELETE - Delete a project
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    // Get project ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return badRequestResponse('Project ID is required');
    }

    // Delete the project (cascading deletes will handle related data)
    const { error } = await (supabase
      .from('projects') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error deleting project:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json({ success: true, id });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}
