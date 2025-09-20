import { cache } from './redis'

// Cache metrics tracking
export class CacheMetrics {
  private hitCount = 0
  private missCount = 0
  private errorCount = 0
  private startTime = Date.now()

  // Record cache hit
  recordHit() {
    this.hitCount++
  }

  // Record cache miss
  recordMiss() {
    this.missCount++
  }

  // Record cache error
  recordError() {
    this.errorCount++
  }

  // Get hit ratio
  getHitRatio(): number {
    const total = this.hitCount + this.missCount
    return total > 0 ? this.hitCount / total : 0
  }

  // Get metrics summary
  getMetrics() {
    const uptime = Date.now() - this.startTime
    const total = this.hitCount + this.missCount

    return {
      hits: this.hitCount,
      misses: this.missCount,
      errors: this.errorCount,
      total,
      hitRatio: this.getHitRatio(),
      uptimeMs: uptime,
      requestsPerSecond: total / (uptime / 1000),
    }
  }

  // Reset metrics
  reset() {
    this.hitCount = 0
    this.missCount = 0
    this.errorCount = 0
    this.startTime = Date.now()
  }
}

// Global metrics instance
export const cacheMetrics = new CacheMetrics()

// Enhanced cache wrapper with metrics
export async function withCacheMetrics<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  try {
    // Try to get from cache first
    const cached = await cache.get<T>(key)
    
    if (cached !== null) {
      cacheMetrics.recordHit()
      return cached
    }

    // Cache miss - fetch the data
    cacheMetrics.recordMiss()
    const data = await fetcher()
    
    // Store in cache for next time
    await cache.set(key, data, ttl)
    
    return data
  } catch (error) {
    cacheMetrics.recordError()
    console.error(`Cache error for key ${key}:`, error)
    
    // Fallback to fetcher on cache error
    return await fetcher()
  }
}

// Cache health monitoring
export class CacheHealthMonitor {
  // Check cache health
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    redis: {
      connected: boolean
      memory: string | null
      keyCount: number
      latency?: number
    }
    metrics: ReturnType<typeof cacheMetrics.getMetrics>
    issues: string[]
  }> {
    const issues: string[] = []
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Check Redis health
    const redisStats = await cache.getStats()
    
    // Measure Redis latency
    const latencyStart = Date.now()
    try {
      await cache.set('health-check', Date.now(), 1)
      await cache.get('health-check')
      await cache.del('health-check')
    } catch (error) {
      issues.push('Redis operations failing')
      status = 'unhealthy'
    }
    const latency = Date.now() - latencyStart

    // Check connection
    if (!redisStats.connected) {
      issues.push('Redis not connected')
      status = 'unhealthy'
    }

    // Check latency
    if (latency > 100) {
      issues.push(`High Redis latency: ${latency}ms`)
      if (status === 'healthy') status = 'degraded'
    }

    // Check hit ratio
    const metrics = cacheMetrics.getMetrics()
    if (metrics.total > 100 && metrics.hitRatio < 0.7) {
      issues.push(`Low cache hit ratio: ${(metrics.hitRatio * 100).toFixed(1)}%`)
      if (status === 'healthy') status = 'degraded'
    }

    // Check error rate
    if (metrics.total > 0 && metrics.errors / metrics.total > 0.05) {
      issues.push(`High cache error rate: ${((metrics.errors / metrics.total) * 100).toFixed(1)}%`)
      if (status === 'healthy') status = 'degraded'
    }

    return {
      status,
      redis: {
        ...redisStats,
        latency,
      },
      metrics,
      issues,
    }
  }

  // Get detailed cache statistics
  async getDetailedStats(): Promise<{
    redis: Awaited<ReturnType<typeof cache.getStats>>
    metrics: ReturnType<typeof cacheMetrics.getMetrics>
    keyPatterns: Array<{ pattern: string; count: number }>
  }> {
    const redisStats = await cache.getStats()
    const metrics = cacheMetrics.getMetrics()

    // Analyze key patterns (this is a simplified version)
    const keyPatterns = [
      { pattern: 'article:*', count: 0 },
      { pattern: 'articles:*', count: 0 },
      { pattern: 'search:*', count: 0 },
      { pattern: 'session:*', count: 0 },
      { pattern: 'stats:*', count: 0 },
    ]

    // In a real implementation, you'd scan Redis keys to get actual counts
    // For now, we'll return the structure

    return {
      redis: redisStats,
      metrics,
      keyPatterns,
    }
  }
}

// Global health monitor instance
export const cacheHealthMonitor = new CacheHealthMonitor()

// Cache performance analyzer
export class CachePerformanceAnalyzer {
  private operationTimes: Map<string, number[]> = new Map()

  // Record operation time
  recordOperation(operation: string, timeMs: number) {
    if (!this.operationTimes.has(operation)) {
      this.operationTimes.set(operation, [])
    }
    
    const times = this.operationTimes.get(operation)!
    times.push(timeMs)
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift()
    }
  }

  // Get performance statistics
  getPerformanceStats(): Record<string, {
    count: number
    avgMs: number
    minMs: number
    maxMs: number
    p95Ms: number
  }> {
    const stats: Record<string, any> = {}

    for (const [operation, times] of this.operationTimes) {
      if (times.length === 0) continue

      const sorted = [...times].sort((a, b) => a - b)
      const sum = times.reduce((a, b) => a + b, 0)
      const p95Index = Math.floor(sorted.length * 0.95)

      stats[operation] = {
        count: times.length,
        avgMs: sum / times.length,
        minMs: sorted[0],
        maxMs: sorted[sorted.length - 1],
        p95Ms: sorted[p95Index] || sorted[sorted.length - 1],
      }
    }

    return stats
  }

  // Clear performance data
  clear() {
    this.operationTimes.clear()
  }
}

// Global performance analyzer
export const cachePerformanceAnalyzer = new CachePerformanceAnalyzer()

// Instrumented cache operations
export async function instrumentedCacheGet<T>(key: string): Promise<T | null> {
  const start = Date.now()
  try {
    const result = await cache.get<T>(key)
    cachePerformanceAnalyzer.recordOperation('get', Date.now() - start)
    
    if (result !== null) {
      cacheMetrics.recordHit()
    } else {
      cacheMetrics.recordMiss()
    }
    
    return result
  } catch (error) {
    cacheMetrics.recordError()
    cachePerformanceAnalyzer.recordOperation('get-error', Date.now() - start)
    throw error
  }
}

export async function instrumentedCacheSet<T>(
  key: string, 
  value: T, 
  ttl?: number
): Promise<boolean> {
  const start = Date.now()
  try {
    const result = await cache.set(key, value, ttl)
    cachePerformanceAnalyzer.recordOperation('set', Date.now() - start)
    return result
  } catch (error) {
    cacheMetrics.recordError()
    cachePerformanceAnalyzer.recordOperation('set-error', Date.now() - start)
    throw error
  }
}

// Cache optimization recommendations
export class CacheOptimizer {
  // Analyze cache usage and provide recommendations
  async getOptimizationRecommendations(): Promise<{
    recommendations: string[]
    criticalIssues: string[]
    performanceImprovements: string[]
  }> {
    const health = await cacheHealthMonitor.checkHealth()
    const performance = cachePerformanceAnalyzer.getPerformanceStats()
    
    const recommendations: string[] = []
    const criticalIssues: string[] = []
    const performanceImprovements: string[] = []

    // Analyze hit ratio
    if (health.metrics.hitRatio < 0.5) {
      criticalIssues.push('Cache hit ratio is very low (<50%). Consider reviewing cache keys and TTL values.')
    } else if (health.metrics.hitRatio < 0.8) {
      recommendations.push('Cache hit ratio could be improved. Consider longer TTL for stable data.')
    }

    // Analyze error rate
    if (health.metrics.errors > 0) {
      const errorRate = health.metrics.errors / health.metrics.total
      if (errorRate > 0.1) {
        criticalIssues.push(`High cache error rate (${(errorRate * 100).toFixed(1)}%). Check Redis connectivity.`)
      } else if (errorRate > 0.01) {
        recommendations.push('Some cache errors detected. Monitor Redis health.')
      }
    }

    // Analyze performance
    for (const [operation, stats] of Object.entries(performance)) {
      if (stats.avgMs > 50) {
        performanceImprovements.push(`${operation} operations are slow (avg: ${stats.avgMs.toFixed(1)}ms)`)
      }
      if (stats.p95Ms > 100) {
        performanceImprovements.push(`${operation} has high P95 latency (${stats.p95Ms.toFixed(1)}ms)`)
      }
    }

    // Redis-specific recommendations
    if (health.redis.latency && health.redis.latency > 50) {
      performanceImprovements.push('Redis latency is high. Consider Redis optimization or scaling.')
    }

    return {
      recommendations,
      criticalIssues,
      performanceImprovements,
    }
  }
}

export const cacheOptimizer = new CacheOptimizer()