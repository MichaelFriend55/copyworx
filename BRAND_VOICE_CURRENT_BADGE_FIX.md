# Brand Voice "Current" Badge Fix

## Summary
Fixed the bug where multiple brand voices were showing the "Current" badge. Now only ONE brand voice (the one actually assigned to the active project) shows "Current" at any time.

## Problem Identified

### What Was Happening
Multiple brand voices (e.g., "Acme Corp" and "Rocket loans") were both showing the "Current" badge, creating confusion about which brand voice is actively being used.

### Root Cause
The badge logic was using an **outdated relationship** from the old database schema:

```tsx
// OLD LOGIC (WRONG):
{bv.project_id === activeProjectId && (
  <span>Current</span>
)}
```

This checked if the brand voice's `project_id` matched the active project's ID. This was correct in the old schema but became incorrect after the database migration to support multiple brand voices.

## Database Schema Evolution

### BEFORE Migration (Old Schema)
```sql
-- brand_voices table
project_id UUID NOT NULL REFERENCES projects(id)
UNIQUE(project_id)  -- ONE brand voice per project
```

**Relationship:** One-to-one (each project has exactly one brand voice)
**Logic:** `bv.project_id === activeProjectId` worked correctly

### AFTER Migration (New Schema)
```sql
-- brand_voices table
project_id UUID  -- Can be NULL, no UNIQUE constraint
-- Multiple brand voices can exist

-- projects table
brand_voice_id UUID REFERENCES brand_voices(id)  -- NEW COLUMN
-- Projects reference which brand voice they're using
```

**Relationship:** Many-to-many (projects can choose from multiple brand voices)
**Issue:** Multiple brand voices can have the same `project_id` value (legacy data or intentional), causing multiple "Current" badges

## The Fix

### New Logic (Correct)
```tsx
// Check if this brand voice is currently assigned to the active project
const isCurrentBrandVoice = activeProject?.brandVoice?.brandName === bv.brand_name;

{isCurrentBrandVoice && (
  <span>Current</span>
)}
```

**What it does:**
1. Gets the active project from the Zustand store
2. Checks if the project has a brand voice assigned (`activeProject.brandVoice`)
3. Compares the brand voice's name from the database with the project's assigned brand voice name
4. Only shows "Current" if they match

**Why this works:**
- Each project stores the full `BrandVoice` object (not just an ID)
- Brand names are unique identifiers that users recognize
- This checks the actual ASSIGNED brand voice, not legacy database relationships
- Only ONE brand voice can match at a time (the one assigned to the active project)

## Code Changes

### File Modified
`components/workspace/BrandVoiceSlideOut.tsx`

### Lines Changed
Lines 488-536 (the brand voices list rendering)

### Before
```tsx
{brandVoices.map((bv) => (
  <div
    className={cn(
      'flex items-center justify-between p-3 rounded-lg border',
      'bg-white hover:bg-gray-50 transition-colors duration-200',
      bv.project_id === activeProjectId && 'border-apple-blue bg-blue-50'  // ❌ WRONG
    )}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-apple-blue flex-shrink-0" />
        <span className="font-medium text-gray-900 truncate">
          {bv.brand_name}
        </span>
        {bv.project_id === activeProjectId && (  // ❌ WRONG
          <span className="text-xs px-2 py-0.5 bg-apple-blue text-white rounded-full">
            Current
          </span>
        )}
      </div>
    </div>
    {/* ...buttons... */}
  </div>
))}
```

### After
```tsx
{brandVoices.map((bv) => {
  // Check if this brand voice is currently assigned to the active project
  const isCurrentBrandVoice = activeProject?.brandVoice?.brandName === bv.brand_name;  // ✅ CORRECT
  
  return (
    <div
      key={bv.id}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        'bg-white hover:bg-gray-50 transition-colors duration-200',
        isCurrentBrandVoice && 'border-apple-blue bg-blue-50'  // ✅ CORRECT
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-apple-blue flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate">
            {bv.brand_name}
          </span>
          {isCurrentBrandVoice && (  // ✅ CORRECT
            <span className="text-xs px-2 py-0.5 bg-apple-blue text-white rounded-full">
              Current
            </span>
          )}
        </div>
      </div>
      {/* ...buttons... */}
    </div>
  );
})}
```

## What Determines "Current"

A brand voice is "Current" when:
1. A project is actively selected (`activeProject` exists)
2. The active project has a brand voice assigned (`activeProject.brandVoice !== null`)
3. The brand voice's name matches the assigned brand voice name (`bv.brand_name === activeProject.brandVoice.brandName`)

**When NO brand voice is "Current":**
- No project is selected
- The selected project has no brand voice assigned
- The project's brand voice doesn't match any in the list

## Testing Instructions

### Test Case 1: Basic Functionality
```
1. Open the app
2. Select a project (e.g., "EFI")
3. Open Brand Voices panel
4. Verify ONLY ONE brand voice shows "Current"
5. Verify it's the correct brand voice for that project
```

### Test Case 2: Switch Projects
```
1. Open Brand Voices panel
2. Note which brand voice shows "Current" (e.g., "Acme Corp")
3. Close the panel
4. Switch to a different project
5. Open Brand Voices panel again
6. Verify the "Current" badge moved to the new project's brand voice
7. Verify only ONE badge is shown
```

### Test Case 3: No Project Selected
```
1. Ensure no project is selected
2. Open Brand Voices panel
3. Verify NO brand voice shows "Current"
4. List should display but without any "Current" badges
```

### Test Case 4: Project Without Brand Voice
```
1. Create a new project
2. Don't assign a brand voice to it
3. Open Brand Voices panel
4. Verify NO brand voice shows "Current"
```

### Test Case 5: Multiple Brand Voices for One User
```
1. Create multiple brand voices (e.g., "Brand A", "Brand B", "Brand C")
2. Assign "Brand B" to the active project
3. Open Brand Voices panel
4. Verify only "Brand B" shows "Current"
5. "Brand A" and "Brand C" should not show "Current"
```

### Test Case 6: Edit Current Brand Voice
```
1. Select a project with an assigned brand voice
2. Open Brand Voices panel
3. Verify correct brand shows "Current"
4. Click Edit on the current brand voice
5. Make changes and save
6. Verify "Current" badge still appears (name unchanged)
```

## Visual Verification

### Before Fix
```
Brand Voices Panel:
├─ Acme Corp          [Current]  ← WRONG (shows current)
├─ Rocket loans       [Current]  ← WRONG (shows current)  
└─ Nike                          ← Correct (no badge)
```

### After Fix
```
Brand Voices Panel:
├─ Acme Corp          [Current]  ← CORRECT (only one with badge)
├─ Rocket loans                  ← CORRECT (no badge)
└─ Nike                          ← CORRECT (no badge)
```

## Edge Cases Handled

### 1. No Active Project
- **Behavior:** No "Current" badges shown
- **Why:** `activeProject` is undefined, so comparison returns false

### 2. Active Project Has No Brand Voice
- **Behavior:** No "Current" badges shown
- **Why:** `activeProject.brandVoice` is null, so comparison returns false

### 3. Brand Voice Name Doesn't Match Any
- **Behavior:** No "Current" badges shown
- **Why:** String comparison fails for all brand voices

### 4. Case Sensitivity
- **Consideration:** Brand names are compared with strict equality (`===`)
- **Impact:** "Acme Corp" ≠ "acme corp" ≠ "ACME CORP"
- **Status:** Working as intended (brand names should match exactly)

## Related Files
- Component: `components/workspace/BrandVoiceSlideOut.tsx`
- Types: `lib/types/brand.ts`, `lib/types/project.ts`
- API: `app/api/db/all-brand-voices/route.ts`
- Migration: `supabase/migrations/001_multiple_brand_voices.sql`

## Future Considerations

### Potential Improvements
1. **Use ID instead of name**: Compare `bv.id` with a stored `brand_voice_id` on projects
   - More robust (names can change)
   - Requires schema update to store brand_voice_id on frontend Project type

2. **"Assigned to X projects" indicator**: Show how many projects use each brand voice
   - Helps users understand which brands are actively used
   - Requires counting project associations

3. **Last used timestamp**: Track when each brand voice was last used
   - Helps identify stale/unused brand voices
   - Requires new database field

### Migration Notes
- This fix works with BOTH pre-migration and post-migration databases
- Compatible with the old one-to-one relationship
- Compatible with the new many-to-many relationship
- No database changes required for this fix

## Build Verification
✅ TypeScript compilation: SUCCESS  
✅ Production build: SUCCESS (`npm run build`)  
✅ Linter errors: NONE  
✅ No breaking changes

## Summary
- **Files changed:** 1 file (`BrandVoiceSlideOut.tsx`)
- **Lines changed:** ~20 lines (logic + formatting)
- **Bug fixed:** Multiple "Current" badges → Only one "Current" badge
- **Test complexity:** Low (visual verification in UI)
- **Breaking changes:** None
- **Migration required:** None
