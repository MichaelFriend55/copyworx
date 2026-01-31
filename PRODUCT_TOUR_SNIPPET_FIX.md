# Product Tour - Snippet Icon Target Fix

## Summary
Updated the Snippets tour step (Step 6) to target the scissors icon in the menu bar toolbar instead of the snippets section in the My Projects slide-out.

**Date**: January 31, 2026  
**Files Modified**: 4

---

## ✅ What Changed

### Issue
The original Snippets tour step targeted `[data-tour="snippets"]` which was located inside the My Projects slide-out panel. This had several problems:
1. The slide-out panel needed to be open for the tour step to work
2. The highlight wasn't visible if the panel was closed
3. It was confusing to target a nested section that might not be visible

### Solution
Changed the tour step to target the **scissors icon (SaveAsSnippetButton)** in the top menu bar toolbar instead. This is:
- ✅ Always visible (in the center toolbar)
- ✅ Directly clickable and actionable
- ✅ More intuitive for users to understand where to save snippets
- ✅ No dependency on other UI states (slide-outs, panels, etc.)

---

## 📝 Files Modified

### 1. SaveAsSnippetButton.tsx - Added data-tour prop support
**File**: `components/workspace/SaveAsSnippetButton.tsx`

**Changes**:
1. Added `dataTour?: string` to component props
2. Added `data-tour` attribute to button element

**Before**:
```tsx
interface SaveAsSnippetButtonProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'toolbar';
}

export function SaveAsSnippetButton({
  className,
  showLabel = false,
  variant = 'default',
}: SaveAsSnippetButtonProps) {
  // ...
  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
      className={cn(buttonStyles, className)}
    >
      <Scissors ... />
    </button>
  );
}
```

**After**:
```tsx
interface SaveAsSnippetButtonProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'toolbar';
  dataTour?: string; // NEW
}

export function SaveAsSnippetButton({
  className,
  showLabel = false,
  variant = 'default',
  dataTour, // NEW
}: SaveAsSnippetButtonProps) {
  // ...
  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
      className={cn(buttonStyles, className)}
      data-tour={dataTour} // NEW
    >
      <Scissors ... />
    </button>
  );
}
```

---

### 2. Toolbar.tsx - Pass data-tour attribute
**File**: `components/workspace/Toolbar.tsx`

**Change**: Added `dataTour="snippets"` prop to SaveAsSnippetButton

**Line**: 1519

**Before**:
```tsx
{/* Save as Snippet */}
<SaveAsSnippetButton variant="toolbar" />
```

**After**:
```tsx
{/* Save as Snippet */}
<SaveAsSnippetButton variant="toolbar" dataTour="snippets" />
```

---

### 3. ProductTour.tsx - Changed tooltip placement
**File**: `components/ProductTour.tsx`

**Change**: Changed placement from `'right'` to `'bottom'` for Step 6

**Reason**: The scissors icon is in the top toolbar, so the tooltip should appear below it (not to the right)

**Before**:
```tsx
{
  target: '[data-tour="snippets"]',
  content: (
    <div>
      <h3 className="text-xl font-bold text-[#006EE6] mb-2">Snippets</h3>
      <p className="text-base mb-2">Save and reuse copy easily:</p>
      <ul className="text-sm list-disc list-inside space-y-1">
        <li>Taglines</li>
        <li>CTAs</li>
        <li>Copyright info</li>
        <li>Boilerplate</li>
      </ul>
    </div>
  ),
  placement: 'right', // ❌ OLD
  disableBeacon: true,
}
```

**After**:
```tsx
{
  target: '[data-tour="snippets"]',
  content: (
    <div>
      <h3 className="text-xl font-bold text-[#006EE6] mb-2">Snippets</h3>
      <p className="text-base mb-2">Save and reuse copy easily:</p>
      <ul className="text-sm list-disc list-inside space-y-1">
        <li>Taglines</li>
        <li>CTAs</li>
        <li>Copyright info</li>
        <li>Boilerplate</li>
      </ul>
    </div>
  ),
  placement: 'bottom', // ✅ NEW
  disableBeacon: true,
}
```

---

### 4. MyProjectsSlideOut.tsx - Removed data-tour wrapper
**File**: `components/workspace/MyProjectsSlideOut.tsx`

**Change**: Removed the `<div data-tour="snippets">` wrapper around SnippetSection

**Reason**: No longer targeting the snippets section in the slide-out

**Line**: 831-837

**Before**:
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

**After**:
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

---

## 📍 New Target Location

### Before Fix
```
Left Sidebar
   ↓
My Projects (click to open slide-out)
   ↓
My Projects Slide-Out Panel
   ↓
Scroll down to Snippets Section ❌ (nested, may not be visible)
```

### After Fix
```
Top Toolbar (Center Section)
   ↓
Scissors Icon (SaveAsSnippetButton) ✅ (always visible, directly actionable)
```

---

## 🎯 Visual Location

### Toolbar Layout (Center Section)
```
[Font] [Size] | [Style] | [Color] [Highlight] | [B] [I] [U] | [List] [•••] | [Link] [Clear] | [✂️ Snippets] ← TARGET
                                                                                                    ↑
                                                                                     Tour tooltip appears below
```

The scissors icon is located in the center section of the toolbar, after the formatting tools and before the right section (View Mode, Tour button).

---

## 🧪 How to Test

### Quick Test (2 minutes)
1. **Open incognito/private browser**
2. **Navigate to** `/worxspace`
3. **Tour starts automatically**
4. **Advance to Step 6** (Snippets)
5. **Verify**:
   - ✅ Tour highlights the **scissors icon** in the top toolbar
   - ✅ Tooltip appears **below** the scissors icon
   - ✅ Headline: "Snippets"
   - ✅ Content shows 4 bullets: Taglines, CTAs, Copyright info, Boilerplate
   - ✅ No dependency on My Projects slide-out being open

### Visual Verification
1. When tour reaches Step 6:
   - [ ] Blue spotlight circle surrounds scissors icon
   - [ ] Tooltip appears below the icon (not to the right)
   - [ ] Icon is in the center toolbar section
   - [ ] Tooltip is readable and not cut off

### Functional Verification
1. After tour Step 6:
   - [ ] User can clearly see where to click to save snippets
   - [ ] Scissors icon is always visible (no need to open panels)
   - [ ] Icon is clickable and functional

---

## 📊 Before & After Comparison

### Tour Step 6 - Target Location

**Before:**
```
Target: [data-tour="snippets"] inside My Projects slide-out
Placement: 'right'
Issues:
- ❌ Nested inside slide-out panel
- ❌ Not visible if panel is closed
- ❌ User needs to open My Projects first
- ❌ Confusing location
```

**After:**
```
Target: [data-tour="snippets"] on SaveAsSnippetButton in toolbar
Placement: 'bottom'
Benefits:
- ✅ Always visible in toolbar
- ✅ No dependencies on other UI states
- ✅ Clear, actionable target
- ✅ Intuitive location
```

---

## 🎨 Tooltip Positioning

### Placement Logic
- **Left Sidebar sections** (Projects, Brand Voice, Templates, Copy Optimizer, Insights): `placement: 'right'`
- **Center Editor**: `placement: 'center'`
- **Top Toolbar** (Snippets icon): `placement: 'bottom'` ✅ NEW
- **Right Sidebar** (Toolbox): `placement: 'left'`

The tooltip now appears **below** the scissors icon, which is appropriate for a toolbar element at the top of the screen.

---

## ✅ Testing Checklist

### Step 6 Verification
- [ ] Tour step 6 highlights scissors icon in toolbar
- [ ] Tooltip appears below the icon (not above or to the side)
- [ ] Tooltip content is correct:
  - [ ] Headline: "Snippets"
  - [ ] Sub-headline: "Save and reuse copy easily:"
  - [ ] 4 bullets listed correctly
- [ ] Blue spotlight circle is visible
- [ ] Tooltip is readable and not cut off
- [ ] No overlap with toolbar or other elements

### Integration Testing
- [ ] Tour works from start to finish (all 9 steps)
- [ ] Step 5 (My Insights) still works correctly
- [ ] Step 6 (Snippets) now targets scissors icon
- [ ] Step 7 (Editor) still works correctly
- [ ] Progress shows "6 of 9" on Step 6
- [ ] Can navigate back/forward through steps

### Edge Cases
- [ ] Works with different screen sizes (1920px, 1366px, 768px)
- [ ] Works if toolbar is scrolled horizontally
- [ ] Works if user has text selected (icon changes color but tour still works)
- [ ] Works in different view modes (Scroll, Focus)

---

## 🐛 Known Issues / Considerations

### Issue 1: Icon State Changes
**Observation**: The scissors icon changes color when text is selected (purple) vs. no selection (gray).

**Impact**: Tour still works correctly regardless of icon state. The spotlight highlights the entire button area.

**Status**: No issue - working as intended.

### Issue 2: Toolbar Horizontal Scroll
**Observation**: On very narrow screens (< 1400px), the toolbar may enable horizontal scroll.

**Impact**: If the scissors icon is scrolled out of view, the tour may not highlight it correctly.

**Solution**: Tour automatically scrolls to the target element (Joyride default behavior).

**Status**: Should work, but test on narrow screens to verify.

### Issue 3: Tooltip Position on Small Screens
**Observation**: On small screens, the tooltip may be close to the bottom of the viewport.

**Impact**: Tooltip should still be visible, but may be cramped.

**Solution**: Joyride automatically adjusts tooltip position to stay in viewport.

**Status**: Should work, but test on small screens to verify.

---

## 📝 Summary

### Changes Made
1. ✅ Added `dataTour` prop to SaveAsSnippetButton component
2. ✅ Passed `dataTour="snippets"` from Toolbar to SaveAsSnippetButton
3. ✅ Changed tour step placement from `'right'` to `'bottom'`
4. ✅ Removed data-tour wrapper from MyProjectsSlideOut
5. ✅ No TypeScript or linting errors

### Benefits
- 🎯 **More intuitive**: Scissors icon is always visible in toolbar
- 🚀 **No dependencies**: Doesn't require slide-outs to be open
- 📍 **Clear target**: Users know exactly where to click to save snippets
- 🎨 **Better UX**: Tooltip appears below icon (natural for toolbar)
- ✅ **Reliable**: No edge cases with panel visibility

### Testing Status
- ⏳ Pending manual testing
- ⏳ Pending visual verification on different screen sizes
- ⏳ Pending edge case testing

---

## 🎓 Usage Notes

### For Users
When the tour reaches Step 6:
1. Look at the **top toolbar** (center section)
2. Find the **scissors icon** (✂️)
3. This is where you **save selected text as snippets**
4. Select any text in the editor, then click the scissors icon
5. Snippets are saved per project and can be reused

### For Developers
To add data-tour attributes to other components:
1. Add optional `dataTour?: string` prop to component interface
2. Pass prop to the target element: `data-tour={dataTour}`
3. Update tour steps in ProductTour.tsx to target `[data-tour="your-id"]`
4. Choose appropriate placement: `'top'`, `'right'`, `'bottom'`, `'left'`, or `'center'`

---

## Commit Message
```
fix: update tour snippets step to target scissors icon in toolbar

Changed Step 6 of product tour to highlight the SaveAsSnippetButton
(scissors icon) in the top toolbar instead of the snippets section
in the My Projects slide-out.

Benefits:
- More intuitive: Icon always visible in toolbar
- No dependencies: Works regardless of slide-out state
- Better UX: Tooltip appears below icon (bottom placement)
- Clear action: Users know exactly where to save snippets

Files modified:
- SaveAsSnippetButton.tsx: Added dataTour prop support
- Toolbar.tsx: Pass dataTour="snippets" to button
- ProductTour.tsx: Changed placement from 'right' to 'bottom'
- MyProjectsSlideOut.tsx: Removed data-tour wrapper
```
