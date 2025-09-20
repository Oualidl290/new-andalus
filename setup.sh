#!/bin/bash
# New Andalus Editorial Platform - Quick Setup Script

set -e

echo "🏛️  New Andalus Editorial Platform - Quick Setup"
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Copy environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Setting up environment variables..."
    cp .env.example .env.local
    echo "✅ Created .env.local from .env.example"
    echo "⚠️  Please review and update .env.local with your configuration"
else
    echo "ℹ️  .env.local already exists"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d postgres redis
else
    docker compose up -d postgres redis
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if Node.js is installed for local development
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    echo "✅ Node.js $NODE_VERSION is installed"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Initialize database
    echo "🗄️  Initializing database..."
    npm run db:push
    
    # Seed database
    echo "🌱 Seeding database with sample data..."
    npm run db:seed
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the development server:"
    echo "   npm run dev"
    echo ""
    echo "2. Open your browser and navigate to:"
    echo "   http://localhost:3000"
else
    echo "⚠️  Node.js not found. You can still use Docker for development:"
    echo ""
    echo "🐳 Starting full Docker development environment..."
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    else
        docker compose up -d
    fi
    
    echo ""
    echo "🎉 Docker setup completed successfully!"
    echo ""
    echo "The application will be available at:"
    echo "   http://localhost:3000"
fi

echo ""
echo "Available services:"
echo "• Application: http://localhost:3000"
echo "• Database UI (Adminer): http://localhost:8080"
echo "• Redis UI: http://localhost:8001"
echo "• Email Testing (MailHog): http://localhost:8025"
echo "• Monitoring (Grafana): http://localhost:3001"
echo ""
echo "Useful commands:"
echo "• docker-compose logs -f    - View service logs"
echo "• docker-compose down       - Stop all services"
echo "• docker-compose up -d      - Start all services"
echo ""
echo "Happy coding! 🚀"