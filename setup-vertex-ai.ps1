# Setup Vertex AI for Nelieo
# This script helps configure Vertex AI to use your GCP credits

Write-Host "🚀 Nelieo Vertex AI Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcp-credentials.json exists
if (-not (Test-Path "gcp-credentials.json")) {
    Write-Host "⚠️  GCP credentials not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please follow these steps:" -ForegroundColor White
    Write-Host "1. Go to Google Cloud Console: https://console.cloud.google.com" -ForegroundColor Gray
    Write-Host "2. Create a service account with Vertex AI User role" -ForegroundColor Gray
    Write-Host "3. Download JSON key and save as 'gcp-credentials.json' in this directory" -ForegroundColor Gray
    Write-Host ""
    Write-Host "See VERTEX_AI_SETUP.md for detailed instructions" -ForegroundColor White
    exit 1
}

Write-Host "✅ GCP credentials found" -ForegroundColor Green

# Get GCP Project ID from user
$projectId = Read-Host "Enter your GCP Project ID"

if ([string]::IsNullOrWhiteSpace($projectId)) {
    Write-Host "❌ Project ID is required!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project ID: $projectId" -ForegroundColor Green

# Ask for region
$location = Read-Host "Enter Vertex AI region (default: us-central1)"
if ([string]::IsNullOrWhiteSpace($location)) {
    $location = "us-central1"
}

Write-Host "✅ Region: $location" -ForegroundColor Green

# Create .env file
Write-Host ""
Write-Host "📝 Creating .env file..." -ForegroundColor Cyan

$envContent = @"
# Vertex AI Configuration
USE_VERTEX_AI=true
GCP_PROJECT_ID=$projectId
VERTEX_LOCATION=$location
GOOGLE_APPLICATION_CREDENTIALS=/opt/gcp-credentials.json

# Your existing Gemini API key
GEMINI_API_KEY=$env:GEMINI_API_KEY
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "✅ .env file created" -ForegroundColor Green

# Update docker-compose.yml
Write-Host ""
Write-Host "📝 Updating docker-compose.aios.yml..." -ForegroundColor Cyan

$composeContent = Get-Content "docker-compose.aios.yml" -Raw
$composeContent = $composeContent -replace '# - \./gcp-credentials\.json:/opt/gcp-credentials\.json:ro', '- ./gcp-credentials.json:/opt/gcp-credentials.json:ro'
$composeContent | Out-File -FilePath "docker-compose.aios.yml" -Encoding utf8
Write-Host "✅ Docker compose updated" -ForegroundColor Green

# Set environment variables for current session
$env:USE_VERTEX_AI = "true"
$env:GCP_PROJECT_ID = $projectId
$env:VERTEX_LOCATION = $location

Write-Host ""
Write-Host "🔨 Rebuilding container with Vertex AI SDK..." -ForegroundColor Cyan
docker compose -f docker-compose.aios.yml down
docker compose -f docker-compose.aios.yml build

Write-Host ""
Write-Host "🚀 Starting container with Vertex AI..." -ForegroundColor Cyan
docker compose -f docker-compose.aios.yml up -d

Write-Host ""
Write-Host "⏳ Waiting for container to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "📋 Checking logs..." -ForegroundColor Cyan
docker logs aios_nelieo_phase1 --tail 20

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor White
Write-Host "1. Check logs: docker logs aios_nelieo_phase1 -f" -ForegroundColor Gray
Write-Host "2. Look for: '✅ Vertex AI initialized (project: $projectId)'" -ForegroundColor Gray
Write-Host "3. Run tests: python test-god-level.py" -ForegroundColor Gray
Write-Host "4. Monitor GCP billing dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "💰 With $317 credits, you can run ~1.7 million requests!" -ForegroundColor Cyan
