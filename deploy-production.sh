#!/bin/bash

# Production deployment script with database migration handling

echo "🚀 Starting Production Deployment"

# Create directory in home folder (ubuntu user has permission)
mkdir -p ~/talabahub-backend
cd ~/talabahub-backend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating default .env file..."
  cat > .env << 'ENVEOF'
# Database
DB_USER=talabahub
DB_PASSWORD=talabahub_secure_password_change_me
DB_NAME=talabahub
DB_PORT=5433

# Redis
REDIS_PASSWORD=redis_secure_password_change_me
REDIS_PORT=6380

# JWT Secrets (CHANGE THESE!)
JWT_ACCESS_SECRET=change_this_to_random_secret_key_min_32_chars
JWT_REFRESH_SECRET=change_this_to_another_random_secret_key_min_32_chars

# Email (Configure your email provider)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@talabahub.com

# Cloudinary (Optional - for file uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Rate limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10
ENVEOF
  echo "⚠️  .env file created with default values. Please update with real credentials!"
fi

# Create logs directory with proper permissions
mkdir -p logs
# Set permissions so the container's nestjs user (uid 1001) can write
chmod 777 logs

# Stop and remove only our containers (won't affect other projects)
echo "🧹 Cleaning up old containers..."
docker stop talabahub-backend talabahub-postgres talabahub-redis 2>/dev/null || true
docker rm talabahub-backend talabahub-postgres talabahub-redis 2>/dev/null || true
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Create docker-compose.prod.yml with migration-safe approach
cat > docker-compose.prod.yml << 'EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: talabahub-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-talabahub}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-talabahub_password}
      POSTGRES_DB: ${DB_NAME:-talabahub}
    ports:
      - '${DB_PORT:-5432}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER:-talabahub}']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - talabahub-network

  redis:
    image: redis:7-alpine
    container_name: talabahub-redis
    restart: unless-stopped
    ports:
      - '${REDIS_PORT:-6379}:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis_password}
    healthcheck:
      test: ['CMD', 'redis-cli', '--raw', 'incr', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - talabahub-network

  backend:
    image: ***/talabahub-backend:main
    container_name: talabahub-backend
    restart: unless-stopped
    ports:
      - '3030:3000'
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://${DB_USER:-talabahub}:${DB_PASSWORD:-talabahub_password}@postgres:5432/${DB_NAME:-talabahub}?schema=public&connection_limit=10&pool_timeout=20
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD:-redis_password}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
      MAIL_HOST: ${MAIL_HOST}
      MAIL_PORT: ${MAIL_PORT}
      MAIL_USER: ${MAIL_USER}
      MAIL_PASSWORD: ${MAIL_PASSWORD}
      MAIL_FROM: ${MAIL_FROM}
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost:5173}
      THROTTLE_TTL: ${THROTTLE_TTL:-60000}
      THROTTLE_LIMIT: ${THROTTLE_LIMIT:-10}
      # Skip migrations in production, handle manually
      PRISMA_SKIP_MIGRATIONS: true
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    command: >
      sh -c "
        echo '🔍 Synchronizing database with existing production schema...' &&
        psql \$$DATABASE_URL\$$ < /app/prisma/migrations/production-sync.sql &&
        echo '🎯 Database schema synchronized successfully' &&
        npm run build &&
        node dist/main
      "
    healthcheck:
      test: ['CMD-SHELL', 'wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - talabahub-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  talabahub-network:
    driver: bridge
EOF

echo "📦 Pulling latest images..."
docker compose -f docker-compose.prod.yml pull

echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting 30s for startup..."
sleep 30

echo "📋 Container status:"
docker compose -f docker-compose.prod.yml ps

# Ensure test users exist
echo "🔍 Ensuring test users exist..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U talabahub -d talabahub <<'SQLEOF'
-- Admin user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, verification_status, is_active, is_email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@talabahub.com',
  '$2b$10$NUUPJm/D1bNZ.IIBp4WN1.dBQ72x3KeWzAeGPIwKYZH.RVuQON1be',
  'Admin',
  'User',
  'admin',
  'verified',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  is_email_verified = EXCLUDED.is_email_verified,
  updated_at = NOW();

-- Student user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, verification_status, is_active, is_email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'student@talabahub.com',
  '$2b$10$NUUPJm/D1bNZ.IIBp4WN1.dBQ72x3KeWzAeGPIwKYZH.RVuQON1be',
  'Test',
  'Student',
  'student',
  'verified',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  is_email_verified = EXCLUDED.is_email_verified,
  updated_at = NOW();

-- Partner user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, verification_status, is_active, is_email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'partner@talabahub.com',
  '$2b$10$NUUPJm/D1bNZ.IIBp4WN1.dBQ72x3KeWzAeGPIwKYZH.RVuQON1be',
  'Test',
  'Partner',
  'partner',
  'verified',
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  is_email_verified = EXCLUDED.is_email_verified,
  updated_at = NOW();
SQLEOF

echo "✅ Test users created/updated (admin, student, partner)"

echo "🏥 Health check..."
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3030/api/health/live > /dev/null; then
    echo "✅ Deployment successful!"
    docker image prune -f
    exit 0
  fi
  echo "Attempt $i/5 failed, retrying in 5s..."
  sleep 5
done

echo "❌ Health check failed!"
docker compose -f docker-compose.prod.yml logs --tail=100 backend
exit 1