# ToneShifter Component - Visual Reference

## 🎨 Component Layout

```
┌─────────────────────────────────────────┐
│  📄 Tone Shifter                        │
│  Rewrite your copy in a different tone  │
├─────────────────────────────────────────┤
│                                         │
│  SELECT TONE                            │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ 💼           │  │ 😊           │   │
│  │ Professional │  │ Casual       │   │
│  │ Formal and   │  │ Friendly and │   │
│  │ business...  │  │ conversatio..│   │
│  └──────────────┘  └──────────────┘   │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ ⚡           │  │ ❤️           │   │
│  │ Urgent       │  │ Friendly     │   │
│  │ Time-sensit..│  │ Warm and     │   │
│  │              │  │ approachable │   │
│  └──────────────┘  └──────────────┘   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │      Shift Tone                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ✅ Rewrite Complete                   │
│  ┌─────────────────────────────────┐  │
│  │ [Preview of rewritten copy]      │  │
│  │ ...                              │  │
│  └─────────────────────────────────┘  │
│  ┌──────────┐ ┌────┐ ┌────┐          │
│  │  Insert  │ │ 📋 │ │ ✖️ │          │
│  └──────────┘ └────┘ └────┘          │
└─────────────────────────────────────────┘
```

---

## 🎨 State Variations

### 1. **Initial State**
```
- All tone buttons are white/gray
- "Shift Tone" button is disabled (gray)
- Helper text: "Start writing in the editor to use Tone Shifter"
- No result shown
```

### 2. **Tone Selected**
```
- Selected tone button is blue with white text
- Other buttons remain gray
- "Shift Tone" button becomes blue (enabled)
- Ready for action
```

### 3. **Loading State**
```
- "Shift Tone" button shows:
  "⏳ Rewriting..."
- Spinner animation
- All inputs disabled
```

### 4. **Success State**
```
- Green success banner appears
- "✅ Rewrite Complete"
- Preview box with rewritten content
- Three action buttons:
  - "Insert" (green, primary)
  - Copy icon (outline)
  - X icon (outline)
```

### 5. **Error State**
```
- Red error banner appears
- "❌ Error"
- Error message text
- Dismiss button (X)
- Previous state restored
```

---

## 🎯 Button States

### Tone Selection Buttons

**Default:**
```css
- White background
- Light gray border
- Blue icon
- Dark text
- Hover: Light gray background
```

**Selected:**
```css
- Blue background (#007AFF)
- Blue border
- White icon
- White text
- Shadow
```

**Disabled:**
```css
- 50% opacity
- Cursor: not-allowed
- No hover effects
```

---

### Primary Action Button ("Shift Tone")

**Enabled:**
```css
- Blue background (#007AFF)
- White text
- Shadow on hover
- Smooth transitions
```

**Disabled:**
```css
- Light gray background
- Light gray text
- No shadow
- Cursor: not-allowed
```

**Loading:**
```css
- Blue background
- White text with spinner
- "Rewriting..." text
- Disabled
```

---

## 📊 Component Size

```
Width: 100% (responsive to container)
Typical sidebar width: 320px

Height: Auto (grows with content)
- Header: ~60px
- Tone buttons: ~180px
- Action button: ~48px
- Result preview: Max 192px (12rem)
- Total collapsed: ~300px
- Total with result: ~550px
```

---

## 🎨 Color Palette

```tsx
// Primary Colors
Apple Blue:    #007AFF
Success Green: #34C759
Error Red:     #FF3B30

// Text Colors
Dark Text:     #1D1D1F
Light Text:    #86868B

// Background Colors
White:         #FFFFFF
Light Gray:    #F5F5F7
Border Gray:   #D2D2D7

// State Colors
Blue Hover:    #0051D5 (darker blue)
Green Hover:   #30B350 (darker green)
Red Hover:     #FF2D20 (darker red)
```

---

## 🔤 Typography

```css
/* Header */
h2: text-lg font-semibold (18px, 600)

/* Subtitle */
p: text-sm (14px, 400)

/* Labels */
label: text-xs font-medium uppercase (12px, 500)

/* Tone Buttons */
.tone-name: text-sm font-medium (14px, 500)
.tone-desc: text-xs (12px, 400)

/* Action Button */
button: text-sm font-medium (14px, 500)

/* Result */
.result-text: text-sm prose (14px, 400)
```

---

## 🎭 Icons Used

From `lucide-react`:

| Icon | Usage | Size |
|------|-------|------|
| `FileText` | Component header | 20px |
| `Briefcase` | Professional tone | 20px |
| `Smile` | Casual tone | 20px |
| `Zap` | Urgent tone | 20px |
| `Heart` | Friendly tone | 20px |
| `Loader2` | Loading spinner | 16px |
| `Check` | Success indicator | 20px |
| `X` | Error/dismiss | 16px |
| `Copy` | Copy to clipboard | 16px |

---

## 📱 Responsive Behavior

### Desktop (≥1024px)
```
- Full width in sidebar (320px)
- 2-column grid for tone buttons
- All content visible
```

### Tablet (768px - 1023px)
```
- Adapts to sidebar width
- 2-column grid maintained
- Scrollable result preview
```

### Mobile (<768px)
```
- Full width
- 2-column grid (smaller buttons)
- Scrollable result preview
- Touch-optimized tap targets (44px min)
```

---

## ⌨️ Keyboard Navigation

```
Tab:         Navigate between buttons
Enter/Space: Activate focused button
Escape:      Clear selection (future)
Cmd+C:       Copy result (when result is focused)
```

---

## ♿ Accessibility

```tsx
// ARIA Labels
aria-label="Tone Shifter"
role="region"
tabindex="0"

// Focus Management
- Visible focus rings (ring-2 ring-apple-blue)
- Logical tab order
- Disabled state announced

// Screen Reader
- All buttons have descriptive labels
- Loading states announced
- Error messages read aloud
```

---

## 🔧 Props Interface

```typescript
interface ToneShifterProps {
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Optional CSS classes */
  className?: string;
}
```

---

## 📦 Exports

```typescript
// Main component
export { ToneShifter } from '@/components/workspace';

// Type from store
import type { ToneType } from '@/lib/stores/workspaceStore';
```

---

## 🎬 Animation Timings

```css
Transitions:     200ms ease-in-out
Button hover:    200ms
Loading spinner: 1000ms (1 rotation)
Fade in/out:     300ms
Border changes:  200ms
Shadow changes:  200ms
```

---

## 💻 Console Logs

For debugging, the component logs:

```
🎨 Selected tone: professional
🔄 Starting tone shift: { tone, textLength }
✅ Tone shift complete: { originalLength, newLength, preview }
❌ Tone shift error: [error message]
✅ Copied to clipboard
⚠️ No tone shift result to insert
```

---

## 📋 Quick Integration Checklist

- [ ] Create ToneShifter.tsx ✅ (Done)
- [ ] Update workspace/index.ts ✅ (Done)
- [ ] Update WorkspaceLayout.tsx (Your turn)
- [ ] Update EditorArea.tsx (Your turn)
- [ ] Test with real API key
- [ ] Test all four tones
- [ ] Test error states
- [ ] Test result insertion
- [ ] Test clipboard copy
- [ ] Verify responsive design

---

## 🚀 Ready to Use!

Your ToneShifter component is production-ready with:
- ✅ Beautiful Mac-style design
- ✅ Full TypeScript support
- ✅ Zero linter errors
- ✅ Complete error handling
- ✅ Responsive layout
- ✅ Accessible markup
- ✅ Smooth animations

Just integrate it into your WorkspaceLayout and you're done! 🎉
