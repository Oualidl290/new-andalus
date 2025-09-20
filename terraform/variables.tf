# New Andalus - Terraform Variables
# Environment-specific configuration

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production", "dr"], var.environment)
    error_message = "Environment must be one of: dev, staging, production, dr."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Kubernetes
variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    min_size      = number
    max_size      = number
    desired_size  = number
    disk_size     = number
    labels        = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
      min_size      = 1
      max_size      = 10
      desired_size  = 3
      disk_size     = 50
      labels = {
        role = "general"
      }
      taints = []
    }
    spot = {
      instance_types = ["t3.medium", "t3a.medium", "t2.medium"]
      capacity_type  = "SPOT"
      min_size      = 0
      max_size      = 20
      desired_size  = 2
      disk_size     = 50
      labels = {
        role = "spot"
      }
      taints = [{
        key    = "spot-instance"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

# Database
variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16.1"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "new_andalus"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

# Redis
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7.0"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of Redis nodes"
  type        = number
  default     = 1
}

# S3 Configuration
variable "s3_lifecycle_rules" {
  description = "S3 lifecycle rules"
  type = list(object({
    id     = string
    status = string
    transitions = list(object({
      days          = number
      storage_class = string
    }))
  }))
  default = [
    {
      id     = "transition_to_ia"
      status = "Enabled"
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
    }
  ]
}

variable "s3_cors_rules" {
  description = "S3 CORS rules for uploads bucket"
  type = list(object({
    allowed_headers = list(string)
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = list(string)
    max_age_seconds = number
  }))
  default = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
      allowed_origins = ["https://*.newandalus.com"]
      expose_headers  = ["ETag"]
      max_age_seconds = 3000
    }
  ]
}

# Domain and SSL
variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "newandalus.com"
}

variable "application_domain" {
  description = "Application domain name"
  type        = string
  default     = "app.newandalus.com"
}

variable "create_dns_zone" {
  description = "Whether to create Route 53 hosted zone"
  type        = bool
  default     = false
}

variable "create_ssl_certificate" {
  description = "Whether to create ACM SSL certificate"
  type        = bool
  default     = false
}

variable "ssl_certificate_arn" {
  description = "Existing SSL certificate ARN"
  type        = string
  default     = ""
}

# Monitoring
variable "alert_email" {
  description = "Email for alerts"
  type        = string
  default     = "alerts@newandalus.com"
}

# Application Secrets
variable "nextauth_secret" {
  description = "NextAuth secret key"
  type        = string
  sensitive   = true
}

variable "csrf_secret" {
  description = "CSRF secret key"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

# Feature Flags
variable "enable_backup_encryption" {
  description = "Enable encryption for backups"
  type        = bool
  default     = true
}

variable "enable_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = false
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = false
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = true
}

variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling for predictable workloads"
  type        = bool
  default     = false
}

# Security
variable "enable_waf" {
  description = "Enable AWS WAF for application protection"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cluster"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Compliance
variable "enable_cloudtrail" {
  description = "Enable CloudTrail for audit logging"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_guardduty" {
  description = "Enable GuardDuty for threat detection"
  type        = bool
  default     = true
}