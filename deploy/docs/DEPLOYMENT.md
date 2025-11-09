# Stock Watcher Deployment Guide

## Prerequisites

- Java 21 or higher
- Maven 3.8+
- Node.js 18+
- npm
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker Compose)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stock-watcher
   ```

2. **Configure environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Make deployment script executable**
   ```bash
   chmod +x deploy/scripts/deploy.sh
   chmod +x deploy/scripts/start-services.sh
   chmod +x deploy/scripts/stop-services.sh
   ```

4. **Run deployment**
   ```bash
   ./deploy/scripts/deploy.sh
   ```

## Deployment Commands

- `./deploy/scripts/deploy.sh` or `./deploy/scripts/deploy.sh all` - Full deployment (build + start)
- `./deploy/scripts/deploy.sh check` - Check prerequisites
- `./deploy/scripts/deploy.sh build` - Build all services
- `./deploy/scripts/deploy.sh deploy` - Build and deploy all services
- `./deploy/scripts/deploy.sh start` - Start all services
- `./deploy/scripts/deploy.sh stop` - Stop all services
- `./deploy/scripts/deploy.sh restart` - Restart all services
- `./deploy/scripts/deploy.sh status` - Check service status

## Service Ports

- Backend API: 8899
- Cron Jobs: 8898
- PostgreSQL: 5433
- Frontend: 8089 (via nginx or static server)

## Logs

Logs are stored in `runtime/logs/`:
- `backend.log` - Backend service logs
- `cron-jobs.log` - Cron jobs service logs

## Systemd Service (Optional)

For production deployments, use systemd services:

1. Copy systemd service files:
   ```bash
   sudo cp deploy/systemd/*.service /etc/systemd/system/
   ```

2. Edit service files with correct paths:
   - Replace `your-user` with your system user
   - Replace `/path/to/stock-watcher` with actual project path
   - Update `WorkingDirectory` to point to `runtime/backend` and `runtime/cron-jobs`

3. Enable and start services:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable trade-backend.service
   sudo systemctl enable trade-cron-jobs.service
   sudo systemctl start trade-backend.service
   sudo systemctl start trade-cron-jobs.service
   ```

4. Check service status:
   ```bash
   sudo systemctl status trade-backend.service
   sudo systemctl status trade-cron-jobs.service
   ```

## Frontend Deployment

The frontend is built as static files in `runtime/frontend/`. 

### Option 1: Nginx
Configure nginx to serve the frontend and proxy API requests to the backend.

1. Copy nginx config:
   ```bash
   sudo cp runtime/nginx.conf /etc/nginx/sites-available/stock-watcher
   sudo ln -s /etc/nginx/sites-available/stock-watcher /etc/nginx/sites-enabled/
   ```

2. Edit the config file with correct paths

3. Test and reload nginx:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Option 2: Simple HTTP Server
```bash
cd deploy/frontend
python3 -m http.server 8089
```

### Option 3: Serve with Node.js
```bash
cd deploy/frontend
npx serve -s . -l 8089
```

## Troubleshooting

1. **Check service status**: `./deploy/scripts/deploy.sh status`
2. **View logs**: 
   ```bash
   tail -f runtime/logs/backend.log
   tail -f runtime/logs/cron-jobs.log
   ```
3. **Check PostgreSQL**: `docker ps | grep postgres`
4. **Verify ports**: `netstat -tlnp | grep -E '8899|8898|5433'`
5. **Check Java processes**: `ps aux | grep java`
6. **Test backend API**: `curl http://localhost:8899/api/trades`

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
DB_URL=jdbc:postgresql://localhost:5433/trade
DB_USERNAME=postgre
DB_PASSWORD=admin

# JWT Configuration
JWT_SECRET=your-secret-key-here

# CORS Configuration
CORS_ORIGINS=http://localhost:8089,http://your-domain.com

# Java Configuration (optional)
JAVA_HOME=/usr/lib/jvm/java-21-openjdk

# Node.js Configuration (optional)
NODE_VERSION=18
```

## Manual Deployment Steps

If you prefer to deploy manually:

1. **Build Backend**:
   ```bash
   cd backend
   mvn clean package -DskipTests
   cp target/trade-*.jar ../runtime/backend/trade-backend.jar
   ```

2. **Build Cron Jobs**:
   ```bash
   cd cron-jobs
   mvn clean package -DskipTests
   cp target/trade-jobs-*.jar ../runtime/cron-jobs/trade-cron-jobs.jar
   ```

3. **Build Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   cp -r dist/* ../runtime/frontend/
   ```

4. **Start PostgreSQL**:
   ```bash
   docker-compose up -d postgres
   ```

5. **Start Backend**:
   ```bash
   cd runtime/backend
   java -jar trade-backend.jar
   ```

6. **Start Cron Jobs**:
   ```bash
   cd runtime/cron-jobs
   java -jar trade-cron-jobs.jar
   ```

## Production Considerations

1. **Use systemd services** for automatic restart on failure
2. **Configure nginx** as reverse proxy with SSL
3. **Set up log rotation** for application logs
4. **Configure firewall** to allow only necessary ports
5. **Use environment variables** for sensitive configuration
6. **Set up monitoring** and alerting
7. **Regular backups** of PostgreSQL database
8. **Use process managers** like PM2 or supervisor for better process management

## Backup and Restore

### Backup Database
```bash
docker exec trade_postgres pg_dump -U postgre trade > backup.sql
```

### Restore Database
```bash
docker exec -i trade_postgres psql -U postgre trade < backup.sql
```

