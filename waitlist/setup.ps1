# Lumina Waitlist Setup Script
# Run this script to set up everything automatically

Write-Host "
╔════════════════════════════════════════╗
║   Lumina Waitlist Setup Wizard        ║
║   Beautiful Landing Page Generator    ║
╚════════════════════════════════════════╝
" -ForegroundColor Cyan

# Check if MySQL is installed
Write-Host "`n🔍 Checking MySQL installation..." -ForegroundColor Yellow
try {
    $mysqlCheck = Get-Command mysql -ErrorAction Stop
    Write-Host "✅ MySQL found at: $($mysqlCheck.Source)" -ForegroundColor Green
} catch {
    Write-Host "❌ MySQL not found. Please install MySQL first." -ForegroundColor Red
    Write-Host "Download from: https://dev.mysql.com/downloads/installer/" -ForegroundColor Yellow
    exit 1
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "`n📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host "⚠️  Please edit .env with your database and email credentials" -ForegroundColor Yellow
    
    # Prompt for basic configuration
    Write-Host "`n🔧 Basic Configuration:" -ForegroundColor Cyan
    
    $dbPassword = Read-Host "Enter MySQL root password (or press Enter to skip)"
    if ($dbPassword) {
        (Get-Content ".env") -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$dbPassword" | Set-Content ".env"
    }
    
    $smtpUser = Read-Host "Enter your email for SMTP (or press Enter to skip)"
    if ($smtpUser) {
        (Get-Content ".env") -replace 'SMTP_USER=.*', "SMTP_USER=$smtpUser" | Set-Content ".env"
    }
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Install dependencies if needed
Write-Host "`n📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages..." -ForegroundColor Yellow
    npm install
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

# Check for wallpaper
Write-Host "`n🎨 Checking for wallpaper..." -ForegroundColor Yellow
if (-not (Test-Path "wallpaper.jpg")) {
    Write-Host "⚠️  wallpaper.jpg not found" -ForegroundColor Yellow
    Write-Host "Please add your wallpaper image as 'wallpaper.jpg' in the waitlist folder" -ForegroundColor Yellow
} else {
    Write-Host "✅ Wallpaper found" -ForegroundColor Green
}

# Initialize database
Write-Host "`n🗄️  Do you want to initialize the database now? (Y/N)" -ForegroundColor Yellow
$initDb = Read-Host
if ($initDb -eq "Y" -or $initDb -eq "y") {
    Write-Host "Initializing database..." -ForegroundColor Yellow
    npm run init-db
}

Write-Host "
╔════════════════════════════════════════╗
║   Setup Complete! 🎉                   ║
╚════════════════════════════════════════╝

Next steps:
1. Edit .env with your credentials (if not done)
2. Add your wallpaper.jpg file
3. Run: npm start
4. Visit: http://localhost:3000

For detailed instructions, see QUICKSTART.md
" -ForegroundColor Green
