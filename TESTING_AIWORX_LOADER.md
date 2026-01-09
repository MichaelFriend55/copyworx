# AI@Worx™ Loader Testing Guide

## ✅ SETUP COMPLETE

Your dev server is already running at: **http://localhost:3008**

All components compiled successfully with **3795 modules** and **no errors**.

---

## 🧪 MANUAL TESTING STEPS

### Test 1: Tone Shifter Tool

**Steps:**
1. Navigate to `/copyworx/workspace`
2. Create a new document or open existing
3. Type some text in the editor (e.g., "Hello world, this is a test message")
4. Select the text you just typed
5. Open the **Tools** panel (right sidebar)
6. Click on **Tone Shifter** tool
7. Select any tone (e.g., "Professional", "Playful", "Urgent")
8. Click **"Shift Tone"** button

**Expected Result:**
- ✨ Button shows `AIWorxButtonLoader` component
- Sparkles icon shimmers (brightness pulses + scale effect)
- "Generating with AI@Worx™" text appears
- Three dots bounce in sequence (wave pattern)
- After ~2-5 seconds, result appears

**Visual Checks:**
- [ ] Shimmer animation is smooth (no jank)
- [ ] Sparkles icon pulses brightness
- [ ] Three dots create wave effect
- [ ] White text on blue background is legible
- [ ] Animation doesn't slow down the UI

---

### Test 2: Expand Tool

**Steps:**
1. In the editor, type: "This is short text"
2. Select the text
3. Open **Expand Tool** from right sidebar
4. Click **"Expand Copy"** button

**Expected Result:**
- ✨ `AIWorxButtonLoader` appears
- Same shimmer + bounce animations
- Expanded copy appears after API responds

**Visual Checks:**
- [ ] Loading state matches Tone Shifter design
- [ ] Animations are consistent
- [ ] No layout shift during loading

---

### Test 3: Shorten Tool

**Steps:**
1. Type a long paragraph in editor (100+ words)
2. Select all the text
3. Open **Shorten Tool**
4. Click **"Shorten Copy"** button

**Expected Result:**
- ✨ `AIWorxButtonLoader` appears
- Shortened copy replaces selection after completion

**Visual Checks:**
- [ ] Same branded loader appears
- [ ] Consistent timing and feel

---

### Test 4: Rewrite for Channel

**Steps:**
1. Select some text in editor
2. Open **Rewrite for Channel** tool
3. Choose a channel (LinkedIn, Twitter, Instagram, etc.)
4. Click **"Rewrite for [Channel]"** button

**Expected Result:**
- ✨ `AIWorxButtonLoader` appears
- Channel-optimized copy generated

**Visual Checks:**
- [ ] Loader works in multi-step flow
- [ ] Doesn't conflict with channel selection UI

---

### Test 5: Template Generator

**Steps:**
1. Click **Templates** button in toolbar
2. Select any template (e.g., "Sales Email")
3. Fill out the form fields
4. Click **"Generate with AI"** button

**Expected Result:**
- ✨ `AIWorxButtonLoader` appears in gradient blue button
- Template-generated copy inserted into editor

**Visual Checks:**
- [ ] Loader visible on gradient background
- [ ] White text + shimmer shows clearly
- [ ] Button disabled during generation

---

### Test 6: Brand Alignment Check

**Steps:**
1. Set up brand voice first:
   - Open **Brand Voice** tool
   - Go to **Setup** tab
   - Fill in brand name (e.g., "CoffeeWorx")
   - Add brand tone (e.g., "Professional, friendly")
   - Click **"Save Brand Voice"**

2. Check alignment:
   - Go to **Check Copy** tab
   - Select text in editor
   - Click **"Check Brand Alignment"** button

**Expected Result:**
- ✨ `AIWorxButtonLoader` appears
- Brand alignment score and recommendations display

**Visual Checks:**
- [ ] Loader appears in both tabs if needed
- [ ] No conflicts with tab switching

---

## 🎯 ANIMATION QUALITY CHECKS

### Shimmer Effect
- [ ] **Smooth opacity fade**: 0.5 → 1.0 → 0.5
- [ ] **Gentle scale pulse**: 1.0 → 1.1 → 1.0
- [ ] **Duration**: 2 seconds per cycle
- [ ] **No jank or stutter**: Runs at 60fps

### Bouncing Dots
- [ ] **Three dots visible**: All white, rounded
- [ ] **Staggered timing**: Wave effect (not simultaneous)
- [ ] **Delays**: 0ms, 150ms, 300ms
- [ ] **Smooth bounce**: Natural feel

### Overall
- [ ] **Color consistency**: Matches Apple blue (#0071E3)
- [ ] **Text legibility**: "AI@Worx™" clearly readable
- [ ] **No layout shift**: Button doesn't change size
- [ ] **Accessibility**: Screen readers announce loading state

---

## 📱 RESPONSIVE TESTING

### Desktop (1920×1080)
- [ ] All tools show loader correctly
- [ ] Animations smooth
- [ ] No overflow issues

### Tablet (iPad, 1024×768)
- [ ] Loader scales appropriately
- [ ] Touch interactions work
- [ ] Animations maintain performance

### Mobile (iPhone, 375×667)
- [ ] Loader visible on small screen
- [ ] Text not truncated
- [ ] Animations don't lag

---

## 🌐 BROWSER COMPATIBILITY

### Chrome/Edge (Chromium)
- [ ] Animations smooth
- [ ] Shimmer effect visible
- [ ] No console errors

### Firefox
- [ ] CSS animations work
- [ ] Colors match design
- [ ] Performance good

### Safari (macOS/iOS)
- [ ] Hardware acceleration working
- [ ] -webkit- prefixes not needed (Tailwind handles)
- [ ] Smooth 60fps

---

## ♿ ACCESSIBILITY TESTING

### Screen Reader (VoiceOver/NVDA)
- [ ] Announces "Generating with AI@Worx™"
- [ ] `role="status"` detected
- [ ] `aria-live="polite"` doesn't interrupt
- [ ] Decorative elements hidden with `aria-hidden`

### Keyboard Navigation
- [ ] Can tab to button
- [ ] Can trigger with Enter/Space
- [ ] Loading state prevents re-triggering
- [ ] Focus returns after completion

### High Contrast Mode
- [ ] Loader visible in Windows High Contrast
- [ ] Sufficient color contrast
- [ ] Animations still visible

---

## 🐛 ERROR TESTING

### API Failure
**Steps:**
1. Disconnect internet or block API
2. Trigger any tool (e.g., Tone Shifter)
3. Watch for error state

**Expected:**
- [ ] Loader disappears
- [ ] Error message shows
- [ ] Can retry operation
- [ ] No infinite loading state

### Network Delay
**Steps:**
1. Use Chrome DevTools → Network → Slow 3G
2. Trigger tool
3. Observe loading state

**Expected:**
- [ ] Loader visible for extended time
- [ ] Animations don't slow down
- [ ] UI remains responsive
- [ ] Can cancel if needed

---

## 📊 PERFORMANCE TESTING

### CPU Usage
**Steps:**
1. Open Chrome DevTools → Performance
2. Start recording
3. Trigger multiple tools rapidly
4. Stop recording

**Check:**
- [ ] No main thread blocking
- [ ] Animations run on GPU (compositor)
- [ ] No memory leaks
- [ ] Frame rate stays ~60fps

### Bundle Size
**Check compiled output:**
```bash
# In terminal:
npm run build
# Check .next/static/chunks for size impact
```

**Expected:**
- [ ] AIWorxLoader component adds < 2KB
- [ ] No duplicate Lucide icons
- [ ] Tailwind purges unused classes

---

## 🔍 CONSOLE CHECKS

### No Errors
Open browser console (F12) and verify:
- [ ] No React warnings
- [ ] No TypeScript errors
- [ ] No missing dependencies
- [ ] No hydration errors

### Expected Logs
You should see:
```
✅ Tone shift successful: { ... }
✅ Template generation successful: { ... }
```

---

## 🎬 VIDEO TESTING (Optional)

Record a video of the loader in action:

1. **Screen Recording:**
   - macOS: Cmd + Shift + 5
   - Windows: Win + G (Xbox Game Bar)
   - Chrome: DevTools → More Tools → Coverage

2. **What to Record:**
   - Trigger Tone Shifter
   - Show full loading cycle
   - Highlight shimmer effect
   - Zoom in on bouncing dots

3. **Share with Team:**
   - Upload to Loom/Slack/Notion
   - Get feedback on animation quality

---

## ✅ CHECKLIST SUMMARY

Quick checklist for acceptance testing:

### Functionality
- [ ] All 6 tools use `AIWorxButtonLoader`
- [ ] Loading states appear immediately on click
- [ ] Results display correctly after loading
- [ ] Error states work properly

### Visual Design
- [ ] Shimmer animation smooth and visible
- [ ] Spinning ring rotates continuously
- [ ] Three dots bounce in wave pattern
- [ ] Apple blue color (#0071E3) matches design
- [ ] "AI@Worx™" text includes trademark symbol

### Performance
- [ ] No lag or stutter
- [ ] Animations run at 60fps
- [ ] No memory leaks
- [ ] Works on mobile devices

### Accessibility
- [ ] Screen reader compatible
- [ ] Keyboard accessible
- [ ] High contrast mode support
- [ ] Focus management works

### Cross-Browser
- [ ] Chrome/Edge working
- [ ] Firefox working
- [ ] Safari working
- [ ] Mobile browsers working

---

## 🐛 KNOWN ISSUES (If Any)

Document any issues found during testing:

**Issue 1:** [Description]
- **Impact:** [Severity]
- **Steps to Reproduce:** [Steps]
- **Workaround:** [If available]

**Issue 2:** [Description]
- ...

---

## 📝 FEEDBACK

After testing, provide feedback on:

1. **Animation Quality (1-10):** ___
2. **Branding Impact (1-10):** ___
3. **User Experience (1-10):** ___
4. **Performance (1-10):** ___

**Comments:**
```
[Your feedback here]
```

---

## 🚀 SIGN-OFF

Once all tests pass:

**Tested By:** _______________  
**Date:** _______________  
**Status:** ✅ PASS / ❌ FAIL  
**Ready for Production:** YES / NO  

**Notes:**
```
[Any final notes or recommendations]
```

---

## 🆘 TROUBLESHOOTING

### Loader Not Appearing
**Problem:** Loading state shows old `Loader2` icon

**Solution:**
1. Clear browser cache (Cmd/Ctrl + Shift + R)
2. Restart dev server:
   ```bash
   # Kill server
   pkill -f "next dev"
   
   # Clear Next.js cache
   rm -rf .next
   
   # Restart
   npm run dev
   ```

### Animation Stuttering
**Problem:** Shimmer effect is choppy

**Solution:**
1. Check CPU usage (reduce to < 80%)
2. Close other browser tabs
3. Update browser to latest version
4. Check hardware acceleration enabled

### Import Errors
**Problem:** `AIWorxButtonLoader` not found

**Solution:**
1. Verify file exists: `components/ui/AIWorxLoader.tsx`
2. Check exports in `components/ui/index.ts`
3. Restart TypeScript server in VSCode
4. Run `npm install` to refresh

### Tailwind Not Compiling
**Problem:** Shimmer animation not working

**Solution:**
1. Check `tailwind.config.ts` has new keyframes
2. Restart dev server completely
3. Clear `.next` folder
4. Verify `animate-shimmer` class applied

---

**Happy Testing! 🎉**

For questions or issues, check the main implementation doc:
`AI_WORX_LOADER_IMPLEMENTATION.md`
