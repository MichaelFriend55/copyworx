# CopyWorx QA Testing Checklist

**Date:** _____________  
**Tester:** _____________  
**Environment:** _____________  
**Build/Version:** _____________

---

## 🔐 User Authentication & Onboarding

### Authentication Flow

- [ ] **Test: Sign Up Flow**
  - Steps:
    1. Navigate to `/sign-up`
    2. Create new account with email/password
    3. Verify email if required
  - Expected: Redirected to workspace after successful sign-up
  - ⚠️ **Critical Check**: `/copyworx/*` routes should require authentication (currently public in middleware.ts:29)

- [ ] **Test: Sign In Flow**
  - Steps:
    1. Navigate to `/sign-in`
    2. Enter valid credentials
    3. Click "Sign In"
  - Expected: Redirected to `/copyworx` workspace
  - Watch for: Session persistence across page refreshes

- [ ] **Test: Protected Routes**
  - Steps:
    1. Sign out completely
    2. Try to access `/copyworx` directly
  - Expected: Redirected to `/sign-in`
  - ⚠️ **CRITICAL**: Currently `/copyworx` is public - this test will FAIL until fixed

- [ ] **Test: Sign Out**
  - Steps:
    1. Click sign out button
    2. Try to navigate back to workspace
  - Expected: Logged out and redirected to sign-in
  - Watch for: localStorage should persist project data

### First-Time User Experience

- [ ] **Test: Default Project Creation**
  - Steps:
    1. Sign up as new user
    2. Access workspace for first time
  - Expected: "My First Project" automatically created
  - Watch for: Project appears in left sidebar

---

## 📁 Project Management

### Project Creation

- [ ] **Test: Create New Project**
  - Steps:
    1. Open "My Projects" slide-out
    2. Click "+ New Project"
    3. Enter project name (e.g., "Test Project Q1")
    4. Click "Create"
  - Expected: Project created and appears in list
  - Watch for: Project name saved correctly, no XSS issues with special characters

- [ ] **Test: Project Name Validation**
  - Steps:
    1. Try to create project with empty name
    2. Try name with 101+ characters
    3. Try name with special chars: `<>:"/\|?*`
  - Expected: 
    - Empty name rejected with error
    - Long names rejected (max 100 chars)
    - Invalid characters rejected
  - Watch for: Error messages display clearly

- [ ] **Test: Switch Between Projects**
  - Steps:
    1. Create 2-3 projects
    2. Switch between them using project selector
    3. Verify active project indicator updates
  - Expected: Active project changes, tool results cleared
  - Watch for: Document content switches correctly

### Project Data Persistence

- [ ] **Test: localStorage Persistence**
  - Steps:
    1. Create project with data
    2. Refresh page
    3. Check if project still exists
  - Expected: Project persists across refresh
  - Watch for: Console logs showing storage usage percentage

- [ ] **Test: Delete Project**
  - Steps:
    1. Create 2+ projects (can't delete last one)
    2. Delete one project
    3. Verify it's removed from list
  - Expected: Project deleted, redirected to another project
  - Watch for: Cannot delete last remaining project

---

## 🤖 AI Tools

### 1. Tone Shifter

- [ ] **Test: Basic Tone Shift**
  - Steps:
    1. Open a document
    2. Type test text: "We are pleased to announce our new product launch."
    3. Highlight the text
    4. Open right sidebar → Tone Shifter
    5. Select "Playful" tone
    6. Click "Shift Tone"
  - Expected: 
    - Loading indicator shows (`AIWorxButtonLoader`)
    - Result appears in green success box
    - HTML formatting preserved
  - Watch for: 
    - Request completes within 30 seconds
    - No blank lines between HTML tags
    - "Replace Selection" button enabled

- [ ] **Test: All Tone Options**
  - Tones to test: Professional, Casual, Urgent, Friendly, Techy, Playful
  - Steps: Repeat above test for each tone
  - Expected: Each tone produces different style while preserving structure
  - Watch for: Appropriate word choice for each tone

- [ ] **Test: Replace Selection**
  - Steps:
    1. Generate tone-shifted result
    2. Click "Replace Selection"
  - Expected: Selected text replaced with result, formatting intact
  - Watch for: Original selection correctly replaced, not entire document

- [ ] **Test: Error Handling**
  - Steps:
    1. Select very long text (10,000+ characters)
    2. Try to shift tone
  - Expected: Error message: "Text exceeds maximum length..."
  - Watch for: Error displays in red box with X to dismiss

- [ ] **Test: No Selection**
  - Steps:
    1. Open Tone Shifter without selecting text
  - Expected: Blue info box: "Highlight text in the editor to shift tone"
  - Watch for: Button disabled

### 2. Expand Tool

- [ ] **Test: Basic Expansion**
  - Steps:
    1. Highlight short text: "Our coffee is great."
    2. Open right sidebar → Expand Copy
    3. Click "Expand Copy"
  - Expected: Expanded version with more detail/examples
  - Watch for: Length increases 50-200%, core message preserved

- [ ] **Test: Preserve Structure**
  - Steps:
    1. Create text with:
       - Heading: "## Benefits"
       - Bullets: "• Fast • Easy • Reliable"
    2. Highlight all
    3. Expand
  - Expected: Output keeps heading + bullets, just adds detail
  - Watch for: Structure (H2, UL) maintained

- [ ] **Test: Replace vs Copy**
  - Steps:
    1. Generate expanded result
    2. Click "Replace Selection" - verify it works
    3. Generate another result
    4. Click copy icon - verify copied to clipboard
  - Expected: Both actions work correctly
  - Watch for: Clipboard copy shows console log "✅ Copied to clipboard"

### 3. Shorten Tool

- [ ] **Test: Basic Shortening**
  - Steps:
    1. Highlight long paragraph (100+ words)
    2. Open right sidebar → Shorten Copy
    3. Click "Shorten Copy"
  - Expected: Concise version, 30-70% of original length
  - Watch for: Core message intact, no critical info lost

- [ ] **Test: Structure Preservation**
  - Steps:
    1. Create text with bullets and heading
    2. Shorten
  - Expected: Keeps same structure, just more concise
  - Watch for: Bullets remain bullets, headings remain headings

### 4. Rewrite for Channel

- [ ] **Test: All Channel Options**
  - Channels: LinkedIn, Twitter, Instagram, Facebook, Email
  - Steps:
    1. Highlight generic marketing copy
    2. Open Rewrite for Channel
    3. Select LinkedIn
    4. Click "Rewrite for LinkedIn"
  - Expected: Copy optimized for LinkedIn's professional style
  - Watch for: Platform-specific language/length

- [ ] **Test: Twitter Length**
  - Steps:
    1. Rewrite for Twitter
  - Expected: Result aims for <280 characters when possible
  - Watch for: Punchy, conversational tone

- [ ] **Test: Channel Switching**
  - Steps:
    1. Select channel, generate
    2. Without clearing, select different channel
  - Expected: Previous result cleared, new channel description shows
  - Watch for: No stale results

- [ ] **Test: Email Formatting**
  - Steps:
    1. Rewrite for Email channel
  - Expected: Direct tone, clear subject line, CTA
  - Watch for: Subject line in H3 tag

### 5. Brand Alignment Checker

- [ ] **Test: Setup Brand Voice**
  - Steps:
    1. Open Brand Voice tool → Setup tab
    2. Fill in:
       - Brand Name: "TechStart"
       - Tone: "Professional, innovative"
       - Approved Phrases: "cutting-edge" (one per line)
       - Forbidden Words: "cheap" (one per line)
       - Brand Values: "Innovation" (one per line)
    3. Click "Save Brand Voice"
  - Expected: Green success message, saved to active project
  - Watch for: Project indicator shows correct project name

- [ ] **Test: Check Copy Alignment**
  - Steps:
    1. Switch to "Check Copy" tab
    2. Highlight text containing approved/forbidden words
    3. Click "Check Brand Alignment"
  - Expected: 
    - Score 0-100%
    - "What Matches" section (green)
    - "What Violates" section (red)
    - "Recommendations" section (purple)
  - Watch for: Accurate detection of approved phrases and forbidden words

- [ ] **Test: No Brand Voice Warning**
  - Steps:
    1. Create new project without brand voice
    2. Try to check alignment
  - Expected: Yellow warning: "No Brand Voice Set"
  - Watch for: Button disabled when no brand voice

- [ ] **Test: Brand Voice Per Project**
  - Steps:
    1. Set brand voice for Project A
    2. Switch to Project B
    3. Check if brand voice cleared
  - Expected: Each project has separate brand voice
  - Watch for: Form clears when switching projects

### 6. Template Generator

- [ ] **Test: Browse Templates**
  - Steps:
    1. Click "Templates" in left sidebar
    2. Browse categories (Email, Landing Page, etc.)
  - Expected: Templates organized by category, icons visible
  - Watch for: Template complexity badges (Beginner/Intermediate/Advanced)

- [ ] **Test: Generate from Template**
  - Steps:
    1. Select "Sales Email" template
    2. Fill in all required fields:
       - Product Name
       - Target Audience
       - Key Benefits (3 bullets)
    3. Toggle "Apply Brand Voice" if brand voice exists
    4. Select persona (optional)
    5. Click "Generate with AI"
  - Expected:
    - Loading state with `AIWorxButtonLoader`
    - Generated copy inserted into editor
    - Green success message
    - Form resets after 2 seconds
  - Watch for: Confirmation dialog if editor has existing content

- [ ] **Test: Required Field Validation**
  - Steps:
    1. Open template form
    2. Leave required fields empty
    3. Try to generate
  - Expected: Red error messages under empty required fields
  - Watch for: "This field is required" errors

- [ ] **Test: "Other" Custom Option**
  - Steps:
    1. Find template with select field having "Other (specify)"
    2. Select "Other (specify)"
    3. Enter custom value in text field that appears
    4. Generate
  - Expected: Custom value used in generation, not literal "Other"
  - Watch for: Validation on custom value (required if "Other" selected)

- [ ] **Test: Brand Voice Integration**
  - Steps:
    1. Set up brand voice with specific tone
    2. Generate template with "Apply Brand Voice" checked
    3. Compare to generation without brand voice
  - Expected: Brand voice version follows brand guidelines
  - Watch for: Approved phrases appear, forbidden words absent

- [ ] **Test: Persona Integration**
  - Steps:
    1. Create persona with specific demographics
    2. Generate template with persona selected
  - Expected: Copy targets that persona's pain points/language
  - Watch for: Persona-specific language patterns

### 7. Document Insights (AI Analysis)

- [ ] **Test: Tone Detection**
  - Steps:
    1. Write text with clear tone (e.g., urgent language)
    2. Wait for auto-analysis (or check Document Insights panel)
  - Expected: Tone detected with confidence percentage
  - Watch for: Tone labels from list: Professional, Casual, Urgent, Friendly, Technical, Playful, Persuasive, Informative, Emotional, Formal

- [ ] **Test: Analysis Frequency**
  - Steps:
    1. Check Document Insights settings
    2. Verify update frequency (onPause/onSave/realtime)
  - Expected: Analysis triggers based on setting
  - Watch for: Deduplication - same content not analyzed twice

---

## 📄 Document Management

### Document Creation

- [ ] **Test: Create Blank Document**
  - Steps:
    1. From splash page, click "Start Blank"
    2. Or from workspace, create new document
    3. Enter document name: "Test Document"
  - Expected: Document created with "v1" suffix
  - Watch for: Document appears in left sidebar

- [ ] **Test: Document Name Validation**
  - Steps:
    1. Try empty name
    2. Try name with 201+ characters
    3. Try name with `<>` characters
  - Expected: 
    - Empty name rejected
    - Long names rejected (max 200 chars)
    - XSS characters stripped
  - Watch for: Sanitized name saved correctly

### Document Editing

- [ ] **Test: Auto-Save**
  - Steps:
    1. Open document
    2. Type some text
    3. Wait 500ms
    4. Check for save indicator
  - Expected: 
    - Yellow "Saving..." indicator appears
    - Green "Saved" indicator after save completes
    - Timestamp updates: "Saved HH:MM"
  - Watch for: Debounced saves (not on every keystroke)

- [ ] **Test: Content Persistence**
  - Steps:
    1. Type content in document
    2. Wait for auto-save
    3. Refresh page
    4. Reopen same document
  - Expected: Content persists exactly as typed
  - Watch for: Formatting (bold, bullets, headings) preserved

- [ ] **Test: Rich Text Formatting**
  - Steps:
    1. Use toolbar to apply:
       - Bold
       - Italic
       - Underline
       - Bullet list
       - Heading
       - Text alignment
  - Expected: All formatting applies correctly
  - Watch for: HTML tags used: `<strong>`, `<em>`, `<u>`, `<ul>`, `<h2>`

- [ ] **Test: Font Controls**
  - Steps:
    1. Select text
    2. Change font family
    3. Change font size
    4. Change text color
    5. Apply highlight
  - Expected: All styles apply to selection
  - Watch for: Inline styles in HTML output

### Document Versioning

- [ ] **Test: Create New Version**
  - Steps:
    1. Open existing document
    2. Click "Save as New Version"
  - Expected: New version created (v2, v3, etc.)
  - Watch for: baseTitle stays same, version increments

- [ ] **Test: Rename Document**
  - Steps:
    1. Open document
    2. Rename to different baseTitle
  - Expected: Creates NEW document family at v1, breaks version link
  - Watch for: Original versions remain separate

- [ ] **Test: Delete Document**
  - Steps:
    1. Delete a document
  - Expected: Document removed from list
  - Watch for: Can't recover (no undo - warn user if implementing)

### View Modes

- [ ] **Test: Scrolling Mode**
  - Steps:
    1. Select "Scrolling" view mode
  - Expected: Paper-like document, centered, scrollable
  - Watch for: Document header visible with title, zoom controls

- [ ] **Test: Focus Mode**
  - Steps:
    1. Select "Focus" view mode
  - Expected: Minimal UI, no header distractions, centered text
  - Watch for: Title/zoom controls hidden or minimal

- [ ] **Test: Page Mode**
  - Steps:
    1. Select "Page" view mode
  - Expected: Page breaks visible, page counter shows
  - Watch for: Page count accurate, pagination at ~11in per page

- [ ] **Test: Zoom Controls**
  - Steps:
    1. Use zoom slider (50%-200%)
    2. Try zoom in/out buttons
    3. Click percentage to reset to 100%
  - Expected: Content scales smoothly, buttons disable at min/max
  - Watch for: Zoom persists while editing, doesn't affect save

### Document Import

- [ ] **Test: Import Text File**
  - Steps:
    1. From splash page, click "Import Text"
    2. Select .txt file
  - Expected: Content imported into new document
  - Watch for: Line breaks preserved

---

## 📝 Template System

### Template Library

- [ ] **Test: Template Categories**
  - Steps:
    1. Open Templates browser
    2. Check all categories visible:
       - Email
       - Landing Page
       - Social Media
       - Ad Copy
       - Blog Post
  - Expected: Templates organized by category
  - Watch for: Icon for each template visible

- [ ] **Test: Template Preview**
  - Steps:
    1. Click on template card
  - Expected: 
    - Template details slide-out opens
    - Shows: name, description, complexity, estimated time, fields
  - Watch for: Field types visible (text, textarea, select)

- [ ] **Test: Template Form Fields**
  - Field types to check:
    - [ ] Text input (short text)
    - [ ] Textarea (long text with auto-expand)
    - [ ] Select dropdown
    - [ ] Select with "Other (specify)" option
  - Expected: All field types render correctly
  - Watch for: Textareas auto-expand as user types

### Template Generation

- [ ] **Test: Generation Timeout**
  - Steps:
    1. Disconnect internet (or throttle)
    2. Try to generate template
  - Expected: After 30 seconds, timeout error displays
  - Watch for: Error message: "Template generation took too long..."

- [ ] **Test: Missing Required Fields**
  - Steps:
    1. Leave required field empty
    2. Try to generate
  - Expected: Red error under field, generation blocked
  - Watch for: Error message: "Please fill in: [Field Names]"

- [ ] **Test: Content Replacement Warning**
  - Steps:
    1. Open document with existing content
    2. Generate template
  - Expected: Browser confirm dialog: "Replace existing content?"
  - Watch for: Can cancel generation

---

## 👤 Brand Voice & Personas

### Brand Voice Management

- [ ] **Test: Multi-Line Fields**
  - Steps:
    1. Enter multiple approved phrases (one per line)
    2. Enter multiple forbidden words (one per line)
    3. Enter multiple brand values (one per line)
    4. Save
  - Expected: Each line saved as separate array item
  - Watch for: Empty lines filtered out

- [ ] **Test: Brand Voice Persistence**
  - Steps:
    1. Save brand voice
    2. Refresh page
    3. Check brand voice still loaded
  - Expected: Brand voice persists with project in localStorage
  - Watch for: Project switch loads correct brand voice

- [ ] **Test: Missing Brand Name**
  - Steps:
    1. Leave brand name empty
    2. Try to save
  - Expected: Error: "Brand Name is required"
  - Watch for: Red error message displays

### Personas

- [ ] **Test: Create Persona**
  - Steps:
    1. Open Personas slide-out
    2. Click "+ Create Persona"
    3. Fill in all fields:
       - Name: "Sarah, Marketing Director"
       - Demographics: "35-45, female, urban"
       - Psychographics: "Data-driven, busy"
       - Pain Points: "Lack of time, needs efficiency"
       - Goals: "Increase ROI"
    4. Save
  - Expected: Persona created, appears in list
  - Watch for: Photo upload works (optional, 2MB max)

- [ ] **Test: Persona Name Validation**
  - Steps:
    1. Try empty name
    2. Try 101+ character name
  - Expected: Validation errors display
  - Watch for: Max 100 characters enforced

- [ ] **Test: Edit Persona**
  - Steps:
    1. Click edit on existing persona
    2. Modify fields
    3. Save
  - Expected: Changes persisted
  - Watch for: Form pre-populated with existing data

- [ ] **Test: Delete Persona**
  - Steps:
    1. Delete a persona
  - Expected: Persona removed from list
  - Watch for: Confirmation dialog (if implemented)

- [ ] **Test: Use Persona in Template**
  - Steps:
    1. Create persona
    2. Generate template with persona selected
    3. Review generated copy
  - Expected: Copy speaks to persona's pain points/goals
  - Watch for: Persona-specific language

---

## 🚨 Error Scenarios & Edge Cases

### Network Issues

- [ ] **Test: Offline Generation**
  - Steps:
    1. Disconnect internet
    2. Try any AI tool
  - Expected: Network error message appears
  - Watch for: User-friendly message: "Network error. Please check your connection..."

- [ ] **Test: API Timeout**
  - Steps:
    1. Use very complex template with lots of fields
    2. Wait for timeout (30s)
  - Expected: Timeout error: "Request timed out..."
  - Watch for: Loading state clears, button re-enabled

### Storage Limits

- [ ] **Test: localStorage Quota**
  - Steps:
    1. Create many large documents
    2. Check browser console for warnings
  - Expected: Warning at 80% full: "⚠️ localStorage is X% full"
  - Watch for: At 95%, error: "Storage is nearly full..."

### Race Conditions

- [ ] **Test: Rapid Tool Switching**
  - Steps:
    1. Start tone shift generation
    2. Immediately switch to expand tool
    3. Start expand generation
  - Expected: Previous result cleared, new tool loads correctly
  - Watch for: No stale results, only active tool's result shows

- [ ] **Test: Rapid Project Switching**
  - Steps:
    1. Switch between projects rapidly
  - Expected: Tool results cleared, correct project data loads
  - Watch for: No mixing of project data

### Browser Compatibility

- [ ] **Test: Cross-Browser**
  - Browsers to test:
    - [ ] Chrome (latest)
    - [ ] Firefox (latest)
    - [ ] Safari (latest)
    - [ ] Edge (latest)
  - Expected: All features work consistently
  - Watch for: localStorage availability, clipboard API support

---

## 📊 Performance Checks

### Load Times

- [ ] **Test: Initial Page Load**
  - Expected: Workspace loads in < 3 seconds
  - Watch for: Hydration errors in console

- [ ] **Test: Large Document Loading**
  - Steps:
    1. Create document with 5000+ words
    2. Close and reopen
  - Expected: Document loads in < 2 seconds
  - Watch for: Editor remains responsive

### API Response Times

- [ ] **Test: Tool Response Times**
  - Check each tool completes in reasonable time:
    - Tone Shift: < 10 seconds
    - Expand/Shorten: < 10 seconds
    - Rewrite Channel: < 10 seconds
    - Brand Alignment: < 10 seconds
    - Template Generation: < 15 seconds
  - Watch for: Loading indicators throughout

---

## 🔧 Developer Console Checks

### Throughout All Tests

- [ ] **Check Console Logs**
  - Expected: Emoji logs for debugging (✅, ❌, ⚠️, 📝, etc.)
  - Watch for: No unexpected errors or warnings

- [ ] **Check Network Tab**
  - Expected: API calls to `/api/*` routes
  - Watch for: 
    - No 500 errors
    - Proper error responses (400, 408, 429, etc.)
    - API key present in requests

- [ ] **Check localStorage**
  - Expected keys:
    - `copyworx_projects`
    - `copyworx_active_project_id`
    - `copyworx-workspace` (Zustand persist)
  - Watch for: Valid JSON structure

---

## ✅ Final Checks

- [ ] **Review All Failed Tests**
  - Document any failures
  - Categorize severity (Critical/Medium/Low)

- [ ] **Check for Production Issues**
  - [ ] Auth bypass fixed (`/copyworx` protected)
  - [ ] API key configured in production env
  - [ ] No `console.log` errors in production build

- [ ] **User Experience**
  - [ ] All loading states clear
  - [ ] Error messages helpful
  - [ ] Success feedback obvious
  - [ ] No orphaned UI elements

---

## 📝 Notes Section

**Issues Found:**
```
[Document issues here as you test]




```

**Feature Requests:**
```
[Document enhancement ideas here]




```

**Performance Issues:**
```
[Document slow operations here]




```

---

**Testing Complete:** ☐  
**Sign-off:** _____________  
**Date:** _____________
