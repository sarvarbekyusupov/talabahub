# Docker Quick Start Guide

Quick reference for running TalabaHub backend with Docker.

## Quick Start

### Development

```bash
# Start development stack (PostgreSQL + Redis + UI tools)
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
npx prisma migrate dev

# Start backend locally
npm run start:dev

# Access services:
# - Backend: http://localhost:3000/api
# - Adminer (DB UI): http://localhost:8080
# - Redis Commander: http://localhost:8081
```

### Production

```bash
# Setup environment
cp .env.example .env
# Edit .env with production values

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# View logs
docker-compose logs -f backend

# Access:
# - Backend: http://localhost:3000/api
# - Health: http://localhost:3000/api/health
```

---

## Docker Compose Files

### `docker-compose.dev.yml` - Development

Services:
- **postgres** - PostgreSQL 16 (port 5432)
- **redis** - Redis 7 (port 6379)
- **adminer** - Database UI (port 8080)
- **redis-commander** - Redis UI (port 8081)

### `docker-compose.yml` - Production

Services:
- **postgres** - PostgreSQL with health checks
- **redis** - Redis with password
- **backend** - NestJS application
- **nginx** - Reverse proxy (optional, with profile)

---

## Common Commands

### Start Services

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose up -d

# Specific service
docker-compose up -d postgres redis

# With rebuild
docker-compose up -d --build

# Scale backend
docker-compose up -d --scale backend=3
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since 2h backend
```

### Execute Commands

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Generate Prisma client
docker-compose exec backend npx prisma generate

# Access database
docker-compose exec postgres psql -U talabahub -d talabahub

# Access Redis
docker-compose exec redis redis-cli

# Shell into backend
docker-compose exec backend sh
```

### Stop Services

```bash
# Stop all
docker-compose down

# Stop and remove volumes (CAUTION: deletes data!)
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

### Cleanup

```bash
# Remove stopped containers
docker-compose rm -f

# Remove all unused images
docker image prune -a

# Remove all unused volumes
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

---

## Building Images

### Development Build

```bash
# Build image
docker build -t talabahub-backend:dev .

# Run image
docker run -d \
  --name talabahub-backend \
  -p 3000:3000 \
  --env-file .env \
  talabahub-backend:dev
```

### Production Build

```bash
# Multi-stage build (optimized)
docker build --target production -t talabahub-backend:latest .

# Multi-platform build
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t talabahub-backend:latest \
  --push .
```

---

## Health Checks

```bash
# Check service health
docker-compose ps

# Backend health
curl http://localhost:3000/api/health

# Database health
docker-compose exec postgres pg_isready -U talabahub

# Redis health
docker-compose exec redis redis-cli ping
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Permission Denied

```bash
# Fix permissions
sudo chown -R $USER:$USER .

# Or run with sudo
sudo docker-compose up -d
```

### Out of Disk Space

```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

### Container Keeps Restarting

```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Database not ready (wait or check DATABASE_URL)
# - Missing environment variables (check .env)
# - Port conflict (change PORT)
```

---

## Environment Variables

Required variables in `.env`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@postgres:5432/talabahub"

# JWT
JWT_ACCESS_SECRET=secret_key
JWT_REFRESH_SECRET=refresh_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=name
CLOUDINARY_API_KEY=key
CLOUDINARY_API_SECRET=secret

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=email@gmail.com
MAIL_PASSWORD=app_password
MAIL_FROM=noreply@talabahub.com

# Optional: Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=password
```

---

## Volumes

### Development Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect talabahub_postgres_dev_data

# Backup volume
docker run --rm -v talabahub_postgres_dev_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore volume
docker run --rm -v talabahub_postgres_dev_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

---

## Docker Best Practices

### Image Optimization

- ✅ Multi-stage builds (reduces image size by ~70%)
- ✅ Alpine base images (smaller footprint)
- ✅ Layer caching (faster builds)
- ✅ .dockerignore (excludes unnecessary files)
- ✅ Non-root user (security)
- ✅ Health checks (reliability)

### Security

- ✅ Don't expose sensitive ports
- ✅ Use secrets management
- ✅ Scan images for vulnerabilities
- ✅ Keep images updated
- ✅ Use specific image tags (not `:latest`)

### Performance

- ✅ Connection pooling
- ✅ Resource limits
- ✅ Logging configuration
- ✅ Volume mounts for logs

---

## Production Deployment

### 1. Build and Push to Registry

```bash
# Docker Hub
docker login
docker build -t username/talabahub-backend:v1.0.0 .
docker push username/talabahub-backend:v1.0.0

# AWS ECR
aws ecr get-login-password | docker login --username AWS --password-stdin
docker build -t talabahub-backend .
docker tag talabahub-backend:latest account.dkr.ecr.region.amazonaws.com/talabahub:latest
docker push account.dkr.ecr.region.amazonaws.com/talabahub:latest
```

### 2. Deploy to Server

```bash
# SSH to server
ssh user@server.com

# Pull and run
cd /var/www/talabahub-backend
docker-compose pull
docker-compose up -d
```

---

## Monitoring

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats talabahub-backend
```

### Logs

```bash
# Application logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres

# All services
docker-compose logs -f
```

---

**For full deployment guide, see**: [DEPLOYMENT.md](./DEPLOYMENT.md)
