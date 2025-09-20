# New Andalus - Production Environment Configuration

environment = "production"
aws_region  = "us-east-1"

# Networking
vpc_cidr = "10.0.0.0/16"

# Kubernetes Configuration
kubernetes_version = "1.28"

node_groups = {
  # General purpose nodes for web applications
  web = {
    instance_types = ["c5.large", "c5.xlarge"]
    capacity_type  = "ON_DEMAND"
    min_size      = 3
    max_size      = 20
    desired_size  = 6
    disk_size     = 100
    labels = {
      role        = "web"
      environment = "production"
    }
    taints = []
  }
  
  # API and backend services
  api = {
    instance_types = ["m5.large", "m5.xlarge"]
    capacity_type  = "ON_DEMAND"
    min_size      = 2
    max_size      = 15
    desired_size  = 4
    disk_size     = 100
    labels = {
      role        = "api"
      environment = "production"
    }
    taints = []
  }
  
  # Background jobs and workers
  workers = {
    instance_types = ["r5.large", "r5.xlarge"]
    capacity_type  = "SPOT"
    min_size      = 1
    max_size      = 10
    desired_size  = 3
    disk_size     = 100
    labels = {
      role        = "worker"
      environment = "production"
    }
    taints = [{
      key    = "worker-node"
      value  = "true"
      effect = "NO_SCHEDULE"
    }]
  }
  
  # Monitoring and logging
  monitoring = {
    instance_types = ["m5.large"]
    capacity_type  = "ON_DEMAND"
    min_size      = 1
    max_size      = 3
    desired_size  = 2
    disk_size     = 200
    labels = {
      role        = "monitoring"
      environment = "production"
    }
    taints = [{
      key    = "monitoring-node"
      value  = "true"
      effect = "NO_SCHEDULE"
    }]
  }
}

# Database Configuration
postgres_version   = "16.1"
db_instance_class  = "db.r5.xlarge"
database_name      = "new_andalus_prod"
database_username  = "postgres"

# Redis Configuration
redis_version   = "7.0"
redis_node_type = "cache.r5.large"
redis_num_nodes = 3

# Domain Configuration
domain_name        = "newandalus.com"
application_domain = "app.newandalus.com"
create_dns_zone    = true
create_ssl_certificate = true

# Monitoring
alert_email = "production-alerts@newandalus.com"

# Feature Flags - Production Settings
enable_backup_encryption    = true
enable_multi_az            = true
enable_performance_insights = true
enable_spot_instances      = true
enable_scheduled_scaling   = true

# Security - Production Settings
enable_waf       = true
enable_shield    = true
enable_cloudtrail = true
enable_config    = true
enable_guardduty = true

# Allowed CIDR blocks (restrict in production)
allowed_cidr_blocks = [
  "10.0.0.0/8",     # Internal VPC
  "172.16.0.0/12",  # Private networks
  "192.168.0.0/16"  # Private networks
]

# S3 Lifecycle Rules - Production
s3_lifecycle_rules = [
  {
    id     = "production_lifecycle"
    status = "Enabled"
    transitions = [
      {
        days          = 30
        storage_class = "STANDARD_IA"
      },
      {
        days          = 90
        storage_class = "GLACIER"
      },
      {
        days          = 365
        storage_class = "DEEP_ARCHIVE"
      }
    ]
  }
]

# CORS Rules for Production
s3_cors_rules = [
  {
    allowed_headers = ["Authorization", "Content-Type", "x-amz-date", "x-amz-security-token"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = [
      "https://newandalus.com",
      "https://app.newandalus.com",
      "https://admin.newandalus.com"
    ]
    expose_headers  = ["ETag", "x-amz-version-id"]
    max_age_seconds = 3000
  }
]