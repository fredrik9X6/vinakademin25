# Testing S3 Setup After Database Reset

## ✅ What You've Done

1. ✅ Set new database URL (fresh database)
2. ✅ Added S3 env vars to `.env` file

## 🚀 Next Steps

### 1. Restart Dev Server

**Important:** Restart your dev server to pick up the new environment variables:

```bash
# Stop current server (Ctrl+C)
# Then restart:
pnpm dev
```

### 2. Verify S3 Configuration

Check that your `.env` file has all required S3 variables:

```bash
# Required variables:
S3_BUCKET=your-bucket-name
S3_REGION=your-region
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Optional but recommended:
S3_PUBLIC_URL=https://your-cdn-url.com
```

### 3. Test File Upload

1. **Start dev server:** `pnpm dev`
2. **Go to admin panel:** `http://localhost:3000/admin`
3. **Create admin user** (if first time)
4. **Upload a test file:**
   - Go to Media collection
   - Click "Upload"
   - Select an image file
   - Upload it

### 4. Verify Files Go to S3

After uploading:
- Check your S3 bucket
- You should see files under `dev/` prefix (e.g., `dev/filename.jpg`)
- Files should NOT be stored locally

### 5. Check Server Logs

When you upload, you should see:
- ✅ No errors about missing files
- ✅ Files being uploaded to S3
- ✅ Success messages

### 6. Verify Prefix Separation

The config automatically:
- **Development:** Files go to `dev/` prefix
- **Production:** Files go to `production/` prefix

This keeps environments separate!

---

## 🔍 Troubleshooting

### If files aren't uploading to S3:

1. **Check env vars are loaded:**
   ```bash
   # In your terminal, check if vars are set:
   echo $S3_BUCKET  # Should show your bucket name
   ```

2. **Restart dev server** - env vars only load on startup

3. **Check S3 credentials** - Make sure they're correct

4. **Check bucket permissions** - Your S3 credentials need write access

### If you see errors:

- **"NoSuchKey" errors:** Shouldn't happen now since you're using S3
- **"Access Denied":** Check S3 credentials and bucket permissions
- **"Bucket not found":** Verify bucket name matches exactly

---

## ✅ Success Checklist

After setup, verify:

- [ ] Dev server restarted
- [ ] Can access `/admin` panel
- [ ] Can upload files in admin panel
- [ ] Files appear in S3 bucket under `dev/` prefix
- [ ] No local file storage happening
- [ ] No errors in console/logs
- [ ] Files display correctly in admin panel

---

## 🎯 What This Prevents

With S3 configured:
- ✅ Files stored in S3 (not locally)
- ✅ Files available in production
- ✅ No missing file errors
- ✅ Admin panel won't crash
- ✅ Can test uploads properly

**You're all set!** 🎉

