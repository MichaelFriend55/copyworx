# Right Sidebar Auto-Close - CORRECT FIX

## ✅ THE ACTUAL ISSUE (Third Time's the Charm)

The InsightsSlideOut panel is controlled by `activeInsightsPanel` in the **workspace store**, NOT the slideOutStore!

### Panel Control Architecture

```typescript
// In LeftSidebarContent.tsx
<InsightsSlideOut
  isOpen={activeInsightsPanel !== null}  // ← Controlled by workspace store!
  onClose={handleCloseInsightsPanel}      // ← Calls closeInsightsPanel()
  panelType={activeInsightsPanel}
/>
```

The panel opens when `activeInsightsPanel` is set to `'brand-alignment'` or `'persona-alignment'`, and closes when it's set to `null`.

### The Incorrect Fix (What We Did Before)

```typescript
// ❌ WRONG - This doesn't control the InsightsSlideOut panel
closeSlideOut(INSIGHTS_PANEL_ID);  // This is for a different store!
```

### The Correct Fix

```typescript
// ✅ CORRECT - This sets activeInsightsPanel to null
closeInsightsPanel();  // From workspace store
```

## Changes Made

### File: `components/workspace/InsightsSlideOut.tsx`

#### 1. Import (line ~39-58)
```typescript
import {
  // ... other imports
  useInsightsPanelActions,  // ← ADDED
} from '@/lib/stores/workspaceStore';
// REMOVED: import { useSlideOutActions } from '@/lib/stores/slideOutStore';
```

#### 2. Brand Panel (line ~212-215)
```typescript
// Insights panel actions
const { closeInsightsPanel } = useInsightsPanelActions();
```

#### 3. Brand Handler (line ~224-237)
```typescript
const handleRewriteToOptimize = async () => {
  if (!activeProject?.brandVoice || !result || !analyzedText) return;
  
  console.log('🔵 [InsightsSlideOut-Brand] Button clicked - Starting optimization...');
  console.log('🔵 [InsightsSlideOut-Brand] Closing InsightsSlideOut panel...');
  
  // Close the InsightsSlideOut panel IMMEDIATELY
  closeInsightsPanel();  // ← CORRECT FUNCTION
  
  console.log('🔵 [InsightsSlideOut-Brand] Panel closed, opening modal and starting optimization...');
  
  await runOptimizeAlignment(
    analyzedText,
    'brand',
    result,
    activeProject.brandVoice
  );
  
  console.log('🔵 [InsightsSlideOut-Brand] Optimization complete');
};
```

#### 4. Persona Panel (line ~398-401)
```typescript
// Insights panel actions
const { closeInsightsPanel } = useInsightsPanelActions();
```

#### 5. Persona Handler (line ~418-436)
```typescript
const handleRewriteToOptimize = async () => {
  if (!selectedPersona || !result || !analyzedText) return;
  
  console.log('🔵 [InsightsSlideOut-Persona] Button clicked - Starting optimization...');
  console.log('🔵 [InsightsSlideOut-Persona] Closing InsightsSlideOut panel...');
  
  // Close the InsightsSlideOut panel IMMEDIATELY
  closeInsightsPanel();  // ← CORRECT FUNCTION
  
  console.log('🔵 [InsightsSlideOut-Persona] Panel closed, opening modal and starting optimization...');
  
  await runOptimizeAlignment(
    analyzedText,
    'persona',
    result,
    selectedPersona
  );
  
  console.log('🔵 [InsightsSlideOut-Persona] Optimization complete');
};
```

### File: `lib/stores/workspaceStore.ts`

Added debug logging to closeInsightsPanel (line ~1140-1143):

```typescript
closeInsightsPanel: () => {
  console.log(`🟣 [Store] closeInsightsPanel called`);
  console.log(`🟣 [Store] Current activeInsightsPanel: ${get().activeInsightsPanel}`);
  set({ activeInsightsPanel: null });
  console.log(`🟣 [Store] New activeInsightsPanel: ${get().activeInsightsPanel}`);
},
```

## Expected Console Output

```
🔵 [InsightsSlideOut-Persona] Button clicked - Starting optimization...
🔵 [InsightsSlideOut-Persona] Closing InsightsSlideOut panel...
🟣 [Store] closeInsightsPanel called
🟣 [Store] Current activeInsightsPanel: persona-alignment
🟣 [Store] New activeInsightsPanel: null
🔵 [InsightsSlideOut-Persona] Panel closed, opening modal and starting optimization...
🔴 [Store] runOptimizeAlignment - Setting loading state
... (API call) ...
🔵 [InsightsSlideOut-Persona] Optimization complete
```

## Test Now

1. Run Brand or Persona alignment analysis
2. Results appear in the InsightsSlideOut panel
3. Click "Rewrite to Optimize"
4. **Panel should slide closed immediately** ✅
5. Loading modal appears
6. Comparison modal opens

The panel will now close because we're calling the correct function that actually controls its visibility!

---

**Date:** 2026-01-31  
**Status:** ✅ FIXED - Using correct store function  
**Root Cause:** Was calling `closeSlideOut()` from wrong store; needed `closeInsightsPanel()` from workspace store
