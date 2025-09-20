# New Andalus - Production Infrastructure
# Enterprise-grade multi-environment setup

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "new-andalus-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "new-andalus-terraform-locks"
  }
}

# Configure providers
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "new-andalus"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "platform-team"
    }
  }
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# Local variables
locals {
  name_prefix = "new-andalus-${var.environment}"
  
  common_tags = {
    Project     = "new-andalus"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# VPC and Networking
module "vpc" {
  source = "./modules/networking"
  
  name_prefix         = local.name_prefix
  cidr_block         = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
  
  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "./modules/compute"
  
  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.kubernetes_version
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  node_groups = var.node_groups
  
  tags = local.common_tags
}

# RDS Database
module "database" {
  source = "./modules/storage"
  
  identifier     = "${local.name_prefix}-db"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class
  
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.database_subnet_ids
  vpc_security_group_ids = [module.security.database_security_group_id]
  
  database_name = var.database_name
  username      = var.database_username
  
  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  performance_insights_enabled = var.environment == "production"
  monitoring_interval         = var.environment == "production" ? 60 : 0
  
  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "./modules/storage"
  
  cluster_id           = "${local.name_prefix}-redis"
  engine_version       = var.redis_version
  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_nodes
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  
  security_group_ids = [module.security.redis_security_group_id]
  
  tags = local.common_tags
}

# S3 Buckets
module "storage" {
  source = "./modules/storage"
  
  bucket_prefix = local.name_prefix
  
  # Static assets bucket
  static_assets_bucket = {
    versioning_enabled = true
    lifecycle_rules    = var.s3_lifecycle_rules
  }
  
  # User uploads bucket
  uploads_bucket = {
    versioning_enabled = true
    cors_rules        = var.s3_cors_rules
  }
  
  # Backups bucket
  backups_bucket = {
    versioning_enabled = true
    glacier_transition = 30
  }
  
  tags = local.common_tags
}

# Security Groups and IAM
module "security" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  
  # EKS cluster security
  cluster_security_group_id = module.eks.cluster_security_group_id
  
  # Database access
  database_port = 5432
  redis_port    = 6379
  
  tags = local.common_tags
}

# CloudFront CDN
module "cdn" {
  source = "./modules/cdn"
  
  name_prefix = local.name_prefix
  
  # Static assets distribution
  static_assets_bucket_domain = module.storage.static_assets_bucket_domain
  
  # Application distribution
  application_domain = var.application_domain
  
  # SSL certificate
  certificate_arn = var.ssl_certificate_arn
  
  tags = local.common_tags
}

# Monitoring and Logging
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix = local.name_prefix
  
  # CloudWatch configuration
  log_retention_days = var.environment == "production" ? 365 : 30
  
  # Metrics and alarms
  enable_detailed_monitoring = var.environment == "production"
  
  # SNS topics for alerts
  alert_email = var.alert_email
  
  tags = local.common_tags
}

# Secrets Manager
resource "aws_secretsmanager_secret" "database_credentials" {
  name        = "${local.name_prefix}/database/credentials"
  description = "Database credentials for New Andalus ${var.environment}"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database_credentials.id
  secret_string = jsonencode({
    username = module.database.username
    password = module.database.password
    endpoint = module.database.endpoint
    port     = module.database.port
    dbname   = module.database.database_name
  })
}

# Application secrets
resource "aws_secretsmanager_secret" "application_secrets" {
  name        = "${local.name_prefix}/application/secrets"
  description = "Application secrets for New Andalus ${var.environment}"
  
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "application_secrets" {
  secret_id = aws_secretsmanager_secret.application_secrets.id
  secret_string = jsonencode({
    nextauth_secret = var.nextauth_secret
    csrf_secret     = var.csrf_secret
    jwt_secret      = var.jwt_secret
  })
}

# Route 53 DNS
resource "aws_route53_zone" "main" {
  count = var.create_dns_zone ? 1 : 0
  
  name = var.domain_name
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-dns-zone"
  })
}

# SSL Certificate
resource "aws_acm_certificate" "main" {
  count = var.create_ssl_certificate ? 1 : 0
  
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = local.common_tags
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "static_assets_bucket" {
  description = "S3 bucket for static assets"
  value       = module.storage.static_assets_bucket_name
}

output "cdn_domain" {
  description = "CloudFront distribution domain"
  value       = module.cdn.distribution_domain
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}