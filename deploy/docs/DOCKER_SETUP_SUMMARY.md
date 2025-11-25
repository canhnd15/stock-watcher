# Docker Setup Summary

This document summarizes the Docker Compose setup that has been created for the Stock Watcher application.

## Files Created

### Docker Configuration Files

1. **`docker-compose.yml`** (Updated)
   - Complete Docker Compose configuration with all services
   - PostgreSQL database
   - Backend Spring Boot service
   - Cron-jobs Spring Boot service
   - Frontend React application (Nginx)
   - Network configuration
   - Volume management

2. **`backend/Dockerfile`**
   - Multi-stage build for backend service
   - Uses Maven for building, Eclipse Temurin JRE for runtime
   - Non-root user for security
   - Health checks included

3. **`cron-jobs/Dockerfile`**
   - Multi-stage build for cron-jobs service
   - Similar structure to backend
   - Health checks included

4. **`frontend/Dockerfile`**
   - Multi-stage build for frontend
   - Node.js for building, Nginx for serving
   - Production-optimized build

5. **`frontend/nginx.conf`**
   - Nginx configuration for serving React app
   - API proxy configuration
   - WebSocket proxy configuration
   - Static asset caching

### Docker Ignore Files

- **`.dockerignore`** - Root level ignore file
- **`backend/.dockerignore`** - Backend specific ignores
- **`cron-jobs/.dockerignore`** - Cron-jobs specific ignores
- **`frontend/.dockerignore`** - Frontend specific ignores

### Deployment Scripts

1. **`deploy-docker.sh`**
   - Interactive deployment script
   - Commands: build, start, stop, restart, logs, status, health, deploy, update
   - Health checks and status monitoring

### Documentation

1. **`DOCKER_README.md`**
   - Quick reference guide
   - Common commands
   - Troubleshooting tips

2. **`deploy/docs/DOCKER_DEPLOYMENT.md`**
   - Comprehensive Ubuntu server deployment guide
   - Step-by-step instructions
   - Security considerations
   - Backup and recovery procedures
   - Monitoring and maintenance

3. **`docker-compose.override.yml.example`**
   - Example override file for local development customization

## Service Architecture

```
┌─────────────┐
│  Frontend   │  Port 8089 (Nginx)
│  (React)    │
└──────┬──────┘
       │ HTTP/WS
       │
┌──────▼──────┐
│   Backend   │  Port 8899 (Spring Boot)
│   (REST)    │
└──────┬──────┘
       │
       │ HTTP
       │
┌──────▼──────┐
│ Cron-Jobs   │  Port 8898 (Spring Boot)
│ (Scheduled) │
└──────┬──────┘
       │
       └──────────┐
                  │
         ┌────────▼────────┐
         │   PostgreSQL    │  Port 5433
         │   (Database)    │
         └─────────────────┘
```

## Environment Variables

Key environment variables (configure in `.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USERNAME` | postgre | PostgreSQL username |
| `DB_PASSWORD` | admin | PostgreSQL password (CHANGE!) |
| `DB_PORT` | 5433 | PostgreSQL port |
| `BACKEND_PORT` | 8899 | Backend API port |
| `CRON_JOBS_PORT` | 8898 | Cron-jobs port |
| `FRONTEND_PORT` | 8089 | Frontend port |
| `JWT_SECRET` | (default) | JWT signing secret (CHANGE!) |
| `SPRING_PROFILES_ACTIVE` | docker | Spring profile |

## Quick Start Commands

```bash
# 1. Create .env file
cp .env.docker.example .env
# Edit .env with your values

# 2. Deploy
./deploy-docker.sh deploy

# Or manually:
docker compose build
docker compose up -d

# 3. Check status
docker compose ps
docker compose logs -f

# 4. Access services
# Frontend: http://localhost:8089
# Backend: http://localhost:8899
# Database: localhost:5433
```

## Features

### Security
- ✅ Non-root users in containers
- ✅ Environment variable configuration
- ✅ Network isolation
- ✅ Health checks

### Production Ready
- ✅ Multi-stage builds (smaller images)
- ✅ Health checks for all services
- ✅ Restart policies
- ✅ Volume persistence for database
- ✅ Nginx reverse proxy for frontend

### Development Friendly
- ✅ Hot reload support (via docker-compose.override.yml)
- ✅ Easy log access
- ✅ Simple deployment script
- ✅ Environment variable overrides

## Next Steps

1. **Create `.env` file** from `.env.docker.example`
2. **Change default passwords** (DB_PASSWORD, JWT_SECRET)
3. **Deploy to server** using the deployment guide
4. **Configure Nginx** reverse proxy (optional but recommended)
5. **Set up SSL** certificates (for production)
6. **Configure backups** for database
7. **Set up monitoring** (optional)

## Troubleshooting

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for detailed troubleshooting guide.

Common issues:
- Port conflicts: Change ports in `.env`
- Database connection: Check DB_URL and credentials
- Build failures: Check Docker daemon and disk space
- Service won't start: Check logs with `docker compose logs`

## Support

For detailed deployment instructions, see:
- [DOCKER_README.md](../../DOCKER_README.md) - Quick reference
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Complete guide

