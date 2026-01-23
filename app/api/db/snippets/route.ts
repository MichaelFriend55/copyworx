/**
 * @file app/api/db/snippets/route.ts
 * @description API route for snippet CRUD operations
 * 
 * Endpoints:
 * - GET: Fetch snippets for a project
 * - POST: Create a new snippet
 * - PUT: Update an existing snippet
 * - DELETE: Delete a snippet
 * - PATCH: Increment snippet usage count
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
// GET - Fetch snippets
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
    const snippetId = searchParams.get('id');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');

    // Fetch single snippet by ID
    if (snippetId) {
      const { data: snippet, error } = await supabase
        .from('snippets')
        .select('*')
        .eq('id', snippetId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('Snippet');
        }
        return internalErrorResponse(error);
      }

      return NextResponse.json(snippet);
    }

    // Fetch all snippets for a project
    if (!projectId) {
      return badRequestResponse('Project ID is required');
    }

    let query = supabase
      .from('snippets')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,content.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply tag filter
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: snippets, error } = await query.order('modified_at', { ascending: false });

    if (error) {
      return internalErrorResponse(error);
    }

    return NextResponse.json(snippets || []);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// POST - Create a new snippet
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
      content,
      description,
      tags = []
    } = body;

    // Validate required fields
    if (!project_id) {
      return badRequestResponse('Project ID is required');
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return badRequestResponse('Snippet name is required');
    }

    if (name.trim().length > 100) {
      return badRequestResponse('Snippet name cannot exceed 100 characters');
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return badRequestResponse('Snippet content is required');
    }

    if (content.length > 50000) {
      return badRequestResponse('Snippet content cannot exceed 50,000 characters');
    }

    // Create the snippet
    const { data: snippet, error } = await supabase
      .from('snippets')
      .insert({
        project_id,
        user_id: userId,
        name: name.trim(),
        content,
        description: description?.trim() || null,
        tags: tags || [],
        usage_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating snippet:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(snippet, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// PUT - Update an existing snippet
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
      return badRequestResponse('Snippet ID is required');
    }

    // Filter allowed update fields
    const allowedFields = ['name', 'content', 'description', 'tags'];
    
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
        return badRequestResponse('Snippet name cannot be empty');
      }
      if (name.trim().length > 100) {
        return badRequestResponse('Snippet name cannot exceed 100 characters');
      }
      filteredUpdates.name = name.trim();
    }

    // Validate content if being updated
    if (filteredUpdates.content !== undefined) {
      const content = filteredUpdates.content as string;
      if (typeof content !== 'string' || content.trim().length === 0) {
        return badRequestResponse('Snippet content cannot be empty');
      }
      if (content.length > 50000) {
        return badRequestResponse('Snippet content cannot exceed 50,000 characters');
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return badRequestResponse('No valid updates provided');
    }

    // Update the snippet
    const { data: snippet, error } = await supabase
      .from('snippets')
      .update(filteredUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Snippet');
      }
      console.error('Supabase error updating snippet:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(snippet);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// PATCH - Increment snippet usage count
// ============================================================================

export async function PATCH(request: NextRequest) {
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
      return badRequestResponse('Snippet ID is required');
    }

    // Increment usage count using RPC or raw SQL
    const { data: snippet, error } = await supabase
      .from('snippets')
      .update({
        usage_count: supabase.rpc ? undefined : 1 // Placeholder - will use RPC
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    // Alternative: Use raw increment
    const { error: updateError } = await supabase.rpc('increment_snippet_usage', {
      snippet_id: id,
      user_id_param: userId
    }).catch(() => {
      // If RPC doesn't exist, do manual increment
      return { error: null };
    });

    // Fallback: Manual increment
    if (snippet || !updateError) {
      const { data: currentSnippet } = await supabase
        .from('snippets')
        .select('usage_count')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (currentSnippet) {
        await supabase
          .from('snippets')
          .update({ usage_count: (currentSnippet.usage_count || 0) + 1 })
          .eq('id', id)
          .eq('user_id', userId);
      }
    }

    return NextResponse.json({ success: true, id });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// DELETE - Delete a snippet
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
      return badRequestResponse('Snippet ID is required');
    }

    const { error } = await supabase
      .from('snippets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error deleting snippet:', error);
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
