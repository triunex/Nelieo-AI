#!/usr/bin/env pwsh
# Test SuperAgent API endpoint

Write-Host "Testing SuperAgent API..." -ForegroundColor Cyan

# Test 1: Simple observation task (should complete immediately)
Write-Host "`nTest 1: Screen observation" -ForegroundColor Yellow
$body = @{
    task = "Open Google Chrome browser"
    timeout = 60
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8081/api/superagent/execute" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 35
    
    Write-Host "Response received:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error occurred" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
