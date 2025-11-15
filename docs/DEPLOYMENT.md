# TalabaHub Backend - Deployment Guide

Complete guide for deploying TalabaHub backend to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Deployment](#production-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: 20.x or higher
- **PostgreSQL**: 16.x or higher
- **Redis**: 7.x or higher (optional, recommended for production)
- **Docker**: 24.x or higher (for containerized deployment)
- **Docker Compose**: 2.x or higher

### Required Accounts

- **Cloudinary**: For file uploads
- **SMTP Provider**: For email sending (Gmail, SendGrid, etc.)
- **Payment Gateways**: Click.uz and Payme (for Uzbekistan)

---

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/sarvarbekyusupov/talabahub.git
cd talabahub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Setup Database

```bash
# Start PostgreSQL (if using Docker)
docker-compose -f docker-compose.dev.yml up -d postgres

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 5. Start Development Server

```bash
# Start Redis (optional)
docker-compose -f docker-compose.dev.yml up -d redis

# Start backend
npm run start:dev
```

### 6. Access Services

- **Backend API**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health
- **Adminer** (DB UI): http://localhost:8080
- **Redis Commander**: http://localhost:8081

---

## Docker Deployment

### Development with Docker

```bash
# Start all services (PostgreSQL, Redis, Adminer, Redis Commander)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

### Production with Docker

```bash
# Build production image
docker build -t talabahub-backend:latest .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Docker Commands

```bash
# Build image
docker build -t talabahub-backend:latest .

# Run container
docker run -d \
  --name talabahub-backend \
  -p 3000:3000 \
  --env-file .env \
  talabahub-backend:latest

# View logs
docker logs -f talabahub-backend

# Execute commands in container
docker exec -it talabahub-backend sh

# Stop container
docker stop talabahub-backend

# Remove container
docker rm talabahub-backend
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

The project includes 2 automated workflows:

#### 1. CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

Runs on push to `main` or `develop` branches:

**Jobs:**
1. **Lint & Type Check** - ESLint and TypeScript validation
2. **Unit Tests** - Run all tests with coverage
3. **Build Docker Image** - Multi-platform build (amd64, arm64)
4. **Security Scan** - Trivy vulnerability scanner
5. **Deploy to Staging** - Auto-deploy to staging (develop branch)
6. **Deploy to Production** - Auto-deploy to production (main branch)

#### 2. PR Check (`.github/workflows/pr-check.yml`)

Runs on every pull request:

**Checks:**
- Code linting
- Type checking
- Unit tests
- Build verification
- PR title format (semantic versioning)

### Required GitHub Secrets

Configure these secrets in GitHub Settings → Secrets:

```bash
# Docker Hub
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password

# Staging Server
STAGING_HOST=staging.talabahub.com
STAGING_USER=deploy
STAGING_SSH_KEY=your_ssh_private_key

# Production Server
PRODUCTION_HOST=api.talabahub.com
PRODUCTION_USER=deploy
PRODUCTION_SSH_KEY=your_ssh_private_key
```

---

## Production Deployment

### Option 1: Docker on VPS/Cloud

#### Step 1: Prepare Server

```bash
# SSH into server
ssh user@your-server.com

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### Step 2: Setup Application

```bash
# Create app directory
sudo mkdir -p /var/www/talabahub-backend
cd /var/www/talabahub-backend

# Clone repository
git clone https://github.com/sarvarbekyusupov/talabahub.git .

# Setup environment
cp .env.example .env
nano .env  # Edit with production values
```

#### Step 3: Configure Environment

```bash
# .env (production)
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://user:pass@postgres:5432/talabahub?connection_limit=10&pool_timeout=20"
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
# ... other variables
```

#### Step 4: Deploy

```bash
# Build and start services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# View logs
docker-compose logs -f backend

# Check health
curl http://localhost:3000/api/health
```

#### Step 5: Setup Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/talabahub
server {
    listen 80;
    server_name api.talabahub.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/talabahub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.talabahub.com
```

### Option 2: AWS ECS/Fargate

1. Push image to ECR
2. Create ECS cluster
3. Define task definition
4. Create ECS service
5. Setup ALB/NLB
6. Configure auto-scaling

### Option 3: Google Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/talabahub-backend

# Deploy
gcloud run deploy talabahub-backend \
  --image gcr.io/PROJECT_ID/talabahub-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Option 4: Heroku

```bash
# Login
heroku login

# Create app
heroku create talabahub-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

---

## Monitoring

### Health Checks

```bash
# Liveness (is app running?)
curl http://localhost:3000/api/health/live

# Readiness (is app ready to serve traffic?)
curl http://localhost:3000/api/health/ready

# Full health check
curl http://localhost:3000/api/health

# System metrics
curl http://localhost:3000/api/health/metrics
```

### Logs

```bash
# Docker logs
docker-compose logs -f backend

# Application logs (inside container)
docker exec -it talabahub-backend tail -f logs/combined.log
docker exec -it talabahub-backend tail -f logs/error.log

# Specific date logs
docker exec -it talabahub-backend tail -f logs/application-2025-11-15.log
```

### Performance Metrics

Logs include performance metrics every 5 minutes:

```
📊 Performance Metrics Report
🐌 Top 10 Slowest Endpoints:
  1. POST /api/discounts - Avg: 234ms | Count: 45
  2. GET /api/jobs - Avg: 156ms | Count: 123
```

### Error Tracking (Optional)

#### Sentry Integration

```bash
# Install
npm install @sentry/node

# Configure
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=production
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection string
echo $DATABASE_URL

# Test connection
docker-compose exec backend npx prisma db pull
```

#### 2. Redis Connection Failed

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

#### 3. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### 4. Build Failures

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check disk space
df -h
```

#### 5. Migration Errors

```bash
# Reset database (CAUTION: deletes all data!)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name your_migration_name

# Deploy migrations
npx prisma migrate deploy
```

### Debug Mode

```bash
# Run with debug logging
NODE_ENV=development LOG_LEVEL=debug npm run start:dev

# Docker debug
docker-compose logs -f --tail=100 backend
```

---

## Performance Optimization

### Production Checklist

- [ ] Enable Redis for caching and background jobs
- [ ] Configure database connection pooling
- [ ] Enable response compression (already enabled)
- [ ] Setup CDN for static assets
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting (already enabled)
- [ ] Setup proper logging rotation
- [ ] Configure health check endpoints
- [ ] Enable security headers (Helmet - already enabled)
- [ ] Setup SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Setup database backups
- [ ] Configure monitoring and alerts
- [ ] Setup error tracking (Sentry)
- [ ] Load test application
- [ ] Setup auto-scaling (if needed)

### Scaling

#### Horizontal Scaling

```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# With load balancer
# Configure Nginx upstream or use AWS ALB/ELB
```

#### Vertical Scaling

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U talabahub talabahub > backup.sql

# Restore
docker-compose exec -T postgres psql -U talabahub talabahub < backup.sql

# Automated backups (cron)
0 2 * * * /usr/local/bin/backup-db.sh
```

### File Backup

Files are stored in Cloudinary (already backed up).

---

## Security

### Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Keep dependencies updated
- [ ] Run security scans (Trivy)
- [ ] Use non-root user in Docker
- [ ] Enable firewall
- [ ] Regular security audits
- [ ] Input sanitization (already enabled)
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (already enabled)

---

## Support

For issues and questions:

- **GitHub Issues**: https://github.com/sarvarbekyusupov/talabahub/issues
- **Documentation**: `/docs`
- **Email**: support@talabahub.com

---

**Last Updated**: November 15, 2025
**Version**: 2.0.0
