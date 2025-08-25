#!/bin/bash

echo "🚀 Deploying TimeTracker application with authentication..."

# Stop and remove existing containers
echo "📦 Stopping existing containers..."
docker compose down

# Remove old images to ensure fresh build
echo "🧹 Removing old images..."
docker compose down --rmi all

# Create data directory with proper permissions
echo "📁 Setting up data directory..."
mkdir -p ./data
chmod 777 ./data
chown -R 1000:1000 ./data 2>/dev/null || echo "⚠️  Could not change ownership (may need sudo)"

# Create initial user data file if it doesn't exist
echo "👤 Setting up initial user data..."
if [ ! -f "./data/user_admin.json" ]; then
  cat > ./data/user_admin.json << EOF
{
  "_version": 0,
  "_lastModified": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "_userId": "admin",
  "_clients": [],
  "sessions": [],
  "projects": [
    { "name": "General", "color": "#3B82F6" },
    { "name": "Development", "color": "#10B981" },
    { "name": "Meeting", "color": "#F59E0B" }
  ],
  "currentSession": null
}
EOF
  echo "✅ Initial user data created"
else
  echo "✅ User data already exists"
fi

# Build and start the application
echo "🔨 Building and starting application..."
echo "📦 Using standard build (without Turbopack) for better compatibility..."
docker compose up --build -d

# Wait for the application to be ready
echo "⏳ Waiting for application to be ready..."
sleep 15

# Check if the application is running
if docker compose ps | grep -q "Up"; then
    echo "✅ Application is running successfully!"
    echo "🌐 Access your app at: http://localhost:3003"
    echo "🔐 Login with: admin / admin123"
    echo "📊 Data is persisted in: ./data/"
    echo "🔒 Authentication is enabled"
    echo ""
    echo "📋 Container status:"
    docker compose ps
    echo ""
    echo "📝 Logs:"
    docker compose logs --tail=20
else
    echo "❌ Application failed to start. Check logs:"
    docker compose logs
    exit 1
fi
