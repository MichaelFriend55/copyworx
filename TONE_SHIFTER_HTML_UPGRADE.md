# Tone Shifter HTML Formatting Upgrade

## Summary

**UPGRADED:** Tone Shifter now preserves formatting (bold, headings, bullets) when rewriting copy by using HTML output instead of plain text.

---

## Problem

**Before:** Tone Shifter output plain text, losing all formatting:
- ❌ Bold text became plain
- ❌ Headings became paragraphs
- ❌ Bullet lists became plain text
- ❌ Structure was lost

**Example:**
```
INPUT: 
**Key Benefits**
• Feature one
• Feature two

OUTPUT (Plain Text):
Key Benefits
Feature one
Feature two
```

---

## Solution

**After:** Tone Shifter outputs HTML, preserving structure:
- ✅ Bold text stays bold (or becomes bold on key phrases)
- ✅ Headings stay headings
- ✅ Bullet lists stay bullet lists
- ✅ Structure is preserved
- ✅ Emojis added for Playful/Casual tones

**Example:**
```html
INPUT:
<h3>Key Benefits</h3>
<ul>
<li>Feature one</li>
<li>Feature two</li>
</ul>

OUTPUT (Playful Tone):
<h3>🎉 Amazing Benefits You'll Love</h3>
<ul>
<li>Feature one that'll blow your mind</li>
<li>Feature two that's absolutely game-changing</li>
</ul>
```

---

## Implementation

### Part 1: Updated API Route ✅

**File:** `app/api/tone-shift/route.ts`

**Changes:**

1. **Updated SYSTEM_PROMPT** to request HTML output with structure preservation

```typescript
const SYSTEM_PROMPT = `You are an expert copywriter with 40 years of experience. Your job is to rewrite copy to match a specific tone while preserving the core message, structure, and formatting.

CRITICAL OUTPUT FORMAT:
You MUST output valid HTML that preserves the original structure while changing the tone.
Use ONLY these tags:
- <h2> or <h3> for headings and subject lines
- <p> for paragraphs
- <ul> and <li> for bullet lists
- <strong> for bold emphasis
- <em> for italic emphasis
- <br> for line breaks within paragraphs (use sparingly)

HTML RULES:
1. Preserve the original document structure (headings stay headings, bullets stay bullets)
2. Change ONLY the tone/voice/word choice, NOT the structure
3. If input has bullets, output must have bullets
4. If input has headings, output must have headings
5. Output ONLY HTML, no markdown, no preamble
6. Do NOT add blank lines between tags - write consecutively: <p>Text</p><p>Next</p>
7. Keep emojis if appropriate for the tone (especially Playful and Casual)
8. Preserve bold/italic on key phrases where appropriate
```

2. **Updated buildUserPrompt** to emphasize structure preservation

```typescript
return `Rewrite the following copy in a ${tone} tone while preserving its structure.

TARGET TONE: ${toneDescriptions[tone]}

ORIGINAL COPY:
${text}

REWRITTEN COPY (HTML only):`;
```

**Key Features:**
- Claude detects structure from plain text input (bullets marked with •, -, or line breaks)
- Outputs proper HTML with structure preserved
- Adds emojis for Playful/Casual tones
- Preserves bold on important phrases

---

### Part 2: Updated ToneShifter Component ✅

**File:** `components/workspace/ToneShifter.tsx`

**Changes:**

1. **Added import** for formatting utility

```typescript
import { formatGeneratedContent } from '@/lib/utils/content-formatting';
```

2. **Updated handleReplaceSelection** to format HTML before inserting

```typescript
const handleReplaceSelection = () => {
  if (!editor || !toneShiftResult || !selectionRange) return;
  
  // Format the HTML result (sanitize and remove excess whitespace)
  const formattedHTML = formatGeneratedContent(toneShiftResult, false);
  
  // Use editor utils to replace the selection with formatted HTML
  const success = insertTextAtSelection(editor, formattedHTML, { isHTML: true });
  
  if (success) {
    clearToneShiftResult();
    console.log('✅ Tone shifted content inserted with formatting preserved');
  }
};
```

**Processing Flow:**
1. User selects formatted text (plain text sent to API is fine)
2. Claude receives plain text, detects structure
3. Claude outputs HTML with structure preserved and tone changed
4. `formatGeneratedContent()` sanitizes and removes excess whitespace
5. Formatted HTML inserted into editor at selection
6. Result: Formatted content in new tone

---

### Part 3: Formatting Utility (Already Exists) ✅

**File:** `lib/utils/content-formatting.ts`

**Function:** `formatGeneratedContent(html: string, isEmail: boolean)`

**What it does:**
- Removes dangerous content (scripts, event handlers)
- Strips excess whitespace between tags
- Validates HTML structure
- Returns clean, safe HTML

**Usage in Tone Shifter:**
```typescript
const formattedHTML = formatGeneratedContent(toneShiftResult, false);
// false = not email (no special Subject: line handling)
```

---

## How It Works

### Input Processing
User can select:
- Plain text → Claude detects structure and outputs HTML
- Formatted text → Store sends plain text, Claude preserves structure
- Mixed content → Claude intelligently converts to proper HTML

### Structure Detection
Claude recognizes:
- **Paragraphs:** Separated by line breaks → `<p>` tags
- **Bullets:** Lines starting with •, -, or * → `<ul><li>` tags
- **Headings:** ALL CAPS or "Subject:" → `<h2>` or `<h3>` tags
- **Bold:** Important phrases → `<strong>` tags
- **Emphasis:** Subtle emphasis → `<em>` tags

### Tone Application
For each tone, Claude:
1. Preserves structure (bullets stay bullets)
2. Changes word choice and phrasing
3. Adjusts formality level
4. Adds tone-appropriate elements (emojis for Playful/Casual)
5. Emphasizes key phrases with bold

---

## Tone-Specific Formatting

### Professional
- Formal language
- Minimal bold (only critical points)
- No emojis
- Structured and polished

### Casual
- Conversational language
- Moderate bold
- Occasional emojis (😊, 👍)
- Relaxed structure

### Urgent
- Action-oriented language
- Heavy bold on CTAs
- Urgency indicators
- Tight, punchy structure

### Friendly
- Warm, personable language
- Moderate bold
- Occasional emojis (❤️, 🙂)
- Welcoming structure

### Techy
- Technical terminology
- Bold on specs/metrics
- No emojis
- Precise, detailed structure

### Playful
- Fun, energetic language
- Bold on exciting phrases
- Lots of emojis (🎉, ✨, 🚀)
- Creative structure

---

## Examples

### Example 1: Email Subject + Body

**INPUT (Plain Text):**
```
Subject: New Feature Release
We're excited to announce our latest update.
Key improvements:
• Faster performance
• Better UI
• Bug fixes
```

**OUTPUT (Playful Tone):**
```html
<h3>Subject: 🎉 You're Gonna Love What We Just Built!</h3>
<p>Guess what? We just dropped an update that's about to make your day!</p>
<p><strong>Here's what's new and awesome:</strong></p>
<ul>
<li>Lightning-fast performance that'll make you smile</li>
<li>A UI so pretty you'll want to show it off</li>
<li>Squashed bugs like a boss</li>
</ul>
```

---

### Example 2: Product Description

**INPUT (Plain Text):**
```
Premium Quality Widget
Our widget is built with the finest materials.
It's durable, reliable, and affordable.
```

**OUTPUT (Techy Tone):**
```html
<h3>Premium Quality Widget</h3>
<p>Our widget utilizes <strong>aerospace-grade aluminum alloy</strong> with a tensile strength of 310 MPa, ensuring optimal durability under stress.</p>
<p>Engineered with <strong>99.9% uptime reliability</strong> and priced competitively at industry-standard MSRP levels.</p>
```

---

### Example 3: Bullet List

**INPUT (Plain Text):**
```
Why choose us:
• 24/7 support
• Money-back guarantee
• Free shipping
```

**OUTPUT (Friendly Tone):**
```html
<p><strong>Why you'll love working with us:</strong></p>
<ul>
<li>We're here for you 24/7, whenever you need us ❤️</li>
<li>Not happy? No worries - money-back guarantee, no questions asked</li>
<li>Free shipping on us, because you deserve it</li>
</ul>
```

---

## Testing Checklist

### Test Cases

✅ **Plain paragraph → Any tone**
- Input: Plain text paragraph
- Expected: `<p>` tag with tone-shifted content

✅ **Bullet list → Any tone**
- Input: Lines with bullets (•, -, *)
- Expected: `<ul><li>` structure preserved

✅ **Heading + body → Any tone**
- Input: Subject line or heading + paragraphs
- Expected: `<h3>` for heading, `<p>` for body

✅ **Bold text → Any tone**
- Input: Text with emphasis
- Expected: `<strong>` on key phrases

✅ **Mixed content → Any tone**
- Input: Heading + paragraphs + bullets
- Expected: All structure preserved

✅ **Playful tone → Emojis added**
- Input: Any content
- Expected: Fun emojis in output (🎉, ✨, 🚀)

✅ **Casual tone → Occasional emojis**
- Input: Any content
- Expected: Friendly emojis (😊, 👍)

✅ **Professional tone → No emojis**
- Input: Any content
- Expected: Formal, no emojis

---

## Manual Testing Steps

1. **Open Tone Shifter tool**
2. **Select formatted content** (heading + bullets + bold text)
3. **Choose "Playful" tone**
4. **Click "Shift Tone"**
5. **Verify result:**
   - ✅ Heading is still a heading (larger, bold)
   - ✅ Bullets are still bullets
   - ✅ Bold text is still bold (on key phrases)
   - ✅ Emojis added appropriately
   - ✅ Tone is playful and fun
6. **Click "Replace Selection"**
7. **Verify insertion:**
   - ✅ Formatted content inserted correctly
   - ✅ Structure preserved in editor
   - ✅ No extra spacing
   - ✅ Selection replaced cleanly

---

## Benefits

✅ **Structure Preservation** - Headings, bullets, bold all preserved  
✅ **Professional Output** - Proper HTML formatting  
✅ **Tone Variety** - All 6 tones work with formatting  
✅ **Emoji Support** - Playful/Casual tones get emojis  
✅ **Clean Spacing** - No excessive whitespace  
✅ **Safe HTML** - Sanitized and validated  
✅ **Editor Compatible** - Works seamlessly with TipTap  
✅ **Copy/Paste Ready** - HTML can be copied to other tools  

---

## Technical Details

### HTML Tags Supported
- `<h2>`, `<h3>` - Headings
- `<p>` - Paragraphs
- `<ul>`, `<li>` - Bullet lists
- `<strong>` - Bold emphasis
- `<em>` - Italic emphasis
- `<br>` - Line breaks

### Sanitization
- Removes `<script>` tags
- Removes event handlers (`onclick`, etc.)
- Removes `javascript:` URLs
- Removes `<iframe>` tags
- Strips excess whitespace between tags

### Spacing Control
- Paragraphs: 12px apart (0.75rem)
- Headings: 24px above, 12px below
- List items: 4px apart
- Lists: 12px above/below

---

## Files Modified

1. ✅ `app/api/tone-shift/route.ts` - Claude system prompt and user prompt
2. ✅ `components/workspace/ToneShifter.tsx` - Import formatting utility, update replace function
3. ✅ `lib/utils/content-formatting.ts` - Already exists, no changes needed

---

## Backward Compatibility

✅ **No breaking changes**
- Plain text input still works (Claude converts to HTML)
- Existing functionality unchanged
- All 6 tones work with new system
- Replace selection still works
- Copy to clipboard still works

---

## Future Enhancements

- [ ] Add "Preserve Formatting" toggle (HTML vs plain text output)
- [ ] Add custom emoji sets per tone
- [ ] Add formatting preview before replacing
- [ ] Add undo/redo for tone shifts
- [ ] Add tone comparison (side-by-side view)
- [ ] Add batch tone shifting (multiple selections)

---

## Troubleshooting

### Issue: Structure not preserved
**Solution:** Check that Claude's output includes HTML tags. Verify SYSTEM_PROMPT is correct.

### Issue: Excess spacing
**Solution:** Verify `formatGeneratedContent()` is being called. Check regex: `>\s+<` → `><`

### Issue: Bold not preserved
**Solution:** Check that `<strong>` tags are in Claude's output. Verify CSS supports bold rendering.

### Issue: Emojis not appearing
**Solution:** Verify tone is Playful or Casual. Check Claude's output includes emojis.

---

## Status

✅ **Production Ready**
- Zero linter errors
- Zero TypeScript errors
- All tones support HTML output
- Formatting preserved correctly
- Clean spacing applied
- Safe HTML sanitization

**Upgrade Complete:** Tone Shifter now preserves formatting like Template Generator! 🎉
