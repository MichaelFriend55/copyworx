# Waitlist/Approval System Setup

## Overview

The waitlist system restricts access to approved users only. Any user who signs up through Clerk but is not on the approved list will see a waitlist page instead of accessing the app.

---

## ✅ Implementation Complete

The following files have been created/updated:

1. **`middleware.ts`** - Updated with approval logic
2. **`app/waitlist/page.tsx`** - New waitlist page
3. **`.env.example`** - Template for environment variables

---

## 🚀 Setup Instructions

### 1. Add Environment Variable to `.env.local`

Add this line to your `.env.local` file (create it if it doesn't exist):

```bash
APPROVED_USER_EMAILS=michaelfriend55@gmail.com
```

**For multiple approved users:**
```bash
APPROVED_USER_EMAILS=michaelfriend55@gmail.com,client@example.com,beta-tester@test.com
```

### 2. Local Testing

After adding the environment variable:

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Test with your approved email:**
   - Sign in with `michaelfriend55@gmail.com`
   - You should access the app normally

3. **Test with an unapproved email:**
   - Sign up with a different email (e.g., `test@example.com`)
   - You should see the waitlist page
   - Try accessing `/dashboard` - should redirect to `/waitlist`

4. **Test approved user on waitlist:**
   - Sign in with your approved email
   - Navigate to `/waitlist` - should redirect to `/dashboard`

---

## 🚀 Vercel Deployment

### 1. Add Environment Variable in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `APPROVED_USER_EMAILS`
   - **Value:** `michaelfriend55@gmail.com` (or comma-separated list)
   - **Environment:** Select **Production** (and **Preview** if needed)
4. Click **Save**

### 2. Redeploy

After adding the environment variable, redeploy your app:
- Push your code changes to GitHub
- Vercel will automatically redeploy
- Or manually trigger a redeploy in Vercel dashboard

---

## 🔒 How It Works

### Middleware Logic

The `middleware.ts` file intercepts all requests and:

1. **Allows public routes** without authentication:
   - `/` (homepage)
   - `/about`
   - `/pricing`
   - `/sign-in`
   - `/sign-up`
   - `/api/*`

2. **Requires authentication** for all other routes

3. **Checks approval status** for authenticated users:
   - Reads `APPROVED_USER_EMAILS` from environment
   - Compares user's email with approved list
   - Redirects unapproved users to `/waitlist`
   - Allows approved users full access

4. **Handles redirects:**
   - Unapproved user tries to access `/dashboard` → redirects to `/waitlist`
   - Approved user visits `/waitlist` → redirects to `/dashboard`

### Waitlist Page

The `/waitlist` page displays:
- Welcome message with user's name
- Explanation of private beta status
- User's registered email
- Contact information
- Sign out button

---

## 📋 Testing Checklist

- [ ] Environment variable added to `.env.local`
- [ ] Development server restarted
- [ ] Approved email can access `/dashboard`
- [ ] Approved email redirects from `/waitlist` to `/dashboard`
- [ ] Unapproved email sees waitlist page
- [ ] Unapproved email redirects from `/dashboard` to `/waitlist`
- [ ] Sign out works on waitlist page
- [ ] Environment variable added to Vercel
- [ ] Production deployment tested

---

## 🔧 Adding More Approved Users

### Locally (`.env.local`):
```bash
APPROVED_USER_EMAILS=michaelfriend55@gmail.com,newuser@example.com
```

### Vercel (Production):
1. Go to Vercel → Settings → Environment Variables
2. Edit `APPROVED_USER_EMAILS`
3. Update the value: `michaelfriend55@gmail.com,newuser@example.com`
4. Save
5. Redeploy (if not automatic)

**Note:** Always use comma-separated values with no spaces (or trim spaces in code).

---

## 🎨 Customizing the Waitlist Page

The waitlist page is located at `app/waitlist/page.tsx`. You can customize:

- **Branding:** Update colors, logo, messaging
- **Contact email:** Change `michael@copyworx.io` to your email
- **Content:** Modify welcome message and instructions
- **Styling:** Adjust Tailwind classes for different look

---

## 🛡️ Security Notes

1. **Environment Variables:**
   - Never commit `.env.local` to git (it's gitignored)
   - Keep `APPROVED_USER_EMAILS` secure
   - Don't expose approved emails in client-side code

2. **Middleware:**
   - Runs on the server (not exposed to client)
   - Checks on every request
   - Cannot be bypassed by client-side manipulation

3. **Clerk Authentication:**
   - Email verification handled by Clerk
   - Waitlist only applies to authenticated users
   - Public routes remain accessible

---

## 🐛 Troubleshooting

### Issue: Approved user sees waitlist page

**Solution:**
1. **Check the debug logs** in your terminal (where `npm run dev` is running)
   - Look for logs starting with 🔐
   - They show your email, approved emails list, and approval status
2. Check spelling of email in `APPROVED_USER_EMAILS`
3. Email comparison is now **case-insensitive** (michaelfriend55@gmail.com = MichaelFriend55@Gmail.com)
4. Ensure no extra spaces in the environment variable
5. Restart development server after changing `.env.local`
6. Clear browser cookies and sign in again

**See `DEBUGGING_WAITLIST.md` for detailed troubleshooting guide.**

### Issue: Unapproved user can access app

**Solution:**
1. Verify `APPROVED_USER_EMAILS` is set in environment
2. Check middleware.ts is in the root directory
3. Clear browser cache and cookies
4. Check middleware config matcher includes the route

### Issue: Infinite redirect loop

**Solution:**
1. Ensure `/waitlist` is not in `isPublicRoute`
2. Check middleware logic doesn't create circular redirects
3. Verify approved user check is working correctly

### Issue: Changes not working on Vercel

**Solution:**
1. Verify environment variable is set in Vercel
2. Select correct environment (Production/Preview)
3. Trigger a fresh deployment
4. Check Vercel function logs for errors

---

## 📞 Support

If you encounter issues:

1. Check the console for error messages
2. Review Vercel function logs (for production)
3. Verify environment variables are set correctly
4. Test locally before deploying to production

---

## ✨ Future Enhancements

Consider adding:

- **Database storage:** Store approved users in database instead of env var
- **Admin panel:** UI for managing approved users
- **Email notifications:** Auto-send approval emails
- **Waitlist form:** Collect additional info from waitlisted users
- **Priority tiers:** Different waitlist levels
- **Referral system:** Let users invite others

---

**Status:** ✅ Waitlist system is now active and protecting your app!
