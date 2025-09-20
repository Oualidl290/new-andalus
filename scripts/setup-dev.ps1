# New Andalus Editorial Platform - Development Setup Script (Windows)
# This script sets up the complete development environment on Windows

param(
    [switch]$SkipDocker,
    [switch]$SkipTests,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Magenta = "Magenta"
    Cyan = "Cyan"
    White = "White"
}

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor $Colors.Magenta
}

# Check if command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check system requirements
function Test-Requirements {
    Write-Step "Checking system requirements..."
    
    $missingDeps = @()
    
    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = (node --version).TrimStart('v')
        $requiredVersion = "20.0.0"
        if ([version]$nodeVersion -ge [version]$requiredVersion) {
            Write-Success "Node.js $nodeVersion is installed ✓"
        }
        else {
            Write-Error "Node.js version $nodeVersion is too old. Required: $requiredVersion+"
            $missingDeps += "node"
        }
    }
    else {
        Write-Error "Node.js is not installed"
        $missingDeps += "node"
    }
    
    # Check npm
    if (Test-Command "npm") {
        $npmVersion = npm --version
        Write-Success "npm $npmVersion is installed ✓"
    }
    else {
        Write-Error "npm is not installed"
        $missingDeps += "npm"
    }
    
    # Check Git
    if (Test-Command "git") {
        $gitVersion = (git --version).Split(' ')[2]
        Write-Success "Git $gitVersion is installed ✓"
    }
    else {
        Write-Error "Git is not installed"
        $missingDeps += "git"
    }
    
    # Check Docker
    if (Test-Command "docker") {
        try {
            $dockerVersion = (docker --version).Split(' ')[2].TrimEnd(',')
            Write-Success "Docker $dockerVersion is installed ✓"
        }
        catch {
            Write-Warning "Docker is installed but not running"
        }
    }
    else {
        Write-Warning "Docker is not installed (optional but recommended)"
    }
    
    # Check Docker Compose
    if (Test-Command "docker-compose") {
        try {
            $composeVersion = (docker-compose --version).Split(' ')[2].TrimEnd(',')
            Write-Success "Docker Compose $composeVersion is installed ✓"
        }
        catch {
            Write-Warning "Docker Compose is installed but not working"
        }
    }
    elseif (Test-Command "docker") {
        try {
            docker compose version | Out-Null
            $composeVersion = (docker compose version --short)
            Write-Success "Docker Compose $composeVersion is installed ✓"
        }
        catch {
            Write-Warning "Docker Compose is not available"
        }
    }
    else {
        Write-Warning "Docker Compose is not installed (optional but recommended)"
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-Error "Missing required dependencies: $($missingDeps -join ', ')"
        Write-Info "Please install the missing dependencies and run this script again."
        Write-Info ""
        Write-Info "Installation links:"
        Write-Info "  - Node.js: https://nodejs.org/"
        Write-Info "  - Git: https://git-scm.com/"
        Write-Info "  - Docker: https://www.docker.com/products/docker-desktop"
        exit 1
    }
    
    Write-Success "All required dependencies are installed!"
}

# Install Node.js dependencies
function Install-Dependencies {
    Write-Step "Installing Node.js dependencies..."
    
    if (Test-Path "package-lock.json") {
        npm ci
    }
    else {
        npm install
    }
    
    Write-Success "Dependencies installed successfully!"
}

# Setup environment variables
function Set-Environment {
    Write-Step "Setting up environment variables..."
    
    if (-not (Test-Path ".env.local")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env.local"
            Write-Success "Created .env.local from .env.example"
            Write-Warning "Please review and update .env.local with your configuration"
        }
        else {
            Write-Error ".env.example not found"
            return
        }
    }
    else {
        Write-Info ".env.local already exists, skipping..."
    }
}

# Setup Docker services
function Set-Docker {
    if ($SkipDocker) {
        Write-Info "Skipping Docker setup as requested"
        return
    }
    
    Write-Step "Setting up Docker services..."
    
    if ((Test-Command "docker") -and ((Test-Command "docker-compose") -or (Test-Command "docker"))) {
        Write-Info "Starting Docker services..."
        
        try {
            # Try docker-compose first, then docker compose
            if (Test-Command "docker-compose") {
                docker-compose up -d postgres redis adminer
            }
            else {
                docker compose up -d postgres redis adminer
            }
            
            Write-Success "Docker services started!"
            Write-Info "Services available at:"
            Write-Info "  - PostgreSQL: localhost:5432"
            Write-Info "  - Redis: localhost:6379"
            Write-Info "  - Adminer (DB UI): http://localhost:8080"
            
            # Wait for services to be ready
            Write-Info "Waiting for services to be ready..."
            Start-Sleep -Seconds 10
        }
        catch {
            Write-Warning "Failed to start Docker services: $($_.Exception.Message)"
            Write-Info "You may need to start Docker Desktop first"
        }
    }
    else {
        Write-Warning "Docker not available, skipping Docker setup"
        Write-Info "You'll need to set up PostgreSQL and Redis manually"
    }
}

# Setup database
function Set-Database {
    Write-Step "Setting up database..."
    
    try {
        # Check if we can connect to the database
        $null = npm run db:check 2>$null
        Write-Info "Database connection successful"
        
        # Run migrations
        Write-Info "Running database migrations..."
        npm run db:push
        
        # Seed database
        Write-Info "Seeding database with sample data..."
        npm run db:seed
        
        Write-Success "Database setup completed!"
    }
    catch {
        Write-Warning "Could not connect to database"
        Write-Info "Please ensure PostgreSQL is running and connection details are correct in .env.local"
    }
}

# Run initial tests
function Invoke-Tests {
    if ($SkipTests) {
        Write-Info "Skipping tests as requested"
        return
    }
    
    Write-Step "Running initial tests..."
    
    try {
        Write-Info "Running linting..."
        npm run lint
        
        Write-Info "Running type checking..."
        npm run type-check
        
        Write-Info "Running unit tests..."
        npm run test:run
        
        Write-Success "All tests passed!"
    }
    catch {
        Write-Warning "Some tests failed, but continuing setup..."
        if ($Verbose) {
            Write-Error $_.Exception.Message
        }
    }
}

# Setup Git hooks
function Set-GitHooks {
    Write-Step "Setting up Git hooks..."
    
    if (Test-Path ".git") {
        # Install husky if available
        if (Test-Path "node_modules\.bin\husky.cmd") {
            try {
                npx husky install
                Write-Success "Git hooks installed!"
            }
            catch {
                Write-Info "Could not install Git hooks, continuing..."
            }
        }
        else {
            Write-Info "Husky not found, skipping Git hooks setup"
        }
    }
    else {
        Write-Warning "Not a Git repository, skipping Git hooks setup"
    }
}

# Create development directories
function New-Directories {
    Write-Step "Creating development directories..."
    
    $dirs = @(
        "uploads",
        "logs",
        "tmp",
        ".next\cache"
    )
    
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Info "Created directory: $dir"
        }
    }
    
    Write-Success "Development directories created!"
}

# Display final information
function Show-FinalInfo {
    Write-Host ""
    Write-Success "🎉 Development environment setup completed!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host ""
    Write-Host "1. Review and update .env.local with your configuration" -ForegroundColor $Colors.Cyan
    Write-Host "2. Start the development server:" -ForegroundColor $Colors.Cyan
    Write-Host "   npm run dev" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Host "3. Open your browser and navigate to:" -ForegroundColor $Colors.Cyan
    Write-Host "   http://localhost:3000" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Info "Available services:"
    Write-Host "  • Application: http://localhost:3000" -ForegroundColor $Colors.Green
    Write-Host "  • Database UI: http://localhost:8080" -ForegroundColor $Colors.Green
    Write-Host "  • Redis UI: http://localhost:8001" -ForegroundColor $Colors.Green
    Write-Host "  • Email Testing: http://localhost:8025" -ForegroundColor $Colors.Green
    Write-Host "  • Object Storage: http://localhost:9001" -ForegroundColor $Colors.Green
    Write-Host "  • Monitoring: http://localhost:3001" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Info "Useful commands:"
    Write-Host "  npm run dev          - Start development server" -ForegroundColor $Colors.Green
    Write-Host "  npm run build        - Build for production" -ForegroundColor $Colors.Green
    Write-Host "  npm run test         - Run tests" -ForegroundColor $Colors.Green
    Write-Host "  npm run lint         - Run linting" -ForegroundColor $Colors.Green
    Write-Host "  npm run db:studio    - Open database GUI" -ForegroundColor $Colors.Green
    Write-Host "  npm run db:reset     - Reset database" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Info "Documentation:"
    Write-Host "  • README.md          - Project overview" -ForegroundColor $Colors.Green
    Write-Host "  • CONTRIBUTING.md    - Contributing guidelines" -ForegroundColor $Colors.Green
    Write-Host "  • DEPLOYMENT.md      - Deployment guide" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Success "Happy coding! 🚀"
}

# Main setup function
function Main {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Colors.Magenta
    Write-Host "║                                                              ║" -ForegroundColor $Colors.Magenta
    Write-Host "║           🏛️  New Andalus Editorial Platform                 ║" -ForegroundColor $Colors.Magenta
    Write-Host "║              Development Environment Setup                   ║" -ForegroundColor $Colors.Magenta
    Write-Host "║                                                              ║" -ForegroundColor $Colors.Magenta
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Colors.Magenta
    Write-Host ""
    
    Write-Info "Starting development environment setup..."
    Write-Host ""
    
    try {
        # Run setup steps
        Test-Requirements
        Install-Dependencies
        Set-Environment
        New-Directories
        Set-Docker
        Set-Database
        Set-GitHooks
        Invoke-Tests
        
        # Show final information
        Show-FinalInfo
    }
    catch {
        Write-Error "Setup failed: $($_.Exception.Message)"
        if ($Verbose) {
            Write-Host $_.ScriptStackTrace -ForegroundColor $Colors.Red
        }
        exit 1
    }
}

# Check if script is run from project root
if (-not (Test-Path "package.json")) {
    Write-Error "This script must be run from the project root directory"
    Write-Info "Please navigate to the project root and run: .\scripts\setup-dev.ps1"
    exit 1
}

# Handle Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Warning "Setup interrupted by user"
}

# Run main function
Main