#!/bin/bash

echo "🔧 Quick Database Schema Fix"
echo "=========================="

echo "This script will fix the missing database tables (jobs, audit_logs) that are causing 500 errors."
echo ""
echo "📝 Instructions:"
echo "1. SSH into the server: ssh ubuntu@3.121.174.54"
echo "2. Run these commands on the server:"
echo ""

cat << 'EOF'
# Navigate to project directory
cd ~/talabahub-backend

# Check current container status
echo "📋 Container status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "🗄️ Running Prisma db push to create missing tables..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db push --force-reset --accept-data-loss

echo ""
echo "🌱 Running database seed..."
docker compose -f docker-compose.prod.yml exec -T backend npx prisma db seed

echo ""
echo "🔄 Restarting backend..."
docker compose -f docker-compose.prod.yml restart backend

echo ""
echo "⏳ Waiting 30s for backend to start..."
sleep 30

echo ""
echo "🧪 Testing endpoints..."
echo "Health check:"
curl -sf http://localhost:3030/api/health/live && echo " ✅ Working" || echo " ❌ Failed"

echo ""
echo "Jobs endpoint test:"
curl -sf http://localhost:3030/api/jobs && echo " ✅ Jobs working" || echo " ❌ Jobs failed"

echo ""
echo "✅ Database schema fix completed!"
EOF

echo ""
echo "🎯 After running these commands, your API should be fully functional!"
echo "All missing tables (jobs, audit_logs) will be created and seeded."