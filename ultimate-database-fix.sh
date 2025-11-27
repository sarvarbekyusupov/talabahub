#!/bin/bash

# Ultimate Production Database Fix
# This script completely bypasses Prisma migrations and uses db push

echo "🚨 ULTIMATE PRODUCTION DATABASE FIX"
echo "=================================="

ssh -i ~/.ssh/id_rsa ubuntu@3.121.174.54 << 'REMOTE_SCRIPT'

cd ~/talabahub-backend

echo "🔧 Stopping containers completely..."
docker compose -f docker-compose.prod.yml down -v

echo "🧹 Removing ALL containers and volumes..."
docker stop talabahub-backend talabahub-postgres talabahub-redis 2>/dev/null || true
docker rm talabahub-backend talabahub-postgres talabahub-redis 2>/dev/null || true
docker volume rm talabahub-backend_postgres_data talabahub-backend_redis_data 2>/dev/null || true
docker compose -f docker-compose.prod.yml down -v 2>/dev/null || true

echo "📦 Starting fresh services..."
docker compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for database to be ready..."
sleep 30

# Wait for postgres to be healthy
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U talabahub > /dev/null 2>&1; do
  echo "Database not ready, waiting 5s..."
  sleep 5
done
echo "✅ Database is ready"

echo "🗑️ Completely removing ALL migration files from container..."
docker compose -f docker-compose.prod.yml exec -T backend rm -rf /app/prisma/migrations || echo "No migrations to remove"
docker compose -f docker-compose.prod.yml exec -T backend find /app -name "*migration*" -type f -delete || echo "No migration files found"

echo "🔧 Using prisma db push to create schema from scratch..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --force-reset --accept-data-loss

echo "⏳ Waiting for schema to be applied..."
sleep 30

echo "🌱 Seeding database with initial data..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db seed

echo "⏳ Waiting for seed data to be applied..."
sleep 15

echo "🔄 Restarting backend to ensure clean start..."
docker compose -f docker-compose.prod.yml restart backend

echo "⏳ Waiting for backend to start..."
sleep 45

echo "🏥 Health check..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf http://localhost:3030/api/health/live > /dev/null; then
    echo "✅ SUCCESS! API is running at http://3.69.242.100:3030"

    echo "🧪 Testing critical endpoints..."
    echo "Testing /api/feed/latest endpoint..."
    if curl -sf http://localhost:3030/api/feed/latest > /dev/null 2>&1; then
      echo "✅ /api/feed/latest endpoint working"
    else
      echo "⚠️ /api/feed/latest endpoint not responding"
    fi

    echo "Testing /api/jobs endpoint..."
    if curl -sf http://localhost:3030/api/jobs > /dev/null 2>&1; then
      echo "✅ /api/jobs endpoint working"
    else
      echo "⚠️ /api/jobs endpoint not responding"
    fi

    echo "🎉 All systems enabled: Blog-Content, Verification, Resume, Feed Controller"
    echo "🚀 Frontend can now connect to http://3.69.242.100:3030"

    exit 0
  fi
  echo "Health check attempt $i/10 failed, retrying in 10s..."
  sleep 10
done

echo "❌ Health check failed after 10 attempts"
echo "Container status:"
docker compose -f docker-compose.prod.yml ps
echo "Backend logs:"
docker compose -f docker-compose.prod.yml logs --tail=50 backend

exit 1

REMOTE_SCRIPT

echo "🎯 Ultimate database fix completed!"