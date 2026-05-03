/**
 * @file lib/files/file-validation.ts
 * @description Lightweight, client-safe brief file validation helpers.
 *
 * These run in the browser before upload to give users instant feedback
 * on type and size mistakes ("File is too large (12.4 MB). Maximum size
 * is 10 MB.") without paying the round-trip to the parse API. They are
 * intentionally a strict subset of what `parseBriefFile()` checks
 * server-side — the server stays the source of truth, this file is just
 * a UX accelerator. Same constants are exported so the two layers cannot
 * drift on size limits or accepted extensions.
 *
 * No Node-only modules, no fs imports, no Buffer use — every export
 * here is safe to call from a React event handler.
 */

// ============================================================================
// Public constants
// ============================================================================

/**
 * Brief file extensions WORX DESK accepts in v1. Stored as a tuple so
 * the type narrows to the literal extensions and TypeScript can verify
 * call sites at compile time.
 */
export const SUPPORTED_BRIEF_FILE_EXTENSIONS = ['.pdf', '.docx', '.txt'] as const;

/** Maximum brief file size in bytes (10 MB). Mirrors the server-side default. */
export const MAX_BRIEF_FILE_SIZE_BYTES = 10_485_760;

/** Same limit expressed in MB for use in user-facing copy. */
export const MAX_BRIEF_FILE_SIZE_MB = 10;

// ============================================================================
// Public types
// ============================================================================

/** Single accepted file extension (e.g. '.pdf'). */
export type SupportedBriefFileExtension = (typeof SUPPORTED_BRIEF_FILE_EXTENSIONS)[number];

/** Result of `validateBriefFile()`. `error` is user-facing copy when invalid. */
export interface BriefFileValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Returns the lowercase file extension including the leading dot, or
 * null if the filename has none. "Brief.PDF" → ".pdf".
 *
 * Files with no extension (e.g. "Brief") return null. Files with a
 * trailing dot ("Brief.") also return null since there is no actual
 * extension after the dot.
 */
export function getFileExtension(filename: string): string | null {
  if (typeof filename !== 'string' || filename.length === 0) {
    return null;
  }

  const lastDot = filename.lastIndexOf('.');
  if (lastDot < 0 || lastDot === filename.length - 1) {
    return null;
  }

  return filename.slice(lastDot).toLowerCase();
}

/** True when the file's extension is in the supported list. */
export function isSupportedBriefFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  if (!ext) return false;
  return (SUPPORTED_BRIEF_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Format a byte count into a short, user-readable string.
 *   0       → "0 B"
 *   1024    → "1.0 KB"
 *   2415919 → "2.3 MB"
 *
 * Only handles up to GB; we never expect a brief file in that range
 * because the size limit blocks anything past 10 MB.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ============================================================================
// Primary validation function
// ============================================================================

/**
 * Validate a brief file for upload. Returns `{ valid: true }` when the
 * file is acceptable, or `{ valid: false, error }` with a user-facing
 * message when it is not.
 *
 * Checks (in order — first failure short-circuits):
 *   1. Extension is one of `SUPPORTED_BRIEF_FILE_EXTENSIONS`.
 *   2. Size is within `MAX_BRIEF_FILE_SIZE_BYTES`.
 *
 * The error strings are written for direct display in toast / inline
 * messages; do not wrap or transform them in the calling component.
 */
export function validateBriefFile(file: File): BriefFileValidationResult {
  if (!isSupportedBriefFile(file)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload a PDF, DOCX, or TXT file.',
    };
  }

  if (file.size > MAX_BRIEF_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large (${formatFileSize(file.size)}). Maximum size is ${MAX_BRIEF_FILE_SIZE_MB} MB.`,
    };
  }

  return { valid: true };
}
