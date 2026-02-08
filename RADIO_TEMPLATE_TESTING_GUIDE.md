# Radio Commercial Template - Quick Testing Guide

## ✅ IMPLEMENTATION VERIFIED

**TypeScript Compilation:** ✅ PASSED (Exit Code 0)  
**Linter Errors:** ✅ NONE  
**Template Added:** ✅ `lib/data/templates.ts`  
**Registry Updated:** ✅ `ALL_TEMPLATES` array

---

## 🧪 HOW TO TEST

### Step 1: Start the Development Server
```bash
npm run dev
# or
yarn dev
```

### Step 2: Navigate to Templates
1. Open the app in your browser
2. Create or open a project
3. Look for the templates button/section
4. Click to open the templates browser

### Step 3: Find the Radio Commercial Template
- **Category:** Advertising
- **Icon:** 📻 Radio/microphone icon
- **Name:** Radio Commercial
- **Description:** "Create professional radio ad copy optimized for voice talent and broadcast standards."

### Step 4: Fill Out the Form

**Example Test Data:**

```
Company/Brand Name: Joe's Auto Repair

Product/Service: Same-day brake repair with lifetime warranty on all parts and labor. We use OEM-certified parts and ASE-certified mechanics.

Primary Benefit: Get back on the road safely in under 2 hours, guaranteed or your service is free.

Target Audience: Busy commuters who need reliable, fast car repairs

Call to Action: Call now for same-day service

Contact Info: 555-BRAKES or JoesAutoRepair.com

Tone/Style: Conversational

Special Offer: First-time customers get 20% off through Friday only

Length: 30 seconds (~75 words)
```

### Step 5: Optional Settings
- [ ] **Apply Brand Voice** (if project has brand voice configured)
- [ ] **Target Persona** (if personas are created)

### Step 6: Generate
1. Click "Generate Copy" button
2. Watch for AI@Worx™ loader animation
3. Wait for generation to complete (~5-10 seconds)

### Step 7: Verify Output

**Check the generated radio commercial for:**

✅ **Word Count:** Should be ~75 words (±3 words) for 30-second spot  
✅ **Brand Name:** "Joe's Auto Repair" mentioned 2-3 times  
✅ **Primary Benefit:** Focuses on "2-hour turnaround" message  
✅ **Tone:** Conversational, friendly, natural  
✅ **Contact Info:** Includes "555-BRAKES" or "JoesAutoRepair.com"  
✅ **Special Offer:** Mentions 20% off for first-time customers  
✅ **Call to Action:** Clear directive to call  
✅ **Readability:** Sounds natural when read aloud (test by reading it!)  

**Expected Output Format:**
```
Joe's Auto Repair - 30 seconds Radio Commercial
TONE: Conversational
WORD COUNT: 73

[Script content here - natural, conversational, easy to read aloud]

Call 555-BRAKES or visit JoesAutoRepair.com

---

DELIVERY NOTES: [Optional timing/emphasis notes]
```

---

## 🎯 ADDITIONAL TEST SCENARIOS

### Test #1: 15-Second Spot (Short)
- **Length:** 15 seconds (~35 words)
- **Expected:** Very tight, punchy copy focusing on ONE benefit
- **Verify:** ~35 words max, clear hook + CTA

### Test #2: 60-Second Spot (Long)
- **Length:** 60 seconds (~150 words)
- **Expected:** Story-based with problem → solution → CTA arc
- **Verify:** ~150 words, 3 brand mentions, includes social proof if possible

### Test #3: Different Tones
Try each tone option:
- **Conversational:** Friendly, neighborly
- **Urgent/Promotional:** Fast-paced, energetic
- **Humorous:** Light, fun, memorable
- **Dramatic/Emotional:** Storytelling, emotional
- **Authoritative/Expert:** Confident, credible

### Test #4: Brand Voice Integration
If your project has Brand Voice:
1. Enable "Apply Brand Voice" checkbox
2. Generate commercial
3. Verify output matches brand tone, uses approved phrases, avoids forbidden words

### Test #5: Persona Targeting
If your project has Personas:
1. Select a target persona (e.g., "Busy Professional")
2. Generate commercial
3. Verify language and benefits resonate with that persona profile

---

## 🔍 WHAT TO LOOK FOR

### ✅ Good Radio Copy:
- Sounds natural when read aloud
- Short sentences (5-10 words)
- Active voice, present tense
- Uses contractions (we're, you'll, don't)
- Brand name feels natural, not forced
- One clear message/benefit
- Easy to remember phone/website
- Creates mental picture

### ❌ Red Flags:
- Sounds written/corporate
- Long, complex sentences
- Passive voice
- Jargon or technical terms
- Multiple competing messages
- Hard-to-remember contact info
- Over/under word count by >5 words

---

## 📊 EXPECTED RESULTS

### System Behavior:
1. ✅ Template appears in advertising category
2. ✅ Form opens in right sidebar when selected
3. ✅ All 9 fields render correctly
4. ✅ Dropdowns show proper options
5. ✅ Required field validation works
6. ✅ Generate button shows loading state
7. ✅ Generated copy appears in editor
8. ✅ Document auto-saves
9. ✅ Slide-out closes on success

### Copy Quality:
1. ✅ Respects word count limits
2. ✅ Sounds natural when read aloud
3. ✅ Focuses on single primary benefit
4. ✅ Mentions brand name 2-3 times
5. ✅ Includes contact info clearly
6. ✅ Matches requested tone
7. ✅ Has clear call-to-action
8. ✅ Uses conversational language

---

## 🐛 TROUBLESHOOTING

### Template Doesn't Appear
- **Check:** Is the dev server running?
- **Check:** Clear browser cache and refresh
- **Check:** Verify `ALL_TEMPLATES` array includes `RADIO_COMMERCIAL_TEMPLATE`

### Form Fields Not Rendering
- **Check:** TypeScript compilation errors
- **Check:** Browser console for errors
- **Check:** Field definitions in template constant

### Generation Fails
- **Check:** API route `/api/generate-template` is working
- **Check:** Network tab for error responses
- **Check:** All required fields are filled
- **Check:** Claude API key is configured

### Word Count Off
- **Expected:** Some variance (±3-5 words) is acceptable
- **Issue:** If consistently over/under by >10 words, system prompt may need tuning
- **Note:** Word count is guidance for Claude, not a hard limit in code

### Copy Doesn't Sound Natural
- **Check:** Is the "Conversational" tone selected?
- **Try:** Regenerate with different input phrasing
- **Note:** Radio copy quality depends heavily on input quality

---

## ✅ SUCCESS METRICS

**Template is working correctly if:**

1. All 9 form fields accept input
2. Validation prevents empty required fields
3. Generate button triggers API call
4. Generated copy appears in editor within 10 seconds
5. Word count is within ±5 words of target
6. Copy reads naturally when spoken aloud
7. Brand name appears 2-3 times
8. Contact info is clearly stated
9. Tone matches selection
10. Document auto-saves generated content

---

## 📝 NOTES FOR QA

### Edge Cases to Test:
- Very long company names (near 100 char limit)
- Special characters in contact info (parentheses, dashes)
- "Other (specify)" option in tone dropdown
- No special offer provided (optional field)
- Extremely short product descriptions
- Very specific target audiences

### Performance:
- Generation should complete in 5-15 seconds
- No UI freezing during generation
- Smooth animations on loading state
- Responsive form interactions

### Accessibility:
- All fields have proper labels
- Helper text provides context
- Required indicators visible
- Keyboard navigation works
- Error messages are clear

---

## 🚀 READY TO TEST

The Radio Commercial template is production-ready and waiting for QA verification.

**No setup required** — just start the dev server and navigate to templates!

---

**Questions or Issues?**  
Check the main implementation doc: `RADIO_COMMERCIAL_TEMPLATE_IMPLEMENTATION.md`
