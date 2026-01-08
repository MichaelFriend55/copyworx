# 🚀 CopyWorx v2 - Quick Start Guide

## ⚡ Get Started in 30 Seconds

### 1. Development Server is Running ✅
```
✓ Next.js 14.0.4
✓ Local: http://localhost:3000
✓ Ready in 2.2s
```

### 2. Open Your Browser
Navigate to: **http://localhost:3000/copyworx**

---

## 🎨 What You'll See

### Page 1: Splash Page (Route `/copyworx`)

```
┌─────────────────────────────────────────┐
│                                         │
│            [Logo Icon]                  │
│                                         │
│        CopyWorx™ Studio                 │
│     AI-Powered Writing Suite            │
│                                         │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐   │
│  │ New │  │AI@  │  │Imprt│  │Open │   │
│  │     │  │Worx™│  │     │  │.cwx │   │
│  └─────┘  └─────┘  └─────┘  └─────┘   │
│                                         │
│   Press ⌘ + N for new document          │
│                                         │
└─────────────────────────────────────────┘
```

**What to Do:**
- Click **"New"** to create a blank document
- Click **"AI@Worx™"** to see template selector (future)
- Click **"Import"** to import files (future)
- Click **"Open .cwx"** to open CopyWorx files (future)

---

### Page 2: Workspace (`/copyworx/workspace`)

```
┌──────────────────────────────────────────────────────────────────┐
│ Toolbar: [Projects] [Save] [↶] [↷]  CopyWorx™  [AI@Worx™] [⚙]  │
├─────────────┬──────────────────────────────┬────────────────────┤
│             │                              │                    │
│ Left        │     Center Editor            │    Right           │
│ Sidebar     │                              │    Sidebar         │
│             │  ┌────────────────────────┐  │                    │
│ Tools:      │  │                        │  │  AI@Worx™          │
│ • Templates │  │   Untitled Document    │  │  Analysis          │
│ • Optimizer │  │   ─────────────────    │  │                    │
│ • Brand     │  │                        │  │  • Emotional       │
│ • Insights  │  │   Start writing...     │  │  • Persona         │
│             │  │                        │  │  • Brand Voice     │
│             │  └────────────────────────┘  │                    │
│             │                              │                    │
│ [◀]         │                              │         [▶]        │
└─────────────┴──────────────────────────────┴────────────────────┘
```

**Features:**
- **Toolbar**: File operations, undo/redo, AI toggle
- **Left Sidebar**: Tools and templates (click to expand)
- **Center**: Your document with white paper effect
- **Right Sidebar**: AI analysis modes (click to activate)
- **Toggle Buttons**: Small circular buttons on sidebar edges

---

## 🎮 Interactive Elements

### Toolbar Actions
| Button | Action | Shortcut |
|--------|--------|----------|
| Projects | Back to projects | - |
| Save | Save document | ⌘S |
| Undo | Undo last change | ⌘Z |
| Redo | Redo change | ⌘⇧Z |
| AI@Worx™ | Toggle AI analysis | - |
| Settings | Open settings | - |

### Sidebar Controls
- **[◀]** / **[▶]** buttons: Click to collapse/expand sidebars
- **Smooth animation**: 300ms slide transition
- **State persists**: Sidebar state saved to localStorage

### Document Editing
- **Title**: Click to edit document title
- **Content**: Type in the white paper area
- **Auto-updates**: Word count and character count update live
- **Last edited**: Timestamp updates on every change

### Tool Selection (Left Sidebar)
- **Templates**: Browse copywriting templates
- **Optimizer**: Improve your copy
- **Brand Voice**: Maintain consistency
- **Insights**: Performance analytics

### AI Analysis (Right Sidebar)
- **Emotional**: Analyze emotional tone
- **Persona**: Match target audience
- **Brand**: Check voice consistency

---

## 🎯 Try These Actions

### Test 1: Create a Document
1. Go to http://localhost:3000/copyworx
2. Click **"New"** button
3. You'll be taken to `/copyworx/workspace` with a blank document
4. Type something in the title
5. Start writing in the content area
6. Watch word count update in real-time

### Test 2: Toggle Sidebars
1. In workspace, find the small round buttons on sidebar edges
2. Click left sidebar toggle **[◀]** - sidebar slides closed
3. Click again **[▶]** - sidebar slides open
4. Try the same with right sidebar
5. Refresh page - sidebar states are remembered!

### Test 3: Select a Tool
1. In left sidebar, click **"Templates"**
2. Button turns blue (Apple accent)
3. Click **"Optimizer"** - selection changes
4. State is preserved even if you refresh

### Test 4: Enable AI Analysis
1. Click **"AI@Worx™"** button in toolbar (top right)
2. Right sidebar auto-opens
3. Click **"Emotional"** analysis mode
4. Button turns blue to show it's active
5. Analysis results area appears (placeholder for now)

---

## 🎨 Visual Features to Notice

### Apple Aesthetic
- ✨ Clean white sidebars with subtle shadows
- ✨ Dark slate background (#2F3542) for editor
- ✨ Bright white "paper" in center
- ✨ Apple blue (#0071E3) accent color
- ✨ Smooth 300ms transitions everywhere

### Interactions
- ✨ Hover effects on all buttons
- ✨ Blue focus rings for accessibility
- ✨ Smooth slide animations on sidebars
- ✨ Active state highlighting
- ✨ Custom scrollbars on sidebars

### Typography
- ✨ Inter font for UI elements
- ✨ Clean, readable text
- ✨ Proper spacing and hierarchy

---

## 📱 Responsive Design

### Desktop (>1024px)
- Three columns visible
- Sidebars at full width (280px / 320px)
- Comfortable reading width

### Tablet (768px - 1024px)
- Sidebars may start collapsed
- Editor takes center focus
- Toggle buttons prominent

### Mobile (<768px)
- Single column layout
- Sidebars stack vertically
- Full-width editor
- Touch-friendly buttons

---

## 🔍 Developer Tools

### Zustand DevTools
1. Open browser DevTools (F12)
2. Look for Redux tab (if you have Redux DevTools extension)
3. See all state changes in real-time
4. Time-travel debugging available

### State Inspection
```javascript
// In browser console, check localStorage:
localStorage.getItem('copyworx-workspace')
// You'll see persisted state JSON
```

### React DevTools
1. Install React DevTools extension
2. Inspect component tree
3. See props and state
4. Profile performance

---

## 🎉 You're All Set!

**✅ Server Running**: http://localhost:3000/copyworx
**✅ TypeScript**: Zero errors
**✅ Linter**: Zero errors
**✅ Build**: Successful

### What's Working:
- ✅ Splash page with 4 action buttons
- ✅ Workspace with three-column layout
- ✅ Collapsible sidebars with smooth animations
- ✅ Document creation and editing
- ✅ Real-time word/character count
- ✅ Tool and AI mode selection
- ✅ State persistence (localStorage)
- ✅ Apple-style aesthetic
- ✅ Responsive design

### What's Next (Future Phases):
- ⏳ TipTap rich text editor
- ⏳ Claude AI integration
- ⏳ Template library
- ⏳ File import/export
- ⏳ Collaboration features

---

## 💡 Pro Tips

1. **Keyboard Navigation**: Tab through all interactive elements
2. **State Persistence**: Your work is automatically saved to localStorage
3. **Sidebar Toggle**: Use the circular buttons on sidebar edges
4. **Document Editing**: Title and content auto-save to store
5. **Multiple Documents**: Create multiple docs (future: switch between them)

---

## 🆘 Troubleshooting

### Nothing showing up?
- Check console for errors (F12)
- Verify server is running at http://localhost:3000
- Try hard refresh (⌘⇧R or Ctrl+Shift+R)

### Sidebars won't toggle?
- Check Zustand store in React DevTools
- Clear localStorage and refresh

### Styles look wrong?
- Ensure Tailwind CSS is compiling
- Check for CSS conflicts in globals.css

---

## 📖 Further Reading

- **WORKSPACE_README.md** - Technical documentation
- **IMPLEMENTATION_SUMMARY.md** - Full implementation details
- **Code JSDoc comments** - Inline documentation

---

**Enjoy building with CopyWorx v2! 🎨✨**

*Need help? Check the documentation or inspect component code.*

