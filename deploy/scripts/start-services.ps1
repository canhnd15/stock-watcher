# Quick start script for Stock Watcher services on Windows
# This is a simpler script that starts services without rebuilding

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$DeployDir = Join-Path $ProjectRoot "runtime"
$DeployScript = Join-Path $ScriptDir "deploy.ps1"

if (-not (Test-Path (Join-Path $DeployDir "backend\trade-backend.jar"))) {
    Write-Host "Error: Backend JAR not found. Please run $DeployScript build first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $DeployDir "cron-jobs\trade-cron-jobs.jar"))) {
    Write-Host "Error: Cron-jobs JAR not found. Please run $DeployScript build first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting services..." -ForegroundColor Green
& $DeployScript start

