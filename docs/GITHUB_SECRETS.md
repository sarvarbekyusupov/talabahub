# GitHub Secrets Configuration

This document lists all required GitHub secrets for CI/CD pipeline.

## Required Secrets

### Docker Hub Credentials

| Secret Name | Description | Example |
|------------|-------------|---------|
| `DOCKER_USERNAME` | Your Docker Hub username | `yourusername` |
| `DOCKER_PASSWORD` | Your Docker Hub password or access token | `dckr_pat_xxxxx` |

**How to create Docker Hub token:**
1. Go to https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Give it a name and generate
4. Copy the token (you won't see it again!)

---

### Staging Environment

| Secret Name | Description | Example |
|------------|-------------|---------|
| `STAGING_HOST` | Staging server IP or hostname | `staging.talabahub.com` or `123.45.67.89` |
| `STAGING_USER` | SSH username for staging server | `deploy` or `ubuntu` |
| `STAGING_SSH_KEY` | Private SSH key for staging server | (Full content of private key file) |

**How to create SSH key:**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/staging_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/staging_deploy.pub user@staging-server

# Copy private key content to GitHub secret
cat ~/.ssh/staging_deploy
```

---

### Production Environment

| Secret Name | Description | Example |
|------------|-------------|---------|
| `PRODUCTION_HOST` | Production server IP or hostname | `api.talabahub.com` or `123.45.67.90` |
| `PRODUCTION_USER` | SSH username for production server | `deploy` or `ubuntu` |
| `PRODUCTION_SSH_KEY` | Private SSH key for production server | (Full content of private key file) |

**How to create SSH key:**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-production" -f ~/.ssh/production_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/production_deploy.pub user@production-server

# Copy private key content to GitHub secret
cat ~/.ssh/production_deploy
```

---

## How to Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click on `Settings` → `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Enter the secret name and value
5. Click `Add secret`

## Server Preparation

### On Staging/Production Server:

```bash
# 1. Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Create project directory
sudo mkdir -p /var/www/talabahub-backend
sudo chown $USER:$USER /var/www/talabahub-backend
cd /var/www/talabahub-backend

# 4. Create .env file
nano .env
# Add your environment variables here

# 5. Create docker-compose.yml
# Copy from repository or use curl
```

## Security Best Practices

1. **Never commit secrets to repository**
2. **Use separate SSH keys for staging and production**
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use GitHub Environments** for deployment protection rules
5. **Enable branch protection** on main/develop branches
6. **Require pull request reviews** before merging
7. **Use least privilege principle** - give minimal permissions needed

## Environment Protection Rules (Recommended)

### For Production Environment:
1. Go to `Settings` → `Environments` → `production`
2. Enable "Required reviewers" - add at least 1-2 team members
3. Enable "Wait timer" - 5 minutes delay before deployment
4. Restrict deployment branches to `main` only

### For Staging Environment:
1. Go to `Settings` → `Environments` → `staging`
2. Restrict deployment branches to `develop` only

## Troubleshooting

### SSH Connection Issues:
```bash
# Test SSH connection
ssh -i ~/.ssh/production_deploy user@server -v

# Check SSH key permissions
chmod 600 ~/.ssh/production_deploy
chmod 644 ~/.ssh/production_deploy.pub
```

### Docker Permission Issues:
```bash
# On server
sudo usermod -aG docker $USER
# Logout and login again
```

### Deployment Failed:
1. Check GitHub Actions logs
2. SSH into server and check:
   - `docker ps` - running containers
   - `docker logs talabahub-backend` - application logs
   - `docker-compose logs` - all service logs

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [SSH Key Generation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
