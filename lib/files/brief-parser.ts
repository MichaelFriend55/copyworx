/**
 * @file lib/files/brief-parser.ts
 * @description Brief parsing pipeline for WORX DESK file uploads.
 *
 * Takes an uploaded PDF, DOCX, or TXT file and returns a normalized brief
 * string ready to feed into the WORX DESK Strategic Review API route.
 * The single entry point is `parseBriefFile()`. Type-detection, size
 * gating, format-specific extraction, and post-extraction normalization
 * all live here so the API route stays a thin wrapper.
 *
 * Type colocation: `BriefParseResult`, `ParseOptions`, and `SupportedFileType`
 * live in this file rather than in lib/types/worxdesk.ts because they
 * describe a generic file-parsing concern that could be reused for any
 * future file-upload feature. They aren't WORX-DESK-domain types — only
 * the API route that consumes them is WORX-DESK-specific.
 *
 * --- PDF parsing library note (READ BEFORE "FIXING") ---
 *
 * This module uses unpdf (unjs/unpdf) for PDF text extraction:
 *
 *   import { extractText } from 'unpdf';
 *   const { totalPages, text } = await extractText(uint8Array, { mergePages: true });
 *
 * unpdf was chosen over pdf-parse because pdf-parse v2 wraps pdfjs-dist 4.x,
 * which references browser-only globals (DOMMatrix, ImageData, Path2D) at
 * module-load time. Those globals do NOT exist in Vercel's serverless runtime,
 * causing a "ReferenceError: DOMMatrix is not defined" crash at import time —
 * BEFORE the request handler runs — which killed the entire route (including
 * DOCX and TXT uploads that have nothing to do with PDFs).
 *
 * unpdf bundles a serverless-optimized build of PDF.js that has no Canvas /
 * DOMMatrix dependency and works cleanly in Vercel, Cloudflare Workers, and
 * other edge runtimes. Do NOT revert this to pdf-parse or pdfjs-dist — that
 * is the failure path we are explicitly moving away from.
 *
 * --- mammoth note ---
 *
 * mammoth's TypeScript types only declare `convertToHtml` and
 * `extractRawText`. The runtime exports `convertToMarkdown` (we
 * verified this against mammoth 1.8.0 via `node -e`), but it is not in
 * the .d.ts file. We use the same `unknown as` cast pattern that
 * lib/utils/document-import.ts already established for the `transforms`
 * helper. `convertToMarkdown` produces pipe-table markdown natively, so
 * we get table preservation for free without post-processing.
 */

import mammoth from 'mammoth';
import { getDocumentProxy } from 'unpdf';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Public types
// ============================================================================

/**
 * The three brief file types WORX DESK accepts in v1. Anything else
 * returns a typed error from `parseBriefFile()`.
 */
export type SupportedFileType = 'pdf' | 'docx' | 'txt';

/**
 * Caller-tunable options for `parseBriefFile()`.
 *
 * `filename` and `mimeType` are SPEC EXTENSIONS over the original Phase 4
 * prompt. The prompt's signature was `parseBriefFile(File | Buffer, options?)`
 * — a bare Buffer carries no name or extension, so we accept those as
 * options when the caller hands us a Buffer (typical from a multipart
 * Request body). When the input is a `File`, these options are ignored
 * and we read the values directly off the File.
 */
export interface ParseOptions {
  /**
   * Maximum file size in bytes. Defaults to 10 MB (10_485_760).
   * Files larger than this throw before any parsing work begins.
   */
  maxFileSizeBytes?: number;

  /**
   * Original filename. Used for extension-based type detection.
   * Strongly recommended when `input` is a Buffer — without it we can
   * only fall back to magic-byte detection, which cannot distinguish
   * a TXT file from arbitrary unrecognized binary content.
   */
  filename?: string;

  /**
   * Optional MIME type hint, used as a secondary confirmation signal.
   * Ignored if the extension and magic bytes already agree.
   */
  mimeType?: string;
}

/**
 * Output of `parseBriefFile()`. `text` is the normalized brief content
 * ready to send to the Strategic Review API. `warnings` collects
 * non-fatal issues encountered during parsing (e.g. mammoth style-map
 * complaints, suspected scanned PDFs).
 */
export interface BriefParseResult {
  text: string;
  fileType: SupportedFileType;
  warnings: string[];
  characterCount: number;
  wordCount: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default max file size: 10 MB. Mirrors what the route enforces. */
const DEFAULT_MAX_FILE_SIZE_BYTES = 10_485_760;

/** PDF magic bytes: "%PDF" — every conforming PDF starts with these four bytes. */
const PDF_MAGIC_BYTES = Buffer.from('%PDF');

/** ZIP local-file-header magic bytes: "PK\x03\x04". DOCX files are zip archives. */
const ZIP_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/** UTF-8 byte order mark, sometimes prepended to TXT files saved on Windows. */
const UTF8_BOM = '\uFEFF';

/**
 * If a PDF returns less than this much extracted text, AND the source
 * file is at least PDF_SCANNED_FILE_SIZE_THRESHOLD bytes, we surface a
 * warning that the PDF probably contains scanned images rather than
 * embedded text.
 */
const PDF_SCANNED_TEXT_THRESHOLD_CHARS = 100;
const PDF_SCANNED_FILE_SIZE_THRESHOLD = 50_000;

// ============================================================================
// Mammoth runtime cast — see file header note
// ============================================================================

/**
 * mammoth.convertToMarkdown is missing from the .d.ts file even though
 * it exists at runtime in 1.8.0. This narrow cast unlocks it without
 * `any` and is documented at the top of the file.
 */
interface MammothWithMarkdown {
  convertToMarkdown: (
    input: { buffer: Buffer },
    options?: Record<string, unknown>,
  ) => Promise<{ value: string; messages: Array<{ type: string; message: string }> }>;
}

// ============================================================================
// Type detection
// ============================================================================

/**
 * Outcome of running extension/MIME/magic-byte detection on the input.
 * `confirmed` is true when the signals agree; false when we had to
 * fall back to a single signal.
 */
interface DetectionResult {
  type: SupportedFileType;
  confirmed: boolean;
}

/** Lowercase extension (no leading dot), or null if no usable extension. */
function extractExtension(filename: string | null | undefined): string | null {
  if (!filename) return null;
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0 || dot === lower.length - 1) return null;
  return lower.slice(dot + 1);
}

/** Map an extension to a SupportedFileType, or null if unsupported. */
function extensionToType(ext: string | null): SupportedFileType | null {
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'txt':
      return 'txt';
    default:
      return null;
  }
}

/** True when the buffer starts with the PDF magic bytes. */
function looksLikePdf(buffer: Buffer): boolean {
  return buffer.length >= PDF_MAGIC_BYTES.length && buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES);
}

/** True when the buffer starts with the ZIP magic bytes (DOCX is a zip). */
function looksLikeDocx(buffer: Buffer): boolean {
  return buffer.length >= ZIP_MAGIC_BYTES.length && buffer.subarray(0, ZIP_MAGIC_BYTES.length).equals(ZIP_MAGIC_BYTES);
}

/**
 * Detect the file type using extension as the primary signal, MIME as a
 * confirmation hint, and magic bytes as the final defensive check.
 *
 * Throws a clear, user-facing error when:
 *   - The extension says PDF/DOCX but the magic bytes disagree (rename attack)
 *   - We have no extension and the content matches no known magic header
 *     (cannot distinguish TXT from arbitrary binary without a filename hint)
 *   - The detected type is not in our supported set
 */
function detectFileType(
  buffer: Buffer,
  filename: string | null,
  mimeType: string | null,
): DetectionResult {
  const ext = extractExtension(filename);
  const extType = extensionToType(ext);

  const isPdf = looksLikePdf(buffer);
  const isDocx = looksLikeDocx(buffer);

  // Case 1: extension claims PDF or DOCX. Verify against magic bytes.
  // A mismatch here is a rename attempt or a corrupt file — we refuse to parse.
  if (extType === 'pdf') {
    if (!isPdf) {
      throw new Error(
        `File extension says PDF but file content does not match. Refusing to parse.`,
      );
    }
    return { type: 'pdf', confirmed: true };
  }

  if (extType === 'docx') {
    if (!isDocx) {
      throw new Error(
        `File extension says DOCX but file content does not match. Refusing to parse.`,
      );
    }
    return { type: 'docx', confirmed: true };
  }

  if (extType === 'txt') {
    // TXT has no magic bytes. We do a defensive check: if the content
    // looks like a PDF or DOCX, the user definitely uploaded the wrong
    // file with a .txt rename. Reject.
    if (isPdf || isDocx) {
      throw new Error(
        `File extension says TXT but file content looks binary. Refusing to parse.`,
      );
    }
    return { type: 'txt', confirmed: true };
  }

  // Case 2: extension is unknown or absent — fall back to magic bytes.
  if (isPdf) {
    return { type: 'pdf', confirmed: false };
  }
  if (isDocx) {
    return { type: 'docx', confirmed: false };
  }

  // Case 3: no extension, no recognized magic bytes. We cannot safely
  // assume TXT — could be any binary format. Surface an actionable error.
  if (!ext) {
    throw new Error(
      `Cannot detect file type from content alone. Please ensure the upload includes a filename or pass filename in options.`,
    );
  }

  // We have an extension but it's not supported. Use the MIME type only
  // for a more useful error message — never for inference.
  const reportedType = mimeType ?? `.${ext}`;
  throw new Error(
    `Unsupported file type: ${reportedType}. Supported types: PDF, DOCX, TXT.`,
  );
}

// ============================================================================
// DOCX-specific cleanup (image data URLs + over-aggressive escapes)
// ============================================================================

/**
 * Matches a markdown image whose URL is an inline data: URI. Mammoth
 * inlines embedded Word images as base64 data URLs, producing 5–10 KB
 * blobs of pure noise per image. The negated character class `[^)]+`
 * is safe because base64 alphabet (A-Za-z0-9+/=) and the
 * `data:image/...;base64,` prefix never contain a literal `)` – and
 * `[^)]` matches across newlines, which mammoth occasionally inserts
 * inside the payload. Alt text may be empty or contain spaces.
 */
const DOCX_IMAGE_DATA_URL_REGEX = /!\[[^\]]*\]\(data:[^)]+\)/g;

/**
 * Backslash-escape sequences that appear in normal business prose but
 * carry no markdown meaning we want to keep. Mammoth's markdown writer
 * defensively escapes these even when they are syntactically harmless,
 * which leaves the textarea littered with `\-`, `\.`, `\(`, etc.
 *
 * Deliberately excluded: `\\`, `\*`, `\_`, `\#`, `\|` – those carry
 * structural meaning (literal backslash, literal asterisk/underscore
 * to opt out of emphasis, literal hash to opt out of headings, literal
 * pipe inside a table cell) and unescaping them would silently change
 * how the brief renders downstream.
 */
const DOCX_ESCAPE_UNESCAPE_REGEX = /\\([-.()[\]!?:;,&])/g;

/**
 * Post-process the markdown that mammoth.convertToMarkdown returns for
 * a DOCX file. This cleanup exists for two real-world problems we hit
 * on actual customer briefs (e.g. the Nozomi SD Series creative brief):
 *
 *   1. Embedded images. Word docs commonly include logos, screenshots,
 *      and diagrams. Mammoth inlines these as base64 data URLs, which
 *      add kilobytes of noise per image, bloat downstream LLM token
 *      usage, and visually pollute the brief textarea. We excise the
 *      entire image reference (no placeholder – a placeholder would
 *      itself be noise to the LLM).
 *
 *   2. Over-aggressive backslash escaping. Mammoth escapes characters
 *      that are *technically* markdown-special but appear constantly
 *      in normal prose (hyphens in compound words, periods in
 *      abbreviations, parentheses, etc.). We unescape a small,
 *      explicit allowlist that never carries structural meaning in
 *      our briefs.
 *
 * What this function deliberately does NOT touch:
 *   - Header markers (#, ##, ###)
 *   - Bullet markers (-, *, numbered lists) at line start
 *   - Pipe-table syntax (| col | col |)
 *   - Bold / italic / underline emphasis (**, *, __, _)
 *   - Block quotes (>) and code spans / fences (`, ```)
 *   - Escaped backslash, asterisk, underscore, hash, pipe – these
 *     have markdown meaning we want to preserve as-is.
 *
 * Edge case (accepted, not handled): if a DOCX places an image inside
 * an emphasis run – e.g. `__![](data:...)__` – removing the image
 * leaves bare `____` behind. We accept this because (a) it is
 * semantically harmless to a downstream LLM, (b) trying to detect and
 * strip the surrounding markers is fragile and risks damaging real
 * emphasis runs around real text, and (c) the universal newline
 * collapse already cleans up the surrounding whitespace.
 *
 * SCOPE NOTE: This cleanup is DOCX-specific. The PDF and TXT parsing
 * paths must NOT call this function – PDFs do not produce inline
 * markdown image syntax, and TXT files have no markdown semantics to
 * preserve in the first place.
 */
function cleanDocxMarkdown(input: string): { text: string; imagesStripped: number } {
  let imagesStripped = 0;

  const withoutImages = input.replace(DOCX_IMAGE_DATA_URL_REGEX, () => {
    imagesStripped += 1;
    return '';
  });

  const unescaped = withoutImages.replace(DOCX_ESCAPE_UNESCAPE_REGEX, '$1');

  return { text: unescaped, imagesStripped };
}

// ============================================================================
// Format-specific parsers
// ============================================================================

/**
 * Parse a DOCX buffer into markdown text. Tables are preserved as
 * pipe-syntax markdown tables (mammoth's convertToMarkdown does this
 * natively in 1.8.0). Mammoth's per-paragraph warnings are surfaced.
 *
 * After mammoth runs, `cleanDocxMarkdown` strips embedded image data
 * URLs and unescapes a small set of over-aggressive backslash escapes.
 * When one or more images are removed, a user-facing warning is added
 * to the result so the WORX DESK panel UI can surface the change in
 * its parser-warning callout.
 *
 * Throws a sanitized Error on mammoth failure – we do not let mammoth's
 * internal error messages leak to the client.
 */
async function parseDocx(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  const mammothWithMd = mammoth as unknown as MammothWithMarkdown;

  let result;
  try {
    result = await mammothWithMd.convertToMarkdown({ buffer });
  } catch (err) {
    logger.error('Mammoth DOCX parse failed:', err);
    throw new Error(
      'Could not parse Word document. The file may be corrupted or in an unsupported format.',
    );
  }

  const warnings = (result.messages || [])
    .filter((m) => m.type === 'warning')
    .map((m) => m.message);

  const cleaned = cleanDocxMarkdown(result.value);

  if (cleaned.imagesStripped > 0) {
    warnings.push(
      'Embedded images were removed from the document content. They are not used by AI processing.',
    );
  }

  return { text: cleaned.text, warnings };
}

// ============================================================================
// PDF user-facing error messages
// ============================================================================
//
// Exported as named constants so the API route's pass-through whitelist
// can reference the exact strings rather than fragile substring matches.
// Each maps 1:1 to a distinct failure mode and tells the user what to do
// next. Style note: straight apostrophes (') and en dashes (–) only, per
// CLAUDE.md content rules.

/** Password-protected / encrypted PDFs. Thrown from getDocumentProxy. */
export const PDF_ERROR_PASSWORD =
  'This PDF is password-protected. Please remove the password and re-upload, or paste the brief as text below.';

/**
 * Image-only / scanned PDFs. Thrown when unpdf returns successfully but
 * the extracted text is empty or whitespace-only — the canonical signal
 * that the PDF has no embedded text layer.
 */
export const PDF_ERROR_IMAGE_ONLY =
  "This PDF appears to be image-only or scanned. CopyWorx can't extract text from image-only PDFs yet – please paste the brief text below.";

/**
 * Corrupted / structurally invalid PDFs, and any other PDF.js exception
 * we don't have a more specific message for. Thrown from either the load
 * step or the extract step.
 */
export const PDF_ERROR_CORRUPTED =
  "This PDF couldn't be read. The file may be corrupted. Please try re-saving the PDF and re-uploading, or paste the brief text below.";

/**
 * Parse a PDF buffer into plain text using unpdf (unjs/unpdf).
 *
 * Library choice (unchanged): unpdf wraps a serverless-optimized PDF.js
 * build with no Canvas/DOMMatrix dependency, so it runs on Vercel. See
 * the file header for why we are NOT on pdf-parse / pdfjs-dist directly.
 *
 * --- Buffer handling (the real fix) ---
 *
 * We convert the Node Buffer to a fresh `new Uint8Array(buffer)` before
 * handing it to unpdf. This is the exact pattern documented in the
 * unpdf README:
 *
 *   const pdf = await getDocumentProxy(new Uint8Array(buffer))
 *   const { text } = await extractText(pdf, { mergePages: true })
 *
 * Node `Buffer` is technically a `Uint8Array` subclass, but PDF.js does
 * internal `instanceof Uint8Array` checks and ArrayBuffer-pool slicing
 * that has historically misbehaved on subclass instances inside
 * serverless runtimes. The explicit fresh Uint8Array view sidesteps
 * that entire class of footguns and is the supported invocation per
 * the unpdf maintainer.
 *
 * --- Two-step load (load, then extract) ---
 *
 * We call `getDocumentProxy` first and `extractText` second, instead of
 * the one-shot `extractText(buffer)` form, so we can map failures to
 * distinct user-facing messages:
 *
 *   - `getDocumentProxy` throws `PasswordException` for encrypted PDFs
 *   - `getDocumentProxy` throws `InvalidPDFException` (or similar) for
 *     structurally broken PDFs
 *   - `extractText` throws for downstream extraction failures
 *
 * Each maps to one of the PDF_ERROR_* constants above. Empty / whitespace
 * extractions are NOT thrown by unpdf — they return a successful empty
 * string — so we detect those separately after extraction succeeds.
 *
 * --- Mirrors DOCX pattern ---
 *
 * Shape matches `parseDocx`: each library call is wrapped in a single
 * try/catch that logs the raw error via `logger.error` (always logs,
 * even in production — see `lib/utils/logger.ts`) and re-throws an
 * `Error` whose `.message` is user-facing copy. The route's whitelist
 * passes those messages through to the client verbatim. We use two
 * try/catch blocks instead of DOCX's one because PDF parsing has two
 * distinct library steps with different failure semantics; the SHAPE
 * of each block is identical to DOCX's.
 *
 * --- Production logging ---
 *
 * Uses `console.log` (not `logger.log`, which is dev-only) for the
 * invocation and success rows so they appear in Vercel logs. Failure
 * rows go through `logger.error`, which always logs.
 */
async function parsePdf(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  const warnings: string[] = [];

  console.log('[WORX DESK parse-brief] parsePdf invoked', {
    bytes: buffer.length,
  });

  // Canonical unpdf invocation. Do NOT pass `buffer` directly; see header.
  const data = new Uint8Array(buffer);

  let pdf;
  try {
    pdf = await getDocumentProxy(data);
  } catch (err) {
    logger.error('[WORX DESK parse-brief] parsePdf load failed', {
      stage: 'getDocumentProxy',
      name: err instanceof Error ? err.name : null,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw new Error(classifyPdfLoadError(err));
  }

  let extracted: string;
  let totalPages: number;
  let lineBreaksInserted: number;
  let paragraphBreaksInserted: number;
  try {
    const result = await extractStructuredPdfText(pdf);
    extracted = result.text;
    totalPages = result.totalPages;
    lineBreaksInserted = result.lineBreaksInserted;
    paragraphBreaksInserted = result.paragraphBreaksInserted;
  } catch (err) {
    logger.error('[WORX DESK parse-brief] parsePdf extract failed', {
      stage: 'extractStructuredPdfText',
      name: err instanceof Error ? err.name : null,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw new Error(PDF_ERROR_CORRUPTED);
  }

  const normalized = normalizePdfText(extracted);
  const trimmedLength = normalized.trim().length;

  if (trimmedLength === 0) {
    logger.error('[WORX DESK parse-brief] parsePdf empty extraction', {
      totalPages,
      bytes: buffer.length,
    });
    throw new Error(PDF_ERROR_IMAGE_ONLY);
  }

  console.log('[WORX DESK parse-brief] parsePdf success', {
    totalPages,
    characterCount: trimmedLength,
  });

  // Diagnostic for the structured-extraction layer added in Phase 2. Tracks
  // how aggressively we're inserting line / paragraph breaks across real
  // uploads so we can tune the tolerances if a particular PDF style starts
  // misbehaving in Vercel logs.
  console.log('[WORX DESK parse-brief] parsePdf structured extraction complete', {
    pages: totalPages,
    lineBreaksInserted,
    paragraphBreaksInserted,
    characterCount: trimmedLength,
  });

  // Soft warning for the in-between case: nonzero but very little text on
  // a large file. Keeps the brief textarea populated so the user can see
  // what was extracted, but flags that the result looks suspicious.
  if (
    normalized.length < PDF_SCANNED_TEXT_THRESHOLD_CHARS &&
    buffer.length > PDF_SCANNED_FILE_SIZE_THRESHOLD
  ) {
    warnings.push(
      'PDF appears to contain little extractable text. May be scanned or image-based; consider pasting brief content directly.',
    );
  }

  return { text: normalized, warnings };
}

// ============================================================================
// PDF structured text extraction
// ============================================================================
//
// We extract PDF text per page using `page.getTextContent()` and reconstruct
// line and paragraph breaks from the resulting items, instead of using
// `unpdf.extractText(pdf, { mergePages: true })`.
//
// The reason: `extractText` returns all items joined with spaces, which
// flattens a structured brief (headers, bullets, Q&A prompts) into a single
// continuous blob. The per-page loop lets us reuse PDF.js's `hasEOL` signal
// and item Y-positions to put line and paragraph breaks back where the
// reader would expect them. This closes most of the structural gap with
// the DOCX flow without trying to match it exactly (PDFs are visual, not
// semantic — there is no concept of a "paragraph" in PDF, only glyph
// positions and end-of-line flags).
//
// Tolerances (documented inline below) were chosen so single-column
// briefs reconstruct cleanly while multi-column / table layouts degrade
// gracefully rather than crashing. They are conservative on purpose:
// missing a paragraph break is fine, false-firing one would split a
// paragraph mid-sentence.

/**
 * Narrow subset of pdfjs-dist's `TextItem` we actually consume. Declared
 * locally so we do not have to import pdfjs-dist types directly (unpdf
 * does not re-export them from its top-level entry, and pulling from
 * `unpdf/pdfjs` would couple us to a specific bundled-PDF.js layout).
 *
 * Fields match what the PDF.js v5 build inside unpdf 1.6 emits — verified
 * against node_modules/unpdf/dist/types/src/display/api.d.ts.
 */
interface PdfTextItem {
  /** Glyph text. PDF.js normalizes internal whitespace to plain spaces. */
  str: string;
  /** 6-element affine transform. `transform[4]` is x, `transform[5]` is y. */
  transform: number[];
  /** Glyph width in device space. */
  width: number;
  /** Glyph height in device space. Used to scale line-break tolerances. */
  height: number;
  /** True when PDF.js detected an end-of-line after this item. */
  hasEOL: boolean;
}

/**
 * Narrow type guard separating `TextItem` from `TextMarkedContent` in the
 * `TextContent.items` array. We never enable `includeMarkedContent`, so
 * marked-content items should not appear in practice, but the union forces
 * a defensive check.
 */
function isTextItem(value: unknown): value is PdfTextItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'str' in value &&
    typeof (value as { str: unknown }).str === 'string' &&
    'transform' in value &&
    Array.isArray((value as { transform: unknown }).transform) &&
    'hasEOL' in value &&
    typeof (value as { hasEOL: unknown }).hasEOL === 'boolean'
  );
}

/** Unicode bullet glyphs we recognize for the lone-bullet line collapser. */
const BULLET_GLYPHS = '•◦▪●';

/**
 * After per-page reconstruction, collapse lines that contain ONLY a bullet
 * glyph (with optional trailing whitespace) into the next non-empty line.
 * Real-world PDFs sometimes emit the bullet character as its own text item
 * with `hasEOL: true` separated from its associated text — this puts the
 * bullet back inline with the text the way a reader sees it on the page.
 *
 * Lowercase-letter sub-bullet markers (e.g. "o " used in some Word-exported
 * PDFs) are deliberately left alone per the Phase-2 spec.
 */
function mergeLoneBulletLines(text: string): string {
  const pattern = new RegExp(`^([${BULLET_GLYPHS}])[ \\t]*\\n+([^\\n].*)$`, 'gm');
  return text.replace(pattern, '$1 $2');
}

/**
 * Append `chunk` to the current line, inserting exactly one space between
 * the previous text and the new chunk when both sides have non-whitespace
 * neighbors. Existing whitespace inside `chunk` is preserved.
 */
function appendOnSameLine(currentText: string, chunk: string): string {
  if (chunk.length === 0) {
    return currentText;
  }

  const lastChar = currentText.length > 0 ? currentText[currentText.length - 1] : '';
  const prevEndsInWhitespace = /\s/.test(lastChar);
  const chunkStartsWithWhitespace = /^\s/.test(chunk);

  if (!prevEndsInWhitespace && !chunkStartsWithWhitespace) {
    return currentText + ' ' + chunk;
  }

  return currentText + chunk;
}

/**
 * Per-page structured text extractor. Replaces unpdf's `extractText`
 * helper to give us line / paragraph break reconstruction.
 *
 * For each page:
 *   1. Call `page.getTextContent()` to get the ordered TextItem array.
 *   2. Walk items in order, maintaining a single `pageText` string.
 *   3. For each item, decide whether it continues the current visual line
 *      or starts a new one. Two signals are OR'd together:
 *
 *        a. `prevItem.hasEOL === true` — PDF.js explicitly says this is a
 *           line break in the source content stream. Primary signal.
 *        b. Y-position delta > sameLineTolerance — the new item sits at a
 *           visibly different baseline. Fallback for PDF producers that
 *           do not set `hasEOL` reliably.
 *
 *   4. When starting a new line, classify the break as a paragraph break
 *      ("\\n\\n") when the vertical gap exceeds 1.5x the recent line
 *      height, OR when the new item sits ABOVE the previous item (which
 *      means we crossed a column boundary or wrapped to a new section).
 *      Otherwise insert a single line break ("\\n").
 *   5. Skip empty items that carry no EOL signal — they are paint
 *      artifacts, not content.
 *
 * Tolerances (proportional to glyph height, so heading + body mix both
 * scale correctly):
 *   sameLineTolerance       = max(itemHeight, prevHeight, 1) * 0.5
 *   paragraphBreakThreshold = max(prevHeight, itemHeight, 1) * 1.5
 *
 * After all pages are processed, pages are joined with "\\n\\n" and the
 * `mergeLoneBulletLines` post-pass runs.
 *
 * Returns the reconstructed text plus diagnostic counts the caller logs
 * for Vercel debugging.
 */
async function extractStructuredPdfText(
  pdf: { numPages: number; getPage: (n: number) => Promise<unknown> },
): Promise<{
  text: string;
  totalPages: number;
  lineBreaksInserted: number;
  paragraphBreaksInserted: number;
}> {
  const totalPages = pdf.numPages;
  const pageTexts: string[] = [];

  let lineBreaksInserted = 0;
  let paragraphBreaksInserted = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = (await pdf.getPage(pageNum)) as {
      getTextContent: () => Promise<{ items: unknown[] }>;
    };
    const content = await page.getTextContent();

    let pageText = '';
    let prevItem: PdfTextItem | null = null;

    for (const rawItem of content.items) {
      if (!isTextItem(rawItem)) {
        continue;
      }

      // Drop artifacts: empty string AND no EOL signal carries no meaning.
      if (rawItem.str.length === 0 && !rawItem.hasEOL) {
        continue;
      }

      const currentY = typeof rawItem.transform[5] === 'number' ? rawItem.transform[5] : 0;

      if (prevItem === null) {
        pageText += rawItem.str;
        prevItem = rawItem;
        continue;
      }

      const prevY = typeof prevItem.transform[5] === 'number' ? prevItem.transform[5] : 0;
      const itemHeight = Math.max(rawItem.height || 0, prevItem.height || 0, 1);
      const sameLineTolerance = itemHeight * 0.5;
      const yDiff = Math.abs(currentY - prevY);
      const isNewLine = prevItem.hasEOL || yDiff > sameLineTolerance;

      if (!isNewLine) {
        pageText = appendOnSameLine(pageText, rawItem.str);
      } else {
        const gap = prevY - currentY; // > 0 when reading downward
        const lineHeight = Math.max(prevItem.height || 0, rawItem.height || 0, 1);
        const isParagraphBreak = gap > lineHeight * 1.5 || gap < 0;

        if (isParagraphBreak) {
          pageText += '\n\n';
          paragraphBreaksInserted += 1;
        } else {
          pageText += '\n';
          lineBreaksInserted += 1;
        }
        pageText += rawItem.str;
      }

      prevItem = rawItem;
    }

    pageTexts.push(pageText);
  }

  let joined = pageTexts.join('\n\n');
  if (totalPages > 1) {
    paragraphBreaksInserted += totalPages - 1;
  }

  joined = mergeLoneBulletLines(joined);

  return {
    text: joined,
    totalPages,
    lineBreaksInserted,
    paragraphBreaksInserted,
  };
}

/**
 * Map a PDF.js load-time exception to one of our PDF_ERROR_* messages.
 *
 * Detection strategy:
 *   - `err.name === 'PasswordException'` is the canonical PDF.js signal
 *     for encrypted documents (used in v4+ and the unpdf serverless build).
 *   - We also accept a case-insensitive `/password/` substring in the
 *     message as a fallback, in case a bundler boundary flattens the
 *     exception prototype chain and `name` collapses to "Error".
 *
 * Anything else — `InvalidPDFException`, malformed xref tables,
 * unsupported encryption algorithms, MissingPDFException, etc. — maps
 * to the corrupted message. That is the right user action regardless of
 * which specific structural problem PDF.js found: re-save and retry, or
 * paste the brief text.
 */
function classifyPdfLoadError(err: unknown): string {
  if (!(err instanceof Error)) {
    return PDF_ERROR_CORRUPTED;
  }

  const name = err.name ?? '';
  const message = err.message ?? '';

  if (name === 'PasswordException' || /password/i.test(message)) {
    return PDF_ERROR_PASSWORD;
  }

  return PDF_ERROR_CORRUPTED;
}

/**
 * PDF-text post-processing:
 *   - Strip per-line leading/trailing whitespace.
 *   - Stitch hyphenated word breaks across line wraps. We require the
 *     hyphen to be at end of line AND the next non-blank line to start
 *     with a lowercase letter — that combination is what real
 *     mid-word breaks look like in column-flow PDFs (e.g. "innova-\ntion").
 *   - Collapse runs of three or more newlines down to two.
 */
function normalizePdfText(raw: string): string {
  // Stitch hyphenated breaks. We do this BEFORE per-line trim so that
  // \r\n vs \n differences and indented continuations both match.
  const stitched = raw.replace(/-\n([a-z])/g, '$1');

  const lines = stitched.split('\n').map((line) => line.trim());
  let collapsed = lines.join('\n');

  // Collapse 3+ consecutive newlines into exactly 2.
  collapsed = collapsed.replace(/\n{3,}/g, '\n\n');

  return collapsed;
}

/**
 * Parse a TXT buffer. Tries UTF-8 first; on decode failure falls back
 * to Windows-1252 (common for Mac-saved or Outlook-exported text). If
 * neither works the file is rejected with a user-actionable message.
 *
 * Strips an optional BOM and normalizes line endings to LF.
 */
function parseTxt(buffer: Buffer): { text: string; warnings: string[] } {
  const warnings: string[] = [];

  let decoded: string | null = null;

  // Attempt 1: strict UTF-8. The 'fatal: true' option throws on invalid
  // sequences, which is exactly what we want — silent character damage
  // would corrupt the brief in subtle ways.
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    decoded = null;
  }

  // Attempt 2: Windows-1252 fallback. The Node.js TextDecoder ships with
  // 'windows-1252' in core; if it isn't available in this runtime we
  // catch the constructor error and treat it as a decode failure.
  if (decoded === null) {
    try {
      decoded = new TextDecoder('windows-1252', { fatal: true }).decode(buffer);
      warnings.push(
        'File decoded as Windows-1252; some characters may not match the original.',
      );
    } catch {
      decoded = null;
    }
  }

  if (decoded === null) {
    throw new Error('Could not decode text file. Save as UTF-8 and try again.');
  }

  // Strip BOM if present (only meaningful at the very start of the string).
  if (decoded.startsWith(UTF8_BOM)) {
    decoded = decoded.slice(UTF8_BOM.length);
  }

  // Normalize line endings: CRLF and lone CR both become LF.
  const normalized = decoded.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return { text: normalized, warnings };
}

// ============================================================================
// Universal post-extraction normalization
// ============================================================================

/**
 * Final pass that runs on every successful parse:
 *   - Trim leading/trailing whitespace from the full text.
 *   - Collapse runs of 3+ blank lines down to 2.
 */
function normalizeText(text: string): string {
  const trimmed = text.trim();
  return trimmed.replace(/\n{3,}/g, '\n\n');
}

/** Fast wordcount. Splits on Unicode whitespace and drops empty tokens. */
function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

// ============================================================================
// Input normalization (File | Buffer → buffer + filename + mimeType)
// ============================================================================

/** Normalized parser input regardless of whether the caller passed File or Buffer. */
interface NormalizedInput {
  buffer: Buffer;
  filename: string | null;
  mimeType: string | null;
}

/** True for browser-style File objects. Works in Node 18+ where File is global. */
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

async function normalizeInput(
  input: File | Buffer,
  options: ParseOptions,
): Promise<NormalizedInput> {
  if (Buffer.isBuffer(input)) {
    return {
      buffer: input,
      filename: options.filename ?? null,
      mimeType: options.mimeType ?? null,
    };
  }

  if (isFileLike(input)) {
    const arrayBuffer = await input.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: input.name || options.filename || null,
      mimeType: input.type || options.mimeType || null,
    };
  }

  throw new Error('Unsupported input. Pass either a Buffer or a File.');
}

// ============================================================================
// Public entry point
// ============================================================================

/**
 * Parse a brief file (PDF / DOCX / TXT) into a normalized text string
 * suitable for the WORX DESK Strategic Review API.
 *
 * Validation order (each step throws a user-actionable Error on failure):
 *   1. Normalize input to a Buffer + optional filename/mimeType.
 *   2. Reject if the buffer is empty.
 *   3. Reject if the buffer exceeds maxFileSizeBytes.
 *   4. Detect file type (extension primary, MIME secondary, magic bytes
 *      defensive). Reject on extension/content mismatch or unknown type.
 *   5. Run format-specific extraction.
 *   6. Apply universal normalization, count chars and words, return.
 *
 * The function intentionally throws plain Error instances with
 * user-facing messages. The API route is responsible for converting
 * those into proper HTTP responses (and for keeping the original error
 * out of any client-visible payload).
 */
export async function parseBriefFile(
  input: File | Buffer,
  options: ParseOptions = {},
): Promise<BriefParseResult> {
  const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;

  const normalized = await normalizeInput(input, options);
  const { buffer, filename, mimeType } = normalized;

  if (buffer.length === 0) {
    throw new Error('File is empty.');
  }

  if (buffer.length > maxFileSizeBytes) {
    const limitMb = Math.round(maxFileSizeBytes / (1024 * 1024));
    throw new Error(`File exceeds size limit of ${limitMb} MB.`);
  }

  const detection = detectFileType(buffer, filename, mimeType);

  let extracted: { text: string; warnings: string[] };
  switch (detection.type) {
    case 'pdf':
      extracted = await parsePdf(buffer);
      break;
    case 'docx':
      extracted = await parseDocx(buffer);
      break;
    case 'txt':
      extracted = parseTxt(buffer);
      break;
  }

  const text = normalizeText(extracted.text);

  if (text.length === 0) {
    throw new Error(
      'No text could be extracted from this file. The document may be empty or contain only images.',
    );
  }

  return {
    text,
    fileType: detection.type,
    warnings: extracted.warnings,
    characterCount: text.length,
    wordCount: countWords(text),
  };
}
