# 🎯 Quick Deployment Checklist

Follow this step-by-step checklist to deploy your waitlist in under 15 minutes.

---

## ✅ Pre-Deployment (5 minutes)

### 1. Gmail App Password Setup
- [ ] Go to https://myaccount.google.com/security
- [ ] Enable 2-Step Verification
- [ ] Create App Password: https://myaccount.google.com/apppasswords
- [ ] Copy the 16-character password
- [ ] Save it somewhere safe (you'll need it in Render)

### 2. GitHub Repository
- [ ] Repository is public: https://github.com/triunex/Nelieo-Waitlist
- [ ] Latest code is pushed
- [ ] `.gitignore` excludes `.env` and `*.db` files

---

## 🚀 Render Deployment (7 minutes)

### 3. Create Render Account
- [ ] Go to https://render.com
- [ ] Sign up with GitHub account
- [ ] Authorize Render to access your repositories

### 4. Create Web Service
- [ ] Click "New +" → "Web Service"
- [ ] Select repository: `triunex/Nelieo-Waitlist`
- [ ] Fill in settings:

```
Name: nelieo-waitlist
Region: Oregon (US West)
Branch: main
Runtime: Node
Build Command: npm install
Start Command: node server-sqlite.js
Instance Type: Free
```

- [ ] Click "Create Web Service"

### 5. Add Persistent Disk (CRITICAL!)
- [ ] Go to service → "Disks" tab
- [ ] Click "Add Disk"
- [ ] Configure:
```
Name: waitlist-data
Mount Path: /opt/render/project/src
Size: 1 GB
```
- [ ] Save disk configuration

### 6. Set Environment Variables
- [ ] Go to "Environment" tab
- [ ] Add these variables:

```env
NODE_ENV=production
PORT=3001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=triunex.shorya@gmail.com
SMTP_PASS=[paste your Gmail App Password here]
DB_PATH=/opt/render/project/src/lumina_waitlist.db
```

- [ ] Click "Save Changes"

### 7. Wait for Deployment
- [ ] Monitor "Logs" tab
- [ ] Wait for "Your service is live 🎉"
- [ ] Copy your URL: `https://nelieo-waitlist.onrender.com`

---

## 🧪 Testing (2 minutes)

### 8. Test Backend
Open these URLs in browser:

- [ ] Health check: `https://nelieo-waitlist.onrender.com/`
- [ ] Count API: `https://nelieo-waitlist.onrender.com/api/waitlist/count`
- [ ] Should return: `{"success":true,"count":0}`

### 9. Test Signup Flow
- [ ] Visit: `https://nelieo-waitlist.onrender.com/join.html`
- [ ] Fill form with test email
- [ ] Submit and verify success message
- [ ] Check email inbox for welcome email
- [ ] Refresh count API - should show `count: 1`

### 10. Test All Pages
- [ ] Homepage loads: `https://nelieo-waitlist.onrender.com/`
- [ ] Smooth scrolling works (Lenis)
- [ ] Privacy page: `https://nelieo-waitlist.onrender.com/privacy.html`
- [ ] Join page: `https://nelieo-waitlist.onrender.com/join.html`
- [ ] Competitor logos visible
- [ ] Scrollbar hidden but scrolling works

---

## 🌐 Custom Domain (3 minutes)

### 11. Add Domain in Render
- [ ] Go to service → "Settings" → "Custom Domains"
- [ ] Click "Add Custom Domain"
- [ ] Enter your domain (e.g., `waitlist.nelieo.com`)
- [ ] Copy the DNS records shown

### 12. Update DNS Records
Go to your domain registrar (GoDaddy/Namecheap/Cloudflare/etc.)

**For Subdomain (waitlist.nelieo.com):**
- [ ] Add CNAME record:
```
Type: CNAME
Name: waitlist
Value: nelieo-waitlist.onrender.com
TTL: 3600
```

**For Root Domain (nelieo.com):**
- [ ] Add A record:
```
Type: A
Name: @
Value: [IP shown by Render]
TTL: 3600
```

### 13. Wait for DNS & SSL
- [ ] Wait 5-60 minutes for DNS propagation
- [ ] Check: https://dnschecker.org
- [ ] Render auto-provisions SSL certificate
- [ ] Your site will be `https://` automatically

---

## 🎉 You're Live!

### Final Verification
- [ ] Visit your custom domain
- [ ] Test signup with real email
- [ ] Verify email delivery
- [ ] Share with team/users

---

## 📊 Post-Deployment

### Monitor Your Site
- [ ] Bookmark Render dashboard
- [ ] Check logs daily for errors
- [ ] Monitor email delivery

### Backup Database
- [ ] Set up weekly backup (optional)
- [ ] Export CSV periodically

### Update CSP (Optional)
If using custom domain, update `index.html` CSP to include your domain in `connect-src`.

---

## 🚨 Common Issues & Fixes

### ❌ "Service not responding"
- **Fix:** Free tier spins down after 15 min. First request takes 30s to wake up.

### ❌ "Email not sending"
- **Fix:** Double-check Gmail App Password (not regular password)
- **Fix:** Verify 2-Step Verification is enabled

### ❌ "Database not persisting"
- **Fix:** Ensure persistent disk is mounted at `/opt/render/project/src`

### ❌ "Cannot read properties of null"
- **Fix:** Hard refresh browser (Ctrl+Shift+R)

---

## 📞 Need Help?

If stuck:
1. Check Render logs first (most issues show here)
2. Review `DEPLOYMENT_GUIDE.md` for detailed explanations
3. Ask in Render Community: https://community.render.com
4. Contact me for support

---

**Time to Complete:** 15-20 minutes  
**Cost:** $0/month  
**Uptime:** 24/7 (with 30s cold start on free tier)  
**Capacity:** 50,000+ users easily

---

## ✨ Next Steps After Launch

Once live, consider:
- [ ] Set up Google Analytics
- [ ] Add social sharing buttons
- [ ] Create email drip campaign
- [ ] A/B test landing page copy
- [ ] Monitor conversion rates

**Good luck with your launch! 🚀**
