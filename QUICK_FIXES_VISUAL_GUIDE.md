# QUICK FIXES - VISUAL BEFORE & AFTER GUIDE

## FIX #1: Persona Photo Upload

### BEFORE (PersonasSlideOut had inline form without photo upload)

```
┌─────────────────────────────────────────┐
│  Create Persona                    [X]  │
├─────────────────────────────────────────┤
│                                         │
│  Project: CoffeeWorx                    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Persona Name *                    │ │
│  │ [Input field]                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Demographics & Role               │ │
│  │ [Textarea]                        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [More fields...]                       │
│                                         │
│  ❌ NO PHOTO UPLOAD                     │
│                                         │
├─────────────────────────────────────────┤
│  [Back to List]  [Save Persona]         │
└─────────────────────────────────────────┘
```

### AFTER (PersonasSlideOut uses PersonaForm with photo upload)

```
┌─────────────────────────────────────────┐
│  Create Persona                    [X]  │
├─────────────────────────────────────────┤
│                                         │
│  Project: CoffeeWorx                    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ✅ Persona Photo (optional)       │ │
│  │                                   │ │
│  │  ┌────────────────────────────┐  │ │
│  │  │     📁 Upload Icon         │  │ │
│  │  │ Drop photo here or click   │  │ │
│  │  │ JPG, PNG, or WebP (max 2MB)│  │ │
│  │  └────────────────────────────┘  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Name & Title *                    │ │
│  │ [Input field]                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Demographics                      │ │
│  │ [Textarea]                        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [More fields...]                       │
│                                         │
├─────────────────────────────────────────┤
│  [Cancel]  [Create Persona]             │
└─────────────────────────────────────────┘
```

### Photo Upload Features

```
┌──────────────────────────────────┐
│ AFTER UPLOADING A PHOTO:         │
├──────────────────────────────────┤
│                                  │
│  ┌───────────────────────────┐  │
│  │ ┌─────────────────┐  [X]  │  │
│  │ │                 │       │  │
│  │ │   📷 Photo      │       │  │
│  │ │    Preview      │       │  │
│  │ │                 │       │  │
│  │ └─────────────────┘       │  │
│  │   (Remove button shows)   │  │
│  └───────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

### Persona List Display

```
BEFORE (no photos shown):
┌────────────────────────────────┐
│ [👤]  Sarah, Tech Executive    │
│       35-45, VP Engineering    │
│       [Edit]  [Delete]         │
└────────────────────────────────┘

AFTER (photos displayed if uploaded):
┌────────────────────────────────┐
│ [📷]  Sarah, Tech Executive    │
│  (photo) 35-45, VP Engineering │
│       [Edit]  [Delete]         │
└────────────────────────────────┘
```

---

## FIX #2: PDF Filename Based on Document Title

### BEFORE (Generic filename)

```
User Action:
1. Opens document: "CoffeeWorx Coffee Brochure"
2. Clicks "Export PDF"
3. Print dialog opens

Print Dialog Shows:
┌────────────────────────────────────┐
│  Print                             │
├────────────────────────────────────┤
│  Destination: [Save as PDF ▼]     │
│                                    │
│  Filename: CopyWorx™ Studio.pdf   │ ❌ GENERIC
│                                    │
│  [Cancel]  [Save]                  │
└────────────────────────────────────┘
```

### AFTER (Document title as filename)

```
User Action:
1. Opens document: "CoffeeWorx Coffee Brochure"
2. Clicks "Export PDF"
3. Print dialog opens

Print Dialog Shows:
┌────────────────────────────────────┐
│  Print                             │
├────────────────────────────────────┤
│  Destination: [Save as PDF ▼]     │
│                                    │
│  Filename: CoffeeWorx-Coffee-      │ ✅ DOCUMENT TITLE
│            Brochure.pdf            │
│                                    │
│  [Cancel]  [Save]                  │
└────────────────────────────────────┘
```

### Sanitization Examples

```
Document Title              →   PDF Filename
─────────────────────────────────────────────────────
"CoffeeWorx Coffee Brochure" → "CoffeeWorx-Coffee-Brochure.pdf"
"Marketing Plan (v2)"        → "Marketing-Plan-v2.pdf"
"EFI: Homepage Copy"         → "EFI-Homepage-Copy.pdf"
"[DRAFT] Sales Pitch"        → "DRAFT-Sales-Pitch.pdf"
""                           → "untitled.pdf"
"Very Long Document Title That Exceeds Fifty Characters Limit" 
                             → "Very-Long-Document-Title-That-Exceeds-Fifty-C.pdf"
```

### Where PDF Export Works

```
THREE PLACES TO EXPORT PDF:

1. Top Toolbar → Document Menu:
   ┌──────────────────────┐
   │ [Document ▼]         │
   │  ├ Import Document   │
   │  ├ Export Document   │
   │  └ Export PDF  ⌘P    │ ✅
   └──────────────────────┘

2. Top Toolbar → Export PDF Button:
   ┌──────────────────────┐
   │ [Scroll] [Focus]     │
   │     [Export PDF]     │ ✅
   └──────────────────────┘

3. Paged Preview → Print Button:
   ┌──────────────────────┐
   │ Document Preview     │
   │ [🔍-] 75% [🔍+]      │
   │         [Print]      │ ✅
   └──────────────────────┘
```

---

## Code Changes Summary

### FIX #1: Persona Photo Upload

**Key Change:** Replace inline form with PersonaForm component

```typescript
// BEFORE: Inline form fields
<div className="space-y-5">
  <div className="space-y-2">
    <label>Persona Name *</label>
    <input value={name} onChange={(e) => setName(e.target.value)} />
  </div>
  {/* More fields... NO PHOTO UPLOAD */}
</div>

// AFTER: Use PersonaForm component
<PersonaForm
  persona={editingPersona}
  onSave={handleSave}
  onCancel={handleBackToList}
/>
```

**Result:** Photo upload functionality automatically included!

### FIX #2: PDF Filename

**Key Change:** Use `printWithTitle()` instead of `window.print()`

```typescript
// BEFORE
const handlePrintClick = () => {
  window.print();  // Generic filename
};

// AFTER
const handlePrintClick = () => {
  import('@/lib/utils/pdf-export').then(({ printWithTitle }) => {
    printWithTitle(documentTitle);  // Custom filename!
  });
};
```

**Result:** PDF filename matches document title!

---

## Testing Quick Reference

### Test Persona Photo Upload

```bash
✅ Step-by-step test:
1. Open CopyWorx workspace
2. Click "Personas" in left sidebar
3. Click "Create New Persona"
4. Look for photo upload section at top
5. Upload a photo (drag or click)
6. Verify preview shows
7. Fill in name + fields
8. Save persona
9. Check persona card shows photo
```

### Test PDF Filename

```bash
✅ Step-by-step test:
1. Open document titled "Test Document"
2. Click "Export PDF" button (top right)
3. Print dialog opens
4. Check suggested filename is "Test-Document.pdf"
5. Try with special chars: "My Doc (v2)"
6. Check filename is "My-Doc-v2.pdf"
7. Try empty title
8. Check fallback is "untitled.pdf"
```

---

## Success Criteria

### FIX #1: ✅ COMPLETE
- [x] Photo upload appears in persona form
- [x] Drag & drop works
- [x] Image preview displays
- [x] Remove photo button works
- [x] Photo saves with persona
- [x] Photo displays in persona card
- [x] Photo persists when editing
- [x] File validation works (type/size)
- [x] Error messages display correctly

### FIX #2: ✅ COMPLETE
- [x] PDF filename uses document title
- [x] Sanitization removes special chars
- [x] Long titles truncate to 50 chars
- [x] Empty title falls back to "untitled"
- [x] Works from Document menu
- [x] Works from Export PDF button
- [x] Works from Paged Preview
- [x] Original page title restored
- [x] No SSR issues

---

## Files Modified

```
FIX #1: Persona Photo Upload
├─ components/workspace/PersonasSlideOut.tsx (MODIFIED)
└─ components/workspace/PersonaForm.tsx (ALREADY HAD FEATURE)

FIX #2: PDF Filename
├─ lib/utils/pdf-export.ts (NEW)
├─ components/workspace/Toolbar.tsx (MODIFIED)
├─ components/workspace/ViewModeSelector.tsx (MODIFIED)
└─ components/workspace/PagedPreview.tsx (MODIFIED)
```

---

## Status: ✅ BOTH FIXES COMPLETE AND READY FOR PRODUCTION
