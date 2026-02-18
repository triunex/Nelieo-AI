# Lumina Waitlist - Complete Setup and Test Script

Write-Host @"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🌟 LUMINA WAITLIST - SETUP & TEST WIZARD 🌟        ║
║                                                          ║
║     Beautiful Landing Page with Glassmorphism          ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

$ErrorActionPreference = "Continue"

# Function to display section headers
function Show-Section {
    param([string]$Title)
    Write-Host "`n$('='*60)" -ForegroundColor DarkGray
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host "$('='*60)" -ForegroundColor DarkGray
}

# Check Node.js
Show-Section "1️⃣  Checking Prerequisites"
Write-Host "Checking Node.js..." -ForegroundColor White
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "   Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

# Check MySQL
Write-Host "`nChecking MySQL..." -ForegroundColor White
try {
    $mysqlCheck = Get-Command mysql -ErrorAction Stop
    Write-Host "✅ MySQL found: $($mysqlCheck.Source)" -ForegroundColor Green
    
    # Try to connect
    Write-Host "Testing MySQL connection..." -ForegroundColor White
    $mysqlTest = mysql --version 2>&1
    Write-Host "✅ MySQL version: $mysqlTest" -ForegroundColor Green
} catch {
    Write-Host "⚠️  MySQL not found in PATH" -ForegroundColor Yellow
    Write-Host "   Download from: https://dev.mysql.com/downloads/installer/" -ForegroundColor Yellow
    Write-Host "   The script will continue, but database features require MySQL" -ForegroundColor Yellow
}

# Install dependencies
Show-Section "2️⃣  Installing Dependencies"
if (Test-Path "node_modules") {
    Write-Host "📦 node_modules folder exists" -ForegroundColor Green
    $reinstall = Read-Host "Reinstall dependencies? (y/N)"
    if ($reinstall -eq "y" -or $reinstall -eq "Y") {
        Write-Host "Removing old dependencies..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
        Write-Host "Installing fresh dependencies..." -ForegroundColor Yellow
        npm install
    } else {
        Write-Host "✅ Using existing dependencies" -ForegroundColor Green
    }
} else {
    Write-Host "Installing npm packages..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
}

# Setup .env
Show-Section "3️⃣  Environment Configuration"
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created!" -ForegroundColor Green
    
    Write-Host "`n📝 Let's configure your environment:" -ForegroundColor Cyan
    
    # Database configuration
    Write-Host "`n🗄️  DATABASE SETUP:" -ForegroundColor White
    $dbUser = Read-Host "MySQL username (default: root)"
    if (-not $dbUser) { $dbUser = "root" }
    
    $dbPass = Read-Host "MySQL password" -AsSecureString
    $dbPassPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPass)
    )
    
    $dbName = Read-Host "Database name (default: lumina_waitlist)"
    if (-not $dbName) { $dbName = "lumina_waitlist" }
    
    # Update .env file
    $envContent = Get-Content ".env"
    $envContent = $envContent -replace 'DB_USER=.*', "DB_USER=$dbUser"
    $envContent = $envContent -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$dbPassPlain"
    $envContent = $envContent -replace 'DB_NAME=.*', "DB_NAME=$dbName"
    
    # Email configuration
    Write-Host "`n📧 EMAIL SETUP (Optional - press Enter to skip):" -ForegroundColor White
    $smtpUser = Read-Host "SMTP email address"
    if ($smtpUser) {
        $smtpPass = Read-Host "SMTP password (App Password for Gmail)" -AsSecureString
        $smtpPassPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpPass)
        )
        $envContent = $envContent -replace 'SMTP_USER=.*', "SMTP_USER=$smtpUser"
        $envContent = $envContent -replace 'SMTP_PASS=.*', "SMTP_PASS=$smtpPassPlain"
        
        $adminEmail = Read-Host "Admin email for notifications (default: $smtpUser)"
        if (-not $adminEmail) { $adminEmail = $smtpUser }
        $envContent = $envContent -replace 'ADMIN_EMAIL=.*', "ADMIN_EMAIL=$adminEmail"
    }
    
    $envContent | Set-Content ".env"
    Write-Host "✅ Configuration saved!" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
    $reconfig = Read-Host "Reconfigure? (y/N)"
    if ($reconfig -eq "y" -or $reconfig -eq "Y") {
        Remove-Item ".env"
        Write-Host "Please run the script again to reconfigure." -ForegroundColor Yellow
        exit 0
    }
}

# Check wallpaper
Show-Section "4️⃣  Checking Wallpaper"
if (Test-Path "wallpaper.jpg") {
    $wallpaperSize = (Get-Item "wallpaper.jpg").Length / 1MB
    Write-Host "✅ wallpaper.jpg found ($([math]::Round($wallpaperSize, 2)) MB)" -ForegroundColor Green
    
    if ($wallpaperSize -gt 5) {
        Write-Host "⚠️  Warning: Wallpaper is large (>5MB). Consider optimizing." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  wallpaper.jpg not found" -ForegroundColor Yellow
    Write-Host "   The page will use a gradient background" -ForegroundColor White
    Write-Host "   Add your wallpaper as 'wallpaper.jpg' for custom background" -ForegroundColor White
    Write-Host "   See: WALLPAPER_GUIDE.md for instructions" -ForegroundColor Cyan
}

# Initialize database
Show-Section "5️⃣  Database Initialization"
$initDb = Read-Host "Initialize database now? (Y/n)"
if ($initDb -ne "n" -and $initDb -ne "N") {
    Write-Host "Initializing database..." -ForegroundColor Yellow
    node init-db.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database initialized successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database initialization had issues. Check the output above." -ForegroundColor Yellow
        Write-Host "   You can run 'npm run init-db' later to try again." -ForegroundColor White
    }
} else {
    Write-Host "⏭️  Skipped database initialization" -ForegroundColor Yellow
    Write-Host "   Run 'npm run init-db' when ready" -ForegroundColor White
}

# Test server
Show-Section "6️⃣  Testing Server"
$testServer = Read-Host "Start test server? (Y/n)"
if ($testServer -ne "n" -and $testServer -ne "N") {
    Write-Host "`n🚀 Starting server..." -ForegroundColor Yellow
    Write-Host "   Press Ctrl+C to stop the server`n" -ForegroundColor White
    
    Start-Sleep -Seconds 1
    
    Write-Host @"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🎉 SERVER STARTING! 🎉                              ║
║                                                          ║
║     Visit: http://localhost:3000                        ║
║                                                          ║
║     Press Ctrl+C to stop                                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green
    
    npm start
}

# Final summary
Show-Section "✅ Setup Complete!"

Write-Host @"

🎉 Your beautiful waitlist landing page is ready!

📚 Quick Commands:
   npm start          - Start the server
   npm run dev        - Start with auto-reload
   npm run init-db    - Re-initialize database

📖 Documentation:
   README.md          - Full documentation
   QUICKSTART.md      - Setup guide
   WALLPAPER_GUIDE.md - Wallpaper instructions

🌐 Access:
   Local:  http://localhost:3000
   
🔧 Configuration:
   Edit .env file to change settings

📧 Email Setup:
   See QUICKSTART.md for Gmail configuration

🎨 Customization:
   styles.css - Change colors and design
   index.html - Modify content
   server.js  - Edit email templates

Need help? Check the documentation files above!

"@ -ForegroundColor White

Write-Host "Happy launching! 🚀" -ForegroundColor Cyan
