import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  PerformanceOptimizer, 
  PerformanceMonitor, 
  checkPerformanceBudget,
  DEFAULT_PERFORMANCE_BUDGET 
} from '@/lib/optimization/performance'

// Mock dependencies
vi.mock('@/lib/db/connection', () => ({
  db: {
    execute: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/monitoring/database', () => ({
  dbMonitor: {
    getStats: vi.fn().mockReturnValue({
      totalQueries: 100,
      slowQueries: 2,
      errorQueries: 0,
      avgDuration: 45,
      maxDuration: 150,
      minDuration: 5,
    }),
    getMetrics: vi.fn().mockReturnValue([
      {
        query: 'SELECT * FROM articles WHERE status = ?',
        duration: 120,
        timestamp: Date.now(),
        params: ['published'],
      },
      {
        query: 'SELECT * FROM users WHERE email = ?',
        duration: 80,
        timestamp: Date.now(),
        params: ['test@example.com'],
      },
    ]),
    clearMetrics: vi.fn(),
  },
  applySuggestedIndexes: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/optimization/images', () => ({
  ImagePerformanceMonitor: {
    getStats: vi.fn().mockReturnValue({
      totalImages: 50,
      avgLoadTime: 800,
      avgSize: 300 * 1024, // 300KB
      slowImages: 1,
      largeImages: 2,
    }),
    getMetrics: vi.fn().mockReturnValue([
      {
        src: 'image1.jpg',
        loadTime: 1200,
        size: 800 * 1024, // 800KB
        format: 'jpeg',
        dimensions: { width: 1920, height: 1080 },
        timestamp: Date.now(),
      },
      {
        src: 'image2.png',
        loadTime: 2500,
        size: 1.5 * 1024 * 1024, // 1.5MB
        format: 'png',
        dimensions: { width: 2560, height: 1440 },
        timestamp: Date.now(),
      },
    ]),
    clearMetrics: vi.fn(),
  },
}))

vi.mock('@/lib/cache/redis', () => ({
  cache: {
    clearExpired: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/db/queries', () => ({
  getArticles: vi.fn().mockResolvedValue({
    articles: [],
    pagination: { total: 0, page: 1, limit: 10, hasNext: false },
  }),
}))

describe('Performance Optimization', () => {
  let optimizer: PerformanceOptimizer

  beforeEach(() => {
    optimizer = PerformanceOptimizer.getInstance()
    vi.clearAllMocks()
  })

  describe('PerformanceOptimizer', () => {
    it('should optimize database performance', async () => {
      const result = await optimizer.optimizeDatabase()

      expect(result.success).toBe(true)
      expect(result.optimizations).toContain('Applied suggested database indexes')
      expect(result.optimizations.length).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(0)
      expect(result.metrics.before).toBeDefined()
      expect(result.metrics.after).toBeDefined()
    })

    it('should optimize cache performance', async () => {
      const result = await optimizer.optimizeCache()

      expect(result.success).toBe(true)
      expect(result.optimizations).toContain('Cleared expired cache entries')
      expect(result.optimizations).toContain('Optimized cache key patterns')
      expect(result.optimizations).toContain('Preloaded critical data into cache')
      expect(result.errors).toHaveLength(0)
    })

    it('should optimize image performance', async () => {
      const result = await optimizer.optimizeImages()

      expect(result.success).toBe(true)
      expect(result.optimizations).toContain('Image optimization analysis completed')
      expect(result.optimizations.some(opt => opt.includes('large images'))).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.metrics.before).toBeDefined()
      expect(result.metrics.after).toBeDefined()
    })

    it('should run full optimization', async () => {
      const result = await optimizer.runFullOptimization()

      expect(result.database.success).toBe(true)
      expect(result.cache.success).toBe(true)
      expect(result.images.success).toBe(true)
      expect(result.overall.success).toBe(true)
      expect(result.overall.totalOptimizations).toBeGreaterThan(0)
      expect(result.overall.totalErrors).toBe(0)
    })

    it('should handle optimization errors gracefully', async () => {
      // Mock an error in database optimization
      const { applySuggestedIndexes } = await import('@/lib/monitoring/database')
      vi.mocked(applySuggestedIndexes).mockRejectedValueOnce(new Error('Database error'))

      const result = await optimizer.optimizeDatabase()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Database optimization failed: Database error')
    })
  })

  describe('PerformanceMonitor', () => {
    it('should measure operation duration', () => {
      const operationName = 'test-operation'
      
      PerformanceMonitor.startMeasurement(operationName)
      
      // Simulate some work
      const start = performance.now()
      while (performance.now() - start < 10) {
        // Wait 10ms
      }
      
      const duration = PerformanceMonitor.endMeasurement(operationName)
      
      expect(duration).toBeGreaterThan(0)
      expect(duration).toBeGreaterThanOrEqual(10)
    })

    it('should measure async operations', async () => {
      const asyncOperation = async () => {
        return new Promise(resolve => setTimeout(resolve, 50))
      }

      const result = await PerformanceMonitor.measureAsync('async-test', asyncOperation)
      expect(result).toBeUndefined() // Promise resolves with undefined
    })

    it('should handle measurement errors', () => {
      const duration = PerformanceMonitor.endMeasurement('non-existent-measurement')
      expect(duration).toBe(0)
    })
  })

  describe('Performance Budget', () => {
    it('should pass budget check with good metrics', () => {
      const goodMetrics = {
        database: {
          avgDuration: 50, // Under 100ms budget
          slowQueries: 0,
        },
        images: {
          avgSize: 200 * 1024, // Under 500KB budget
          largeImages: 0,
        },
      }

      const result = checkPerformanceBudget(goodMetrics)

      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should fail budget check with poor metrics', () => {
      const poorMetrics = {
        database: {
          avgDuration: 150, // Over 100ms budget
          slowQueries: 5,
        },
        images: {
          avgSize: 800 * 1024, // Over 500KB budget
          largeImages: 3,
        },
      }

      const result = checkPerformanceBudget(poorMetrics)

      expect(result.passed).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.violations.some(v => v.includes('database query time'))).toBe(true)
      expect(result.violations.some(v => v.includes('image size'))).toBe(true)
    })

    it('should generate warnings for concerning metrics', () => {
      const concerningMetrics = {
        database: {
          avgDuration: 80, // Under budget but has slow queries
          slowQueries: 2,
        },
        images: {
          avgSize: 400 * 1024, // Under budget but has large images
          largeImages: 1,
        },
      }

      const result = checkPerformanceBudget(concerningMetrics)

      expect(result.passed).toBe(true) // No violations
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('slow database queries'))).toBe(true)
      expect(result.warnings.some(w => w.includes('large images'))).toBe(true)
    })

    it('should use custom budget limits', () => {
      const customBudget = {
        ...DEFAULT_PERFORMANCE_BUDGET,
        maxDatabaseQueryTime: 200, // More lenient
        maxImageSize: 1024 * 1024, // 1MB instead of 500KB
      }

      const metrics = {
        database: {
          avgDuration: 150, // Would fail default budget but pass custom
          slowQueries: 0,
        },
        images: {
          avgSize: 800 * 1024, // Would fail default budget but pass custom
          largeImages: 0,
        },
      }

      const result = checkPerformanceBudget(metrics, customBudget)

      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })
  })

  describe('Performance Metrics Integration', () => {
    it('should collect comprehensive performance data', async () => {
      const { dbMonitor } = await import('@/lib/monitoring/database')
      const { ImagePerformanceMonitor } = await import('@/lib/optimization/images')

      const dbStats = dbMonitor.getStats()
      const imageStats = ImagePerformanceMonitor.getStats()

      expect(dbStats).toHaveProperty('totalQueries')
      expect(dbStats).toHaveProperty('avgDuration')
      expect(dbStats).toHaveProperty('slowQueries')

      expect(imageStats).toHaveProperty('totalImages')
      expect(imageStats).toHaveProperty('avgLoadTime')
      expect(imageStats).toHaveProperty('avgSize')
    })

    it('should identify performance bottlenecks', async () => {
      const { dbMonitor } = await import('@/lib/monitoring/database')
      
      const slowQueries = dbMonitor.getMetrics({ slowOnly: true })
      expect(Array.isArray(slowQueries)).toBe(true)
      
      // Should identify queries that need optimization
      const needsOptimization = slowQueries.some(query => query.duration > 100)
      expect(needsOptimization).toBe(true)
    })
  })
})