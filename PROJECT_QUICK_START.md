# PROJECT SYSTEM - QUICK START GUIDE

## 🚀 What Changed?

CopyWorx now has a **project-based architecture**. Every brand voice, persona, and document belongs to a project.

---

## 📍 Where to Find It

**Left Sidebar → MY PROJECTS Section**

```
┌─────────────────────────────┐
│ ▼ MY PROJECTS               │
│   ┌─────────────────────┐   │
│   │ 📁 My First Project ▼│   │ ← Click to switch projects
│   └─────────────────────┘   │
│   Documents & Folders...    │
└─────────────────────────────┘
```

---

## 🎯 Quick Actions

### Create New Project
1. Click project dropdown
2. Click "+ New Project" at bottom
3. Enter name → "Create Project"

### Switch Projects
1. Click project dropdown
2. Click any project name
3. Brand voice loads automatically

### Rename Project
1. Hover over project in dropdown
2. Click pencil icon (✏️)
3. Edit → Press Enter

### Delete Project
1. Hover over project in dropdown
2. Click trash icon (🗑️)
3. Confirm (cannot delete last project)

---

## 💡 Key Concepts

### Each Project Has:
- ✅ Its own **Brand Voice**
- ✅ Its own **Personas** (coming soon)
- ✅ Its own **Documents** (coming soon)

### Projects Are:
- ✅ **Isolated** - Changes in one don't affect others
- ✅ **Persistent** - Saved to localStorage
- ✅ **Switchable** - Change active project anytime

---

## 🔧 For Developers

### Import Project Functions
```typescript
// Get current project
import { getCurrentProject } from '@/lib/utils/project-utils';
const project = getCurrentProject();

// Create project
import { createAndActivateProject } from '@/lib/utils/project-utils';
const newProject = createAndActivateProject('Project Name');

// Use in components
import { useProjects, useActiveProjectId } from '@/lib/stores/workspaceStore';
const projects = useProjects();
const activeId = useActiveProjectId();
```

### Storage Keys
- `copyworx_projects` - Array of all projects
- `copyworx_active_project_id` - Currently active project ID

### Migration
Legacy brand voice data is automatically migrated to "My First Project" on first load.

---

## 📝 Brand Voice Workflow

### Before (Old System)
```
Save Brand Voice → localStorage['copyworx-brand-voice']
```

### After (New System)
```
Select Project → Save Brand Voice → Project.brandVoice
```

**Each project has its own brand voice!**

---

## ⚠️ Important Notes

1. **At least one project must exist** - Cannot delete last project
2. **Active project persists** - Reloading page keeps active project
3. **Brand voices are separate** - Each project has its own
4. **Migration is automatic** - Old data moves to default project

---

## 🐛 Troubleshooting

### No projects showing?
- Check browser console for errors
- Verify localStorage is enabled
- Try refreshing the page

### Brand voice not loading?
- Make sure you have an active project selected
- Check that brand voice was saved to current project
- Try switching to another project and back

### Can't delete project?
- You must have at least one project
- Cannot delete the last remaining project

---

## 🎉 What's Next?

With projects in place, we can now build:
- 📝 **Documents** - Multiple docs per project
- 👥 **Personas** - Target audience profiles
- 📋 **Templates** - Project-specific templates
- 🤝 **Collaboration** - Share projects with team

---

**Ready to use!** The project system is live and working. 🚀
