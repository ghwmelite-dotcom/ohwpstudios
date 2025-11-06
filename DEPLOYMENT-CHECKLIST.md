# 🚀 Deployment Checklist

Use this checklist to ensure smooth deployment to production.

---

## ✅ Pre-Deployment Checklist

### Code Preparation

- [ ] All features tested locally
- [ ] No console errors in browser
- [ ] All forms working (contact, booking, chat)
- [ ] Admin portal login/save working
- [ ] Mobile responsive design verified
- [ ] Images optimized
- [ ] Build succeeds locally (`npm run build`)

### Configuration

- [ ] `wrangler.toml` configured with correct database ID
- [ ] `package.json` has correct dependencies
- [ ] Site URL updated in configuration
- [ ] Contact email updated
- [ ] Phone number updated

### Content

- [ ] Default content customized
- [ ] Hero section text updated
- [ ] Services list updated
- [ ] About information filled
- [ ] Social media links updated
- [ ] Favicon added

---

## 🗄️ Database Setup

### Initial Setup

- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Logged in to Cloudflare (`wrangler login`)
- [ ] Database created (`wrangler d1 create agency-db`)
- [ ] Database ID copied to `wrangler.toml`
- [ ] Migrations run (`wrangler d1 execute agency-db --file=migrations/001_initial_setup.sql --remote`)

### Verification

- [ ] Database exists (`wrangler d1 list`)
- [ ] Tables created (check with SQL query)
- [ ] Default content inserted
- [ ] Admin user exists

---

## 🌐 Deployment Steps

### First-Time Deployment

- [ ] Project built (`npm run build`)
- [ ] Dist folder exists and contains files
- [ ] Deploy command run (`wrangler pages deploy dist --project-name=agency-website`)
- [ ] Deployment successful (check terminal output)
- [ ] Site URL noted

### Verification

- [ ] Site loads at deployment URL
- [ ] Homepage displays correctly
- [ ] Admin login page accessible
- [ ] Can log in with admin/admin123
- [ ] Dashboard loads
- [ ] Can save changes
- [ ] Changes persist after page refresh
- [ ] Chatbot works
- [ ] All links functional

---

## 🔐 Security Setup

### Immediate Actions

- [ ] Change default admin password
- [ ] Test new password works
- [ ] Note new password in secure location

### Recommended

- [ ] Enable Cloudflare Access (optional)
- [ ] Set up 2FA (if available)
- [ ] Configure security headers
- [ ] Review access logs

---

## 🎨 Customization

### Content

- [ ] Update hero content via admin portal
- [ ] Save changes and verify persistence
- [ ] Update site settings
- [ ] Test content displays on frontend

### Branding

- [ ] Upload custom favicon
- [ ] Update color scheme (if desired)
- [ ] Add logo (if applicable)
- [ ] Customize fonts (if desired)

---

## 📊 Analytics & Monitoring

### Setup

- [ ] Cloudflare Analytics enabled
- [ ] Google Analytics added (optional)
- [ ] Error tracking configured (optional)
- [ ] Performance monitoring active

### Testing

- [ ] Analytics tracking page views
- [ ] Events being logged
- [ ] Error reporting working

---

## 🔗 Domain Configuration (Optional)

### Custom Domain

- [ ] Domain purchased/available
- [ ] Added to Cloudflare Pages
- [ ] DNS records configured
- [ ] SSL certificate provisioned
- [ ] Domain accessible via HTTPS
- [ ] Site URL updated in config

### Redirects

- [ ] www redirect configured
- [ ] HTTP to HTTPS redirect active
- [ ] Old URLs redirected (if applicable)

---

## 📱 Testing

### Functionality

- [ ] Homepage loads
- [ ] Navigation works
- [ ] Contact form submits
- [ ] Booking form works
- [ ] Chatbot responds
- [ ] Blog posts display
- [ ] Admin portal accessible
- [ ] Content saves persist

### Performance

- [ ] Lighthouse score checked (target: 90+)
- [ ] Page load time < 3 seconds
- [ ] Images load quickly
- [ ] No console errors
- [ ] Mobile performance good

### Compatibility

- [ ] Chrome/Edge tested
- [ ] Firefox tested
- [ ] Safari tested (if available)
- [ ] Mobile Chrome tested
- [ ] Mobile Safari tested (if available)

### Devices

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Large mobile (414x896)

---

## 📧 Email Configuration (Optional)

### Setup

- [ ] Email service chosen (Resend, SendGrid, etc.)
- [ ] API keys obtained
- [ ] Added to environment variables
- [ ] Email code uncommented in API functions

### Testing

- [ ] Contact form sends email
- [ ] Booking form sends confirmation
- [ ] Email formatting correct
- [ ] Sender address verified

---

## 🔄 GitHub Integration (Recommended)

### Setup

- [ ] Git repository initialized
- [ ] Files committed
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Connected to Cloudflare Pages
- [ ] Build settings configured

### Testing

- [ ] Push triggers deployment
- [ ] Build succeeds automatically
- [ ] Preview deployments work
- [ ] Main branch deploys to production

---

## 📋 Post-Deployment

### Immediate

- [ ] Test all functionality
- [ ] Verify database persistence
- [ ] Check mobile experience
- [ ] Test admin portal
- [ ] Verify forms work

### Week 1

- [ ] Monitor analytics
- [ ] Check for errors
- [ ] Review performance
- [ ] Gather user feedback
- [ ] Make necessary adjustments

### Ongoing

- [ ] Weekly content updates
- [ ] Monthly performance reviews
- [ ] Security updates
- [ ] Database backups
- [ ] Dependency updates

---

## 🐛 Troubleshooting

### If Deployment Fails

- [ ] Check build logs
- [ ] Verify database connection
- [ ] Check wrangler.toml configuration
- [ ] Ensure database migrations ran
- [ ] Try redeploying

### If Admin Changes Don't Persist

- [ ] Verify database ID in wrangler.toml
- [ ] Check database migrations ran successfully
- [ ] View database content with wrangler
- [ ] Check browser console for errors
- [ ] Verify API endpoints are working

### If Site Doesn't Load

- [ ] Check deployment status
- [ ] Verify DNS configuration (if custom domain)
- [ ] Check for build errors
- [ ] Try accessing via .pages.dev URL
- [ ] Clear browser cache

---

## 🎉 Launch

### Final Steps

- [ ] All checklist items complete
- [ ] Site fully tested
- [ ] Admin portal working
- [ ] Content finalized
- [ ] Performance optimized
- [ ] Security configured

### Announcement

- [ ] Share on social media
- [ ] Update business cards
- [ ] Notify clients/contacts
- [ ] Submit to search engines
- [ ] Add to portfolio

---

## 📞 Emergency Contacts

### Keep Handy

- Cloudflare account email: _______________
- GitHub repository URL: _______________
- Database ID: _______________
- Admin email: _______________
- Backup location: _______________

---

## 🎊 Success!

Once all items are checked, your site is:

✅ Live in production
✅ Database-backed and persistent
✅ Secure and fast
✅ Ready for the world!

**Congratulations on your deployment! 🚀**

