/**
 * @file app/api/db/user-settings/route.ts
 * @description API route for user settings and preferences
 * 
 * Endpoints:
 * - GET: Fetch user settings (including active project ID)
 * - POST: Create or update user settings (upsert)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { 
  requireUserId, 
  unauthorizedResponse, 
  badRequestResponse,
  internalErrorResponse 
} from '@/lib/utils/api-auth';

// ============================================================================
// GET - Fetch user settings
// ============================================================================

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured', details: 'Supabase is not set up' },
        { status: 503 }
      );
    }

    const userId = await requireUserId();
    const supabase = getSupabaseAdmin();

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // No settings found is not an error - return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          user_id: userId,
          active_project_id: null,
          settings: {},
        });
      }
      return internalErrorResponse(error);
    }

    return NextResponse.json(settings);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}

// ============================================================================
// POST - Create or update user settings (upsert)
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
    const { active_project_id, settings } = body;

    // Check if settings already exist for this user
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id, settings')
      .eq('user_id', userId)
      .single();

    let result;

    if (existing) {
      // Update existing settings
      const updates: Record<string, unknown> = {};
      
      if (active_project_id !== undefined) {
        updates.active_project_id = active_project_id;
      }
      
      if (settings !== undefined) {
        // Merge settings instead of replacing
        updates.settings = {
          ...(existing.settings || {}),
          ...settings,
        };
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(existing);
      }

      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating user settings:', error);
        return internalErrorResponse(error);
      }
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          active_project_id: active_project_id || null,
          settings: settings || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating user settings:', error);
        return internalErrorResponse(error);
      }
      result = data;
    }

    return NextResponse.json(result, { status: existing ? 200 : 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}
