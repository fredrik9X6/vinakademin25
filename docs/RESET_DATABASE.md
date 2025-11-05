# Database Reset Guide

## Quick Reset Steps

### Option 1: Via Neon Dashboard (Easiest)

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to **Branches** → Select your branch
4. Click **Settings** → **Reset Branch** or **Delete Branch Data**
5. Confirm the reset

### Option 2: Via SQL (If you have direct access)

```sql
-- Connect to your Neon database
-- Then run:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### After Reset

1. **Restart your dev server** - PayloadCMS will recreate all tables automatically
2. **Create first admin user** - Go to `/admin` and create your account
3. **Verify S3 is working** - Upload a test file to confirm it goes to S3

---

## ⚠️ CRITICAL: Preventing This Issue

### The Problem

If you upload files in development WITHOUT S3 configured:
- Files stored locally on your machine
- Database records reference these local files
- When deployed to production → Files don't exist → **Admin panel crashes**

### The Solution

**ALWAYS use S3 in development** - it matches production exactly.

### Required Setup

**Add these to your `.env` file BEFORE uploading any files:**

```bash
# S3 Configuration (REQUIRED for file uploads)
S3_BUCKET=your-bucket-name
S3_REGION=your-region
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_URL=https://your-cdn-url.com  # Optional but recommended
```

### How It Works

The config automatically:
- ✅ Uses `dev/` prefix in development
- ✅ Uses `production/` prefix in production  
- ✅ Keeps environments separate in same bucket
- ✅ Prevents missing file errors

### Verification Checklist

After reset and setup:

- [ ] S3 env vars are set in `.env`
- [ ] Dev server restarted with S3 configured
- [ ] Can upload files in admin panel
- [ ] Files appear in S3 bucket under `dev/` prefix
- [ ] No local file storage (everything goes to S3)
- [ ] Production uses `production/` prefix (automatic)

### What Happens If You Don't Use S3?

If you omit S3 env vars:
- ❌ Files stored locally → Won't exist in production
- ❌ **Same problem will happen again!**
- ❌ Admin panel will crash when files are missing
- ❌ Error boundaries will catch it, but files still won't work

---

## Best Practice

**Always use S3 in development** - it's the only way to match production behavior and prevent this issue.

You can use the same S3 bucket for both dev and prod - the prefix system (`dev/` vs `production/`) keeps them completely separate.
