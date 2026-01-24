# Document Rename - Debug & Testing Guide

## 🔍 Root Cause Found & Fixed

**Issue**: Race condition in `updateDocument()` function  
**File**: `lib/storage/document-storage.ts`  
**Problem**: After updating Supabase, the function was fetching the document again, which could return stale/cached data

### What Was Wrong (BEFORE)

```typescript
// 1. Update API
await apiCall(API_BASE, { method: 'PUT', ...});

// 2. PROBLEM: Fetch document again - might get stale data!
const existingDoc = await getDocument(projectId, docId);

// 3. Save whatever we got back (could be OLD data)
saveLocalDocument({ ...existingDoc, ...updates });
```

**Why this failed**:
- API might have caching/latency
- The re-fetch could return the OLD version
- localStorage would be saved with WRONG data
- On refresh, old title comes back

### What's Fixed (AFTER)

```typescript
// 1. Get existing document FIRST
const existingDoc = getLocalDocuments(projectId).find(d => d.id === docId);

// 2. Update API
await apiCall(API_BASE, { method: 'PUT', ...});

// 3. Save updated version we KNOW is correct
saveLocalDocument({ ...existingDoc, ...updates });
```

**Why this works**:
- We know exactly what we're updating
- No reliance on API returning fresh data immediately
- localStorage always gets the correct updated version
- Changes persist correctly

---

## 🧪 Testing Instructions

### Step 1: Clear Cache & Restart

```bash
# Open browser DevTools (F12 or Cmd+Option+I)
# Go to Application tab → Storage → Local Storage
# Right-click → Clear

# Or run this in browser console:
localStorage.clear();
location.reload();
```

### Step 2: Open Console for Logging

1. Open browser DevTools (F12 / Cmd+Option+I)
2. Go to **Console** tab
3. Keep it open while testing

### Step 3: Test Document Rename

1. **Find a document** in the left sidebar
2. **Double-click** the document name (or click pencil icon)
3. **Change the name** to something new (e.g., "Test Rename 123")
4. **Press Enter** or **click outside**

### Step 4: Check Console Logs

You should see these messages:

```
🔄 Renaming document: { docId: '...', oldTitle: '...', newTitle: 'Test Rename 123' }
☁️ Document updated in cloud: [docId]
💾 Document also updated in localStorage: [docId]
✅ Document renamed successfully: Test Rename 123
☁️ Fetched N documents from cloud
```

**If you see these** → ✅ Working correctly

**If you see errors** → ❌ See troubleshooting below

### Step 5: Verify Persistence

1. **Refresh the page** (F5 / Cmd+R)
2. **Check the document name** in sidebar
3. **Expected**: ✅ New name persists (doesn't revert)

---

## 🔧 Troubleshooting

### Problem: "Document not found" Error

**Symptom**: Error message "Document not found: [id]"

**Possible Causes**:
1. Document doesn't exist in localStorage `copyworx_documents`
2. Data corruption

**Fix**:
```javascript
// Run in browser console:
const docs = localStorage.getItem('copyworx_documents');
console.log('Documents:', JSON.parse(docs || '[]'));

// If empty or missing your doc, you need to reload from Supabase
localStorage.removeItem('copyworx_documents');
location.reload();
```

### Problem: API Calls Failing

**Symptom**: Console shows "⚠️ API failed, falling back to localStorage"

**Check**:
1. Open DevTools → Network tab
2. Look for failed requests to `/api/db/documents`
3. Click the failed request to see error details

**Common Issues**:
- **401 Unauthorized** → Not logged in, clear cookies and re-login
- **503 Service Unavailable** → Supabase not configured
- **Network error** → Check internet connection

**Fix for 503 (Supabase not configured)**:
```bash
# Check .env.local file has:
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Restart dev server:
npm run dev
```

### Problem: Changes Save But Revert on Refresh

**Symptom**: Rename works, but old name comes back after F5

**This means**: localStorage update worked, but Supabase update failed

**Check**:
1. Look for this in console: "⚠️ API failed, falling back to localStorage"
2. If you see it, check Network tab for API errors
3. When you refresh, app loads from Supabase (fresh data), overwriting localStorage

**Fix**:
- Fix the API issue (see above)
- OR work offline: Disconnect internet, rename will persist in localStorage

### Problem: No Console Logs at All

**Symptom**: No emoji logs appear when renaming

**Possible Causes**:
1. Console filter is active
2. Logs are hidden
3. Code not running

**Fix**:
```javascript
// Check console filter
// 1. Look for filter input in Console tab (top)
// 2. Make sure it's empty or set to "All levels"

// Test if logging works:
console.log('🔄 Test log');  // Should appear

// Check if logger is working:
import { logger } from '@/lib/utils/logger';
logger.log('Test logger');  // Should appear
```

### Problem: localStorage Has Wrong Structure

**Symptom**: TypeError about undefined properties

**Check localStorage structure**:
```javascript
// Run in console:
const docs = JSON.parse(localStorage.getItem('copyworx_documents') || '[]');
console.log('Document count:', docs.length);
console.log('First doc:', docs[0]);

// Should see array of document objects with properties:
// id, projectId, title, baseTitle, content, createdAt, modifiedAt, etc.
```

**Fix corrupt data**:
```javascript
// Clear and reload:
localStorage.removeItem('copyworx_documents');
location.reload();
```

---

## 📊 Verify Data in Storage

### Check localStorage

```javascript
// Copy/paste into browser console:

// 1. Check documents storage
const docs = JSON.parse(localStorage.getItem('copyworx_documents') || '[]');
console.log('=== DOCUMENTS ===');
console.log('Total:', docs.length);
docs.forEach((doc, i) => {
  console.log(`${i + 1}. ${doc.title} (ID: ${doc.id.slice(0, 8)}...)`);
});

// 2. Check projects storage (should NOT be used for documents anymore)
const projects = JSON.parse(localStorage.getItem('copyworx_projects') || '[]');
console.log('\n=== PROJECTS ===');
console.log('Total:', projects.length);
projects.forEach((proj, i) => {
  console.log(`${i + 1}. ${proj.name} (Docs in project: ${proj.documents?.length || 0})`);
});
```

### Check Supabase Database

If you have Supabase Studio access:

1. Open Supabase Studio → Table Editor
2. Find `documents` table
3. Look for your document by ID
4. Check the `title` column - should show new name

**SQL Query**:
```sql
SELECT id, title, base_title, modified_at 
FROM documents 
WHERE user_id = '[your-user-id]'
ORDER BY modified_at DESC 
LIMIT 10;
```

---

## 🎯 Expected Behavior (Working System)

### Console Output Flow

When renaming "Document A" → "Document B":

```
1. 🔄 Renaming document: { docId: 'abc-123', oldTitle: 'Document A', newTitle: 'Document B' }
2. ☁️ Document updated in cloud: abc-123
3. 💾 Document also updated in localStorage: abc-123
4. ✅ Document renamed successfully: Document B
5. ☁️ Fetched 5 documents from cloud  [from refreshAll()]
```

### Network Tab Flow

1. **PUT /api/db/documents** - Status 200
   - Request body: `{ id: '...', title: 'Document B' }`
   - Response: Document object with updated title

2. **GET /api/db/documents?project_id=...** - Status 200
   - Response: Array of documents (from refreshAll)
   - Document with ID abc-123 should have title "Document B"

### localStorage Changes

**Before rename**:
```json
[
  {
    "id": "abc-123",
    "title": "Document A",
    "modifiedAt": "2026-01-24T10:00:00Z",
    ...
  }
]
```

**After rename**:
```json
[
  {
    "id": "abc-123",
    "title": "Document B",
    "modifiedAt": "2026-01-24T10:05:00Z",
    ...
  }
]
```

---

## 🐛 Still Not Working?

### Collect Debug Information

Run this script in browser console and share the output:

```javascript
// Debug script - copy all output
console.log('=== DOCUMENT RENAME DEBUG INFO ===\n');

// 1. Check if updateDocument exists
console.log('1. Storage Functions Available:');
import('@/lib/storage/unified-storage').then(storage => {
  console.log('- updateDocument:', typeof storage.updateDocument);
  console.log('- getAllDocuments:', typeof storage.getAllDocuments);
  console.log('- getDocument:', typeof storage.getDocument);
});

// 2. Check localStorage
console.log('\n2. localStorage Keys:');
Object.keys(localStorage).filter(k => k.startsWith('copyworx')).forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`- ${key}: ${value?.length || 0} chars`);
});

// 3. Check documents count
const docs = JSON.parse(localStorage.getItem('copyworx_documents') || '[]');
console.log('\n3. Documents in localStorage:', docs.length);

// 4. Check API availability
console.log('\n4. Testing API endpoint:');
fetch('/api/db/documents?project_id=test')
  .then(r => console.log('API Status:', r.status, r.statusText))
  .catch(e => console.log('API Error:', e.message));

// 5. Check if Supabase is configured
console.log('\n5. Supabase Config:');
console.log('- URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('- Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

console.log('\n=== END DEBUG INFO ===');
```

### Manual Test Without UI

```javascript
// Test updateDocument directly from console:
import('@/lib/storage/unified-storage').then(async (storage) => {
  // Get first document
  const projectId = 'your-project-id-here';
  const docs = await storage.getAllDocuments(projectId);
  console.log('Documents:', docs.length);
  
  if (docs.length > 0) {
    const doc = docs[0];
    console.log('Testing with:', doc.title);
    
    // Try to rename
    try {
      await storage.updateDocument(projectId, doc.id, { 
        title: 'MANUAL TEST ' + Date.now() 
      });
      console.log('✅ Update successful!');
      
      // Verify
      const updated = await storage.getDocument(projectId, doc.id);
      console.log('New title:', updated?.title);
    } catch (error) {
      console.error('❌ Update failed:', error);
    }
  }
});
```

---

## 📞 Next Steps

1. **Run the tests above** and check console output
2. **Take screenshots** of any errors in console or network tab
3. **Note which step fails** (rename, save, or refresh?)
4. **Check if working offline** (disconnect internet, try rename)
5. **Share debug info** from the debug script above

The fix is in place - if it's still not working, we need to see what specific error is occurring.
