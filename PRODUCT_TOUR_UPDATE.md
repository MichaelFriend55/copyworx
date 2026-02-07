# Product Tour Update - 9 Steps

## Summary
Updated the onboarding product tour from 7 steps to 9 steps with new content for My Insights and Snippets sections, plus revised final step messaging.

**Date**: January 31, 2026  
**Files Modified**: 3

---

## ✅ What Changed

### 1. ProductTour.tsx - Updated Tour Steps
**File**: `components/ProductTour.tsx`

**Tour Structure** (10 total screens including welcome):

#### Welcome Screen (unchanged)
- **Target**: Body (center placement)
- **Headline**: "Welcome to CopyWorx Studio™!"
- **Content**: Quick 60-second tour introduction

#### Step 1: My Projects (unchanged)
- **Target**: `[data-tour="projects"]`
- **Headline**: "My Projects"
- **Content**: "Organize your work by project, client or campaign. Keep everything structured and easy to find."
- **Placement**: Right

#### Step 2: Brand Voice & Personas (unchanged)
- **Target**: `[data-tour="brand-voice"]`
- **Headline**: "Brand Voice & Personas"
- **Content**: Strategic foundation message with pro tip
- **Placement**: Right

#### Step 3: AI@Worx Templates (unchanged)
- **Target**: `[data-tour="templates"]`
- **Headline**: "AI@Worx Templates"
- **Content**: "Professional copywriting templates across 6 categories. Generate strategic copy in minutes, not hours."
- **Placement**: Right

#### Step 4: Copy Optimizer Suite (unchanged)
- **Target**: `[data-tour="copy-optimizer"]`
- **Headline**: "Copy Optimizer Suite"
- **Bullets**:
  - Tone Shifter (6 professional tones)
  - Expand or Shorten
  - Rewrite for Channel (email, social, ads)
- **Placement**: Right

#### Step 5: My Insights (NEW)
- **Target**: `[data-tour="insights"]`
- **Headline**: "My Insights"
- **Sub-headline**: "Write smarter with AI-powered insights:"
- **Bullets**:
  - Alignment scores
  - Copy strengths
  - Areas to improve
  - Recommendations
- **Placement**: Right

#### Step 6: Snippets (NEW)
- **Target**: `[data-tour="snippets"]`
- **Headline**: "Snippets"
- **Sub-headline**: "Save and reuse copy easily:"
- **Bullets**:
  - Taglines
  - CTAs
  - Copyright info
  - Boilerplate
- **Placement**: Right

#### Step 7: Your Writing Canvas (unchanged)
- **Target**: `[data-tour="editor"]`
- **Headline**: "Your Writing Canvas"
- **Content**: "Clean, distraction-free editor with professional formatting tools. This is where the magic happens."
- **Placement**: Center

#### Step 8: AI@Worx Toolbox (unchanged)
- **Target**: `[data-tour="toolbox"]`
- **Headline**: "AI@Worx Toolbox"
- **Content**: "Your AI assistant panel. It dynamically changes based on which tool you select."
- **Placement**: Left

#### Step 9: Final Message (UPDATED)
- **Target**: Body (center placement)
- **Headline**: "You're Ready to Write to Win!" (changed from "You're Ready to Rock!")
- **Body**: "Start by setting up your Brand Voice and Personas, or jump straight into a template."
- **CTA**: "Now get to work with CopyWorx Studio™" (styled in blue - changed from "NOW GET TO WORX with CopyWorx Studio™!")

---

### 2. LeftSidebarContent.tsx - Added Data-Tour Attribute
**File**: `components/workspace/LeftSidebarContent.tsx`

**Change**: Added `data-tour="insights"` to My Insights section

**Location**: Line 492

**Before**:
```tsx
{/* MY INSIGHTS SECTION - Dedicated buttons for alignment checks */}
<div className="space-y-1">
  {/* Section Header */}
  <button ...>
```

**After**:
```tsx
{/* MY INSIGHTS SECTION - Dedicated buttons for alignment checks */}
<div className="space-y-1" data-tour="insights">
  {/* Section Header */}
  <button ...>
```

---

### 3. MyProjectsSlideOut.tsx - Added Data-Tour Attribute
**File**: `components/workspace/MyProjectsSlideOut.tsx`

**Change**: Wrapped SnippetSection with div containing `data-tour="snippets"`

**Location**: Line 829-837

**Before**:
```tsx
{/* Snippets section */}
<SnippetSection
  projectId={project.id}
  isExpanded={isExpanded}
  searchQuery={searchQuery}
  onSnippetClick={onSnippetClick}
  onAddSnippet={onAddSnippet}
  onEditSnippet={onEditSnippet}
/>
```

**After**:
```tsx
{/* Snippets section */}
<div data-tour="snippets">
  <SnippetSection
    projectId={project.id}
    isExpanded={isExpanded}
    searchQuery={searchQuery}
    onSnippetClick={onSnippetClick}
    onAddSnippet={onAddSnippet}
    onEditSnippet={onEditSnippet}
  />
</div>
```

---

## 🎯 Tour Flow Visualization

```
┌─────────────────────────────────────────┐
│  WELCOME: CopyWorx Studio™             │
│  (Center, body target)                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 1: My Projects                    │
│  (Left sidebar, right placement)        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 2: Brand Voice & Personas         │
│  (Left sidebar, right placement)        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 3: AI@Worx Templates              │
│  (Left sidebar, right placement)        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 4: Copy Optimizer Suite           │
│  (Left sidebar, right placement)        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 5: My Insights ⭐ NEW             │
│  (Left sidebar, right placement)        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 6: Snippets ⭐ NEW                │
│  (My Projects slide-out, right)         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 7: Your Writing Canvas            │
│  (Center editor, center placement)      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 8: AI@Worx Toolbox                │
│  (Right sidebar, left placement)        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STEP 9: You're Ready to Write to Win!  │
│  (Center, body target) ⭐ UPDATED       │
└─────────────────────────────────────────┘
```

---

## 🧪 How to Test the Tour

### Test 1: Start Tour from Fresh State
1. Open browser in incognito/private mode
2. Navigate to `/worxspace`
3. Tour should start automatically on first visit
4. **Verify**: Welcome screen appears centered
5. Click "Next" to proceed through all 9 steps
6. **Verify**: Each step highlights the correct UI element
7. **Verify**: Step 5 (My Insights) highlights the My Insights section in left sidebar
8. **Verify**: Step 6 (Snippets) requires My Projects to be open to show snippets
9. **Verify**: Final step shows "You're Ready to Write to Win!" headline
10. **Verify**: Final CTA is "Now get to work with CopyWorx Studio™" in blue
11. Click "Finish"
12. **Verify**: Tour closes and localStorage flag is set

### Test 2: Restart Tour Using Help Button
1. After completing tour once, click the **Product Tour button** (?) in top-right toolbar
2. **Verify**: Tour starts from beginning (Welcome screen)
3. Navigate through all 9 steps again
4. **Verify**: All steps work correctly on restart

### Test 3: Skip Tour
1. Start tour (incognito mode or clear localStorage)
2. On any step, click "Skip Tour" button
3. **Verify**: Tour closes immediately
4. **Verify**: localStorage flag is set to prevent auto-start
5. **Verify**: Can manually restart with (?) button

### Test 4: Step-by-Step Verification
**Step 1 - My Projects**:
- [ ] Highlights the "My Projects" section in left sidebar
- [ ] Tooltip appears on the right side
- [ ] Content matches: "Organize your work by project, client or campaign..."

**Step 2 - Brand Voice & Personas**:
- [ ] Highlights the "My Brand & Audience" section
- [ ] Shows pro tip: "Spend 10 minutes here before writing anything!"
- [ ] Tooltip on right side

**Step 3 - AI@Worx Templates**:
- [ ] Highlights the "AI@Worx Templates" button
- [ ] Content: "Professional copywriting templates across 6 categories..."
- [ ] Tooltip on right side

**Step 4 - Copy Optimizer Suite**:
- [ ] Highlights the "My Copy Optimizer" section
- [ ] Shows 3 bullet points (Tone Shifter, Expand/Shorten, Rewrite Channel)
- [ ] Tooltip on right side

**Step 5 - My Insights** (NEW):
- [ ] Highlights the "My Insights" section in left sidebar
- [ ] Shows headline: "My Insights"
- [ ] Shows sub-headline: "Write smarter with AI-powered insights:"
- [ ] Shows 4 bullets: Alignment scores, Copy strengths, Areas to improve, Recommendations
- [ ] Tooltip on right side

**Step 6 - Snippets** (NEW):
- [ ] Highlights the Snippets section (inside My Projects slide-out)
- [ ] **Note**: My Projects slide-out must be open for this to work
- [ ] Shows headline: "Snippets"
- [ ] Shows sub-headline: "Save and reuse copy easily:"
- [ ] Shows 4 bullets: Taglines, CTAs, Copyright info, Boilerplate
- [ ] Tooltip on right side

**Step 7 - Your Writing Canvas**:
- [ ] Highlights the center editor area
- [ ] Content: "Clean, distraction-free editor..."
- [ ] Tooltip centered

**Step 8 - AI@Worx Toolbox**:
- [ ] Highlights the right sidebar
- [ ] Content: "Your AI assistant panel..."
- [ ] Tooltip on left side

**Step 9 - Final Message** (UPDATED):
- [ ] Centered on screen (body target)
- [ ] Headline: "You're Ready to Write to Win!" (purple color #7A3991)
- [ ] Body text unchanged
- [ ] CTA: "Now get to work with CopyWorx Studio™" in blue (#006EE6)
- [ ] Button says "Finish" instead of "Next"

### Test 5: Responsive Behavior
1. Test tour on different screen sizes:
   - Desktop (1920px+)
   - Laptop (1366px)
   - Tablet (768px)
   - Mobile (not supported, but tour should gracefully handle)
2. **Verify**: Tooltips adjust position automatically
3. **Verify**: All steps remain visible and clickable

### Test 6: Navigation Controls
1. Start tour
2. Click "Next" to advance
3. Click "Back" to go to previous step
4. **Verify**: Step counter shows correct position (e.g., "3 of 9")
5. Press ESC key
6. **Verify**: Tour closes immediately

### Test 7: Edge Cases
**Case 1: Snippets Step Without Open Slide-Out**
- If My Projects slide-out is closed when tour reaches Step 6
- **Expected**: Tour may not highlight correctly
- **Solution**: Ensure My Projects is expanded before tour starts, or tour logic opens it

**Case 2: Collapsed Sections**
- If My Insights or Copy Optimizer sections are collapsed
- **Expected**: Tour should still highlight the section header
- **Verify**: User can see which section is being highlighted

**Case 3: Multiple Tour Instances**
- Start tour
- Refresh page mid-tour
- **Expected**: Tour doesn't auto-start (localStorage flag set)
- **Verify**: Can manually restart with (?) button

---

## 📊 Before & After Comparison

### Tour Length
- **Before**: 7 steps (+ 1 welcome screen) = 8 total screens
- **After**: 9 steps (+ 1 welcome screen) = 10 total screens

### New Steps
1. **Step 5: My Insights** (NEW)
   - Explains AI-powered alignment checks
   - 4 key benefits listed
   
2. **Step 6: Snippets** (NEW)
   - Explains reusable copy management
   - 4 common use cases listed

### Updated Steps
1. **Step 9: Final Message** (UPDATED)
   - Headline: "You're Ready to Rock!" → "You're Ready to Write to Win!"
   - CTA: "NOW GET TO WORX with CopyWorx Studio™!" → "Now get to work with CopyWorx Studio™"
   - Styling: CTA now in blue (#006EE6)

---

## 🎨 Styling Details

### Color Scheme (unchanged)
- **Primary Blue**: `#006EE6` - Used for headlines and CTA
- **Purple**: `#7A3991` - Used for final step headline
- **Text**: `#333` - Body text
- **Background**: White with semi-transparent overlay

### Typography
- **Headline (Welcome/Final)**: 2xl, bold
- **Step Headlines**: xl, bold
- **Body Text**: base (16px)
- **Bullets**: sm (14px)

### Tooltip Positioning
- **Left Sidebar Steps** (1-6): Right placement
- **Center Steps** (Welcome, 7, Final): Center placement
- **Right Sidebar Step** (8): Left placement

---

## 🔧 Technical Implementation

### React Joyride Props
```tsx
<Joyride
  steps={tourSteps}
  run={run}
  continuous
  showProgress        // Shows "3 of 9"
  showSkipButton      // Shows "Skip Tour"
  stepIndex={stepIndex}
  callback={handleJoyrideCallback}
  styles={tourStyles}
  locale={tourLocale}
  scrollToFirstStep
  disableOverlayClose // Must click buttons to navigate
  spotlightClicks     // Allow interaction with highlighted elements
/>
```

### Data-Tour Attributes
All tour targets use `data-tour` attributes:
- `[data-tour="projects"]` - My Projects section
- `[data-tour="brand-voice"]` - Brand Voice & Personas section
- `[data-tour="templates"]` - AI@Worx Templates button
- `[data-tour="copy-optimizer"]` - Copy Optimizer section
- `[data-tour="insights"]` - My Insights section ⭐ NEW
- `[data-tour="snippets"]` - Snippets section ⭐ NEW
- `[data-tour="editor"]` - Editor canvas
- `[data-tour="toolbox"]` - Right sidebar toolbox

### LocalStorage Flag
- **Key**: `copyworx_tour_completed`
- **Value**: `'true'`
- **Purpose**: Prevents auto-start on subsequent visits
- **Reset**: Clear localStorage or use incognito mode to restart

---

## 🐛 Known Issues / Considerations

### Issue 1: Snippets Visibility
**Problem**: Step 6 (Snippets) targets a section inside the My Projects slide-out panel, which may be closed.

**Solutions**:
1. Add logic to automatically open My Projects slide-out when tour reaches Step 6
2. Add instruction text: "Click My Projects to see Snippets" in Step 5
3. Skip Snippets step if slide-out is closed (graceful degradation)

**Current Status**: Manual workaround - user must open My Projects panel before or during tour.

### Issue 2: My Insights Collapsed
**Problem**: If My Insights section is collapsed, the tour still highlights it but content isn't visible.

**Solution**: Tour highlights the section header, which is still useful. User can expand to see tools.

**Current Status**: Working as intended - no fix needed.

### Issue 3: Tour Persistence
**Problem**: Tour doesn't remember progress if user refreshes mid-tour.

**Solution**: This is intentional. Tours are meant to be completed in one session. User can restart with (?) button.

**Current Status**: Working as intended - no fix needed.

---

## ✅ Testing Checklist

### Functionality
- [ ] Tour auto-starts on first visit (incognito mode)
- [ ] All 9 steps display in correct order
- [ ] Welcome screen appears first
- [ ] Step 5 (My Insights) highlights correctly
- [ ] Step 6 (Snippets) highlights correctly (when visible)
- [ ] Step 9 shows updated headline and CTA
- [ ] "Next" button advances to next step
- [ ] "Back" button goes to previous step
- [ ] "Skip Tour" button closes tour immediately
- [ ] "Finish" button appears on final step
- [ ] Progress counter shows "X of 9"
- [ ] ESC key closes tour
- [ ] Tour doesn't auto-start on second visit
- [ ] (?) button in toolbar restarts tour

### Visual
- [ ] Tooltips appear with correct placement
- [ ] Blue spotlight highlights target elements
- [ ] Overlay darkens background
- [ ] Tooltips have proper spacing and padding
- [ ] Text is readable and properly formatted
- [ ] Bullet lists are properly aligned
- [ ] Final CTA is styled in blue
- [ ] Buttons are properly styled

### Responsive
- [ ] Tour works on desktop (1920px)
- [ ] Tour works on laptop (1366px)
- [ ] Tour works on tablet (768px)
- [ ] Tooltips adjust position automatically
- [ ] Content doesn't overflow tooltip

### Edge Cases
- [ ] Tour works with collapsed sections
- [ ] Tour works with closed slide-outs
- [ ] Tour works after page refresh
- [ ] Multiple restarts work correctly
- [ ] LocalStorage flag is set correctly

---

## 📝 Summary

### Changes Made
1. ✅ Updated ProductTour.tsx with 9-step structure
2. ✅ Added Step 5: My Insights (NEW)
3. ✅ Added Step 6: Snippets (NEW)
4. ✅ Updated Step 9 final message (headline + CTA)
5. ✅ Added `data-tour="insights"` to LeftSidebarContent.tsx
6. ✅ Added `data-tour="snippets"` to MyProjectsSlideOut.tsx
7. ✅ No TypeScript or linting errors

### Testing Status
- ⏳ Pending manual testing
- ⏳ Pending visual verification
- ⏳ Pending edge case testing

### Next Steps
1. Test tour in browser (incognito mode)
2. Verify all 9 steps display correctly
3. Check snippet step visibility (may need to auto-open My Projects)
4. Verify final step styling (blue CTA)
5. Test on different screen sizes
6. Test restart functionality

---

## Commit Message
```
feat: update product tour to 9 steps with insights and snippets

Added two new tour steps:
- Step 5: My Insights - AI-powered alignment checks
- Step 6: Snippets - Reusable copy management

Updated final step (Step 9):
- Headline: "You're Ready to Write to Win!"
- CTA: "Now get to work with CopyWorx Studio™" (blue styling)

Added data-tour attributes:
- data-tour="insights" to My Insights section
- data-tour="snippets" to Snippets section in My Projects

Tour now has 9 steps (+ welcome screen) for comprehensive onboarding.
```
