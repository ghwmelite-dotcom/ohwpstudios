# 🚀 Deploy to Production NOW - Quick Guide

Your site is **ready to deploy** with **persistent database storage** that will survive all deployments!

---

## ✅ What's Been Fixed

**Before**: Changes reverted to default on every deployment  
**After**: All admin changes persist permanently in Cloudflare D1 database

---

## 🎯 Deploy in 3 Steps

### Step 1: Run the Migration (First Time Only)

```powershell
wrangler d1 execute agency-db --file=migrations/001_initial_setup.sql --remote
```

This creates your database tables and inserts default content.

### Step 2: Deploy to Cloudflare

```powershell
wrangler pages deploy dist --project-name=agency-website
```

### Step 3: Access Your Live Site!

Your site will be at: `https://agency-website.pages.dev`

---

## 📋 Complete Command Sequence

Copy and paste these commands one by one:

```powershell
# 1. Login to Cloudflare (if not already logged in)
wrangler login

# 2. Run database migration
wrangler d1 execute agency-db --file=migrations/001_initial_setup.sql --remote

# 3. Deploy
wrangler pages deploy dist --project-name=agency-website
```

---

## 🎉 That's It!

Your site is now:
- ✅ **Live** in production
- ✅ **Database-backed** - all changes persist forever
- ✅ **Admin portal** fully functional
- ✅ **Globally distributed** on Cloudflare's edge network

---

## 🔐 First Login

1. Go to: `https://agency-website.pages.dev/admin/login`
2. Login: `admin` / `admin123`
3. **⚠️ Change password immediately!**
4. Start managing your content!

---

## 💾 Updating Content

1. Log in to admin portal
2. Make changes
3. Click "Save Changes"
4. **Changes persist forever** - no redeployment needed!

---

## 🔄 Deploying Code Updates

When you update the codebase:

```powershell
# Build
npm run build

# Deploy
wrangler pages deploy dist --project-name=agency-website
```

**Your content is safe!** It's stored in the database, not in code.

---

## 📚 Need More Info?

- **Full Guide**: See `PRODUCTION-DEPLOYMENT.md`
- **Checklist**: See `DEPLOYMENT-CHECKLIST.md`
- **Automated Script**: Run `.\deploy.ps1` (does everything automatically)

---

## 🆘 Troubleshooting

### "Database not found"

```powershell
wrangler d1 list
```

If not listed, your database_id in `wrangler.toml` might be wrong.

### "Migration failed"

Ensure the migration file exists:
```powershell
Test-Path migrations/001_initial_setup.sql
```

### "Build not found"

Run the build first:
```powershell
npm run build
```

---

## 🎊 You're Ready!

Everything is set up for production deployment with persistent storage.

**Run the commands above and go live!** 🚀

