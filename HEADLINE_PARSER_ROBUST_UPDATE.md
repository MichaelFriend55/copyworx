# Robust Headline Parser Implementation

**Date**: February 5, 2026  
**Status**: ✅ Complete

## Summary

Replaced the strict headline parser with a robust, forgiving implementation that handles multiple output formats from Claude, reducing "couldn't be parsed" errors and improving user experience.

## Changes Made

### 1. Updated Parser (`lib/prompts/headline-generator.ts`)

**Location**: Lines 486-535 (replaced `parseHeadlineResponse()` function)

**What Changed**:
- Replaced strict parser that only handled formula headers + dash bullets
- New parser handles 4+ different input patterns:
  - ✅ Bullet points (`•` or `-`)
  - ✅ Numbered lists (`1.` or `1)`)
  - ✅ Formula labels (`[BENEFIT-DRIVEN]:` or `BENEFIT-DRIVEN:`)
  - ✅ Plain text headlines (as fallback)
  - ✅ Mixed formats in the same response

**Key Features**:
- Skips common preamble text ("Here are", "Quality checklist", etc.)
- Deduplicates headlines if caught in multiple formats
- Tracks formula labels for each headline
- Falls back to "GENERATED" label if no formula detected
- Validates headline characteristics (length, content type)

### 2. Enhanced Error Handling (`components/workspace/HeadlineGeneratorTool.tsx`)

**Added Warning System**:
- Shows amber warning when fewer headlines were captured than requested
- Example: "Only 8 of 15 headlines were captured. Check raw output if needed."
- Distinguishes between hard errors (red) and partial successes (amber)

**Added Raw Output Toggle**:
- Users can now expand/collapse raw Claude output
- Helpful for debugging parsing issues
- Shows "▶ Show raw output" / "▼ Hide raw output" button
- Only appears when raw text is available

**State Management**:
- Added `warning` state for partial success messages
- Added `showRawOutput` state for toggle
- Clears warnings on reset/retry

## Testing

Created test file: `lib/prompts/__test-headline-parser.ts`

Run tests with:
```bash
npx ts-node lib/prompts/__test-headline-parser.ts
```

### Test Cases Covered

1. **Bullet format (•)**
   ```
   • Stop Losing Clients to Bad Follow-Up
   • How to Close 3X More Deals in 30 Days
   ```

2. **Numbered format (1., 2., 3.)**
   ```
   1. Stop Losing Clients to Bad Follow-Up
   2. How to Close 3X More Deals in 30 Days
   ```

3. **Formula labels**
   ```
   BENEFIT-DRIVEN:
   Stop Losing Clients to Bad Follow-Up
   
   HOW-TO:
   How to Close 3X More Deals in 30 Days
   ```

4. **Mixed with preamble** (parser ignores preamble)
   ```
   Here are your headlines:
   
   • Stop Losing Clients to Bad Follow-Up
   • How to Close 3X More Deals in 30 Days
   
   Quality checklist:
   ✓ Respects character limits
   ```

5. **Inline bracket labels**
   ```
   [BENEFIT-DRIVEN]: Stop Losing Clients to Bad Follow-Up
   [HOW-TO]: How to Close 3X More Deals in 30 Days
   ```

6. **Expected format** (original format still works)
   ```
   BENEFIT-DRIVEN:
   - Stop Losing Clients to Bad Follow-Up
   
   HOW-TO:
   - How to Close 3X More Deals in 30 Days
   ```

7. **Plain text** (fallback)
   ```
   Stop Losing Clients to Bad Follow-Up
   
   How to Close 3X More Deals in 30 Days
   ```

8. **Mixed formats** (all patterns in one response)
   ```
   BENEFIT-DRIVEN:
   - Stop Losing Clients to Bad Follow-Up
   
   2. How to Close 3X More Deals in 30 Days
   
   • Get More Leads Without Cold Calling
   
   [QUESTION]: Tired of Losing Deals?
   ```

## Files Modified

1. ✅ `lib/prompts/headline-generator.ts` (parser function)
2. ✅ `components/workspace/HeadlineGeneratorTool.tsx` (UI component)

## Files Created

1. ✅ `lib/prompts/__test-headline-parser.ts` (test cases)
2. ✅ `HEADLINE_PARSER_ROBUST_UPDATE.md` (this document)

## User Experience Improvements

### Before
- ❌ Strict parser threw errors on format variations
- ❌ Users only saw "couldn't be parsed" with no details
- ❌ No way to see what Claude actually returned

### After
- ✅ Parser handles natural LLM output variation gracefully
- ✅ Partial successes show helpful warnings
- ✅ Users can toggle raw output to debug issues
- ✅ Deduplication prevents showing same headline twice
- ✅ Better error context (hard errors vs warnings)

## Backward Compatibility

✅ **Fully backward compatible**

The original format (formula headers with dash bullets) still works perfectly:
```
BENEFIT-DRIVEN:
- Headline text here

CURIOSITY GAP:
- Another headline here
```

## Next Steps (Optional)

1. **Test in production** with real users
2. **Monitor parsing success rate** via logs
3. **Adjust heuristics** if needed based on real-world output
4. **Consider logging** unparsed responses to improve parser over time

## Technical Notes

### Parser Heuristics

The parser uses these smart filters to avoid false positives:

- **Length check**: 10-200 characters (reasonable headline range)
- **Skip preamble**: "here are", "your headlines", "quality checklist", etc.
- **Skip instructions**: "you must", "please ensure", "make sure", etc.
- **Skip metadata**: separator lines (`---`), checklist marks (`✓`)
- **Case check**: Not ALL CAPS (likely a label, not headline)
- **Context awareness**: Tracks current formula label for unlabeled headlines

### Deduplication

Uses `Set` to deduplicate headlines that might be caught by multiple patterns, ensuring clean output even if parser is overly aggressive.

### Formula Tracking

Maintains a `Map<headline, formula>` to preserve which copywriting formula each headline uses, even when formats are mixed.

## Validation

✅ No linter errors  
✅ TypeScript compilation successful  
✅ All test cases pass  
✅ Backward compatible with existing format  
✅ UI updates render correctly  

## Questions?

If you encounter headlines that aren't being parsed correctly:

1. Use the "Show raw output" toggle to see what Claude returned
2. Check if the pattern is in the test file
3. Add new pattern detection to the parser if needed
4. The parser is designed to be extended easily
