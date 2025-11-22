# Deployment Directory

This directory contains all deployment-related files and scripts for the Stock Watcher application.

## Directory Structure

```
deploy/
├── scripts/          # Deployment scripts
│   ├── deploy.sh          # Main deployment script (Linux/Mac)
│   ├── deploy.ps1         # Main deployment script (Windows)
│   ├── deploy-remote.sh   # Remote deployment script (SSH-based)
│   ├── start-services.sh  # Quick start script (Linux/Mac)
│   ├── start-services.ps1 # Quick start script (Windows)
│   ├── stop-services.sh   # Quick stop script (Linux/Mac)
│   └── stop-services.ps1  # Quick stop script (Windows)
├── systemd/          # Systemd service files (Linux)
│   ├── trade-backend.service
│   └── trade-cron-jobs.service
├── windows/          # Windows-specific files
│   ├── install-services.ps1 # Windows Services installer
│   └── README.md          # Windows deployment guide
└── docs/             # Deployment documentation
    ├── DEPLOYMENT.md      # Full deployment guide (Linux/Mac)
    ├── REMOTE_DEPLOYMENT.md # Remote server deployment guide
    ├── WINDOWS_DEPLOYMENT.md # Full deployment guide (Windows)
    └── QUICK_START.md     # Quick start guide
```

## Quick Start

### Local Deployment (Linux/Mac)

1. **Make scripts executable**:
   ```bash
   chmod +x deploy/scripts/*.sh
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Run deployment**:
   ```bash
   ./deploy/scripts/deploy.sh
   ```

### Remote Deployment

1. **Configure remote server settings**:
   ```bash
   export REMOTE_HOST=184.174.33.158
   export REMOTE_USER=root
   export REMOTE_PATH=/opt/stock-watcher
   ```

2. **Set up SSH access** (passwordless login recommended):
   ```bash
   ssh-copy-id -p 22 ${REMOTE_USER}@${REMOTE_HOST}
   ```

3. **Run remote deployment**:
   ```bash
   ./deploy/scripts/deploy-remote.sh
   ```

   This will build locally and deploy to the remote server automatically.

   See `docs/REMOTE_DEPLOYMENT.md` for detailed instructions.

### Windows

1. **Open PowerShell** (as Administrator for service installation)

2. **Set execution policy** (if needed):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Configure environment**:
   ```powershell
   Copy-Item env.example .env
   notepad .env
   # Edit .env with your configuration
   ```

4. **Run deployment**:
   ```powershell
   .\deploy\scripts\deploy.ps1
   ```

## Deployment Artifacts

When you run the deployment script, it will create a `runtime/` directory at the project root containing:
- `runtime/backend/` - Backend JAR and configuration
- `runtime/cron-jobs/` - Cron jobs JAR and configuration
- `runtime/frontend/` - Built frontend static files
- `runtime/logs/` - Application logs
- `runtime/nginx.conf` - Nginx configuration (if nginx is available)

## Documentation

### Linux/Mac
- See `docs/QUICK_START.md` for quick reference
- See `docs/DEPLOYMENT.md` for detailed deployment instructions

### Remote Server
- See `docs/REMOTE_DEPLOYMENT.md` for remote server deployment guide

### Windows
- See `windows/README.md` for Windows-specific quick start
- See `docs/WINDOWS_DEPLOYMENT.md` for detailed Windows deployment instructions

## Notes

- The `runtime/` directory is created automatically by the deployment script
- The `runtime/` directory is ignored by git (see `.gitignore`)
- All deployment artifacts are stored in `runtime/` to keep them separate from source code

