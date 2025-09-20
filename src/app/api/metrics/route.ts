import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple metrics collection for Prometheus
interface Metrics {
  http_requests_total: number
  http_request_duration_seconds: number
  nodejs_memory_usage_bytes: number
  nodejs_cpu_usage_percent: number
  database_connections_active: number
  redis_connections_active: number
}

// In-memory metrics store (in production, use a proper metrics library like prom-client)
let metrics: Metrics = {
  http_requests_total: 0,
  http_request_duration_seconds: 0,
  nodejs_memory_usage_bytes: 0,
  nodejs_cpu_usage_percent: 0,
  database_connections_active: 0,
  redis_connections_active: 0
}

function collectMetrics(): string {
  // Update memory usage
  const memoryUsage = process.memoryUsage()
  metrics.nodejs_memory_usage_bytes = memoryUsage.heapUsed
  
  // Update CPU usage (simplified)
  const cpuUsage = process.cpuUsage()
  metrics.nodejs_cpu_usage_percent = (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to percentage
  
  // Generate Prometheus format
  const prometheusMetrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total ${metrics.http_requests_total}

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds ${metrics.http_request_duration_seconds}

# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes ${metrics.nodejs_memory_usage_bytes}

# HELP nodejs_cpu_usage_percent Node.js CPU usage percentage
# TYPE nodejs_cpu_usage_percent gauge
nodejs_cpu_usage_percent ${metrics.nodejs_cpu_usage_percent}

# HELP database_connections_active Active database connections
# TYPE database_connections_active gauge
database_connections_active ${metrics.database_connections_active}

# HELP redis_connections_active Active Redis connections
# TYPE redis_connections_active gauge
redis_connections_active ${metrics.redis_connections_active}

# HELP nodejs_version_info Node.js version information
# TYPE nodejs_version_info gauge
nodejs_version_info{version="${process.version}"} 1

# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds gauge
app_uptime_seconds ${process.uptime()}
`.trim()
  
  return prometheusMetrics
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const prometheusMetrics = collectMetrics()
    
    return new NextResponse(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    )
  }
}

// Helper function to increment request counter (to be called from middleware)
export function incrementRequestCounter() {
  metrics.http_requests_total++
}

// Helper function to record request duration (to be called from middleware)
export function recordRequestDuration(duration: number) {
  metrics.http_request_duration_seconds = duration
}