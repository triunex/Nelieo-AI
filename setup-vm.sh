#!/bin/bash
# Nelieo AI OS - GCP VM Setup Script (T4/L4 Optimized)
# This script prepares your Ubuntu 22.04 VM for the FastAgent Full Version

set -e

echo "🚀 Starting Nelieo AI OS Setup on GCP VM..."

# 1. Update and Install Base Dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release git-lfs python3-pip

# 2. Install Docker (Standard Engine) - MUST BE FIRST
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(ls_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
fi

# 3. Install NVIDIA Drivers
if ! command -v nvidia-smi &> /dev/null; then
    echo "📦 Installing NVIDIA Drivers..."
    sudo apt-get install -y ubuntu-drivers-common
    sudo ubuntu-drivers autoinstall
fi

# 4. Install NVIDIA Container Toolkit
echo "🛠️ Configuring NVIDIA Container Toolkit..."
distribution=$(. /etc/os-release;echo $ID$VERSION_ID) \
      && curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
      && curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
            sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
            sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 5. Prepare Workflow & Weights Directory
mkdir -p ~/nelieo-aios/weights
cd ~/nelieo-aios

# 6. Create Weights Downloader Script
cat <<EOF > download_weights.py
import os
from huggingface_hub import hf_hub_download

# Full OmniParser V2 Weights
files = [
    ("ibm-granite/granite-vision-3.1-2b-preview", "model.safetensors"), 
    ("microsoft/OmniParser-v2.0", "icon_detect/model.pt"),             
    ("microsoft/OmniParser-v2.0", "icon_caption/model.safetensors"),    
]

dest_dir = "weights"
os.makedirs(dest_dir, exist_ok=True)

for repo, filename in files:
    print(f"Downloading {filename} from {repo}...")
    hf_hub_download(repo_id=repo, filename=filename, local_dir=dest_dir)

print("✅ All weights downloaded successfully to /weights")
EOF

# Install HF CLI for downloads
pip3 install huggingface_hub[cli]

echo "⏳ Downloading OmniParser V2 Weights..."
python3 download_weights.py

echo ""
echo "✅ Setup Complete!"
