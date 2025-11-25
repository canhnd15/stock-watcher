# Install Stock Watcher as Windows Services using NSSM
# NSSM (Non-Sucking Service Manager) is required for this script
# Download from: https://nssm.cc/download

param(
    [switch]$Uninstall
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$DeployDir = Join-Path $ProjectRoot "runtime"
$LogDir = Join-Path $DeployDir "logs"

# Check if NSSM is available
$nssmPath = Get-Command nssm -ErrorAction SilentlyContinue
if (-not $nssmPath) {
    Write-Host "NSSM (Non-Sucking Service Manager) is not found in PATH." -ForegroundColor Red
    Write-Host "Please download and install NSSM from: https://nssm.cc/download" -ForegroundColor Yellow
    Write-Host "Or add NSSM to your PATH environment variable." -ForegroundColor Yellow
    exit 1
}

$nssm = $nssmPath.Source

# Load environment variables
$EnvFile = Join-Path $ProjectRoot ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$DB_URL = if ($env:DB_URL) { $env:DB_URL } else { "jdbc:postgresql://localhost:5433/trade" }
$DB_USERNAME = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "postgre" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "admin" }

if ($Uninstall) {
    Write-Host "Uninstalling Windows Services..." -ForegroundColor Yellow
    
    # Uninstall backend service
    & $nssm stop "StockWatcher-Backend" 2>&1 | Out-Null
    & $nssm remove "StockWatcher-Backend" confirm 2>&1 | Out-Null
    Write-Host "Backend service uninstalled" -ForegroundColor Green
    
    # Uninstall cron-jobs service
    & $nssm stop "StockWatcher-CronJobs" 2>&1 | Out-Null
    & $nssm remove "StockWatcher-CronJobs" confirm 2>&1 | Out-Null
    Write-Host "Cron-jobs service uninstalled" -ForegroundColor Green
    
    Write-Host "Services uninstalled successfully!" -ForegroundColor Green
} else {
    Write-Host "Installing Windows Services..." -ForegroundColor Yellow
    
    # Check if JAR files exist
    $backendJar = Join-Path $DeployDir "backend\trade-backend.jar"
    $cronJobsJar = Join-Path $DeployDir "cron-jobs\trade-cron-jobs.jar"
    
    if (-not (Test-Path $backendJar)) {
        Write-Host "Error: Backend JAR not found at $backendJar" -ForegroundColor Red
        Write-Host "Please run deploy.ps1 build first." -ForegroundColor Yellow
        exit 1
    }
    
    if (-not (Test-Path $cronJobsJar)) {
        Write-Host "Error: Cron-jobs JAR not found at $cronJobsJar" -ForegroundColor Red
        Write-Host "Please run deploy.ps1 build first." -ForegroundColor Yellow
        exit 1
    }
    
    # Find Java executable
    $javaPath = Get-Command java -ErrorAction SilentlyContinue
    if (-not $javaPath) {
        Write-Host "Error: Java is not found in PATH." -ForegroundColor Red
        exit 1
    }
    $java = $javaPath.Source
    
    # Install Backend Service
    Write-Host "Installing Backend Service..." -ForegroundColor Cyan
    & $nssm install "StockWatcher-Backend" $java `
        "-Djava.awt.headless=true -Xms512m -Xmx1024m -jar `"$backendJar`""
    
    & $nssm set "StockWatcher-Backend" AppDirectory (Join-Path $DeployDir "backend")
    & $nssm set "StockWatcher-Backend" DisplayName "Stock Watcher Backend Service"
    & $nssm set "StockWatcher-Backend" Description "Stock Watcher Backend API Service"
    & $nssm set "StockWatcher-Backend" Start SERVICE_AUTO_START
    & $nssm set "StockWatcher-Backend" AppStdout (Join-Path $LogDir "backend.log")
    & $nssm set "StockWatcher-Backend" AppStderr (Join-Path $LogDir "backend.error.log")
    & $nssm set "StockWatcher-Backend" AppRotateFiles 1
    & $nssm set "StockWatcher-Backend" AppRotateOnline 1
    & $nssm set "StockWatcher-Backend" AppRotateSeconds 86400
    & $nssm set "StockWatcher-Backend" AppRotateBytes 10485760
    
    # Set environment variables
    & $nssm set "StockWatcher-Backend" AppEnvironmentExtra "SPRING_DATASOURCE_URL=$DB_URL" "SPRING_DATASOURCE_USERNAME=$DB_USERNAME" "SPRING_DATASOURCE_PASSWORD=$DB_PASSWORD"
    
    Write-Host "Backend service installed" -ForegroundColor Green
    
    # Install Cron Jobs Service
    Write-Host "Installing Cron Jobs Service..." -ForegroundColor Cyan
    & $nssm install "StockWatcher-CronJobs" $java `
        "-Djava.awt.headless=true -Xms256m -Xmx512m -jar `"$cronJobsJar`""
    
    & $nssm set "StockWatcher-CronJobs" AppDirectory (Join-Path $DeployDir "cron-jobs")
    & $nssm set "StockWatcher-CronJobs" DisplayName "Stock Watcher Cron Jobs Service"
    & $nssm set "StockWatcher-CronJobs" Description "Stock Watcher Scheduled Jobs Service"
    & $nssm set "StockWatcher-CronJobs" Start SERVICE_AUTO_START
    & $nssm set "StockWatcher-CronJobs" AppStdout (Join-Path $LogDir "cron-jobs.log")
    & $nssm set "StockWatcher-CronJobs" AppStderr (Join-Path $LogDir "cron-jobs.error.log")
    & $nssm set "StockWatcher-CronJobs" AppRotateFiles 1
    & $nssm set "StockWatcher-CronJobs" AppRotateOnline 1
    & $nssm set "StockWatcher-CronJobs" AppRotateSeconds 86400
    & $nssm set "StockWatcher-CronJobs" AppRotateBytes 10485760
    
    # Set environment variables
    & $nssm set "StockWatcher-CronJobs" AppEnvironmentExtra "SPRING_DATASOURCE_URL=$DB_URL" "SPRING_DATASOURCE_USERNAME=$DB_USERNAME" "SPRING_DATASOURCE_PASSWORD=$DB_PASSWORD"
    
    Write-Host "Cron-jobs service installed" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Services installed successfully!" -ForegroundColor Green
    Write-Host "You can now start the services using:" -ForegroundColor Yellow
    Write-Host "  net start StockWatcher-Backend" -ForegroundColor Cyan
    Write-Host "  net start StockWatcher-CronJobs" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or use Services Manager (services.msc) to start them." -ForegroundColor Yellow
}

