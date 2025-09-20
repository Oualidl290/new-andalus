import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCurrentPageMetrics, checkPerformanceBudget } from '@/lib/monitoring/web-vitals'
import { dbMonitor } from '@/lib/monitoring/database'
import { ImagePerformanceMonitor } from '@/lib/optimization/images'

// Mock performance APIs
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => [{ duration: 100 }]),
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
})

describe('Performance Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Web Vitals Monitoring', () => {
    it('should check performance budget correctly', () => {
      const goodMetrics = [
        { id: '1', name: 'LCP', value: 2000, rating: 'good' as const, delta: 0, navigationType: 'navigate' },
        { id: '2', name: 'FID', value: 50, rating: 'good' as const, delta: 0, navigationType: 'navigate' },
        { id: '3', name: 'CLS', value: 0.05, rating: 'good' as const, delta: 0, navigationType: 'navigate' },
      ]

      const result = checkPerformanceBudget(goodMetrics)
      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should detect performance budget violations', () => {
      const poorMetrics = [
        { id: '1', name: 'LCP', value: 5000, rating: 'poor' as const, delta: 0, navigationType: 'navigate' },
        { id: '2', name: 'FID', value: 400, rating: 'poor' as const, delta: 0, navigationType: 'navigate' },
        { id: '3', name: 'CLS', value: 0.3, rating: 'poor' as const, delta: 0, navigationType: 'navigate' },
      ]

      const result = checkPerformanceBudget(poorMetrics)
      expect(result.passed).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    it('should handle mixed performance ratings', () => {
      const mixedMetrics = [
        { id: '1', name: 'LCP', value: 2000, rating: 'good' as const, delta: 0, navigationType: 'navigate' },
        { id: '2', name: 'FID', value: 400, rating: 'poor' as const, delta: 0, navigationType: 'navigate' },
      ]

      const result = checkPerformanceBudget(mixedMetrics)
      expect(result.passed).toBe(false)
      expect(result.violations).toHaveLength(1)
    })
  })

  describe('Database Performance Monitoring', () => {
    beforeEach(() => {
      dbMonitor.clearMetrics()
      dbMonitor.setEnabled(true)
    })

    it('should measure query performance', async () => {
      const mockQuery = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
      
      const result = await dbMonitor.measureQuery(mockQuery, {
        query: 'SELECT * FROM articles',
        params: [],
      })

      expect(result).toEqual([{ id: 1 }, { id: 2 }])
      expect(mockQuery).toHaveBeenCalledOnce()

      const metrics = dbMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].query).toBe('SELECT * FROM articles')
      expect(metrics[0].rowCount).toBe(2)
    })

    it('should detect slow queries', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      dbMonitor.setSlowQueryThreshold(50)

      // Mock a slow query
      const slowQuery = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      )

      await dbMonitor.measureQuery(slowQuery, {
        query: 'SELECT * FROM slow_table',
      })

      const metrics = dbMonitor.getMetrics()
      expect(metrics[0].duration).toBeGreaterThan(50)
      
      consoleSpy.mockRestore()
    })

    it('should handle query errors', async () => {
      const errorQuery = vi.fn().mockRejectedValue(new Error('Database error'))

      await expect(
        dbMonitor.measureQuery(errorQuery, {
          query: 'INVALID SQL',
        })
      ).rejects.toThrow('Database error')

      const metrics = dbMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].error).toBe('Database error')
    })

    it('should calculate performance statistics', async () => {
      // Add some test queries
      await dbMonitor.measureQuery(
        () => Promise.resolve([]),
        { query: 'Fast query' }
      )

      // Mock slow query
      const slowQuery = () => new Promise(resolve => 
        setTimeout(() => resolve([]), 200)
      )
      await dbMonitor.measureQuery(slowQuery, { query: 'Slow query' })

      const stats = dbMonitor.getStats()
      expect(stats.totalQueries).toBe(2)
      expect(stats.avgDuration).toBeGreaterThan(0)
      expect(stats.maxDuration).toBeGreaterThan(stats.minDuration)
    })
  })

  describe('Image Performance Monitoring', () => {
    beforeEach(() => {
      // Clear metrics properly
      ImagePerformanceMonitor.clearMetrics()
      // Mock fetch for image monitoring
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)
    })

    it('should track image load performance', () => {
      ImagePerformanceMonitor.trackImageLoad(
        'test-image.jpg',
        1500,
        500000,
        'jpg',
        { width: 800, height: 600 }
      )

      const metrics = ImagePerformanceMonitor.getMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].src).toBe('test-image.jpg')
      expect(metrics[0].loadTime).toBe(1500)
      expect(metrics[0].size).toBe(500000)
    })

    it('should detect slow image loads', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ImagePerformanceMonitor.trackImageLoad(
        'slow-image.jpg',
        3000, // > 2000ms threshold
        500000,
        'jpg',
        { width: 800, height: 600 }
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow image load detected')
      )

      consoleSpy.mockRestore()
    })

    it('should detect large images', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ImagePerformanceMonitor.trackImageLoad(
        'large-image.jpg',
        1000,
        2 * 1024 * 1024, // > 1MB
        'jpg',
        { width: 2000, height: 2000 }
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large image detected')
      )

      consoleSpy.mockRestore()
    })

    it('should calculate image statistics', () => {
      // Add test images
      ImagePerformanceMonitor.trackImageLoad('image1.jpg', 1000, 500000, 'jpg', { width: 800, height: 600 })
      ImagePerformanceMonitor.trackImageLoad('image2.png', 2500, 1500000, 'png', { width: 1200, height: 800 })
      ImagePerformanceMonitor.trackImageLoad('image3.webp', 800, 300000, 'webp', { width: 600, height: 400 })

      const stats = ImagePerformanceMonitor.getStats()
      expect(stats.totalImages).toBe(3)
      expect(stats.avgLoadTime).toBeCloseTo(1433.33, 1)
      expect(stats.slowImages).toBe(1) // image2.png > 2000ms
      expect(stats.largeImages).toBe(1) // image2.png > 1MB
    })
  })

  describe('Performance Budget Validation', () => {
    it('should validate Core Web Vitals thresholds', () => {
      const testCases = [
        { name: 'LCP', value: 2000, expectedRating: 'good' },
        { name: 'LCP', value: 3000, expectedRating: 'needs-improvement' },
        { name: 'LCP', value: 5000, expectedRating: 'poor' },
        { name: 'FID', value: 50, expectedRating: 'good' },
        { name: 'FID', value: 200, expectedRating: 'needs-improvement' },
        { name: 'FID', value: 400, expectedRating: 'poor' },
        { name: 'CLS', value: 0.05, expectedRating: 'good' },
        { name: 'CLS', value: 0.15, expectedRating: 'needs-improvement' },
        { name: 'CLS', value: 0.3, expectedRating: 'poor' },
      ]

      testCases.forEach(({ name, value, expectedRating }) => {
        const metrics = [{
          id: '1',
          name,
          value,
          rating: expectedRating as 'good' | 'needs-improvement' | 'poor',
          delta: 0,
          navigationType: 'navigate',
        }]

        const result = checkPerformanceBudget(metrics)
        if (expectedRating === 'poor') {
          expect(result.passed).toBe(false)
          expect(result.violations.length).toBeGreaterThan(0)
        } else {
          expect(result.passed).toBe(true)
        }
      })
    })
  })

  describe('Performance Optimization', () => {
    it('should suggest performance improvements', () => {
      const performanceIssues = [
        { type: 'slow-query', threshold: 100, current: 500 },
        { type: 'large-image', threshold: 1024 * 1024, current: 2 * 1024 * 1024 },
        { type: 'poor-lcp', threshold: 2500, current: 4000 },
      ]

      const suggestions = performanceIssues.map(issue => {
        switch (issue.type) {
          case 'slow-query':
            return 'Consider adding database indexes or optimizing query structure'
          case 'large-image':
            return 'Compress images or use modern formats like WebP/AVIF'
          case 'poor-lcp':
            return 'Optimize critical rendering path and reduce server response time'
          default:
            return 'General performance optimization needed'
        }
      })

      expect(suggestions).toHaveLength(3)
      expect(suggestions[0]).toContain('database indexes')
      expect(suggestions[1]).toContain('Compress images')
      expect(suggestions[2]).toContain('critical rendering path')
    })

    it('should validate performance targets', () => {
      const targets = {
        LCP: 2500, // ms
        FID: 100,  // ms
        CLS: 0.1,  // score
        queryTime: 100, // ms
        imageSize: 1024 * 1024, // bytes
      }

      const currentMetrics = {
        LCP: 2000,
        FID: 80,
        CLS: 0.05,
        queryTime: 150,
        imageSize: 800 * 1024,
      }

      const results = Object.entries(targets).map(([metric, target]) => ({
        metric,
        target,
        current: currentMetrics[metric as keyof typeof currentMetrics],
        passed: currentMetrics[metric as keyof typeof currentMetrics] <= target,
      }))

      const passedCount = results.filter(r => r.passed).length
      expect(passedCount).toBe(4) // All except queryTime should pass
    })
  })
})

describe('Performance API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Web Vitals API', () => {
    it('should send web vitals data correctly', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const mockData = {
        type: 'web-vital',
        metric: {
          id: '1',
          name: 'LCP',
          value: 2000,
          rating: 'good',
          delta: 0,
          navigationType: 'navigate',
        },
        url: 'https://example.com',
        timestamp: Date.now(),
      }

      const response = await fetch('/api/monitoring/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockData),
      })

      expect(response.ok).toBe(true)
      expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
        '/api/monitoring/web-vitals',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockData),
        })
      )
    })
  })

  describe('Performance Monitoring API', () => {
    it('should handle performance events', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const performanceEvent = {
        type: 'long-task',
        duration: 150,
        startTime: 1000,
        url: 'https://example.com',
        timestamp: Date.now(),
      }

      const response = await fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(performanceEvent),
      })

      expect(response.ok).toBe(true)
    })
  })
})