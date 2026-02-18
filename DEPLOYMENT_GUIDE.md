# 🚀 Nelieo AI OS - Complete Deployment Guide

## Overview

This guide covers the complete deployment of Nelieo AI OS with:
- ✅ **Robust Kubernetes Orchestration**
- ✅ **Window Manager (Openbox)** for multi-app handling
- ✅ **X11 Display Server** with Xvfb
- ✅ **Window Control** with wmctrl and xdotool
- ✅ **Automatic Workspace Provisioning**
- ✅ **Production-ready Infrastructure**

---

## Architecture Components

### 1. Container Architecture
```
Single Container Per User:
┌─────────────────────────────────────────┐
│  User Workspace Container               │
│  ┌───────────────────────────────────┐  │
│  │ Xvfb (Virtual Display :100)       │  │
│  │  └─ Openbox (Window Manager)      │  │
│  │      ├─ Chrome                    │  │
│  │      ├─ Gmail                     │  │
│  │      ├─ Slack                     │  │
│  │      ├─ ... (12 Phase 1 Apps)    │  │
│  │      └─ Nelieo ScreenAgent        │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Xpra (Streaming Server :10005)   │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ Window Controller (Python)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 2. Kubernetes Orchestration
```
User Request
     ↓
Provisioner Service (API)
     ↓
Creates K8s Resources:
  ├─ Deployment (User Workspace)
  ├─ Service (Internal networking)
  ├─ PVC (Persistent storage)
  └─ Ingress (External access)
     ↓
User accesses: https://{userId}.workspace.nelieo.ai
```

---

## Local Development Setup

### Step 1: Build Container

```powershell
# Navigate to project
cd n:\lumina-search-flow-main

# Build the container
docker compose -f docker-compose.aios.yml build

# Or use deploy script
.\deploy-aios.ps1
```

### Step 2: Test Locally

```powershell
# Start container
docker compose -f docker-compose.aios.yml up -d

# Check logs
docker compose -f docker-compose.aios.yml logs -f

# Access UI
# Open browser: http://localhost:10005
```

### Step 3: Test Window Management

```powershell
# Enter container
docker exec -it aios_nelieo_phase1 bash

# Test window controller
python3 /opt/window_controller.py list          # List windows
python3 /opt/window_controller.py open chrome   # Open Chrome
python3 /opt/window_controller.py switch chrome # Switch to Chrome

# Test app launcher
python3 /opt/app-launcher.py list               # List available apps
python3 /opt/app-launcher.py running            # Show running apps
python3 /opt/app-launcher.py Chrome             # Launch Chrome
python3 /opt/app-launcher.py switch Chrome      # Switch to Chrome
```

---

## Production Deployment on AWS

### Prerequisites

1. **AWS Account** with:
   - EKS cluster access
   - EC2 permissions
   - Route53 for DNS

2. **Tools Installed**:
   ```bash
   aws configure
   kubectl version
   helm version
   ```

3. **Domain Setup**:
   - Domain registered (e.g., nelieo.ai)
   - DNS configured in Route53
   - Wildcard cert-manager setup

### Step 1: Create EKS Cluster

```bash
# Create cluster
eksctl create cluster \
  --name nelieo-prod \
  --version 1.28 \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --name nelieo-prod --region us-east-1
```

### Step 2: Install Required Add-ons

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml

# Install cert-manager (for SSL certificates)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager

# Install Let's Encrypt issuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@nelieo.ai
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Step 3: Build and Push Container Image

```bash
# Build image
docker build -t nelieo/aios:latest -f aios-xpra-app/Dockerfile aios-xpra-app/

# Tag for ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker tag nelieo/aios:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/nelieo-aios:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/nelieo-aios:latest
```

### Step 4: Deploy Workspace Provisioner

```bash
# Deploy provisioner service
kubectl apply -f k8s/provisioner.yaml

# Verify provisioner is running
kubectl get pods -l app=workspace-provisioner
kubectl logs -f deployment/workspace-provisioner
```

### Step 5: Configure DNS

```bash
# Get Ingress Load Balancer address
kubectl get svc -n ingress-nginx

# Create wildcard DNS record in Route53:
# *.workspace.nelieo.ai → CNAME → <load-balancer-address>
```

---

## Using the Provisioner API

### Provision New Workspace

```bash
curl -X POST http://workspace-provisioner-svc:8080/api/v1/workspace/provision \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "email": "user@example.com"
  }'

# Response:
# {
#   "userId": "user123",
#   "workspaceUrl": "https://user123.workspace.nelieo.ai",
#   "status": "provisioned"
# }
```

### Check Workspace Status

```bash
curl http://workspace-provisioner-svc:8080/api/v1/workspace/user123/status

# Response:
# {
#   "userId": "user123",
#   "status": { "replicas": 1, "readyReplicas": 1 },
#   "workspaceUrl": "https://user123.workspace.nelieo.ai"
# }
```

### Delete Workspace

```bash
curl -X DELETE http://workspace-provisioner-svc:8080/api/v1/workspace/user123

# Response:
# {
#   "status": "deleted",
#   "userId": "user123"
# }
```

---

## Integration with Your Application

### Backend Integration (Node.js)

```typescript
import axios from 'axios';

const PROVISIONER_URL = process.env.PROVISIONER_URL || 'http://workspace-provisioner-svc:8080';

export async function provisionUserWorkspace(userId: string, email: string) {
  try {
    const response = await axios.post(`${PROVISIONER_URL}/api/v1/workspace/provision`, {
      userId,
      email
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to provision workspace:', error);
    throw error;
  }
}

export async function getWorkspaceStatus(userId: string) {
  try {
    const response = await axios.get(`${PROVISIONER_URL}/api/v1/workspace/${userId}/status`);
    return response.data;
  } catch (error) {
    console.error('Failed to get workspace status:', error);
    throw error;
  }
}
```

### Frontend Integration (React)

```typescript
import React, { useState, useEffect } from 'react';

export const WorkspaceViewer: React.FC<{ userId: string }> = ({ userId }) => {
  const [workspaceUrl, setWorkspaceUrl] = useState<string>('');
  const [status, setStatus] = useState<string>('loading');

  useEffect(() => {
    // Provision workspace on mount
    fetch('/api/workspace/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
      .then(res => res.json())
      .then(data => {
        setWorkspaceUrl(data.workspaceUrl);
        setStatus('ready');
      })
      .catch(err => {
        console.error('Failed to provision workspace:', err);
        setStatus('error');
      });
  }, [userId]);

  if (status === 'loading') {
    return <div>🚀 Provisioning your workspace...</div>;
  }

  if (status === 'error') {
    return <div>❌ Failed to provision workspace</div>;
  }

  return (
    <div className="workspace-viewer">
      <iframe
        src={workspaceUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="fullscreen"
      />
    </div>
  );
};
```

---

## Monitoring and Operations

### View Logs

```bash
# View all logs for a user workspace
kubectl logs deployment/nelieo-workspace-user123

# View specific component logs
kubectl logs deployment/nelieo-workspace-user123 -c workspace

# Follow logs in real-time
kubectl logs -f deployment/nelieo-workspace-user123
```

### Scale Resources

```bash
# Scale nodegroup
eksctl scale nodegroup --cluster=nelieo-prod --name=standard-workers --nodes=5

# Update workspace resources
kubectl edit deployment nelieo-workspace-user123
# Modify resources.requests and resources.limits
```

### Debugging

```bash
# Get shell in workspace container
kubectl exec -it deployment/nelieo-workspace-user123 -- bash

# Inside container, check services
supervisorctl status

# Check X11 display
echo $DISPLAY
xdpyinfo

# List windows
wmctrl -l

# Test window controller
python3 /opt/window_controller.py list
```

---

## Performance Optimization

### 1. Container Image Optimization

```dockerfile
# Use multi-stage builds
FROM ubuntu:22.04 AS builder
# ... build steps ...

FROM ubuntu:22.04
COPY --from=builder /opt/apps /opt/apps
# Reduces final image size by 30-40%
```

### 2. Resource Tuning

```yaml
# Adjust based on actual usage
resources:
  requests:
    memory: "4Gi"  # Minimum for 12 apps
    cpu: "2"       # Sufficient for most workloads
  limits:
    memory: "8Gi"  # Allows burst during heavy use
    cpu: "4"       # Maximum allocation
```

### 3. Storage Optimization

```yaml
# Use SSD-backed storage class
storageClassName: fast-ssd

# Enable storage auto-expansion
allowVolumeExpansion: true
```

---

## Security Best Practices

### 1. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: workspace-network-policy
spec:
  podSelector:
    matchLabels:
      app: nelieo-workspace
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 10005
```

### 2. Pod Security Standards

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: workspace
spec:
  securityContext:
    runAsNonRoot: false  # X11 requires root initially
    fsGroup: 2000
  containers:
  - name: workspace
    securityContext:
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: false  # Apps need write access
```

---

## Cost Optimization

### Expected Costs (AWS us-east-1)

| Component | Resource | Monthly Cost (per user) |
|-----------|----------|-------------------------|
| Compute | t3.xlarge node | ~$120/month (shared) |
| Storage | 20GB EBS | ~$2/month |
| Network | Data transfer | ~$5-10/month |
| **Total** | Per active user | **~$7-15/month** |

### Cost Saving Tips

1. **Use Spot Instances** for non-production workspaces (70% savings)
2. **Auto-shutdown** idle workspaces after 1 hour
3. **Shared node pools** for similar workload types
4. **Reserved instances** once you have predictable usage

---

## Troubleshooting

### Container Won't Start

```bash
# Check events
kubectl describe pod nelieo-workspace-user123-xxxxx

# Common issues:
# - Image pull errors → Check ECR permissions
# - Resource limits → Increase node capacity
# - Volume mount errors → Verify PVC exists
```

### Apps Not Launching

```bash
# Enter container
kubectl exec -it deployment/nelieo-workspace-user123 -- bash

# Check supervisord
supervisorctl status

# Restart app manager
supervisorctl restart app-manager

# Check X11 display
echo $DISPLAY
DISPLAY=:100 google-chrome --version
```

### Window Manager Issues

```bash
# Verify Openbox is running
ps aux | grep openbox

# Restart Openbox
killall openbox
openbox &

# Test window control
wmctrl -l
xdotool search --name "Chrome"
```

---

## Next Steps

1. ✅ **Test locally** using deploy-aios.ps1
2. ✅ **Set up AWS EKS** cluster
3. ✅ **Deploy provisioner** service
4. ✅ **Integrate** with your app
5. ✅ **Monitor** and optimize
6. ✅ **Scale** as users grow

---

**You now have a production-ready, scalable AI OS infrastructure!** 🚀
