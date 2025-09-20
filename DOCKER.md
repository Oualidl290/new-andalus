# 🐳 Docker Guide

This guide covers everything you need to know about running New Andalus Editorial Platform with Docker.

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/Oualidl290/new-andalus.git
cd new-andalus
./setup.sh  # or setup.bat on Windows
```

### 2. Access the Application
- **Application**: http://localhost:3000
- **Database UI**: http://localhost:8080 (Adminer)
- **Redis UI**: http://localhost:8001 (RedisInsight)
- **Email Testing**: http://localhost:8025 (MailHog)
- **Monitoring**: http://localhost:3001 (Grafana)

## Development Environment

### Full Stack with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Reset everything (including data)
docker-compose down -v
```

### Individual Services
```bash
# Start only database services
docker-compose up -d postgres redis

# Start with specific services
docker-compose up -d postgres redis adminer mailhog
```

### Development with Hot Reload
The development setup includes:
- **Hot reload** for code changes
- **Volume mounting** for instant updates
- **Database persistence** across restarts
- **Development tools** (Adminer, MailHog, etc.)

## Production Deployment

### Build Production Image
```bash
# Build the production image
docker build -t new-andalus:latest .

# Or build with specific tag
docker build -t new-andalus:v1.0.0 .
```

### Run Production Container
```bash
docker run -d \
  --name new-andalus-app \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e REDIS_URL="redis://host:6379" \
  -e NEXTAUTH_SECRET="your-production-secret" \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  new-andalus:latest
```

### Docker Compose for Production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: new-andalus:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    restart: unless-stopped
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Environment Variables

### Required Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Redis
REDIS_URL="redis://:password@host:6379"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"  # or your domain
```

### Optional Variables
```bash
# Security
CSRF_SECRET="your-csrf-secret"

# Email (for production)
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@example.com"
EMAIL_SERVER_PASSWORD="your-password"

# File uploads
UPLOAD_MAX_SIZE="10485760"  # 10MB
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif,image/webp"

# Feature flags
ENABLE_REGISTRATION="true"
ENABLE_EMAIL_VERIFICATION="false"
```

## Health Checks

The application includes comprehensive health checks:

### Health Endpoint
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    },
    "redis": {
      "status": "healthy",
      "responseTime": 12
    },
    "memory": {
      "status": "healthy",
      "usage": 134217728,
      "limit": 1073741824
    },
    "disk": {
      "status": "healthy",
      "usage": 0.5
    }
  },
  "uptime": 3600
}
```

### Docker Health Checks
All containers include health checks:
```bash
# Check container health
docker ps

# View health check logs
docker inspect --format='{{json .State.Health}}' container_name
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using port 3000
netstat -tulpn | grep :3000

# Use different ports
docker-compose up -d -p 3001:3000
```

#### Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U postgres -d new_andalus_dev -c "SELECT 1;"
```

#### Redis Connection Issues
```bash
# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

#### Container Won't Start
```bash
# Check container logs
docker-compose logs app

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart app
```

### Performance Issues

#### Slow Database Queries
```bash
# Monitor database performance
docker-compose exec postgres psql -U postgres -d new_andalus_dev -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"
```

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Limit container memory
docker run --memory="1g" new-andalus:latest
```

### Development Tips

#### Debugging
```bash
# Access container shell
docker-compose exec app sh

# View application logs
docker-compose logs -f app

# Run commands in container
docker-compose exec app npm run db:studio
```

#### Database Management
```bash
# Access database directly
docker-compose exec postgres psql -U postgres -d new_andalus_dev

# Backup database
docker-compose exec postgres pg_dump -U postgres new_andalus_dev > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d new_andalus_dev < backup.sql
```

#### Reset Development Environment
```bash
# Complete reset (removes all data)
docker-compose down -v
docker-compose up -d
npm run db:push
npm run db:seed
```

## Security Considerations

### Production Security
- Use strong, unique passwords for all services
- Enable SSL/TLS for all connections
- Regularly update base images
- Use secrets management for sensitive data
- Enable container security scanning

### Network Security
```bash
# Create custom network
docker network create new-andalus-network

# Run containers in custom network
docker-compose --network new-andalus-network up -d
```

### Image Security
```bash
# Scan image for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image new-andalus:latest
```

## Monitoring and Logging

### Application Metrics
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

### Log Aggregation
- **Kibana**: http://localhost:5601
- **Elasticsearch**: http://localhost:9200

### Custom Monitoring
```bash
# Export metrics
curl http://localhost:3000/api/metrics

# View application logs
docker-compose logs -f app | grep ERROR
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres new_andalus_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U postgres new_andalus_dev > "$BACKUP_DIR/backup_$DATE.sql"
```

### Volume Backup
```bash
# Backup volumes
docker run --rm -v new-andalus_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# Restore volumes
docker run --rm -v new-andalus_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

## Support

For issues and questions:
- **GitHub Issues**: https://github.com/Oualidl290/new-andalus/issues
- **Documentation**: https://github.com/Oualidl290/new-andalus/wiki
- **Email**: oualidlahcen290@gmail.com