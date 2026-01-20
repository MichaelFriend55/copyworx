# Section Headers V2.0 - Visual Reference

**Design:** Horizontal Gradient Rules + Darker Background  
**Date:** January 20, 2026  
**Status:** ✅ Production Ready

---

## 🎨 Header Anatomy

```
┌─────────────────────────────────────────────────┐
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← TOP GRADIENT RULE
│ #006EE6 (blue) ──────────────→ #7A3991 (purple)│   2px high, full width
│                                                 │
│                                                 │
│   ✦  MY PROJECTS                        [→]   │ ← HEADER CONTENT
│                                                 │   bg-gray-100
│                                                 │   uppercase, semibold
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← BOTTOM GRADIENT RULE
│ #006EE6 (blue) ──────────────→ #7A3991 (purple)│   2px high, full width
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📐 Gradient Specification

### Horizontal Gradient Flow

```
LEFT EDGE                                      RIGHT EDGE
   ↓                                               ↓
#006EE6 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ #7A3991
  BLUE     Smooth linear transition         PURPLE
          ────────────────────────────────────→
              (bg-gradient-to-r)
```

### Vertical Positioning

```
┌─────────────────┐
│ TOP: 0px        │ ← before:top-0
│ ════════════    │ ← Top gradient (2px)
│                 │
│ HEADER CONTENT  │ ← Main content area
│                 │
│ ════════════    │ ← Bottom gradient (2px)
│ BOTTOM: 0px     │ ← after:bottom-0
└─────────────────┘
```

---

## 🎨 All Headers Visualized

### LEFT SIDEBAR

#### 1. MY PROJECTS
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                            ║
║   ✦ MY PROJECTS                     [→]   ║
║                                            ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
     │                                    │
     └─ Opens slide-out     Collapse toggle ─┘
```

---

#### 2. MY COPY OPTIMIZER
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                            ║
║   🪄 MY COPY OPTIMIZER              [▼]   ║
║                                            ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
        │
        └─ Collapsible section
           When expanded shows:
           • Tone Shifter
           • Expand
           • Shorten
           • Rewrite for Channel
```

---

#### 3. BRAND & AUDIENCE
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                            ║
║   👥 BRAND & AUDIENCE               [▼]   ║
║                                            ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
        │
        └─ Collapsible section
           When expanded shows:
           • Personas
           • Brand Voice
```

---

#### 4. MY INSIGHTS
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                            ║
║   🎯 MY INSIGHTS                    [▼]   ║
║                                            ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
        │
        └─ Collapsible section
           When expanded shows:
           • Check Brand Alignment
           • Check Persona Alignment
```

---

#### 5. AI@WORX™ LIVE
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                            ║
║   ✨ AI@WORX™ LIVE  [Active]        [▼]  ║
║                                            ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
        │            │               │
        │            │               └─ Collapse toggle
        │            └─ Active/Inactive badge
        └─ Sparkles icon (amber)
```

---

### RIGHT SIDEBAR

#### 6. AI@WORX™ TOOLBOX
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                            ║
║   ✨ AI@WORX™ TOOLBOX                     ║
║                                            ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
        │
        └─ Non-interactive header
           (tool content displays below)
```

---

## 🎨 Color Palette

### Gradient Colors

```
PRIMARY BLUE     TRANSITION     SECONDARY PURPLE
#006EE6    ━━━━━━━━━━━━━━━    #7A3991
rgb(0,110,230)                 rgb(122,57,145)

█████████████████████████████████████████████
Blue ────────────────────────────────→ Purple
```

### Background Colors

```
DEFAULT STATE:
bg-gray-100
#F3F4F6
rgb(243, 244, 246)
█████ Light gray, clearly visible

HOVER STATE:
bg-gray-200
#E5E7EB
rgb(229, 231, 235)
████ Slightly darker gray
```

### Text Colors

```
HEADER TEXT:
text-apple-text-dark / text-gray-900
█ Very dark gray/black

ICONS:
text-apple-text-dark (main icons)
text-gray-400 (chevrons, indicators)
text-amber-500 (AI@Worx Live sparkles)
text-blue-500 (Toolbox sparkles)
```

---

## 📏 Dimensions

### Gradient Rules
```
Top Rule:
  Position: before:top-0
  Height: 2px
  Width: Full width (left-0 right-0)
  
Bottom Rule:
  Position: after:bottom-0
  Height: 2px
  Width: Full width (left-0 right-0)
```

### Header Content
```
Padding:
  Horizontal: px-3 (12px)
  Vertical: py-2.5 (10px)
  
Border Radius: rounded-lg (8px)

Total Height: 
  ~44px (content + padding)
  + 4px (gradients: 2px top + 2px bottom)
  = ~48px total
```

---

## 🎯 States & Interactions

### Default State
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║   ✦ SECTION HEADER              [icon]   ║ ← bg-gray-100
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
```

### Hover State
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║   ✦ SECTION HEADER              [icon]   ║ ← bg-gray-200 (darker)
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
     Smooth transition (200ms)
```

### Focus State (Keyboard Navigation)
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║   ✦ SECTION HEADER              [icon]   ║ ← Blue focus ring
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
     2px blue ring with offset
```

### Expanded State (Collapsible Sections)
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║   ✦ SECTION HEADER              [▼]      ║ ← ChevronDown icon
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
  Content visible below
```

### Collapsed State
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║   ✦ SECTION HEADER              [▶]      ║ ← ChevronRight icon
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
  Content hidden
```

---

## 📱 Responsive Behavior

### Wide Sidebar (320px+)
```
╔══════════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                                  ║
║   ✦ MY PROJECTS                          [→]   ║
║                                                  ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚══════════════════════════════════════════════════╝
  Extra space distributed evenly
  Gradients span full width
```

### Standard Sidebar (280px)
```
╔════════════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                            ║
║   ✦ MY PROJECTS                     [→]   ║
║                                            ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚════════════════════════════════════════════╝
  Perfect fit
  Gradients fully visible
```

### Narrow Sidebar (240px)
```
╔══════════════════════════════════════╗
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                      ║
║   ✦ MY PROJECTS             [→]    ║
║                                      ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
╚══════════════════════════════════════╝
  Text remains readable
  Gradients still span full width
```

---

## 💡 Design Highlights

### 1. Full-Width Gradient Rules
- Span entire sidebar width
- Always visible regardless of screen size
- Create strong visual boundaries
- Blue-to-purple flow is natural and appealing

### 2. Darker Background
- `bg-gray-100` provides clear contrast
- Not too dark (still professional)
- Hover state adds interaction feedback
- Creates "container" effect for header

### 3. Clean Typography
- Uppercase for importance
- Semibold for readability
- Proper letter spacing
- Dark text for maximum contrast

### 4. Brand Colors
- Primary blue (#006EE6) on left
- Secondary purple (#7A3991) on right
- Gradient creates smooth transition
- Reinforces CopyWorx brand identity

### 5. Accessibility
- High contrast text/background
- Clear focus states (blue ring)
- Keyboard navigable
- Screen reader friendly

---

## 🎨 CSS Implementation Summary

```tsx
className={cn(
  // Layout
  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
  
  // Background (darker than v1)
  'bg-gray-100 hover:bg-gray-200 transition-colors duration-200',
  
  // Accessibility
  'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
  
  // Positioning for pseudo-elements
  'relative',
  
  // TOP GRADIENT RULE
  'before:content-[""] before:absolute before:left-0 before:right-0 before:top-0',
  'before:h-[2px]',
  'before:bg-gradient-to-r before:from-[#006EE6] before:to-[#7A3991]',
  
  // BOTTOM GRADIENT RULE
  'after:content-[""] after:absolute after:left-0 after:right-0 after:bottom-0',
  'after:h-[2px]',
  'after:bg-gradient-to-r after:from-[#006EE6] after:to-[#7A3991]'
)}
```

---

## ✨ Visual Excellence Checklist

- ✅ Gradient rules span full width
- ✅ 2px height for clean, crisp lines
- ✅ Blue-to-purple gradient flows left-to-right
- ✅ Darker background for better contrast
- ✅ Smooth hover transitions
- ✅ Consistent styling across all 6 headers
- ✅ Accessible focus states
- ✅ Professional, modern appearance
- ✅ Brand colors integrated beautifully
- ✅ Responsive at all sidebar widths

---

## 🚀 Production Ready

All section headers now feature the refined V2.0 design:

**Horizontal gradient rules** (top & bottom) + **Darker background** = **Superior visual hierarchy**

The implementation is complete, tested, and ready for production use! 🎉

---

**END OF VISUAL REFERENCE**
