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
  internalErrorResponse 
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

    // Parse request body
    const body = await request.json();
    const { id, name } = body;

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

    if (Object.keys(updates).length === 0) {
      return badRequestResponse('No valid updates provided');
    }

    // Update the project
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
