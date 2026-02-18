# Auto-recovery script for Render database
# This will attempt to find and recover your lost database

Write-Host "🔍 Attempting automated database recovery..." -ForegroundColor Cyan
Write-Host ""

# Check if we can access the production endpoint
Write-Host "Step 1: Checking if admin endpoint exists..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "https://nelieo.onrender.com/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Server is responding" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot reach server" -ForegroundColor Red
    exit 1
}

# Try the count endpoint
Write-Host "`nStep 2: Checking current database..." -ForegroundColor Yellow

try {
    $countResponse = Invoke-RestMethod -Uri "https://nelieo.onrender.com/api/waitlist/count" -Method GET
    $currentCount = $countResponse.count
    Write-Host "Current database has $currentCount users" -ForegroundColor White
    
    if ($currentCount -eq 0) {
        Write-Host "⚠️  Database is empty (this is the new one)" -ForegroundColor Yellow
    } elseif ($currentCount -eq 4) {
        Write-Host "✅ Found 4 users! Data might be intact!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Cannot check database count" -ForegroundColor Red
}

# Check if admin endpoint exists
Write-Host "`nStep 3: Testing admin endpoint..." -ForegroundColor Yellow

try {
    $adminResponse = Invoke-WebRequest -Uri "https://nelieo.onrender.com/api/admin/waitlist?secret=test" -Method GET -ErrorAction Stop
    Write-Host "✅ Admin endpoint exists!" -ForegroundColor Green
    Write-Host "You can now run: node view-production-db.js" -ForegroundColor Cyan
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "✅ Admin endpoint exists but needs correct secret" -ForegroundColor Green
        Write-Host "Run: node view-production-db.js" -ForegroundColor Cyan
    } elseif ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "❌ Admin endpoint not deployed yet" -ForegroundColor Red
        Write-Host "The latest code hasn't been deployed to Render" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Unknown error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. You need to SSH into Render manually:"
Write-Host "   .\render-cli\cli_v1.1.0.exe ssh srv-d451nqje5dus73ff97cg" -ForegroundColor White
Write-Host ""
Write-Host "2. Once in SSH, run this command:"
Write-Host "   find /opt/render/project -name '*.db' -type f -exec sh -c 'echo {}; sqlite3 {} ""SELECT COUNT(*) FROM waitlist;"" 2>/dev/null' \;" -ForegroundColor White
Write-Host ""
Write-Host "3. Copy the output and send it to me!"
Write-Host ""
