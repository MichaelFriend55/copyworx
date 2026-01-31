# MY PROJECTS Hierarchy - Visual Guide

## 📊 Complete Project Hierarchy Structure

```
MY PROJECTS Panel
├─ 🔍 Search bar
├─ ➕ New Project button
│
└─ 📁 Project Name (Active) [3 docs] 🖊️ 🗑️
    │
    ├─ 📁 Folder Name [2] 🖊️ 🗑️ ➕
    │  ├─ 📄 Document 1 🖊️ 🗑️
    │  └─ 📄 Document 2 🖊️ 🗑️
    │
    ├─ 📄 Root Document 1 🖊️ 🗑️
    ├─ 📄 Root Document 2 🖊️ 🗑️
    │
    ├─ ✂️ Snippets [3] ➕
    │  ├─ Snippet 1 📋 🖊️ 🗑️
    │  ├─ Snippet 2 📋 🖊️ 🗑️
    │  └─ Snippet 3 📋 🖊️ 🗑️
    │
    ├─ 🔊 Brand Voice [1]        ← NEW SECTION
    │  └─ Acme Corp [Current]
    │     "Professional, friendly..."
    │
    └─ 👥 Personas [2]            ← NEW SECTION
       ├─ Sarah, the Founder
       │  "Age 28-35, Tech-savvy..."
       └─ John, the Manager
          "Age 35-45, Decision maker..."
```

## 🎨 Color Themes by Section

### Documents & Folders
**Color:** Gray/Blue  
**Icon:** 📄 FileText, 📁 Folder  
**Styling:**
- Border: `border-gray-200`
- Hover: `hover:bg-gray-50`
- Active: `bg-blue-50 border-blue-200`

### Snippets
**Color:** Purple  
**Icon:** ✂️ Scissors  
**Styling:**
- Border: `border-l-2 border-purple-200`
- Hover: `hover:bg-purple-50`
- Badge: `bg-purple-100 text-purple-500`

### Brand Voice ✨ NEW
**Color:** Blue  
**Icon:** 🔊 Volume2  
**Styling:**
- Border: `border-l-2 border-blue-200`
- Hover: `hover:bg-blue-50 border-blue-200`
- Badge: `bg-blue-100 text-blue-500`
- Current: `bg-blue-100 text-blue-600`

### Personas ✨ NEW
**Color:** Purple  
**Icon:** 👥 Users, 👤 User  
**Styling:**
- Border: `border-l-2 border-purple-200`
- Hover: `hover:bg-purple-50 border-purple-200`
- Badge: `bg-purple-100 text-purple-500`

## 📋 Section Details

### 1. Brand Voice Section

#### Header
```
┌────────────────────────────────┐
│ ▼ 🔊 Brand Voice          [1] │ ← Collapsible
└────────────────────────────────┘
```

#### With Brand Voice
```
┌────────────────────────────────┐
│ 🔊 Acme Corp [Current]         │ ← Clickable
│    Professional, friendly...   │
└────────────────────────────────┘
```

#### Empty State
```
┌────────────────────────────────┐
│    No brand voice set          │
│    + Set brand voice           │ ← Clickable button
└────────────────────────────────┘
```

### 2. Personas Section

#### Header
```
┌────────────────────────────────┐
│ ▼ 👥 Personas             [2] │ ← Collapsible
└────────────────────────────────┘
```

#### With Personas
```
┌────────────────────────────────┐
│ 👤 Sarah, the Founder          │ ← Clickable
│    Age 28-35, Tech-savvy...    │
├────────────────────────────────┤
│ 👤 John, the Manager           │ ← Clickable
│    Age 35-45, Decision maker...│
└────────────────────────────────┘
```

#### Empty State
```
┌────────────────────────────────┐
│      No personas yet           │
│  + Add your first persona      │ ← Clickable button
└────────────────────────────────┘
```

## 🔄 Navigation Flow

### Brand Voice Navigation
```
MY PROJECTS
    └─ Expand Project
        └─ Click "Brand Voice" section
            └─ Click brand voice name
                └─ Brand Voice Slide-out opens
                    └─ View/Edit brand voice
                        └─ Save changes
                            └─ Close panel
                                └─ MY PROJECTS updates
```

### Personas Navigation
```
MY PROJECTS
    └─ Expand Project
        └─ Click "Personas" section
            └─ Click any persona name
                └─ Personas Slide-out opens
                    └─ View/Edit personas
                        └─ Save changes
                            └─ Close panel
                                └─ MY PROJECTS updates
```

## 🔍 Search Integration

### Search for "Sarah"
```
MY PROJECTS (Search: "Sarah")
└─ 📁 Project Name
    ├─ 📄 Documents       ← Hidden (no match)
    ├─ ✂️ Snippets        ← Hidden (no match)
    ├─ 🔊 Brand Voice    ← Hidden (no match)
    └─ 👥 Personas [1]
       └─ Sarah, the Founder ← SHOWN (matches)
```

### Search for "Acme"
```
MY PROJECTS (Search: "Acme")
└─ 📁 Project Name
    ├─ 📄 Documents       ← Hidden (no match)
    ├─ ✂️ Snippets        ← Hidden (no match)
    ├─ 🔊 Brand Voice [1]
    │  └─ Acme Corp ← SHOWN (matches)
    └─ 👥 Personas        ← Hidden (no match)
```

## 🎯 Interactive Elements

### Hover States

#### Brand Voice Row
```
Normal:
┌────────────────────────────────┐
│ 🔊 Acme Corp [Current]         │
│    Professional, friendly...   │
└────────────────────────────────┘

Hover:
┌────────────────────────────────┐
│ 🔊 Acme Corp [Current]         │ ← bg-blue-50
│    Professional, friendly...   │    border-blue-200
└────────────────────────────────┘
```

#### Persona Row
```
Normal:
┌────────────────────────────────┐
│ 👤 Sarah, the Founder          │
│    Age 28-35, Tech-savvy...    │
└────────────────────────────────┘

Hover:
┌────────────────────────────────┐
│ 👤 Sarah, the Founder          │ ← bg-purple-50
│    Age 28-35, Tech-savvy...    │    border-purple-200
└────────────────────────────────┘
```

### Collapsible States

#### Expanded
```
▼ 🔊 Brand Voice [1]      ← Chevron down
  └─ Acme Corp [Current]
     "Professional..."
```

#### Collapsed
```
▶ 🔊 Brand Voice [1]      ← Chevron right
```

## 📐 Layout Measurements

### Indentation
```
Project Header:        0px left padding
├─ Folders:           20px indent (ml-2 pl-2)
├─ Documents:         20px indent
├─ Snippets:          20px indent + 2px border
├─ Brand Voice:       20px indent + 2px border ← NEW
└─ Personas:          20px indent + 2px border ← NEW
```

### Spacing
```
Between sections:     mt-2 (8px)
Within section:       space-y-1 (4px)
Padding horizontal:   px-3 (12px)
Padding vertical:     py-2.5 (10px)
```

### Typography
```
Section Header:
- Font: font-semibold
- Size: text-sm (14px)
- Color: text-[color]-900

Item Name:
- Font: font-medium
- Size: text-sm (14px)
- Color: text-gray-900

Preview Text:
- Font: font-normal
- Size: text-xs (12px)
- Color: text-gray-500

Count Badge:
- Font: font-normal
- Size: text-xs (12px)
- Padding: px-2 py-0.5
```

## 🎨 Complete Visual Examples

### Project with Everything
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ MY PROJECTS                     ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🔍 Search documents...          ┃
┃                                 ┃
┃ ➕ New Project                  ┃
┃                                 ┃
┃ ▼ 📁 My Project [Active] [5]   ┃ ← Expanded
┃   │                             ┃
┃   ├─ ▼ 📁 Marketing [2]         ┃
┃   │  ├─ 📄 Email Campaign       ┃
┃   │  └─ 📄 Social Posts         ┃
┃   │                             ┃
┃   ├─ 📄 Homepage Copy           ┃
┃   ├─ 📄 About Page              ┃
┃   ├─ 📄 Product Description     ┃
┃   │                             ┃
┃   ├─ ▼ ✂️ Snippets [3]          ┃
┃   │  ├─ CTA Button              ┃
┃   │  ├─ Footer Text             ┃
┃   │  └─ Legal Disclaimer        ┃
┃   │                             ┃
┃   ├─ ▼ 🔊 Brand Voice [1]       ┃ ← NEW
┃   │  └─ Acme Corp [Current]    ┃
┃   │     Professional, friendly  ┃
┃   │                             ┃
┃   └─ ▼ 👥 Personas [2]          ┃ ← NEW
┃      ├─ Sarah, the Founder      ┃
┃      │  Age 28-35, Tech-savvy   ┃
┃      └─ John, the Manager       ┃
┃         Age 35-45, Decision...  ┃
┃                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### Project with No Brand Voice/Personas
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ▼ 📁 New Project [Active] [1]   ┃
┃   │                             ┃
┃   ├─ 📄 Untitled Document       ┃
┃   │                             ┃
┃   ├─ ▼ ✂️ Snippets              ┃
┃   │     No snippets yet         ┃
┃   │     + Add your first...     ┃
┃   │                             ┃
┃   ├─ ▼ 🔊 Brand Voice           ┃
┃   │     No brand voice set      ┃
┃   │     + Set brand voice       ┃
┃   │                             ┃
┃   └─ ▼ 👥 Personas              ┃
┃         No personas yet         ┃
┃         + Add your first...     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## 🔗 Integration Points

### Opens Brand Voice Panel
```
MY PROJECTS → Brand Voice section → Click brand name
        ↓
BRAND & AUDIENCE → Brand Voice slide-out
        ↓
View/Edit brand voice settings
        ↓
Save changes
        ↓
Changes reflected in MY PROJECTS
```

### Opens Personas Panel
```
MY PROJECTS → Personas section → Click persona name
        ↓
BRAND & AUDIENCE → Personas slide-out
        ↓
View/Edit persona details
        ↓
Save changes
        ↓
Changes reflected in MY PROJECTS
```

## ✅ Quality Checklist

Visual consistency with existing sections:
- [ ] Same indentation as Snippets
- [ ] Same border style (2px left border)
- [ ] Same hover effects
- [ ] Same typography scale
- [ ] Same padding and spacing
- [ ] Same icon sizing
- [ ] Same badge styling
- [ ] Same empty state format

Functional requirements:
- [ ] Sections only show when project expanded
- [ ] Click opens appropriate slide-out panel
- [ ] Search filtering works correctly
- [ ] Collapsible headers work
- [ ] Empty states show call-to-action
- [ ] Count badges show correct numbers
- [ ] Data syncs with slide-out panels

## 🎯 Key Features Summary

✨ **Brand Voice Section:**
- Shows assigned brand voice
- Displays name + tone preview
- "Current" badge indicator
- Click to open Brand Voice panel
- Blue color theme
- Empty state with action button

✨ **Personas Section:**
- Lists all project personas
- Displays name + demographics
- Shows persona photo if available
- Click to open Personas panel
- Purple color theme
- Count badge shows total
- Empty state with action button

✨ **Shared Features:**
- Search integration
- Collapsible headers
- Consistent styling
- Smooth navigation
- Real-time updates
