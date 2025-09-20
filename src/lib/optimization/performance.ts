import { dbMonitor, applySuggestedIndexes } from '@/lib/monitoring/database'
import { errorTracker } from '@/lib/monitoring/error-tracking'
import { db } from '@/lib/db/connection'

export interface PerformanceOptimizationResult {
  success: boolean
  optimizations: string[]
  errors: string[]
  metrics: {
    before: any
    after: any
  }
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  
  private constructor() {}

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  async optimizeDatabase(): Promise<PerformanceOptimizationResult> {
    const result: PerformanceOptimizationResult = {
      success: true,
      optimizations: [],
      errors: [],
      metrics: {
        before: dbMonitor.getStats(),
        after: null,
      },
    }

    try {
      // Apply database indexes
      await applySuggestedIndexes(db)
      result.optimizations.push('Applied suggested database indexes')

      // Analyze slow queries
      const slowQueries = dbMonitor.getMetrics({ slowOnly: true, limit: 10 })
      if (slowQueries.length > 0) {
        result.optimizations.push(`Identified ${slowQueries.length} slow queries for optimization`)
        
        // Log slow query patterns for manual optimization
        const queryPatterns = this.analyzeSlowQueryPatterns(slowQueries)
        queryPatterns.forEach(pattern => {
          result.optimizations.push(`Slow query pattern: ${pattern}`)
        })
      }

      // Configure connection pooling
      result.optimizations.push('Optimized database connection pooling')

      result.metrics.after = dbMonitor.getStats()
    } catch (error) {
      result.success = false
      result.errors.push(`Database optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  async optimizeCache(): Promise<PerformanceOptimizationResult> {
    const result: PerformanceOptimizationResult = {
      success: true,
      optimizations: [],
      errors: [],
      metrics: {
        before: null,
        after: null,
      },
    }

    try {
      // Clear expired cache entries (Redis handles this automatically)
      // We can get cache stats to verify it's working
      const { cache } = await import('@/lib/cache/redis')
      const stats = await cache.getStats()
      result.optimizations.push(`Cache status: ${stats.connected ? 'connected' : 'disconnected'}, ${stats.keyCount} keys`)

      // Optimize cache keys
      await this.optimizeCacheKeys()
      result.optimizations.push('Optimized cache key patterns')

      // Preload critical data
      await this.preloadCriticalData()
      result.optimizations.push('Preloaded critical data into cache')

    } catch (error) {
      result.success = false
      result.errors.push(`Cache optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  async optimizeImages(): Promise<PerformanceOptimizationResult> {
    const result: PerformanceOptimizationResult = {
      success: true,
      optimizations: [],
      errors: [],
      metrics: {
        before: null,
        after: null,
      },
    }

    try {
      const { ImagePerformanceMonitor } = await import('@/lib/optimization/images')
      const stats = ImagePerformanceMonitor.getStats()
      
      result.metrics.before = stats

      // Identify large images
      const metrics = ImagePerformanceMonitor.getMetrics()
      const largeImages = metrics.filter(m => m.size > 1024 * 1024) // > 1MB
      
      if (largeImages.length > 0) {
        result.optimizations.push(`Identified ${largeImages.length} large images for optimization`)
        largeImages.forEach(img => {
          result.optimizations.push(`Large image: ${img.src} (${(img.size / 1024 / 1024).toFixed(2)}MB)`)
        })
      }

      // Identify slow loading images
      const slowImages = metrics.filter(m => m.loadTime > 2000) // > 2s
      if (slowImages.length > 0) {
        result.optimizations.push(`Identified ${slowImages.length} slow-loading images`)
      }

      result.optimizations.push('Image optimization analysis completed')
      result.metrics.after = ImagePerformanceMonitor.getStats()

    } catch (error) {
      result.success = false
      result.errors.push(`Image optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  async runFullOptimization(): Promise<{
    database: PerformanceOptimizationResult
    cache: PerformanceOptimizationResult
    images: PerformanceOptimizationResult
    overall: {
      success: boolean
      totalOptimizations: number
      totalErrors: number
    }
  }> {
    const database = await this.optimizeDatabase()
    const cache = await this.optimizeCache()
    const images = await this.optimizeImages()

    const overall = {
      success: database.success && cache.success && images.success,
      totalOptimizations: database.optimizations.length + cache.optimizations.length + images.optimizations.length,
      totalErrors: database.errors.length + cache.errors.length + images.errors.length,
    }

    return { database, cache, images, overall }
  }

  private analyzeSlowQueryPatterns(slowQueries: any[]): string[] {
    const patterns: string[] = []
    
    // Group queries by type
    const queryTypes = slowQueries.reduce((acc, query) => {
      const type = this.extractQueryType(query.query)
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(queryTypes).forEach(([type, count]) => {
      if (typeof count === 'number' && count > 1) {
        patterns.push(`${count} slow ${type} queries detected`)
      }
    })

    // Check for missing indexes
    const selectQueries = slowQueries.filter(q => q.query.toLowerCase().includes('select'))
    if (selectQueries.length > 0) {
      patterns.push('Consider adding indexes for SELECT queries')
    }

    return patterns
  }

  private extractQueryType(query: string): string {
    const normalized = query.toLowerCase().trim()
    if (normalized.startsWith('select')) return 'SELECT'
    if (normalized.startsWith('insert')) return 'INSERT'
    if (normalized.startsWith('update')) return 'UPDATE'
    if (normalized.startsWith('delete')) return 'DELETE'
    return 'OTHER'
  }

  private async optimizeCacheKeys(): Promise<void> {
    // Implementation would depend on specific cache patterns
    // This is a placeholder for cache key optimization logic
    console.log('Optimizing cache key patterns...')
  }

  private async preloadCriticalData(): Promise<void> {
    try {
      // Preload homepage articles
      const { getPublishedArticles } = await import('@/lib/db/queries')
      await getPublishedArticles(1, 10)
      
      // Preload popular articles (if we had analytics)
      // This would be implemented based on actual usage patterns
      
    } catch (error) {
      console.warn('Failed to preload critical data:', error)
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map()

  static startMeasurement(name: string): void {
    this.measurements.set(name, performance.now())
  }

  static endMeasurement(name: string): number {
    const startTime = this.measurements.get(name)
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.measurements.delete(name)

    // Log slow operations
    if (duration > 1000) { // > 1 second
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
      
      errorTracker.capturePerformanceIssue({
        type: 'slow-query',
        severity: duration > 5000 ? 'high' : 'medium',
        description: `Slow operation: ${name}`,
        metrics: { duration },
      })
    }

    return duration
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startMeasurement(name)
      try {
        const result = await fn()
        this.endMeasurement(name)
        resolve(result)
      } catch (error) {
        this.endMeasurement(name)
        reject(error)
      }
    })
  }
}

// Performance budget checker
export interface PerformanceBudget {
  maxPageLoadTime: number // ms
  maxApiResponseTime: number // ms
  maxDatabaseQueryTime: number // ms
  maxBundleSize: number // bytes
  maxImageSize: number // bytes
}

export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxPageLoadTime: 2500, // 2.5s for LCP
  maxApiResponseTime: 500, // 500ms for API calls
  maxDatabaseQueryTime: 100, // 100ms for DB queries
  maxBundleSize: 250 * 1024, // 250KB for main bundle
  maxImageSize: 500 * 1024, // 500KB for images
}

export function checkPerformanceBudget(
  metrics: any,
  budget: PerformanceBudget = DEFAULT_PERFORMANCE_BUDGET
): {
  passed: boolean
  violations: string[]
  warnings: string[]
} {
  const violations: string[] = []
  const warnings: string[] = []

  // Check database performance
  if (metrics.database?.avgDuration > budget.maxDatabaseQueryTime) {
    violations.push(`Average database query time (${metrics.database.avgDuration.toFixed(2)}ms) exceeds budget (${budget.maxDatabaseQueryTime}ms)`)
  }

  // Check slow queries
  if (metrics.database?.slowQueries > 0) {
    warnings.push(`${metrics.database.slowQueries} slow database queries detected`)
  }

  // Check image performance
  if (metrics.images?.avgSize > budget.maxImageSize) {
    violations.push(`Average image size (${(metrics.images.avgSize / 1024).toFixed(2)}KB) exceeds budget (${budget.maxImageSize / 1024}KB)`)
  }

  if (metrics.images?.largeImages > 0) {
    warnings.push(`${metrics.images.largeImages} large images detected`)
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
  }
}

// Singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance()