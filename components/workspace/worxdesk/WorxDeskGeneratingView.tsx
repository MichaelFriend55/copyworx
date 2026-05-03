/**
 * @file components/workspace/worxdesk/WorxDeskGeneratingView.tsx
 * @description Brief Extraction loading + result view (Phase 5B partial).
 *
 * Renders the panel body for the `extracting` and `extracted` flow
 * phases:
 *   - Extracting: branded AIWorxLoader with explanatory copy.
 *   - Extracted (success): "✓ Brief extracted" header, a labeled list
 *     of the structured formData, and a placeholder note flagging that
 *     Phase 6 will wire the final generation step.
 *   - Extracted (failure): red callout with "Try again" + "Back to
 *     review" affordances.
 *
 * The footer (← Back to review / Start over) lives in the panel shell.
 */

'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { AIWorxLoader } from '@/components/ui/AIWorxLoader';
import {
  useWorxDeskActions,
  useWorxDeskExtraction,
} from '@/lib/stores/worxdeskStore';

// ============================================================================
// Toast deduplication
// ============================================================================

/**
 * Toast id reused for the success notification so re-renders don't
 * spam the user. Sonner deduplicates by id when the same id is fired
 * multiple times in close succession.
 */
const EXTRACTION_SUCCESS_TOAST_ID = 'worxdesk-extraction-success';

// ============================================================================
// Main view
// ============================================================================

export function WorxDeskGeneratingView() {
  const extraction = useWorxDeskExtraction();
  const { extractBrief, backToReview } = useWorxDeskActions();

  // Fire the success toast exactly once per extraction completion. The
  // dependency on `extractedFormData` (object identity) ensures we
  // re-fire only when a fresh extraction lands.
  useEffect(() => {
    if (extraction.extractedFormData !== null && !extraction.generationError) {
      toast.success(
        'Brief extraction complete. Generation coming in the next phase.',
        { id: EXTRACTION_SUCCESS_TOAST_ID },
      );
    }
  }, [extraction.extractedFormData, extraction.generationError]);

  // ── Extracting state ─────────────────────────────────────────────────────

  if (extraction.isExtractingBrief) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-gradient-to-br from-apple-blue to-apple-purple p-6">
          <AIWorxLoader message="Extracting your brief…" />
        </div>
        <p className="text-xs text-apple-text-light text-center">
          We&apos;re translating your brief into structured fields the writing
          engine understands.
        </p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (extraction.generationError) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-red-800">
                Brief extraction failed
              </p>
              <p className="text-xs text-red-700">{extraction.generationError}</p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    void extractBrief();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Try again
                </button>
                <button
                  type="button"
                  onClick={backToReview}
                  className="text-xs text-red-700 hover:text-red-900 hover:underline"
                >
                  Back to review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────

  if (extraction.extractedFormData === null) {
    // Defensive: the flow phase should not route us here unless one of
    // the three states above is true. Render nothing rather than
    // throwing – the panel will swap views on the next state change.
    return null;
  }

  const fieldEntries = Object.entries(extraction.extractedFormData);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-apple-text-dark flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Brief Extracted
        </h2>
        <p className="text-xs text-apple-text-light">
          Generation pipeline coming in Phase 6. Here&apos;s what we extracted:
        </p>
      </header>

      {fieldEntries.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">
            The extractor returned an empty form. The brief may not have had
            enough material to populate any template fields.
          </p>
        </div>
      ) : (
        <dl className="rounded-lg border border-apple-gray-light bg-white divide-y divide-apple-gray-light">
          {fieldEntries.map(([fieldName, fieldValue]) => (
            <div key={fieldName} className="px-4 py-3 space-y-1">
              <dt className="text-xs font-semibold uppercase tracking-wide text-apple-text-light">
                {fieldName}
              </dt>
              <dd className="text-sm text-apple-text-dark whitespace-pre-wrap break-words">
                {fieldValue.length === 0 ? (
                  <span className="italic text-apple-text-light">
                    (empty – not present in the brief)
                  </span>
                ) : (
                  fieldValue
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
