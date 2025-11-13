# Stock Watcher Deployment Script for Windows
# This script deploys backend, cron-jobs, and frontend services

param(
    [Parameter(Position=0)]
    [string]$Action = "all"
)

# Error handling
$ErrorActionPreference = "Stop"

# Colors for output (PowerShell 5.1+)
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$BackendDir = Join-Path $ProjectRoot "backend"
$CronJobsDir = Join-Path $ProjectRoot "cron-jobs"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$DeployDir = Join-Path $ProjectRoot "runtime"
$LogDir = Join-Path $DeployDir "logs"
$BackendPort = 8899
$CronJobsPort = 8898
$PostgresPort = 5433

# Load environment variables
$EnvFile = Join-Path $ProjectRoot ".env"
$EnvExampleFile = Join-Path $ProjectRoot "env.example"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} elseif (Test-Path $EnvExampleFile) {
    Write-Warn "Using env.example as .env file. Consider creating .env file for production."
    Get-Content $EnvExampleFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Default values
$DB_URL = if ($env:DB_URL) { $env:DB_URL } else { "jdbc:postgresql://localhost:${PostgresPort}/trade" }
$DB_USERNAME = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "postgre" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "admin" }
$JAVA_HOME = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { $null }
$NODE_VERSION = if ($env:NODE_VERSION) { $env:NODE_VERSION } else { "18" }
$JWT_SECRET = if ($env:JWT_SECRET) { $env:JWT_SECRET } else { "mySecretKeyForJWTTokenGenerationMustBeLongEnoughForHS512AlgorithmWithMinimum256Bits" }
$CORS_ORIGINS = if ($env:CORS_ORIGINS) { $env:CORS_ORIGINS } else { "http://localhost:8089,http://localhost:4200" }

function Check-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Java
    try {
        $javaVersion = & java -version 2>&1 | Select-Object -First 1
        if ($LASTEXITCODE -ne 0) {
            throw "Java not found"
        }
        Write-Info "Java version: $javaVersion"
        
        # Check Java version (simplified check)
        $versionMatch = $javaVersion -match 'version "(\d+)'
        if ($versionMatch) {
            $majorVersion = [int]$matches[1]
            if ($majorVersion -lt 21) {
                Write-Error "Java 21 or higher is required. Current version: $majorVersion"
                exit 1
            }
        }
    } catch {
        Write-Error "Java is not installed. Please install Java 21."
        exit 1
    }
    
    # Check Maven
    try {
        $mvnVersion = & mvn -version 2>&1 | Select-Object -First 1
        if ($LASTEXITCODE -ne 0) {
            throw "Maven not found"
        }
        Write-Info "Maven version: $mvnVersion"
    } catch {
        Write-Error "Maven is not installed. Please install Maven."
        exit 1
    }
    
    # Check Node.js
    try {
        $nodeVersion = & node -v 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Node.js not found"
        }
        Write-Info "Node.js version: $nodeVersion"
        
        $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($nodeMajor -lt 18) {
            Write-Warn "Node.js 18 or higher is recommended. Current version: $nodeVersion"
        }
    } catch {
        Write-Error "Node.js is not installed. Please install Node.js ${NODE_VERSION} or higher."
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = & npm -v 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "npm not found"
        }
        Write-Info "npm version: $npmVersion"
    } catch {
        Write-Error "npm is not installed."
        exit 1
    }
    
    # Check Docker
    try {
        $dockerVersion = & docker --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker not found"
        }
        Write-Info "Docker version: $dockerVersion"
    } catch {
        Write-Error "Docker is not installed. Please install Docker Desktop for Windows."
        exit 1
    }
    
    # Check Docker Compose
    try {
        $composeVersion = & docker compose version 2>&1
        if ($LASTEXITCODE -ne 0) {
            # Try docker-compose (older version)
            $composeVersion = & docker-compose --version 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Docker Compose not found"
            }
        }
        Write-Info "Docker Compose is available"
    } catch {
        Write-Error "Docker Compose is not installed."
        exit 1
    }
}

function Create-Directories {
    Write-Info "Creating deployment directories..."
    New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $DeployDir "backend") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $DeployDir "cron-jobs") | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $DeployDir "frontend") | Out-Null
    Write-Info "Deployment directories created in $DeployDir"
}

function Start-Postgres {
    Write-Info "Starting PostgreSQL database..."
    
    $postgresRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "trade_postgres"
    if ($postgresRunning) {
        Write-Warn "PostgreSQL container is already running"
    } else {
        Push-Location $ProjectRoot
        try {
            docker compose up -d postgres 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                docker-compose up -d postgres 2>&1 | Out-Null
            }
        } finally {
            Pop-Location
        }
        
        # Wait for PostgreSQL to be ready
        Write-Info "Waiting for PostgreSQL to be ready..."
        $maxAttempts = 30
        $attempt = 0
        $ready = $false
        
        while ($attempt -lt $maxAttempts -and -not $ready) {
            Start-Sleep -Seconds 2
            $result = docker exec trade_postgres pg_isready -U postgre -d trade 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Info "PostgreSQL is ready!"
                $ready = $true
            }
            $attempt++
        }
        
        if (-not $ready) {
            Write-Error "PostgreSQL failed to start"
            exit 1
        }
    }
}

function Build-Backend {
    Write-Info "Building backend service..."
    Push-Location $BackendDir
    try {
        & mvn clean package -DskipTests
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Backend build failed"
            exit 1
        }
        
        # Find the executable JAR
        $jarFiles = Get-ChildItem -Path "target" -Filter "*.jar" | 
            Where-Object { $_.Name -notmatch "sources|javadoc" }
        
        if ($jarFiles.Count -eq 0) {
            Write-Error "Backend JAR file not found in target directory"
            exit 1
        }
        
        $jarFile = $jarFiles[0]
        $targetJar = Join-Path $DeployDir "backend\trade-backend.jar"
        Copy-Item $jarFile.FullName $targetJar -Force
        Write-Info "Backend JAR copied to $targetJar (from $($jarFile.Name))"
    } finally {
        Pop-Location
    }
}

function Build-CronJobs {
    Write-Info "Building cron-jobs service..."
    Push-Location $CronJobsDir
    try {
        & mvn clean package -DskipTests
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Cron-jobs build failed"
            exit 1
        }
        
        # Find the executable JAR
        $jarFiles = Get-ChildItem -Path "target" -Filter "*.jar" | 
            Where-Object { $_.Name -notmatch "sources|javadoc" }
        
        if ($jarFiles.Count -eq 0) {
            Write-Error "Cron-jobs JAR file not found in target directory"
            exit 1
        }
        
        $jarFile = $jarFiles[0]
        $targetJar = Join-Path $DeployDir "cron-jobs\trade-cron-jobs.jar"
        Copy-Item $jarFile.FullName $targetJar -Force
        Write-Info "Cron-jobs JAR copied to $targetJar (from $($jarFile.Name))"
    } finally {
        Pop-Location
    }
}

function Build-Frontend {
    Write-Info "Building frontend..."
    Push-Location $FrontendDir
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Info "Installing frontend dependencies..."
            & npm install
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Frontend dependencies installation failed"
                exit 1
            }
        }
        
        & npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Frontend build failed"
            exit 1
        }
        
        if (Test-Path "dist") {
            $frontendTarget = Join-Path $DeployDir "frontend"
            Get-ChildItem "dist" | Copy-Item -Destination $frontendTarget -Recurse -Force
            Write-Info "Frontend built and copied to $frontendTarget"
        } else {
            Write-Error "Frontend dist directory not found"
            exit 1
        }
    } finally {
        Pop-Location
    }
}

function Create-BackendConfig {
    Write-Info "Creating backend application.properties..."
    $configFile = Join-Path $DeployDir "backend\application.properties"
    $configContent = @"
server.port=${BackendPort}

spring.application.name=trade
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.jdbc.time_zone=Asia/Ho_Chi_Minh

spring.web.cors.allowed-origins=${CORS_ORIGINS}
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
spring.web.cors.allowed-headers=*
spring.web.cors.allow-credentials=true

spring.jpa.properties.hibernate.jdbc.batch_size=500
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true

app.timezone=Asia/Ho_Chi_Minh
cron.tracked-stocks-refresh=0 */5 * * * *
cron.vn30-ingestion=0 */5 * * * *
cron.tracked-stock.notify=0 */3 * * * *
cron.timezone=Asia/Ho_Chi_Minh

app.finpath.base-url=https://api.finpath.vn
app.finpath.page-size=10000

market.vn30.codes=ACB,BCM,BID,CTG,DGC,FPT,GAS,GVR,HDB,HPG,LPB,MBB,MSN,MWG,PLX,SAB,SHB,SSB,SSI,STB,TCB,TPB,VCB,VHM,VIB,VIC,VJC,VNM,VPB,VRE

app.jwt.secret=${JWT_SECRET}
app.jwt.expiration=86400000
"@
    Set-Content -Path $configFile -Value $configContent
}

function Create-CronJobsConfig {
    Write-Info "Creating cron-jobs application.properties..."
    $configFile = Join-Path $DeployDir "cron-jobs\application.properties"
    $configContent = @"
server.port=${CronJobsPort}

spring.application.name=trade-jobs
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.jdbc.time_zone=Asia/Ho_Chi_Minh

spring.jpa.properties.hibernate.jdbc.batch_size=500
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true

app.timezone=Asia/Ho_Chi_Minh
cron.tracked-stocks-refresh=0 */5 * * * *
cron.vn30-ingestion=0 */5 9-15 * * 1-5
cron.tracked-stock.notify=0 */2 * * * *
cron.timezone=Asia/Ho_Chi_Minh

app.finpath.base-url=https://api.finpath.vn
app.finpath.page-size=10000

market.vn30.codes=ACB,BCM,BID,CTG,DGC,FPT,GAS,GVR,HDB,HPG,LPB,MBB,MSN,MWG,PLX,SAB,SHB,SSB,SSI,STB,TCB,TPB,VCB,VHM,VIB,VIC,VJC,VNM,VPB,VRE

app.backend.base-url=http://localhost:${BackendPort}
"@
    Set-Content -Path $configFile -Value $configContent
}

function Stop-Services {
    Write-Info "Stopping existing services..."
    
    # Stop backend
    $backendPidFile = Join-Path $DeployDir "backend\trade-backend.pid"
    if (Test-Path $backendPidFile) {
        $pid = Get-Content $backendPidFile
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $pid -Force
            Write-Info "Stopped backend service (PID: $pid)"
        }
        Remove-Item $backendPidFile -Force
    }
    
    # Stop cron-jobs
    $cronJobsPidFile = Join-Path $DeployDir "cron-jobs\trade-cron-jobs.pid"
    if (Test-Path $cronJobsPidFile) {
        $pid = Get-Content $cronJobsPidFile
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $pid -Force
            Write-Info "Stopped cron-jobs service (PID: $pid)"
        }
        Remove-Item $cronJobsPidFile -Force
    }
}

function Start-Backend {
    Write-Info "Starting backend service..."
    $backendDir = Join-Path $DeployDir "backend"
    Push-Location $backendDir
    try {
        $env:SPRING_DATASOURCE_URL = $DB_URL
        $env:SPRING_DATASOURCE_USERNAME = $DB_USERNAME
        $env:SPRING_DATASOURCE_PASSWORD = $DB_PASSWORD
        
        $logFile = Join-Path $LogDir "backend.log"
        $pidFile = Join-Path $backendDir "trade-backend.pid"
        
        $javaArgs = @(
            "-Djava.awt.headless=true",
            "-Xms512m",
            "-Xmx1024m",
            "-jar",
            "trade-backend.jar"
        )
        
        $process = Start-Process -FilePath "java" -ArgumentList $javaArgs -PassThru -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $logFile
        $process.Id | Out-File $pidFile
        
        Write-Info "Backend service started (PID: $($process.Id))"
        Write-Info "Logs: $logFile"
        
        # Wait for backend to be ready
        Write-Info "Waiting for backend to be ready..."
        $maxAttempts = 60
        $attempt = 0
        $ready = $false
        
        while ($attempt -lt $maxAttempts -and -not $ready) {
            Start-Sleep -Seconds 2
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:${BackendPort}/api/trades" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                $ready = $true
            } catch {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:${BackendPort}/actuator/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
                    $ready = $true
                } catch {
                    # Continue waiting
                }
            }
            $attempt++
        }
        
        if ($ready) {
            Write-Info "Backend is ready!"
        } else {
            Write-Warn "Backend may not be ready yet. Check logs: $logFile"
        }
    } finally {
        Pop-Location
    }
}

function Start-CronJobs {
    Write-Info "Starting cron-jobs service..."
    $cronJobsDir = Join-Path $DeployDir "cron-jobs"
    Push-Location $cronJobsDir
    try {
        $env:SPRING_DATASOURCE_URL = $DB_URL
        $env:SPRING_DATASOURCE_USERNAME = $DB_USERNAME
        $env:SPRING_DATASOURCE_PASSWORD = $DB_PASSWORD
        
        $logFile = Join-Path $LogDir "cron-jobs.log"
        $pidFile = Join-Path $cronJobsDir "trade-cron-jobs.pid"
        
        $javaArgs = @(
            "-Djava.awt.headless=true",
            "-Xms256m",
            "-Xmx512m",
            "-jar",
            "trade-cron-jobs.jar"
        )
        
        $process = Start-Process -FilePath "java" -ArgumentList $javaArgs -PassThru -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $logFile
        $process.Id | Out-File $pidFile
        
        Write-Info "Cron-jobs service started (PID: $($process.Id))"
        Write-Info "Logs: $logFile"
        
        Start-Sleep -Seconds 5
        Write-Info "Cron-jobs service is running"
    } finally {
        Pop-Location
    }
}

function Setup-FrontendServer {
    Write-Info "Setting up frontend server..."
    Write-Info "Frontend files are in $DeployDir\frontend"
    Write-Warn "You can serve them using:"
    Write-Info "  cd $DeployDir\frontend"
    Write-Info "  python -m http.server 8089"
    Write-Info "  or"
    Write-Info "  npx serve -s . -l 8089"
}

function Print-Status {
    Write-Info "=== Deployment Status ==="
    Write-Host ""
    Write-Host "Backend Service:"
    $backendPidFile = Join-Path $DeployDir "backend\trade-backend.pid"
    if (Test-Path $backendPidFile) {
        $pid = Get-Content $backendPidFile
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  Status: RUNNING (PID: $pid)"
            Write-Host "  Port: ${BackendPort}"
            Write-Host "  Logs: $LogDir\backend.log"
        } else {
            Write-Host "  Status: STOPPED"
        }
    } else {
        Write-Host "  Status: NOT STARTED"
    }
    Write-Host ""
    Write-Host "Cron-jobs Service:"
    $cronJobsPidFile = Join-Path $DeployDir "cron-jobs\trade-cron-jobs.pid"
    if (Test-Path $cronJobsPidFile) {
        $pid = Get-Content $cronJobsPidFile
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  Status: RUNNING (PID: $pid)"
            Write-Host "  Port: ${CronJobsPort}"
            Write-Host "  Logs: $LogDir\cron-jobs.log"
        } else {
            Write-Host "  Status: STOPPED"
        }
    } else {
        Write-Host "  Status: NOT STARTED"
    }
    Write-Host ""
    Write-Host "PostgreSQL:"
    $postgresRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "trade_postgres"
    if ($postgresRunning) {
        Write-Host "  Status: RUNNING"
        Write-Host "  Port: ${PostgresPort}"
    } else {
        Write-Host "  Status: STOPPED"
    }
    Write-Host ""
    Write-Host "Frontend:"
    Write-Host "  Location: $DeployDir\frontend"
    Write-Host ""
}

# Main execution
switch ($Action.ToLower()) {
    "check" {
        Check-Prerequisites
    }
    "build" {
        Check-Prerequisites
        Create-Directories
        Build-Backend
        Build-CronJobs
        Build-Frontend
    }
    "deploy" {
        Check-Prerequisites
        Create-Directories
        Start-Postgres
        Stop-Services
        Build-Backend
        Build-CronJobs
        Build-Frontend
        Create-BackendConfig
        Create-CronJobsConfig
        Start-Backend
        Start-CronJobs
        Setup-FrontendServer
        Print-Status
    }
    "start" {
        Start-Postgres
        Start-Backend
        Start-CronJobs
        Print-Status
    }
    "stop" {
        Stop-Services
        Write-Info "Services stopped"
    }
    "restart" {
        Stop-Services
        Start-Sleep -Seconds 2
        Start-Postgres
        Start-Backend
        Start-CronJobs
        Print-Status
    }
    "status" {
        Print-Status
    }
    default {
        Check-Prerequisites
        Create-Directories
        Start-Postgres
        Stop-Services
        Build-Backend
        Build-CronJobs
        Build-Frontend
        Create-BackendConfig
        Create-CronJobsConfig
        Start-Backend
        Start-CronJobs
        Setup-FrontendServer
        Print-Status
        Write-Info "Deployment completed successfully!"
    }
}

