# Windows Deployment Guide

This directory contains Windows-specific deployment files and scripts for the Stock Watcher application.

## Prerequisites

- Windows 10/11 or Windows Server 2016+
- Java 21 or higher
- Maven 3.8+
- Node.js 18+
- npm
- Docker Desktop for Windows
- PowerShell 5.1+ (included with Windows 10+)

## Quick Start

1. **Open PowerShell as Administrator** (required for some operations)

2. **Configure environment variables**:
   ```powershell
   Copy-Item env.example .env
   # Edit .env with your configuration using Notepad or your preferred editor
   notepad .env
   ```

3. **Run full deployment**:
   ```powershell
   .\deploy\scripts\deploy.ps1
   ```

## Deployment Commands

All commands should be run from the project root directory:

- `.\deploy\scripts\deploy.ps1` or `.\deploy\scripts\deploy.ps1 all` - Full deployment (build + start)
- `.\deploy\scripts\deploy.ps1 check` - Check prerequisites
- `.\deploy\scripts\deploy.ps1 build` - Build all services
- `.\deploy\scripts\deploy.ps1 deploy` - Build and deploy all services
- `.\deploy\scripts\deploy.ps1 start` - Start all services
- `.\deploy\scripts\deploy.ps1 stop` - Stop all services
- `.\deploy\scripts\deploy.ps1 restart` - Restart all services
- `.\deploy\scripts\deploy.ps1 status` - Check service status

## Quick Start/Stop Scripts

- `.\deploy\scripts\start-services.ps1` - Quick start (requires pre-built JARs)
- `.\deploy\scripts\stop-services.ps1` - Quick stop

## Windows Services (Optional)

For production deployments, you can install the services as Windows Services using NSSM (Non-Sucking Service Manager).

### Install NSSM

1. Download NSSM from: https://nssm.cc/download
2. Extract and add to PATH, or place `nssm.exe` in a directory in your PATH

### Install Services

```powershell
# Run as Administrator
.\deploy\windows\install-services.ps1
```

### Start/Stop Services

```powershell
# Start services
net start StockWatcher-Backend
net start StockWatcher-CronJobs

# Stop services
net stop StockWatcher-Backend
net stop StockWatcher-CronJobs
```

### Uninstall Services

```powershell
# Run as Administrator
.\deploy\windows\install-services.ps1 -Uninstall
```

### Using Services Manager

1. Press `Win + R`, type `services.msc` and press Enter
2. Find "Stock Watcher Backend Service" and "Stock Watcher Cron Jobs Service"
3. Right-click to start, stop, or configure

## Service Ports

- Backend API: 8899
- Cron Jobs: 8898
- PostgreSQL: 5433
- Frontend: 8089 (via static server)

## Logs

Logs are stored in `runtime\logs\`:
- `backend.log` - Backend service logs
- `cron-jobs.log` - Cron jobs service logs
- `backend.error.log` - Backend error logs
- `cron-jobs.error.log` - Cron jobs error logs

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

1. Install IIS from Windows Features
2. Create a new website pointing to `runtime\frontend`
3. Configure URL Rewrite module for SPA routing
4. Set up reverse proxy for `/api` and `/ws` endpoints

## Troubleshooting

1. **Check service status**: `.\deploy\scripts\deploy.ps1 status`
2. **View logs**: 
   ```powershell
   Get-Content runtime\logs\backend.log -Tail 50 -Wait
   Get-Content runtime\logs\cron-jobs.log -Tail 50 -Wait
   ```
3. **Check PostgreSQL**: `docker ps | Select-String postgres`
4. **Verify ports**: 
   ```powershell
   netstat -ano | Select-String "8899|8898|5433"
   ```
5. **Check Java processes**: `Get-Process java`
6. **Test backend API**: 
   ```powershell
   Invoke-WebRequest -Uri http://localhost:8899/api/trades
   ```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DB_URL=jdbc:postgresql://localhost:5433/trade
DB_USERNAME=postgre
DB_PASSWORD=admin

# JWT Configuration
JWT_SECRET=your-secret-key-here

# CORS Configuration
CORS_ORIGINS=http://localhost:8089,http://your-domain.com

# Java Configuration (optional)
JAVA_HOME=C:\Program Files\Java\jdk-21

# Node.js Configuration (optional)
NODE_VERSION=18
```

## PowerShell Execution Policy

If you encounter execution policy errors, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

This allows locally created scripts to run.

## Differences from Linux Version

- Uses PowerShell instead of Bash
- Uses `Start-Process` instead of `nohup`
- Uses Windows Services (NSSM) instead of systemd
- Path separators use backslashes (`\`) instead of forward slashes (`/`)
- Process management uses `Get-Process` and `Stop-Process` instead of `ps` and `kill`

## Production Considerations

1. **Use Windows Services** for automatic restart on failure
2. **Configure IIS** as reverse proxy with SSL
3. **Set up log rotation** using NSSM's built-in rotation
4. **Configure Windows Firewall** to allow necessary ports
5. **Use environment variables** for sensitive configuration
6. **Set up monitoring** using Windows Event Viewer or third-party tools
7. **Regular backups** of PostgreSQL database
8. **Use Task Scheduler** for additional scheduled tasks if needed

