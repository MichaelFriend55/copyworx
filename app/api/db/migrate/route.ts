/**
 * @file app/api/db/migrate/route.ts
 * @description API route for migrating localStorage data to Supabase
 * 
 * This endpoint handles the one-time migration of existing user data
 * from localStorage to the Supabase database.
 * 
 * Endpoint:
 * - POST: Migrate localStorage data to Supabase
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
// Types for migration data
// ============================================================================

interface MigrationProject {
  id: string;
  name: string;
  brandVoice?: {
    brandName: string;
    brandTone: string;
    approvedPhrases: string[];
    forbiddenWords: string[];
    brandValues: string[];
    missionStatement: string;
  } | null;
  personas: Array<{
    id: string;
    name: string;
    photoUrl?: string;
    demographics: string;
    psychographics: string;
    painPoints: string;
    languagePatterns: string;
    goals: string;
    createdAt: string;
    updatedAt: string;
  }>;
  folders: Array<{
    id: string;
    name: string;
    parentFolderId?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  documents: Array<{
    id: string;
    baseTitle: string;
    title: string;
    version: number;
    parentVersionId?: string;
    folderId?: string;
    content: string;
    createdAt: string;
    modifiedAt: string;
    metadata?: Record<string, unknown>;
    templateProgress?: Record<string, unknown>;
  }>;
  snippets: Array<{
    id: string;
    name: string;
    content: string;
    description?: string;
    tags?: string[];
    usageCount: number;
    createdAt: string;
    modifiedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface MigrationRequest {
  projects: MigrationProject[];
  activeProjectId?: string;
}

interface MigrationResult {
  success: boolean;
  migrated: {
    projects: number;
    brandVoices: number;
    personas: number;
    folders: number;
    documents: number;
    snippets: number;
  };
  errors: string[];
  idMapping: Record<string, string>; // old ID -> new ID
}

// ============================================================================
// POST - Migrate localStorage data to Supabase
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

    const body: MigrationRequest = await request.json();
    const { projects, activeProjectId } = body;

    if (!projects || !Array.isArray(projects)) {
      return badRequestResponse('Projects array is required');
    }

    const result: MigrationResult = {
      success: true,
      migrated: {
        projects: 0,
        brandVoices: 0,
        personas: 0,
        folders: 0,
        documents: 0,
        snippets: 0,
      },
      errors: [],
      idMapping: {},
    };

    // Process each project
    for (const project of projects) {
      try {
        // Create project
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: project.name,
            created_at: project.createdAt || new Date().toISOString(),
            updated_at: project.updatedAt || new Date().toISOString(),
          } as any)
          .select()
          .single() as { data: any; error: any };

        if (projectError || !newProject) {
          result.errors.push(`Failed to create project "${project.name}": ${projectError?.message}`);
          continue;
        }

        result.idMapping[project.id] = newProject.id;
        result.migrated.projects++;

        const projectId = newProject.id;

        // Migrate brand voice
        if (project.brandVoice && project.brandVoice.brandName) {
          try {
            const { error: bvError } = await supabase
              .from('brand_voices')
              .insert({
                project_id: projectId,
                user_id: userId,
                brand_name: project.brandVoice.brandName,
                brand_tone: project.brandVoice.brandTone || '',
                approved_phrases: project.brandVoice.approvedPhrases || [],
                forbidden_words: project.brandVoice.forbiddenWords || [],
                brand_values: project.brandVoice.brandValues || [],
                mission_statement: project.brandVoice.missionStatement || '',
              } as any);

            if (bvError) {
              result.errors.push(`Brand voice for "${project.name}": ${bvError.message}`);
            } else {
              result.migrated.brandVoices++;
            }
          } catch (e) {
            result.errors.push(`Brand voice error: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        }

        // Migrate folders (need to handle parent relationships)
        const folderIdMapping: Record<string, string> = {};
        
        // First pass: create all folders without parents
        for (const folder of project.folders || []) {
          try {
            const { data: newFolder, error: folderError } = await supabase
              .from('folders')
              .insert({
                project_id: projectId,
                user_id: userId,
                name: folder.name,
                parent_folder_id: null, // Will update in second pass
                created_at: folder.createdAt || new Date().toISOString(),
                updated_at: folder.updatedAt || new Date().toISOString(),
              } as any)
              .select()
              .single() as { data: any; error: any };

            if (folderError || !newFolder) {
              result.errors.push(`Folder "${folder.name}": ${folderError?.message}`);
            } else {
              folderIdMapping[folder.id] = newFolder.id;
              result.migrated.folders++;
            }
          } catch (e) {
            result.errors.push(`Folder error: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        }

        // Second pass: update parent relationships
        for (const folder of project.folders || []) {
          if (folder.parentFolderId && folderIdMapping[folder.id]) {
            const newParentId = folderIdMapping[folder.parentFolderId];
            if (newParentId) {
              await supabase
                .from('folders')
                .update({ parent_folder_id: newParentId })
                .eq('id', folderIdMapping[folder.id]);
            }
          }
        }

        // Migrate personas
        for (const persona of project.personas || []) {
          try {
            const { error: personaError } = await supabase
              .from('personas')
              .insert({
                project_id: projectId,
                user_id: userId,
                name: persona.name,
                photo_url: persona.photoUrl || null,
                demographics: persona.demographics || '',
                psychographics: persona.psychographics || '',
                pain_points: persona.painPoints || '',
                language_patterns: persona.languagePatterns || '',
                goals: persona.goals || '',
                created_at: persona.createdAt || new Date().toISOString(),
                updated_at: persona.updatedAt || new Date().toISOString(),
              } as any);

            if (personaError) {
              result.errors.push(`Persona "${persona.name}": ${personaError.message}`);
            } else {
              result.migrated.personas++;
            }
          } catch (e) {
            result.errors.push(`Persona error: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        }

        // Migrate documents (need to handle version relationships)
        const documentIdMapping: Record<string, string> = {};

        // First pass: create all documents without parent versions
        for (const doc of project.documents || []) {
          try {
            const { data: newDoc, error: docError } = await supabase
              .from('documents')
              .insert({
                project_id: projectId,
                user_id: userId,
                base_title: doc.baseTitle,
                title: doc.title,
                version: doc.version || 1,
                parent_version_id: null, // Will update in second pass
                folder_id: doc.folderId ? folderIdMapping[doc.folderId] : null,
                content: doc.content || '',
                metadata: doc.metadata || {},
                template_progress: doc.templateProgress || null,
                created_at: doc.createdAt || new Date().toISOString(),
                modified_at: doc.modifiedAt || new Date().toISOString(),
              } as any)
              .select()
              .single() as { data: any; error: any };

            if (docError || !newDoc) {
              result.errors.push(`Document "${doc.title}": ${docError?.message}`);
            } else {
              documentIdMapping[doc.id] = newDoc.id;
              result.migrated.documents++;
            }
          } catch (e) {
            result.errors.push(`Document error: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        }

        // Second pass: update parent version relationships
        for (const doc of project.documents || []) {
          if (doc.parentVersionId && documentIdMapping[doc.id]) {
            const newParentId = documentIdMapping[doc.parentVersionId];
            if (newParentId) {
              await supabase
                .from('documents')
                .update({ parent_version_id: newParentId })
                .eq('id', documentIdMapping[doc.id]);
            }
          }
        }

        // Migrate snippets
        for (const snippet of project.snippets || []) {
          try {
            const { error: snippetError } = await supabase
              .from('snippets')
              .insert({
                project_id: projectId,
                user_id: userId,
                name: snippet.name,
                content: snippet.content,
                description: snippet.description || null,
                tags: snippet.tags || [],
                usage_count: snippet.usageCount || 0,
                created_at: snippet.createdAt || new Date().toISOString(),
                modified_at: snippet.modifiedAt || new Date().toISOString(),
              } as any);

            if (snippetError) {
              result.errors.push(`Snippet "${snippet.name}": ${snippetError.message}`);
            } else {
              result.migrated.snippets++;
            }
          } catch (e) {
            result.errors.push(`Snippet error: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        }

      } catch (projectError) {
        result.errors.push(`Project "${project.name}" error: ${projectError instanceof Error ? projectError.message : 'Unknown'}`);
      }
    }

    // Update active project if provided
    if (activeProjectId && result.idMapping[activeProjectId]) {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          active_project_id: result.idMapping[activeProjectId],
          settings: {},
        } as any, {
          onConflict: 'user_id'
        });
    }

    // Determine overall success
    result.success = result.errors.length === 0;

    return NextResponse.json(result, { 
      status: result.success ? 200 : 207 // 207 Multi-Status for partial success
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }
    console.error('Migration error:', error);
    return internalErrorResponse(error);
  }
}
