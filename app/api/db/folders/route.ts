/**
 * @file app/api/db/folders/route.ts
 * @description API route for folder CRUD operations
 * 
 * Endpoints:
 * - GET: Fetch folders for a project
 * - POST: Create a new folder
 * - PUT: Update an existing folder (name or parent)
 * - DELETE: Delete a folder
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/lib/types/database';
import { 
  requireUserId, 
  unauthorizedResponse, 
  badRequestResponse, 
  notFoundResponse,
  internalErrorResponse 
} from '@/lib/utils/api-auth';

type FolderRow = Database['public']['Tables']['folders']['Row'];
type FolderInsert = Database['public']['Tables']['folders']['Insert'];
type FolderUpdate = Database['public']['Tables']['folders']['Update'];

// Type-safe helper to bypass TypeScript's overly strict Supabase typing
function supabaseQuery<T>(query: any): Promise<{ data: T | null; error: any }> {
  return query as unknown as Promise<{ data: T | null; error: any }>;
}

// ============================================================================
// GET - Fetch folders
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
    const folderId = searchParams.get('id');

    // Fetch single folder by ID
    if (folderId) {
      const { data: folder, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('Folder');
        }
        return internalErrorResponse(error);
      }

      return NextResponse.json(folder);
    }

    // Fetch all folders for a project
    if (!projectId) {
      return badRequestResponse('Project ID is required');
    }

    const { data: folders, error } = await supabase
      .from('folders')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      return internalErrorResponse(error);
    }

    return NextResponse.json(folders || []);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// POST - Create a new folder
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
    const { project_id, name, parent_folder_id } = body;

    // Validate required fields
    if (!project_id) {
      return badRequestResponse('Project ID is required');
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return badRequestResponse('Folder name is required');
    }

    if (name.trim().length > 100) {
      return badRequestResponse('Folder name cannot exceed 100 characters');
    }

    // If parent_folder_id provided, verify it exists and belongs to user
    if (parent_folder_id) {
      const { data: parentFolder, error: parentError } = await supabase
        .from('folders')
        .select('id')
        .eq('id', parent_folder_id)
        .eq('user_id', userId)
        .single();

      if (parentError || !parentFolder) {
        return badRequestResponse('Parent folder not found');
      }
    }

    // Create the folder
    const insertData = {
      project_id,
      user_id: userId,
      name: name.trim(),
      parent_folder_id: parent_folder_id || null,
    };

    const query = supabase
      .from('folders')
      .insert(insertData as any)
      .select()
      .single();
    
    const { data: folder, error } = await supabaseQuery<FolderRow>(query);

    if (error) {
      console.error('Supabase error creating folder:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(folder, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// PUT - Update an existing folder
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
    const { id, name, parent_folder_id } = body;

    if (!id) {
      return badRequestResponse('Folder ID is required');
    }

    const updates: FolderUpdate = {};

    // Validate and add name update
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return badRequestResponse('Folder name cannot be empty');
      }
      if (name.trim().length > 100) {
        return badRequestResponse('Folder name cannot exceed 100 characters');
      }
      updates.name = name.trim();
    }

    // Handle parent_folder_id update (for moving folders)
    if (parent_folder_id !== undefined) {
      // Check for circular reference
      if (parent_folder_id === id) {
        return badRequestResponse('Cannot move folder into itself');
      }

      if (parent_folder_id !== null) {
        // Verify new parent exists and belongs to user
        const { data: parentFolder, error: parentError } = await supabase
          .from('folders')
          .select('id')
          .eq('id', parent_folder_id)
          .eq('user_id', userId)
          .single();

        if (parentError || !parentFolder) {
          return badRequestResponse('Parent folder not found');
        }

        // TODO: Check for circular reference by walking up the parent chain
      }

      updates.parent_folder_id = parent_folder_id;
    }

    if (Object.keys(updates).length === 0) {
      return badRequestResponse('No valid updates provided');
    }

    // Update the folder
    const query = supabase
      .from('folders')
      // @ts-expect-error - Supabase query builder types resolve to 'never' with strict settings
      .update(updates as any)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    const { data: folder, error } = await supabaseQuery<FolderRow>(query);

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Folder');
      }
      console.error('Supabase error updating folder:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(folder);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// DELETE - Delete a folder
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
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return badRequestResponse('Folder ID is required');
    }

    // Check for subfolders
    const { data: subfolders } = await supabase
      .from('folders')
      .select('id')
      .eq('parent_folder_id', id)
      .eq('user_id', userId);

    if (subfolders && subfolders.length > 0 && !force) {
      return badRequestResponse(
        'Cannot delete folder with subfolders. Delete or move subfolders first, or use force=true.'
      );
    }

    // Check for documents in folder
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('folder_id', id)
      .eq('user_id', userId);

    if (documents && documents.length > 0 && !force) {
      return badRequestResponse(
        'Cannot delete folder with documents. Delete or move documents first, or use force=true.'
      );
    }

    // If force=true, delete everything (cascading deletes handle subfolders)
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error deleting folder:', error);
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
