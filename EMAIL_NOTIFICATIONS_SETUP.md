# Email Notifications Setup Guide

This guide will help you configure instant email notifications for form submissions.

## Overview

Your site now sends instant email notifications to **ohwpstudios@gmail.com** when:
- 📧 Contact form submissions are received
- 📬 Someone subscribes to the newsletter
- 💼 Job applications are submitted

## Setup Instructions

### Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Add Your Domain (Optional but Recommended)

1. Log in to Resend
2. Go to "Domains" in the sidebar
3. Click "Add Domain"
4. Enter your domain (e.g., `ohwpstudios.org`)
5. Add the DNS records provided by Resend to your domain's DNS settings
6. Wait for verification (usually takes a few minutes)

**Note:** If you skip this step, emails will be sent from `onboarding@resend.dev` which may end up in spam folders.

### Step 3: Get Your API Key

1. In Resend dashboard, go to "API Keys"
2. Click "Create API Key"
3. Give it a name like "Production Website"
4. Copy the API key (starts with `re_`)

### Step 4: Add API Key to Cloudflare

1. Go to your Cloudflare dashboard
2. Navigate to **Workers & Pages** → **Your Site** → **Settings** → **Environment Variables**
3. Click "Add variable"
4. Add the following:
   - **Variable name:** `RESEND_API_KEY`
   - **Value:** Your Resend API key (paste the key you copied)
5. Click "Save"

### Step 5: Update Email From Address (After Domain Verified)

If you added and verified your domain, update these files to use your custom domain:

**Files to update:**
1. `src/pages/api/contact/submit.ts` (line 184, 228)
2. `src/pages/api/newsletter/subscribe.ts` (line 122, 175)
3. `src/pages/api/careers/apply.ts` (line 152)

Change from:
```typescript
from: 'OhWP Studios <noreply@ohwpstudios.org>'
```

To (if your verified domain is different):
```typescript
from: 'OhWP Studios <noreply@yourdomain.com>'
```

## Testing Email Notifications

### Local Testing
When testing locally without the API key configured, you'll see console logs instead of actual emails being sent.

### Production Testing
After deploying with the API key configured:

1. **Test Contact Form:**
   - Go to `/contact` on your live site
   - Fill out and submit the form
   - Check `ohwpstudios@gmail.com` for the notification

2. **Test Newsletter:**
   - Find any newsletter subscription form on your site
   - Subscribe with a test email
   - Check `ohwpstudios@gmail.com` for the notification

3. **Test Job Applications:**
   - Go to `/careers` on your live site
   - Fill out and submit an application
   - Check `ohwpstudios@gmail.com` for the notification

## Email Templates

All email notifications include:
- Beautiful HTML design with gradients and professional styling
- All submitted form data
- Direct links to admin portal to view/manage submissions
- Timestamps
- Responsive design for mobile viewing

## Free Tier Limits

Resend free tier includes:
- **3,000 emails per month**
- **100 emails per day**
- All features included

This is more than enough for most websites. If you exceed this, you can upgrade to a paid plan.

## Troubleshooting

### Emails Not Arriving

1. **Check spam folder** - Especially if using `onboarding@resend.dev`
2. **Verify API key** - Make sure it's correctly set in Cloudflare
3. **Check Resend logs** - Go to Resend dashboard → Logs to see if emails were sent
4. **Verify domain** - If you added a domain, make sure DNS records are properly configured

### Emails Going to Spam

1. **Add your domain** to Resend and verify it
2. **Add SPF and DKIM records** as provided by Resend
3. **Use your domain** instead of `onboarding@resend.dev`

### API Key Not Working

1. Make sure you copied the full key (starts with `re_`)
2. Redeploy your site after adding the environment variable
3. Check for typos in the variable name (`RESEND_API_KEY`)

## Support

- **Resend Documentation:** https://resend.com/docs
- **Resend Support:** support@resend.com
- **Cloudflare Support:** https://support.cloudflare.com

---

**Note:** Email notifications are designed to not block form submissions. If an email fails to send, the form submission will still be saved in the database and viewable in the admin portal.
