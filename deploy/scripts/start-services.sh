#!/bin/bash

# Quick start script for Stock Watcher services
# This is a simpler script that starts services without rebuilding

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/runtime"
DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy.sh"

if [ ! -f "${DEPLOY_DIR}/backend/trade-backend.jar" ]; then
    echo "Error: Backend JAR not found. Please run ${DEPLOY_SCRIPT} build first."
    exit 1
fi

if [ ! -f "${DEPLOY_DIR}/cron-jobs/trade-cron-jobs.jar" ]; then
    echo "Error: Cron-jobs JAR not found. Please run ${DEPLOY_SCRIPT} build first."
    exit 1
fi

echo "Starting services..."
"${DEPLOY_SCRIPT}" start

