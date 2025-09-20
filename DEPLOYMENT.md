# New Andalus - Production Deployment Guide

## Overview

This document provides comprehensive instructions for deploying New Andalus Editorial Platform to production environments using enterprise-grade DevOps practices.

## Architecture Overview

### Multi-Environment Strategy

```
├── Development (Local)        # Docker Compose setup
├── Feature Branches          # Vercel Preview deployments  
├── Staging                   # Pre-production testing
├── Canary                    # Gradual rollout environment
├── Production                # Live platform
└── Disaster Recovery         # Hot standby environment
```

### Infrastructure Components

- **Kubernetes (EKS)**: Container orchestration
- **PostgreSQL (RDS)**: Primary database with Multi-AZ
- **Redis (ElastiCache)**: Caching and session storage
- **S3**: Static assets and file storage
- **CloudFront**: Global CDN
- **Route 53**: DNS management
- **Application Load Balancer**: Traffic distribution

## Prerequisites

### Required Tools

```bash
# Install required CLI tools
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
```

### AWS Configuration

```bash
# Configure AWS credentials
aws configure
aws eks update-kubeconfig --region us-east-1 --name new-andalus-production-cluster
```

## Infrastructure Deployment

### 1. Terraform Infrastructure

```bash
# Navigate to terraform directory
cd terraform/

# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan -var-file="environments/production.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/production.tfvars"
```

### 2. Kubernetes Setup

```bash
# Apply namespaces
kubectl apply -f kubernetes/namespaces/

# Apply secrets (ensure secrets are created first)
kubectl apply -f kubernetes/secrets/

# Apply configurations
kubectl apply -f kubernetes/configmaps/

# Apply deployments
kubectl apply -f kubernetes/deployments/

# Apply services
kubectl apply -f kubernetes/services/

# Apply ingress
kubectl apply -f kubernetes/ingress/
```

## Deployment Strategies

### Rolling Deployment (Default)

```bash
# Set environment variables
export ENVIRONMENT=production
export DEPLOYMENT_STRATEGY=rolling
export IMAGE_TAG=v1.2.3

# Run deployment script
./scripts/deploy-production.sh
```

### Blue-Green Deployment

```bash
# Blue-green deployment for zero downtime
export DEPLOYMENT_STRATEGY=blue-green
./scripts/deploy-production.sh
```

### Canary Deployment

```bash
# Gradual rollout with monitoring
export DEPLOYMENT_STRATEGY=canary
export CANARY_PERCENTAGE=10
./scripts/deploy-production.sh
```

## CI/CD Pipeline

### GitHub Actions Workflow

The deployment pipeline includes:

1. **Code Quality Checks**
   - Linting and formatting
   - Type checking
   - Security scanning

2. **Testing**
   - Unit tests (parallel execution)
   - Integration tests
   - End-to-end tests
   - Performance tests

3. **Security Scans**
   - CodeQL analysis
   - Dependency scanning
   - Container security
   - Secret detection

4. **Build and Push**
   - Multi-architecture Docker builds
   - Container registry push
   - SBOM generation

5. **Deployment**
   - Staging deployment
   - Canary deployment
   - Production deployment
   - Rollback on failure

### Triggering Deployments

```bash
# Automatic deployment on main branch
git push origin main

# Manual deployment via workflow dispatch
gh workflow run deploy.yml -f environment=production -f deployment_strategy=blue-green
```

## Environment Configuration

### Production Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://newandalus.com
NEXTAUTH_SECRET=<secure-secret>

# Database
DATABASE_URL=postgresql://user:pass@prod-db.amazonaws.com:5432/new_andalus

# Redis
REDIS_URL=redis://prod-redis.cache.amazonaws.com:6379

# Security
CSRF_SECRET=<secure-csrf-secret>
JWT_SECRET=<secure-jwt-secret>

# Monitoring
MONITORING_API_URL=https://monitoring.newandalus.com
MONITORING_API_KEY=<monitoring-key>

# CDN
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC
```

### Secrets Management

```bash
# Create secrets in Kubernetes
kubectl create secret generic database-secrets \
  --from-literal=connection_string="postgresql://..." \
  -n new-andalus-production

kubectl create secret generic redis-secrets \
  --from-literal=connection_string="redis://..." \
  -n new-andalus-production

kubectl create secret generic web-secrets \
  --from-literal=nextauth_secret="..." \
  --from-literal=csrf_secret="..." \
  -n new-andalus-production
```

## Monitoring and Observability

### Health Checks

```bash
# Application health
curl https://newandalus.com/api/health

# Readiness check
curl https://newandalus.com/api/ready

# Metrics endpoint
curl https://newandalus.com/api/metrics
```

### Prometheus Monitoring

```bash
# Deploy monitoring stack
kubectl apply -f kubernetes/monitoring/

# Access Grafana dashboard
kubectl port-forward -n monitoring svc/grafana 3000:80
```

### Log Aggregation

```bash
# View application logs
kubectl logs -f deployment/web-frontend -n new-andalus-production

# View logs from all pods
kubectl logs -f -l app=web-frontend -n new-andalus-production
```

## Database Management

### Migrations

```bash
# Run database migrations
kubectl exec -n new-andalus-production deployment/web-frontend -- npm run db:migrate

# Check migration status
kubectl exec -n new-andalus-production deployment/web-frontend -- npm run db:status
```

### Backups

```bash
# Manual backup
kubectl exec -n new-andalus-production deployment/web-frontend -- npm run db:backup

# Restore from backup
kubectl exec -n new-andalus-production deployment/web-frontend -- npm run db:restore
```

## Security

### SSL/TLS Configuration

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create cluster issuer
kubectl apply -f kubernetes/security/cluster-issuer.yaml
```

### Network Policies

```bash
# Apply network policies
kubectl apply -f kubernetes/security/network-policies.yaml
```

### RBAC

```bash
# Apply RBAC configurations
kubectl apply -f kubernetes/security/rbac.yaml
```

## Scaling

### Horizontal Pod Autoscaler

```bash
# Check HPA status
kubectl get hpa -n new-andalus-production

# Scale manually if needed
kubectl scale deployment web-frontend --replicas=10 -n new-andalus-production
```

### Cluster Autoscaler

```bash
# Check node scaling
kubectl get nodes

# View cluster autoscaler logs
kubectl logs -f deployment/cluster-autoscaler -n kube-system
```

## Troubleshooting

### Common Issues

#### Pod Startup Issues

```bash
# Check pod status
kubectl get pods -n new-andalus-production

# Describe problematic pod
kubectl describe pod <pod-name> -n new-andalus-production

# Check logs
kubectl logs <pod-name> -n new-andalus-production
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -n new-andalus-production deployment/web-frontend -- npm run db:check

# Check database secrets
kubectl get secret database-secrets -n new-andalus-production -o yaml
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n new-andalus-production

# Check HPA metrics
kubectl describe hpa web-frontend-hpa -n new-andalus-production
```

### Rollback Procedures

#### Automatic Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/web-frontend -n new-andalus-production

# Check rollout status
kubectl rollout status deployment/web-frontend -n new-andalus-production
```

#### Manual Rollback

```bash
# List rollout history
kubectl rollout history deployment/web-frontend -n new-andalus-production

# Rollback to specific revision
kubectl rollout undo deployment/web-frontend --to-revision=2 -n new-andalus-production
```

## Disaster Recovery

### Backup Strategy

1. **Database Backups**: Automated daily backups with 30-day retention
2. **Application State**: Configuration and secrets backup
3. **Static Assets**: S3 cross-region replication

### Recovery Procedures

```bash
# Switch to DR environment
export AWS_REGION=us-west-2
aws eks update-kubeconfig --region us-west-2 --name new-andalus-dr-cluster

# Deploy to DR environment
export ENVIRONMENT=dr
./scripts/deploy-production.sh
```

## Performance Optimization

### CDN Configuration

```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Database Optimization

```bash
# Check slow queries
kubectl exec -n new-andalus-production deployment/web-frontend -- npm run db:analyze

# Update database statistics
kubectl exec -n new-andalus-production deployment/web-frontend -- npm run db:vacuum
```

## Compliance and Security

### Security Scanning

```bash
# Run security audit
npm run security:audit

# Check for vulnerabilities
npm audit --audit-level=moderate
```

### Compliance Checks

```bash
# GDPR compliance check
npm run compliance:gdpr

# Accessibility audit
npm run audit:a11y
```

## Maintenance

### Regular Tasks

#### Weekly
- Review monitoring alerts
- Check resource utilization
- Update dependencies

#### Monthly
- Security patches
- Performance optimization
- Capacity planning

#### Quarterly
- Disaster recovery testing
- Security audit
- Architecture review

### Maintenance Windows

```bash
# Schedule maintenance
kubectl annotate deployment web-frontend \
  maintenance.newandalus.com/scheduled="2024-01-15T02:00:00Z" \
  -n new-andalus-production
```

## Support and Escalation

### Contact Information

- **Platform Team**: platform@newandalus.com
- **Security Team**: security@newandalus.com
- **On-Call**: +1-XXX-XXX-XXXX

### Escalation Matrix

1. **P0 (Critical)**: Site down, data breach
2. **P1 (High)**: Major feature broken, performance degradation
3. **P2 (Medium)**: Minor issues, non-critical bugs
4. **P3 (Low)**: Enhancement requests, documentation

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)