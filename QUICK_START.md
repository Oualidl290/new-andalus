# 🚀 Quick Start Guide

## Docker is Ready and Accessible! ✅

Your New Andalus Editorial Platform is now fully containerized and ready for development.

## 🐳 Current Running Services

After running `docker compose up -d`, you have access to:

### Core Services
- **📊 Database UI (Adminer)**: http://localhost:8080
  - Server: `postgres`
  - Username: `postgres`
  - Password: `postgres`
  - Database: `new_andalus_dev`

- **📧 Email Testing (MailHog)**: http://localhost:8025
  - SMTP Server: `localhost:1025`
  - Web Interface: `localhost:8025`

### Database & Cache
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379` (password: `redis_password`)

## 🎯 Quick Commands

### Start Essential Services
```bash
docker compose up -d postgres redis adminer mailhog
```

### Start Full Development Stack
```bash
docker compose up -d
```

### Check Service Status
```bash
docker compose ps
```

### View Logs
```bash
docker compose logs -f
```

### Stop All Services
```bash
docker compose down
```

### Reset Everything (including data)
```bash
docker compose down -v
```

## 🧪 Test Database Connection

```bash
# Test PostgreSQL
docker compose exec postgres psql -U postgres -d new_andalus_dev -c "SELECT 1;"

# Test Redis
docker compose exec redis redis-cli -a redis_password ping
```

## 🔧 Development Workflow

1. **Start services**: `docker compose up -d`
2. **Install dependencies**: `npm install`
3. **Setup database**: `npm run db:push && npm run db:seed`
4. **Start development**: `npm run dev`
5. **Access app**: http://localhost:3000

## 📱 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Application | http://localhost:3000 | Main app |
| Database UI | http://localhost:8080 | Database management |
| Email Testing | http://localhost:8025 | Email debugging |
| Redis UI | http://localhost:8001 | Redis management |
| Monitoring | http://localhost:3001 | Grafana dashboards |

## ✅ Verification Checklist

- [x] Docker is installed and running
- [x] PostgreSQL container is healthy
- [x] Redis container is healthy
- [x] Database connection works
- [x] Redis connection works
- [x] Adminer is accessible
- [x] MailHog is accessible

## 🎉 You're Ready!

Your Docker environment is fully accessible and ready for development. The platform can now be easily shared with other developers who just need to run:

```bash
git clone https://github.com/Oualidl290/new-andalus.git
cd new-andalus
./setup.sh  # or setup.bat on Windows
```

Happy coding! 🚀