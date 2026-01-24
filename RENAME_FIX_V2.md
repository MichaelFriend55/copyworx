# Document Rename Fix v2 - Race Condition Fixed

## 🎯 What I Just Fixed

### The Real Problem: Race Condition in updateDocument()

**File**: `lib/storage/document-storage.ts` (lines 432-492)

The previous fix was incomplete. The issue wasn't just in DocumentList - it was in the **updateDocument()** function itself:

```typescript
// BEFORE (BROKEN):
async function updateDocument(projectId, docId, updates) {
  // 1. Update API ✅
  await apiCall('PUT', { id: docId, ...updates });
  
  // 2. PROBLEM: Fetch document again from API
  //    This could return STALE cached data!
  const existingDoc = await getDocument(projectId, docId);  ❌
  
  // 3. Save whatever we got (might be old version)
  saveLocalDocument({ ...existingDoc, ...updates });  ❌
}
```

**Why it failed**:
1. We update Supabase with new title
2. We immediately fetch the document again
3. Due to API caching/latency, we might get the OLD version back
4. We save the OLD version to localStorage
5. On refresh, old title comes back

---

## ✅ The Fix

```typescript
// AFTER (FIXED):
async function updateDocument(projectId, docId, updates) {
  // 1. Get existing document FIRST (from local cache)
  const localDocs = getLocalDocuments(projectId);
  const existingDoc = localDocs.find(d => d.id === docId);  ✅
  
  // 2. Update API
  await apiCall('PUT', { id: docId, ...updates });  ✅
  
  // 3. Save updated version we KNOW is correct
  //    No dependency on API returning fresh data immediately
  const updatedDoc = { ...existingDoc, ...updates, modifiedAt: new Date() };
  saveLocalDocument(updatedDoc);  ✅
}
```

**Why this works**:
- ✅ We read current state from localStorage BEFORE API call
- ✅ We update Supabase
- ✅ We merge updates with known-good data
- ✅ We save the correct version immediately
- ✅ No race condition - we don't rely on API returning fresh data
- ✅ localStorage always has the correct updated version

---

## 📋 Changes Made

### 1. document-storage.ts - Fixed updateDocument()

**Lines 432-492 replaced**

Key changes:
- Fetch existing document BEFORE API call (not after)
- Use local copy + updates (not re-fetched from API)
- Added better logging: "💾 Document also updated in localStorage"

### 2. DocumentList.tsx - Already fixed in v1

- Using `updateDocument()` instead of direct localStorage
- Properly awaiting the call
- Added debug logging

### 3. Toolbar.tsx - Already fixed in v1

- Added missing `await` on updateDocument call

---

## 🧪 How to Test

### Quick Test (30 seconds)

1. **Clear localStorage** (Optional but recommended):
   ```javascript
   // Open browser console
   localStorage.clear();
   location.reload();
   ```

2. **Rename a document**:
   - Double-click document name in sidebar
   - Type new name: "Test Rename [timestamp]"
   - Press Enter

3. **Check console** for these logs:
   ```
   🔄 Renaming document: { docId: '...', oldTitle: '...', newTitle: '...' }
   ☁️ Document updated in cloud: [id]
   💾 Document also updated in localStorage: [id]
   ✅ Document renamed successfully: [new name]
   ```

4. **Refresh page** (F5 / Cmd+R)

5. **Verify**: ✅ Document name persists (doesn't revert)

### If Still Not Working

**See `DOCUMENT_RENAME_DEBUG.md`** for comprehensive troubleshooting:
- Check console logs
- Verify API calls in Network tab
- Inspect localStorage data
- Test Supabase connection
- Manual testing scripts

---

## 🔄 Data Flow (Complete)

### On Rename

```
1. User types new name in DocumentList
   ↓
2. saveRename() called
   ↓
3. updateDocument(projectId, docId, { title: newTitle })
   ↓
4. Read existing doc from localStorage
   ↓
5. PUT request to /api/db/documents
   ↓
6. Supabase updates title column
   ↓
7. Merge updates with local doc
   ↓
8. Save to localStorage (copyworx_documents)
   ↓
9. refreshAll() called
   ↓
10. getAllDocuments() fetches from Supabase
    ↓
11. UI updates with new title
    ✅ DONE
```

### On Page Refresh

```
1. Page loads
   ↓
2. DocumentList mounts
   ↓
3. loadDocuments() called
   ↓
4. getAllDocuments(projectId)
   ↓
5. Tries to fetch from Supabase API
   ↓
6. Success: Returns documents with updated titles ✅
   OR
   Fail: Falls back to localStorage ✅
   ↓
7. UI renders with persisted names ✅
```

---

## 🎓 Why This Architecture?

### Two Storage Layers

1. **Supabase (Cloud) - Primary**:
   - Source of truth
   - Syncs across devices
   - Requires auth + internet

2. **localStorage (Cache) - Secondary**:
   - Fallback when offline
   - Fast reads
   - Survives page refresh

### Update Strategy

**Optimistic Updates**:
- Update Supabase first (if online)
- Save to localStorage immediately with known-good data
- Don't wait for API to confirm - we know what we sent
- If API fails, localStorage still has correct data (works offline)

**Read Strategy**:
- Try Supabase first (get latest from all devices)
- Fall back to localStorage if offline
- Update localStorage with Supabase data on successful fetch

---

## 🚨 Common Issues & Solutions

### Issue: "Document not found"

**Cause**: Document doesn't exist in localStorage `copyworx_documents`

**Solution**:
```javascript
// Console:
localStorage.removeItem('copyworx_documents');
location.reload();
// This will force reload from Supabase
```

### Issue: Changes save but revert on refresh

**Cause**: API call is failing, but localStorage update succeeded

**Solution**: Check Network tab for API errors:
- 401 Unauthorized → Re-login
- 503 Service Unavailable → Check Supabase config
- Network error → Check internet connection

### Issue: No console logs appear

**Cause**: Logger not working or console filtered

**Solution**:
```javascript
// Test logging:
console.log('🔄 Test');  // Should appear

// Check console filter (top of console tab)
// Should be empty or set to "All levels"
```

---

## 📊 Success Criteria

✅ **All these should work now**:

1. Rename document in sidebar → Press Enter → Name changes immediately
2. Refresh page → Name persists (doesn't revert)
3. Close browser → Reopen → Name still persisted
4. Works offline (localStorage fallback)
5. Works online (Supabase sync)
6. Syncs across devices (when online)

---

## 🎯 Summary

**Problem**: Race condition fetching stale data after API update  
**Solution**: Build updated document locally, don't re-fetch from API  
**Result**: localStorage always has correct data, changes persist  

**Files Modified**:
1. ✅ `lib/storage/document-storage.ts` - Fixed updateDocument()
2. ✅ `components/workspace/DocumentList.tsx` - Use proper storage layer
3. ✅ `components/workspace/Toolbar.tsx` - Added missing await

**Test**: Rename document → Refresh page → ✅ Name persists

If still having issues, check **`DOCUMENT_RENAME_DEBUG.md`** for detailed troubleshooting steps.
