#!/bin/bash

# MacroMind AI - One-Command Deploy Script

set -e

echo "🚀 Deploying MacroMind AI..."
echo ""

# Build and start with Docker Compose
docker compose up -d --build

echo ""
echo "✅ Deployment complete!"
echo "🌐 App is running at: http://localhost:8070"
echo ""
echo "View logs: docker compose logs -f"
echo "Stop: docker compose down"
