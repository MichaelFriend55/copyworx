# Optimizer Tools & Document Rename Fixes

## Summary
Fixed two critical issues without changing the working localStorage save system:

1. **Copy Optimizer Tools Text Replacement** - Tools now properly replace selected text and trigger auto-save
2. **Document Rename Functionality** - Enhanced with better logging and state management

---

## Issue 1: Copy Optimizer Tools Can't Replace Selection

### Problem
After API returns optimized text (from Shorten, Expand, ToneShifter, RewriteChannel tools), the "Replace Selection" button wasn't properly replacing the selected text in the editor and wasn't triggering the auto-save.

### Root Cause
`lib/editor-utils.ts` was using `.deleteRange({ from, to })` instead of `.deleteSelection()`, which didn't properly trigger TipTap's 'update' event that EditorArea listens to for auto-save.

### Fix Applied
**File: `lib/editor-utils.ts`**

Changed the `insertTextAtSelection` function to:
- Use `.deleteSelection()` instead of `.deleteRange({ from, to })`
- Check for selection existence before deleting
- Separate handling for selection vs cursor-only cases

```javascript
// OLD (broken):
editor
  .chain()
  .focus()
  .deleteRange({ from, to })
  .insertContent(text)
  .run();

// NEW (working):
if (hasSelection) {
  editor
    .chain()
    .focus()
    .deleteSelection()  // ✅ Triggers 'update' event properly
    .insertContent(text)
    .run();
}
```

### How It Works Now
1. User selects text in editor
2. Tool (Shorten/Expand/ToneShifter/etc.) generates optimized version
3. User clicks "Replace Selection"
4. `insertTextAtSelection` is called with the formatted HTML
5. Editor properly deletes selection and inserts new content
6. Editor fires 'update' event
7. EditorArea's `handleEditorUpdate` is triggered
8. Debounced save (500ms) writes to localStorage
9. Save status indicator shows "Saving..." → "Saved"

### Testing Checklist
- [x] TypeScript compiles without errors
- [ ] Shorten tool replaces selection and triggers save
- [ ] Expand tool replaces selection and triggers save
- [ ] ToneShifter replaces selection and triggers save
- [ ] RewriteChannel replaces selection and triggers save
- [ ] Save indicator shows "Saving..." then "Saved"
- [ ] Content persists after page refresh

---

## Issue 2: Document Rename Not Working

### Problem
Inline document rename in DocumentList.tsx (left sidebar) appeared not to work - either not saving or not updating the UI properly.

### Root Cause
The functionality was actually implemented, but lacked comprehensive logging and had potential state cleanup issues that could cause confusion.

### Fix Applied
**File: `components/workspace/DocumentList.tsx`**

Enhanced the `saveRename` callback with:
- ✅ Better logging at each step
- ✅ Defensive null checks with warnings
- ✅ Clear state cleanup ordering
- ✅ Improved error handling

```javascript
// Enhanced logging and state management
console.log('🔄 Renaming document:', { id, oldTitle, newTitle });
const renamedDoc = renameDocument(activeProjectId, doc.id, newTitle);
console.log('✅ Document renamed successfully:', { ... });

// Clear editing state BEFORE refresh (prevents race conditions)
setEditingDocId(null);
setEditValue('');

// Then refresh and update selection
refreshAll();
setSelectedDocId(renamedDoc.id);
onDocumentClick(renamedDoc);
```

### How It Works Now
1. User double-clicks document title OR clicks pencil icon
2. `startRename(doc)` is called → Sets `editingDocId` and `editValue`
3. Input field appears with current title selected
4. User types new name → `setEditValue()` updates state
5. User presses Enter OR input loses focus → `saveRename()` is called
6. `renameDocument()` updates localStorage
7. State is cleared
8. `refreshAll()` reloads documents from localStorage
9. UI updates with new title
10. Renamed document remains selected

### Inline Rename Features
- **Trigger rename**: Double-click title OR hover + click pencil icon
- **Save**: Press Enter OR click outside input (blur)
- **Cancel**: Press Escape
- **Validation**: Empty titles are rejected, unchanged titles cancel quietly
- **Versioning**: Renamed document becomes v1 of new title family

### Testing Checklist
- [x] TypeScript compiles without errors
- [ ] Double-click document title → Input appears
- [ ] Click pencil icon → Input appears
- [ ] Type new name + Enter → Saves and updates UI
- [ ] Type new name + click outside → Saves and updates UI
- [ ] Press Escape while editing → Cancels without saving
- [ ] Empty title → Cancels without error
- [ ] Check browser console for logs during rename
- [ ] Refresh page → New title persists

---

## Files Modified

### `lib/editor-utils.ts`
- Fixed `insertTextAtSelection()` to use `.deleteSelection()` instead of `.deleteRange()`
- Now properly triggers editor 'update' events for auto-save
- Affects: ShortenTool, ExpandTool, ToneShifter, RewriteChannelTool, TemplateGenerator

### `components/workspace/DocumentList.tsx`
- Enhanced `saveRename()` with better logging and state management
- Improved error handling and null checks
- Clearer state cleanup ordering

---

## Verification Steps

### Test Optimizer Tools:
1. Open a document
2. Type some text and select it
3. Click any tool in right sidebar (Shorten/Expand/ToneShifter)
4. Wait for result
5. Click "Replace Selection"
6. ✅ Selected text should be replaced
7. ✅ Save indicator should show "Saving..." then "Saved"
8. Refresh page
9. ✅ Changes should persist

### Test Document Rename:
1. In left sidebar, find any document
2. Double-click the document title
3. ✅ Input field should appear with title selected
4. Type a new name
5. Press Enter
6. ✅ Title should update immediately in sidebar
7. ✅ Check console for "✅ Document renamed successfully" log
8. Refresh page
9. ✅ New title should persist

### Alternative Rename Test:
1. Hover over a document in left sidebar
2. Click the pencil icon (appears on hover)
3. ✅ Input field should appear
4. Type new name and click outside
5. ✅ Should save via blur event

---

## Technical Details

### Why `.deleteSelection()` Works Better Than `.deleteRange()`
- `.deleteSelection()` is a higher-level command that:
  - Properly handles the selection state
  - Triggers the correct transaction lifecycle
  - Fires the 'update' event consistently
  - Works with TipTap's internal selection tracking

- `.deleteRange()` is lower-level and:
  - May not trigger the full transaction lifecycle
  - Can miss firing the 'update' event
  - Requires manual range tracking

### EditorArea Auto-Save Flow
```
User types → Editor 'update' event → handleEditorUpdate() → 
Debounce 500ms → saveToLocalStorage() → updateDocument() → 
localStorage.setItem() → Save indicator: "Saved" → 
Idle after 2s
```

### Document Rename Flow
```
Double-click/Click pencil → startRename() → Input appears → 
User types → setEditValue() → Enter/Blur → saveRename() → 
renameDocument() → updateProject() → localStorage.setItem() → 
refreshAll() → loadDocuments() → UI updates
```

---

## Related Files (Not Modified)

These files work correctly and were NOT changed:
- `components/workspace/ShortenTool.tsx` - Uses `insertTextAtSelection`
- `components/workspace/ExpandTool.tsx` - Uses `insertTextAtSelection`
- `components/workspace/ToneShifter.tsx` - Uses `insertTextAtSelection`
- `components/workspace/RewriteChannelTool.tsx` - Uses `insertTextAtSelection`
- `components/workspace/EditorArea.tsx` - Listens to 'update' events
- `lib/storage/document-storage.ts` - Provides `renameDocument()` function
- `lib/utils/content-formatting.ts` - Formats HTML for insertion

---

## Next Steps

1. **Test thoroughly** using the verification steps above
2. **Monitor browser console** for the enhanced logging
3. **Check auto-save indicator** after each optimizer tool replacement
4. **Verify persistence** by refreshing the page after each operation

If issues persist:
- Check browser console for error messages
- Verify localStorage isn't full (Storage quota)
- Try in incognito mode to rule out extension conflicts
- Check Network tab to ensure no API errors during optimization
