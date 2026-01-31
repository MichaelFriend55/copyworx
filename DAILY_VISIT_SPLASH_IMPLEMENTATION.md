# Daily Visit Splash Page Implementation

## Overview

Implemented a "first visit of the day" redirect system that automatically shows users the `/home` splash page on their first visit each day. Subsequent visits on the same day go directly to `/worxspace`.

## Implementation Details

### 1. Core Utility: `daily-visit-tracker.ts`

**Location:** `/lib/utils/daily-visit-tracker.ts`

**Key Functions:**

- `shouldRedirectToSplash()` - Checks if user should see splash page
- `markDailyVisitComplete()` - Records that user has visited splash today
- `markSplashViewed()` - Prevents redirect loops while on splash page
- `getLastVisitDate()` - Debugging helper
- `clearVisitTracking()` - Testing helper
- `setCustomVisitDate(date)` - Testing helper for simulating past dates

**How It Works:**

1. Uses **localStorage** to persist `copyworx_last_visit_date` across browser sessions
2. Uses **sessionStorage** to track `copyworx_splash_viewed_session` to prevent redirect loops
3. Compares dates in `YYYY-MM-DD` format for consistent cross-timezone behavior
4. Returns `true` for redirect if:
   - No last visit date exists (first time ever), OR
   - Last visit date is not today, AND
   - Splash has not been viewed in this session

### 2. Workspace Page Redirect Logic

**Location:** `/app/worxspace/page.tsx`

**Changes:**

```typescript
// Added imports
import { useRouter } from 'next/navigation';
import { shouldRedirectToSplash } from '@/lib/utils/daily-visit-tracker';

// Added ref to prevent double-checking
const dailyCheckRef = useRef(false);

// Added useEffect for daily visit check
useEffect(() => {
  if (!mounted || dailyCheckRef.current) return;
  dailyCheckRef.current = true;
  
  if (shouldRedirectToSplash()) {
    logger.log('🌅 First visit of the day - redirecting to splash page');
    router.push('/home');
  } else {
    logger.log('✅ Already visited today - continuing to workspace');
  }
}, [mounted, router]);
```

**Behavior:**

- Runs once after component mounts
- Checks if it's the first visit of the day
- Redirects to `/home` if needed
- Otherwise allows normal workspace loading

### 3. Splash Page Visit Tracking

**Location:** `/components/splash/SplashPage.tsx`

**Changes:**

```typescript
// Added imports
import { markDailyVisitComplete, markSplashViewed } from '@/lib/utils/daily-visit-tracker';

// Mark splash as viewed when page loads (prevents redirect loops)
useEffect(() => {
  markSplashViewed();
}, []);

// Updated all button handlers to mark visit complete
const handleNewDocument = async () => {
  markDailyVisitComplete(); // ← Added
  // ... rest of handler
};

const handleAITemplate = () => {
  markDailyVisitComplete(); // ← Added
  // ... rest of handler
};

const handleImport = () => {
  markDailyVisitComplete(); // ← Added
  // ... rest of handler
};

const handleGoToWorxspace = () => {
  markDailyVisitComplete(); // ← Added
  // ... rest of handler
};

const handleTemplateSelect = async (templateId: string) => {
  markDailyVisitComplete(); // ← Added
  // ... rest of handler
};
```

**Behavior:**

- Marks splash as viewed immediately on page load (prevents redirect loops)
- Marks daily visit complete when user clicks any button
- Updates both localStorage (persistent) and sessionStorage (session-only)

## Date Comparison Logic

The system uses **YYYY-MM-DD** format for date comparison:

```typescript
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**Why this format?**

- Simple string comparison (`lastDate !== todayDate`)
- No timezone conversion issues
- Human-readable for debugging
- Works across browser sessions

## Testing Guide

### Test 1: First Time User (No Visit Date)

**Steps:**

1. Open browser DevTools → Application → Local Storage
2. Delete key: `copyworx_last_visit_date` (if it exists)
3. Navigate to `/worxspace`
4. **Expected:** Redirected to `/home` splash page

### Test 2: User Clicks Splash Button

**Steps:**

1. From splash page, click any button (New, AI@Worx, Import, or Worxspace)
2. Check Local Storage → `copyworx_last_visit_date` should be set to today
3. Navigate to `/worxspace` again
4. **Expected:** Stay on `/worxspace` (no redirect)

### Test 3: Same Day Refresh

**Steps:**

1. With `copyworx_last_visit_date` set to today
2. Refresh `/worxspace` page multiple times
3. **Expected:** Stay on `/worxspace` (no redirect)

### Test 4: Next Day Visit (Manual Simulation)

**Steps:**

1. Open browser DevTools → Console
2. Run this code to simulate yesterday's visit:

```javascript
// Get yesterday's date
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().split('T')[0]; // Format: YYYY-MM-DD

// Set yesterday as last visit
localStorage.setItem('copyworx_last_visit_date', dateStr);

// Clear session flag to allow redirect
sessionStorage.removeItem('copyworx_splash_viewed_session');

console.log('✅ Set last visit to yesterday:', dateStr);
```

3. Navigate to `/worxspace`
4. **Expected:** Redirected to `/home` splash page
5. Click any splash button
6. **Expected:** Navigate to workspace and stay there on subsequent visits

### Test 5: No Redirect Loops

**Steps:**

1. Clear all tracking data
2. Navigate directly to `/home` splash page
3. Do NOT click any button - just refresh the page
4. **Expected:** Stay on `/home` (no redirect loop to workspace)
5. Navigate manually to `/worxspace`
6. **Expected:** Redirected back to `/home` (first visit not complete yet)
7. Click any splash button
8. **Expected:** Can now navigate freely to `/worxspace`

### Test 6: Clear Tracking (Reset to Fresh State)

**Console Command:**

```javascript
// Option 1: Use utility function (if imported)
// clearVisitTracking();

// Option 2: Manual clear
localStorage.removeItem('copyworx_last_visit_date');
sessionStorage.removeItem('copyworx_splash_viewed_session');
console.log('🧹 Visit tracking cleared');
```

## How to Simulate "Next Day"

### Method 1: Change System Date (Not Recommended)

- Change your computer's system date
- Reload the browser
- Note: May cause issues with other apps/services

### Method 2: Modify localStorage (Recommended)

**Using Browser DevTools:**

1. Application → Local Storage → `copyworx_last_visit_date`
2. Edit value to any past date (e.g., `2026-01-30` if today is `2026-01-31`)
3. Reload page

**Using Console:**

```javascript
// Set to yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
localStorage.setItem('copyworx_last_visit_date', yesterday.toISOString().split('T')[0]);
sessionStorage.removeItem('copyworx_splash_viewed_session');
```

**Using Test Utility Function:**

```javascript
// If you expose the utility in the console (for testing)
import { setCustomVisitDate } from '@/lib/utils/daily-visit-tracker';

// Set to specific date
setCustomVisitDate('2026-01-30');
```

## Files Modified

### Created:

- `/lib/utils/daily-visit-tracker.ts` - Core tracking utility

### Modified:

- `/app/worxspace/page.tsx` - Added redirect logic
- `/components/splash/SplashPage.tsx` - Added visit tracking on button clicks

## Technical Notes

### Why sessionStorage AND localStorage?

- **localStorage** = Persists the last visit date across browser sessions
- **sessionStorage** = Prevents redirect loops within the same browsing session

**Example Flow:**

1. User visits for first time → `localStorage: null`, `sessionStorage: null` → Redirect to `/home`
2. User lands on `/home` → `sessionStorage: 'true'` set → No redirect loop
3. User clicks button → `localStorage: '2026-01-31'` set → Navigate to workspace
4. User refreshes workspace → Both flags set → No redirect
5. User closes browser → `sessionStorage` cleared, `localStorage` persists
6. User reopens next day → `localStorage: '2026-01-31'` (yesterday) → Redirect to `/home` again

### Edge Cases Handled

✅ **First time user** - No localStorage → Redirect to splash
✅ **Same day refresh** - localStorage matches today → No redirect
✅ **Next day visit** - localStorage is yesterday → Redirect to splash
✅ **Direct /home navigation** - sessionStorage prevents redirect loop
✅ **Multiple tabs** - sessionStorage is per-tab, localStorage is shared
✅ **Browser close/reopen** - localStorage persists, sessionStorage cleared
✅ **Incognito mode** - Works normally (localStorage cleared on exit)
✅ **localStorage disabled** - Graceful fallback (no redirect)

## Console Logs

The system includes helpful console logs for debugging:

- `🌅 First visit of the day - redirecting to splash page` - Worxspace redirect triggered
- `✅ Already visited today - continuing to workspace` - Worxspace redirect skipped
- `✅ Splash page viewed (session marked)` - Splash page loaded
- `✅ Daily visit marked complete: YYYY-MM-DD` - User clicked splash button

## Future Enhancements (Optional)

- Analytics tracking for splash page views
- A/B testing different splash page layouts
- User preference to skip splash page (localStorage flag)
- Welcome message on splash for returning users
- "You last visited X days ago" message

## Summary

The implementation provides a seamless "first visit of the day" experience:

1. **First visit each day** → See splash page
2. **Click any button** → Navigate to workspace
3. **Rest of the day** → Direct workspace access
4. **Next day** → See splash page again

All tracking is client-side, privacy-friendly, and doesn't require backend changes.
