/**
 * @file app/api/db/sync/route.ts
 * @description API route for syncing all project data at once
 * 
 * This endpoint fetches all projects with their nested data (brand voice,
 * personas, folders, documents, snippets) in a single request, optimized
 * for initial app load.
 * 
 * Endpoint:
 * - GET: Fetch all projects with nested data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { 
  requireUserId, 
  unauthorizedResponse,
  internalErrorResponse 
} from '@/lib/utils/api-auth';
import type { WorxDeskMetadata } from '@/lib/types/worxdesk';

// ============================================================================
// Types for synced data
// ============================================================================

interface SyncedBrandVoice {
  id: string;
  brandName: string;
  brandTone: string;
  approvedPhrases: string[];
  forbiddenWords: string[];
  brandValues: string[];
  missionStatement: string;
  writing_samples: string[];
  savedAt?: Date;
}

interface SyncedPersona {
  id: string;
  projectId: string;
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

interface SyncedFolder {
  id: string;
  name: string;
  projectId: string;
  parentFolderId?: string;
  createdAt: string;
  updatedAt: string;
}

interface SyncedDocument {
  id: string;
  projectId: string;
  baseTitle: string;
  title: string;
  version: number;
  parentVersionId?: string;
  folderId?: string;
  content: string;
  createdAt: string;
  modifiedAt: string;
  metadata?: {
    wordCount?: number;
    charCount?: number;
    templateId?: string;
    tags?: string[];
  };
  templateProgress?: unknown;
  // Mirrors `documents.worxdesk_metadata`. Always emitted (null when the
  // column is empty) so the client never has to distinguish between
  // "missing field" and "null column" — the round-trip shape is stable.
  worxdeskMetadata: WorxDeskMetadata | null;
}

interface SyncedSnippet {
  id: string;
  projectId: string;
  name: string;
  content: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  modifiedAt: string;
  usageCount: number;
}

interface SyncedProject {
  id: string;
  name: string;
  /**
   * The project's active brand voice — resolved in priority order below.
   * See the mapping logic in the GET handler for the exact resolution rules.
   */
  brandVoice: SyncedBrandVoice | null;
  /**
   * All brand voices whose `brand_voices.project_id` equals this project's
   * id, ordered by `created_at ASC` for deterministic rendering.
   */
  brandVoices: SyncedBrandVoice[];
  /**
   * Mirror of `projects.brand_voice_id`. `null` means no explicit choice.
   * The sidebar compares this against each `brandVoices[i].id` to decide
   * which row gets the "Active" pill.
   */
  brandVoiceId: string | null;
  personas: SyncedPersona[];
  folders: SyncedFolder[];
  documents: SyncedDocument[];
  snippets: SyncedSnippet[];
  createdAt: string;
  updatedAt: string;
}

interface SyncResponse {
  projects: SyncedProject[];
  activeProjectId: string | null;
  lastSyncedAt: string;
}

// ============================================================================
// GET - Fetch all projects with nested data
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

    // Fetch all data in parallel for better performance
    const [
      projectsResult,
      brandVoicesResult,
      personasResult,
      foldersResult,
      documentsResult,
      snippetsResult,
      settingsResult,
    ] = await Promise.all([
      (supabase
        .from('projects') as any)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
      (supabase
        .from('brand_voices') as any)
        .select('*')
        .eq('user_id', userId)
        // Ordering by created_at ASC gives the sidebar a stable per-project
        // render order AND makes the "oldest" fallback deterministic when
        // `projects.brand_voice_id` is NULL.
        .order('created_at', { ascending: true }),
      (supabase
        .from('personas') as any)
        .select('*')
        .eq('user_id', userId),
      (supabase
        .from('folders') as any)
        .select('*')
        .eq('user_id', userId),
      (supabase
        .from('documents') as any)
        .select('*')
        .eq('user_id', userId)
        .order('modified_at', { ascending: false }),
      (supabase
        .from('snippets') as any)
        .select('*')
        .eq('user_id', userId)
        .order('modified_at', { ascending: false }),
      (supabase
        .from('user_settings') as any)
        .select('active_project_id')
        .eq('user_id', userId)
        .single(),
    ]);

    // Check for errors
    if (projectsResult.error) {
      console.error('Error fetching projects:', projectsResult.error);
      return internalErrorResponse(projectsResult.error);
    }

    const projects = projectsResult.data || [];
    const brandVoices = brandVoicesResult.data || [];
    const personas = personasResult.data || [];
    const folders = foldersResult.data || [];
    const documents = documentsResult.data || [];
    const snippets = snippetsResult.data || [];
    const activeProjectId = settingsResult.data?.active_project_id || null;

    // Build the synced projects with nested data
    const syncedProjects: SyncedProject[] = projects.map((project: any) => {
      // Collect ALL brand voices belonging to this project, preserving the
      // ORDER BY created_at ASC applied on the query above. The sidebar
      // renders this array directly — one row per brand voice.
      const projectBrandVoices = brandVoices.filter(
        (bv: any) => bv.project_id === project.id
      );

      // Resolve the singular "active" brand voice in this priority order:
      //   1. The row whose id equals `projects.brand_voice_id` (explicit).
      //   2. The oldest row with matching `project_id` (deterministic
      //      fallback when the project has no explicit choice yet).
      //   3. null (no brand voices on this project).
      // Tools like Brand Check / Word Advisor / template generators keep
      // reading this singular field — do not remove it.
      const brandVoiceIdOnProject: string | null = project.brand_voice_id ?? null;
      let activeBrandVoice: any = null;
      if (brandVoiceIdOnProject) {
        activeBrandVoice =
          projectBrandVoices.find((bv: any) => bv.id === brandVoiceIdOnProject) ?? null;
      }
      if (!activeBrandVoice && projectBrandVoices.length > 0) {
        // Fallback: oldest-first (index 0 since we pre-sorted created_at ASC).
        activeBrandVoice = projectBrandVoices[0];
      }

      // Filter related data for this project
      const projectPersonas = personas.filter((p: any) => p.project_id === project.id);
      const projectFolders = folders.filter((f: any) => f.project_id === project.id);
      const projectDocuments = documents.filter((d: any) => d.project_id === project.id);
      const projectSnippets = snippets.filter((s: any) => s.project_id === project.id);

      // Shared mapper so the singular brandVoice and the brandVoices array
      // produce identical shapes — drift here would create subtle type bugs
      // in consumers that read both fields.
      const toSyncedBrandVoice = (bv: any): SyncedBrandVoice => ({
        id: bv.id,
        brandName: bv.brand_name,
        brandTone: bv.brand_tone,
        approvedPhrases: bv.approved_phrases || [],
        forbiddenWords: bv.forbidden_words || [],
        brandValues: bv.brand_values || [],
        missionStatement: bv.mission_statement,
        writing_samples: Array.isArray(bv.writing_samples) ? bv.writing_samples : [],
        savedAt: bv.updated_at ? new Date(bv.updated_at) : undefined,
      });

      return {
        id: project.id,
        name: project.name,
        brandVoice: activeBrandVoice ? toSyncedBrandVoice(activeBrandVoice) : null,
        brandVoices: projectBrandVoices.map(toSyncedBrandVoice),
        brandVoiceId: brandVoiceIdOnProject,
        personas: projectPersonas.map((p: any) => ({
          id: p.id,
          projectId: p.project_id,
          name: p.name,
          photoUrl: p.photo_url || undefined,
          demographics: p.demographics,
          psychographics: p.psychographics,
          painPoints: p.pain_points,
          languagePatterns: p.language_patterns,
          goals: p.goals,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })),
        folders: projectFolders.map((f: any) => ({
          id: f.id,
          name: f.name,
          projectId: f.project_id,
          parentFolderId: f.parent_folder_id || undefined,
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        })),
        documents: projectDocuments.map((d: any) => ({
          id: d.id,
          projectId: d.project_id,
          baseTitle: d.base_title,
          title: d.title,
          version: d.version,
          parentVersionId: d.parent_version_id || undefined,
          folderId: d.folder_id || undefined,
          content: d.content,
          createdAt: d.created_at,
          modifiedAt: d.modified_at,
          metadata: d.metadata as SyncedDocument['metadata'],
          templateProgress: d.template_progress,
          worxdeskMetadata:
            (d.worxdesk_metadata as WorxDeskMetadata | null | undefined) ?? null,
        })),
        snippets: projectSnippets.map((s: any) => ({
          id: s.id,
          projectId: s.project_id,
          name: s.name,
          content: s.content,
          description: s.description || undefined,
          tags: s.tags || undefined,
          createdAt: s.created_at,
          modifiedAt: s.modified_at,
          usageCount: s.usage_count,
        })),
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      };
    });

    const response: SyncResponse = {
      projects: syncedProjects,
      activeProjectId,
      lastSyncedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    return internalErrorResponse(error);
  }
}
