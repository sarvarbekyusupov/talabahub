#!/bin/bash

echo "🔧 Running Database Schema Fix on Production Server"
echo "=================================================="

cd ~/talabahub-backend

echo "📋 Current container status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🗄️ Running Prisma db push to create missing tables..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --force-reset --accept-data-loss

echo ""
echo "🌱 Running database seed..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db seed

echo ""
echo "🔄 Restarting backend to pick up schema changes..."
docker compose -f docker-compose.prod.yml restart backend

echo ""
echo "⏳ Waiting 30s for backend to start..."
sleep 30

echo ""
echo "🏥 Testing API endpoints..."
echo "Health check:"
curl -sf http://localhost:3030/api/health/live && echo " ✅ SUCCESS" || echo " ❌ FAILED"

echo ""
echo "Jobs endpoint test:"
curl -sf http://localhost:3030/api/jobs && echo " ✅ Jobs endpoint working" || echo " ❌ Jobs endpoint still failing"

echo ""
echo "✅ Database schema fix completed!"
