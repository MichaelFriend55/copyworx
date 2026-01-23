/**
 * @file app/api/db/documents/route.ts
 * @description API route for document CRUD operations
 * 
 * Endpoints:
 * - GET: Fetch documents (all for project or single by ID)
 * - POST: Create a new document
 * - PUT: Update an existing document
 * - DELETE: Delete a document
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

type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type DocumentUpdate = Database['public']['Tables']['documents']['Update'];

// Type-safe helper to bypass TypeScript's overly strict Supabase typing
function supabaseQuery<T>(query: any): Promise<{ data: T | null; error: any }> {
  return query as unknown as Promise<{ data: T | null; error: any }>;
}

// ============================================================================
// GET - Fetch documents
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
    const documentId = searchParams.get('id');
    const baseTitle = searchParams.get('base_title');

    // Fetch single document by ID
    if (documentId) {
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return notFoundResponse('Document');
        }
        return internalErrorResponse(error);
      }

      return NextResponse.json(document);
    }

    // Fetch all documents for a project
    if (!projectId) {
      return badRequestResponse('Project ID is required');
    }

    // Fetch document versions by base_title (if provided)
    if (baseTitle) {
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('base_title', baseTitle)
        .order('version', { ascending: true });

      if (error) {
        return internalErrorResponse(error);
      }

      return NextResponse.json(documents || []);
    }

    // Fetch all documents for a project (no base_title filter)
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('modified_at', { ascending: false });

    if (error) {
      return internalErrorResponse(error);
    }

    return NextResponse.json(documents || []);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// POST - Create a new document
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
      base_title, 
      title, 
      content = '', 
      version = 1,
      parent_version_id,
      folder_id,
      metadata,
      template_progress
    } = body;

    // Validate required fields
    if (!project_id) {
      return badRequestResponse('Project ID is required');
    }

    if (!base_title || typeof base_title !== 'string' || base_title.trim().length === 0) {
      return badRequestResponse('Document title is required');
    }

    if (base_title.trim().length > 200) {
      return badRequestResponse('Document title cannot exceed 200 characters');
    }

    // Create the document
    const insertData = {
      project_id,
      user_id: userId,
      base_title: base_title.trim(),
      title: title || base_title.trim(),
      content,
      version,
      parent_version_id,
      folder_id,
      metadata: metadata || {},
      template_progress,
    };

    const query = supabase
      .from('documents')
      .insert(insertData as any)
      .select()
      .single();
    
    const { data: document, error } = await supabaseQuery<DocumentRow>(query);

    if (error) {
      console.error('Supabase error creating document:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(document, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// PUT - Update an existing document
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
      return badRequestResponse('Document ID is required');
    }

    // Filter allowed update fields
    const allowedFields = [
      'base_title', 'title', 'content', 'folder_id', 
      'metadata', 'template_progress'
    ];
    
    const filteredUpdates: DocumentUpdate = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (filteredUpdates as any)[field] = updates[field];
      }
    }

    // Validate title if being updated
    if (filteredUpdates.base_title !== undefined) {
      const baseTitle = filteredUpdates.base_title;
      if (typeof baseTitle !== 'string' || baseTitle.trim().length === 0) {
        return badRequestResponse('Document title cannot be empty');
      }
      if (baseTitle.trim().length > 200) {
        return badRequestResponse('Document title cannot exceed 200 characters');
      }
      filteredUpdates.base_title = baseTitle.trim();
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return badRequestResponse('No valid updates provided');
    }

    // Update the document
    const query = supabase
      .from('documents')
      // @ts-expect-error - Supabase query builder types resolve to 'never' with strict settings
      .update(filteredUpdates as any)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    const { data: document, error } = await supabaseQuery<DocumentRow>(query);

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('Document');
      }
      console.error('Supabase error updating document:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json(document);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// DELETE - Delete a document
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
      return badRequestResponse('Document ID is required');
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error deleting document:', error);
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
