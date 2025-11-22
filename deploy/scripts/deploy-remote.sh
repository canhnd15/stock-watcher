#!/bin/bash

# Remote Deployment Script for Stock Watcher
# This script builds locally and deploys to a remote server via SSH

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Remote server configuration
REMOTE_HOST="${REMOTE_HOST:-184.174.33.158}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_PORT="${REMOTE_PORT:-22}"
REMOTE_PATH="${REMOTE_PATH:-/opt/stock-watcher}"

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

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check SSH
    if ! command -v ssh &> /dev/null; then
        print_error "SSH is not installed. Please install OpenSSH."
        exit 1
    fi
    
    # Check SCP
    if ! command -v scp &> /dev/null; then
        print_error "SCP is not installed. Please install OpenSSH."
        exit 1
    fi
    
    # Check rsync (optional but preferred)
    if ! command -v rsync &> /dev/null; then
        print_warn "rsync is not installed. Will use scp instead (slower)."
        USE_RSYNC=false
    else
        USE_RSYNC=true
    fi
    
    # Check Java
    if ! command -v java &> /dev/null; then
        print_error "Java is not installed. Please install Java 21."
        exit 1
    fi
    
    # Check Maven
    if ! command -v mvn &> /dev/null; then
        print_error "Maven is not installed. Please install Maven."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    print_info "Prerequisites check passed"
}

# Test SSH connection
test_ssh_connection() {
    print_info "Testing SSH connection to ${REMOTE_USER}@${REMOTE_HOST}..."
    
    if ssh -p ${REMOTE_PORT} -o ConnectTimeout=10 -o BatchMode=yes ${REMOTE_USER}@${REMOTE_HOST} "echo 'Connection successful'" &> /dev/null; then
        print_info "SSH connection successful"
        return 0
    else
        print_error "SSH connection failed. Please check:"
        print_error "  1. Server is accessible: ${REMOTE_HOST}"
        print_error "  2. SSH key is configured or password authentication is enabled"
        print_error "  3. User has access: ${REMOTE_USER}"
        print_error ""
        print_info "You can test manually with:"
        print_info "  ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST}"
        exit 1
    fi
}

# Build application locally
build_application() {
    print_info "Building application locally..."
    
    # Build backend
    print_info "Building backend..."
    cd "${PROJECT_ROOT}/backend"
    mvn clean package -DskipTests
    
    # Build cron-jobs
    print_info "Building cron-jobs..."
    cd "${PROJECT_ROOT}/cron-jobs"
    mvn clean package -DskipTests
    
    # Build frontend
    print_info "Building frontend..."
    cd "${PROJECT_ROOT}/frontend"
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    fi
    npm run build
    
    print_info "Build completed successfully"
}

# Create deployment package
create_deployment_package() {
    print_info "Creating deployment package..."
    
    TEMP_DIR=$(mktemp -d)
    DEPLOY_DIR="${TEMP_DIR}/stock-watcher"
    
    mkdir -p "${DEPLOY_DIR}/backend"
    mkdir -p "${DEPLOY_DIR}/cron-jobs"
    mkdir -p "${DEPLOY_DIR}/frontend"
    mkdir -p "${DEPLOY_DIR}/scripts"
    mkdir -p "${DEPLOY_DIR}/docker"
    
    # Copy backend JAR
    BACKEND_JAR=$(find "${PROJECT_ROOT}/backend/target" -name "*.jar" -not -name "*-sources.jar" -not -name "*-javadoc.jar" | head -n 1)
    if [ -z "$BACKEND_JAR" ]; then
        print_error "Backend JAR not found"
        exit 1
    fi
    cp "$BACKEND_JAR" "${DEPLOY_DIR}/backend/trade-backend.jar"
    print_info "Backend JAR: $(basename $BACKEND_JAR)"
    
    # Copy cron-jobs JAR
    CRON_JAR=$(find "${PROJECT_ROOT}/cron-jobs/target" -name "*.jar" -not -name "*-sources.jar" -not -name "*-javadoc.jar" | head -n 1)
    if [ -z "$CRON_JAR" ]; then
        print_error "Cron-jobs JAR not found"
        exit 1
    fi
    cp "$CRON_JAR" "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.jar"
    print_info "Cron-jobs JAR: $(basename $CRON_JAR)"
    
    # Copy frontend build
    if [ -d "${PROJECT_ROOT}/frontend/dist" ]; then
        cp -r "${PROJECT_ROOT}/frontend/dist"/* "${DEPLOY_DIR}/frontend/"
        print_info "Frontend files copied"
    else
        print_error "Frontend dist directory not found"
        exit 1
    fi
    
    # Copy deployment script
    cp "${SCRIPT_DIR}/deploy.sh" "${DEPLOY_DIR}/scripts/"
    chmod +x "${DEPLOY_DIR}/scripts/deploy.sh"
    
    # Copy docker-compose
    cp "${PROJECT_ROOT}/docker-compose.yml" "${DEPLOY_DIR}/docker/"
    
    # Copy env.example
    if [ -f "${PROJECT_ROOT}/.env" ]; then
        cp "${PROJECT_ROOT}/.env" "${DEPLOY_DIR}/.env"
    elif [ -f "${PROJECT_ROOT}/env.example" ]; then
        cp "${PROJECT_ROOT}/env.example" "${DEPLOY_DIR}/.env"
        print_warn "Using env.example. Update .env on server with production values."
    fi
    
    echo "${TEMP_DIR}"
}

# Upload to remote server
upload_to_server() {
    local TEMP_DIR=$1
    print_info "Uploading files to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}..."
    
    # Create remote directory
    ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_PATH}"
    
    # Upload files
    if [ "$USE_RSYNC" = true ]; then
        print_info "Using rsync for faster transfer..."
        rsync -avz --progress -e "ssh -p ${REMOTE_PORT}" \
            "${TEMP_DIR}/stock-watcher/" \
            ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
    else
        print_info "Using scp for transfer..."
        scp -P ${REMOTE_PORT} -r "${TEMP_DIR}/stock-watcher"/* \
            ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
    fi
    
    print_info "Upload completed"
}

# Deploy on remote server
deploy_on_server() {
    print_info "Deploying on remote server..."
    
    # Update CORS and configuration for remote server
    ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST} bash << EOF
        set -e
        cd ${REMOTE_PATH}
        
        echo "[INFO] Updating configuration for server ${REMOTE_HOST}..."
        
        # Update .env with server IP if needed
        if [ -f .env ]; then
            # Update SERVER_HOST
            if grep -q "^SERVER_HOST=" .env; then
                sed -i "s|^SERVER_HOST=.*|SERVER_HOST=${REMOTE_HOST}|g" .env
            else
                echo "SERVER_HOST=${REMOTE_HOST}" >> .env
            fi
            
            # Update CORS_ORIGINS to include server IP
            if grep -q "^CORS_ORIGINS=" .env; then
                sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://${REMOTE_HOST},http://${REMOTE_HOST}:8089,http://localhost:8089,http://localhost:4200|g" .env
            else
                echo "CORS_ORIGINS=http://${REMOTE_HOST},http://${REMOTE_HOST}:8089,http://localhost:8089,http://localhost:4200" >> .env
            fi
        fi
        
        # Export SERVER_HOST for deployment script
        export SERVER_HOST=${REMOTE_HOST}
        
        # Make deploy script executable
        chmod +x scripts/deploy.sh
        
        # Run deployment
        echo "[INFO] Running deployment script on server..."
        ./scripts/deploy.sh deploy
EOF
    
    print_info "Deployment on server completed"
}

# Main execution
main() {
    print_info "Starting remote deployment to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"
    print_info ""
    
    check_prerequisites
    test_ssh_connection
    build_application
    
    TEMP_DIR=$(create_deployment_package)
    
    # Cleanup function
    cleanup() {
        print_info "Cleaning up temporary files..."
        rm -rf "${TEMP_DIR}"
    }
    trap cleanup EXIT
    
    upload_to_server "${TEMP_DIR}"
    deploy_on_server
    
    print_info ""
    print_info "=== Deployment Summary ==="
    print_info "Server: ${REMOTE_USER}@${REMOTE_HOST}"
    print_info "Path: ${REMOTE_PATH}"
    print_info "Backend: http://${REMOTE_HOST}:8899"
    print_info "Frontend: http://${REMOTE_HOST}:8089 (if nginx configured)"
    print_info ""
    print_info "To check status, run:"
    print_info "  ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST} 'cd ${REMOTE_PATH} && ./scripts/deploy.sh status'"
    print_info ""
    print_info "Deployment completed successfully!"
}

# Run main function
main "$@"

