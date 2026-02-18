# Update Render Environment Variables with Firebase Credentials
# Run this script to automatically configure Firebase on Render

Write-Host "🔥 Configuring Firebase on Render..." -ForegroundColor Cyan
Write-Host ""

# Firebase credentials from your service account file
$FIREBASE_PROJECT_ID = "nelieo-waitlist"
$FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-fbsvc@nelieo-waitlist.iam.gserviceaccount.com"
$FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCm5U9NUPdUElzZ\neFNyr60fFufnjaldsnxC8chOeJLLXo7XHaqn9yqaA9dsecTRKglltPPMZssopNSD\nPUV+V4UxG2D5wZIhvxDFEv6EwbfFUAYCz64UWjhmV+JdE7RPEhnLolMj7pA2QVlM\nfLlNwSCaWRT1pXyEPjNCwmRcWzOkZPt9hN0W6jlQShh06EBpmU9MNxVpDHlYaR2w\nhe1PAnVpfDLLM+5lcqGUV0HOA2bV7VrWXnZ8lbklLNh5WoU4ew8m83v/EOco5R76\n/9PH2fHai+1N0AgCmLxITb/yD4heimgkjBgWYe4Xy2OxqNQ7kSQzoJ9FpIC4IUPZ\nxEAcOeX5AgMBAAECggEAMXNvgGa1qgT42v0CqNAx2Szl0N/SJ6+bjxBp/ApQ4I5n\nf4jMSJF9X3405fDcpucwOqEXveBVYPkZ+Lr+bNWM4wSMQuSeon4k/2fF31sw0veH\nmGyl1WT4Iib3LQIKIoWn/ATgYpyswU6yoW2xUD8hpGoxwiljECIH+Ud1CkKBtjs1\nIKR1s0VxvoP9iANIql7Mvof0jjvOngIYZg6jKPLv3oI1QaLtfprudtIxtev87MDm\nYNBKz7riLC3sD8eKaAbDXGBJcobggDOTjyxjr9w/1LyZ4MQwCB9hZz6NUQc5T8Ot\nUATYFRaNV4XUdueL3NOonnSTU+/FWvsMhdVFH2rTAwKBgQDSQ0fUGDub02wSsTs2\nZnx2KYbenexLgQSdrQf/gI6BbXb3IYvDlVy4tBYGxR9d9pt1DYBe3KA0Il5fFBih\npEBgeu+cXCy5HCQPfrcfygvnqcBpPAO/7CNq/UCikRVO763N0kGi460oFeUnZJEa\n/6TXOq+x+w3s13nrQMlbxTO59wKBgQDLMxXX3u2eNO+igdj4WeEKZauKFvU3dgZE\nW2/wRvXS/nOldfZ2Dl1PPbPb6LiLglVy4frASq/XKyINnN6rQlGx/FbMhDCR9w2r\n/N/nfRw6OxJ/+KSzjc7RlAjbEoQ3UunMXNk+re3ArH0ynxsaAE7QSjGgeNqMAqlK\nYzVEqUnjjwKBgHxHumAaBrm/SOTvjxFDmJN7TjWtYKrsUp8kVFLoWNMVsbi3QlZT\npZ+jClXsE/NFPXP9jAAGJkdKfT9zsG9yl36vi4t/TAwKHyJtgq4ujcTbqFhLWegK\nGpE1qgus98xVjQTYH2W5b3L/JhiXr9Emg/eXv5vSydNRNcYg4CP3NvDXAoGBALQS\nm4Lofi87vjmHVJ4SGIo8O15upfT2VOtzFKocWHEZKacx+K36YNp+VcvGWvTXFZ5v\ngOWzykymXtEteW7PoNJYSxuG8fwIskb+G/ZrOv6npuddk6fDPcsgoxBxQlY81hBT\nH/qZ7B5ZPcIEmeHa7/1KItyQ/Swil5/idyxX0bElAoGBAL8GMxutrsj+Kh21pAjW\ng/7tDaYBi4y9QDrSPjdt6RPYSdwWxvR/ouDRyaycu4ez1F3+EwdbxCMCHbwPJPYo\nolaGw4fsUOjn/jkNLbkDGbSoSjhST0cWVOyQrOrKgiKm7F42sI+91oBKY1MuaTNC\ndmCLPr1KtD5WRvxAzgqTmMte\n-----END PRIVATE KEY-----\n"

Write-Host "✅ Credentials loaded" -ForegroundColor Green
Write-Host ""
Write-Host "📋 You need to add these to Render manually:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://dashboard.render.com/" -ForegroundColor White
Write-Host "2. Select your 'Nelieo' service" -ForegroundColor White
Write-Host "3. Click 'Environment' in left sidebar" -ForegroundColor White
Write-Host "4. Add these 3 environment variables:" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Key: FIREBASE_PROJECT_ID" -ForegroundColor Yellow
Write-Host "Value:" -ForegroundColor White
Write-Host $FIREBASE_PROJECT_ID -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Key: FIREBASE_CLIENT_EMAIL" -ForegroundColor Yellow
Write-Host "Value:" -ForegroundColor White
Write-Host $FIREBASE_CLIENT_EMAIL -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Key: FIREBASE_PRIVATE_KEY" -ForegroundColor Yellow
Write-Host "Value (COPY THIS EXACTLY):" -ForegroundColor White
Write-Host $FIREBASE_PRIVATE_KEY -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Also UPDATE the Start Command:" -ForegroundColor Yellow
Write-Host "   Go to Settings -> Build & Deploy" -ForegroundColor White
Write-Host "   Change Start Command from:" -ForegroundColor White
Write-Host "   node server-sqlite.js" -ForegroundColor Red
Write-Host "   To:" -ForegroundColor White
Write-Host "   node server-firebase.js" -ForegroundColor Green
Write-Host ""
Write-Host "6. Click 'Save Changes'" -ForegroundColor White
Write-Host ""
Write-Host "Render will auto-deploy in 2-3 minutes!" -ForegroundColor Cyan
Write-Host ""

# Copy to clipboard if possible
try {
    $clipboardText = @"
FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID

FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL

FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY
"@
    Set-Clipboard -Value $clipboardText
    Write-Host "✅ All values copied to clipboard!" -ForegroundColor Green
    Write-Host "   Paste them one by one into Render Environment variables" -ForegroundColor White
} catch {
    Write-Host "⚠️  Could not copy to clipboard, please copy manually from above" -ForegroundColor Yellow
}

Write-Host ""
