# Quick Start Deployment Guide

## Prerequisites Check
```bash
./deploy/scripts/deploy.sh check
```

## Full Deployment
```bash
# 1. Copy environment file (if not exists)
cp env.example .env
# Edit .env with your settings

# 2. Run full deployment
./deploy/scripts/deploy.sh
```

## Common Commands

### Build Only
```bash
./deploy/scripts/deploy.sh build
```

### Start Services
```bash
./deploy/scripts/deploy.sh start
# or
./deploy/scripts/start-services.sh
```

### Stop Services
```bash
./deploy/scripts/deploy.sh stop
# or
./deploy/scripts/stop-services.sh
```

### Restart Services
```bash
./deploy/scripts/deploy.sh restart
```

### Check Status
```bash
./deploy/scripts/deploy.sh status
```

## Service URLs

- Backend API: http://localhost:8899
- Frontend: http://localhost:8089 (if using nginx or http server)
- PostgreSQL: localhost:5433

## Logs

- Backend: `runtime/logs/backend.log`
- Cron Jobs: `runtime/logs/cron-jobs.log`

## Troubleshooting

1. **Check if services are running**: `./deploy/scripts/deploy.sh status`
2. **View logs**: `tail -f runtime/logs/backend.log`
3. **Check PostgreSQL**: `docker ps | grep postgres`
4. **Kill stuck processes**: 
   ```bash
   ./deploy/scripts/deploy.sh stop
   # Or manually:
   pkill -f trade-backend.jar
   pkill -f trade-cron-jobs.jar
   ```

