/**
 * @file lib/templates/worxdesk-template-schemas.ts
 * @description Runtime template schema helpers for the WORX DESK Brief Extraction call (Call 2).
 *
 * WORX DESK v1 supports the 10 standard AI@Worx templates — those that define their
 * fields as structured TemplateField arrays and build their prompts from those fields.
 * The 5 custom-component templates (Brand Messaging Framework, Product Launch Campaign,
 * Case Study, LinkedIn Thought Leadership, Brochure Multi-Section) are deferred to v2:
 * they manage their own wizard UI and prompt construction internally and cannot be
 * driven from a generic formData JSON object.
 *
 * The primary export, buildTemplateSchemaBlock(), produces the schema description
 * injected into the Brief Extraction prompt at runtime. This tells the LLM exactly
 * which fields to populate, their types, length limits, and select options so the
 * output JSON can be validated and fed directly to /api/generate-template.
 *
 * Template IDs used here are the runtime string IDs from lib/data/templates.ts (e.g.
 * 'sales-email', 'email-sequence-kickoff'), not TypeScript constant names.
 */

import { getTemplateById } from '@/lib/data/templates';
import type { TemplateField } from '@/lib/types/template';

// ============================================================================
// Supported / unsupported template ID lists
// ============================================================================

/**
 * The 10 standard AI@Worx template IDs supported by WORX DESK v1.
 * These templates define structured TemplateField arrays and can have their
 * formData populated by the Brief Extraction LLM call.
 */
export const WORXDESK_SUPPORTED_TEMPLATE_IDS: readonly string[] = [
  'sales-email',
  'email-sequence-kickoff',
  'landing-page-hero',
  'sales-page',
  'website-copy-seo',
  'social-media-ad-copy',
  'print-media',
  'radio-commercial',
  'social-media-post',
  'press-release',
] as const;

/**
 * The 5 custom-component template IDs deferred to WORX DESK v2.
 * These templates use custom wizard UIs and build their own prompts internally;
 * they cannot be driven from a generic JSON formData object.
 */
export const WORXDESK_UNSUPPORTED_TEMPLATE_IDS: readonly string[] = [
  'brand-messaging-framework',
  'product-launch-campaign',
  'case-study',
  'linkedin-thought-leadership',
  'brochure-multi-section',
] as const;

// ============================================================================
// Guards
// ============================================================================

/**
 * Returns true if the given template ID is supported in WORX DESK v1.
 *
 * @param templateId - Runtime template ID string (e.g. 'sales-email')
 */
export function isWorxDeskSupportedTemplate(templateId: string): boolean {
  return (WORXDESK_SUPPORTED_TEMPLATE_IDS as readonly string[]).includes(templateId);
}

// ============================================================================
// Schema block builder
// ============================================================================

/**
 * Builds a human-readable, markdown-formatted schema block describing a
 * template's fields. This string is injected into the Brief Extraction prompt
 * so the LLM knows exactly which fields to populate and their constraints.
 *
 * Throws a descriptive error when:
 *   - The template ID is in the v1-deferred (unsupported) list
 *   - The template ID is not found in ALL_TEMPLATES at all
 *
 * Field rendering rules:
 *   - text/textarea fields: includes max length when defined
 *   - select fields: lists all predefined options; no length limit shown
 *   - Required and optional fields are grouped into separate sections
 *   - A section is omitted entirely when it has no fields
 *
 * @param templateId - Runtime template ID string (e.g. 'sales-email')
 * @returns Markdown-formatted schema block string
 * @throws Error if the template ID is unsupported in v1 or does not exist
 */
export function buildTemplateSchemaBlock(templateId: string): string {
  if ((WORXDESK_UNSUPPORTED_TEMPLATE_IDS as readonly string[]).includes(templateId)) {
    const supportedList = WORXDESK_SUPPORTED_TEMPLATE_IDS.join(', ');
    throw new Error(
      `WORX DESK does not support template "${templateId}" in v1. ` +
        `Supported templates are: ${supportedList}.`,
    );
  }

  const template = getTemplateById(templateId);

  if (!template) {
    throw new Error(
      `WORX DESK: template "${templateId}" does not exist. ` +
        `Check that the ID matches a template in lib/data/templates.ts.`,
    );
  }

  const requiredFields = template.fields.filter((f) => f.required);
  const optionalFields = template.fields.filter((f) => !f.required);

  const renderField = (field: TemplateField): string => {
    const reqLabel = field.required ? 'required' : 'optional';

    if (field.type === 'select') {
      const optionsList = (field.options ?? []).map((o) => `"${o}"`).join(' | ');
      return `${field.id} (select, ${reqLabel}, options: ${optionsList})`;
    }

    if (field.maxLength !== undefined) {
      return `${field.id} (${field.type}, max ${field.maxLength} chars, ${reqLabel})`;
    }

    return `${field.id} (${field.type}, ${reqLabel})`;
  };

  const sections: string[] = [];

  sections.push(`TARGET TEMPLATE: ${template.name}`);

  if (requiredFields.length > 0) {
    sections.push(`\nREQUIRED FIELDS:\n\n${requiredFields.map(renderField).join('\n')}`);
  }

  if (optionalFields.length > 0) {
    sections.push(`\nOPTIONAL FIELDS:\n\n${optionalFields.map(renderField).join('\n')}`);
  }

  return sections.join('\n');
}
