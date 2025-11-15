#!/bin/bash

# ==========================================
# Production Server Setup for TalabaHub
# ==========================================

echo "🚀 Starting production server setup..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
rm get-docker.sh

# Install Docker Compose
echo "📦 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
echo "✅ Verifying installations..."
docker --version
docker-compose --version

# Create project directory
echo "📁 Creating project directory..."
sudo mkdir -p /var/www/talabahub-backend
sudo chown ubuntu:ubuntu /var/www/talabahub-backend
cd /var/www/talabahub-backend

# Create .env file template
echo "📝 Creating .env template..."
cat > .env << 'ENVFILE'
# Database
DATABASE_URL="postgresql://talabahub:CHANGE_PASSWORD@postgres:5432/talabahub?schema=public"
DB_USER=talabahub
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_NAME=talabahub
DB_PORT=5432

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://talabahub.com

# JWT
JWT_SECRET=CHANGE_THIS_SECRET_KEY_32_CHARS_MIN
JWT_EXPIRATION=7d
JWT_ACCESS_SECRET=CHANGE_ACCESS_SECRET
JWT_REFRESH_SECRET=CHANGE_REFRESH_SECRET

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@talabahub.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_REDIS_PASSWORD

# Payment
CLICK_MERCHANT_ID=
CLICK_SERVICE_ID=
CLICK_SECRET_KEY=
PAYME_MERCHANT_ID=
PAYME_SECRET_KEY=

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10
ENVFILE

# Create docker-compose.yml
echo "📝 Creating docker-compose.yml..."
cat > docker-compose.yml << 'COMPOSE'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: talabahub-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - talabahub-network

  redis:
    image: redis:7-alpine
    container_name: talabahub-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - talabahub-network

  backend:
    image: ${DOCKER_USERNAME}/talabahub-backend:main
    container_name: talabahub-backend
    restart: unless-stopped
    ports:
      - "3030:3000"
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
    networks:
      - talabahub-network

volumes:
  postgres_data:
  redis_data:

networks:
  talabahub-network:
    driver: bridge
COMPOSE

echo ""
echo "✅ Server setup completed!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo ""
echo "1. Edit .env file with your actual values:"
echo "   nano /var/www/talabahub-backend/.env"
echo ""
echo "2. Logout and login again for docker group:"
echo "   exit"
echo "   ssh ubuntu@YOUR_SERVER_IP"
echo ""
echo "3. Pull and start containers:"
echo "   cd /var/www/talabahub-backend"
echo "   docker-compose pull"
echo "   docker-compose up -d"
echo ""
echo "🎉 Then your backend will be running!"
