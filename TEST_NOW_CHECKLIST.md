# 🧪 TEST NOW - Interactive Checklist

**Print this out or keep it open while testing**

---

## 🚀 Prerequisites

```bash
# 1. Start the dev server
npm run dev

# 2. Open browser in INCOGNITO mode
# Chrome: Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows)
# This ensures clean localStorage

# 3. Navigate to
http://localhost:3000

# 4. Open DevTools (F12 or Cmd+Option+I)
# Keep Console tab visible to catch errors
```

---

## ✅ TEST 1: NEW USER EXPERIENCE (10 minutes)

### **1.1 First Launch** ⏱️ 30 seconds

**Actions:**
1. [ ] Load `http://localhost:3000` in incognito
2. [ ] Splash page appears
3. [ ] Click "New Document"

**Expected:**
- [ ] ✅ Redirects to `/copyworx/workspace`
- [ ] ✅ Default project "My First Project" visible in top-left
- [ ] ✅ Blank editor ready to type
- [ ] ✅ Left sidebar shows tools
- [ ] ✅ Right sidebar shows Copy Optimizer
- [ ] ✅ No red errors in console

**If Failed:** _____________________________________

---

### **1.2 Editor Typing** ⏱️ 1 minute

**Actions:**
1. [ ] Click in editor area
2. [ ] Type: "This is my first piece of copy. It needs to be professional and engaging."
3. [ ] Select all the text (Cmd+A or Ctrl+A)
4. [ ] Text should highlight in blue

**Expected:**
- [ ] ✅ Typing is smooth (no lag)
- [ ] ✅ Cursor moves immediately
- [ ] ✅ Selection works
- [ ] ✅ Text is readable (Inter font)

**If Failed:** _____________________________________

---

### **1.3 Create Brand Voice** ⏱️ 2 minutes

**Actions:**
1. [ ] Click "Brand Voice" in left sidebar (bottom icon)
2. [ ] Click "Setup" tab (should already be selected)
3. [ ] Fill in form:
   ```
   Brand Name: TechFlow
   Brand Tone: Professional, innovative, trustworthy
   Approved Phrases: 
   - cutting-edge technology
   - seamless integration
   - trusted partner
   
   Forbidden Words:
   - cheap
   - obviously
   - just
   
   Brand Values:
   - Innovation
   - Integrity
   - Excellence
   
   Mission Statement:
   Empowering businesses through innovative technology solutions
   ```
4. [ ] Click "Save Brand Voice" button
5. [ ] Watch for success message in console

**Expected:**
- [ ] ✅ All textareas expand as you type
- [ ] ✅ Save button shows loading state (spinner)
- [ ] ✅ Console shows: "💾 Brand voice saved successfully"
- [ ] ✅ Form stays filled after save (or clears, both OK)

**If Failed:** _____________________________________

**Test Persistence:**
1. [ ] Refresh page (F5)
2. [ ] Go back to Brand Voice → Setup
3. [ ] All your data should still be there

**Expected:**
- [ ] ✅ Brand voice data persisted after refresh

**If Failed:** _____________________________________

---

### **1.4 Create Persona** ⏱️ 3 minutes

**Actions:**
1. [ ] Click "Personas" in left sidebar (person icon)
2. [ ] Click "Create New Persona" button
3. [ ] Fill in form:
   ```
   Name: Sarah, Tech Startup Founder
   
   Demographics:
   - Age: 35-45
   - Female
   - Tech entrepreneur
   - Annual revenue: $1M-$5M
   - Located in major tech hubs
   
   Psychographics:
   - Highly ambitious and growth-focused
   - Data-driven decision maker
   - Values efficiency and ROI
   - Early adopter of new tech
   - Time-poor, needs quick solutions
   
   Pain Points:
   - Limited time for research
   - Tight budgets but willing to invest in proven solutions
   - Scaling challenges
   - Need to move fast without sacrificing quality
   
   Language Patterns:
   - Professional but approachable
   - Action-oriented language
   - Uses industry terminology
   - Appreciates concise communication
   
   Goals:
   - Scale business to $10M+ revenue
   - Attract Series A funding
   - Build high-performing team
   - Establish market leadership
   ```
4. [ ] (Optional) Click "Upload Photo" and add an image
5. [ ] Click "Save Persona"

**Expected:**
- [ ] ✅ Persona card appears in the list
- [ ] ✅ Card shows name and truncated demographics
- [ ] ✅ Photo displays (or default avatar)
- [ ] ✅ Can see Edit (pencil) and Delete (trash) buttons on hover

**If Failed:** _____________________________________

**Test Image Upload (if you uploaded):**
- [ ] ✅ Image resized and displayed
- [ ] ✅ No console errors about image size

**Test Persistence:**
1. [ ] Refresh page (F5)
2. [ ] Go back to Personas
3. [ ] Persona should still be there

**Expected:**
- [ ] ✅ Persona persisted after refresh

**If Failed:** _____________________________________

---

### **1.5 Generate Template** ⏱️ 3 minutes

**Actions:**
1. [ ] Click "Templates" in left sidebar (document icon)
2. [ ] Browse templates and select "Sales Email - Cold Outreach"
3. [ ] Fill in the form:
   ```
   Product/Service: TechFlow CRM - AI-powered customer management
   
   Target Audience: Sales managers at B2B SaaS companies (50-500 employees)
   
   Key Benefit/Value Prop: Increase sales productivity by 40% with intelligent automation
   
   Call to Action: Book a 15-minute demo
   
   Additional Context:
   We're targeting companies struggling with manual sales processes.
   Our differentiator is the AI that learns from their data.
   ```
4. [ ] Toggle "Apply Brand Voice" to ON (blue)
5. [ ] Select persona "Sarah, Tech Startup Founder" from dropdown
6. [ ] Click "Generate Copy"
7. [ ] Watch the loading animation

**Expected:**
- [ ] ✅ "Generating copy..." message appears
- [ ] ✅ AI@Worx shimmer animation shows
- [ ] ✅ Generation completes in < 30 seconds
- [ ] ✅ Generated copy appears in preview box
- [ ] ✅ Copy mentions brand values or uses approved phrases
- [ ] ✅ Copy is personalized for Sarah persona
- [ ] ✅ "Insert into Editor" button appears

**If Failed (timeout or error):** _____________________________________

**Test Generated Copy Quality:**
Read the generated copy and check:
- [ ] ✅ Uses professional tone (from brand voice)
- [ ] ✅ Mentions or implies key benefit
- [ ] ✅ Includes clear CTA
- [ ] ✅ No forbidden words used
- [ ] ✅ Appropriate for target persona

**Test Insert Function:**
1. [ ] Click "Insert into Editor"
2. [ ] Go back to editor (close Templates panel)

**Expected:**
- [ ] ✅ Generated copy inserted into editor
- [ ] ✅ Properly formatted (paragraphs, etc.)

**If Failed:** _____________________________________

---

### **1.6 Use Copy Optimizer Tools** ⏱️ 5 minutes

#### **Test 1: Tone Shifter**

**Actions:**
1. [ ] In editor, select some text (at least a sentence)
2. [ ] In right sidebar, click "Tone" tool
3. [ ] Select "Casual" tone
4. [ ] Click "Shift Tone"

**Expected:**
- [ ] ✅ Loading state shows (button disabled, spinner)
- [ ] ✅ Result appears in preview in < 15 seconds
- [ ] ✅ Tone is noticeably more casual
- [ ] ✅ Three action buttons appear: Replace, Insert After, Copy

**Test Actions:**
1. [ ] Click "Replace Selection"

**Expected:**
- [ ] ✅ Original text replaced with new version
- [ ] ✅ Selection preserved or cursor moves to end

**If Failed:** _____________________________________

---

#### **Test 2: Expand**

**Actions:**
1. [ ] Type short text: "Our product saves time."
2. [ ] Select it
3. [ ] Click "Expand" in right sidebar
4. [ ] Click "Expand" button

**Expected:**
- [ ] ✅ Loading shows
- [ ] ✅ Expanded version appears with more detail
- [ ] ✅ Original meaning preserved but more elaborate

**If Failed:** _____________________________________

---

#### **Test 3: Shorten**

**Actions:**
1. [ ] Type or paste a long paragraph (3-5 sentences)
2. [ ] Select it
3. [ ] Click "Shorten" in right sidebar
4. [ ] Click "Shorten" button

**Expected:**
- [ ] ✅ Loading shows
- [ ] ✅ Shorter version appears
- [ ] ✅ Key points preserved
- [ ] ✅ More concise

**If Failed:** _____________________________________

---

#### **Test 4: Rewrite for Channel**

**Actions:**
1. [ ] Type generic message: "We're excited to announce our new product launch."
2. [ ] Select it
3. [ ] Click "Rewrite" in right sidebar
4. [ ] Select "LinkedIn" from dropdown
5. [ ] Click "Rewrite for Channel"

**Expected:**
- [ ] ✅ Loading shows
- [ ] ✅ Rewritten for LinkedIn (professional, engaging)
- [ ] ✅ Appropriate hashtags or format

**If Failed:** _____________________________________

---

#### **Test 5: Brand Alignment Check**

**Actions:**
1. [ ] Write some copy that uses a forbidden word (e.g., "Our cheap solution")
2. [ ] Select it
3. [ ] Go to Brand Voice tool → "Check Copy" tab
4. [ ] Paste the text in the textarea
5. [ ] Click "Check Brand Alignment"

**Expected:**
- [ ] ✅ Loading shows
- [ ] ✅ Analysis appears with alignment score
- [ ] ✅ Flags the forbidden word
- [ ] ✅ Provides suggestions

**If Failed:** _____________________________________

---

## ✅ TEST 2: POWER USER WORKFLOW (15 minutes)

### **2.1 Create Multiple Projects** ⏱️ 5 minutes

**Actions:**
1. [ ] Click project selector (top-left, currently shows "My First Project")
2. [ ] Click "+ New Project"
3. [ ] Name it: "E-commerce Fashion Brand"
4. [ ] Click Create
5. [ ] Notice it switches to new project

**Expected:**
- [ ] ✅ New project created instantly
- [ ] ✅ Project selector shows new name
- [ ] ✅ Editor is blank (new document)
- [ ] ✅ Brand Voice is empty
- [ ] ✅ Personas list is empty

**Create 2 More Projects:**
1. [ ] Create "B2B SaaS Company"
2. [ ] Create "Healthcare Wellness App"

**Expected:**
- [ ] ✅ All 4 projects visible in dropdown
- [ ] ✅ Can switch between them easily

**If Failed:** _____________________________________

---

### **2.2 Add Unique Data to Each Project** ⏱️ 5 minutes

**For "E-commerce Fashion Brand":**
1. [ ] Add brand voice:
   ```
   Brand: StyleHub
   Tone: Trendy, inspiring, fashion-forward
   Approved: sustainable fashion, timeless style, curated collection
   ```
2. [ ] Add persona:
   ```
   Name: Emma, Fashion Enthusiast (25-35, female, loves sustainable brands)
   ```

**For "B2B SaaS Company":**
1. [ ] Add brand voice:
   ```
   Brand: DataFlow Pro
   Tone: Professional, technical, results-driven
   Approved: enterprise-grade, seamless integration, ROI
   ```
2. [ ] Add persona:
   ```
   Name: Mike, IT Director (40-50, male, values reliability)
   ```

**Expected:**
- [ ] ✅ Each project has distinct brand voice
- [ ] ✅ Each project has distinct personas
- [ ] ✅ No mixing of data between projects

**If Failed:** _____________________________________

---

### **2.3 Test Project Isolation** ⏱️ 3 minutes

**Actions:**
1. [ ] Switch to "E-commerce Fashion Brand"
2. [ ] Check Brand Voice → Should show StyleHub
3. [ ] Switch to "B2B SaaS Company"
4. [ ] Check Brand Voice → Should show DataFlow Pro
5. [ ] Switch back to "My First Project"
6. [ ] Check Brand Voice → Should show TechFlow (from Test 1)

**Expected:**
- [ ] ✅ Each project retains its own data
- [ ] ✅ No data leakage between projects
- [ ] ✅ Switching is instant (< 500ms)

**If Failed:** _____________________________________

---

### **2.4 Generate in Multiple Projects** ⏱️ 5 minutes

**Actions:**
1. [ ] In "E-commerce Fashion Brand":
   - [ ] Generate a "Social Media Post" template
   - [ ] Should use fashion brand voice
   - [ ] Should reference Emma persona
   
2. [ ] In "B2B SaaS Company":
   - [ ] Generate a "Landing Page Headline" template
   - [ ] Should use technical brand voice
   - [ ] Should reference Mike persona

**Expected:**
- [ ] ✅ Generated copy reflects correct brand voice
- [ ] ✅ Copy appropriate for selected persona
- [ ] ✅ Each project's content stays separate

**If Failed:** _____________________________________

---

## ✅ TEST 3: ERROR RECOVERY (10 minutes)

### **3.1 Invalid Inputs** ⏱️ 3 minutes

**Test Empty Project Name:**
1. [ ] Try to create project with empty name
2. [ ] Try to create project with just spaces "   "

**Expected:**
- [ ] ✅ Error message shown (validation)
- [ ] ✅ Project not created
- [ ] ✅ Can try again

**If Failed:** _____________________________________

**Test Empty Brand Voice:**
1. [ ] Go to Brand Voice → Setup
2. [ ] Leave Brand Name empty
3. [ ] Try to save

**Expected:**
- [ ] ✅ Validation error shown (check console)
- [ ] ✅ Helpful error message

**If Failed:** _____________________________________

**Test Oversized Image:**
1. [ ] Try to upload a very large image (> 2MB) for persona
2. [ ] Or try to upload a PDF or .txt file

**Expected:**
- [ ] ✅ Error message: "File too large" or "Invalid file type"
- [ ] ✅ Upload rejected gracefully

**If Failed:** _____________________________________

---

### **3.2 API Errors** ⏱️ 3 minutes

**Test Timeout (simulate slow network):**
1. [ ] Open DevTools → Network tab
2. [ ] Change throttling to "Slow 3G"
3. [ ] Try to generate a template
4. [ ] Wait 30+ seconds

**Expected:**
- [ ] ✅ Request times out after 30 seconds
- [ ] ✅ Error message shown: "Request timed out"
- [ ] ✅ Retry option available
- [ ] ✅ App doesn't crash

**If Failed:** _____________________________________

**Test Offline:**
1. [ ] DevTools → Network → Change to "Offline"
2. [ ] Try to generate copy
3. [ ] Turn network back online

**Expected:**
- [ ] ✅ Network error shown
- [ ] ✅ Helpful message: "Check your connection"
- [ ] ✅ Can retry when back online

**If Failed:** _____________________________________

---

### **3.3 Data Corruption Recovery** ⏱️ 2 minutes

**Test Corrupt localStorage:**
1. [ ] Open DevTools → Application → Local Storage
2. [ ] Find `copyworx_projects`
3. [ ] Double-click value and corrupt the JSON: `{"broken`
4. [ ] Refresh page

**Expected:**
- [ ] ✅ Error logged to console
- [ ] ✅ Default project created
- [ ] ✅ App continues to work (not stuck)

**If Failed:** _____________________________________

---

### **3.4 Edge Cases** ⏱️ 2 minutes

**Test Very Long Text:**
1. [ ] Paste 10,000+ characters into editor
2. [ ] Try to select and use a tool

**Expected:**
- [ ] ✅ Editor handles long text
- [ ] ✅ Selection works (might be slow, that's OK)
- [ ] ✅ Tool processes or shows length limit error

**If Failed:** _____________________________________

**Test Special Characters:**
1. [ ] Type emojis: 🚀 💻 🎉
2. [ ] Type HTML: `<script>alert('test')</script>`
3. [ ] Type Unicode: 你好 مرحبا

**Expected:**
- [ ] ✅ All characters display correctly
- [ ] ✅ No XSS vulnerabilities (HTML sanitized)
- [ ] ✅ No crashes

**If Failed:** _____________________________________

---

## ✅ TEST 4: PERFORMANCE (10 minutes)

### **4.1 Typing Performance** ⏱️ 2 minutes

**Actions:**
1. [ ] Open editor
2. [ ] Type continuously for 30 seconds at normal speed
3. [ ] Type very fast for 10 seconds

**Expected:**
- [ ] ✅ No lag (characters appear instantly)
- [ ] ✅ Cursor stays smooth
- [ ] ✅ No dropped characters
- [ ] ✅ Feels responsive

**Performance Check:**
1. [ ] Open DevTools → Performance tab
2. [ ] Click Record
3. [ ] Type for 10 seconds
4. [ ] Stop recording
5. [ ] Look for red bars (long tasks > 50ms)

**Expected:**
- [ ] ✅ Mostly green bars (< 16ms)
- [ ] ✅ Few or no red bars
- [ ] ✅ 60fps maintained

**If Failed:** _____________________________________

---

### **4.2 Tool Switching** ⏱️ 2 minutes

**Actions:**
1. [ ] Click through all left sidebar tools rapidly (10 times)
2. [ ] Click through all right sidebar tools rapidly (10 times)
3. [ ] Open and close sidebars repeatedly

**Expected:**
- [ ] ✅ Switches feel instant (< 100ms)
- [ ] ✅ No flickering
- [ ] ✅ No layout shifts
- [ ] ✅ Smooth animations

**If Failed:** _____________________________________

---

### **4.3 Project Switching** ⏱️ 2 minutes

**Actions:**
1. [ ] Switch between projects 10 times rapidly
2. [ ] Note any lag or delay

**Expected:**
- [ ] ✅ Switch is instant (< 500ms)
- [ ] ✅ UI updates immediately
- [ ] ✅ No errors in console

**If Failed:** _____________________________________

---

### **4.4 API Response Times** ⏱️ 3 minutes

**Measure Each API:**

**Actions:**
1. [ ] Set network back to "Online" (no throttling)
2. [ ] Test each tool and note response time:

| Tool | Time | Pass (< 15s)? |
|------|------|---------------|
| Tone Shift | ___s | [ ] |
| Expand | ___s | [ ] |
| Shorten | ___s | [ ] |
| Rewrite Channel | ___s | [ ] |
| Brand Alignment | ___s | [ ] |
| Generate Template | ___s | [ ] |

**Expected:**
- [ ] ✅ Most requests < 15 seconds
- [ ] ✅ All requests < 30 seconds (timeout)

**If Failed:** _____________________________________

---

### **4.5 Memory Usage** ⏱️ 1 minute

**Actions:**
1. [ ] DevTools → Performance → Memory checkbox
2. [ ] Use app for 5 minutes (all features)
3. [ ] Watch memory graph

**Expected:**
- [ ] ✅ Memory stays reasonable (< 100MB)
- [ ] ✅ Sawtooth pattern (GC working)
- [ ] ✅ No continuous growth

**If Failed:** _____________________________________

---

## ✅ TEST 5: POLISH (10 minutes)

### **5.1 Visual Consistency** ⏱️ 3 minutes

**Check All Screens:**
- [ ] Splash page looks professional
- [ ] Workspace looks polished
- [ ] All buttons use consistent blue color
- [ ] All inputs have consistent styling
- [ ] All spacing looks uniform
- [ ] Inter font used throughout
- [ ] No visual glitches or misalignments

**Expected:**
- [ ] ✅ Consistent visual style throughout
- [ ] ✅ Professional appearance
- [ ] ✅ Apple-inspired aesthetic

**If Failed (note specific issues):** _____________________________________

---

### **5.2 Interactive States** ⏱️ 3 minutes

**Test All Button States:**
1. [ ] Hover over buttons → Color changes
2. [ ] Click buttons → Active state visible
3. [ ] Tab to buttons → Focus ring visible (blue outline)
4. [ ] Disabled buttons → Grayed out clearly

**Expected:**
- [ ] ✅ All states work on all buttons
- [ ] ✅ Visually distinct
- [ ] ✅ Focus visible for accessibility

**Test All Input States:**
1. [ ] Hover over inputs → Border changes
2. [ ] Focus inputs → Blue ring appears
3. [ ] Type invalid data → Error state (red)

**Expected:**
- [ ] ✅ All states work
- [ ] ✅ Clear visual feedback

**If Failed:** _____________________________________

---

### **5.3 Loading States** ⏱️ 2 minutes

**Check All Loading States:**
- [ ] Template generation → AI@Worx shimmer
- [ ] Tone shift → Button spinner
- [ ] Expand → Button spinner
- [ ] Shorten → Button spinner
- [ ] Rewrite → Button spinner
- [ ] Brand alignment → Button spinner

**Expected:**
- [ ] ✅ All show loading immediately
- [ ] ✅ Branded shimmer animation smooth
- [ ] ✅ Buttons disabled while loading
- [ ] ✅ Can't trigger duplicate requests

**If Failed:** _____________________________________

---

### **5.4 Feedback Messages** ⏱️ 2 minutes

**Check Success Feedback:**
- [ ] Brand voice saved → Console message or UI feedback
- [ ] Persona saved → Card appears immediately
- [ ] Template generated → Preview shown
- [ ] Copy inserted → Editor updates

**Check Error Feedback:**
- [ ] Empty form → Validation error
- [ ] Network error → Helpful message
- [ ] Timeout → Retry option
- [ ] Large file → Size limit message

**Expected:**
- [ ] ✅ All actions have clear feedback
- [ ] ✅ Error messages helpful (not technical)
- [ ] ✅ Success states obvious

**If Failed:** _____________________________________

---

## 📊 TEST RESULTS SUMMARY

### **Overall Results:**

| Category | Tests Passed | Tests Failed | Pass Rate |
|----------|--------------|--------------|-----------|
| 1. New User Experience | __ / 6 | __ | __% |
| 2. Power User Workflow | __ / 4 | __ | __% |
| 3. Error Recovery | __ / 4 | __ | __% |
| 4. Performance | __ / 5 | __ | __% |
| 5. Polish | __ / 4 | __ | __% |
| **TOTAL** | **__ / 23** | **__** | **__%** |

---

### **Critical Issues Found:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

### **Minor Issues Found:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

### **Performance Notes:**

Average API Response Time: _____ seconds  
Typing Lag: Yes [ ] / No [ ]  
Animation Smoothness: Good [ ] / Acceptable [ ] / Poor [ ]  
Memory Usage: OK [ ] / High [ ]

---

### **Browser/Environment:**

- **Browser:** ___________________
- **Version:** ___________________
- **OS:** ___________________
- **Screen Size:** ___________________
- **Date/Time:** ___________________

---

## 🎯 GO / NO-GO DECISION

### **Ready for Production?**

- [ ] **YES** - All critical tests pass (95%+ pass rate)
- [ ] **NO** - Critical issues block production
- [ ] **WITH CAVEATS** - Minor issues exist but not blocking

### **Recommendation:**

_______________________________________________
_______________________________________________
_______________________________________________

### **Next Steps:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 📝 Notes & Observations

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________

---

**Tester Signature:** _________________ **Date:** _________

**Status:** [ ] APPROVED [ ] NEEDS FIXES [ ] BLOCKED

---

## 🚀 Expected Pass Rate: 95%+

Based on code analysis, you should see:
- ✅ All core features working
- ✅ Error handling graceful
- ✅ Performance good
- ✅ Professional polish
- ⚠️ Minor issues acceptable (console logs, etc.)

**Good luck with testing!** 🎉
