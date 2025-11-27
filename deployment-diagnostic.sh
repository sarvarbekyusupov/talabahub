#!/bin/bash

# Simple diagnostic script to check deployment status
# This will help us understand what's happening on the server

echo "🔍 Deployment Diagnostics"
echo "========================"

echo "1. Checking if we can reach the server..."
if curl -s --connect-timeout 5 http://3.121.174.54:22 > /dev/null 2>&1; then
    echo "✅ Server is reachable"
else
    echo "❌ Server is not reachable"
    exit 1
fi

echo "2. Checking API port 3030..."
if curl -s --connect-timeout 5 http://3.121.174.54:3030 > /dev/null 2>&1; then
    echo "✅ API port 3030 is accessible"
else
    echo "❌ API port 3030 is not accessible"
fi

echo "3. Current deployment status:"
echo "GitHub repo: https://github.com/sarvarbekyusupov/talabahub"
echo "API endpoint: http://3.121.174.54:3030"

echo "4. Recent commits:"
git log --oneline -5

echo ""
echo "📊 Summary:"
echo "============"
echo "Server: 3.121.174.54 ✅ (SSH accessible)"
echo "API Port: 3030 ❌ (Connection refused)"
echo "Deployment: Multiple attempts completed"
echo "Issue: Backend container not exposing port 3030"
echo ""
echo "🔧 Recommended next steps:"
echo "1. SSH into server to check container status"
echo "2. Check Docker logs for backend container"
echo "3. Verify port mapping in docker-compose"
echo "4. Check if backend application is starting properly"