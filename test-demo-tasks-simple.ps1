# Test the 3 killer demos for YC - Ollama version
$baseUrl = "http://localhost:8081"

Write-Host "`nTesting YC Demo Tasks with Ollama..." -ForegroundColor Cyan
Write-Host "Note: Each demo takes ~40-60 seconds (LLaMA is slow but FREE)`n" -ForegroundColor Yellow

# Demo 1
Write-Host "`n[Demo 1] Customer Support Automation" -ForegroundColor Yellow
$task1 = @{
    task = "Open Gmail and show me the inbox"
    max_steps = 50
} | ConvertTo-Json

Write-Host "Sending request..." -ForegroundColor Gray
$startTime1 = Get-Date
try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/screenagent/execute" `
        -Method POST `
        -ContentType "application/json" `
        -Body $task1 `
        -TimeoutSec 480
    $duration1 = ((Get-Date) - $startTime1).TotalSeconds
    Write-Host "Result: $($response1.status)" -ForegroundColor Green
    Write-Host "Steps: $($response1.total_steps), Time: $([math]::Round($duration1, 1))s" -ForegroundColor Cyan
} catch {
    $duration1 = ((Get-Date) - $startTime1).TotalSeconds
    $response1 = @{ status = "error"; total_steps = 0 }
    Write-Host "Result: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Time: $([math]::Round($duration1, 1))s" -ForegroundColor Cyan
}

# Demo 2
Write-Host "`n[Demo 2] Accounting Automation" -ForegroundColor Yellow
$task2 = @{
    task = "Open QuickBooks and show me the dashboard"
    max_steps = 50
} | ConvertTo-Json

Write-Host "Sending request..." -ForegroundColor Gray
$startTime2 = Get-Date
try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/screenagent/execute" `
        -Method POST `
        -ContentType "application/json" `
        -Body $task2 `
        -TimeoutSec 480
    $duration2 = ((Get-Date) - $startTime2).TotalSeconds
    Write-Host "Result: $($response2.status)" -ForegroundColor Green
    Write-Host "Steps: $($response2.total_steps), Time: $([math]::Round($duration2, 1))s" -ForegroundColor Cyan
} catch {
    $duration2 = ((Get-Date) - $startTime2).TotalSeconds
    $response2 = @{ status = "error"; total_steps = 0 }
    Write-Host "Result: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Time: $([math]::Round($duration2, 1))s" -ForegroundColor Cyan
}

# Demo 3
Write-Host "`n[Demo 3] Social Media Management" -ForegroundColor Yellow
$task3 = @{
    task = "Open LinkedIn and show me the home page"
    max_steps = 50
} | ConvertTo-Json

Write-Host "Sending request..." -ForegroundColor Gray
$startTime3 = Get-Date
try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/api/screenagent/execute" `
        -Method POST `
        -ContentType "application/json" `
        -Body $task3 `
        -TimeoutSec 480
    $duration3 = ((Get-Date) - $startTime3).TotalSeconds
    Write-Host "Result: $($response3.status)" -ForegroundColor Green
    Write-Host "Steps: $($response3.total_steps), Time: $([math]::Round($duration3, 1))s" -ForegroundColor Cyan
} catch {
    $duration3 = ((Get-Date) - $startTime3).TotalSeconds
    $response3 = @{ status = "error"; total_steps = 0 }
    Write-Host "Result: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Time: $([math]::Round($duration3, 1))s" -ForegroundColor Cyan
}

# Summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Demo 1 (Customer Support): $($response1.status)"
Write-Host "Demo 2 (Accounting): $($response2.status)"
Write-Host "Demo 3 (Social Media): $($response3.status)"

$successCount = @($response1, $response2, $response3) | Where-Object { $_.status -eq 'completed' } | Measure-Object | Select-Object -ExpandProperty Count
if ($successCount -ge 2) {
    Write-Host "`n$successCount / 3 demos successful!" -ForegroundColor Green
    Write-Host "Ready for YC demo (but consider faster API for live demo)" -ForegroundColor Green
} else {
    Write-Host "`n$successCount / 3 demos successful" -ForegroundColor Yellow
    Write-Host "Need more testing and debugging" -ForegroundColor Yellow
}
