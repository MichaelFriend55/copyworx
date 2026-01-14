# Debugging the Waitlist System

## 🔍 How to Debug

The middleware now includes comprehensive console logging to help you troubleshoot issues.

---

## 📊 Console Logs Explained

When the middleware runs, you'll see console logs in your **terminal** (where `npm run dev` is running), not in the browser console.

### Log Format

```
🔐 Auth check: {
  userId: 'user_xxxxx',
  pathname: '/dashboard',
  userEmail: 'test@example.com',
  sessionClaimsKeys: ['email', 'sub', 'iat', ...]
}

🔐 Email check: {
  userEmail: 'test@example.com',
  approvedEmails: ['michaelfriend55@gmail.com'],
  isApproved: false,
  envVar: '✅ Set'
}

🚫 Unapproved user trying to access protected route - redirecting to waitlist
```

---

## 🎯 What Each Log Means

### 1. Auth Check Log

```
🔐 Auth check: {
  userId: 'user_2abc123',
  pathname: '/dashboard',
  userEmail: 'user@example.com',
  sessionClaimsKeys: ['email', 'sub', ...]
}
```

**What to check:**
- ✅ `userId` should be present (user is authenticated)
- ✅ `userEmail` should match the email you signed in with
- ✅ `sessionClaimsKeys` shows what data Clerk is providing

**Common issues:**
- ❌ `userEmail` is `undefined` → Clerk isn't providing email in session claims
- ❌ `userEmail` doesn't match your actual email → Check Clerk dashboard

### 2. Email Check Log

```
🔐 Email check: {
  userEmail: 'test@example.com',
  approvedEmails: ['michaelfriend55@gmail.com'],
  isApproved: false,
  envVar: '✅ Set'
}
```

**What to check:**
- ✅ `userEmail` is lowercase (normalized)
- ✅ `approvedEmails` array contains your email (also lowercase)
- ✅ `isApproved` should be `true` for your email
- ✅ `envVar` shows if `APPROVED_USER_EMAILS` is set

**Common issues:**
- ❌ `approvedEmails: []` → Environment variable not set or empty
- ❌ `envVar: '❌ Not set'` → Add to `.env.local` and restart
- ❌ Email in list but `isApproved: false` → Check for typos

### 3. Action Logs

```
✅ Approved user accessing protected route - allowing
⏳ Unapproved user accessing waitlist - allowing
🚫 Unapproved user trying to access protected route - redirecting to waitlist
```

These show what action the middleware is taking.

---

## 🔧 Debugging Scenarios

### Scenario 1: "I'm approved but still see waitlist"

**Check the logs:**
```
🔐 Email check: {
  userEmail: 'michaelfriend55@gmail.com',
  approvedEmails: ['michael@gmail.com'],  // ❌ Wrong email!
  isApproved: false,
  envVar: '✅ Set'
}
```

**Fix:** Update `.env.local` with the correct email and restart.

---

### Scenario 2: "Environment variable not working"

**Check the logs:**
```
🔐 Email check: {
  userEmail: 'test@example.com',
  approvedEmails: [],  // ❌ Empty array
  isApproved: false,
  envVar: '❌ Not set'  // ❌ Env var missing
}
```

**Fix:** 
1. Add to `.env.local`: `APPROVED_USER_EMAILS=michaelfriend55@gmail.com`
2. Restart dev server
3. Hard refresh browser

---

### Scenario 3: "Email not found in Clerk session"

**Check the logs:**
```
🔐 Auth check: {
  userId: 'user_123',
  pathname: '/dashboard',
  userEmail: undefined,  // ❌ No email!
  sessionClaimsKeys: ['sub', 'iat', ...]
}

🔐 No email provided to isApprovedUser
```

**Fix:**
1. Check Clerk dashboard for user's email verification status
2. Ensure user has verified their email
3. Check Clerk session configuration
4. Update middleware to try additional email sources

---

### Scenario 4: "Case sensitivity issue"

This is now **fixed**! Emails are normalized to lowercase:

**Before:**
```
userEmail: 'Michael@Gmail.com'
approvedEmails: ['michaelfriend55@gmail.com']
isApproved: false  // ❌ Case mismatch
```

**After:**
```
userEmail: 'michael@gmail.com'  // ✅ Normalized
approvedEmails: ['michaelfriend55@gmail.com']  // ✅ Normalized
isApproved: true  // ✅ Match!
```

---

## 🎯 Quick Debug Checklist

When you see unexpected behavior:

1. **Check terminal logs** (not browser console)
2. **Look for 🔐 emoji logs** - they show auth flow
3. **Verify `userEmail` matches your actual email**
4. **Verify `approvedEmails` array contains your email**
5. **Check `envVar` status** - should be `✅ Set`
6. **Confirm `isApproved: true`** for your email
7. **Restart dev server** after any `.env.local` changes
8. **Clear cookies** and sign in again

---

## 📋 Example: Successful Auth

Here's what you should see when everything works:

```
🔐 Auth check: {
  userId: 'user_2abc123',
  pathname: '/dashboard',
  userEmail: 'michaelfriend55@gmail.com',
  sessionClaimsKeys: ['email', 'sub', 'iat', 'exp', ...]
}

🔐 Email check: {
  userEmail: 'michaelfriend55@gmail.com',
  approvedEmails: ['michaelfriend55@gmail.com'],
  isApproved: true,
  envVar: '✅ Set'
}

✅ Approved user accessing protected route - allowing
```

---

## 📋 Example: Unapproved User

Here's what an unapproved user sees:

```
🔐 Auth check: {
  userId: 'user_2xyz789',
  pathname: '/dashboard',
  userEmail: 'newuser@test.com',
  sessionClaimsKeys: ['email', 'sub', ...]
}

🔐 Email check: {
  userEmail: 'newuser@test.com',
  approvedEmails: ['michaelfriend55@gmail.com'],
  isApproved: false,
  envVar: '✅ Set'
}

🚫 Unapproved user trying to access protected route - redirecting to waitlist
```

---

## 🛠️ Advanced Debugging

### Enable More Detailed Clerk Logs

Add to `.env.local`:
```bash
CLERK_DEBUG=true
```

### Check Environment Variables at Runtime

Add a test endpoint: `app/api/debug/env/route.ts`
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasApprovedEmails: !!process.env.APPROVED_USER_EMAILS,
    approvedCount: process.env.APPROVED_USER_EMAILS?.split(',').length || 0,
    // Don't expose actual emails in production!
  });
}
```

Access: `http://localhost:3000/api/debug/env`

---

## 🔒 Removing Debug Logs for Production

Once everything works, you can remove the console.log statements:

1. Open `middleware.ts`
2. Search for `console.log`
3. Remove or comment out the debug lines
4. Or wrap them: `if (process.env.NODE_ENV === 'development') { console.log(...) }`

---

## 📞 Still Having Issues?

If logs show everything correct but it still doesn't work:

1. **Clear all site data** in browser (cookies, cache, local storage)
2. **Try incognito/private mode**
3. **Check Vercel logs** if deployed (Vercel dashboard → Functions → Logs)
4. **Verify Clerk webhook/session settings**
5. **Check browser network tab** for redirect loops

---

**The debug logs will help you identify issues quickly! 🚀**
