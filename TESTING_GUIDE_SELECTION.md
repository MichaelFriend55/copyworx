# Editor Selection Tools - Testing Guide

## Quick Test Scenarios

### 🧪 Test 1: Basic Selection Flow

**Steps:**
1. Open the workspace editor
2. Type some text: "This is a sample sentence that we will modify."
3. Highlight the word "sample"
4. Open ToneShifter tool (right sidebar)

**Expected Results:**
- ✅ Tool shows selected text preview: "Selected Text (6 characters)"
- ✅ Preview displays: "sample"
- ✅ Tone buttons are enabled
- ✅ "Shift Tone" button is enabled

---

### 🧪 Test 2: ToneShifter - Replace Selection

**Steps:**
1. Select text: "This is a sample sentence"
2. Open ToneShifter
3. Select tone: "Professional"
4. Click "Shift Tone"
5. Wait for results
6. Click "Replace Selection"

**Expected Results:**
- ✅ Loading state shows "Rewriting..."
- ✅ Result appears in green success box
- ✅ "Replace Selection" button is enabled
- ✅ Click replaces only the selected text in editor
- ✅ Rest of document unchanged
- ✅ Result clears after replacement

---

### 🧪 Test 3: ExpandTool - Replace Selection

**Steps:**
1. Select text: "AI is powerful"
2. Open Expand tool
3. Click "Expand Copy"
4. Wait for results
5. Click "Replace Selection"

**Expected Results:**
- ✅ Tool shows selection preview
- ✅ Button is enabled (not disabled)
- ✅ Loading state shows "Expanding..."
- ✅ Expanded text appears in result box
- ✅ Replace works correctly
- ✅ Original short text is replaced with expanded version

**Previous Bug:** Would show error "hasContent is not defined"
**Now Fixed:** ✅ Uses `selectedText` from store

---

### 🧪 Test 4: ShortenTool - Replace Selection

**Steps:**
1. Type a long paragraph (100+ words)
2. Select entire paragraph
3. Open Shorten tool
4. Click "Shorten Copy"
5. Wait for results
6. Click "Replace Selection"

**Expected Results:**
- ✅ Preview shows full selected text (scrollable)
- ✅ Character count is correct
- ✅ Loading state shows "Shortening..."
- ✅ Shortened version appears
- ✅ Replace works on the selection only

**Previous Behavior:** Would process entire document
**New Behavior:** ✅ Only processes selected text

---

### 🧪 Test 5: No Selection State

**Steps:**
1. Open editor
2. Click in document (cursor only, no text selected)
3. Open ToneShifter

**Expected Results:**
- ✅ Blue info box appears
- ✅ Message: "Highlight text in the editor to shift tone"
- ✅ Tone buttons are enabled (user can select tone)
- ✅ "Shift Tone" button is DISABLED
- ✅ Helper text: "Select text in the editor to use Tone Shifter"

**Repeat for Expand and Shorten:**
- ✅ Each shows appropriate message
- ✅ Action buttons are disabled
- ✅ No preview boxes visible

---

### 🧪 Test 6: Selection Persistence Across Tools

**Steps:**
1. Select text: "Test content"
2. Open ToneShifter → See preview
3. Open ExpandTool → Should see same preview
4. Open ShortenTool → Should see same preview
5. Click in editor (deselect)
6. Return to tools → Preview should be gone

**Expected Results:**
- ✅ Selection persists across tool switches
- ✅ All tools show same selected text
- ✅ Character count matches
- ✅ Deselecting clears state in all tools

---

### 🧪 Test 7: Replace After Cursor Move

**Steps:**
1. Select text at beginning: "Hello world"
2. Open ToneShifter
3. Generate result
4. **Click elsewhere in document** (move cursor away)
5. Click "Replace Selection"

**Expected Results:**
- ✅ Original "Hello world" is still replaced
- ✅ Uses stored `selectionRange` from when result was generated
- ✅ Cursor position doesn't affect replacement

---

### 🧪 Test 8: Long Text Selection

**Steps:**
1. Type 500+ word document
2. Select middle paragraph (50-100 words)
3. Open any tool
4. Verify preview

**Expected Results:**
- ✅ Preview is scrollable (max-h-32)
- ✅ Character count is accurate
- ✅ Processing only affects selected portion
- ✅ Rest of document unchanged after replace

---

### 🧪 Test 9: Multiple Selection Changes

**Steps:**
1. Select "word one"
2. Open ToneShifter → See "word one"
3. Without closing tool, select "word two" in editor
4. Tool preview should update immediately

**Expected Results:**
- ✅ Preview updates in real-time
- ✅ Character count updates
- ✅ No need to close/reopen tool
- ✅ Selection tracking is reactive

---

### 🧪 Test 10: Error Handling

**Steps:**
1. Disconnect internet or simulate API error
2. Select text
3. Try to use any tool
4. Should see error state

**Expected Results:**
- ✅ Error appears in red box
- ✅ Error message is clear
- ✅ Can dismiss error
- ✅ Can retry with same selection
- ✅ Tool remains functional

---

## 🐛 Regression Tests

### Critical Bug Fix: ExpandTool

**Previous Bug:**
```typescript
// Line 66 had undefined variable
const handleExpand = async () => {
  if (!editor || !hasContent) return;  // ❌ hasContent was never defined!
  const text = editor.getHTML();
  await runExpand(text);
};
```

**Test:**
1. Open ExpandTool
2. Should NOT see console error
3. Should NOT see blank screen
4. Tool should work normally

**Expected:** ✅ No errors, tool works perfectly

---

### Previous Behavior: ShortenTool Used Full Document

**Old Behavior:**
- Selected 1 sentence → Tool shortened entire document

**Test:**
1. Write 5 paragraphs
2. Select 1 sentence in middle
3. Shorten it
4. Replace

**Expected:** ✅ Only that sentence is shortened and replaced

---

## 🎯 UI/UX Checks

### Visual Consistency

All three tools should have:
- ✅ Same header style with icon
- ✅ Same selected text preview design
- ✅ Same blue info box when no selection
- ✅ Same button styles and states
- ✅ Same success result box (green)
- ✅ Same error box (red)
- ✅ Same action buttons layout

### Animation & Feedback

- ✅ Loading spinner during processing
- ✅ Smooth transitions when preview appears/disappears
- ✅ Button hover states work
- ✅ Focus rings visible on keyboard navigation
- ✅ Disabled states have reduced opacity

### Accessibility

- ✅ All buttons have proper labels
- ✅ Disabled buttons have tooltips explaining why
- ✅ Error messages are announced
- ✅ Keyboard navigation works
- ✅ Screen reader friendly

---

## 🔍 Browser Console Checks

### Expected Console Logs

**When selecting text:**
```
📝 Text selected: {
  length: 25,
  range: { from: 10, to: 35 },
  preview: "This is selected text..."
}
```

**When running tool:**
```
🔄 Starting tone shift: { tone: "professional", textLength: 25 }
✅ Tone shift complete: { originalLength: 25, newLength: 32, preview: "..." }
```

**When replacing:**
```
📝 Inserting text at selection: { from: 10, to: 35, textLength: 32, isHTML: true }
✅ Text inserted successfully
🧹 Tone shift result cleared
```

### Should NOT See

- ❌ "hasContent is not defined"
- ❌ "Cannot read property of undefined"
- ❌ "Selection range is null" (this is valid, just shouldn't cause errors)
- ❌ Any React hydration warnings

---

## 📊 Performance Checks

### Selection Tracking
- ✅ No lag when selecting text
- ✅ Store updates are instant
- ✅ No unnecessary re-renders

### Tool Operations
- ✅ API calls only when button clicked
- ✅ Results render smoothly
- ✅ Large text selections don't freeze UI

---

## ✅ Success Criteria

All tests pass if:
1. ✅ No linter errors
2. ✅ No console errors
3. ✅ All tools show selection preview
4. ✅ "Replace Selection" works in all tools
5. ✅ No selection state shows disabled buttons + message
6. ✅ ExpandTool no longer has "hasContent" bug
7. ✅ ShortenTool uses selection, not full document
8. ✅ Visual consistency across all tools
9. ✅ Selection persists across tool switches
10. ✅ Replace works even after cursor moves

---

## 🚀 Quick Smoke Test (2 minutes)

1. Open workspace
2. Type "AI tools are powerful"
3. Select "powerful"
4. Open ToneShifter → See preview ✅
5. Shift to Professional tone
6. Replace selection ✅
7. Select new text
8. Open ExpandTool → See preview ✅
9. Expand it
10. Replace selection ✅
11. Select different text
12. Open ShortenTool → See preview ✅
13. Shorten it
14. Replace selection ✅

**If all 14 steps work:** 🎉 Refactor is successful!

---

## 📝 Notes for Testers

- API calls may take 2-5 seconds depending on OpenAI response time
- Selection must have actual text (spaces alone won't work)
- Tools will auto-open right sidebar when activated
- Results clear automatically after replacement
- Use "Copy" button if you want to keep result without replacing

---

**End of Testing Guide**
