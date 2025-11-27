# GitHub Actions CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment of the Stock Watcher application.

## Workflows Overview

### 1. CI - Build and Test (`ci.yml`)
**Triggers:** Push to `main`/`develop` branches, Pull Requests

**What it does:**
- Builds and tests the backend service (Spring Boot)
- Builds and tests the cron-jobs service (Spring Boot)
- Builds and lints the frontend (React)
- Optionally builds Docker images (on push to main/develop)
- Uploads build artifacts for later use

**Services tested:**
- PostgreSQL database (via Docker service)
- All three services in parallel

### 2. CD - Deploy to Production (`cd-deploy.yml`)
**Triggers:** Version tags (v*.*.*), Manual workflow dispatch

**What it does:**
- Downloads build artifacts from CI
- Deploys to production server via SSH
- Restarts services (systemd or Docker Compose)
- Performs health checks

**Required Secrets:**
- `SSH_PRIVATE_KEY` - Private SSH key for server access
- `SSH_USER` - SSH username
- `SSH_HOST` - Server hostname or IP

### 3. Docker - Build and Push (`docker-push.yml`)
**Triggers:** Push to `main`, Version tags, Manual dispatch

**What it does:**
- Builds Docker images for all three services
- Pushes to GitHub Container Registry (ghcr.io)
- Tags images with version, branch, and SHA
- Supports multi-platform builds (amd64, arm64)

**Registry:** Uses GitHub Container Registry by default. Change `REGISTRY` env var for Docker Hub.

### 4. CD - Docker Compose Deploy (`docker-compose-deploy.yml`)
**Triggers:** Push to `main`, Version tags, Manual dispatch

**What it does:**
- Deploys using Docker Compose on remote server
- Copies docker-compose.yml and .env files
- Builds and starts all services
- Performs health checks

## Setup Instructions

### 1. Configure GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions, and add:

#### For SSH Deployment:
- `SSH_PRIVATE_KEY` - Your private SSH key (content of `~/.ssh/id_rsa`)
- `SSH_USER` - SSH username (e.g., `root`, `ubuntu`)
- `SSH_HOST` - Server IP or hostname (e.g., `184.174.33.158`)

#### For Docker Registry (optional):
- `DOCKER_USERNAME` - Docker Hub username (if using Docker Hub)
- `DOCKER_PASSWORD` - Docker Hub password/token

### 2. Generate SSH Key Pair (if needed)

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "github-actions"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_rsa.pub user@your-server-ip

# Copy private key content to GitHub Secrets
cat ~/.ssh/id_rsa
```

### 3. Configure Server

Ensure your server has:
- Docker and Docker Compose installed (for Docker Compose deployment)
- Systemd configured (for systemd deployment)
- Required ports open: 8089, 8898, 8899, 5433

### 4. Adjust Workflows (if needed)

#### Change Docker Registry
Edit `.github/workflows/docker-push.yml`:
```yaml
env:
  REGISTRY: docker.io  # For Docker Hub
  # or
  REGISTRY: your-registry.com
```

#### Change Deployment Path
Edit `.github/workflows/cd-deploy.yml`:
```yaml
/opt/stock-watcher/runtime/  # Change to your preferred path
```

#### Change Service Restart Commands
Edit `.github/workflows/cd-deploy.yml`:
```yaml
# For systemd
sudo systemctl restart trade-backend

# For Docker Compose
docker compose restart backend
```

## Usage

### Automatic CI on Push/PR
- Workflow runs automatically on push to `main`/`develop` or on PRs
- No action needed

### Manual Deployment
1. Go to Actions tab
2. Select "CD - Deploy to Production" or "CD - Docker Compose Deploy"
3. Click "Run workflow"
4. Choose environment (production/staging)
5. Click "Run workflow"

### Deploy on Version Tag
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

This triggers the CD workflows automatically.

## Workflow Status Badge

Add to your README.md:

```markdown
![CI](https://github.com/your-username/stock-watcher/workflows/CI%20-%20Build%20and%20Test/badge.svg)
```

## Troubleshooting

### CI Fails
- Check PostgreSQL service is running in workflow
- Verify Java 21 and Node.js 18 are available
- Check test database credentials match workflow env vars

### Deployment Fails
- Verify SSH key has correct permissions
- Check server has required directories
- Ensure services are configured correctly on server
- Check firewall allows required ports

### Docker Build Fails
- Verify Dockerfile paths are correct
- Check build context matches service directories
- Ensure all dependencies are in Dockerfile

## Customization

### Add More Test Steps
Edit `.github/workflows/ci.yml`:
```yaml
- name: Run integration tests
  run: mvn integration-test
```

### Add Code Coverage
Edit `.github/workflows/ci.yml`:
```yaml
- name: Generate coverage report
  run: mvn test jacoco:report

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

### Add Security Scanning
Add to `.github/workflows/ci.yml`:
```yaml
- name: Run security scan
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
```

## Notes

- Artifacts are retained for 7 days
- Docker images use GitHub Actions cache for faster builds
- Health checks wait 10-30 seconds for services to start
- All workflows run on Ubuntu latest

