#!/bin/bash

# New Andalus Editorial Platform - Development Setup Script
# This script sets up the complete development environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check system requirements
check_requirements() {
    log_step "Checking system requirements..."
    
    local missing_deps=()
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version | sed 's/v//')
        local required_version="20.0.0"
        if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" = "$required_version" ]; then
            log_success "Node.js $node_version is installed ✓"
        else
            log_error "Node.js version $node_version is too old. Required: $required_version+"
            missing_deps+=("node")
        fi
    else
        log_error "Node.js is not installed"
        missing_deps+=("node")
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        log_success "npm $npm_version is installed ✓"
    else
        log_error "npm is not installed"
        missing_deps+=("npm")
    fi
    
    # Check Git
    if command_exists git; then
        local git_version=$(git --version | cut -d' ' -f3)
        log_success "Git $git_version is installed ✓"
    else
        log_error "Git is not installed"
        missing_deps+=("git")
    fi
    
    # Check Docker
    if command_exists docker; then
        local docker_version=$(docker --version | cut -d' ' -f3 | sed 's/,//')
        log_success "Docker $docker_version is installed ✓"
    else
        log_warning "Docker is not installed (optional but recommended)"
    fi
    
    # Check Docker Compose
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        if command_exists docker-compose; then
            local compose_version=$(docker-compose --version | cut -d' ' -f3 | sed 's/,//')
            log_success "Docker Compose $compose_version is installed ✓"
        else
            local compose_version=$(docker compose version --short)
            log_success "Docker Compose $compose_version is installed ✓"
        fi
    else
        log_warning "Docker Compose is not installed (optional but recommended)"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and run this script again."
        exit 1
    fi
    
    log_success "All required dependencies are installed!"
}

# Install Node.js dependencies
install_dependencies() {
    log_step "Installing Node.js dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Dependencies installed successfully!"
}

# Setup environment variables
setup_environment() {
    log_step "Setting up environment variables..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            log_success "Created .env.local from .env.example"
            log_warning "Please review and update .env.local with your configuration"
        else
            log_error ".env.example not found"
            return 1
        fi
    else
        log_info ".env.local already exists, skipping..."
    fi
}

# Setup Docker services
setup_docker() {
    log_step "Setting up Docker services..."
    
    if command_exists docker && (command_exists docker-compose || docker compose version >/dev/null 2>&1); then
        log_info "Starting Docker services..."
        
        # Use docker-compose or docker compose based on availability
        if command_exists docker-compose; then
            docker-compose up -d postgres redis adminer
        else
            docker compose up -d postgres redis adminer
        fi
        
        log_success "Docker services started!"
        log_info "Services available at:"
        log_info "  - PostgreSQL: localhost:5432"
        log_info "  - Redis: localhost:6379"
        log_info "  - Adminer (DB UI): http://localhost:8080"
        
        # Wait for services to be ready
        log_info "Waiting for services to be ready..."
        sleep 10
        
    else
        log_warning "Docker not available, skipping Docker setup"
        log_info "You'll need to set up PostgreSQL and Redis manually"
        return 0
    fi
}

# Setup database
setup_database() {
    log_step "Setting up database..."
    
    # Check if we can connect to the database
    if npm run db:check >/dev/null 2>&1; then
        log_info "Database connection successful"
        
        # Run migrations
        log_info "Running database migrations..."
        npm run db:push
        
        # Seed database
        log_info "Seeding database with sample data..."
        npm run db:seed
        
        log_success "Database setup completed!"
    else
        log_warning "Could not connect to database"
        log_info "Please ensure PostgreSQL is running and connection details are correct in .env.local"
    fi
}

# Run initial tests
run_tests() {
    log_step "Running initial tests..."
    
    log_info "Running linting..."
    npm run lint
    
    log_info "Running type checking..."
    npm run type-check
    
    log_info "Running unit tests..."
    npm run test:run
    
    log_success "All tests passed!"
}

# Setup Git hooks
setup_git_hooks() {
    log_step "Setting up Git hooks..."
    
    if [ -d ".git" ]; then
        # Install husky if available
        if [ -f "node_modules/.bin/husky" ]; then
            npx husky install
            log_success "Git hooks installed!"
        else
            log_info "Husky not found, skipping Git hooks setup"
        fi
    else
        log_warning "Not a Git repository, skipping Git hooks setup"
    fi
}

# Create development directories
create_directories() {
    log_step "Creating development directories..."
    
    local dirs=(
        "uploads"
        "logs"
        "tmp"
        ".next/cache"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done
    
    log_success "Development directories created!"
}

# Display final information
show_final_info() {
    echo ""
    log_success "🎉 Development environment setup completed!"
    echo ""
    log_info "Next steps:"
    echo ""
    echo -e "${CYAN}1. Review and update .env.local with your configuration${NC}"
    echo -e "${CYAN}2. Start the development server:${NC}"
    echo -e "   ${GREEN}npm run dev${NC}"
    echo ""
    echo -e "${CYAN}3. Open your browser and navigate to:${NC}"
    echo -e "   ${GREEN}http://localhost:3000${NC}"
    echo ""
    log_info "Available services:"
    echo -e "  ${GREEN}• Application:${NC} http://localhost:3000"
    echo -e "  ${GREEN}• Database UI:${NC} http://localhost:8080"
    echo -e "  ${GREEN}• Redis UI:${NC} http://localhost:8001"
    echo -e "  ${GREEN}• Email Testing:${NC} http://localhost:8025"
    echo -e "  ${GREEN}• Object Storage:${NC} http://localhost:9001"
    echo -e "  ${GREEN}• Monitoring:${NC} http://localhost:3001"
    echo ""
    log_info "Useful commands:"
    echo -e "  ${GREEN}npm run dev${NC}          - Start development server"
    echo -e "  ${GREEN}npm run build${NC}        - Build for production"
    echo -e "  ${GREEN}npm run test${NC}         - Run tests"
    echo -e "  ${GREEN}npm run lint${NC}         - Run linting"
    echo -e "  ${GREEN}npm run db:studio${NC}    - Open database GUI"
    echo -e "  ${GREEN}npm run db:reset${NC}     - Reset database"
    echo ""
    log_info "Documentation:"
    echo -e "  ${GREEN}• README.md${NC}          - Project overview"
    echo -e "  ${GREEN}• CONTRIBUTING.md${NC}    - Contributing guidelines"
    echo -e "  ${GREEN}• DEPLOYMENT.md${NC}      - Deployment guide"
    echo ""
    log_success "Happy coding! 🚀"
}

# Main setup function
main() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                                                              ║${NC}"
    echo -e "${PURPLE}║           🏛️  New Andalus Editorial Platform                 ║${NC}"
    echo -e "${PURPLE}║              Development Environment Setup                   ║${NC}"
    echo -e "${PURPLE}║                                                              ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    log_info "Starting development environment setup..."
    echo ""
    
    # Run setup steps
    check_requirements
    install_dependencies
    setup_environment
    create_directories
    setup_docker
    setup_database
    setup_git_hooks
    run_tests
    
    # Show final information
    show_final_info
}

# Handle script interruption
cleanup() {
    echo ""
    log_warning "Setup interrupted by user"
    exit 1
}

trap cleanup SIGINT SIGTERM

# Check if script is run from project root
if [ ! -f "package.json" ]; then
    log_error "This script must be run from the project root directory"
    log_info "Please navigate to the project root and run: ./scripts/setup-dev.sh"
    exit 1
fi

# Run main function
main "$@"