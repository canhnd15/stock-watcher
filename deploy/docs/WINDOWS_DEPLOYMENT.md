# Windows Deployment Guide

This guide provides detailed instructions for deploying the Stock Watcher application on Windows.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Building the Application](#building-the-application)
4. [Running Services](#running-services)
5. [Windows Services Setup](#windows-services-setup)
6. [Frontend Deployment](#frontend-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

## Prerequisites

### Required Software

1. **Java 21+**
   - Download from: https://adoptium.net/
   - Add to PATH or set JAVA_HOME environment variable

2. **Maven 3.8+**
   - Download from: https://maven.apache.org/download.cgi
   - Add to PATH

3. **Node.js 18+**
   - Download from: https://nodejs.org/
   - Includes npm

4. **Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop
   - Required for PostgreSQL database

5. **PowerShell 5.1+**
   - Included with Windows 10+
   - Check version: `$PSVersionTable.PSVersion`

### Optional Software

- **NSSM (Non-Sucking Service Manager)** - For Windows Services
  - Download from: https://nssm.cc/download
  - Required only if installing as Windows Services

## Initial Setup

1. **Clone the repository**:
   ```powershell
   git clone <repository-url>
   cd stock-watcher
   ```

2. **Configure environment variables**:
   ```powershell
   Copy-Item env.example .env
   notepad .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   DB_URL=jdbc:postgresql://localhost:5433/trade
   DB_USERNAME=postgre
   DB_PASSWORD=admin
   JWT_SECRET=your-secret-key-here
   CORS_ORIGINS=http://localhost:8089
   ```

3. **Set PowerShell execution policy** (if needed):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

## Building the Application

### Check Prerequisites

```powershell
.\deploy\scripts\deploy.ps1 check
```

This will verify that all required software is installed and accessible.

### Build All Services

```powershell
.\deploy\scripts\deploy.ps1 build
```

This will:
- Build backend JAR file
- Build cron-jobs JAR file
- Build frontend static files
- Copy all artifacts to `runtime\` directory

### Full Deployment (Build + Start)

```powershell
.\deploy\scripts\deploy.ps1
```

This performs a complete deployment:
1. Checks prerequisites
2. Creates deployment directories
3. Starts PostgreSQL (via Docker)
4. Stops existing services
5. Builds all services
6. Creates configuration files
7. Starts backend and cron-jobs services
8. Shows deployment status

## Running Services

### Start Services

```powershell
.\deploy\scripts\deploy.ps1 start
```

Or use the quick start script:
```powershell
.\deploy\scripts\start-services.ps1
```

### Stop Services

```powershell
.\deploy\scripts\deploy.ps1 stop
```

Or use the quick stop script:
```powershell
.\deploy\scripts\stop-services.ps1
```

### Restart Services

```powershell
.\deploy\scripts\deploy.ps1 restart
```

### Check Status

```powershell
.\deploy\scripts\deploy.ps1 status
```

## Windows Services Setup

For production deployments, install the services as Windows Services using NSSM.

### Install NSSM

1. Download NSSM from: https://nssm.cc/download
2. Extract the archive
3. Copy `nssm.exe` (from `win64` or `win32` folder) to a directory in your PATH
   - Or add the NSSM directory to your PATH environment variable

### Install Services

Run PowerShell as Administrator:

```powershell
.\deploy\windows\install-services.ps1
```

This will:
- Install "StockWatcher-Backend" service
- Install "StockWatcher-CronJobs" service
- Configure auto-start
- Set up log rotation
- Configure environment variables

### Manage Services

#### Using Command Line

```powershell
# Start services
net start StockWatcher-Backend
net start StockWatcher-CronJobs

# Stop services
net stop StockWatcher-Backend
net stop StockWatcher-CronJobs

# Check status
Get-Service StockWatcher-Backend
Get-Service StockWatcher-CronJobs
```

#### Using Services Manager

1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find "Stock Watcher Backend Service" and "Stock Watcher Cron Jobs Service"
4. Right-click to start, stop, or configure

### Uninstall Services

Run PowerShell as Administrator:

```powershell
.\deploy\windows\install-services.ps1 -Uninstall
```

## Frontend Deployment

The frontend is built as static files in `runtime\frontend\`.

### Option 1: Python HTTP Server

```powershell
cd runtime\frontend
python -m http.server 8089
```

### Option 2: Node.js serve

```powershell
cd runtime\frontend
npx serve -s . -l 8089
```

### Option 3: IIS (Internet Information Services)

1. **Install IIS**:
   - Open "Turn Windows features on or off"
   - Enable "Internet Information Services"
   - Enable "URL Rewrite" module

2. **Create Website**:
   - Open IIS Manager
   - Right-click "Sites" → "Add Website"
   - Physical path: `D:\stock\stock-watcher\runtime\frontend`
   - Binding: Port 8089

3. **Configure URL Rewrite** (for SPA routing):
   - Install URL Rewrite module if not installed
   - Add rewrite rule:
     - Pattern: `.*`
     - Conditions: `{REQUEST_FILENAME} !-f` and `{REQUEST_FILENAME} !-d`
     - Action: Rewrite to `/index.html`

4. **Configure Reverse Proxy** (for API):
   - Install Application Request Routing (ARR)
   - Create reverse proxy rule:
     - Pattern: `^api/(.*)`
     - Rewrite URL: `http://localhost:8899/api/{R:1}`

## Troubleshooting

### Service Won't Start

1. **Check logs**:
   ```powershell
   Get-Content runtime\logs\backend.log -Tail 50
   Get-Content runtime\logs\cron-jobs.log -Tail 50
   ```

2. **Check if port is in use**:
   ```powershell
   netstat -ano | Select-String "8899|8898"
   ```

3. **Check Java processes**:
   ```powershell
   Get-Process java
   ```

4. **Verify JAR files exist**:
   ```powershell
   Test-Path runtime\backend\trade-backend.jar
   Test-Path runtime\cron-jobs\trade-cron-jobs.jar
   ```

### PostgreSQL Issues

1. **Check if Docker is running**:
   ```powershell
   docker ps
   ```

2. **Check PostgreSQL container**:
   ```powershell
   docker ps | Select-String postgres
   ```

3. **View PostgreSQL logs**:
   ```powershell
   docker logs trade_postgres
   ```

4. **Restart PostgreSQL**:
   ```powershell
   docker restart trade_postgres
   ```

### Permission Issues

- Run PowerShell as Administrator for service installation
- Ensure user has permissions to write to `runtime\` directory
- Check firewall settings for ports 8899, 8898, 5433

### Port Conflicts

If ports are already in use:

1. **Find process using port**:
   ```powershell
   netstat -ano | Select-String "8899"
   ```

2. **Kill process** (replace PID with actual process ID):
   ```powershell
   Stop-Process -Id <PID> -Force
   ```

3. **Or change ports** in `.env` file and rebuild

## Production Deployment

### Security Considerations

1. **Use strong JWT secret** in `.env` file
2. **Change default database password**
3. **Configure CORS origins** properly
4. **Use HTTPS** for production (configure reverse proxy)
5. **Set up firewall rules** to restrict access
6. **Regular security updates** for Java, Node.js, and dependencies

### Performance Tuning

1. **Adjust JVM memory settings** in `install-services.ps1`:
   - Backend: `-Xms512m -Xmx1024m` (adjust based on available RAM)
   - Cron Jobs: `-Xms256m -Xmx512m`

2. **Configure log rotation** (already set in NSSM configuration)

3. **Database optimization**:
   - Regular VACUUM and ANALYZE
   - Proper indexing
   - Connection pool tuning

### Monitoring

1. **Windows Event Viewer**:
   - View service logs
   - Monitor system events

2. **Application Logs**:
   ```powershell
   Get-Content runtime\logs\backend.log -Tail 100 -Wait
   ```

3. **Resource Monitoring**:
   ```powershell
   Get-Process java | Format-Table -AutoSize
   ```

### Backup Strategy

1. **Database Backup**:
   ```powershell
   docker exec trade_postgres pg_dump -U postgre trade > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
   ```

2. **Configuration Backup**:
   - Backup `.env` file
   - Backup `runtime\backend\application.properties`
   - Backup `runtime\cron-jobs\application.properties`

3. **Automated Backups**:
   - Use Task Scheduler to run backup scripts
   - Store backups in secure location

### Maintenance

1. **Regular Updates**:
   - Update Java, Maven, Node.js
   - Update application dependencies
   - Update Docker images

2. **Log Management**:
   - Logs are automatically rotated by NSSM
   - Old logs can be manually archived or deleted

3. **Service Restart**:
   ```powershell
   net stop StockWatcher-Backend
   net start StockWatcher-Backend
   ```

## Additional Resources

- [NSSM Documentation](https://nssm.cc/usage)
- [PowerShell Documentation](https://docs.microsoft.com/powershell/)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/windows/)
- [IIS Configuration](https://docs.microsoft.com/iis)

