# Test Document Rename - Debug Build

## 🔧 Added Debug Logging

I've added extensive logging to help diagnose why rename isn't working:

### New Logs Added:

1. **🖊️ Starting rename** - When you double-click a document name
2. **💾 saveRename called** - When save is triggered (Enter key, blur, etc.)
3. **❌ Rename canceled** - When rename is canceled (Escape key)
4. **Various validation logs** - Shows why save might be skipped

---

## 🧪 Test Steps

### 1. Refresh Page

```
Cmd+R (Mac) or F5 (Windows/Linux)
```

### 2. Try to Rename a Document

**Method A: Double-Click**
1. Find a document in the left sidebar
2. **Double-click** the document name (not the icon)
3. Check console for: `🖊️ Starting rename for document:`

**Method B: Pencil Icon**
1. Hover over a document in the sidebar
2. Click the **pencil icon** that appears
3. Check console for: `🖊️ Starting rename for document:`

### 3. Type New Name

1. If an input field appears, type: "Test Rename Debug"
2. Press **Enter** key

### 4. Check Console Output

You should see logs like this:

```
🖊️ Starting rename for document: { id: '...', title: '...' }
💾 saveRename called with: { providedNewTitle: 'Test Rename Debug', ... }
🔄 Renaming document: { docId: '...', oldTitle: '...', newTitle: 'Test Rename Debug' }
☁️ Document updated in cloud: [id]
💾 Document also updated in localStorage: [id]
✅ Document renamed successfully: Test Rename Debug
```

---

## 🔍 What to Look For

### Scenario 1: No logs at all when double-clicking

**Symptom**: No `🖊️ Starting rename` log appears

**This means**: Double-click not being detected

**Possible causes**:
- Clicking on the icon instead of the text
- Clicking too slowly (not a true double-click)
- JavaScript errors preventing handler from running

**Solution**: Try clicking the pencil icon instead

---

### Scenario 2: Log appears but no input field

**Symptom**: See `🖊️ Starting rename` but input doesn't appear

**This means**: State is updating but UI isn't re-rendering

**Solution**: Share console output, likely a React rendering issue

---

### Scenario 3: Input appears but disappears immediately

**Symptom**: Input field flashes and disappears

**This means**: Something is calling cancelRename() or blur is firing immediately

**Look for**: `❌ Rename canceled` or `💾 saveRename called` immediately after `🖊️ Starting rename`

---

### Scenario 4: Logs show validation failure

**Symptom**: See logs like `❌ No renamingId or activeProjectId` or `❌ Empty title`

**This means**: Data isn't being passed correctly

**Solution**: Share the exact console output

---

### Scenario 5: Everything logs but name doesn't persist

**Symptom**: All logs appear including `✅ Document renamed successfully` but name reverts on refresh

**This means**: The core rename bug we've been fixing - but shouldn't happen now

**Solution**: Check Network tab for failed API calls

---

## 📋 Console Output Template

Please copy ALL console output and share it. Include everything from:

1. When you refresh the page
2. When you double-click/click pencil
3. When you type the new name
4. When you press Enter
5. Any error messages

**Format**:
```
[Paste all console logs here]
```

---

## 🐛 Additional Debug

If still no logs appear, run this in the console:

```javascript
// Test if logging works
import { logger } from '@/lib/utils/logger';
logger.log('🧪 Test log from console');

// Check if DocumentList is mounted
console.log('React Components:', document.querySelector('[data-document-list]'));

// Check if documents are loaded
const docs = JSON.parse(localStorage.getItem('copyworx_documents') || '[]');
console.log('Documents in storage:', docs.length);
docs.forEach((d, i) => console.log(`${i+1}. ${d.title}`));
```

---

## 🎯 Expected Working Flow

When everything works correctly:

1. **Double-click document name** → See `🖊️ Starting rename`
2. **Input field appears** with current name selected
3. **Type new name** → No logs yet
4. **Press Enter** → See all the rename logs
5. **Name updates in sidebar** immediately
6. **Refresh page** → Name persists

If ANY step fails, share what you see in the console!
