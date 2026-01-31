# Brand Voices and Personas Hierarchy Fixes

## Summary
Fixed three issues with Brand Voices and Personas in the MY PROJECTS hierarchy to improve consistency and navigation.

## Issues Fixed

### Issue 1: Size ✅
**Problem:** Brand voices and personas were too large, taking up more vertical space than documents and snippets.

**Solution:**
- Reduced padding from `px-3 py-2.5` to `px-2 py-1.5` (matching documents)
- Reduced text size from `text-sm` to `text-xs` (matching documents)
- Reduced icon size from `h-4 w-4` to `h-3.5 w-3.5` (matching documents)
- Reduced metadata text from `text-xs` to `text-[10px]` (matching documents)
- Changed icon positioning from `mt-0.5` to `mt-px` for alignment

**Files Modified:**
- `components/workspace/BrandVoiceSection.tsx` - BrandVoiceRow component
- `components/workspace/PersonaSection.tsx` - PersonaRow component

### Issue 2: Navigation ✅
**Problem:** Clicking a brand voice or persona opened the general list view instead of editing that specific item.

**Solution:**
1. Added state management in `workspaceStore.ts`:
   - `pendingBrandVoiceEdit`: Stores brand name to edit
   - `pendingPersonaEdit`: Stores persona ID to edit
   - Actions: `setPendingBrandVoiceEdit()`, `setPendingPersonaEdit()`
   - Hooks: `usePendingBrandVoiceEdit()`, `usePendingPersonaEdit()`, `usePendingEditActions()`

2. Updated section components to set pending edit before opening:
   - `BrandVoiceSection`: Sets `pendingBrandVoiceEdit` with brand name when clicked
   - `PersonaSection`: Sets `pendingPersonaEdit` with persona ID when clicked

3. Updated slide-out components to check for pending edits:
   - `BrandVoiceSlideOut`: Checks for `pendingBrandVoiceEdit`, finds matching brand voice, and switches to edit mode
   - `PersonasSlideOut`: Checks for `pendingPersonaEdit`, finds matching persona, and switches to edit mode

**Files Modified:**
- `lib/stores/workspaceStore.ts` - Added pending edit state and actions
- `components/workspace/BrandVoiceSection.tsx` - Set pending edit on click
- `components/workspace/PersonaSection.tsx` - Set pending edit on click  
- `components/workspace/BrandVoiceSlideOut.tsx` - Check pending edit on open
- `components/workspace/PersonasSlideOut.tsx` - Check pending edit on open

### Issue 3: Remove "Current" Badge ✅
**Problem:** Brand voices showed a "Current" badge in the hierarchy that was redundant.

**Solution:**
- Removed the conditional "Current" badge display from BrandVoiceRow
- Removed the `isCurrent` parameter from visual styling logic
- Simplified the component to use consistent hover styling

**Files Modified:**
- `components/workspace/BrandVoiceSection.tsx` - BrandVoiceRow component

## Visual Changes

### Before:
```
Brand Voices (larger, blue background when current)
  🔊 Rocket Loans [Current]
     Professional yet approachable...

Personas (larger, purple background on hover)
  👤 John/Owner
     Age 35-45, business owner...
```

### After:
```
Brand Voices (smaller, matches documents)
  🔊 Rocket Loans
     Professional yet approachable...

Personas (smaller, matches documents)
  👤 John/Owner
     Age 35-45, business owner...
```

## Testing Checklist

### Size Verification ✓
- [ ] Brand voices are same size as documents/snippets
- [ ] Personas are same size as documents/snippets
- [ ] Icons are consistently sized (3.5x3.5)
- [ ] Padding matches document rows (px-2 py-1.5)
- [ ] Text is consistent size (text-xs for name, text-[10px] for details)

### Navigation Testing ✓
- [ ] Click a brand voice → Opens brand voice edit form (not list)
- [ ] Edit form shows that specific brand voice data
- [ ] Click a persona → Opens persona edit form (not list)
- [ ] Edit form shows that specific persona data
- [ ] Multiple personas each open their own edit view

### Badge Removal ✓
- [ ] "Current" badge is not displayed on brand voices
- [ ] Brand voices have consistent hover styling
- [ ] No visual distinction for "current" brand voice in hierarchy

### Cross-Project Testing ✓
- [ ] Test with multiple projects
- [ ] Verify brand voices show correctly per project
- [ ] Verify personas show correctly per project
- [ ] Ensure navigation works across different projects

## Technical Notes

### State Management Approach
Used Zustand store for centralized state management:
- Pending edits stored temporarily until slide-out opens
- Cleared immediately after loading into edit mode
- No persistence needed (transient UI state)

### Why Brand Name vs ID for Brand Voices?
Brand voices use brand name as the identifier because:
1. The API returns brand voices grouped by brand name
2. Brand names are unique per user
3. The slide-out already searches by brand name when loading

### Why Persona ID for Personas?
Personas use ID as the identifier because:
1. Multiple personas can have similar names
2. IDs are guaranteed unique
3. The storage layer uses IDs as primary keys

## Files Changed (7 total)

1. **lib/stores/workspaceStore.ts**
   - Added `pendingBrandVoiceEdit` and `pendingPersonaEdit` state
   - Added actions to set/clear pending edits
   - Added selector hooks for components

2. **components/workspace/BrandVoiceSection.tsx**
   - Reduced size to match documents
   - Removed "Current" badge
   - Added logic to set pending edit on click

3. **components/workspace/PersonaSection.tsx**
   - Reduced size to match documents
   - Added logic to set pending edit on click

4. **components/workspace/BrandVoiceSlideOut.tsx**
   - Added check for pending edit on open
   - Automatically switches to edit mode for target brand voice

5. **components/workspace/PersonasSlideOut.tsx**
   - Added check for pending edit on open
   - Automatically switches to edit mode for target persona

## No Breaking Changes
- All changes are backward compatible
- Existing functionality preserved
- Only visual styling and navigation improved
