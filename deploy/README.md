# Deployment Directory

This directory contains all deployment-related files and scripts for the Stock Watcher application.

## Directory Structure

```
deploy/
├── scripts/          # Deployment scripts
│   ├── deploy.sh          # Main deployment script
│   ├── start-services.sh  # Quick start script
│   └── stop-services.sh   # Quick stop script
├── systemd/          # Systemd service files
│   ├── trade-backend.service
│   └── trade-cron-jobs.service
└── docs/             # Deployment documentation
    ├── DEPLOYMENT.md      # Full deployment guide
    └── QUICK_START.md     # Quick start guide
```

## Quick Start

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

## Deployment Artifacts

When you run the deployment script, it will create a `runtime/` directory at the project root containing:
- `runtime/backend/` - Backend JAR and configuration
- `runtime/cron-jobs/` - Cron jobs JAR and configuration
- `runtime/frontend/` - Built frontend static files
- `runtime/logs/` - Application logs
- `runtime/nginx.conf` - Nginx configuration (if nginx is available)

## Documentation

- See `docs/QUICK_START.md` for quick reference
- See `docs/DEPLOYMENT.md` for detailed deployment instructions

## Notes

- The `runtime/` directory is created automatically by the deployment script
- The `runtime/` directory is ignored by git (see `.gitignore`)
- All deployment artifacts are stored in `runtime/` to keep them separate from source code

