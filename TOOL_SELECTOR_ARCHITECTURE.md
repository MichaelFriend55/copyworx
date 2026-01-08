# Tool Selector Architecture - Implementation Guide

## ✅ Completed: Steps 1 & 2

### **Step 1: Zustand Store Updated** ✅

Updated `lib/stores/workspaceStore.ts` with new tool selector architecture:

#### Changes Made:

1. **State Properties Updated:**
```typescript
// OLD:
activeTool: ToolCategory | null;

// NEW:
activeToolId: string | null; // Tracks which tool is active in right sidebar
```

2. **Actions Updated:**
```typescript
// Updated signature:
setActiveTool: (toolId: string | null) => void; // Now accepts tool ID string

// New action:
clearActiveTool: () => void; // Clears active tool
```

3. **Implementation:**
```typescript
setActiveTool: (toolId: string | null) => {
  set({ activeToolId: toolId });
  console.log('🔧 Active tool set:', toolId);
  
  // Auto-open right sidebar when a tool is activated
  if (toolId !== null && !get().rightSidebarOpen) {
    set({ rightSidebarOpen: true });
  }
},

clearActiveTool: () => {
  set({ activeToolId: null });
  console.log('🧹 Active tool cleared');
},
```

4. **Persistence Updated:**
```typescript
partialize: (state) => ({
  activeDocument: state.activeDocument,
  leftSidebarOpen: state.leftSidebarOpen,
  rightSidebarOpen: state.rightSidebarOpen,
  activeToolId: state.activeToolId, // Now persists tool ID
  aiAnalysisMode: state.aiAnalysisMode,
}),
```

5. **Selector Hook Updated:**
```typescript
// OLD:
export const useActiveTool = () => useWorkspaceStore((state) => state.activeTool);

// NEW:
export const useActiveToolId = () => useWorkspaceStore((state) => state.activeToolId);
```

---

### **Step 2: Tool Registry System Created** ✅

Created `lib/tools/toolRegistry.ts` - A centralized tool registry system.

#### Features:

##### 1. **ToolConfig Interface**
```typescript
export interface ToolConfig {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  icon: LucideIcon;              // Lucide icon component
  section: ToolSection;          // Section it belongs to
  description: string;           // Short description
  requiresDocument?: boolean;    // Whether it needs a document open
  badge?: string;                // Optional badge (e.g., "NEW", "BETA")
}
```

##### 2. **Registered Tools**

**Optimizer Section:**
- `tone-shifter` - Rewrite copy in different tones (✅ Component exists)
- `clarity-checker` - Analyze readability and clarity
- `grammar-polish` - Fix grammar and style issues

**Templates Section:**
- `template-browser` - Browse copywriting templates
- `custom-templates` - User's saved templates

**Brand Section:**
- `brand-voice` - Maintain brand consistency
- `style-guide` - Apply style rules

**Insights Section:**
- `performance-metrics` - Track copy performance
- `ai-suggestions` - Get improvement ideas (NEW badge)

##### 3. **Section Configuration**
```typescript
export const SECTIONS: SectionConfig[] = [
  {
    id: 'optimizer',
    name: 'Optimizer',
    icon: Target,
    description: 'Improve and refine your copy',
    defaultExpanded: true, // Starts expanded
  },
  // ... other sections
];
```

##### 4. **Helper Functions**
- `getToolById(id)` - Get tool by ID
- `getToolsBySection(section)` - Get all tools in a section
- `getSectionById(id)` - Get section configuration
- `toolRequiresDocument(toolId)` - Check if tool needs document
- `getAllToolIds()` - Get all tool IDs
- `isValidToolId(toolId)` - Validate tool ID
- `isValidSectionId(sectionId)` - Validate section ID

---

## 🎯 Target UX Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                          Toolbar                                │
├────────────────────┬────────────────────┬────────────────────────┤
│                    │                    │                        │
│  LEFT SIDEBAR      │   EDITOR AREA     │   RIGHT SIDEBAR        │
│  (Tool Selector)   │                    │   (Active Tool)        │
│                    │                    │                        │
│ ▼ OPTIMIZER        │  [TipTap Editor]  │  AI@Worx™ Analysis    │
│  • Tone Shifter ◀──┼────────────────────┼─► [Tone Shifter UI]   │
│  • Clarity Checker │   Document Title   │                        │
│  • Grammar Polish  │   Editor Content   │   When user clicks    │
│                    │   Word Count       │   a tool in left,     │
│ ▶ TEMPLATES        │                    │   it appears here     │
│  • Template Browser│                    │                        │
│  • My Templates    │                    │                        │
│                    │                    │                        │
│ ▶ BRAND            │                    │                        │
│  • Brand Voice     │                    │                        │
│  • Style Guide     │                    │                        │
│                    │                    │                        │
│ ▶ INSIGHTS         │                    │                        │
│  • Performance     │                    │                        │
│  • AI Suggestions  │                    │                        │
│                    │                    │                        │
└────────────────────┴────────────────────┴────────────────────────┘
```

---

## 📋 Next Steps (TODO)

### **Step 3: Create Tool Components**

You'll need to create placeholder components for all tools (except ToneShifter which exists):

1. **Create components for each tool:**
   - `components/tools/ClarityChecker.tsx`
   - `components/tools/GrammarPolish.tsx`
   - `components/tools/TemplateBrowser.tsx`
   - `components/tools/CustomTemplates.tsx`
   - `components/tools/BrandVoice.tsx`
   - `components/tools/StyleGuide.tsx`
   - `components/tools/PerformanceMetrics.tsx`
   - `components/tools/AISuggestions.tsx`

2. **Each component should:**
   - Accept `editor: Editor | null` prop
   - Have a consistent header/title
   - Show placeholder UI ("Coming Soon" or basic implementation)
   - Follow the same styling as ToneShifter

---

### **Step 4: Update Left Sidebar**

Update `app/copyworx/workspace/page.tsx` - `LeftSidebarContent` component:

1. **Import tool registry:**
```typescript
import { SECTIONS, getToolsBySection } from '@/lib/tools';
```

2. **Use collapsible sections:**
```typescript
function LeftSidebarContent() {
  const { activeToolId, setActiveTool } = useWorkspaceStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['optimizer']) // Optimizer starts expanded
  );
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };
  
  return (
    <div className="space-y-2">
      {SECTIONS.map((section) => {
        const tools = getToolsBySection(section.id);
        const isExpanded = expandedSections.has(section.id);
        
        return (
          <div key={section.id}>
            {/* Section Header - Collapsible */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-100 rounded"
            >
              <div className="flex items-center gap-2">
                <section.icon className="w-4 h-4" />
                <span className="font-medium text-sm">{section.name}</span>
              </div>
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </button>
            
            {/* Tools in Section */}
            {isExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={cn(
                      'w-full text-left p-2 rounded',
                      activeToolId === tool.id 
                        ? 'bg-apple-blue text-white' 
                        : 'hover:bg-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <tool.icon className="w-4 h-4" />
                      <span className="text-sm">{tool.name}</span>
                      {tool.badge && (
                        <Badge className="ml-auto">{tool.badge}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

### **Step 5: Update Right Sidebar**

Update `app/copyworx/workspace/page.tsx` - `RightSidebarContent` component:

1. **Import all tool components:**
```typescript
import { ToneShifter } from '@/components/workspace';
import { ClarityChecker } from '@/components/tools/ClarityChecker';
import { GrammarPolish } from '@/components/tools/GrammarPolish';
// ... etc
```

2. **Create tool component map:**
```typescript
const TOOL_COMPONENTS: Record<string, React.ComponentType<{ editor: Editor | null }>> = {
  'tone-shifter': ToneShifter,
  'clarity-checker': ClarityChecker,
  'grammar-polish': GrammarPolish,
  'template-browser': TemplateBrowser,
  'custom-templates': CustomTemplates,
  'brand-voice': BrandVoice,
  'style-guide': StyleGuide,
  'performance-metrics': PerformanceMetrics,
  'ai-suggestions': AISuggestions,
};
```

3. **Dynamically render active tool:**
```typescript
function RightSidebarContent({ editor }: { editor: Editor | null }) {
  const activeToolId = useActiveToolId();
  const activeDocument = useWorkspaceStore((state) => state.activeDocument);
  
  // Get the active tool component
  const ActiveToolComponent = activeToolId ? TOOL_COMPONENTS[activeToolId] : null;
  
  return (
    <div className="space-y-6">
      {/* Header - Always Shows "AI@Worx™ Analysis" */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-apple-blue" />
        <h2 className="text-lg font-semibold text-apple-text-dark">
          AI@Worx™ Analysis
        </h2>
      </div>
      
      {/* Active Tool Area */}
      {!activeDocument ? (
        <div className="text-center py-12 text-gray-400">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Open a document to use AI tools</p>
        </div>
      ) : !ActiveToolComponent ? (
        <div className="text-center py-12 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a tool from the left sidebar</p>
        </div>
      ) : (
        <ActiveToolComponent editor={editor} />
      )}
    </div>
  );
}
```

---

## 🎨 UI Flow

### User Interaction:
1. **User opens workspace** → No tool selected, right sidebar shows "Select a tool"
2. **User clicks "Optimizer" section** → Section expands, shows 3 tools
3. **User clicks "Tone Shifter"** → ToneShifter appears in right sidebar
4. **User clicks "Clarity Checker"** → Right sidebar switches to Clarity Checker
5. **User clicks "Templates" section** → Templates section expands, Optimizer stays open
6. **User clicks "Template Browser"** → Right sidebar switches to Template Browser

### State Management:
- `activeToolId` - Stored in Zustand, persisted to localStorage
- `expandedSections` - Local state in LeftSidebarContent (not persisted)
- Right sidebar always shows header "AI@Worx™ Analysis"
- Active tool component dynamically rendered based on `activeToolId`

---

## 📊 Benefits of This Architecture

✅ **Scalable** - Easy to add new tools, just register in `toolRegistry.ts`  
✅ **Organized** - Tools grouped into logical sections  
✅ **Discoverable** - Users can browse all tools in left sidebar  
✅ **Flexible** - Each tool is an independent component  
✅ **Type-safe** - Full TypeScript support  
✅ **Persistent** - Active tool persists across sessions  
✅ **Lazy-loadable** - Can implement code splitting for tools later  

---

## 🚀 Files Created/Modified

### ✅ **Created:**
1. `lib/tools/toolRegistry.ts` - Tool registry system (252 lines)
2. `lib/tools/index.ts` - Barrel export
3. `TOOL_SELECTOR_ARCHITECTURE.md` - This guide

### ✅ **Modified:**
1. `lib/stores/workspaceStore.ts` - Updated with `activeToolId` and `clearActiveTool`

### 📋 **TODO (Next Steps):**
1. Create placeholder tool components (8 components)
2. Update LeftSidebarContent with collapsible sections
3. Update RightSidebarContent with dynamic tool rendering
4. Test the complete flow

---

## 💡 Quick Start for Next Steps

1. **Create placeholder components:**
```bash
mkdir -p components/tools
touch components/tools/ClarityChecker.tsx
touch components/tools/GrammarPolish.tsx
# ... create others
```

2. **Each placeholder should look like:**
```typescript
export function ClarityChecker({ editor }: { editor: Editor | null }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Clarity Checker</h3>
      <p className="text-sm text-gray-600">
        Analyze readability and clarity of your copy.
      </p>
      <div className="p-8 text-center bg-gray-50 rounded-lg">
        <p className="text-gray-400">Coming Soon</p>
      </div>
    </div>
  );
}
```

3. **Update workspace page** - Follow Step 4 & 5 above

---

**You're now ready to implement the complete tool selector UI!** 🎉

The foundation is solid - just need to create the components and update the sidebar rendering logic.
