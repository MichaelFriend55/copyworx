# 🧪 TipTap Editor - Testing Guide

## Quick Test Steps

### 1. Start the Server
```bash
npm run dev
```
Visit: **http://localhost:3000/copyworx**

---

### 2. Create New Document
1. Click **"New"** button on splash page
2. Should navigate to `/copyworx/workspace?action=new`
3. Editor should auto-focus (cursor blinking)
4. Placeholder text: "Start writing your copy..." (italic, gray)

**✅ Expected:** Blank document, cursor ready, placeholder visible

---

### 3. Test Basic Typing
1. Start typing anything
2. Placeholder should disappear immediately
3. Text should appear smoothly (no lag)
4. Word count should update in header: "X words • Y characters"

**✅ Expected:** Smooth typing, real-time count updates

---

### 4. Test Auto-Save
1. Type some text
2. Stop typing for 1 second
3. Watch header metadata area
4. Should see: "Saving..." (with spinner)
5. Then: "✓ Saved" (green checkmark)
6. Indicator fades after 2 seconds

**✅ Expected:** Auto-save triggers, visual feedback works

---

### 5. Test Formatting Toolbar

#### Bold (⌘B):
1. Select some text
2. Click Bold button (or press ⌘B)
3. Button should highlight in blue
4. Text should become bold

#### Italic (⌘I):
1. Select text
2. Click Italic button
3. Text becomes italic
4. Button highlights

#### Underline (⌘U):
1. Select text
2. Click Underline button
3. Text gets underlined

**✅ Expected:** All formatting works, buttons highlight when active

---

### 6. Test Headings
1. Place cursor on a line
2. Click "Paragraph" dropdown
3. Select "Heading 1"
4. Text should become large (2em)
5. Dropdown should show "Heading 1"

Try Heading 2 and Heading 3 as well.

**✅ Expected:** Headings apply correctly, dropdown updates

---

### 7. Test Lists

#### Bullet List:
1. Click bullet list button
2. Type some text
3. Press Enter
4. New bullet appears

#### Numbered List:
1. Click numbered list button
2. Type text
3. Press Enter
4. Number increments (1, 2, 3...)

**✅ Expected:** Lists work, proper indentation

---

### 8. Test Alignment
1. Select a paragraph
2. Click "Align Center" button
3. Text centers
4. Button highlights in blue

Try Align Left and Align Right.

**✅ Expected:** Text aligns correctly, buttons show active state

---

### 9. Test Link Insertion
1. Select some text
2. Click link button (or press ⌘K)
3. Prompt appears: "Enter URL:"
4. Type: `https://example.com`
5. Press OK
6. Text becomes blue and underlined
7. Link button highlights

**✅ Expected:** Link inserted, styled in Apple blue

---

### 10. Test Undo/Redo
1. Type some text
2. Click Undo button (or press ⌘Z)
3. Text disappears
4. Click Redo button (or press ⌘⇧Z)
5. Text reappears

**✅ Expected:** Undo/Redo works, buttons enable/disable correctly

---

### 11. Test Clear Formatting
1. Apply bold, italic, and underline to text
2. Keep text selected
3. Click "Clear Formatting" button
4. All formatting should be removed
5. Text returns to normal

**✅ Expected:** Formatting cleared, plain text remains

---

### 12. Test Persistence
1. Type some content
2. Wait for "✓ Saved" indicator
3. Refresh the page (⌘R)
4. Content should still be there
5. Editor should auto-focus

**✅ Expected:** Content persists, no data loss

---

### 13. Test Document Title
1. Click on "Untitled Document" at top
2. Type a new title: "My First Copy"
3. Title should update
4. Auto-save should trigger

**✅ Expected:** Title editable, saves automatically

---

### 14. Test Multiple Documents
1. Click "Home" in toolbar
2. Returns to splash page
3. Click "New" again
4. New blank document created
5. Different document ID

**✅ Expected:** Each document is separate, proper isolation

---

### 15. Test Keyboard Shortcuts

Try these:
- **⌘B** → Bold
- **⌘I** → Italic
- **⌘U** → Underline
- **⌘K** → Insert link
- **⌘Z** → Undo
- **⌘⇧Z** → Redo

**✅ Expected:** All shortcuts work correctly

---

## 🐛 Common Issues & Fixes

### Issue: Editor doesn't load
**Fix:** Check browser console for errors. Ensure TipTap packages installed.

### Issue: Toolbar buttons don't work
**Fix:** Wait 1 second after page load for editor to initialize.

### Issue: Auto-save not triggering
**Fix:** Check that document is active. Look for save status in header.

### Issue: Formatting not applying
**Fix:** Ensure text is selected before clicking format button.

### Issue: Content not persisting
**Fix:** Check localStorage in DevTools. Clear and try again.

---

## 📊 Performance Checks

### Typing Latency:
1. Open browser DevTools
2. Go to Performance tab
3. Start recording
4. Type rapidly for 5 seconds
5. Stop recording
6. Check frame rate

**✅ Expected:** 60fps, no dropped frames

### Auto-Save Timing:
1. Type some text
2. Stop typing
3. Use stopwatch
4. Measure time until "Saving..." appears

**✅ Expected:** ~500ms delay (debounce working)

### Load Time:
1. Refresh page
2. Measure time until cursor appears

**✅ Expected:** < 1 second

---

## ✅ Final Checklist

After testing all features:

- [ ] Typing is smooth (no lag)
- [ ] Placeholder works
- [ ] Auto-save triggers
- [ ] Save indicators show
- [ ] Word count updates
- [ ] Bold works
- [ ] Italic works
- [ ] Underline works
- [ ] Headings work
- [ ] Lists work
- [ ] Alignment works
- [ ] Links work
- [ ] Clear formatting works
- [ ] Undo/Redo works
- [ ] Keyboard shortcuts work
- [ ] Content persists
- [ ] Title editable
- [ ] Multiple documents work
- [ ] Toolbar buttons highlight
- [ ] No console errors

---

## 🎉 Success Criteria

**If all tests pass:**
✅ TipTap editor is fully functional
✅ Ready for production use
✅ Premium Mac app experience achieved

**Enjoy your beautiful editor!** 🚀

---

*Testing guide for TipTap integration*
*Test thoroughly. Ship confidently.*



