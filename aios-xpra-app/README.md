# AI OS Phase 1 - Docker Container with 12 Apps + Nelieo Screen Agent

## 🎯 Overview

This Docker container includes **all 12 Phase 1 apps** designed to impress VCs, YC, and the public:

### Phase 1 Apps (Business Critical)
1. **Chrome** - Web browsing
2. **Gmail** - Email management
3. **Notion** - Documentation & notes
4. **Instagram** - Social media
5. **Facebook** - Social media
6. **Salesforce** - CRM (Customer Relationship Management)
7. **QuickBooks** - Accounting & finance
8. **Slack** - Team communication
9. **LinkedIn** - Professional networking & recruiting
10. **Google Sheets** - Data analysis & spreadsheets
11. **Zoom** - Video conferencing
12. **Asana** - Project management

### 🤖 Nelieo Screen Agent
The Screen Agent AI can control all these apps automatically, performing complex multi-app workflows in minutes.

## 🚀 Quick Start

### 1. Remove Old Containers
```powershell
# Stop and remove old chrome container
docker stop chrome_xpra
docker rm chrome_xpra

# Remove old images (optional)
docker rmi chrome_xpra
```

### 2. Build and Start AI OS
```powershell
# Build and start the new container
docker compose -f docker-compose.aios.yml up -d --build

# View logs
docker compose -f docker-compose.aios.yml logs -f
```

### 3. Access AI OS
Open your browser and navigate to:
```
http://localhost:10005
```

## 📁 Project Structure

```
aios-xpra-app/
├── Dockerfile              # Main container definition
├── start.sh               # Startup script
├── supervisord.conf       # Process manager config
└── app-launcher.py        # Python app launcher

docker-compose.aios.yml    # Docker Compose configuration
```

## 🔧 Configuration

### Environment Variables
- `PORT` - Xpra server port (default: 10005)
- `DISPLAY` - X11 display (default: :100)

### Persistent Data
The container uses volumes to persist:
- App configurations
- Chrome profiles
- Slack workspaces
- Screen Agent data

## 🛠️ Management Commands

### Start AI OS
```powershell
docker compose -f docker-compose.aios.yml up -d
```

### Stop AI OS
```powershell
docker compose -f docker-compose.aios.yml down
```

### Rebuild After Changes
```powershell
docker compose -f docker-compose.aios.yml up -d --build --force-recreate
```

### View Logs
```powershell
# All logs
docker compose -f docker-compose.aios.yml logs -f

# Specific service
docker logs aios_nelieo_phase1
```

### Execute Commands Inside Container
```powershell
docker exec -it aios_nelieo_phase1 bash

# Inside container, you can:
python3 /opt/app-launcher.py list        # List all apps
python3 /opt/app-launcher.py Chrome      # Launch specific app
python3 /opt/app-launcher.py all         # Launch all apps
```

## 🎯 Why These 12 Apps?

### For YC & VCs:
- **Business Operations**: Salesforce, QuickBooks, Slack
- **Productivity**: Notion, Google Sheets, Asana
- **Communication**: Gmail, Zoom, Slack
- **Marketing & Sales**: LinkedIn, Instagram, Facebook

### Demo Scenarios:
1. **Sales Workflow**: Screen Agent automates lead research on LinkedIn → creates Salesforce contact → sends Gmail → schedules Zoom meeting
2. **Accounting**: Extract data from Gmail → populate QuickBooks → generate Google Sheets report → notify via Slack
3. **Marketing Campaign**: Create Notion campaign doc → schedule Instagram posts → track in Asana → report in Google Sheets
4. **Recruiting**: Search LinkedIn → message candidates → schedule Zoom interviews → track in Salesforce

## 🔍 Screen Agent Integration

The Nelieo Screen Agent is automatically started and can:
- Control all 12 apps simultaneously
- Execute multi-app workflows
- Learn from user interactions
- Automate repetitive business tasks

## 🐛 Troubleshooting

### Container won't start
```powershell
# Check logs
docker logs aios_nelieo_phase1

# Remove and rebuild
docker compose -f docker-compose.aios.yml down -v
docker compose -f docker-compose.aios.yml up -d --build
```

### Apps not launching
```powershell
# Check supervisord status
docker exec -it aios_nelieo_phase1 supervisorctl status

# Restart specific app
docker exec -it aios_nelieo_phase1 python3 /opt/app-launcher.py Chrome
```

### Screen Agent issues
```powershell
# Check Screen Agent logs
docker exec -it aios_nelieo_phase1 cat /var/log/supervisor/screen_agent.log

# Restart Screen Agent
docker exec -it aios_nelieo_phase1 supervisorctl restart screen-agent
```

## 📊 Resource Requirements

- **RAM**: Minimum 4GB, Recommended 8GB
- **CPU**: 2+ cores recommended
- **Storage**: 10GB+ for apps and data
- **Network**: Required for all web-based apps

## 🚀 Next Steps

After successful deployment:
1. Test each app individually
2. Create demo workflows for VCs
3. Record Screen Agent automation demos
4. Prepare YC application materials
5. Gather user feedback

## 📝 Notes

- All apps run in a single Xpra session
- Screen Agent has access to all running apps
- Apps are configured for web access by default
- Native apps (Slack, Zoom) included for better UX

## 🤝 Support

For issues or questions:
1. Check logs first
2. Review this README
3. Test individual components
4. Verify Screen Agent integration
