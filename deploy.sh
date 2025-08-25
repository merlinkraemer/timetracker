#!/bin/bash

# Simple Time Tracker - Deployment Script
# This script builds and deploys the application using Docker Compose

set -e  # Exit on any error

echo "Deploying Simple Time Tracker application..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker compose > /dev/null 2>&1; then
    echo "Error: docker compose is not available. Please install Docker Compose and try again."
    exit 1
fi

# Stop and remove existing containers
echo "Stopping existing containers..."
docker compose down

# Remove old images to ensure fresh build
echo "Removing old images..."
docker compose down --rmi all

# Create data directory with proper permissions
echo "Setting up data directory..."
mkdir -p ./data
chmod 777 ./data
chown -R 1000:1000 ./data 2>/dev/null || echo "Could not change ownership (may need sudo)"

# Create initial data file if it doesn't exist
echo "Setting up initial data..."
if [ ! -f "./data/timetracker.json" ]; then
  cat > ./data/timetracker.json << EOF
{
  "sessions": [],
  "projects": []
}
EOF
  echo "Initial data created"
else
  echo "Data file already exists"
fi

# Build and start the application
echo "Building and starting application..."
docker compose up --build -d

# Wait for the application to be ready
echo "Waiting for application to be ready..."
sleep 15

# Check if the application is running
if docker compose ps | grep -q "Up"; then
    echo "Application is running successfully!"
    echo "Access your app at: http://localhost:3003"
    echo "Data is persisted in: ./data/"
    echo "Local-first storage with localStorage and file backup"
    echo ""
    echo "Container status:"
    docker compose ps
    echo ""
    echo "Recent logs:"
    docker compose logs --tail=20
    echo ""
    echo "To view logs: docker compose logs -f"
    echo "To stop: docker compose down"
else
    echo "Application failed to start. Check logs:"
    docker compose logs
    exit 1
fi
