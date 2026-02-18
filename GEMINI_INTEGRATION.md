# Switch to FREE Gemini API

Your OpenRouter key is getting 402 errors. Switch to Google's FREE Gemini API:

## Get FREE API Key:
1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

## Set in PowerShell:
```powershell
$env:GEMINI_API_KEY = "YOUR_KEY_HERE"
docker-compose -f docker-compose.aios.yml down
docker-compose -f docker-compose.aios.yml up -d
```

## Or use Anthropic Direct ($5 credit):
```powershell
$env:ANTHROPIC_API_KEY = "YOUR_KEY_HERE"
docker-compose -f docker-compose.aios.yml down  
docker-compose -f docker-compose.aios.yml up -d
```

Then I'll update the code to use it!
