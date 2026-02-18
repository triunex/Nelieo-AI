# 📊 Waitlist Database Management

## Quick Access Commands

### View All Users
```powershell
cd n:\lumina-search-flow-main\waitlist
node view-database.js
```

Shows a formatted table with all waitlist signups including:
- ID, Name, Email, Company, Use Case, Join Date
- Detailed view of each user
- Total signup count

### Export to CSV
```powershell
cd n:\lumina-search-flow-main\waitlist
node export-csv.js
```

Creates a timestamped CSV file (e.g., `waitlist-export-2025-11-03T11-09-25.csv`) with all user data. Perfect for:
- Importing into Excel/Google Sheets
- Email marketing tools
- Analytics and reporting

### Delete a User
```powershell
cd n:\lumina-search-flow-main\waitlist
node delete-user.js <email>
```

Example:
```powershell
node delete-user.js test@example.com
```

---

## 📧 Email Configuration

**Status: ✅ ENABLED**

Your email is configured with:
- **SMTP Server:** Gmail (smtp.gmail.com:587)
- **From Email:** triunex.shorya@gmail.com
- **Admin Notifications:** triunex.shorya@gmail.com

### What Happens When Someone Joins:

1. **User receives:** Beautiful welcome email with:
   - Their position number (#1, #2, etc.)
   - Next steps and what to expect
   - Link back to your site

2. **You receive:** Admin notification with:
   - User's name, email, company
   - Their use case selection
   - Position number and timestamp

### Test Email Sending

Visit http://localhost:3001/join.html and submit the form - you'll receive real emails now!

---

## 📈 Database Location

**File:** `N:\lumina-search-flow-main\waitlist\lumina_waitlist.db`

**Type:** SQLite (single file, no server needed)

### Current Users:
```
┌────┬───────────────────┬────────────────────────────────┬─────────┬──────────────┐
│ ID │ Name              │ Email                          │ Company │ Use Case     │
├────┼───────────────────┼────────────────────────────────┼─────────┼──────────────┤
│ 1  │ Shourya Sharma    │ triunex.shorya@gmail.com       │ TriuneX │ social-media │
│ 2  │ Shourya Sharma    │ sharmashorya934@gmail.com      │ TriuneX │ research     │
└────┴───────────────────┴────────────────────────────────┴─────────┴──────────────┘
```

---

## 🛠️ Advanced Database Operations

### Direct SQL Queries (if you install sqlite3 CLI)

```powershell
# Install SQLite CLI (optional)
winget install SQLite.SQLite

# Then you can run SQL directly
cd n:\lumina-search-flow-main\waitlist
sqlite3 lumina_waitlist.db

# Inside sqlite3:
SELECT * FROM waitlist;
SELECT COUNT(*) FROM waitlist WHERE created_at > datetime('now', '-7 days');
SELECT use_case, COUNT(*) as count FROM waitlist GROUP BY use_case;
.quit
```

### Backup Database

```powershell
# Simple copy
cd n:\lumina-search-flow-main\waitlist
Copy-Item lumina_waitlist.db "lumina_waitlist_backup_$(Get-Date -Format 'yyyy-MM-dd').db"
```

---

## 📋 Database Schema

### Table: `waitlist`
| Column     | Type      | Description                    |
|------------|-----------|--------------------------------|
| id         | INTEGER   | Auto-increment primary key     |
| name       | TEXT      | User's full name               |
| email      | TEXT      | Unique email address           |
| company    | TEXT      | Company name (optional)        |
| use_case   | TEXT      | Selected use case              |
| created_at | DATETIME  | Signup timestamp               |

### Table: `waitlist_analytics`
| Column     | Type    | Description                     |
|------------|---------|---------------------------------|
| id         | INTEGER | Auto-increment primary key      |
| event_type | TEXT    | Type of event (e.g., 'signup')  |
| email      | TEXT    | Associated email (optional)     |
| metadata   | TEXT    | JSON metadata                   |
| created_at | DATETIME| Event timestamp                 |

---

## 🚀 Server Status

**Server:** Running on port 3001
**Database:** Connected ✅
**Email:** Enabled ✅

**Access URLs:**
- Landing Page: http://localhost:3001
- Join Form: http://localhost:3001/join.html
- API Health: http://localhost:3001/health
- Get Count: http://localhost:3001/api/waitlist/count

---

## 💡 Pro Tips

1. **Export regularly:** Run `node export-csv.js` daily to backup user data
2. **Monitor signups:** Check `node view-database.js` to see latest signups
3. **Email testing:** Use your personal emails first to test the flow
4. **CSV location:** Export files are saved in the `waitlist/` folder

---

## 🎯 What You Asked For

✅ **View joined users:** `node view-database.js`
✅ **Access the DB:** Direct file at `waitlist/lumina_waitlist.db`
✅ **Email configured:** Using credentials from `cognix-api/server.js`
   - User: triunex.shorya@gmail.com
   - Pass: gtws srtm wcka sfoe (App Password)
   - Admin: triunex.shorya@gmail.com

**All set!** Your waitlist is fully functional with real email sending! 🎉
