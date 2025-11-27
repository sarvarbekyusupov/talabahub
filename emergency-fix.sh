#!/bin/bash

# EMERGENCY PRODUCTION DATABASE FIX
# This script resolves the immediate migration conflict

echo "🚨 EMERGENCY PRODUCTION DATABASE FIX"
echo "======================================"

# Connect to production server and fix the database
ssh -i ~/.ssh/id_rsa ubuntu@3.121.174.54 << 'REMOTE_SCRIPT'

cd ~/talabahub-backend

echo "🔧 Fixing database migration conflicts..."

# Wait for database to be ready
until docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U talabahub > /dev/null 2>&1; do
  echo "Database not ready, waiting 5s..."
  sleep 5
done
echo "✅ Database is ready"

# Clean up failed migration state
echo "🧹 Cleaning up stuck migration entries..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U talabahub -d talabahub <<'SQL' || echo "Migration cleanup completed"
DELETE FROM _prisma_migrations WHERE migration_name IN ('20251127040221_add_blog_verification_resume_features', 'add_audit_log');
SQL

# Use db push instead of migrate deploy to avoid conflicts
echo "📦 Pushing schema changes (production safe)..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --accept-data-loss

echo "✅ Schema sync completed"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma generate

# Restart backend container
echo "🔄 Restarting backend container..."
docker compose -f docker-compose.prod.yml restart backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 30

# Health check
echo "🏥 Performing health check..."
for i in 1 2 3 4 5; do
  if curl -sf http://localhost:3030/api/health/live > /dev/null; then
    echo "✅ Emergency fix successful! Backend is healthy."
    break
  fi
  echo "Attempt $i/5 failed, retrying in 10s..."
  sleep 10
done

echo "📋 Final container status:"
docker compose -f docker-compose.prod.yml ps

echo "📝 Recent backend logs:"
docker compose -f docker-compose.prod.yml logs --tail=20 backend

REMOTE_SCRIPT

echo "🎯 Emergency fix completed!"