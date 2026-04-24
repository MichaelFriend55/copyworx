/**
 * @file app/api/db/personas/route.ts
 * @description API route for persona CRUD operations
 * 
 * Endpoints:
 * - GET: Fetch personas (all for project or single by ID)
 * - POST: Create a new persona
 * - PUT: Update an existing persona
 * - DELETE: Delete a persona
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
// GET - Fetch personas
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
    const projectId = searchParams.get('project_id');
    const personaId = searchParams.get('id');

    // Fetch single persona by ID
    if (personaId) {
      const { data: persona, error } = await (supabase
        .from('personas') as any)
        .select('*')
        .eq('id', personaId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('Persona');
        }
        return internalErrorResponse(error);
      }

      return NextResponse.json(persona);
    }

    // Fetch all personas for a project
    if (!projectId) {
      return badRequestResponse('Project ID is required');
    }

    const { data: personas, error } = await (supabase
      .from('personas') as any)
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      return internalErrorResponse(error);
    }

    return NextResponse.json(personas || []);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// POST - Create a new persona
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
      project_id,
      name,
      photo_url,
      demographics = '',
      psychographics = '',
      pain_points = '',
      language_patterns = '',
      goals = ''
    } = body;

    // Validate required fields
    if (!project_id || typeof project_id !== 'string') {
      return badRequestResponse('project_id is required');
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return badRequestResponse('Persona name is required');
    }

    if (name.trim().length > 100) {
      return badRequestResponse('Persona name cannot exceed 100 characters');
    }

    // Validate photo URL size if provided (base64 data URLs can be large)
    if (photo_url && photo_url.startsWith('data:image/')) {
      const base64Data = photo_url.split(',')[1];
      const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
      if (sizeInBytes > 2 * 1024 * 1024) { // 2MB limit
        return badRequestResponse('Photo size too large. Please use an image smaller than 2MB.');
      }
    }

    // Verify caller owns the target project. 403 on ownership mismatch,
    // 500 on any query-level failure — see verifyProjectOwnership docs.
    const ownership = await verifyProjectOwnership(supabase, project_id, userId);
    if (!ownership.ok) {
      return ownership.response;
    }

    // Create the persona
    const { data: persona, error } = await (supabase
      .from('personas') as any)
      .insert({
        project_id,
        user_id: userId,
        name: name.trim(),
        photo_url,
        demographics: demographics.trim(),
        psychographics: psychographics.trim(),
        pain_points: pain_points.trim(),
        language_patterns: language_patterns.trim(),
        goals: goals.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating persona:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(persona, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// PUT - Update an existing persona
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
      return badRequestResponse('Persona ID is required');
    }

    // Filter allowed update fields. `project_id` is included here to support
    // reassigning a persona to a different project via the edit modal.
    const allowedFields = [
      'project_id', 'name', 'photo_url', 'demographics', 'psychographics',
      'pain_points', 'language_patterns', 'goals'
    ];

    const filteredUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    // Validate name if being updated
    if (filteredUpdates.name !== undefined) {
      const name = filteredUpdates.name as string;
      if (typeof name !== 'string' || name.trim().length === 0) {
        return badRequestResponse('Persona name cannot be empty');
      }
      if (name.trim().length > 100) {
        return badRequestResponse('Persona name cannot exceed 100 characters');
      }
      filteredUpdates.name = name.trim();
    }

    // Validate photo URL size if being updated
    if (filteredUpdates.photo_url) {
      const photoUrl = filteredUpdates.photo_url as string;
      if (photoUrl.startsWith('data:image/')) {
        const base64Data = photoUrl.split(',')[1];
        const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
        if (sizeInBytes > 2 * 1024 * 1024) {
          return badRequestResponse('Photo size too large. Please use an image smaller than 2MB.');
        }
      }
    }

    // If the caller is reassigning the persona to a different project, verify
    // they own the target project before allowing the write. 403 on mismatch,
    // 500 on query-level failure — see verifyProjectOwnership docs.
    if (filteredUpdates.project_id !== undefined) {
      const targetProjectId = filteredUpdates.project_id;
      if (typeof targetProjectId !== 'string' || targetProjectId.length === 0) {
        return badRequestResponse('project_id must be a non-empty string');
      }
      const ownership = await verifyProjectOwnership(supabase, targetProjectId, userId);
      if (!ownership.ok) {
        return ownership.response;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return badRequestResponse('No valid updates provided');
    }

    // Update the persona
    const { data: persona, error } = await (supabase
      .from('personas') as any)
      .update(filteredUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Persona');
      }
      console.error('Supabase error updating persona:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(persona);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// DELETE - Delete a persona
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

    if (!id) {
      return badRequestResponse('Persona ID is required');
    }

    const { error } = await (supabase
      .from('personas') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error deleting persona:', error);
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
