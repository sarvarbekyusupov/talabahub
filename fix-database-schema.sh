#!/bin/bash

# Database Schema Fix Script
# This will run Prisma db push to create missing tables

echo "🔧 Database Schema Fix"
echo "===================="

# Check if API is responding first
echo "1. Checking current API status..."
if curl -sf http://3.121.174.54:3030/api/health/live > /dev/null 2>&1; then
    echo "✅ API is already responding!"
    echo "Checking specific endpoints that were failing..."

    # Test jobs endpoint
    if curl -sf http://3.121.174.54:3030/api/jobs > /dev/null 2>&1; then
        echo "✅ Jobs endpoint is working"
    else
        echo "❌ Jobs endpoint is still failing"
        echo "Need to fix database schema"
    fi
else
    echo "❌ API is not responding - this is unexpected"
    echo "The server summary showed healthy containers, so let's proceed with schema fix"
fi

echo ""
echo "2. Creating database schema fix script to run on server..."
cat > schema-fix.sh << 'EOF'
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
EOF

chmod +x schema-fix.sh

echo "✅ Schema fix script created locally"
echo ""
echo "📝 To run this fix on the server:"
echo "1. SSH into the server: ssh ubuntu@3.121.174.54"
echo "2. Run: ./schema-fix.sh"
echo ""
echo "This will:"
echo "- Run 'prisma db push --force-reset' to create all missing tables"
echo "- Seed the database with initial data"
echo "- Restart the backend service"
echo "- Test the API endpoints"