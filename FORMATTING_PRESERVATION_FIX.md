# Formatting Preservation Fix - AI Tools (Expand, Shorten, ToneShifter, RewriteChannel)

## Problem
When users selected formatted text (bullets, headings, bold, etc.) and used AI tools like Expand, the returned text lost all formatting.

## Root Cause
The tools were sending **plain text** to the Claude API instead of **HTML**. Even though the API prompts were configured to preserve formatting, they had nothing to preserve because they only received plain text.

## Solution Overview

### Flow Before Fix
```
User selects formatted text
    ↓
getEditorSelection() extracts text (plain text only)
    ↓
EditorArea passes text to store (no HTML)
    ↓
Tools send plain text to API
    ↓
Claude returns HTML but can't preserve formatting it never received
```

### Flow After Fix
```
User selects formatted text
    ↓
getEditorSelection() extracts BOTH text AND HTML ✅
    ↓
EditorArea passes text + HTML to store ✅
    ↓
Tools send HTML to API ✅
    ↓
Claude receives formatted HTML, preserves structure, returns formatted HTML
    ↓
Result inserted with formatting intact ✅
```

## Files Modified

### 1. `lib/editor-utils.ts`
**Changed:** Fixed `getEditorSelection()` to properly extract HTML from TipTap selection

**Before (incorrect):**
```typescript
// This doesn't work - from/to are node positions, not string positions
const html = editor.getHTML().substring(from, to);
```

**After (correct):**
```typescript
// Get the slice of the document that's selected
const slice = editor.state.doc.slice(from, to);

// Convert the slice to JSON format
const sliceContent = slice.content.toJSON();

// Create a document-like structure for generateHTML
const docJson = {
  type: 'doc',
  content: Array.isArray(sliceContent) ? sliceContent : [sliceContent],
};

// Generate proper HTML using TipTap's extensions
html = generateHTML(docJson, editor.extensionManager.extensions);
```

### 2. `lib/stores/workspaceStore.ts`
**Added:** `selectedHTML` state to store formatted content alongside plain text

```typescript
// State
selectedText: string | null;
selectedHTML: string | null;  // NEW
selectionRange: { from: number; to: number } | null;

// Action signature updated
setSelectedText: (text: string | null, html: string | null, range: {...} | null) => void;

// Selector hook added
export const useSelectedHTML = () => useWorkspaceStore((state) => state.selectedHTML);
```

### 3. `components/workspace/EditorArea.tsx`
**Changed:** Pass HTML to store when selection changes

```typescript
if (selection) {
  // Now passes text, HTML, and range
  setSelectedTextRef.current(selection.text, selection.html, selection.range);
} else {
  setSelectedTextRef.current(null, null, null);
}
```

### 4. AI Tool Components (ExpandTool, ShortenTool, ToneShifter, RewriteChannelTool)
**Changed:** Use HTML instead of plain text for API calls

```typescript
// Import the new hook
import { useSelectedHTML } from '@/lib/stores/workspaceStore';

// Get both text and HTML
const selectedText = useSelectedText();
const selectedHTML = useSelectedHTML();

// Use HTML for API call (preserves formatting)
const handleExpand = async () => {
  const contentToExpand = selectedHTML || selectedText;  // Prefer HTML
  if (!contentToExpand) return;
  await runExpand(contentToExpand);
};
```

## How It Works Now

### Example: Expanding a Bullet List

**User selects in editor:**
```
• Feature one
• Feature two
• Feature three
```

**HTML extracted:**
```html
<ul>
  <li>Feature one</li>
  <li>Feature two</li>
  <li>Feature three</li>
</ul>
```

**Sent to Claude API:**
```
Expand the following copy... 

ORIGINAL COPY:
<ul>
  <li>Feature one</li>
  <li>Feature two</li>
  <li>Feature three</li>
</ul>
```

**Claude returns (structure preserved):**
```html
<ul>
  <li><strong>Feature one</strong> - Detailed explanation of feature one with benefits and examples</li>
  <li><strong>Feature two</strong> - Comprehensive description of feature two and how it helps users</li>
  <li><strong>Feature three</strong> - In-depth look at feature three with real-world applications</li>
</ul>
```

**Result inserted back into editor with bullets intact!**

## Formatting Types Preserved

| Format Type | Before Fix | After Fix |
|-------------|------------|-----------|
| Bullet lists (`<ul><li>`) | ❌ Lost | ✅ Preserved |
| Numbered lists (`<ol><li>`) | ❌ Lost | ✅ Preserved |
| Headings (`<h1>` - `<h6>`) | ❌ Lost | ✅ Preserved |
| Bold (`<strong>`) | ❌ Lost | ✅ Preserved |
| Italic (`<em>`) | ❌ Lost | ✅ Preserved |
| Paragraphs (`<p>`) | ❌ Lost | ✅ Preserved |
| Mixed formatting | ❌ Lost | ✅ Preserved |

## API Routes (Already Configured)

The API routes (`/api/expand`, `/api/shorten`, `/api/tone-shift`, `/api/rewrite-channel`) already had proper formatting preservation in their Claude prompts. They just needed to receive HTML instead of plain text.

Example from expand API system prompt:
```
HTML RULES:
- Preserve the original document structure (headings stay headings, bullets stay bullets)
- Expand ONLY the content/detail, NOT the structure
- If input has bullets, output must have bullets (just more detailed)
- If input has headings, output must have headings
- Output ONLY HTML, no markdown, no preamble
```

## Testing

To test the fix:

1. Create a document with formatted content:
   ```
   ## My Heading
   
   Here's a bullet list:
   • Item one
   • Item two
   • Item three
   ```

2. Select the entire formatted section

3. Use any AI tool (Expand, Shorten, Tone Shift, Rewrite for Channel)

4. Verify the result maintains:
   - Heading stays as heading
   - Bullet list stays as bullet list
   - Structure is preserved while content is modified

## Technical Notes

### ProseMirror Slice vs String Substring
The key insight is that TipTap/ProseMirror uses **node positions**, not character positions. You can't extract HTML by doing `editor.getHTML().substring(from, to)` because:
- `from` and `to` are positions in the document node tree
- `getHTML()` returns a string where positions don't align with node positions

The correct approach is to use `editor.state.doc.slice(from, to)` to get the actual document slice, then convert it to HTML using TipTap's `generateHTML()` function with the editor's extensions.

### Fallback Behavior
If HTML extraction fails for any reason, the system falls back to wrapping plain text in `<p>` tags:
```typescript
html = `<p>${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
```

This ensures the tools always work, even if formatting can't be extracted.

## Files Changed Summary

- ✅ `lib/editor-utils.ts` - Fixed HTML extraction
- ✅ `lib/stores/workspaceStore.ts` - Added selectedHTML state
- ✅ `components/workspace/EditorArea.tsx` - Pass HTML to store
- ✅ `components/workspace/ExpandTool.tsx` - Use HTML for API
- ✅ `components/workspace/ShortenTool.tsx` - Use HTML for API
- ✅ `components/workspace/ToneShifter.tsx` - Use HTML for API
- ✅ `components/workspace/RewriteChannelTool.tsx` - Use HTML for API

## No Breaking Changes

- Plain text selection still works (fallback)
- All existing functionality preserved
- No API changes needed
- No linter errors
