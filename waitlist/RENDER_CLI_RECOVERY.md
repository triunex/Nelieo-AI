# Quick Recovery Using Render CLI

## Install Render CLI (Choose one method)

### Windows (PowerShell):
```powershell
# Download the Windows executable
Invoke-WebRequest -Uri "https://github.com/render-oss/cli/releases/latest/download/cli_windows_amd64.zip" -OutFile "render-cli.zip"
Expand-Archive -Path "render-cli.zip" -DestinationPath "."
Move-Item "render.exe" "C:\Windows\System32\render.exe"
```

### Or use direct download:
1. Go to https://github.com/render-oss/cli/releases/
2. Download `cli_windows_amd64.zip`
3. Extract and add to PATH

---

## Step-by-Step Recovery

### 1. Install and Login
```powershell
render login
# Your browser will open - click "Generate token"
```

### 2. Set Workspace
```powershell
render workspace set
# Select your workspace from the menu
```

### 3. Open SSH to Your Service
```powershell
render ssh
# Select your waitlist service from the menu
```

### 4. Once in SSH, Find Your Database
```bash
# List all database files
find /opt/render/project -name "*.db" -type f -exec ls -lh {} \;

# Check for databases with data
find /opt/render/project -name "*.db" -type f -exec sh -c 'echo "=== $1 ===" && wc -c < "$1"' sh {} \;
```

### 5. Check Each Database for Your 4 Users
```bash
# If you find a database at a specific path, check it:
sqlite3 /path/to/found.db "SELECT COUNT(*) FROM waitlist;"

# If it shows 4, that's your database! Get the users:
sqlite3 /path/to/found.db "SELECT * FROM waitlist;"
```

### 6. Copy the Correct Path
Once you find the database with 4 users, note the EXACT path (e.g., `/opt/render/project/src/old_location/lumina_waitlist.db`)

### 7. Update Environment Variable
Exit SSH and run:
```powershell
# Get your service ID first
render services

# Then update DB_PATH (you'll need to do this via Dashboard)
```

Then:
1. Go to Render Dashboard → Your service → Environment
2. Set `DB_PATH` to the path you found
3. Save Changes

---

## Alternative: Export Data Directly from SSH

If you find the database, you can export the data right there:

```bash
# In SSH session:
cd /opt/render/project/src
node find-old-db.js

# Or manually export:
sqlite3 /path/to/old.db ".mode csv" ".output recovered_users.csv" "SELECT * FROM waitlist;" ".exit"
cat recovered_users.csv
```

Copy the output and we can restore it!

---

## Quick Start (All Commands)

```powershell
# 1. Install
# Download from GitHub releases and add to PATH

# 2. Login
render login

# 3. SSH into service
render ssh

# 4. Find databases
find /opt/render/project -name "*.db" -ls

# 5. Check each one
sqlite3 /path/to/db "SELECT COUNT(*) FROM waitlist;"
```

**Run these commands NOW and tell me what you find!** 🚀
