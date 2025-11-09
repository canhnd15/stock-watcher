#!/bin/bash

# Quick stop script for Stock Watcher services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy.sh"
"${DEPLOY_SCRIPT}" stop

