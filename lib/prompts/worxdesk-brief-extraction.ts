/**
 * @file lib/prompts/worxdesk-brief-extraction.ts
 * @description System prompt and user-message builder for the WORX DESK Brief Extraction call (Call 2).
 *
 * The Brief Extraction call reads the brief, deliverable spec, supporting materials,
 * Strategic Take, and the user's Q&A answers, then outputs a JSON object whose keys
 * match the chosen template's field schema. That JSON becomes the formData fed into
 * the existing /api/generate-template route.
 *
 * --- Design decision: question text resolution ---
 *
 * BriefExtractionLLMRequest contains WorxDeskAnswer items, which carry only
 * questionId, answer, and wasSkipped — not the question text itself.
 * The question text lives in WorxDeskStrategicReview.questions[] from the session.
 *
 * Two options:
 *   A. Embed question text in the answers array (would require modifying Phase 1 types).
 *   B. Accept a separate `questions` parameter in the builder and resolve text at call time.
 *
 * We chose option B: `buildBriefExtractionPrompt` accepts a second parameter
 * `questions: WorxDeskQuestion[]`. The API route (Phase 3) has access to the
 * full session state and will pass both the request and the session's questions array.
 * This keeps the Phase 1 types clean and keeps the builder's concern narrow.
 *
 * Usage (Phase 3 API route):
 *   import { WORXDESK_BRIEF_EXTRACTION_PROMPT, buildBriefExtractionPrompt } from '@/lib/prompts/worxdesk-brief-extraction';
 *   import { buildTemplateSchemaBlock } from '@/lib/templates/worxdesk-template-schemas';
 *   const schemaBlock = buildTemplateSchemaBlock(input.targetTemplateId);
 *   const userMessage = buildBriefExtractionPrompt(input, schemaBlock, sessionQuestions);
 *   // Pass WORXDESK_BRIEF_EXTRACTION_PROMPT as the system prompt and userMessage as the user turn.
 */

import type { BriefExtractionLLMRequest, WorxDeskQuestion } from '@/lib/types/worxdesk';

// ============================================================================
// System prompt (verbatim — do not modify the body of this string)
// ============================================================================

/**
 * System prompt for the WORX DESK Brief Extraction LLM call (Call 2).
 * Instructs the model to act as a structured data extractor — translating
 * the brief and strategic context into a JSON formData object that matches
 * the target template's field schema. Must be passed as the `system` parameter
 * to Claude. The user message must contain the schema block and all context.
 */
export const WORXDESK_BRIEF_EXTRACTION_PROMPT = `You are a structured data extractor. Your only job is to read a creative brief, the user's deliverable specification, supporting materials, the Strategic Take from a senior copywriter, and the user's answers to clarifying questions — and produce a valid JSON object containing the fields required by the chosen copywriting template.

You are not generating copy. You are not making creative judgments beyond what's needed to complete the fields. The senior copywriter has already done the strategic thinking in the Strategic Take, and the actual copy generation happens in the next step. Your job is translation: brief → structured fields.

## Your Inputs

You will receive five pieces of input:

1. **The brief** — Full text of the client brief, however structured or unstructured.
2. **The deliverable specification** — The user's description of what they want produced.
3. **Supporting materials** — Any additional text, notes, or URLs the user provided.
4. **The Strategic Take** — A senior copywriter's call on the strongest hook, the lead angle, the tone, and any creative direction. This represents decisions already made. Honor these decisions in your extraction.
5. **The user's answers to the Strategic Review questions** — Some answered with real content, some marked "don't know" or "skip."

## Your Output

You will receive the target template's field schema. Output a JSON object that exactly matches that schema. Required fields must be filled. Optional fields should be filled when supporting content exists, omitted (set to empty string "") when it doesn't.

The output must be valid JSON. Nothing else. No preamble, no commentary, no code fences, no explanation. Just the JSON object.

## How to Extract Each Field

For each field in the target template:

1. **Look first in the user's question answers.** If the user explicitly answered a question that maps to this field, use their answer.
2. **Then look in the deliverable specification.** Check if the user's spec includes information for this field.
3. **Then look in the brief.** Extract content that maps to the field.
4. **Then look in the supporting materials.** Pull from there if available.
5. **Then apply the Strategic Take's decisions.** If the Strategic Take has made calls about audience, hook, tone, or proof, incorporate those calls into the relevant fields.
6. **If the user marked a question "don't know" or "skip," infer reasonably.** Make the call a senior copywriter would make. Do not leave required fields empty unless you genuinely cannot infer anything sensible.
7. **Last resort: synthesize from full context.** If a required field has no obvious source, write the strongest reasonable value based on everything you've read.

## Critical Rules

- **Output is JSON only.** No markdown, no preamble, no comments inside the JSON, no trailing text. The output is parsed programmatically and any non-JSON content will break the pipeline.
- **Match the schema exactly.** Field names, types, and structure must match what the template expects. Do not invent fields. Do not omit required fields.
- **Respect field length limits.** Each field has a maxLength constraint. Stay under it. If a brief contains more relevant content than the field allows, extract the most important portions.
- **Honor select-field options exactly.** When a field is a select type with predefined options, your value must match one of those options exactly (case-sensitive). If the brief content doesn't fit any predefined option cleanly, choose the closest match. Do not invent new options.
- **Honor the Strategic Take.** If the Strategic Take says "I'm leading from category leadership," extract a value proposition that reflects category leadership. The extraction is downstream of the strategic decision, not parallel to it.
- **Brief content > generic content.** Always prefer specific phrases, numbers, and details from the brief over generic substitutions. The brief contains the substance. Generic filler weakens the eventual copy.
- **Cliché filtering.** When the brief contains tired phrases the Strategic Take flagged ("transformative," "world-class," "best-in-class," "seeing is believing" when stale), do not propagate them into the extracted fields. Substitute with more specific language drawn from elsewhere in the brief.
- **Tone matching.** If the brief or user answers specify tone constraints (e.g., "international audience, no Americanisms"), reflect those constraints in the language you choose for each extracted field.

## Required Output Format

Output a single valid JSON object matching the structure of the target template's field schema (the exact field names will be supplied at runtime).

No other text. No keys not in the schema. No nested explanations. Just the object.`;

// ============================================================================
// User-message builder
// ============================================================================

/**
 * Assembles the user-turn message for the Brief Extraction LLM call (Call 2).
 *
 * Injects the template's field schema block first (so the model sees the
 * target structure before the content it must extract from), then appends
 * all brief context and the user's Q&A pairs.
 *
 * @param input       - The Brief Extraction request payload
 * @param schemaBlock - The runtime schema description string, produced by
 *                      buildTemplateSchemaBlock() from worxdesk-template-schemas.ts
 * @param questions   - The questions generated in the Strategic Review (Call 1).
 *                      Used to render the "Q:" line for each answer. Pass an empty
 *                      array when the review was bypassed; question text will fall
 *                      back to the questionId string.
 * @returns The assembled user message string
 */
export function buildBriefExtractionPrompt(
  input: BriefExtractionLLMRequest,
  schemaBlock: string,
  questions: WorxDeskQuestion[],
): string {
  const questionsById = Object.fromEntries(questions.map((q) => [q.id, q.text]));

  const qaLines = input.answers.length > 0
    ? input.answers
        .map((a) => {
          const questionText = questionsById[a.questionId] ?? a.questionId;
          const skipSuffix = a.wasSkipped ? '  (user skipped — make the call yourself)' : '';
          return `Q: ${questionText}\nA: ${a.answer}${skipSuffix}`;
        })
        .join('\n\n')
    : '(no questions were asked or the review was bypassed)';

  return `${schemaBlock}

CONTEXT

Original Brief
${input.brief}

Deliverable Specification
${input.deliverableSpec}

Supporting Materials
${input.supportingMaterials || '(none provided)'}

Strategic Take from Senior Copywriter
${input.strategicTake}

User Answers to Strategic Review Questions
${qaLines}

Now produce the JSON object. JSON only. No preamble, no commentary, no code fences.`;
}
