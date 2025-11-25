# Remote Deployment Guide

This guide explains how to deploy the Stock Watcher application to a remote server.

## Prerequisites

### Local Machine
- Java 21 or higher
- Maven 3.8+
- Node.js 18+
- npm
- SSH client (OpenSSH)
- rsync (optional, but recommended for faster transfers)

### Remote Server
- Linux-based OS (Ubuntu/Debian recommended)
- Java 21 or higher
- Docker and Docker Compose
- SSH access with appropriate permissions
- Nginx (optional, for frontend serving)

## Configuration

### 1. Set Environment Variables

You can configure the remote deployment using environment variables or by editing the script:

```bash
# Server configuration
export REMOTE_HOST=184.174.33.158
export REMOTE_USER=root
export REMOTE_PORT=22
export REMOTE_PATH=/opt/stock-watcher
```

Or edit `deploy/scripts/deploy-remote.sh` and modify these variables:

```bash
REMOTE_HOST="${REMOTE_HOST:-184.174.33.158}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_PATH="${REMOTE_PATH:-/opt/stock-watcher}"
```

### 2. SSH Access Setup

Ensure you can SSH into the remote server without password prompts (using SSH keys):

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy public key to remote server
ssh-copy-id -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST}
```

Or manually add your public key to `~/.ssh/authorized_keys` on the remote server.

### 3. Environment File

Create a `.env` file in the project root (or update `env.example`):

```bash
cp env.example .env
# Edit .env with your production values
```

Important variables:
- `DB_URL`: Database connection string
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password
- `JWT_SECRET`: Secret key for JWT tokens (use a strong random string)
- `SERVER_HOST`: Server IP or domain (default: 184.174.33.158)
- `CORS_ORIGINS`: Allowed CORS origins (will be auto-updated with server IP)

## Deployment

### Quick Deployment

Run the remote deployment script:

```bash
./deploy/scripts/deploy-remote.sh
```

This script will:
1. Check prerequisites (SSH, Java, Maven, Node.js)
2. Test SSH connection to remote server
3. Build backend, cron-jobs, and frontend locally
4. Create deployment package
5. Upload files to remote server
6. Run deployment on remote server
7. Configure CORS and nginx

### Manual Steps

If you prefer to deploy manually:

1. **Build locally**:
   ```bash
   cd backend && mvn clean package -DskipTests
   cd ../cron-jobs && mvn clean package -DskipTests
   cd ../frontend && npm install && npm run build
   ```

2. **Copy files to server**:
   ```bash
   scp -r backend/target/*.jar user@server:/opt/stock-watcher/backend/
   scp -r cron-jobs/target/*.jar user@server:/opt/stock-watcher/cron-jobs/
   scp -r frontend/dist/* user@server:/opt/stock-watcher/frontend/
   ```

3. **SSH into server and run deployment**:
   ```bash
   ssh user@server
   cd /opt/stock-watcher
   ./scripts/deploy.sh deploy
   ```

## Post-Deployment

### 1. Configure Nginx

The deployment script creates an nginx configuration file at `runtime/nginx.conf`. To use it:

```bash
# On remote server
sudo cp /opt/stock-watcher/runtime/nginx.conf /etc/nginx/sites-available/stock-watcher
sudo ln -s /etc/nginx/sites-available/stock-watcher /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Configure Firewall

Open necessary ports on the server:

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (if using SSL)
sudo ufw allow 8899/tcp  # Backend API (if exposing directly)
sudo ufw allow 8898/tcp  # Cron jobs (usually internal only)
```

### 3. Set Up Systemd Services (Optional)

For production, use systemd services for automatic restarts:

```bash
# On remote server
sudo cp /opt/stock-watcher/deploy/systemd/*.service /etc/systemd/system/
# Edit service files with correct paths
sudo systemctl daemon-reload
sudo systemctl enable trade-backend.service
sudo systemctl enable trade-cron-jobs.service
sudo systemctl start trade-backend.service
sudo systemctl start trade-cron-jobs.service
```

### 4. SSL/HTTPS Setup (Recommended)

For production, set up SSL certificates using Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Update nginx configuration to use HTTPS and redirect HTTP to HTTPS.

## Service Management

### Check Status

```bash
ssh user@server 'cd /opt/stock-watcher && ./scripts/deploy.sh status'
```

### Start Services

```bash
ssh user@server 'cd /opt/stock-watcher && ./scripts/deploy.sh start'
```

### Stop Services

```bash
ssh user@server 'cd /opt/stock-watcher && ./scripts/deploy.sh stop'
```

### Restart Services

```bash
ssh user@server 'cd /opt/stock-watcher && ./scripts/deploy.sh restart'
```

### View Logs

```bash
# Backend logs
ssh user@server 'tail -f /opt/stock-watcher/runtime/logs/backend.log'

# Cron jobs logs
ssh user@server 'tail -f /opt/stock-watcher/runtime/logs/cron-jobs.log'
```

## Troubleshooting

### SSH Connection Issues

1. **Test connection manually**:
   ```bash
   ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST}
   ```

2. **Check SSH key**:
   ```bash
   ssh-add -l  # List loaded keys
   ```

3. **Use verbose mode**:
   ```bash
   ssh -v -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST}
   ```

### Build Failures

1. **Check Java version**:
   ```bash
   java -version  # Should be 21+
   ```

2. **Check Maven**:
   ```bash
   mvn -version
   ```

3. **Check Node.js**:
   ```bash
   node -v  # Should be 18+
   npm -v
   ```

### Deployment Failures on Server

1. **Check server prerequisites**:
   ```bash
   ssh user@server 'java -version && docker --version'
   ```

2. **Check disk space**:
   ```bash
   ssh user@server 'df -h'
   ```

3. **Check permissions**:
   ```bash
   ssh user@server 'ls -la /opt/stock-watcher'
   ```

### Service Not Starting

1. **Check logs**:
   ```bash
   ssh user@server 'cat /opt/stock-watcher/runtime/logs/backend.log'
   ```

2. **Check port availability**:
   ```bash
   ssh user@server 'netstat -tlnp | grep -E "8899|8898"'
   ```

3. **Check PostgreSQL**:
   ```bash
   ssh user@server 'docker ps | grep postgres'
   ```

## Updating the Application

To update the application after initial deployment:

```bash
# Run the remote deployment script again
./deploy/scripts/deploy-remote.sh
```

The script will:
- Rebuild all components
- Upload new files
- Restart services automatically

Or manually:

```bash
# On local machine
./deploy/scripts/deploy-remote.sh

# Or manually on server
ssh user@server 'cd /opt/stock-watcher && ./scripts/deploy.sh restart'
```

## Backup

### Database Backup

```bash
# On remote server
docker exec trade_postgres pg_dump -U postgre trade > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Application Backup

```bash
# Backup runtime directory
tar -czf stock-watcher-backup-$(date +%Y%m%d).tar.gz /opt/stock-watcher/runtime
```

## Security Considerations

1. **Use strong passwords** for database and JWT secret
2. **Set up firewall** to restrict access
3. **Use HTTPS** in production
4. **Keep dependencies updated**
5. **Regular backups** of database
6. **Monitor logs** for suspicious activity
7. **Use non-root user** for running services (if possible)
8. **Restrict SSH access** to specific IPs if possible

## Server Information

- **Server IP**: 184.174.33.158
- **Backend API**: http://184.174.33.158:8899
- **Frontend**: http://184.174.33.158:8089 (if nginx configured)
- **Default Path**: /opt/stock-watcher

