@echo off
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║         LUMINA WAITLIST - DATABASE QUICK ACCESS                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Choose an option:
echo.
echo [1] View all users
echo [2] Export to CSV
echo [3] Delete a user
echo [4] Show database stats
echo [5] Start server
echo [6] Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto view
if "%choice%"=="2" goto export
if "%choice%"=="3" goto delete
if "%choice%"=="4" goto stats
if "%choice%"=="5" goto server
if "%choice%"=="6" goto end

echo Invalid choice!
pause
goto end

:view
echo.
echo 📊 Loading users...
node view-database.js
pause
goto end

:export
echo.
echo 📤 Exporting to CSV...
node export-csv.js
pause
goto end

:delete
echo.
set /p email="Enter email to delete: "
node delete-user.js %email%
pause
goto end

:stats
echo.
echo 📈 Database Statistics
node -e "const db=require('better-sqlite3')('lumina_waitlist.db');const total=db.prepare('SELECT COUNT(*) as c FROM waitlist').get();const today=db.prepare('SELECT COUNT(*) as c FROM waitlist WHERE date(created_at)=date(\"now\")').get();const week=db.prepare('SELECT COUNT(*) as c FROM waitlist WHERE date(created_at)>=date(\"now\",\"-7 days\")').get();console.log('\nTotal Signups:',total.c);console.log('Today:',today.c);console.log('This Week:',week.c,'\n');db.close();"
pause
goto end

:server
echo.
echo 🚀 Starting server...
node server-sqlite.js
goto end

:end
