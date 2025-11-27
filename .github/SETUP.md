# GitHub Actions CI/CD Setup Guide

Quick setup guide for configuring GitHub Actions workflows for Stock Watcher.

## Quick Start

### 1. Add GitHub Secrets

Go to your repository: **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SSH_PRIVATE_KEY` | Private SSH key for server access | Content of `~/.ssh/id_rsa` |
| `SSH_USER` | SSH username | `root`, `ubuntu`, `deploy` |
| `SSH_HOST` | Server IP or hostname | `184.174.33.158` |
| `JWT_SECRET` | (Optional) JWT secret for builds | Your production JWT secret |
| `VITE_API_URL` | (Optional) Frontend API URL | `http://your-server:8899` |

### 2. Generate SSH Key (if needed)

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github_actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-server-ip

# Copy private key content to GitHub Secrets
cat ~/.ssh/github_actions
# Copy the entire output to SSH_PRIVATE_KEY secret
```

### 3. Test the Workflow

1. Go to **Actions** tab in your repository
2. Select **"CI - Build and Test"** workflow
3. Click **"Run workflow"** → Select branch → **Run workflow**
4. Wait for the workflow to complete

### 4. Deploy

#### Option A: Deploy on Version Tag
```bash
git tag v1.0.0
git push origin v1.0.0
```

#### Option B: Manual Deploy
1. Go to **Actions** tab
2. Select **"CD - Deploy to Production"** or **"Quick Deploy"**
3. Click **"Run workflow"**
4. Select environment and click **"Run workflow"**

## Workflow Details

### CI Workflow (`ci.yml`)
- **Triggers:** Push to `main`/`develop`, Pull Requests
- **Duration:** ~5-10 minutes
- **What it does:**
  - Builds and tests backend
  - Builds and tests cron-jobs
  - Builds and lints frontend
  - Creates build artifacts

### CD Workflow (`cd-deploy.yml`)
- **Triggers:** Version tags (v*.*.*), Manual dispatch
- **Duration:** ~10-15 minutes
- **What it does:**
  - Builds all services
  - Deploys via SSH
  - Restarts services
  - Performs health checks

### Docker Push (`docker-push.yml`)
- **Triggers:** Push to `main`, Version tags
- **What it does:**
  - Builds Docker images
  - Pushes to GitHub Container Registry
  - Tags with version/branch/SHA

### Docker Compose Deploy (`docker-compose-deploy.yml`)
- **Triggers:** Push to `main`, Version tags
- **What it does:**
  - Deploys using Docker Compose
  - Copies configuration files
  - Builds and starts services

## Server Requirements

Your deployment server should have:

- **For SSH Deployment:**
  - Java 21 runtime
  - Node.js 18+ (for frontend serving)
  - Systemd or Docker Compose
  - Required directories: `/opt/stock-watcher/runtime/`

- **For Docker Compose Deployment:**
  - Docker and Docker Compose installed
  - Ports open: 8089, 8898, 8899, 5433

## Troubleshooting

### Workflow fails with "Permission denied"
- Check SSH key has correct permissions
- Verify public key is in server's `~/.ssh/authorized_keys`
- Test SSH connection manually: `ssh user@server-ip`

### Build fails
- Check Java 21 is available in workflow
- Verify Maven dependencies can be downloaded
- Check Node.js version matches (18+)

### Deployment fails
- Verify server paths exist: `/opt/stock-watcher/runtime/`
- Check service names match (trade-backend, trade-cron-jobs)
- Verify ports are not in use
- Check server logs: `journalctl -u trade-backend -f`

### Health check fails
- Wait longer (services may need more time to start)
- Check services are actually running
- Verify firewall allows connections

## Customization

### Change Deployment Path
Edit workflow files and replace:
```yaml
/opt/stock-watcher/runtime/
```
with your preferred path.

### Change Service Names
Edit workflow files and replace:
```yaml
trade-backend
trade-cron-jobs
```
with your service names.

### Use Docker Hub Instead of GitHub Container Registry
Edit `.github/workflows/docker-push.yml`:
```yaml
env:
  REGISTRY: docker.io
```
And add `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets.

## Security Best Practices

1. **Use SSH keys with limited permissions**
   - Create a dedicated deploy user
   - Use key-based authentication only
   - Restrict SSH access in server config

2. **Rotate secrets regularly**
   - Update SSH keys periodically
   - Rotate JWT secrets

3. **Use environment-specific secrets**
   - Different secrets for staging/production
   - Use GitHub Environments feature

4. **Review workflow permissions**
   - Limit workflow permissions to minimum required
   - Use `permissions:` in workflows

## Next Steps

- [ ] Configure GitHub Secrets
- [ ] Test CI workflow
- [ ] Test deployment workflow
- [ ] Set up monitoring/alerting
- [ ] Configure branch protection rules
- [ ] Add code coverage reporting
- [ ] Set up security scanning

## Support

For issues or questions:
1. Check workflow logs in Actions tab
2. Review server logs
3. Verify all secrets are configured correctly
4. Test SSH connection manually

