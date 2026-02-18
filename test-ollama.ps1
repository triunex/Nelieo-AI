# Test Ollama with LLaMA 3.2 Vision
# Run this after model downloads

Write-Host "🧪 Testing Ollama + LLaMA 3.2 Vision..." -ForegroundColor Cyan

# Test 1: Simple text prompt
Write-Host "`n1️⃣ Testing text generation..." -ForegroundColor Yellow
$response = ollama run llama3.2-vision:11b "Explain in one sentence what you can do."
Write-Host "✅ Response: $response" -ForegroundColor Green

# Test 2: Check if model is serving on API
Write-Host "`n2️⃣ Testing API endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        model = "llama3.2-vision:11b"
        messages = @(
            @{
                role = "user"
                content = "Hello! Can you see and understand images?"
            }
        )
        stream = $false
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "http://localhost:11434/v1/chat/completions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Host "✅ API Response: $($response.choices[0].message.content)" -ForegroundColor Green
} catch {
    Write-Host "❌ API test failed: $_" -ForegroundColor Red
}

# Test 3: Check model list
Write-Host "`n3️⃣ Checking installed models..." -ForegroundColor Yellow
ollama list

Write-Host "`n✅ Ollama is ready! Next: Rebuild container with new config" -ForegroundColor Green
Write-Host "Run: docker compose -f docker-compose.aios.yml up -d --build" -ForegroundColor Cyan
