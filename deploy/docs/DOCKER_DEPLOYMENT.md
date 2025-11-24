# Docker Compose Deployment Guide for Ubuntu Server

This guide provides step-by-step instructions for deploying the Stock Watcher application using Docker Compose on an Ubuntu server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Application Deployment](#application-deployment)
4. [Configuration](#configuration)
5. [Service Management](#service-management)
6. [Troubleshooting](#troubleshooting)
7. [Backup and Recovery](#backup-and-recovery)
8. [Security Considerations](#security-considerations)

## Prerequisites

### Server Requirements

- **OS**: Ubuntu 20.04 LTS or later (22.04 LTS recommended)
- **RAM**: Minimum 2GB (4GB+ recommended)
- **CPU**: 2 cores minimum
- **Disk**: 20GB+ free space
- **Network**: Internet connection for pulling Docker images

### Required Software

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git (for cloning repository)
- SSH access to the server

## Server Setup

### 1. Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Docker

```bash
# Remove old versions if any
sudo apt remove docker docker-engine docker.io containerd runc -y

# Install prerequisites
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
sudo docker --version
sudo docker compose version
```

### 3. Configure Docker (Optional but Recommended)

```bash
# Add your user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
# Or run: newgrp docker

# Configure Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker
```

### 4. Configure Firewall

```bash
# Install UFW if not already installed
sudo apt install -y ufw

# Allow SSH (important - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application ports (optional - only if exposing directly)
sudo ufw allow 8089/tcp  # Frontend
sudo ufw allow 8899/tcp  # Backend API
sudo ufw allow 5433/tcp  # PostgreSQL (only if needed for external access)

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 5. Create Application Directory

```bash
# Create directory for the application
sudo mkdir -p /opt/stock-watcher
sudo chown $USER:$USER /opt/stock-watcher
cd /opt/stock-watcher
```

## Application Deployment

### Option 1: Deploy from Git Repository (Recommended)

```bash
# Clone the repository
cd /opt
sudo git clone <your-repository-url> stock-watcher
cd stock-watcher

# Or if you already have the code, copy it to /opt/stock-watcher
```

### Option 2: Upload Files via SCP

From your local machine:

```bash
# Compress the project (excluding node_modules, target, etc.)
tar --exclude='node_modules' \
    --exclude='target' \
    --exclude='.git' \
    --exclude='dist' \
    -czf stock-watcher.tar.gz .

# Upload to server
scp stock-watcher.tar.gz user@your-server:/opt/

# On server, extract
cd /opt
tar -xzf stock-watcher.tar.gz -C stock-watcher
cd stock-watcher
```

### 3. Configure Environment Variables

```bash
# Create .env file from example
cd /opt/stock-watcher
cp .env.docker.example .env

# Edit .env file with your production values
nano .env
```

**Important environment variables to configure:**

```bash
# Database Configuration
DB_USERNAME=postgre
DB_PASSWORD=your_secure_password_here  # CHANGE THIS!
DB_PORT=5433

# Service Ports
BACKEND_PORT=8899
CRON_JOBS_PORT=8898
FRONTEND_PORT=8089

# JWT Configuration - USE A STRONG RANDOM SECRET!
JWT_SECRET=your_very_long_and_random_jwt_secret_key_here_minimum_256_bits

# Spring Profile
SPRING_PROFILES_ACTIVE=docker
```

**Generate a secure JWT secret:**

```bash
# Generate a random 64-character secret
openssl rand -hex 32
```

### 4. Build and Start Services

```bash
cd /opt/stock-watcher

# Build all Docker images
docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 5. Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Check backend health
curl http://localhost:8899/actuator/health

# Check frontend
curl http://localhost:8089

# Check database connection
docker compose exec postgres pg_isready -U postgre
```

## Configuration

### Database Initialization

The database will be automatically initialized on first startup. The backend service uses `spring.jpa.hibernate.ddl-auto=update`, which will create/update tables automatically.

### Nginx Reverse Proxy (Optional but Recommended)

For production, it's recommended to use Nginx as a reverse proxy:

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/stock-watcher
```

**Nginx configuration (`/etc/nginx/sites-available/stock-watcher`):**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Frontend
    location / {
        proxy_pass http://localhost:8089;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8899;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8899;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/stock-watcher /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### SSL/HTTPS Setup (Recommended for Production)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx for HTTPS
# Certificates auto-renew via systemd timer
```

## Service Management

### Start Services

```bash
cd /opt/stock-watcher
docker compose up -d
```

### Stop Services

```bash
cd /opt/stock-watcher
docker compose down
```

### Restart Services

```bash
cd /opt/stock-watcher
docker compose restart

# Or restart specific service
docker compose restart backend
docker compose restart cron-jobs
docker compose restart frontend
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f cron-jobs
docker compose logs -f frontend
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 backend
```

### Check Service Status

```bash
# Container status
docker compose ps

# Resource usage
docker stats

# Service health
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### Update Application

```bash
cd /opt/stock-watcher

# Pull latest code (if using git)
git pull

# Rebuild and restart
docker compose build
docker compose up -d

# Or force recreate
docker compose up -d --force-recreate
```

### Scale Services (if needed)

```bash
# Scale backend (if you have multiple instances)
docker compose up -d --scale backend=2
```

## Troubleshooting

### Containers Not Starting

```bash
# Check logs
docker compose logs

# Check container status
docker compose ps -a

# Check Docker daemon
sudo systemctl status docker

# Check disk space
df -h

# Check memory
free -h
```

### Database Connection Issues

```bash
# Check PostgreSQL container
docker compose logs postgres

# Test database connection
docker compose exec postgres psql -U postgre -d trade -c "SELECT 1;"

# Check database volume
docker volume ls
docker volume inspect stock-watcher_pgdata
```

### Port Already in Use

```bash
# Check what's using the port
sudo netstat -tlnp | grep :8899
sudo lsof -i :8899

# Stop conflicting service or change port in .env
```

### Build Failures

```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker compose build --no-cache

# Check Dockerfile syntax
docker build -t test ./backend
```

### Memory Issues

```bash
# Check container memory limits
docker stats

# Increase Docker memory limit (if using Docker Desktop)
# Or add memory limits to docker-compose.yml:

services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

### Network Issues

```bash
# Check Docker network
docker network ls
docker network inspect stock-watcher_trade-network

# Recreate network
docker compose down
docker network prune
docker compose up -d
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
docker compose exec postgres pg_dump -U postgre trade > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using docker exec
docker exec trade_postgres pg_dump -U postgre trade > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_*.sql
```

### Automated Backup Script

Create `/opt/stock-watcher/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/stock-watcher/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec trade_postgres pg_dump -U postgre trade | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

```bash
# Make executable
chmod +x /opt/stock-watcher/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/stock-watcher/backup.sh
```

### Database Restore

```bash
# Stop services
docker compose down

# Restore from backup
gunzip < backup_20240101_120000.sql.gz | docker compose exec -T postgres psql -U postgre -d trade

# Or if backup is not compressed
docker compose exec -T postgres psql -U postgre -d trade < backup_20240101_120000.sql

# Start services
docker compose up -d
```

### Volume Backup

```bash
# Backup PostgreSQL volume
docker run --rm \
  -v stock-watcher_pgdata:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/pgdata_backup_$(date +%Y%m%d).tar.gz -C /data .

# Restore volume
docker run --rm \
  -v stock-watcher_pgdata:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/pgdata_backup_20240101.tar.gz"
```

## Security Considerations

### 1. Change Default Passwords

- **Database password**: Change `DB_PASSWORD` in `.env`
- **JWT secret**: Use a strong, random secret (minimum 256 bits)

### 2. Firewall Configuration

- Only expose necessary ports
- Use Nginx reverse proxy instead of exposing services directly
- Consider using fail2ban for SSH protection

### 3. SSL/TLS

- Always use HTTPS in production
- Set up Let's Encrypt certificates
- Configure HSTS headers in Nginx

### 4. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker compose pull
docker compose up -d
```

### 5. Limit Container Resources

Add resource limits to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 6. Use Non-Root User in Containers

The Dockerfiles already use non-root users, but verify:

```bash
docker compose exec backend whoami
# Should output: spring (not root)
```

### 7. Regular Backups

- Set up automated database backups
- Test restore procedures regularly
- Store backups off-server

### 8. Monitor Logs

```bash
# Set up log rotation
sudo nano /etc/logrotate.d/docker-containers
```

```bash
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
```

## Monitoring

### Health Checks

All services include health checks. Monitor them:

```bash
# Check health status
docker compose ps

# Manual health check
curl http://localhost:8899/actuator/health
```

### Resource Monitoring

```bash
# Real-time stats
docker stats

# Container logs
docker compose logs --tail=50 -f
```

### Set Up Monitoring (Optional)

Consider using:
- **Prometheus + Grafana** for metrics
- **ELK Stack** for log aggregation
- **Uptime monitoring** services

## Quick Reference

### Common Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart backend

# Rebuild after code changes
docker compose build backend && docker compose up -d backend

# Access database
docker compose exec postgres psql -U postgre -d trade

# Execute command in container
docker compose exec backend sh

# Check service status
docker compose ps
```

### File Locations

- **Application**: `/opt/stock-watcher`
- **Environment**: `/opt/stock-watcher/.env`
- **Logs**: `docker compose logs`
- **Database data**: Docker volume `stock-watcher_pgdata`
- **Nginx config**: `/etc/nginx/sites-available/stock-watcher`

## Support

For issues or questions:
1. Check logs: `docker compose logs`
2. Review this documentation
3. Check GitHub issues (if applicable)
4. Review application-specific documentation

## Next Steps

After successful deployment:
1. ✅ Configure domain name and SSL
2. ✅ Set up automated backups
3. ✅ Configure monitoring
4. ✅ Review security settings
5. ✅ Test all functionality
6. ✅ Document any custom configurations

