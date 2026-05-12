/**
 * @file app/api/worxdesk/parse-brief-file/route.ts
 * @description WORX DESK file upload — parse a brief file into normalized text.
 *
 * Accepts a single PDF / DOCX / TXT file via multipart/form-data and
 * returns the normalized brief text plus extraction metadata. The actual
 * parsing pipeline lives in `lib/files/brief-parser.ts`; this route is
 * a thin wrapper that:
 *
 *   1. Gates on the worxdeskEnabled feature flag (404 when disabled)
 *   2. Requires an authenticated Clerk user (401 when missing)
 *   3. Reads the multipart file and converts it to a Node Buffer
 *   4. Delegates to parseBriefFile() with the 10 MB ceiling
 *   5. Sanitizes errors before returning JSON to the client
 *
 * Usage logging is intentionally NOT wired up here — file parsing does
 * not call the Anthropic API and does not consume any per-user budget,
 * so it doesn't belong in the api_usage_logs cost ledger. If we want
 * file-parse analytics later, that's a separate non-cost log.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  PDF_ERROR_CORRUPTED,
  PDF_ERROR_IMAGE_ONLY,
  PDF_ERROR_PASSWORD,
  parseBriefFile,
} from '@/lib/files/brief-parser';
import {
  requireWorxDeskPreflight,
  worxdeskFeatureGuard,
  type WorxDeskErrorBody,
} from '@/lib/api/worxdesk-helpers';
import { logError } from '@/lib/utils/error-handling';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Constants
// ============================================================================

/** Hard server-side ceiling. Mirrors lib/files/file-validation.ts. */
const MAX_FILE_SIZE_BYTES = 10_485_760;

/** Maximum size in MB for use in error copy. */
const MAX_FILE_SIZE_MB = 10;

// ============================================================================
// Response shape
// ============================================================================

/** Successful response payload. Mirrors `BriefParseResult` minus internal naming. */
interface ParseBriefFileSuccessBody {
  text: string;
  fileType: 'pdf' | 'docx' | 'txt';
  warnings: string[];
  characterCount: number;
  wordCount: number;
}

// ============================================================================
// Route handler
// ============================================================================

/**
 * POST /api/worxdesk/parse-brief-file
 *
 * Multipart form-data with a single `file` field.
 * Returns 200 with `ParseBriefFileSuccessBody` on success, or a JSON
 * error body with an appropriate status on failure.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ParseBriefFileSuccessBody | WorxDeskErrorBody>> {
  // --------------------------------------------------------------------------
  // 1. Feature flag — first check.
  // --------------------------------------------------------------------------
  const flagResponse = worxdeskFeatureGuard();
  if (flagResponse) {
    return flagResponse;
  }

  // --------------------------------------------------------------------------
  // 2. Auth + monthly usage limit (parse calls don't bill, but if a user
  //    is over their limit we shouldn't accept new work from them).
  // --------------------------------------------------------------------------
  const preflight = await requireWorxDeskPreflight();
  if (!preflight.ok) {
    return preflight.response;
  }

  // --------------------------------------------------------------------------
  // 3. Read multipart body. We use Web FormData (Next.js Request supports
  //    `.formData()` natively in App Router routes).
  // --------------------------------------------------------------------------
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    logError(err, 'WORX DESK parse-brief-file (formData)');
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Bad request',
        details: 'Could not read uploaded file. Send the file as multipart/form-data.',
      },
      { status: 400 },
    );
  }

  const fileEntry = formData.get('file');
  if (!fileEntry) {
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Bad request',
        details: 'No file provided. Include the file under the "file" field.',
      },
      { status: 400 },
    );
  }

  // FormData.get returns string | File | null. We require File.
  if (typeof fileEntry === 'string' || !isFileLike(fileEntry)) {
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Bad request',
        details: 'The "file" field must be a file upload, not a text value.',
      },
      { status: 400 },
    );
  }

  const file = fileEntry as File;

  // --------------------------------------------------------------------------
  // 4. Pre-parse size gate. We also pass maxFileSizeBytes into the parser
  //    as a defense-in-depth check, but failing fast here avoids reading
  //    a 50 MB upload into memory just to reject it.
  // --------------------------------------------------------------------------
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'File too large',
        details: `File exceeds size limit of ${MAX_FILE_SIZE_MB} MB.`,
      },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json<WorxDeskErrorBody>(
      { error: 'Bad request', details: 'File is empty.' },
      { status: 400 },
    );
  }

  // Production-visible upload log. Goes through raw console.log (not the
  // dev-only `logger.log`) so it appears in Vercel logs for debugging
  // when users report parse failures.
  console.log('[WORX DESK parse-brief] upload received', {
    filename: file.name,
    size: file.size,
    mimeType: file.type || null,
  });

  // --------------------------------------------------------------------------
  // 5. Convert File → Buffer and parse.
  //    parseBriefFile owns type detection, size enforcement (defense in
  //    depth), format-specific extraction, and normalization.
  // --------------------------------------------------------------------------
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    logError(err, 'WORX DESK parse-brief-file (arrayBuffer)');
    return NextResponse.json<WorxDeskErrorBody>(
      {
        error: 'Server error',
        details: 'Could not read uploaded file content. Please try again.',
      },
      { status: 500 },
    );
  }

  try {
    const result = await parseBriefFile(buffer, {
      maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
      filename: file.name,
      mimeType: file.type || undefined,
    });

    logger.log('📄 Brief file parsed:', {
      fileType: result.fileType,
      characterCount: result.characterCount,
      wordCount: result.wordCount,
      warningCount: result.warnings.length,
    });

    // Production-visible success log. Mirror of the logger.log above,
    // but using raw console.log so it survives in Vercel logs.
    console.log('[WORX DESK parse-brief] parse complete', {
      filename: file.name,
      fileType: result.fileType,
      characterCount: result.characterCount,
      wordCount: result.wordCount,
      warningCount: result.warnings.length,
    });

    return NextResponse.json<ParseBriefFileSuccessBody>(
      {
        text: result.text,
        fileType: result.fileType,
        warnings: result.warnings,
        characterCount: result.characterCount,
        wordCount: result.wordCount,
      },
      { status: 200 },
    );
  } catch (err) {
    logError(err, 'WORX DESK parse-brief-file (parse)');
    return errorToJsonResponse(err);
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert a parser exception into a sanitized JSON NextResponse. We
 * recognize the user-actionable Error messages our parser emits and pass
 * them through (they are written for direct user display); anything
 * else is replaced with a generic message so library internals
 * (mammoth's stack traces, pdfjs warnings, etc.) never leak to clients.
 */
function errorToJsonResponse(err: unknown): NextResponse<WorxDeskErrorBody> {
  const message = err instanceof Error ? err.message : '';

  // Whitelist of parser-emitted messages safe to forward verbatim.
  // Each of these is written by lib/files/brief-parser.ts and is
  // already user-facing copy; matching by substring is fine because
  // we control both sides of the contract.
  //
  // PDF-specific messages are imported as named constants so the route
  // and the parser cannot drift on the exact wording. The pre-existing
  // generic "Could not extract text from PDF" string has been retired
  // in favor of the three distinct PDF_ERROR_* messages below.
  const knownUserFacingFragments = [
    'File extension says',
    'Cannot detect file type from content alone',
    'Unsupported file type',
    'File is empty',
    'File exceeds size limit',
    'Could not parse Word document',
    PDF_ERROR_PASSWORD,
    PDF_ERROR_IMAGE_ONLY,
    PDF_ERROR_CORRUPTED,
    'Could not decode text file',
    'No text could be extracted from this file',
    'Unsupported input',
  ];

  const isUserFacing = knownUserFacingFragments.some((fragment) => message.includes(fragment));

  if (isUserFacing) {
    return NextResponse.json<WorxDeskErrorBody>(
      { error: 'Bad request', details: message },
      { status: 400 },
    );
  }

  return NextResponse.json<WorxDeskErrorBody>(
    {
      error: 'Server error',
      details: 'Could not parse the uploaded file. Please try a different file.',
    },
    { status: 500 },
  );
}

/** Type guard for a Web File on the server. Mirrors the parser's check. */
function isFileLike(value: unknown): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as { arrayBuffer: unknown }).arrayBuffer === 'function' &&
    'name' in value &&
    'size' in value
  );
}
