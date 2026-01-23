/**
 * @file app/api/db/brand-voices/route.ts
 * @description API route for brand voice CRUD operations
 * 
 * Endpoints:
 * - GET: Fetch brand voice for a project
 * - POST: Create/update brand voice for a project (upsert)
 * - DELETE: Delete brand voice from a project
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

type BrandVoiceRow = Database['public']['Tables']['brand_voices']['Row'];
type BrandVoiceInsert = Database['public']['Tables']['brand_voices']['Insert'];
type BrandVoiceUpdate = Database['public']['Tables']['brand_voices']['Update'];

// Type-safe helper to bypass TypeScript's overly strict Supabase typing
function supabaseUpdate<T>(query: any): Promise<{ data: T | null; error: any }> {
  return query as unknown as Promise<{ data: T | null; error: any }>;
}

// ============================================================================
// GET - Fetch brand voice for a project
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

    if (!projectId) {
      return badRequestResponse('Project ID is required');
    }

    const { data: brandVoice, error } = await supabase
      .from('brand_voices')
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

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// POST - Create or update brand voice (upsert)
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
      brand_name,
      brand_tone,
      approved_phrases,
      forbidden_words,
      brand_values,
      mission_statement
    } = body;

    // Validate required fields
    if (!project_id) {
      return badRequestResponse('Project ID is required');
    }

    if (!brand_name || typeof brand_name !== 'string' || brand_name.trim().length === 0) {
      return badRequestResponse('Brand name is required');
    }

    // Prepare typed data object
    const brandVoiceData: BrandVoiceUpdate = {
      brand_name: brand_name.trim(),
      brand_tone: typeof brand_tone === 'string' ? brand_tone : '',
      approved_phrases: Array.isArray(approved_phrases) ? approved_phrases : [],
      forbidden_words: Array.isArray(forbidden_words) ? forbidden_words : [],
      brand_values: Array.isArray(brand_values) ? brand_values : [],
      mission_statement: typeof mission_statement === 'string' ? mission_statement : '',
    };

    // Check if brand voice already exists for this project
    const { data: existing, error: existingError } = await (supabase
      .from('brand_voices')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', userId)
      .maybeSingle() as unknown as Promise<{ data: { id: string } | null; error: any }>);

    let result: BrandVoiceRow;

    if (existing && !existingError) {
      // Update existing brand voice
      const query = supabase
        .from('brand_voices')
        // @ts-expect-error - Supabase query builder types resolve to 'never' with strict settings
        .update(brandVoiceData as any)
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single();
      
      const { data, error } = await supabaseUpdate<BrandVoiceRow>(query);

      if (error) {
        console.error('Supabase error updating brand voice:', error);
        return internalErrorResponse(error);
      }
      result = data!;
    } else {
      // Create new brand voice
      const insertData = {
        project_id,
        user_id: userId,
        brand_name: brandVoiceData.brand_name!,
        brand_tone: brandVoiceData.brand_tone,
        approved_phrases: brandVoiceData.approved_phrases,
        forbidden_words: brandVoiceData.forbidden_words,
        brand_values: brandVoiceData.brand_values,
        mission_statement: brandVoiceData.mission_statement,
      };

      const query = supabase
        .from('brand_voices')
        .insert(insertData as any)
        .select()
        .single();
      
      const { data, error } = await supabaseUpdate<BrandVoiceRow>(query);

      if (error) {
        console.error('Supabase error creating brand voice:', error);
        return internalErrorResponse(error);
      }
      result = data!;
    }

    return NextResponse.json(result, { status: existing ? 200 : 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// DELETE - Delete brand voice from a project
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
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return badRequestResponse('Project ID is required');
    }

    const { error } = await supabase
      .from('brand_voices')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error deleting brand voice:', error);
      return internalErrorResponse(error);
    }

    return NextResponse.json({ success: true, project_id: projectId });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}
