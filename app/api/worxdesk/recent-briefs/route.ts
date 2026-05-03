/**
 * @file app/api/worxdesk/recent-briefs/route.ts
 * @description GET endpoint that returns the authenticated user's most
 *   recent WORX DESK briefs, deduped and template-name-resolved, for the
 *   "Recent briefs" dropdown in the WORX DESK input panel.
 *
 * Phase 5A: read-only. Phase 5B / 6 do not modify this route.
 *
 * Pipeline:
 *   1. Feature flag – 404 when WORX DESK is dark.
 *   2. Clerk auth – 401 when missing.
 *   3. Supabase configured – 503 when not.
 *   4. Query `documents` for rows where `worxdesk_metadata IS NOT NULL`,
 *      ordered by `updated_at DESC`, capped at 30 rows.
 *   5. Normalize each row into `{ id, templateId, templateName, updatedAt,
 *      briefPreview, fullBrief }`.
 *   6. Server-side dedupe: rows whose first 200 chars (case-folded, trimmed)
 *      collide keep only the most recent.
 *   7. Trim to top 10.
 *   8. Return `{ briefs: RecentBrief[] }`.
 *
 * The endpoint runs on every panel open. No caching today; if it ever
 * shows up on a hot path we can layer a per-user in-memory TTL cache.
 *
 * No `api_usage_logs` row is written – this is not an Anthropic call and
 * does not consume a per-user budget.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import {
  worxdeskFeatureGuard,
  type WorxDeskErrorBody,
} from '@/lib/api/worxdesk-helpers';
import {
  requireUserId,
  unauthorizedResponse,
  internalErrorResponse,
} from '@/lib/utils/api-auth';
import { getTemplateById } from '@/lib/data/templates';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Constants
// ============================================================================

/** Initial Supabase fetch ceiling. Larger than the post-dedupe cap so
 *  duplicate-heavy users still surface 10 unique briefs. */
const INITIAL_FETCH_LIMIT = 30;

/** Maximum rows returned to the client after dedupe. */
const POST_DEDUPE_LIMIT = 10;

/** Length of the first-N-chars window used for dedupe equality. */
const DEDUPE_WINDOW_CHARS = 200;

/** Length of the preview snippet shown in the dropdown label. */
const PREVIEW_LENGTH = 80;

/**
 * Fallback display name used when a saved brief targets a template id that
 * no longer exists (e.g. removed in a future template housekeeping pass).
 * Renders verbatim in the dropdown so the user can still recognize and
 * reuse the brief.
 */
const UNKNOWN_TEMPLATE_NAME = 'Untitled deliverable';

// ============================================================================
// Response shapes
// ============================================================================

/**
 * One row in the response. Mirrors the shape consumed by
 * `WorxDeskSlideOut`'s recent-briefs dropdown.
 */
interface RecentBrief {
  /** Document id of the brief's source document. */
  id: string;
  /** AI@Worx template id originally chosen for the brief. */
  templateId: string;
  /** Human-readable template name resolved server-side. */
  templateName: string;
  /** ISO 8601 timestamp of the document's most recent modification. */
  updatedAt: string;
  /** First {@link PREVIEW_LENGTH} chars of the brief, trimmed. */
  briefPreview: string;
  /** Full brief text, used to populate the textarea on selection. */
  fullBrief: string;
}

interface RecentBriefsResponseBody {
  briefs: RecentBrief[];
}

// ============================================================================
// Internal types
// ============================================================================

/**
 * Shape of a row pulled from `documents` after column projection. Typed
 * loosely on `worxdesk_metadata` because it is jsonb and Supabase returns
 * it as a generic object.
 */
interface DocumentRow {
  id: string;
  title: string;
  modified_at: string;
  worxdesk_metadata: Record<string, unknown> | null;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build the case-folded, trimmed first-N-chars window used as the dedupe
 * key. An empty brief produces an empty key, which means all empty-brief
 * rows collapse together – the most recent wins.
 */
function dedupeKey(brief: string): string {
  return brief.trim().slice(0, DEDUPE_WINDOW_CHARS).toLowerCase();
}

/**
 * Build the ≤80-char preview snippet shown in the dropdown label. Strips
 * leading whitespace so previews don't all look like " ..." for briefs
 * that begin with a blank line.
 */
function buildPreview(brief: string): string {
  const trimmed = brief.trim();
  if (trimmed.length <= PREVIEW_LENGTH) return trimmed;
  return trimmed.slice(0, PREVIEW_LENGTH);
}

/**
 * Pull `originalBrief` and `chosenTemplateId` out of a `worxdesk_metadata`
 * jsonb blob. The blob shape is owned by `WorxDeskMetadata` in
 * `lib/types/worxdesk.ts`; we read defensively here because Supabase
 * returns `Json` and a corrupt or partially-migrated row should not crash
 * the endpoint.
 */
function extractMetadataFields(
  metadata: Record<string, unknown> | null,
): { originalBrief: string; chosenTemplateId: string } {
  if (!metadata || typeof metadata !== 'object') {
    return { originalBrief: '', chosenTemplateId: '' };
  }
  const originalBrief =
    typeof metadata.originalBrief === 'string' ? metadata.originalBrief : '';
  const chosenTemplateId =
    typeof metadata.chosenTemplateId === 'string'
      ? metadata.chosenTemplateId
      : '';
  return { originalBrief, chosenTemplateId };
}

// ============================================================================
// Route handler
// ============================================================================

export async function GET(
  _request: NextRequest,
): Promise<
  NextResponse<RecentBriefsResponseBody | WorxDeskErrorBody>
> {
  // 1. Feature flag – 404 when disabled.
  const flagResponse = worxdeskFeatureGuard();
  if (flagResponse) {
    return flagResponse;
  }

  // 2. Clerk auth – 401 when missing. We do not use
  //    `requireWorxDeskPreflight` here because this endpoint does not
  //    consume Anthropic budget and should remain available to users
  //    who have already exceeded their monthly limit (so they can still
  //    inspect prior briefs).
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return unauthorizedResponse() as NextResponse<WorxDeskErrorBody>;
    }
    return internalErrorResponse(err) as NextResponse<WorxDeskErrorBody>;
  }

  // 3. Supabase availability – 503 when not configured.
  if (!isSupabaseConfigured()) {
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Database not configured',
        details: 'Supabase is not set up.',
      },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdmin();

  // 4. Fetch documents owned by the user that have WORX DESK metadata.
  //    `select('*')` would return all columns including `content` (large
  //    HTML blobs); the projection below pulls only what the recent-briefs
  //    dropdown needs.
  const { data, error } = await (supabase.from('documents') as any)
    .select('id, title, modified_at, worxdesk_metadata')
    .eq('user_id', userId)
    .not('worxdesk_metadata', 'is', null)
    .order('modified_at', { ascending: false })
    .limit(INITIAL_FETCH_LIMIT);

  if (error) {
    logger.error('❌ recent-briefs query failed:', error);
    return internalErrorResponse(error) as NextResponse<WorxDeskErrorBody>;
  }

  const rows: DocumentRow[] = Array.isArray(data) ? (data as DocumentRow[]) : [];

  // 5. Normalize.
  const normalized: RecentBrief[] = rows.flatMap((row) => {
    const { originalBrief, chosenTemplateId } = extractMetadataFields(
      row.worxdesk_metadata,
    );

    // Drop rows whose metadata has no usable brief – they can't be
    // re-applied to the textarea and would render as blank options.
    if (!originalBrief.trim()) return [];

    const template = chosenTemplateId
      ? getTemplateById(chosenTemplateId)
      : undefined;

    return [
      {
        id: row.id,
        templateId: chosenTemplateId,
        templateName: template?.name ?? UNKNOWN_TEMPLATE_NAME,
        updatedAt: row.modified_at,
        briefPreview: buildPreview(originalBrief),
        fullBrief: originalBrief,
      },
    ];
  });

  // 6. Server-side dedupe by first-200-chars window. Rows arrive in
  //    `modified_at DESC` order, so the first occurrence of each key is
  //    already the most recent – `seenKeys` records what's been kept.
  const seenKeys = new Set<string>();
  const deduped: RecentBrief[] = [];
  for (const brief of normalized) {
    const key = dedupeKey(brief.fullBrief);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduped.push(brief);
  }

  // 7. Trim to top N.
  const briefs = deduped.slice(0, POST_DEDUPE_LIMIT);

  return NextResponse.json<RecentBriefsResponseBody>(
    { briefs },
    { status: 200 },
  );
}
