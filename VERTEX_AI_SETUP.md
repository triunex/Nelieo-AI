# Vertex AI Setup Guide

Use your $317 GCP credits to eliminate Gemini rate limits by switching from AI Studio (free tier) to Vertex AI (paid).

## Prerequisites

- Google Cloud Platform account with credits
- GCP project created
- Vertex AI API enabled

## Setup Steps

### 1. Create GCP Service Account

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Create service account
gcloud iam service-accounts create nelieo-agent \
    --display-name="Nelieo AI Agent" \
    --project=$PROJECT_ID

# Grant Vertex AI permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:nelieo-agent@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create gcp-credentials.json \
    --iam-account=nelieo-agent@${PROJECT_ID}.iam.gserviceaccount.com
```

### 2. Enable Vertex AI API

```bash
gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID
```

### 3. Install Vertex AI SDK in Container

The Vertex AI Python SDK will be installed automatically when you rebuild the container.

Add to `aios-xpra-app/requirements.txt`:
```
google-cloud-aiplatform>=1.38.0
```

### 4. Configure Environment Variables

#### Option A: Using .env file (Recommended)

Create `.env` file in project root:

```bash
# Enable Vertex AI
USE_VERTEX_AI=true

# Your GCP Project ID
GCP_PROJECT_ID=your-project-id

# GCP Region (optional, default: us-central1)
VERTEX_LOCATION=us-central1

# Path to service account JSON (inside container)
GOOGLE_APPLICATION_CREDENTIALS=/opt/gcp-credentials.json

# Your Gemini API key (still needed for some features)
GEMINI_API_KEY=your-gemini-api-key
```

#### Option B: Export Environment Variables

```powershell
# PowerShell
$env:USE_VERTEX_AI="true"
$env:GCP_PROJECT_ID="your-project-id"
$env:VERTEX_LOCATION="us-central1"
```

### 5. Mount Credentials in Docker

Edit `docker-compose.aios.yml` and uncomment the credentials mount:

```yaml
volumes:
  # ... existing volumes ...
  # GCP credentials (mount if using Vertex AI)
  - ./gcp-credentials.json:/opt/gcp-credentials.json:ro  # ← Uncomment this line
```

### 6. Rebuild and Restart Container

```powershell
# Stop current container
docker compose -f docker-compose.aios.yml down

# Rebuild with Vertex AI SDK
docker compose -f docker-compose.aios.yml build

# Start with Vertex AI enabled
docker compose -f docker-compose.aios.yml up -d
```

### 7. Verify Vertex AI is Active

Check logs for confirmation:

```powershell
docker logs aios_nelieo_phase1 -f
```

You should see:
```
✅ Vertex AI initialized (project: your-project-id, model: gemini-2.0-flash)
```

Instead of:
```
Using AI Studio API (model: gemini-2.0-flash)
```

## Benefits

| Feature | AI Studio (Free) | Vertex AI (Paid) |
|---------|------------------|------------------|
| Rate Limit | 15 requests/min | No rate limit |
| Cost | Free | Uses GCP credits |
| Model Access | Latest models | Latest models |
| Quotas | Shared | Project-specific |
| Reliability | Rate limits common | High reliability |

## Cost Estimation

With your $317 credits:

- **Gemini 2.0 Flash**: ~$0.0001875 per image (1000 chars input)
- **Approximate requests**: ~1.7 million requests
- **Testing usage**: ~$5-10 per day of intensive testing
- **Credits duration**: Several months of development

## Troubleshooting

### Error: "No module named 'vertexai'"

Add to `aios-xpra-app/requirements.txt`:
```
google-cloud-aiplatform>=1.38.0
```

Then rebuild:
```powershell
docker compose -f docker-compose.aios.yml build
```

### Error: "Could not automatically determine credentials"

1. Verify `gcp-credentials.json` exists in project root
2. Check volume mount is uncommented in `docker-compose.aios.yml`
3. Verify `GOOGLE_APPLICATION_CREDENTIALS` points to mounted path

### Error: "Permission denied"

Grant Vertex AI User role:
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:nelieo-agent@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
```

### Fallback to AI Studio

If Vertex AI fails to initialize, the system automatically falls back to AI Studio (free tier). Check logs to see which API is being used.

## Verification

Run a test to confirm Vertex AI is working:

```powershell
python test-god-level.py
```

- **With AI Studio**: You'll see rate limit errors after ~15 requests
- **With Vertex AI**: No rate limits, unlimited testing

## Disable Vertex AI

To switch back to free tier:

```powershell
$env:USE_VERTEX_AI="false"
docker compose -f docker-compose.aios.yml restart
```

## Security Notes

- **Never commit** `gcp-credentials.json` to git
- Add to `.gitignore`:
  ```
  gcp-credentials.json
  .env
  ```
- Use service accounts with minimal permissions
- Rotate credentials regularly
- Monitor GCP billing dashboard

## Next Steps

After setting up Vertex AI:

1. Run intensive testing without rate limits
2. Test god-level intelligence integration: `python test-god-level.py`
3. Monitor GCP billing to track credit usage
4. Scale testing to validate Level 10 capabilities
