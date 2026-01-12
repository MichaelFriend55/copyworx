# Zustand v5 Migration Guide - CopyWorx

## The Root Cause (January 2026)

The workspace was crashing with "Maximum update depth exceeded" due to a **breaking change in Zustand v5**.

### What Changed in Zustand v5

**Old pattern (Zustand v4 - BROKEN in v5):**
```typescript
import { shallow } from 'zustand/shallow';

// ❌ This causes infinite re-renders in v5!
export const useUIActions = () => useWorkspaceStore(
  (state) => ({
    toggleLeftSidebar: state.toggleLeftSidebar,
    toggleRightSidebar: state.toggleRightSidebar,
  }),
  shallow  // Second argument - DEPRECATED in v5
);
```

**New pattern (Zustand v5 - CORRECT):**
```typescript
import { useShallow } from 'zustand/react/shallow';

// ✅ This works correctly in v5!
export const useUIActions = () => useWorkspaceStore(
  useShallow((state) => ({
    toggleLeftSidebar: state.toggleLeftSidebar,
    toggleRightSidebar: state.toggleRightSidebar,
  }))
);
```

### Key Differences

| Aspect | v4 (Old) | v5 (New) |
|--------|----------|----------|
| Import | `import { shallow } from 'zustand/shallow'` | `import { useShallow } from 'zustand/react/shallow'` |
| Usage | Second argument to selector | Wrapper around selector function |
| Hook name | `shallow` | `useShallow` |

---

## Files Fixed

All action selector hooks in `lib/stores/workspaceStore.ts` were updated:

1. `useToneShiftActions`
2. `useExpandActions`
3. `useShortenActions`
4. `useRewriteChannelActions`
5. `useBrandAlignmentActions`
6. `useProjectActions`
7. `useDocumentActions`
8. `useUIActions` ← This was the culprit!
9. `useTemplateActions`

---

## Other Infinite Loop Prevention Patterns

### 1. Never put store functions in useEffect dependencies

**❌ BAD:**
```typescript
const { updateDocumentContent } = useDocumentActions();

useEffect(() => {
  // This will loop forever!
  updateDocumentContent(content);
}, [updateDocumentContent, content]);
```

**✅ GOOD:**
```typescript
useEffect(() => {
  // Get the function directly from store state
  useWorkspaceStore.getState().updateDocumentContent(content);
}, [content]);
```

### 2. Use useMemo for derived objects

**❌ BAD:**
```typescript
// Creates new object reference every render!
const activeProject = projects.find((p) => p.id === activeProjectId);
```

**✅ GOOD:**
```typescript
const activeProject = useMemo(
  () => projects.find((p) => p.id === activeProjectId),
  [projects, activeProjectId]
);
```

### 3. Use useRef for stable function references

**❌ BAD:**
```typescript
const { setSelectedText } = useDocumentActions();

useEffect(() => {
  editor.on('selectionUpdate', () => {
    setSelectedText(text); // Reference changes every render
  });
}, [editor, setSelectedText]);
```

**✅ GOOD:**
```typescript
const setSelectedTextRef = useRef(useWorkspaceStore.getState().setSelectedText);

useEffect(() => {
  return useWorkspaceStore.subscribe((state) => {
    setSelectedTextRef.current = state.setSelectedText;
  });
}, []);

useEffect(() => {
  editor.on('selectionUpdate', () => {
    setSelectedTextRef.current(text); // Ref is stable
  });
}, [editor]);
```

### 4. Never define components inside components

**❌ BAD:**
```typescript
function ParentComponent() {
  // This creates a new component type every render!
  const ChildComponent = () => <div>Child</div>;
  
  return <ChildComponent />;
}
```

**✅ GOOD:**
```typescript
// Define outside
const ChildComponent = () => <div>Child</div>;

function ParentComponent() {
  return <ChildComponent />;
}
```

---

## Quick Checklist for Future Development

- [ ] Using `useShallow` from `zustand/react/shallow` (NOT `shallow` from `zustand/shallow`)
- [ ] Store functions accessed via `getState()` in useEffect, not destructured
- [ ] Derived objects memoized with `useMemo`
- [ ] Components defined outside parent components
- [ ] No store functions in useEffect dependency arrays

---

## Debugging Tips

If you see "Maximum update depth exceeded":

1. **Check useEffect dependencies** - Are any store functions in the array?
2. **Check object selectors** - Are they using `useShallow`?
3. **Check derived values** - Are `.find()`, `.filter()`, `.map()` results memoized?
4. **Check component definitions** - Are any defined inside other components?

---

## References

- [Zustand v5 Migration Guide](https://github.com/pmndrs/zustand/blob/main/docs/migrations/migrating-to-v5.md)
- [useShallow Documentation](https://github.com/pmndrs/zustand#using-useshallow-to-prevent-unnecessary-renders)
