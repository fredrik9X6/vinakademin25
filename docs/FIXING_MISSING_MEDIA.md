# Fixing Missing Media Files & Development Setup

## Problem

- Files uploaded in local development are stored locally (not in S3)
- Database records reference these local files
- When deployed to production, PayloadCMS tries to fetch them from S3 → **crash**
- Admin panel crashes because Server Components can't handle missing files

## Solutions

### Option 1: Use S3 in Development (Recommended) ⭐

**Best for:** Matching production environment exactly

**Setup:**
1. Add S3 env vars to your `.env` file:
   ```bash
   S3_BUCKET=your-bucket-name
   S3_REGION=your-region
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_PUBLIC_URL=https://your-cdn-url.com  # Optional
   ```

2. Files will automatically use `dev/` prefix in development, `production/` in production
   - This keeps dev and prod files separate
   - You can test uploads without affecting production

3. Restart dev server:
   ```bash
   pnpm dev
   ```

**Benefits:**
- ✅ Matches production exactly
- ✅ Can test file uploads properly
- ✅ No local file conflicts
- ✅ Files persist across restarts

**Note:** If you don't want to use S3 in dev, you can omit S3 env vars - PayloadCMS will use local storage (but you'll have the same problem when deploying).

---

### Option 2: Clean Up Broken Media Records (Quick Fix)

**Best for:** Fixing production without wiping database

**Run the cleanup script:**
```bash
# First, review what will be deleted (dry run)
pnpm cleanup-media

# Then edit scripts/cleanup-missing-media.ts and uncomment the deletion code
# Then run again to actually delete
pnpm cleanup-media
```

**What it does:**
- Finds all media records
- Identifies ones with missing files
- Deletes only broken records
- Keeps all other data intact

**Benefits:**
- ✅ Fixes admin panel crash
- ✅ Keeps all other data
- ✅ No need to recreate users/content

---

### Option 3: Wipe Database (Nuclear Option)

**Best for:** Fresh start, no existing data

**Steps:**
1. Connect to Neon database
2. Drop all tables or reset database
3. Run migrations again
4. Create first admin user

**⚠️ Warning:** You'll lose ALL data (users, content, courses, etc.)

---

## Recommended Setup for Development

### Use S3 in Development

1. **Set up S3 credentials in `.env`:**
   ```bash
   # Same S3 bucket as production (or use a dev bucket)
   S3_BUCKET=your-bucket-name
   S3_REGION=your-region
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_PUBLIC_URL=https://your-cdn-url.com
   ```

2. **Files will be stored with `dev/` prefix:**
   - Development: `dev/filename.jpg`
   - Production: `production/filename.jpg`
   - Keeps environments separate

3. **Test uploads:**
   - Upload files in admin panel
   - They'll go to S3 under `dev/` prefix
   - Won't conflict with production files
   - Matches production behavior

### Alternative: Use Local Storage (Not Recommended)

If you don't want to use S3 in dev:
- Omit S3 env vars → PayloadCMS uses local storage
- ⚠️ Files won't persist when you deploy
- ⚠️ Will have same missing file problems
- ⚠️ Can't test production file behavior

---

## Current Configuration

The config now automatically:
- Uses `dev/` prefix in development
- Uses `production/` prefix in production
- Can be overridden with `S3_PREFIX` env var
- Falls back to local storage if S3 not configured

---

## Next Steps

1. **Immediate fix:** Run `pnpm cleanup-media` to remove broken records
2. **Long-term:** Set up S3 in development for proper testing
3. **Test:** Upload files in dev → verify they work in production

---

## FAQ

**Q: Can I use the same S3 bucket for dev and prod?**
A: Yes! The prefix system (`dev/` vs `production/`) keeps them separate.

**Q: What if I don't want to use S3 in dev?**
A: You can omit S3 env vars - PayloadCMS will use local storage. But you'll have the same problem when deploying.

**Q: Will wiping the database fix it?**
A: Yes, but you'll lose all your data. Better to use the cleanup script.

**Q: How do I test file uploads if I can't upload?**
A: Set up S3 in development - then you can upload and test just like production!

