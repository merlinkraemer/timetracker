#!/bin/bash

echo "🚀 Deploying TimeTracker application (Local-First Version)..."

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

# Create initial data file if it doesn't exist
echo "📊 Setting up initial data..."
if [ ! -f "./data/timetracker.json" ]; then
  cat > ./data/timetracker.json << EOF
{
  "sessions": [],
  "projects": []
}
EOF
  echo "✅ Initial data created"
else
  echo "✅ Data file already exists"
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
    echo "📊 Data is persisted in: ./data/"
    echo "💾 Local-first storage with localStorage and file backup"
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
