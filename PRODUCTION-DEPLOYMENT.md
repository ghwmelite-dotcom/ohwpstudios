

# Production Deployment Guide

Complete guide to deploy your agency website to Cloudflare Pages with persistent database storage.

---

## 🎯 What This Fixes

**Problem**: Changes made in the admin portal revert to default after deployment/restart

**Solution**: Use Cloudflare D1 database for persistent storage

**Result**: All changes saved in the admin portal will persist permanently, even after deployments

---

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ Cloudflare account (free tier works)
- ✅ Node.js and npm installed
- ✅ Wrangler CLI installed (`npm install -g wrangler`)
- ✅ Git installed
- ✅ GitHub account (for automatic deployments)

---

## 🚀 Quick Deployment (Automated)

### Option 1: Using PowerShell (Windows)

```powershell
.\deploy.ps1
```

### Option 2: Using Bash (Mac/Linux)

```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Build your project
2. Set up the D1 database
3. Run migrations
4. Deploy to Cloudflare Pages

---

## 📝 Manual Deployment (Step-by-Step)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate.

### Step 3: Create D1 Database

```bash
wrangler d1 create agency-db
```

**Important**: Copy the `database_id` from the output.

### Step 4: Update wrangler.toml

Open `wrangler.toml` and update the `database_id`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "agency-db"
database_id = "YOUR_ACTUAL_DATABASE_ID_HERE"  # Paste the ID here
```

### Step 5: Run Database Migrations

```bash
wrangler d1 execute agency-db --file=migrations/001_initial_setup.sql --remote
```

This creates all tables and inserts default content.

### Step 6: Build the Project

```bash
npm run build
```

### Step 7: Deploy to Cloudflare Pages

```bash
wrangler pages deploy dist --project-name=agency-website
```

### Step 8: Access Your Live Site

Your site will be available at:
```
https://agency-website.pages.dev
```

---

## 🔐 First-Time Setup

### 1. Access Admin Portal

Go to: `https://agency-website.pages.dev/admin/login`

### 2. Login with Default Credentials

```
Username: admin
Password: admin123
```

### 3. ⚠️ Change Password Immediately!

For security, change the default password right away.

### 4. Customize Your Content

- Edit hero section
- Update site settings
- Add your services
- Build your portfolio

**All changes will now persist permanently!** 🎉

---

## 🔄 Updating Your Site

### Making Content Changes

1. Log in to admin portal
2. Make your changes
3. Click "Save Changes"
4. Changes are instantly live (no redeployment needed!)

### Updating Code

When you update the codebase:

```bash
# Build
npm run build

# Deploy
wrangler pages deploy dist --project-name=agency-website
```

**Your content changes are safe!** They're stored in the database and won't be affected by code deployments.

---

## 🔗 Connecting to GitHub (Optional but Recommended)

### Benefits of GitHub Integration

- Automatic deployments on git push
- Preview deployments for pull requests
- Version control
- Collaboration features

### Setup Steps

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/agency-website.git
   git push -u origin main
   ```

3. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to Pages
   - Click "Create a project"
   - Connect your GitHub repository
   - Configure build settings:
     - Build command: `npm run build`
     - Build output directory: `dist`
   - Click "Save and Deploy"

4. **Configure Environment**
   - In Cloudflare Pages project settings
   - Go to "Settings" → "Environment variables"
   - Add D1 database binding (already in wrangler.toml)

---

## 🎨 Custom Domain Setup

### Adding Your Own Domain

1. **Go to Cloudflare Pages Project**
   - Select your project
   - Go to "Custom domains"

2. **Add Domain**
   - Click "Set up a custom domain"
   - Enter your domain (e.g., `yoursite.com`)

3. **Update DNS**
   - Cloudflare will provide DNS records
   - Update your domain's DNS settings
   - Wait for propagation (usually a few minutes)

4. **SSL Certificate**
   - Automatically provisioned by Cloudflare
   - Your site will be HTTPS-enabled

5. **Update Site URL**
   - Update `wrangler.toml`:
     ```toml
     [vars]
     SITE_URL = "https://yoursite.com"
     ```

---

## 📊 Database Management

### Viewing Database Content

```bash
# List all tables
wrangler d1 execute agency-db --command="SELECT name FROM sqlite_master WHERE type='table';" --remote

# View site content
wrangler d1 execute agency-db --command="SELECT * FROM site_content;" --remote

# View services
wrangler d1 execute agency-db --command="SELECT * FROM services;" --remote
```

### Backing Up Database

```bash
# Export all data
wrangler d1 export agency-db --remote --output=backup.sql
```

### Restoring from Backup

```bash
wrangler d1 execute agency-db --file=backup.sql --remote
```

### Resetting to Defaults

If you want to reset your content:

```bash
wrangler d1 execute agency-db --file=migrations/001_initial_setup.sql --remote
```

---

## 🔍 Troubleshooting

### Issue: "Database not found"

**Solution**:
```bash
wrangler d1 list
```
If database doesn't exist, create it:
```bash
wrangler d1 create agency-db
```

### Issue: "Changes not saving"

**Checks**:
1. Verify database ID in `wrangler.toml` is correct
2. Check browser console for errors
3. Verify you're logged in to admin portal
4. Check database connection:
   ```bash
   wrangler d1 execute agency-db --command="SELECT 1;" --remote
   ```

### Issue: "Build fails"

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules .astro dist
npm install
npm run build
```

### Issue: "Deployment timeout"

**Solution**:
- Check your internet connection
- Try deploying again
- Use `--verbose` flag for details:
  ```bash
  wrangler pages deploy dist --project-name=agency-website --verbose
  ```

### Issue: "Admin portal not accessible"

**Checks**:
1. Verify URL: `https://your-site.pages.dev/admin/login`
2. Clear browser cache
3. Try incognito/private mode
4. Check deployment logs in Cloudflare dashboard

---

## 📈 Monitoring & Analytics

### Cloudflare Analytics

1. Go to your Pages project dashboard
2. Click "Analytics & Logs"
3. View:
   - Page views
   - Unique visitors
   - Bandwidth usage
   - Performance metrics

### Adding Google Analytics (Optional)

Add to `src/layouts/BaseLayout.astro` in the `<head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🔒 Security Best Practices

### 1. Change Default Password

⚠️ **Critical**: Change `admin123` immediately after first login

### 2. Enable Two-Factor Authentication

- Use Cloudflare Access for additional security
- Set up in Cloudflare dashboard

### 3. Regular Backups

Schedule weekly database backups:

```bash
# Add to cron job or GitHub Actions
wrangler d1 export agency-db --remote --output=backup-$(date +%Y%m%d).sql
```

### 4. Monitor Access Logs

- Check Cloudflare dashboard regularly
- Set up alerts for suspicious activity

### 5. Keep Dependencies Updated

```bash
npm update
npm audit fix
```

---

## 💰 Cost Estimate

### Cloudflare Free Tier Includes:

- ✅ Unlimited bandwidth
- ✅ 100,000 Pages requests/day
- ✅ 500 builds/month
- ✅ D1: 5 million reads/day
- ✅ D1: 100,000 writes/day
- ✅ 5 GB database storage

**Expected Monthly Cost**: **$0** for small-medium sites

### Paid Plans (if needed):

- **Pages Pro**: $20/month
  - More builds
  - More concurrent builds
  - Advanced features

- **D1 Paid**: Only if you exceed free tier
  - Very generous limits
  - Most sites won't exceed

---

## 🎓 Next Steps After Deployment

### Week 1: Content

- [ ] Customize all hero content
- [ ] Update site settings
- [ ] Add your services
- [ ] Upload portfolio projects
- [ ] Write first blog post

### Week 2: Optimization

- [ ] Optimize images
- [ ] Set up custom domain
- [ ] Configure analytics
- [ ] Test all forms
- [ ] Mobile testing

### Week 3: Marketing

- [ ] Submit sitemap to Google
- [ ] Set up Google Search Console
- [ ] Social media integration
- [ ] Email marketing setup
- [ ] SEO optimization

### Ongoing: Maintenance

- [ ] Weekly content updates
- [ ] Monthly performance reviews
- [ ] Security updates
- [ ] Database backups
- [ ] Analytics monitoring

---

## 📞 Support

### Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Astro Documentation](https://docs.astro.build/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

### Community

- [Cloudflare Discord](https://discord.gg/cloudflare)
- [Astro Discord](https://astro.build/chat)

---

## 🎉 Congratulations!

Your agency website is now:

- ✅ Deployed to production
- ✅ Using persistent database storage
- ✅ Admin changes persist forever
- ✅ Globally distributed on Cloudflare's edge
- ✅ Lightning fast
- ✅ Secure and scalable

**Ready to dominate your industry!** 🚀

---

**Built with ❤️ using Astro, Cloudflare, and modern web technologies**

