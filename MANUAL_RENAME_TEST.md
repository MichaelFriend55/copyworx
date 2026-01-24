# Manual Rename Test - Step by Step

## 🚨 CRITICAL: Did you actually try to rename?

Based on your console logs, I see **NO rename logs at all**. This means one of:

1. ❓ You haven't tried to rename a document yet
2. ❓ The UI isn't showing documents/rename controls
3. ❓ Something is blocking the interaction

---

## 🧪 Step-by-Step Test

### Step 1: Can you SEE documents?

Look at the **left sidebar**. Do you see:
- ✅ A list of documents with names?
- ✅ File icons next to the names?

If **NO documents appear** → That's the problem! Documents aren't loading.

---

### Step 2: Hover over a document

1. Move your mouse over a document name in the sidebar
2. Do you see **a pencil icon** appear on the right?

If **NO pencil icon** → The hover state isn't working

---

### Step 3: Try BOTH methods to start rename

#### Method A: Click the Pencil Icon
1. Hover over a document
2. Click the **pencil icon** (✏️) that appears
3. **Check console** - do you see `🖊️ Starting rename`?

#### Method B: Double-Click the Name
1. **Double-click** directly on the document name (the text, not the icon)
2. Double-click means: Click twice rapidly
3. **Check console** - do you see `🖊️ Starting rename`?

---

### Step 4: What happens?

After clicking pencil or double-clicking:

#### ✅ If an INPUT FIELD appears:
Good! Type a new name and press Enter, then check console for more logs.

#### ❌ If NOTHING happens:
This is the problem. The event isn't firing.

#### ❌ If console shows errors (red text):
Share the error messages.

---

## 🔧 Manual Console Test

If the UI method doesn't work, let's test the function directly.

**Paste this in the browser console:**

```javascript
// Test 1: Check if documents exist
const docs = JSON.parse(localStorage.getItem('copyworx_documents') || '[]');
console.log('📄 Documents:', docs.length);
if (docs.length > 0) {
  console.log('First document:', docs[0].title);
}

// Test 2: Test logging works
import('@/lib/utils/logger').then(({ logger }) => {
  logger.log('🧪 TEST: Logger is working!');
});

// Test 3: Simulate a rename (this will test if the function works)
// Replace 'YOUR_PROJECT_ID' and 'YOUR_DOC_ID' with actual values from docs[0]
import('@/lib/storage/unified-storage').then(async (storage) => {
  if (docs.length > 0) {
    const doc = docs[0];
    console.log('🧪 Testing rename for:', doc.title);
    
    try {
      await storage.updateDocument(
        doc.projectId, 
        doc.id, 
        { title: 'CONSOLE TEST ' + Date.now() }
      );
      console.log('✅ Rename succeeded!');
    } catch (error) {
      console.error('❌ Rename failed:', error);
    }
  }
});
```

---

## 🎯 What I Need From You

Please answer these questions:

### 1. Visual Check
- [ ] Can you see documents in the left sidebar? (YES/NO)
- [ ] Can you see a pencil icon when you hover? (YES/NO)
- [ ] How many documents do you see? (NUMBER)

### 2. Interaction Check
- [ ] Did you try clicking the pencil icon? (YES/NO)
- [ ] Did you try double-clicking the document name? (YES/NO)
- [ ] What happened when you tried? (NOTHING / INPUT APPEARED / ERROR)

### 3. Console Check
- [ ] Do you see the 🖊️ log when you try to rename? (YES/NO)
- [ ] Are there any RED error messages? (YES/NO - if yes, paste them)
- [ ] Did you run the manual console test above? (YES/NO)

---

## 🖼️ Expected UI

When you hover over a document, you should see:

```
[📄 Document Name              ✏️ 🗑️]
     ^                         ^   ^
     File icon             Pencil Delete
                          (rename)
```

**Is this what you see?** YES/NO

---

## 🚀 Quick Visual Test

Take a screenshot or describe what you see in the left sidebar:
- Is it empty?
- Does it show "No documents"?
- Does it show document names?
- Do icons appear on hover?

---

Please go through these steps ONE BY ONE and tell me:
1. What you see in the UI
2. What happens when you try to rename
3. What console logs appear (if any)

I need this information to understand why the rename isn't starting at all!
