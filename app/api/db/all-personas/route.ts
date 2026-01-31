/**
 * @file app/api/db/all-personas/route.ts
 * @description API route for fetching ALL personas for a user (across all projects)
 * 
 * Used by the MY INSIGHTS section to populate the persona selector dropdown.
 * Returns all personas the user has created, regardless of which project they belong to.
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
 * Persona with project context for display in selectors
 */
interface PersonaWithProject {
  id: string;
  projectId: string | null;
  projectName: string | null;
  name: string;
  photoUrl?: string;
  demographics: string;
  psychographics: string;
  painPoints: string;
  languagePatterns: string;
  goals: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GET - Fetch all personas for a user
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

    // Fetch all personas for this user
    // Use LEFT JOIN (projects) to include personas without project_id (if any)
    const { data: personas, error } = await (supabase
      .from('personas') as any)
      .select(`
        id,
        project_id,
        name,
        photo_url,
        demographics,
        psychographics,
        pain_points,
        language_patterns,
        goals,
        created_at,
        updated_at,
        projects(name)
      `)
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase error fetching personas:', error);
      return internalErrorResponse(error);
    }

    // Transform the data to match our expected format
    const transformedPersonas: PersonaWithProject[] = (personas || []).map((p: any) => ({
      id: p.id,
      projectId: p.project_id || null,
      projectName: p.projects?.name || null,
      name: p.name,
      photoUrl: p.photo_url,
      demographics: p.demographics || '',
      psychographics: p.psychographics || '',
      painPoints: p.pain_points || '',
      languagePatterns: p.language_patterns || '',
      goals: p.goals || '',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return NextResponse.json(transformedPersonas);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}
