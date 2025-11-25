# Docker Compose Quick Start

This document provides a quick reference for deploying the Stock Watcher application using Docker Compose.

## Quick Start

### 1. Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB+ RAM
- 20GB+ disk space

### 2. Setup

```bash
# Clone or copy the project
cd /opt/stock-watcher

# Create environment file
cp .env.docker.example .env

# Edit .env with your configuration
nano .env
```

**Important**: Change these values in `.env`:
- `DB_PASSWORD` - Use a strong password
- `JWT_SECRET` - Generate with: `openssl rand -hex 32`

### 3. Deploy

```bash
# Option 1: Use the deployment script
./deploy-docker.sh deploy

# Option 2: Manual deployment
docker compose build
docker compose up -d
```

### 4. Verify

```bash
# Check status
docker compose ps

# Check logs
docker compose logs -f

# Health check
curl http://localhost:8899/actuator/health
curl http://localhost:8089
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 8089 | React application (Nginx) |
| Backend | 8899 | Spring Boot REST API |
| Cron Jobs | 8898 | Scheduled tasks service |
| PostgreSQL | 5433 | Database |

## Common Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service-name]

# Restart a service
docker compose restart [service-name]

# Rebuild and restart
docker compose build [service-name]
docker compose up -d [service-name]

# Access database
docker compose exec postgres psql -U postgre -d trade

# Execute command in container
docker compose exec backend sh
```

## Environment Variables

Key environment variables (set in `.env`):

- `DB_USERNAME` - Database username (default: postgre)
- `DB_PASSWORD` - Database password (CHANGE THIS!)
- `DB_PORT` - Database port (default: 5433)
- `BACKEND_PORT` - Backend API port (default: 8899)
- `FRONTEND_PORT` - Frontend port (default: 8089)
- `JWT_SECRET` - JWT signing secret (CHANGE THIS!)
- `SPRING_PROFILES_ACTIVE` - Spring profile (default: docker)

## Deployment Script

The `deploy-docker.sh` script provides an interactive menu:

```bash
./deploy-docker.sh
```

Or use direct commands:

```bash
./deploy-docker.sh deploy    # Full deployment
./deploy-docker.sh build     # Build images
./deploy-docker.sh start     # Start services
./deploy-docker.sh stop      # Stop services
./deploy-docker.sh restart   # Restart services
./deploy-docker.sh logs      # Show logs
./deploy-docker.sh status    # Show status
./deploy-docker.sh health    # Health check
./deploy-docker.sh update    # Update and restart
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check Docker daemon
sudo systemctl status docker
```

### Database connection issues

```bash
# Check PostgreSQL logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U postgre -d trade -c "SELECT 1;"
```

### Port conflicts

```bash
# Check what's using the port
sudo netstat -tlnp | grep :8899

# Change port in .env file
```

## Production Deployment

For production deployment on Ubuntu, see:
- [DOCKER_DEPLOYMENT.md](deploy/docs/DOCKER_DEPLOYMENT.md) - Complete Ubuntu deployment guide

## Backup

```bash
# Database backup
docker compose exec postgres pg_dump -U postgre trade > backup.sql

# Restore
docker compose exec -T postgres psql -U postgre -d trade < backup.sql
```

## Network Access

By default, services are accessible on:
- Frontend: http://localhost:8089
- Backend API: http://localhost:8899/api
- WebSocket: ws://localhost:8899/ws

For production, configure Nginx reverse proxy (see deployment guide).

## Files Structure

```
.
├── docker-compose.yml          # Main compose file
├── .env                        # Environment variables (create from .env.docker.example)
├── deploy-docker.sh            # Deployment script
├── backend/
│   └── Dockerfile             # Backend service Dockerfile
├── cron-jobs/
│   └── Dockerfile             # Cron jobs service Dockerfile
└── frontend/
    ├── Dockerfile             # Frontend service Dockerfile
    └── nginx.conf             # Nginx configuration
```

## Support

For detailed documentation, see:
- [DOCKER_DEPLOYMENT.md](deploy/docs/DOCKER_DEPLOYMENT.md) - Full deployment guide
- [README.md](README.md) - Project overview

