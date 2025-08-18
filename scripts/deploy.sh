#!/bin/bash

# BRIXEL7 Production Deployment Script

echo "🚀 Starting BRIXEL7 production deployment..."

# Exit on any error
set -e

# Check if NODE_ENV is set to production
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  NODE_ENV is not set to production. Setting it now..."
    export NODE_ENV=production
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found! Please create it from .env.production template"
    echo "cp .env.production .env"
    echo "Then edit .env with your production values"
    exit 1
fi

# Check critical environment variables
echo "🔍 Checking environment variables..."
if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET not set in .env file"
    exit 1
fi

if [ -z "$BASE_URL" ]; then
    echo "❌ BASE_URL not set in .env file"
    exit 1
fi

echo "✅ Environment variables check passed"

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# Install dev dependencies temporarily for build
echo "📦 Installing dev dependencies for build..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Remove dev dependencies
echo "🧹 Removing dev dependencies..."
npm prune --production

# Apply database migrations
echo "🗄️ Applying database migrations..."
npm run db:push

# Create logs directory
echo "📝 Creating logs directory..."
mkdir -p logs

# Stop existing PM2 process if running
echo "🛑 Stopping existing application..."
pm2 stop brixel7-app 2>/dev/null || true

# Start application with PM2
echo "▶️ Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo "📊 Application status:"
pm2 status

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Application is running on:"
echo "- Local: http://localhost:5000"
echo "- Production: $BASE_URL"
echo ""
echo "Monitor with: pm2 monit"
echo "View logs with: pm2 logs brixel7-app"
echo "Restart with: pm2 restart brixel7-app"