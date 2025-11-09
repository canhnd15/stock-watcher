#!/bin/bash

# Stock Watcher Deployment Script
# This script deploys backend, cron-jobs, and frontend services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
# Script is in deploy/scripts/, so go up 2 levels to get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
CRON_JOBS_DIR="${PROJECT_ROOT}/cron-jobs"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
DEPLOY_DIR="${PROJECT_ROOT}/runtime"
LOG_DIR="${DEPLOY_DIR}/logs"
BACKEND_PORT=8899
CRON_JOBS_PORT=8898
POSTGRES_PORT=5433

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f "${PROJECT_ROOT}/.env" ]; then
    source "${PROJECT_ROOT}/.env"
elif [ -f "${PROJECT_ROOT}/env.example" ]; then
    print_warn "Using env.example as .env file. Consider creating .env file for production."
    source "${PROJECT_ROOT}/env.example"
fi

# Default values
DB_URL="${DB_URL:-jdbc:postgresql://localhost:${POSTGRES_PORT}/trade}"
DB_USERNAME="${DB_USERNAME:-postgre}"
DB_PASSWORD="${DB_PASSWORD:-admin}"
JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk}"
NODE_VERSION="${NODE_VERSION:-18}"

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Java
    if ! command -v java &> /dev/null; then
        print_error "Java is not installed. Please install Java 21."
        exit 1
    fi
    
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | sed '/^1\./s///' | cut -d'.' -f1)
    if [ "$JAVA_VERSION" -lt 21 ]; then
        print_error "Java 21 or higher is required. Current version: $JAVA_VERSION"
        exit 1
    fi
    print_info "Java version: $(java -version 2>&1 | head -n 1)"
    
    # Check Maven
    if ! command -v mvn &> /dev/null; then
        print_error "Maven is not installed. Please install Maven."
        exit 1
    fi
    print_info "Maven version: $(mvn -version | head -n 1)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js ${NODE_VERSION} or higher."
        exit 1
    fi
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        print_warn "Node.js 18 or higher is recommended. Current version: $(node -v)"
    fi
    print_info "Node.js version: $(node -v)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    print_info "npm version: $(npm -v)"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker."
        exit 1
    fi
    print_info "Docker version: $(docker --version)"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed."
        exit 1
    fi
    print_info "Docker Compose is available"
}

create_directories() {
    print_info "Creating deployment directories..."
    mkdir -p "${DEPLOY_DIR}"
    mkdir -p "${LOG_DIR}"
    mkdir -p "${DEPLOY_DIR}/backend"
    mkdir -p "${DEPLOY_DIR}/cron-jobs"
    mkdir -p "${DEPLOY_DIR}/frontend"
    print_info "Deployment directories created in ${DEPLOY_DIR}"
}

start_postgres() {
    print_info "Starting PostgreSQL database..."
    
    if docker ps | grep -q trade_postgres; then
        print_warn "PostgreSQL container is already running"
    else
        cd "${PROJECT_ROOT}"
        docker-compose up -d postgres 2>/dev/null || docker compose up -d postgres
        
        # Wait for PostgreSQL to be ready
        print_info "Waiting for PostgreSQL to be ready..."
        for i in {1..30}; do
            if docker exec trade_postgres pg_isready -U postgre -d trade &> /dev/null; then
                print_info "PostgreSQL is ready!"
                break
            fi
            if [ $i -eq 30 ]; then
                print_error "PostgreSQL failed to start"
                exit 1
            fi
            sleep 2
        done
    fi
}

build_backend() {
    print_info "Building backend service..."
    cd "${BACKEND_DIR}"
    
    # Clean and build
    mvn clean package -DskipTests
    
    # Copy JAR to deploy directory
    # Find the executable JAR (usually the one without classifier or with -SNAPSHOT)
    JAR_FILE=$(find target -name "*.jar" -not -name "*-sources.jar" -not -name "*-javadoc.jar" | head -n 1)
    if [ -z "$JAR_FILE" ]; then
        print_error "Backend JAR file not found in target directory"
        exit 1
    fi
    
    # Copy to deploy directory with standard name
    cp "$JAR_FILE" "${DEPLOY_DIR}/backend/trade-backend.jar"
    print_info "Backend JAR copied to ${DEPLOY_DIR}/backend/trade-backend.jar (from $(basename $JAR_FILE))"
}

build_cron_jobs() {
    print_info "Building cron-jobs service..."
    cd "${CRON_JOBS_DIR}"
    
    # Clean and build
    mvn clean package -DskipTests
    
    # Copy JAR to deploy directory
    # Find the executable JAR (usually the one without classifier or with -SNAPSHOT)
    JAR_FILE=$(find target -name "*.jar" -not -name "*-sources.jar" -not -name "*-javadoc.jar" | head -n 1)
    if [ -z "$JAR_FILE" ]; then
        print_error "Cron-jobs JAR file not found in target directory"
        exit 1
    fi
    
    # Copy to deploy directory with standard name
    cp "$JAR_FILE" "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.jar"
    print_info "Cron-jobs JAR copied to ${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.jar (from $(basename $JAR_FILE))"
}

build_frontend() {
    print_info "Building frontend..."
    cd "${FRONTEND_DIR}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    fi
    
    # Build frontend
    npm run build
    
    # Copy dist to deploy directory
    if [ -d "dist" ]; then
        cp -r dist/* "${DEPLOY_DIR}/frontend/"
        print_info "Frontend built and copied to ${DEPLOY_DIR}/frontend/"
    else
        print_error "Frontend dist directory not found"
        exit 1
    fi
}

create_backend_config() {
    print_info "Creating backend application.properties..."
    cat > "${DEPLOY_DIR}/backend/application.properties" << EOF
server.port=${BACKEND_PORT}

spring.application.name=trade
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.jdbc.time_zone=Asia/Ho_Chi_Minh

spring.web.cors.allowed-origins=${CORS_ORIGINS:-http://localhost:8089,http://localhost:4200}
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

app.jwt.secret=${JWT_SECRET:-mySecretKeyForJWTTokenGenerationMustBeLongEnoughForHS512AlgorithmWithMinimum256Bits}
app.jwt.expiration=86400000
EOF
}

create_cron_jobs_config() {
    print_info "Creating cron-jobs application.properties..."
    cat > "${DEPLOY_DIR}/cron-jobs/application.properties" << EOF
server.port=${CRON_JOBS_PORT}

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

app.backend.base-url=http://localhost:${BACKEND_PORT}
EOF
}

stop_services() {
    print_info "Stopping existing services..."
    
    # Stop backend
    if [ -f "${DEPLOY_DIR}/backend/trade-backend.pid" ]; then
        PID=$(cat "${DEPLOY_DIR}/backend/trade-backend.pid")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            print_info "Stopped backend service (PID: $PID)"
        fi
        rm -f "${DEPLOY_DIR}/backend/trade-backend.pid"
    fi
    
    # Stop cron-jobs
    if [ -f "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.pid" ]; then
        PID=$(cat "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.pid")
        if ps -p $PID > /dev/null 2>&1; then
            kill $PID
            print_info "Stopped cron-jobs service (PID: $PID)"
        fi
        rm -f "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.pid"
    fi
}

start_backend() {
    print_info "Starting backend service..."
    cd "${DEPLOY_DIR}/backend"
    
    # Spring Boot automatically loads application.properties from the current working directory
    # Set environment variables as backup (these override properties file)
    export SPRING_DATASOURCE_URL="${DB_URL}"
    export SPRING_DATASOURCE_USERNAME="${DB_USERNAME}"
    export SPRING_DATASOURCE_PASSWORD="${DB_PASSWORD}"
    
    nohup java -jar \
        -Djava.awt.headless=true \
        -Xms512m -Xmx1024m \
        trade-backend.jar \
        > "${LOG_DIR}/backend.log" 2>&1 &
    
    BACKEND_PID=$!
    echo $BACKEND_PID > "${DEPLOY_DIR}/backend/trade-backend.pid"
    print_info "Backend service started (PID: $BACKEND_PID)"
    print_info "Logs: ${LOG_DIR}/backend.log"
    
    # Wait for backend to be ready
    print_info "Waiting for backend to be ready..."
    for i in {1..60}; do
        if curl -s -f http://localhost:${BACKEND_PORT}/api/trades > /dev/null 2>&1 || \
           curl -s -f http://localhost:${BACKEND_PORT}/actuator/health > /dev/null 2>&1; then
            print_info "Backend is ready!"
            break
        fi
        if [ $i -eq 60 ]; then
            print_warn "Backend may not be ready yet. Check logs: ${LOG_DIR}/backend.log"
        fi
        sleep 2
    done
}

start_cron_jobs() {
    print_info "Starting cron-jobs service..."
    cd "${DEPLOY_DIR}/cron-jobs"
    
    # Spring Boot automatically loads application.properties from the current working directory
    # Set environment variables as backup (these override properties file)
    export SPRING_DATASOURCE_URL="${DB_URL}"
    export SPRING_DATASOURCE_USERNAME="${DB_USERNAME}"
    export SPRING_DATASOURCE_PASSWORD="${DB_PASSWORD}"
    
    nohup java -jar \
        -Djava.awt.headless=true \
        -Xms256m -Xmx512m \
        trade-cron-jobs.jar \
        > "${LOG_DIR}/cron-jobs.log" 2>&1 &
    
    CRON_JOBS_PID=$!
    echo $CRON_JOBS_PID > "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.pid"
    print_info "Cron-jobs service started (PID: $CRON_JOBS_PID)"
    print_info "Logs: ${LOG_DIR}/cron-jobs.log"
    
    # Wait a bit for cron-jobs to start
    sleep 5
    print_info "Cron-jobs service is running"
}

setup_frontend_server() {
    print_info "Setting up frontend server..."
    
    # Create a simple nginx configuration if nginx is available
    if command -v nginx &> /dev/null; then
        print_info "Creating nginx configuration..."
        cat > "${DEPLOY_DIR}/nginx.conf" << EOF
server {
    listen 80;
    server_name localhost;
    root ${DEPLOY_DIR}/frontend;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF
        print_info "Nginx configuration created at ${DEPLOY_DIR}/nginx.conf"
        print_warn "Please configure nginx to use this config file"
        print_info "Example: sudo cp ${DEPLOY_DIR}/nginx.conf /etc/nginx/sites-available/stock-watcher"
    else
        print_warn "Nginx not found. Frontend files are in ${DEPLOY_DIR}/frontend/"
        print_info "You can serve them using: cd ${DEPLOY_DIR}/frontend && python3 -m http.server 8089"
    fi
}

print_status() {
    print_info "=== Deployment Status ==="
    echo ""
    echo "Backend Service:"
    if [ -f "${DEPLOY_DIR}/backend/trade-backend.pid" ]; then
        PID=$(cat "${DEPLOY_DIR}/backend/trade-backend.pid")
        if ps -p $PID > /dev/null 2>&1; then
            echo "  Status: RUNNING (PID: $PID)"
            echo "  Port: ${BACKEND_PORT}"
            echo "  Logs: ${LOG_DIR}/backend.log"
        else
            echo "  Status: STOPPED"
        fi
    else
        echo "  Status: NOT STARTED"
    fi
    echo ""
    echo "Cron-jobs Service:"
    if [ -f "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.pid" ]; then
        PID=$(cat "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.pid")
        if ps -p $PID > /dev/null 2>&1; then
            echo "  Status: RUNNING (PID: $PID)"
            echo "  Port: ${CRON_JOBS_PORT}"
            echo "  Logs: ${LOG_DIR}/cron-jobs.log"
        else
            echo "  Status: STOPPED"
        fi
    else
        echo "  Status: NOT STARTED"
    fi
    echo ""
    echo "PostgreSQL:"
    if docker ps | grep -q trade_postgres; then
        echo "  Status: RUNNING"
        echo "  Port: ${POSTGRES_PORT}"
    else
        echo "  Status: STOPPED"
    fi
    echo ""
    echo "Frontend:"
    echo "  Location: ${DEPLOY_DIR}/frontend/"
    echo ""
}

# Main execution
main() {
    print_info "Starting deployment process..."
    
    case "${1:-all}" in
        check)
            check_prerequisites
            ;;
        build)
            check_prerequisites
            create_directories
            build_backend
            build_cron_jobs
            build_frontend
            ;;
        deploy)
            check_prerequisites
            create_directories
            start_postgres
            stop_services
            build_backend
            build_cron_jobs
            build_frontend
            create_backend_config
            create_cron_jobs_config
            start_backend
            start_cron_jobs
            setup_frontend_server
            print_status
            ;;
        start)
            start_postgres
            start_backend
            start_cron_jobs
            print_status
            ;;
        stop)
            stop_services
            print_info "Services stopped"
            ;;
        restart)
            stop_services
            sleep 2
            start_postgres
            start_backend
            start_cron_jobs
            print_status
            ;;
        status)
            print_status
            ;;
        all|*)
            check_prerequisites
            create_directories
            start_postgres
            stop_services
            build_backend
            build_cron_jobs
            build_frontend
            create_backend_config
            create_cron_jobs_config
            start_backend
            start_cron_jobs
            setup_frontend_server
            print_status
            print_info "Deployment completed successfully!"
            ;;
    esac
}

# Run main function
main "$@"

