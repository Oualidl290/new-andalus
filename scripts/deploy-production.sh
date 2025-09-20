#!/bin/bash

# New Andalus - Production Deployment Script
# Enterprise-grade deployment with comprehensive checks and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-production}"
DEPLOYMENT_STRATEGY="${DEPLOYMENT_STRATEGY:-rolling}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="new-andalus-${ENVIRONMENT}"
CLUSTER_NAME="new-andalus-${ENVIRONMENT}-cluster"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Error handling
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        if [ "${ROLLBACK_ON_FAILURE:-true}" = "true" ]; then
            log_warning "Initiating automatic rollback..."
            rollback_deployment
        fi
    fi
    exit $exit_code
}

trap cleanup EXIT

# Validation functions
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "helm" "aws" "jq" "curl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check kubectl context
    if ! kubectl config current-context | grep -q "$CLUSTER_NAME"; then
        log_warning "kubectl context not set to $CLUSTER_NAME, updating..."
        aws eks update-kubeconfig --region "$AWS_REGION" --name "$CLUSTER_NAME"
    fi
    
    log_success "Prerequisites validated"
}

validate_cluster_health() {
    log_info "Validating cluster health..."
    
    # Check node status
    local unhealthy_nodes
    unhealthy_nodes=$(kubectl get nodes --no-headers | grep -v Ready | wc -l)
    if [ "$unhealthy_nodes" -gt 0 ]; then
        log_error "$unhealthy_nodes unhealthy nodes found"
        kubectl get nodes
        exit 1
    fi
    
    # Check system pods
    local failing_pods
    failing_pods=$(kubectl get pods -n kube-system --no-headers | grep -v Running | grep -v Completed | wc -l)
    if [ "$failing_pods" -gt 0 ]; then
        log_error "$failing_pods failing system pods found"
        kubectl get pods -n kube-system | grep -v Running | grep -v Completed
        exit 1
    fi
    
    log_success "Cluster health validated"
}

validate_secrets() {
    log_info "Validating secrets..."
    
    local required_secrets=("database-secrets" "redis-secrets" "web-secrets")
    for secret in "${required_secrets[@]}"; do
        if ! kubectl get secret "$secret" -n "$NAMESPACE" &> /dev/null; then
            log_error "Required secret '$secret' not found in namespace '$NAMESPACE'"
            exit 1
        fi
    done
    
    log_success "Secrets validated"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    validate_prerequisites
    validate_cluster_health
    validate_secrets
    
    # Check database connectivity
    log_info "Checking database connectivity..."
    if ! kubectl exec -n "$NAMESPACE" deployment/web-frontend -- npm run db:check; then
        log_error "Database connectivity check failed"
        exit 1
    fi
    
    # Check Redis connectivity
    log_info "Checking Redis connectivity..."
    if ! kubectl exec -n "$NAMESPACE" deployment/web-frontend -- npm run redis:check; then
        log_error "Redis connectivity check failed"
        exit 1
    fi
    
    # Verify image exists
    log_info "Verifying container image..."
    if ! docker manifest inspect "ghcr.io/new-andalus/platform:$IMAGE_TAG" &> /dev/null; then
        log_error "Container image ghcr.io/new-andalus/platform:$IMAGE_TAG not found"
        exit 1
    fi
    
    log_success "Pre-deployment checks completed"
}

# Backup current state
backup_current_state() {
    log_info "Backing up current deployment state..."
    
    local backup_dir="/tmp/new-andalus-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup current deployment
    kubectl get deployment web-frontend -n "$NAMESPACE" -o yaml > "$backup_dir/deployment.yaml"
    kubectl get service web-frontend-service -n "$NAMESPACE" -o yaml > "$backup_dir/service.yaml"
    kubectl get ingress web-frontend-ingress -n "$NAMESPACE" -o yaml > "$backup_dir/ingress.yaml"
    
    # Store backup location
    echo "$backup_dir" > /tmp/new-andalus-last-backup
    
    log_success "Backup created at $backup_dir"
}

# Database migration
run_database_migration() {
    log_info "Running database migrations..."
    
    # Create migration job
    kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-$(date +%s)
  namespace: $NAMESPACE
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: ghcr.io/new-andalus/platform:$IMAGE_TAG
        command: ["npm", "run", "db:migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secrets
              key: connection_string
        - name: NODE_ENV
          value: "production"
      backoffLimit: 3
EOF
    
    # Wait for migration to complete
    local job_name
    job_name=$(kubectl get jobs -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp -o jsonpath='{.items[-1].metadata.name}')
    
    log_info "Waiting for migration job $job_name to complete..."
    kubectl wait --for=condition=complete job/"$job_name" -n "$NAMESPACE" --timeout=600s
    
    # Check migration status
    if kubectl get job "$job_name" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' | grep -q True; then
        log_error "Database migration failed"
        kubectl logs job/"$job_name" -n "$NAMESPACE"
        exit 1
    fi
    
    log_success "Database migration completed"
}

# Rolling deployment
rolling_deployment() {
    log_info "Starting rolling deployment..."
    
    # Update deployment image
    kubectl set image deployment/web-frontend web-frontend="ghcr.io/new-andalus/platform:$IMAGE_TAG" -n "$NAMESPACE"
    
    # Wait for rollout to complete
    kubectl rollout status deployment/web-frontend -n "$NAMESPACE" --timeout=600s
    
    log_success "Rolling deployment completed"
}

# Blue-green deployment
blue_green_deployment() {
    log_info "Starting blue-green deployment..."
    
    # Create green deployment
    kubectl get deployment web-frontend -n "$NAMESPACE" -o yaml | \
        sed 's/web-frontend/web-frontend-green/g' | \
        sed "s|image: .*|image: ghcr.io/new-andalus/platform:$IMAGE_TAG|" | \
        kubectl apply -f -
    
    # Wait for green deployment to be ready
    kubectl rollout status deployment/web-frontend-green -n "$NAMESPACE" --timeout=600s
    
    # Run health checks on green deployment
    log_info "Running health checks on green deployment..."
    local green_pod
    green_pod=$(kubectl get pods -n "$NAMESPACE" -l app=web-frontend-green -o jsonpath='{.items[0].metadata.name}')
    
    if ! kubectl exec -n "$NAMESPACE" "$green_pod" -- curl -f http://localhost:3000/api/health; then
        log_error "Health check failed on green deployment"
        kubectl delete deployment web-frontend-green -n "$NAMESPACE"
        exit 1
    fi
    
    # Switch traffic to green
    kubectl patch service web-frontend-service -n "$NAMESPACE" -p '{"spec":{"selector":{"app":"web-frontend-green"}}}'
    
    # Wait for traffic switch
    sleep 30
    
    # Verify external health
    if ! curl -f "https://newandalus.com/api/health"; then
        log_error "External health check failed, rolling back"
        kubectl patch service web-frontend-service -n "$NAMESPACE" -p '{"spec":{"selector":{"app":"web-frontend"}}}'
        kubectl delete deployment web-frontend-green -n "$NAMESPACE"
        exit 1
    fi
    
    # Clean up old blue deployment
    kubectl delete deployment web-frontend -n "$NAMESPACE"
    kubectl get deployment web-frontend-green -n "$NAMESPACE" -o yaml | \
        sed 's/web-frontend-green/web-frontend/g' | \
        kubectl apply -f -
    kubectl delete deployment web-frontend-green -n "$NAMESPACE"
    
    log_success "Blue-green deployment completed"
}

# Canary deployment
canary_deployment() {
    log_info "Starting canary deployment..."
    
    local canary_percentage="${CANARY_PERCENTAGE:-10}"
    
    # Create canary deployment
    kubectl get deployment web-frontend -n "$NAMESPACE" -o yaml | \
        sed 's/web-frontend/web-frontend-canary/g' | \
        sed "s|image: .*|image: ghcr.io/new-andalus/platform:$IMAGE_TAG|" | \
        sed "s|replicas: .*|replicas: 1|" | \
        kubectl apply -f -
    
    # Wait for canary to be ready
    kubectl rollout status deployment/web-frontend-canary -n "$NAMESPACE" --timeout=300s
    
    # Configure traffic splitting (using Istio or similar)
    # This is a simplified example - in practice you'd use a service mesh
    log_info "Configuring $canary_percentage% traffic to canary..."
    
    # Monitor canary for specified duration
    local monitor_duration="${CANARY_MONITOR_DURATION:-300}"
    log_info "Monitoring canary for $monitor_duration seconds..."
    
    local start_time
    start_time=$(date +%s)
    local end_time=$((start_time + monitor_duration))
    
    while [ "$(date +%s)" -lt "$end_time" ]; do
        # Check error rate
        local error_rate
        error_rate=$(kubectl exec -n monitoring deployment/prometheus -- \
            promtool query instant 'rate(http_requests_total{status=~"5.."}[5m])' | \
            jq -r '.data.result[0].value[1] // "0"')
        
        if (( $(echo "$error_rate > 0.01" | bc -l) )); then
            log_error "High error rate detected: $error_rate"
            kubectl delete deployment web-frontend-canary -n "$NAMESPACE"
            exit 1
        fi
        
        sleep 30
    done
    
    # Promote canary
    log_info "Promoting canary to production..."
    kubectl set image deployment/web-frontend web-frontend="ghcr.io/new-andalus/platform:$IMAGE_TAG" -n "$NAMESPACE"
    kubectl rollout status deployment/web-frontend -n "$NAMESPACE" --timeout=600s
    
    # Clean up canary
    kubectl delete deployment web-frontend-canary -n "$NAMESPACE"
    
    log_success "Canary deployment completed"
}

# Post-deployment verification
post_deployment_verification() {
    log_info "Running post-deployment verification..."
    
    # Health check
    log_info "Checking application health..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "https://newandalus.com/api/health"; then
            break
        fi
        
        log_warning "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Health check failed after $max_attempts attempts"
        exit 1
    fi
    
    # Smoke tests
    log_info "Running smoke tests..."
    if ! npm run test:smoke -- --baseUrl="https://newandalus.com"; then
        log_error "Smoke tests failed"
        exit 1
    fi
    
    # Performance check
    log_info "Running performance check..."
    local response_time
    response_time=$(curl -o /dev/null -s -w '%{time_total}' "https://newandalus.com")
    
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        log_warning "Response time is high: ${response_time}s"
    fi
    
    # Database connectivity
    log_info "Verifying database connectivity..."
    if ! kubectl exec -n "$NAMESPACE" deployment/web-frontend -- npm run db:check; then
        log_error "Database connectivity check failed"
        exit 1
    fi
    
    log_success "Post-deployment verification completed"
}

# Rollback function
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    # Get previous revision
    local previous_revision
    previous_revision=$(kubectl rollout history deployment/web-frontend -n "$NAMESPACE" --revision=0 | tail -2 | head -1 | awk '{print $1}')
    
    if [ -z "$previous_revision" ]; then
        log_error "No previous revision found for rollback"
        return 1
    fi
    
    # Rollback to previous revision
    kubectl rollout undo deployment/web-frontend -n "$NAMESPACE" --to-revision="$previous_revision"
    kubectl rollout status deployment/web-frontend -n "$NAMESPACE" --timeout=300s
    
    # Verify rollback
    if curl -f "https://newandalus.com/api/health"; then
        log_success "Rollback completed successfully"
    else
        log_error "Rollback verification failed"
        return 1
    fi
}

# Cache invalidation
invalidate_cache() {
    log_info "Invalidating CDN cache..."
    
    # CloudFront invalidation
    if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
        aws cloudfront create-invalidation \
            --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
            --paths "/*" > /dev/null
        log_success "CloudFront cache invalidated"
    fi
    
    # Application cache
    kubectl exec -n "$NAMESPACE" deployment/web-frontend -- npm run cache:clear
    log_success "Application cache cleared"
}

# Notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        local emoji="🚀"
        
        if [ "$status" = "failure" ]; then
            color="danger"
            emoji="❌"
        elif [ "$status" = "warning" ]; then
            color="warning"
            emoji="⚠️"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"$emoji New Andalus Deployment\",
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"$ENVIRONMENT\",
                        \"short\": true
                    }, {
                        \"title\": \"Status\",
                        \"value\": \"$status\",
                        \"short\": true
                    }, {
                        \"title\": \"Image Tag\",
                        \"value\": \"$IMAGE_TAG\",
                        \"short\": true
                    }, {
                        \"title\": \"Strategy\",
                        \"value\": \"$DEPLOYMENT_STRATEGY\",
                        \"short\": true
                    }, {
                        \"title\": \"Message\",
                        \"value\": \"$message\",
                        \"short\": false
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Main deployment function
main() {
    log_info "Starting New Andalus deployment to $ENVIRONMENT"
    log_info "Deployment strategy: $DEPLOYMENT_STRATEGY"
    log_info "Image tag: $IMAGE_TAG"
    
    # Pre-deployment
    pre_deployment_checks
    backup_current_state
    
    # Database migration
    if [ "${SKIP_MIGRATION:-false}" != "true" ]; then
        run_database_migration
    fi
    
    # Deploy based on strategy
    case "$DEPLOYMENT_STRATEGY" in
        "rolling")
            rolling_deployment
            ;;
        "blue-green")
            blue_green_deployment
            ;;
        "canary")
            canary_deployment
            ;;
        *)
            log_error "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            exit 1
            ;;
    esac
    
    # Post-deployment
    post_deployment_verification
    invalidate_cache
    
    # Success notification
    send_notification "success" "Deployment completed successfully"
    log_success "Deployment to $ENVIRONMENT completed successfully!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi