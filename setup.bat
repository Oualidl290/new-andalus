@echo off
echo 🏛️  New Andalus Editorial Platform - Quick Setup
echo ================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first:
    echo    https://docs.docker.com/get-docker/
    exit /b 1
)

echo ✅ Docker is installed
echo.

REM Copy environment file if it doesn't exist
if not exist ".env.local" (
    echo 📝 Setting up environment variables...
    copy .env.example .env.local
    echo ✅ Created .env.local from .env.example
    echo ⚠️  Please review and update .env.local with your configuration
) else (
    echo ℹ️  .env.local already exists
)

REM Start Docker services
echo 🐳 Starting Docker services...
docker-compose up -d postgres redis

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js is installed
    
    REM Install dependencies if node_modules doesn't exist
    if not exist "node_modules" (
        echo 📦 Installing dependencies...
        npm install
    )
    
    REM Initialize database
    echo 🗄️  Initializing database...
    npm run db:push
    
    REM Seed database
    echo 🌱 Seeding database with sample data...
    npm run db:seed
    
    echo.
    echo 🎉 Setup completed successfully!
    echo.
    echo Next steps:
    echo 1. Start the development server:
    echo    npm run dev
    echo.
    echo 2. Open your browser and navigate to:
    echo    http://localhost:3000
) else (
    echo ⚠️  Node.js not found. Using Docker for development:
    echo.
    echo 🐳 Starting full Docker development environment...
    docker-compose up -d
    
    echo.
    echo 🎉 Docker setup completed successfully!
    echo.
    echo The application will be available at:
    echo    http://localhost:3000
)

echo.
echo Available services:
echo • Application: http://localhost:3000
echo • Database UI (Adminer): http://localhost:8080
echo • Redis UI: http://localhost:8001
echo • Email Testing (MailHog): http://localhost:8025
echo • Monitoring (Grafana): http://localhost:3001
echo.
echo Useful commands:
echo • docker-compose logs -f    - View service logs
echo • docker-compose down       - Stop all services
echo • docker-compose up -d      - Start all services
echo.
echo Happy coding! 🚀
pause