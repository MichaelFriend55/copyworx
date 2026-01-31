# Brand Voices & Personas in Project Hierarchy

## Summary
Added Brand Voices and Personas sections to the MY PROJECTS hierarchy, allowing users to see and access brand voices and personas associated with each project directly from the project tree.

## What Changed

### New Hierarchy Structure
When a project is expanded in MY PROJECTS, users now see:

```
📁 Project Name
  ├─ 📁 Folders (if any)
  │   └─ 📄 Documents
  ├─ 📄 Documents (root level)
  ├─ ✂️ Snippets (existing)
  │   └─ Individual snippets
  ├─ 🔊 Brand Voice (NEW)
  │   └─ Current brand voice (if set)
  └─ 👥 Personas (NEW)
      └─ List of personas (if any)
```

## Files Created

### 1. `components/workspace/BrandVoiceSection.tsx` (NEW)
**Purpose:** Displays the brand voice section within a project's hierarchy

**Features:**
- Shows the brand voice assigned to the project
- Displays brand name and tone preview
- Clickable to open Brand Voice slide-out panel
- Shows "Current" badge
- Collapsible section
- Integrates with search filtering
- Empty state with call-to-action button

**Key Components:**
- `BrandVoiceSection` - Main section component
- `BrandVoiceRow` - Individual brand voice display

### 2. `components/workspace/PersonaSection.tsx` (NEW)
**Purpose:** Displays personas section within a project's hierarchy

**Features:**
- Lists all personas associated with the project
- Shows persona name and demographics preview
- Displays persona photo if available
- Clickable to open Personas slide-out panel
- Collapsible section
- Shows count badge
- Integrates with search filtering
- Empty state with call-to-action button

**Key Components:**
- `PersonaSection` - Main section component
- `PersonaRow` - Individual persona display

## Files Modified

### `components/workspace/MyProjectsSlideOut.tsx`
**Changes:**
1. Added imports for new components and icons:
   - `Volume2` icon (for Brand Voice)
   - `Users` icon (for Personas)
   - `BrandVoiceSection` component
   - `PersonaSection` component

2. Integrated sections into project hierarchy (after Snippets section):
   ```tsx
   {/* Snippets section */}
   <SnippetSection ... />
   
   {/* Brand Voice section */}
   <BrandVoiceSection
     project={project}
     isExpanded={isExpanded}
     searchQuery={searchQuery}
   />
   
   {/* Personas section */}
   <PersonaSection
     project={project}
     isExpanded={isExpanded}
     searchQuery={searchQuery}
   />
   ```

## How It Works

### Brand Voice Section

**Data Source:**
- Reads from `project.brandVoice` property
- Each project can have one brand voice assigned

**Display Logic:**
1. If project has a brand voice → Shows brand name, tone, and "Current" badge
2. If project has no brand voice → Shows "No brand voice set" with "+ Set brand voice" button
3. If search query doesn't match → Shows "No brand voice matches" message

**Click Behavior:**
- Clicking the brand voice row opens the Brand Voice slide-out panel
- Uses `BRAND_VOICE_PANEL_ID` to open the correct panel
- User can view/edit the brand voice from there

### Personas Section

**Data Source:**
- Reads from `project.personas` array
- Each project can have multiple personas

**Display Logic:**
1. If project has personas → Lists all personas with name and demographics preview
2. If project has no personas → Shows "No personas yet" with "+ Add your first persona" button
3. If search filters out all personas → Shows "No personas match" message

**Click Behavior:**
- Clicking any persona row opens the Personas slide-out panel
- Uses `PERSONAS_PANEL_ID` to open the correct panel
- User can view/edit personas from there
- The personas panel shows ALL personas for the project

## Visual Design

### Styling Consistency
Both sections follow the same design pattern as the Snippets section:

**Colors:**
- Brand Voice: Blue theme (`text-blue-*`, `bg-blue-*`, `border-blue-*`)
- Personas: Purple theme (`text-purple-*`, `bg-purple-*`, `border-purple-*`)

**Structure:**
- Left border accent (2px)
- Collapsible header with chevron
- Icon + section name + count badge
- Hover states for interactivity
- Consistent spacing and indentation

**Typography:**
- Section header: `text-sm font-semibold`
- Item names: `text-sm font-medium`
- Previews: `text-xs text-gray-500`
- Count badges: `text-xs` with colored background

## Navigation Flow

### From Project Hierarchy to Brand Voice
```
1. User expands project in MY PROJECTS
2. Sees "Brand Voice" section
3. Clicks on brand voice name
4. Brand Voice slide-out panel opens
5. User can view/edit brand voice settings
```

### From Project Hierarchy to Personas
```
1. User expands project in MY PROJECTS
2. Sees "Personas" section with list
3. Clicks on any persona name
4. Personas slide-out panel opens
5. User can view/edit all personas for the project
```

### Integration with Existing Panels
- Uses existing slide-out panel system
- Opens the same panels as clicking from BRAND & AUDIENCE section
- Maintains state and data consistency
- No duplicate functionality - just additional access points

## Search Integration

Both sections respect the search query from MY PROJECTS:

**Brand Voice Filtering:**
- Searches brand name
- Searches brand tone
- Hides section if no match

**Personas Filtering:**
- Searches persona name
- Searches demographics
- Searches psychographics
- Shows only matching personas
- Hides section if no matches

## Empty States

### Brand Voice - No Voice Set
```
╔══════════════════════════════╗
║   🔊 Brand Voice        [ ]  ║
╠══════════════════════════════╣
║                              ║
║    No brand voice set        ║
║  + Set brand voice           ║
║                              ║
╚══════════════════════════════╝
```

### Personas - No Personas
```
╔══════════════════════════════╗
║   👥 Personas           [ ]  ║
╠══════════════════════════════╣
║                              ║
║      No personas yet         ║
║  + Add your first persona    ║
║                              ║
╚══════════════════════════════╝
```

## Testing Instructions

### Test 1: Brand Voice Display
```
1. Create a project
2. Assign a brand voice to it (via BRAND & AUDIENCE)
3. Open MY PROJECTS
4. Expand the project
5. Scroll to Brand Voice section
✓ Should show brand name
✓ Should show tone preview
✓ Should show "Current" badge
✓ Should have blue styling
```

### Test 2: Click Brand Voice
```
1. Open MY PROJECTS
2. Expand a project with brand voice
3. Click on the brand voice name
✓ Brand Voice slide-out should open
✓ Should show the correct brand voice details
✓ Should allow editing
```

### Test 3: Personas Display
```
1. Create a project
2. Add 2-3 personas to it (via BRAND & AUDIENCE)
3. Open MY PROJECTS
4. Expand the project
5. Scroll to Personas section
✓ Should show all personas
✓ Should show persona names
✓ Should show demographics preview
✓ Should show count badge (e.g., "3")
✓ Should have purple styling
```

### Test 4: Click Personas
```
1. Open MY PROJECTS
2. Expand a project with personas
3. Click on any persona name
✓ Personas slide-out should open
✓ Should show list of all personas for project
✓ Should allow editing
```

### Test 5: Empty States
```
1. Create a new project
2. Don't add brand voice or personas
3. Open MY PROJECTS
4. Expand the project
✓ Brand Voice section shows "No brand voice set"
✓ Personas section shows "No personas yet"
✓ Both show call-to-action buttons
✓ Buttons open respective panels when clicked
```

### Test 6: Search Integration
```
1. Create project with:
   - Brand voice: "Acme Corp"
   - Personas: "Sarah", "John", "Marketing Manager"
2. Open MY PROJECTS
3. Expand project
4. Search for "Sarah"
✓ Brand voice section should hide
✓ Personas section should show only "Sarah"

5. Search for "Acme"
✓ Brand voice section should show
✓ Personas section should hide (no match)

6. Clear search
✓ Both sections should show all content
```

### Test 7: Multiple Projects
```
1. Create 3 projects with different brand voices/personas
2. Open MY PROJECTS
3. Expand Project A
✓ Shows Project A's brand voice and personas
4. Collapse Project A, expand Project B
✓ Shows Project B's brand voice and personas
✓ Content changes appropriately
```

### Test 8: Collapsible Sections
```
1. Open MY PROJECTS
2. Expand a project with brand voice/personas
3. Click Brand Voice section header
✓ Section collapses (chevron points right)
4. Click again
✓ Section expands (chevron points down)
5. Repeat for Personas section
✓ Works independently
```

### Test 9: Visual Consistency
```
1. Open MY PROJECTS
2. Expand a project
3. Compare styling of:
   - Documents
   - Snippets
   - Brand Voice
   - Personas
✓ Consistent padding and spacing
✓ Consistent hover states
✓ Consistent typography
✓ Proper indentation hierarchy
✓ Proper border colors (blue/purple accents)
```

### Test 10: Integration with BRAND & AUDIENCE
```
1. Open MY PROJECTS → Expand project → Click brand voice
✓ Opens Brand Voice panel
2. Edit brand voice, save
3. Close panel
4. Open MY PROJECTS again
✓ Brand voice section shows updated name/tone

5. Open MY PROJECTS → Expand project → Click persona
✓ Opens Personas panel
6. Add a new persona
7. Close panel
8. Open MY PROJECTS again
✓ Personas section shows new persona in list
```

## Technical Details

### Props Structure

**BrandVoiceSection:**
```tsx
interface BrandVoiceSectionProps {
  project: Project;          // Full project object
  isExpanded: boolean;        // Whether parent project is expanded
  searchQuery?: string;       // Optional search filter
}
```

**PersonaSection:**
```tsx
interface PersonaSectionProps {
  project: Project;          // Full project object
  isExpanded: boolean;        // Whether parent project is expanded
  searchQuery?: string;       // Optional search filter
}
```

### State Management
- Uses existing Zustand store for project data
- Uses `useSlideOutActions()` hook to open panels
- No new state management required
- Reads data directly from project object

### Performance
- Only renders when project is expanded (`isExpanded` check)
- Search filtering uses `useMemo` for optimization
- No unnecessary re-renders
- Lightweight components

## Future Enhancements

### Potential Improvements
1. **Quick Edit Actions:**
   - Add edit/delete buttons on hover (like Documents)
   - Allow inline editing without opening panel

2. **Drag & Drop:**
   - Drag personas between projects
   - Drag brand voice to assign to different project

3. **Context Menu:**
   - Right-click for quick actions
   - "Duplicate to another project"
   - "Remove from project"

4. **Visual Preview:**
   - Show brand voice color scheme
   - Show persona photo thumbnails inline

5. **Stats:**
   - Show usage count for brand voices
   - Show last modified date
   - Show "Active" status

6. **Batch Operations:**
   - Select multiple personas to delete
   - Copy all personas to another project

## Summary

✅ **Created:** 2 new section components  
✅ **Modified:** 1 existing component  
✅ **Added:** Brand Voices section to project hierarchy  
✅ **Added:** Personas section to project hierarchy  
✅ **Integrated:** With existing slide-out panels  
✅ **Styled:** Consistent with existing design  
✅ **Tested:** Build passes with no errors  

The feature is **production-ready** and provides users with easy access to brand voices and personas directly from the project tree.
