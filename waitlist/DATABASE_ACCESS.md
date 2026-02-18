# How to View Your Waitlist Database

## Your Database Location

**Production (Render):** `/opt/render/project/src/lumina_waitlist.db` (4 new real users)
**Local:** `n:\lumina-search-flow-main\waitlist\lumina_waitlist.db` (your old test data)

⚠️ **IMPORTANT:** These are TWO SEPARATE databases! 
- `view-database.js` shows your LOCAL database (old test users)
- `view-production-db.js` shows your PRODUCTION database (real users from nelieo.onrender.com)

---

## Method 1: View Production Database (RECOMMENDED)

Run this command to see your **real production users** from Render:

```bash
cd N:\lumina-search-flow-main\waitlist
node view-production-db.js
```

You'll be prompted for your `ADMIN_SECRET` (see setup below).

### First Time Setup:
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your waitlist service
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Add:
   - **Key:** `ADMIN_SECRET`
   - **Value:** Choose a strong password (e.g., `MySecure123Password!`)
6. Click **Save Changes**
7. Wait ~30 seconds for Render to apply the change (no redeploy needed!)

---

## Method 2: View Local Database Only

Run this command to see your **local test data** (NOT production):

```bash
cd N:\lumina-search-flow-main\waitlist
node view-database.js
```

---

## Method 3: Via Browser API (Production)

I've added a protected admin endpoint to view all entries.

### Setup:
1. Go to Render Dashboard → Your service → Environment
2. Add a new variable:
   ```
   ADMIN_SECRET=your_secret_password_here
   ```
   (Choose any strong password)

### Usage:
Visit this URL in your browser (replace with your secret):
```
https://nelieo.onrender.com/api/admin/waitlist?secret=your_secret_password_here
```

This will return JSON with all your waitlist entries:
```json
{
  "success": true,
  "count": 10,
  "entries": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Inc",
      "use_case": "customer-support",
      "created_at": "2025-11-05 10:30:00"
    },
    ...
  ]
}
```

---

## Method 3: Download DB from Render (Advanced)

If you want to download the database file directly:

1. Go to Render Dashboard → Your service
2. Click "Shell" (requires paid plan) OR
3. Use the export script:

```bash
# In your local waitlist folder:
node export-waitlist.js
```

This creates a CSV file with all entries.

---

## Quick Stats Endpoint (Public)

To just see the count:
```
https://nelieo.onrender.com/api/waitlist/count
```

Returns:
```json
{
  "success": true,
  "count": 10
}
```

---

## Database Schema

Your SQLite database has these tables:

### `waitlist` table:
- `id` - Auto-incrementing primary key
- `name` - User's full name
- `email` - User's email (UNIQUE)
- `company` - Company name (optional)
- `use_case` - What they'll use Nelieo for
- `created_at` - Signup timestamp

### `waitlist_analytics` table:
- `id` - Auto-incrementing primary key
- `event_type` - Type of event
- `email` - User's email
- `metadata` - JSON metadata
- `created_at` - Event timestamp

---

## Backup Your Database

**Recommended:** Set up automatic backups

1. Install Litestream (free):
   ```bash
   # On Render, add to your Dockerfile or use the API
   ```

2. Or manually backup:
   ```bash
   # Copy DB file to your computer
   scp render:/opt/render/project/src/lumina_waitlist.db ./backup/
   ```

3. Or use the export script:
   ```bash
   node export-waitlist.js
   # This creates waitlist_export.csv
   ```

---

## Questions?

- To view data: Use `node view-database.js` locally
- For production: Use the admin API endpoint
- For backups: Use `node export-waitlist.js`
