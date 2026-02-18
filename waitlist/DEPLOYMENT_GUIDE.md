# 🚀 Nelieo Waitlist - Free Deployment Guide

Complete guide to deploy your waitlist site with backend, database, and custom domain - **100% FREE**.

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Best Free Deployment Option](#best-option)
3. [Step-by-Step Deployment](#deployment-steps)
4. [Custom Domain Setup](#custom-domain)
5. [Environment Variables](#environment-setup)
6. [Testing & Monitoring](#testing)

---

## 🎯 Overview

**What We're Deploying:**
- ✅ Frontend: HTML/CSS/JS (index.html, privacy.html, join.html)
- ✅ Backend: Node.js + Express (server-sqlite.js)
- ✅ Database: SQLite (lumina_waitlist.db)
- ✅ Email: Nodemailer with Gmail SMTP
- ✅ Custom Domain: Your domain

**Tech Stack:**
- Runtime: Node.js 18+
- Database: SQLite (file-based, perfect for free hosting)
- Email: Gmail SMTP (free)

---

## 🏆 Best Free Deployment Option

### **Recommended: Render.com** (Best for your use case)

**Why Render?**
- ✅ Free tier includes: Web service + Persistent disk (for SQLite)
- ✅ 750 hours/month free (enough for 24/7 uptime)
- ✅ Custom domain support (free SSL)
- ✅ Auto-deploy from GitHub
- ✅ Environment variables support
- ✅ No credit card required

**Alternative Options:**
- Railway.app (500 hours free, good for SQLite)
- Fly.io (3 VMs free, persistent volumes)
- Vercel (Frontend only - would need separate backend)

---

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Update .gitignore** (already done ✅)
```
node_modules/
*.db
*.db-shm
*.db-wal
*.log
.env
.DS_Store
```

2. **Create a start script** - Check if `package.json` has proper start command:

```json
{
  "scripts": {
    "start": "node server-sqlite.js",
    "dev": "nodemon server-sqlite.js"
  }
}
```

3. **Push latest changes to GitHub:**
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

---

### Step 2: Deploy to Render.com

#### A. Create Render Account
1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with GitHub (easiest - connects directly)

#### B. Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `triunex/Nelieo-Waitlist`
3. Configure the service:

```yaml
Name: nelieo-waitlist
Region: Oregon (US West) or closest to you
Branch: main
Runtime: Node
Build Command: npm install
Start Command: node server-sqlite.js
Instance Type: Free
```

#### C. Add Persistent Disk (IMPORTANT for SQLite)
1. In your service settings, go to **"Disks"**
2. Click **"Add Disk"**
3. Configure:
```yaml
Name: waitlist-data
Mount Path: /opt/render/project/src
Size: 1 GB (free tier)
```

This ensures your SQLite database persists across deployments.

---

### Step 3: Environment Variables Setup

In Render dashboard → Your service → **"Environment"** tab, add:

```env
# Node Environment
NODE_ENV=production

# Server Port (Render provides this automatically)
PORT=3001

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=triunex.shorya@gmail.com
SMTP_PASS=your_app_password_here

# Database
DB_PATH=/opt/render/project/src/lumina_waitlist.db

# Optional: API Keys if needed
# GEMINI_API_KEY=your_key_here
```

#### 🔐 Gmail App Password Setup:
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** (required)
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Create new app password:
   - App: Mail
   - Device: Other (Custom name) → "Nelieo Waitlist"
5. Copy the 16-character password
6. Paste in `SMTP_PASS` on Render

---

### Step 4: Update Server Configuration for Production

You may need to update `server-sqlite.js` to handle Render's environment:

**Check PORT configuration:**
```javascript
const PORT = process.env.PORT || 3001;
```

**Check database path:**
```javascript
const dbPath = process.env.DB_PATH || path.join(__dirname, 'lumina_waitlist.db');
const db = new Database(dbPath);
```

If these aren't already configured, I can update the file for you.

---

### Step 5: Deploy!

1. Click **"Create Web Service"** on Render
2. Render will automatically:
   - Clone your GitHub repo
   - Run `npm install`
   - Execute `node server-sqlite.js`
   - Assign a URL: `https://nelieo-waitlist.onrender.com`

3. Monitor deployment in **"Logs"** tab

**Expected deployment time:** 2-3 minutes

---

## 🌐 Custom Domain Setup

### Step 1: Get Your Render URL
After deployment, you'll get: `https://nelieo-waitlist.onrender.com`

### Step 2: Configure Your Domain

#### Option A: Root Domain (nelieo.com)
1. In Render → Your service → **"Settings"** → **"Custom Domains"**
2. Click **"Add Custom Domain"**
3. Enter: `nelieo.com`
4. Render will show DNS records to add

**Add these to your domain registrar:**
```
Type: A
Name: @
Value: [Render's IP address shown]
TTL: 3600

Type: AAAA (IPv6)
Name: @
Value: [Render's IPv6 shown]
TTL: 3600
```

#### Option B: Subdomain (waitlist.nelieo.com)
1. Add custom domain: `waitlist.nelieo.com`
2. Add CNAME record:

```
Type: CNAME
Name: waitlist
Value: nelieo-waitlist.onrender.com
TTL: 3600
```

### Step 3: Wait for DNS Propagation
- Takes 5 minutes to 48 hours (usually < 1 hour)
- Check status: https://dnschecker.org

### Step 4: SSL Certificate (Automatic)
Render automatically provisions free SSL certificates via Let's Encrypt.
Your site will be `https://` within minutes of DNS verification.

---

## ⚙️ Update CSP for Production Domain

After deployment, update `index.html` CSP to include your domain:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://nelieo-waitlist.onrender.com https://waitlist.nelieo.com http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*;">
```

---

## 🧪 Testing After Deployment

### 1. Test Backend Health
```bash
curl https://nelieo-waitlist.onrender.com/api/waitlist/count
```

Expected response:
```json
{"success":true,"count":5}
```

### 2. Test Signup Flow
1. Visit: `https://nelieo-waitlist.onrender.com/join.html`
2. Fill form and submit
3. Check email for welcome message
4. Verify count incremented: `/api/waitlist/count`

### 3. Test All Pages
- Homepage: `https://nelieo-waitlist.onrender.com/`
- Privacy: `https://nelieo-waitlist.onrender.com/privacy.html`
- Join: `https://nelieo-waitlist.onrender.com/join.html`

### 4. Check Lenis Smooth Scrolling
- Scroll on homepage
- Should be smooth and momentum-based

---

## 📊 Monitoring & Maintenance

### Render Dashboard
- **Logs**: Real-time server logs
- **Metrics**: CPU, Memory, Response time
- **Events**: Deployment history

### Database Backups
Since SQLite is file-based on persistent disk:

**Manual Backup:**
1. Render → Your service → **"Shell"** tab
2. Run: `cat lumina_waitlist.db > backup.db`
3. Download via SFTP or create endpoint

**Automated Backup Script** (I can create this):
- Daily cron job
- Export to CSV
- Upload to Google Drive/Dropbox

### Email Monitoring
Check Gmail sent folder for confirmation emails being delivered.

---

## 🔥 Performance Optimization

### 1. Enable Compression (Gzip)
Add to `server-sqlite.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

### 2. Cache Static Assets
```javascript
app.use(express.static(__dirname, {
    maxAge: '1d',
    etag: true
}));
```

### 3. Database Optimization
Already optimized with indexes ✅

---

## 💰 Cost Breakdown (FREE)

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Render Web Service | 750 hrs/month | 24/7 uptime | $0 |
| Persistent Disk | 1 GB | ~10 MB | $0 |
| SSL Certificate | Unlimited | 1 domain | $0 |
| Gmail SMTP | 500 emails/day | ~50/day | $0 |
| Custom Domain | N/A | Your existing | $0 |
| **TOTAL** | | | **$0/month** |

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to database"
**Solution:** Check disk is mounted at correct path in Render settings

### Issue: "SMTP authentication failed"
**Solution:** 
1. Verify Gmail App Password (not regular password)
2. Check 2-Step Verification is enabled
3. Ensure SMTP_USER and SMTP_PASS are set in Render env vars

### Issue: "504 Gateway Timeout"
**Solution:** Render free tier spins down after 15 min inactivity. First request takes ~30s to wake up.

### Issue: "Database locked"
**Solution:** SQLite uses WAL mode. Check file permissions in Render shell.

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Gmail SMTP Setup**: https://support.google.com/mail/answer/7126229
- **DNS Help**: https://www.cloudflare.com/learning/dns/

---

## ✅ Deployment Checklist

- [ ] GitHub repository updated and pushed
- [ ] Render account created
- [ ] Web service created and deployed
- [ ] Persistent disk attached
- [ ] Environment variables configured
- [ ] Gmail App Password generated
- [ ] Custom domain added to Render
- [ ] DNS records updated at registrar
- [ ] SSL certificate active (auto)
- [ ] All pages tested (index, join, privacy)
- [ ] Signup flow tested end-to-end
- [ ] Email delivery confirmed
- [ ] Smooth scrolling verified
- [ ] Database count working

---

## 🎉 You're Live!

Once deployed:
1. Your waitlist is live 24/7
2. Auto-scales with traffic
3. Free SSL/HTTPS
4. Auto-deploys on GitHub push
5. Handles 50k+ users easily

**Questions?** Let me know and I'll help debug!

---

## 🔄 Future Scaling (When Needed)

If you exceed 50k users or need more performance:

### Option 1: Upgrade Render ($7/month)
- 400 GB bandwidth
- 1 GB RAM
- Always-on (no cold starts)

### Option 2: Migrate to PostgreSQL (Free on Render)
- I can provide migration script
- Better for 100k+ users
- Still free tier available

### Option 3: Move to Vercel + Supabase
- Vercel: Frontend (unlimited bandwidth)
- Supabase: PostgreSQL database (500 MB free)
- Serverless functions for API

**But SQLite on Render free tier is perfect for your current 50k target!** 🎯

---

**Created:** November 4, 2025  
**Author:** GitHub Copilot  
**Repository:** https://github.com/triunex/Nelieo-Waitlist
