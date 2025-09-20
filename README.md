# New Andalus Editorial Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5)](https://kubernetes.io/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-green)](https://github.com/features/actions)

> **A modern, enterprise-grade editorial platform built for the next generation of content creators and publishers.**

New Andalus is an open-source editorial platform that combines the power of modern web technologies with enterprise-grade security, performance, and scalability. Built with Next.js 15, React 19, and TypeScript, it provides a seamless content creation and publishing experience for individuals, teams, and organizations.

## ✨ Features

### 🚀 **Modern Technology Stack**
- **Next.js 15** with App Router and React Server Components
- **React 19** for cutting-edge UI development
- **TypeScript 5.3+** for type safety and developer experience
- **Tailwind CSS** for responsive, utility-first styling
- **Radix UI** for accessible component primitives
- **Drizzle ORM** with PostgreSQL for type-safe database operations

### 📝 **Rich Content Creation**
- Advanced rich text editor powered by TipTap
- Real-time collaborative editing capabilities
- Image upload and automatic optimization
- SEO-friendly content management
- Auto-save and comprehensive version control
- Markdown support with live preview

### 🔐 **Enterprise Security**
- Comprehensive input validation and sanitization
- CSRF protection and intelligent rate limiting
- Security headers and Content Security Policy
- Real-time security monitoring and alerting
- OWASP Top 10 compliance
- Multi-factor authentication support

### 📊 **Performance & Monitoring**
- Core Web Vitals optimization (LCP < 2.5s)
- Redis caching with intelligent invalidation
- Database query optimization and monitoring
- Real-time performance tracking
- Prometheus metrics integration
- Comprehensive error tracking

### 🌐 **Production Ready**
- Docker containerization with multi-stage builds
- Kubernetes deployment manifests
- CI/CD pipeline with GitHub Actions
- Multi-environment support (dev, staging, production)
- Comprehensive testing suite (unit, integration, e2e)
- Infrastructure as Code with Terraform

### 🎨 **Developer Experience**
- Hot reload development environment
- Comprehensive TypeScript types
- ESLint and Prettier configuration
- Automated testing with Vitest and Playwright
- Detailed documentation and examples
- Docker Compose for local development

## 🚀 Quick Start

### Option 1: Docker (Recommended for Quick Setup)

```bash
# Clone the repository
git clone https://github.com/Oualidl290/new-andalus.git
cd new-andalus

# Run the setup script
./setup.sh
# or on Windows: setup.bat

# The application will be available at http://localhost:3000
```

### Option 2: Local Development

#### Prerequisites
- **Node.js 20+** or **Bun 1.0+**
- **PostgreSQL 16+**
- **Redis 7+**
- **Docker** (optional, for database services)

#### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Oualidl290/new-andalus.git
   cd new-andalus
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start database services:**
   ```bash
   # Using Docker Compose (recommended)
   npm run db:up
   # Or use your local PostgreSQL and Redis instances
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

5. **Initialize the database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Available Scripts

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run type-check   # Run TypeScript type checking
```

### Code Quality
```bash
npm run lint         # Run Biome linting
npm run lint:fix     # Fix linting issues automatically
npm run format       # Format code with Biome
npm run format:check # Check code formatting
```

### Database
```bash
npm run db:up        # Start PostgreSQL and Redis containers
npm run db:down      # Stop database containers
npm run db:reset     # Reset database (destroy and recreate)
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run db:seed      # Seed database with sample data
```

### Testing
```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate test coverage report
```

### Docker
```bash
npm run docker:build # Build production Docker image
npm run docker:run   # Run production container
```

## 🐳 Docker Development

### Quick Start with Docker
```bash
# Clone and start
git clone https://github.com/Oualidl290/new-andalus.git
cd new-andalus
./setup.sh  # or setup.bat on Windows

# The application will be available at http://localhost:3000
```

### Docker Services
When running `docker-compose up -d`, the following services are available:
- **Web Application**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **Adminer** (Database UI): `http://localhost:8080`
- **RedisInsight** (Redis UI): `http://localhost:8001`
- **MailHog** (Email Testing): `http://localhost:8025`
- **MinIO** (Object Storage): `http://localhost:9001`
- **Grafana** (Monitoring): `http://localhost:3001`
- **Kibana** (Search UI): `http://localhost:5601`

### Production Docker Build
```bash
# Build production image
docker build -t new-andalus:latest .

# Run production container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  new-andalus:latest
```
cd platform

# Start with Docker Compose
docker-compose up -d

# The application will be available at http://localhost:3000
```

### Option 2: Local Development

#### Prerequisites

- **Node.js 20+** or **Bun 1.0+**
- **PostgreSQL 16+**
- **Redis 7+**
- **Docker** (optional, for database services)

#### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/new-andalus/platform.git
   cd platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start database services:**
   ```bash
   # Using Docker Compose (recommended)
   npm run db:up
   
   # Or use your local PostgreSQL and Redis instances
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

5. **Initialize the database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Available Scripts

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run type-check   # Run TypeScript type checking
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues automatically
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Database
```bash
npm run db:up        # Start PostgreSQL and Redis containers
npm run db:down      # Stop database containers
npm run db:reset     # Reset database (destroy and recreate)
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run db:seed      # Seed database with sample data
```

### Testing
```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:ui      # Run tests with UI
npm run test:e2e     # Run end-to-end tests
npm run test:coverage # Generate test coverage report
```

### Security
```bash
npm run security:audit    # Run security audit
npm run security:scan     # Comprehensive security scan
npm audit                 # Check for vulnerabilities
```

## 📁 Project Structure

```
new-andalus/
├── 📁 src/
│   ├── 📁 app/                    # Next.js App Router pages
│   │   ├── 📁 (auth)/            # Authentication pages
│   │   ├── 📁 admin/             # Admin dashboard
│   │   ├── 📁 api/               # API routes
│   │   └── 📁 articles/          # Article pages
│   ├── 📁 components/            # React components
│   │   ├── 📁 admin/             # Admin-specific components
│   │   ├── 📁 auth/              # Authentication components
│   │   ├── 📁 editor/            # Rich text editor components
│   │   └── 📁 ui/                # Reusable UI components
│   ├── 📁 lib/                   # Utility functions and configurations
│   │   ├── 📁 auth/              # Authentication logic
│   │   ├── 📁 cache/             # Caching utilities
│   │   ├── 📁 db/                # Database configuration
│   │   ├── 📁 security/          # Security utilities
│   │   └── 📁 validation/        # Input validation schemas
│   ├── 📁 hooks/                 # Custom React hooks
│   ├── 📁 types/                 # TypeScript type definitions
│   └── 📁 test/                  # Test utilities and fixtures
├── 📁 .github/                   # GitHub Actions workflows
├── 📁 kubernetes/                # Kubernetes deployment manifests
├── 📁 terraform/                 # Infrastructure as Code
├── 📁 scripts/                   # Utility scripts
├── 📄 docker-compose.yml         # Local development environment
├── 📄 Dockerfile                 # Production container image
└── 📄 README.md                  # This file
```

## 🎯 Core Features

### ✅ **Implemented Features**

- **🏗️ Modern Architecture**: Next.js 15 with App Router and React Server Components
- **🎨 Rich UI**: Tailwind CSS with Radix UI components for accessibility
- **🔐 Authentication**: NextAuth.js with multiple providers and JWT tokens
- **📝 Content Management**: Rich text editor with TipTap and collaborative editing
- **🗄️ Database**: PostgreSQL with Drizzle ORM for type-safe operations
- **⚡ Caching**: Redis integration with intelligent cache invalidation
- **🔒 Security**: Comprehensive security measures and OWASP compliance
- **📊 Monitoring**: Performance tracking and error monitoring
- **🧪 Testing**: Unit, integration, and end-to-end testing suites
- **🚀 Deployment**: Docker, Kubernetes, and CI/CD ready

### 🔄 **In Development**

- **🤝 Real-time Collaboration**: Live collaborative editing with WebSockets
- **🔍 Advanced Search**: Full-text search with Elasticsearch integration
- **📱 Mobile App**: React Native mobile application
- **🌐 Internationalization**: Multi-language support
- **📈 Analytics**: Advanced content analytics and insights
- **🎨 Theming**: Customizable themes and white-label solutions

## 🐳 Docker Development

### Quick Start with Docker

```bash
# Clone and start
git clone https://github.com/new-andalus/platform.git
cd platform
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Services

- **Web Application**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **Adminer** (Database UI): `http://localhost:8080`

### Production Docker Build

```bash
# Build production image
docker build -t new-andalus:latest .

# Run production container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  new-andalus:latest
```

## ☸️ Kubernetes Deployment

### Local Development with Minikube

```bash
# Start Minikube
minikube start

# Apply Kubernetes manifests
kubectl apply -f kubernetes/

# Port forward to access the application
kubectl port-forward svc/web-frontend-service 3000:80
```

### Production Deployment

```bash
# Deploy to production cluster
kubectl apply -f kubernetes/namespaces/
kubectl apply -f kubernetes/secrets/
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/ingress/
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API endpoint and database integration tests
- **End-to-End Tests**: Full user journey tests with Playwright
- **Security Tests**: Security vulnerability and penetration tests

## 🔐 Security

New Andalus implements enterprise-grade security measures:

- **Input Validation**: Comprehensive validation with Zod schemas
- **Output Sanitization**: XSS prevention with DOMPurify
- **CSRF Protection**: Token-based CSRF protection
- **Rate Limiting**: Intelligent rate limiting to prevent abuse
- **Security Headers**: Comprehensive security headers including CSP
- **Authentication**: Secure authentication with NextAuth.js
- **Authorization**: Role-based access control (RBAC)
- **Monitoring**: Real-time security event monitoring

### Security Audit

```bash
# Run comprehensive security audit
npm run security:audit

# Check for known vulnerabilities
npm audit

# Run custom security tests
npm run test:security
```

## 📊 Performance

### Performance Targets

- **Lighthouse Score**: 90+ across all metrics
- **Core Web Vitals**: 
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- **Time to Interactive**: < 3s on 3G networks
- **Bundle Size**: < 250KB gzipped

### Performance Monitoring

```bash
# Run performance tests
npm run test:performance

# Analyze bundle size
npm run analyze

# Lighthouse audit
npm run audit:lighthouse
```

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run the test suite**: `npm run test`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automatic code formatting
- **Conventional Commits**: Standardized commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing framework
- **Vercel** for hosting and deployment platform
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for the utility-first CSS framework
- **Drizzle Team** for the excellent ORM
- **Open Source Community** for inspiration and contributions

## 📞 Support

- **Documentation**: [https://docs.newandalus.com](https://docs.newandalus.com)
- **Issues**: [GitHub Issues](https://github.com/new-andalus/platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/new-andalus/platform/discussions)
- **Discord**: [Join our community](https://discord.gg/newandalus)
- **Email**: [support@newandalus.com](mailto:support@newandalus.com)

## 🗺️ Roadmap

### 2024 Q1
- [ ] Real-time collaborative editing
- [ ] Advanced search with Elasticsearch
- [ ] Mobile application (React Native)
- [ ] Plugin system architecture

### 2024 Q2
- [ ] Multi-tenant support
- [ ] Advanced analytics dashboard
- [ ] Internationalization (i18n)
- [ ] White-label solutions

### 2024 Q3
- [ ] AI-powered content suggestions
- [ ] Advanced workflow management
- [ ] Enterprise SSO integration
- [ ] Advanced caching strategies

### 2024 Q4
- [ ] Microservices architecture
- [ ] GraphQL API
- [ ] Advanced monitoring and observability
- [ ] Performance optimizations

---

<div align="center">

**[⭐ Star us on GitHub](https://github.com/new-andalus/platform)** • **[🐛 Report Bug](https://github.com/new-andalus/platform/issues)** • **[💡 Request Feature](https://github.com/new-andalus/platform/issues)**

Made with ❤️ by the oualid and [contributors](https://github.com/new-andalus/platform/graphs/contributors).

</div>
