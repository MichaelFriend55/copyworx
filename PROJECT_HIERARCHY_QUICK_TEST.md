# Project Hierarchy Quick Test Guide

## 🎯 Feature: Brand Voices & Personas in MY PROJECTS

Quick reference for testing the new hierarchy sections.

## ⚡ Quick Visual Test (1 minute)

### Setup:
1. Create a test project
2. Add a brand voice (any name, e.g., "Test Brand")
3. Add 2-3 personas

### Verify:
```
1. Open MY PROJECTS panel
2. Expand your test project
3. Look for the new sections:

Expected hierarchy:
├─ 📄 Documents
├─ ✂️ Snippets
├─ 🔊 Brand Voice  ← NEW (should be blue)
└─ 👥 Personas     ← NEW (should be purple)

✓ Both sections visible?
✓ Brand Voice shows name and tone?
✓ Personas shows all personas?
✓ Correct colors (blue/purple)?
```

## 🔍 Detailed Test Suite

### Test 1: Brand Voice Section (30 sec)
```
1. Expand project with brand voice
2. Find "Brand Voice" section (blue, after Snippets)
3. Click on the brand voice name

✓ Brand Voice slide-out opens?
✓ Shows correct brand details?
✓ Can edit and save?
```

### Test 2: Personas Section (30 sec)
```
1. Expand project with personas
2. Find "Personas" section (purple, after Brand Voice)
3. Click on any persona name

✓ Personas slide-out opens?
✓ Shows list of all personas?
✓ Can edit and save?
```

### Test 3: Empty States (20 sec)
```
1. Create new project (no brand voice/personas)
2. Expand project

✓ Brand Voice shows "No brand voice set"?
✓ Personas shows "No personas yet"?
✓ Call-to-action buttons work?
```

### Test 4: Search Filter (30 sec)
```
1. Expand project
2. Type persona name in search
✓ Only matching personas show?

3. Type brand name in search
✓ Brand voice shows/hides correctly?

4. Clear search
✓ Everything visible again?
```

### Test 5: Collapsible Sections (15 sec)
```
1. Expand project
2. Click "Brand Voice" header
✓ Collapses?

3. Click "Personas" header
✓ Collapses independently?
```

## 🐛 Common Issues to Check

### Issue 1: Sections Not Showing
```
Problem: Don't see Brand Voice or Personas sections
Check:
- Is project expanded?
- Scroll down (sections are below Snippets)
- Does project actually have brand voice/personas?
```

### Issue 2: Click Not Working
```
Problem: Clicking brand voice/persona doesn't open panel
Check:
- Browser console for errors
- Try clicking directly on the name
- Refresh the page
```

### Issue 3: Wrong Brand Voice Shows
```
Problem: Shows brand voice from different project
Check:
- Which project is expanded?
- Brand voice should match that project
- Try collapsing and re-expanding
```

### Issue 4: Styling Looks Wrong
```
Problem: Colors or spacing incorrect
Check:
- Brand Voice should be blue theme
- Personas should be purple theme
- Should match Snippets section styling
```

## ✅ Acceptance Criteria

All must pass:
- [ ] Brand Voice section visible when project expanded
- [ ] Personas section visible when project expanded
- [ ] Sections appear AFTER Snippets section
- [ ] Brand Voice uses blue color scheme
- [ ] Personas uses purple color scheme
- [ ] Clicking brand voice opens Brand Voice panel
- [ ] Clicking persona opens Personas panel
- [ ] Empty states show call-to-action buttons
- [ ] Search filtering works correctly
- [ ] Sections are collapsible
- [ ] Styling matches existing sections
- [ ] No console errors
- [ ] Build succeeds

## 📊 Visual Reference

### Expected Structure:
```
MY PROJECTS
└─ 📁 Project Name (expanded)
    │
    ├─ Documents Section
    │  └─ 📄 Document 1
    │  └─ 📄 Document 2
    │
    ├─ ✂️ Snippets (purple)
    │  └─ Snippet 1
    │  └─ Snippet 2
    │
    ├─ 🔊 Brand Voice (blue) ← NEW
    │  └─ Acme Corp [Current]
    │     Professional, friendly...
    │
    └─ 👥 Personas (purple) ← NEW
       └─ Sarah, the Founder
          Age 28-35, Tech-savvy...
       └─ John, the Manager
          Age 35-45, Decision maker...
```

### Color Coding:
- **Documents**: Gray/Blue
- **Snippets**: Purple (`#7C3AED` / purple-600)
- **Brand Voice**: Blue (`#006EE6` / blue-600) ← NEW
- **Personas**: Purple (`#7C3AED` / purple-600) ← NEW

## 🎨 Styling Checklist

### Brand Voice Section:
- [ ] Blue left border (2px)
- [ ] Volume2 icon (🔊) in blue
- [ ] "Brand Voice" text in blue-900
- [ ] Count badge in blue-100/blue-500
- [ ] Hover state: blue-50 background
- [ ] "Current" badge: blue-600 bg, white text

### Personas Section:
- [ ] Purple left border (2px)
- [ ] Users icon (👥) in purple
- [ ] "Personas" text in purple-900
- [ ] Count badge in purple-100/purple-500
- [ ] Hover state: purple-50 background
- [ ] Photo thumbnails (if available)

## 🚀 Quick Debug Commands

```bash
# Rebuild if needed
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Check component files
ls -la components/workspace/BrandVoiceSection.tsx
ls -la components/workspace/PersonaSection.tsx
```

## 📝 Test Results Template

Copy and fill out:

```
Date: _________
Tester: _________

✓/✗ Brand Voice section visible
✓/✗ Personas section visible
✓/✗ Correct order (after Snippets)
✓/✗ Brand Voice opens panel
✓/✗ Personas opens panel
✓/✗ Empty states work
✓/✗ Search filtering works
✓/✗ Collapsible sections work
✓/✗ Styling matches design
✓/✗ No console errors

Notes:
_______________________________
_______________________________
```

## 🎯 Success Criteria

### Minimum Viable:
- ✅ Sections display correctly
- ✅ Navigation works (opens panels)
- ✅ No errors or crashes

### Full Success:
- ✅ All visual styling matches
- ✅ Search integration works
- ✅ Empty states are helpful
- ✅ Collapsible functionality works
- ✅ Consistent with existing design
- ✅ Performance is good

## 💡 Tips

1. **Test with real data**: Create projects with actual brand voices and personas
2. **Test edge cases**: Empty projects, single persona, long names
3. **Test interactions**: Click, hover, search, collapse
4. **Test on different screens**: Desktop, laptop (responsive)
5. **Test workflow**: Complete user journey from MY PROJECTS → Edit → Back
