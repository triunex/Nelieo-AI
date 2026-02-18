# 🚨 EMERGENCY: Data Recovery Guide

## Your 4 users might still exist!

The database file might be in a different location on Render's disk. Follow these steps:

---

## Step 1: Find the Old Database

1. Go to https://dashboard.render.com/
2. Select your waitlist service
3. Click **"Shell"** tab (in the left sidebar)
4. In the shell, run this command:

```bash
node find-old-db.js
```

This will search all possible locations for your database files and show you which one has 4 users.

---

## Step 2: If Database is Found

The script will tell you the exact path. Then:

1. Go to **Environment** tab in Render
2. Update `DB_PATH` to the path shown by the script
3. Click **Save Changes**
4. Wait 30 seconds (Render will restart)
5. Run `node view-production-db.js` locally to verify

---

## Step 3: If Database Not Found (Last Resort)

Check Render's persistent disk files:

```bash
# In Render Shell
find /opt/render/project -name "*.db" -type f
```

This shows ALL .db files. Look for one modified around the time your users signed up.

---

## Step 4: Manual Data Recovery

If you remember the 4 users' emails, we can re-add them:

1. Create a file `recover-users.js` with their info
2. Run it to restore them with original signup dates

**Do you remember any of the 4 users' emails?** I can help you restore them.

---

## Prevention for Future

Once we recover the data, I'll help you:
1. Set up automatic daily backups to Google Drive/Dropbox
2. Configure proper persistent disk paths
3. Create a backup endpoint you can call anytime

---

## Immediate Action

**Run this NOW in Render Shell:**
```bash
node find-old-db.js
```

Then tell me what it outputs and we'll recover your data! 🔧
