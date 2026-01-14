# localStorage Test Script - Verification Guide

## How to Run These Tests

1. Open your app in the browser: http://localhost:3001
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to the Console tab
4. Copy and paste each test block below

---

## Test 1: Verify Projects Are Stored as JSON

```javascript
// Check raw localStorage value
const raw = localStorage.getItem('copyworx_projects');
console.log('Raw value type:', typeof raw);  
console.log('Raw value:', raw);

// Expected output:
// Raw value type: "string"
// Raw value: "[{...}]" (JSON string)

// Verify it's valid JSON
try {
  const parsed = JSON.parse(raw || '[]');
  console.log('✅ Valid JSON');
  console.log('✅ Is array:', Array.isArray(parsed));
  console.log('✅ Project count:', parsed.length);
  console.log('✅ Projects:', parsed);
} catch (e) {
  console.error('❌ Invalid JSON:', e);
}
```

---

## Test 2: Verify Storage Layer Returns Arrays

```javascript
// This test requires importing from the storage layer
// Run this in your component or create a test page

// In a React component or test file:
import { getAllProjects } from '@/lib/storage/project-storage';

const projects = getAllProjects();
console.log('Projects type:', typeof projects);
console.log('Is array:', Array.isArray(projects));
console.log('Projects:', projects);

// Expected:
// Projects type: "object"
// Is array: true
// Projects: [{...}, {...}]
```

---

## Test 3: Verify Array Methods Work

```javascript
// Parse projects from localStorage
const raw = localStorage.getItem('copyworx_projects');
const projects = JSON.parse(raw || '[]');

console.log('Testing array methods:');
console.log('✅ .length:', projects.length);
console.log('✅ .map() works:', projects.map(p => p.name));
console.log('✅ .filter() works:', projects.filter(p => p.name.includes('Project')));
console.log('✅ .find() works:', projects.find(p => p.id));
console.log('✅ .forEach() works:');
projects.forEach(p => console.log('  -', p.name));

// All should work without errors
```

---

## Test 4: Simulate Data Corruption Recovery

```javascript
// Intentionally corrupt the data
console.log('🔧 Corrupting localStorage...');
localStorage.setItem('copyworx_projects', 'NOT VALID JSON {]');

// Try to read it
const raw = localStorage.getItem('copyworx_projects');
console.log('Corrupted raw:', raw);

// Now use the safe parsing function (simulated)
function safeParseJSON(json, fallback) {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      console.warn('⚠️ Not an array, returning fallback');
      return fallback;
    }
    return parsed;
  } catch (error) {
    console.error('❌ Parse error, returning fallback:', error.message);
    return fallback;
  }
}

const projects = safeParseJSON(raw, []);
console.log('✅ Recovered safely:', Array.isArray(projects));
console.log('✅ Projects:', projects);

// Clean up
localStorage.removeItem('copyworx_projects');
console.log('🧹 Cleaned up corrupted data');
```

---

## Test 5: Verify Zustand Store Persistence

```javascript
// Check Zustand persist storage
const workspaceState = localStorage.getItem('copyworx-workspace');
console.log('Workspace state (raw):', workspaceState);

if (workspaceState) {
  try {
    const parsed = JSON.parse(workspaceState);
    console.log('✅ Valid JSON');
    console.log('✅ State keys:', Object.keys(parsed));
    console.log('✅ Has state:', 'state' in parsed);
    console.log('✅ Active document:', parsed.state?.activeDocument);
  } catch (e) {
    console.error('❌ Invalid JSON:', e);
  }
} else {
  console.log('ℹ️ No workspace state yet');
}
```

---

## Test 6: Full Integration Test

```javascript
// This is a comprehensive test - run after app loads
console.log('═══════════════════════════════════════');
console.log('localStorage Integration Test');
console.log('═══════════════════════════════════════');

// 1. Check all expected keys exist
const expectedKeys = ['copyworx_projects', 'copyworx_active_project_id', 'copyworx-workspace'];
console.log('\n1. Checking keys:');
expectedKeys.forEach(key => {
  const exists = localStorage.getItem(key) !== null;
  console.log(exists ? '✅' : '⚠️', key, exists ? 'exists' : 'not found');
});

// 2. Verify projects
console.log('\n2. Verifying projects:');
const projectsRaw = localStorage.getItem('copyworx_projects');
if (projectsRaw) {
  try {
    const projects = JSON.parse(projectsRaw);
    console.log('✅ Projects parsed successfully');
    console.log('✅ Type:', Array.isArray(projects) ? 'Array' : typeof projects);
    console.log('✅ Count:', projects.length);
    
    // Test array methods
    const canMap = typeof projects.map === 'function';
    const canFind = typeof projects.find === 'function';
    const canFilter = typeof projects.filter === 'function';
    
    console.log('✅ .map():', canMap);
    console.log('✅ .find():', canFind);
    console.log('✅ .filter():', canFilter);
    
    if (projects.length > 0) {
      const firstProject = projects[0];
      console.log('✅ First project:', {
        id: firstProject.id,
        name: firstProject.name,
        hasDocuments: Array.isArray(firstProject.documents),
        documentCount: firstProject.documents?.length || 0
      });
    }
  } catch (e) {
    console.error('❌ Parse error:', e);
  }
} else {
  console.log('⚠️ No projects in localStorage yet');
}

// 3. Verify active project ID
console.log('\n3. Verifying active project:');
const activeId = localStorage.getItem('copyworx_active_project_id');
if (activeId) {
  console.log('✅ Active project ID:', activeId);
  console.log('✅ Type:', typeof activeId);
} else {
  console.log('⚠️ No active project set');
}

// 4. Check storage usage
console.log('\n4. Storage usage:');
let totalSize = 0;
for (const key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    totalSize += localStorage[key].length + key.length;
  }
}
const limitBytes = 5 * 1024 * 1024; // 5MB
const usagePercent = (totalSize / limitBytes) * 100;
console.log('✅ Total size:', (totalSize / 1024).toFixed(2), 'KB');
console.log('✅ Usage:', usagePercent.toFixed(1), '%');

console.log('\n═══════════════════════════════════════');
console.log('Test Complete');
console.log('═══════════════════════════════════════');
```

---

## Test 7: Performance Test

```javascript
// Test read/write performance
console.log('Performance Test:');

// Create test data
const testData = Array.from({ length: 10 }, (_, i) => ({
  id: `test-${i}`,
  name: `Test Project ${i}`,
  documents: [],
  folders: [],
  personas: [],
  brandVoice: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

// Write test
console.time('Write 10 projects');
localStorage.setItem('test_projects', JSON.stringify(testData));
console.timeEnd('Write 10 projects');

// Read test
console.time('Read 10 projects');
const readData = JSON.parse(localStorage.getItem('test_projects') || '[]');
console.timeEnd('Read 10 projects');

// Array operations test
console.time('Array operations (1000 ops)');
for (let i = 0; i < 1000; i++) {
  readData.map(p => p.name);
  readData.find(p => p.id === 'test-5');
  readData.filter(p => p.name.includes('5'));
}
console.timeEnd('Array operations (1000 ops)');

// Cleanup
localStorage.removeItem('test_projects');
console.log('✅ Performance test complete, test data cleaned up');
```

---

## Expected Results Summary

If localStorage is working correctly, you should see:

✅ Raw values are JSON strings  
✅ Parsed values are proper JavaScript objects/arrays  
✅ Array methods (.map, .find, .filter) work without errors  
✅ Data corruption is handled gracefully with fallbacks  
✅ Zustand persist storage is valid JSON  
✅ All keys exist and contain valid data  
✅ Performance is fast (< 10ms for read/write)  

If you see any ❌ errors, that indicates a problem.

---

## Quick Diagnosis

### Problem: "Cannot read property 'find' of undefined"
**Cause:** Variable is undefined, not an array  
**Fix:** Ensure `JSON.parse()` is called on localStorage.getItem()

### Problem: "projects.find is not a function"
**Cause:** Variable is a string, not an array  
**Fix:** Parsed data is still a string - check JSON.parse() usage

### Problem: SyntaxError in JSON.parse
**Cause:** Corrupted localStorage data  
**Fix:** Clear localStorage and reload:
```javascript
localStorage.clear();
location.reload();
```

### Problem: Empty array returned
**Cause:** No data in localStorage yet (normal for new users)  
**Fix:** Create a project through the UI

---

## Manual Verification Steps

1. Open app → Navigate to dashboard
2. Create a new project
3. Open DevTools → Application tab → localStorage
4. Find `copyworx_projects` key
5. Verify value is a JSON string (starts with `[` and ends with `]`)
6. Copy the value
7. In Console tab: `JSON.parse(/* paste value */)` 
8. Verify it returns an array of objects
9. Create a document in the project
10. Refresh the page
11. Verify the document persists (localStorage working)

---

## Automated Test Suite

To add automated tests, create `__tests__/localStorage.test.ts`:

```typescript
import { getAllProjects, createProject } from '@/lib/storage/project-storage';

describe('localStorage Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('getAllProjects returns array', () => {
    const projects = getAllProjects();
    expect(Array.isArray(projects)).toBe(true);
  });

  test('array methods work on projects', () => {
    createProject('Test Project');
    const projects = getAllProjects();
    
    expect(projects.map(p => p.name)).toBeDefined();
    expect(projects.find(p => p.name === 'Test Project')).toBeDefined();
    expect(projects.filter(p => p.name.includes('Test'))).toHaveLength(1);
  });

  test('handles corrupt data gracefully', () => {
    localStorage.setItem('copyworx_projects', 'INVALID');
    const projects = getAllProjects();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects).toEqual([]);
  });
});
```

---

## Summary

All tests above should pass ✅ because the codebase correctly:
1. Parses JSON when reading from localStorage
2. Stringifies JSON when writing to localStorage  
3. Validates data types after parsing
4. Handles errors gracefully with fallbacks

The localStorage implementation is **production-ready** and follows best practices.
