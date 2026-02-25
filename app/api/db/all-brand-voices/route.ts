/**
 * @file app/api/db/all-brand-voices/route.ts
 * @description API route for fetching ALL brand voices for a user (across all projects)
 * 
 * Used by the MY INSIGHTS section to populate the brand voice selector dropdown.
 * Returns all brand voices the user has created, regardless of which project they belong to.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { 
  requireUserId, 
  unauthorizedResponse, 
  internalErrorResponse 
} from '@/lib/utils/api-auth';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Brand voice with project context for display in selectors
 */
interface BrandVoiceWithProject {
  id: string;
  projectId: string | null;
  projectName: string | null;
  brandName: string;
  brandTone: string;
  approvedPhrases: string[];
  forbiddenWords: string[];
  brandValues: string[];
  missionStatement: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GET - Fetch all brand voices for a user
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

    // Fetch all brand voices for this user
    // Use LEFT JOIN (projects) to include brand voices without project_id
    // FK hint required because migration 001 added projects.brand_voice_id,
    // creating a second FK between brand_voices and projects. Without the hint
    // PostgREST cannot resolve which relationship to follow.
    const { data: brandVoices, error } = await (supabase
      .from('brand_voices') as any)
      .select(`
        id,
        project_id,
        brand_name,
        brand_tone,
        approved_phrases,
        forbidden_words,
        brand_values,
        mission_statement,
        created_at,
        updated_at,
        projects!brand_voices_project_id_fkey(name)
      `)
      .eq('user_id', userId)
      .order('brand_name', { ascending: true });

    if (error) {
      console.error('Supabase error fetching brand voices:', error);
      return internalErrorResponse(error);
    }

    // Transform the data to match our expected format
    const transformedBrandVoices: BrandVoiceWithProject[] = (brandVoices || []).map((bv: any) => ({
      id: bv.id,
      projectId: bv.project_id || null,
      projectName: bv.projects?.name || null,
      brandName: bv.brand_name,
      brandTone: bv.brand_tone || '',
      approvedPhrases: bv.approved_phrases || [],
      forbiddenWords: bv.forbidden_words || [],
      brandValues: bv.brand_values || [],
      missionStatement: bv.mission_statement || '',
      createdAt: bv.created_at,
      updatedAt: bv.updated_at,
    }));

    return NextResponse.json(transformedBrandVoices);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}
