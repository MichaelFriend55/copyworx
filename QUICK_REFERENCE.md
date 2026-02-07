# CopyWorx Tool Selector - Quick Reference Card

## 🎯 **Quick Start**

```bash
# 1. Start dev server
npm run dev

# 2. Open browser
http://localhost:3002/copyworx/workspace?action=new

# 3. Click "Tone Shifter" in left sidebar → Start using!
```

---

## 📂 **File Structure**

```
copyworx-v2/
├── lib/
│   ├── stores/
│   │   └── workspaceStore.ts        [activeToolId state]
│   └── tools/
│       ├── toolRegistry.ts          [10 tools, 4 sections]
│       └── index.ts
├── components/
│   ├── workspace/
│   │   ├── ToneShifter.tsx          [✅ Functional]
│   │   ├── EditorArea.tsx           [Passes editor to tools]
│   │   └── WorkspaceLayout.tsx
│   └── tools/
│       ├── ClarityChecker.tsx       [🔜 Placeholder]
│       ├── GrammarPolish.tsx        [🔜 Placeholder]
│       ├── TemplateBrowser.tsx      [🔜 Placeholder]
│       ├── CustomTemplates.tsx      [🔜 Placeholder]
│       ├── BrandVoice.tsx           [🔜 Placeholder]
│       ├── StyleGuide.tsx           [🔜 Placeholder]
│       ├── PerformanceMetrics.tsx   [🔜 Placeholder]
│       ├── AISuggestions.tsx        [🔜 Placeholder]
│       └── index.ts
└── app/
    └── copyworx/
        └── workspace/
            └── page.tsx              [Main workspace page]
```

---

## 🔧 **Tool Registry**

### **Optimizer Section** ▼ (Default Expanded)
- 🎨 **Tone Shifter** - Rewrite copy in different tones ✅
- 🔍 **Clarity Checker** - Analyze readability 🔜
- ✏️ **Grammar Polish** - Fix grammar issues 🔜

### **Templates Section** ▶
- 📄 **Template Browser** - Browse templates 🔜
- 💾 **My Templates** - Saved templates 🔜

### **Brand Section** ▶
- 🏢 **Brand Voice** - Brand consistency 🔜
- 🎨 **Style Guide** - Style rules 🔜

### **Insights Section** ▶
- 📈 **Performance** - Track metrics 🔜
- 💡 **AI Suggestions** - Get ideas 🔜 **NEW**

---

## 🎨 **UI Components**

### **Left Sidebar:**
```typescript
// Collapsible sections
▼ OPTIMIZER
  • Tone Shifter ← [Click to activate]
  • Clarity Checker
  • Grammar Polish

▶ TEMPLATES
▶ BRAND
▶ INSIGHTS
```

### **Right Sidebar:**
```typescript
// Always shows header
AI@Worx Analysis

// Dynamically renders:
- [Active Tool UI] if tool selected
- "Select a Tool" if no tool selected
- "No Document" if no document open
```

---

## 📝 **Key Functions**

### **From Zustand Store:**
```typescript
const { activeToolId, setActiveTool } = useWorkspaceStore();

// Set active tool
setActiveTool('tone-shifter');

// Clear active tool
clearActiveTool();
```

### **From Tool Registry:**
```typescript
import { getToolById, getToolsBySection } from '@/lib/tools';

// Get single tool
const tool = getToolById('tone-shifter');

// Get tools in section
const tools = getToolsBySection('optimizer');
```

---

## 🎯 **User Flows**

### **Flow 1: Use Tone Shifter**
```
1. Open workspace
2. Type some text in editor
3. Click "Optimizer" section (already expanded)
4. Click "Tone Shifter"
5. Select tone (e.g., "Professional")
6. Click "Shift Tone"
7. Wait for AI (2-3 seconds)
8. Click "Insert" to replace content
```

### **Flow 2: Explore Tools**
```
1. Click "▶ TEMPLATES" section
2. Section expands
3. Click "Template Browser"
4. Right sidebar shows template UI
5. Click "▶ BRAND" section
6. Click "Brand Voice"
7. Right sidebar switches to Brand Voice
```

---

## 🔑 **Important State**

### **activeToolId:**
- Type: `string | null`
- Values: `'tone-shifter'`, `'clarity-checker'`, etc.
- Persisted to localStorage
- Controls which tool shows in right sidebar

### **expandedSections:**
- Type: `Set<string>`
- Values: Section IDs like `'optimizer'`, `'templates'`
- Local state (not persisted)
- Controls which sections are expanded

---

## 🎨 **Styling Classes**

### **Active Tool Button:**
```css
bg-apple-blue text-white shadow-sm
```

### **Inactive Tool Button:**
```css
hover:bg-apple-gray-bg text-apple-text-dark
```

### **Section Header:**
```css
font-semibold text-sm uppercase tracking-wide
```

### **NEW Badge:**
```css
px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded uppercase
```

---

## 🐛 **Debugging**

### **Check Active Tool:**
```javascript
// In browser console
useWorkspaceStore.getState().activeToolId
// → 'tone-shifter' or null
```

### **Check Expanded Sections:**
```javascript
// Component has local state, check React DevTools
```

### **Console Logs:**
```
🔧 Active tool set: tone-shifter
🧹 Active tool cleared
```

---

## ➕ **Add New Tool (5 Steps)**

```typescript
// 1. Register in toolRegistry.ts
{
  id: 'my-tool',
  name: 'My Tool',
  icon: MyIcon,
  section: 'optimizer',
  description: 'Tool description',
}

// 2. Create component
export function MyTool({ editor }: { editor: Editor | null }) {
  return <div>My Tool UI</div>;
}

// 3. Export from components/tools/index.ts
export { MyTool } from './MyTool';

// 4. Import in workspace page
import { MyTool } from '@/components/tools';

// 5. Add to TOOL_COMPONENTS map
const TOOL_COMPONENTS = {
  // ...
  'my-tool': MyTool,
};
```

---

## ✅ **Verification Checklist**

```bash
☑ TypeScript compilation: npx tsc --noEmit
☑ Linter: No errors found
☑ All 9 tool components exist
☑ All sections render correctly
☑ Active tool highlights in blue
☑ Right sidebar switches tools
☑ Sections expand/collapse
☑ Editor instance passed to tools
☑ State persists to localStorage
☑ Console logs work
```

---

## 🚀 **URLs**

- **Workspace:** http://localhost:3002/copyworx/workspace
- **New Document:** http://localhost:3002/copyworx/workspace?action=new
- **Splash Page:** http://localhost:3002/copyworx

---

## 📚 **Documentation**

- `TOOL_SELECTOR_ARCHITECTURE.md` - Full implementation guide
- `TOOL_SELECTOR_COMPLETE.md` - Completion summary
- `QUICK_REFERENCE.md` - This file

---

**Tool Selector Architecture: COMPLETE ✅**
