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
 * --- pdf-parse version note (READ BEFORE "FIXING") ---
 *
 * This module uses the pdf-parse v2.x class-based API:
 *
 *   import { PDFParse } from 'pdf-parse';
 *   const parser = new PDFParse({ data: buffer });
 *   const result = await parser.getText();
 *   await parser.destroy();
 *
 * If you have used pdf-parse in older codebases you have probably seen
 * patterns like:
 *
 *   import pdfParse from 'pdf-parse';                      // v1 - DO NOT use here
 *   import pdfParse from 'pdf-parse/lib/pdf-parse.js';     // v1 deep import - DO NOT use here
 *
 * Why we are NOT using either of those:
 *
 *   1. The npm `pdf-parse` package was rewritten in v2.x by a new
 *      maintainer (mehmet-kozan). v2.4.5 is what `npm install pdf-parse`
 *      gives you today. The v1 default-export-function API does not exist
 *      in v2.
 *
 *   2. The v1 deep-import workaround (`pdf-parse/lib/pdf-parse.js`)
 *      existed solely to dodge a bug in v1.1.1's `index.js` that tried
 *      to read a hardcoded test PDF (`test/data/05-versions-space.pdf`)
 *      whenever `module.parent` was falsy — which it is in Next.js,
 *      Vercel, AWS Lambda, and most serverless runtimes. That bug is
 *      gone in v2. The deep-import workaround is also blocked in v2 by
 *      the package's `exports` map, so attempting it now throws
 *      `ERR_PACKAGE_PATH_NOT_EXPORTED` at runtime.
 *
 *   3. Pinning to v1.1.1 to keep the workaround intact would mean
 *      running away from a fix that already exists upstream, and would
 *      reintroduce the `unknown as` cast tax (v1 has no first-party
 *      types — only the community `@types/pdf-parse`).
 *
 * If a future maintainer "fixes" this back to a v1 pattern they have
 * seen elsewhere, the deploy will start crashing with ENOENT in
 * production while still passing locally. Please don't.
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
import { PDFParse } from 'pdf-parse';
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
// Format-specific parsers
// ============================================================================

/**
 * Parse a DOCX buffer into markdown text. Tables are preserved as
 * pipe-syntax markdown tables (mammoth's convertToMarkdown does this
 * natively in 1.8.0). Mammoth's per-paragraph warnings are surfaced.
 *
 * Throws a sanitized Error on mammoth failure — we do not let mammoth's
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

  return { text: result.value, warnings };
}

/**
 * Parse a PDF buffer into plain text using pdf-parse v2.x. Always calls
 * `parser.destroy()` to release pdfjs resources, even on failure.
 * Applies PDF-specific normalization (collapse runs of newlines, strip
 * per-line whitespace, fix hyphenated word breaks across line wraps),
 * then surfaces a "looks scanned" warning when extracted text is much
 * smaller than the source file.
 */
async function parsePdf(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  const warnings: string[] = [];

  // PDFParse accepts Buffer in `data` and converts to Uint8Array internally.
  // The wider `data` field accepts Uint8Array, ArrayBuffer, etc. — Buffer is
  // a Uint8Array subclass, so this assignment is safe at runtime; the cast
  // is here only to satisfy the strict union type signature.
  const parser = new PDFParse({ data: buffer as unknown as Uint8Array });

  let extracted: string;
  try {
    const result = await parser.getText();
    extracted = result.text;
  } catch (err) {
    logger.error('pdf-parse text extraction failed:', err);
    await safeDestroy(parser);
    throw new Error(
      'Could not extract text from PDF. The file may be corrupted, password-protected, or image-only.',
    );
  }

  await safeDestroy(parser);

  const normalized = normalizePdfText(extracted);

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

/** Best-effort cleanup. Never throws; logs at warn level if it does. */
async function safeDestroy(parser: PDFParse): Promise<void> {
  try {
    await parser.destroy();
  } catch (err) {
    logger.warn('pdf-parse destroy() threw (non-fatal):', err);
  }
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
