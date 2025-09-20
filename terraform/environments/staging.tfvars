# New Andalus - Staging Environment Configuration

environment = "staging"
aws_region  = "us-east-1"

# Networking
vpc_cidr = "10.1.0.0/16"

# Kubernetes Configuration
kubernetes_version = "1.28"

node_groups = {
  # General purpose nodes
  general = {
    instance_types = ["t3.medium", "t3.large"]
    capacity_type  = "SPOT"
    min_size      = 1
    max_size      = 6
    desired_size  = 2
    disk_size     = 50
    labels = {
      role        = "general"
      environment = "staging"
    }
    taints = []
  }
  
  # Testing nodes
  testing = {
    instance_types = ["t3.medium"]
    capacity_type  = "SPOT"
    min_size      = 0
    max_size      = 4
    desired_size  = 1
    disk_size     = 50
    labels = {
      role        = "testing"
      environment = "staging"
    }
    taints = [{
      key    = "testing-node"
      value  = "true"
      effect = "NO_SCHEDULE"
    }]
  }
}

# Database Configuration
postgres_version   = "16.1"
db_instance_class  = "db.t3.medium"
database_name      = "new_andalus_staging"
database_username  = "postgres"

# Redis Configuration
redis_version   = "7.0"
redis_node_type = "cache.t3.medium"
redis_num_nodes = 1

# Domain Configuration
domain_name        = "staging.newandalus.com"
application_domain = "app.staging.newandalus.com"
create_dns_zone    = false
create_ssl_certificate = false

# Monitoring
alert_email = "staging-alerts@newandalus.com"

# Feature Flags - Staging Settings
enable_backup_encryption    = true
enable_multi_az            = false
enable_performance_insights = false
enable_spot_instances      = true
enable_scheduled_scaling   = false

# Security - Staging Settings
enable_waf       = true
enable_shield    = false
enable_cloudtrail = true
enable_config    = false
enable_guardduty = false

# Allowed CIDR blocks (more permissive for staging)
allowed_cidr_blocks = ["0.0.0.0/0"]

# S3 Lifecycle Rules - Staging (shorter retention)
s3_lifecycle_rules = [
  {
    id     = "staging_lifecycle"
    status = "Enabled"
    transitions = [
      {
        days          = 7
        storage_class = "STANDARD_IA"
      },
      {
        days          = 30
        storage_class = "GLACIER"
      }
    ]
  }
]

# CORS Rules for Staging
s3_cors_rules = [
  {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = [
      "https://staging.newandalus.com",
      "https://app.staging.newandalus.com",
      "http://localhost:3000",
      "http://localhost:3001"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
]