import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CacheManager, cacheKeys, cacheTTL } from '@/lib/cache/redis'
import { CacheInvalidator } from '@/lib/cache/invalidation'
import { CacheMetrics, CacheHealthMonitor } from '@/lib/cache/monitoring'

// Mock Redis for testing
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  keys: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  mget: vi.fn(),
  pipeline: vi.fn(() => ({
    setex: vi.fn(),
    set: vi.fn(),
    exec: vi.fn(),
  })),
  flushall: vi.fn(),
  info: vi.fn(),
  dbsize: vi.fn(),
  status: 'ready',
}

vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => mockRedis),
  }
})

describe('Cache System', () => {
  let cacheManager: CacheManager
  let cacheInvalidator: CacheInvalidator
  let cacheMetrics: CacheMetrics
  let cacheHealthMonitor: CacheHealthMonitor

  beforeEach(() => {
    vi.clearAllMocks()
    cacheManager = new CacheManager()
    cacheInvalidator = new CacheInvalidator()
    cacheMetrics = new CacheMetrics()
    cacheHealthMonitor = new CacheHealthMonitor()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('CacheManager', () => {
    it('should get cached value successfully', async () => {
      const testData = { id: '1', title: 'Test Article' }
      mockRedis.get.mockResolvedValue(JSON.stringify(testData))

      const result = await cacheManager.get('test-key')
      
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
      expect(result).toEqual(testData)
    })

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null)

      const result = await cacheManager.get('non-existent-key')
      
      expect(result).toBeNull()
    })

    it('should set value with TTL', async () => {
      const testData = { id: '1', title: 'Test Article' }
      mockRedis.setex.mockResolvedValue('OK')

      const result = await cacheManager.set('test-key', testData, 3600)
      
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify(testData)
      )
      expect(result).toBe(true)
    })

    it('should set value without TTL', async () => {
      const testData = { id: '1', title: 'Test Article' }
      mockRedis.set.mockResolvedValue('OK')

      const result = await cacheManager.set('test-key', testData)
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData)
      )
      expect(result).toBe(true)
    })

    it('should delete single key', async () => {
      mockRedis.del.mockResolvedValue(1)

      const result = await cacheManager.del('test-key')
      
      expect(mockRedis.del).toHaveBeenCalledWith(['test-key'])
      expect(result).toBe(true)
    })

    it('should delete multiple keys', async () => {
      mockRedis.del.mockResolvedValue(2)

      const result = await cacheManager.del(['key1', 'key2'])
      
      expect(mockRedis.del).toHaveBeenCalledWith(['key1', 'key2'])
      expect(result).toBe(true)
    })

    it('should check if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1)

      const result = await cacheManager.exists('test-key')
      
      expect(mockRedis.exists).toHaveBeenCalledWith('test-key')
      expect(result).toBe(true)
    })

    it('should invalidate pattern', async () => {
      mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3'])
      mockRedis.del.mockResolvedValue(3)

      const result = await cacheManager.invalidatePattern('test:*')
      
      expect(mockRedis.keys).toHaveBeenCalledWith('test:*')
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3')
      expect(result).toBe(true)
    })

    it('should increment counter', async () => {
      mockRedis.incr.mockResolvedValue(5)

      const result = await cacheManager.increment('counter-key')
      
      expect(mockRedis.incr).toHaveBeenCalledWith('counter-key')
      expect(result).toBe(5)
    })

    it('should increment counter with TTL on first increment', async () => {
      mockRedis.incr.mockResolvedValue(1)
      mockRedis.expire.mockResolvedValue(1)

      const result = await cacheManager.increment('counter-key', 3600)
      
      expect(mockRedis.incr).toHaveBeenCalledWith('counter-key')
      expect(mockRedis.expire).toHaveBeenCalledWith('counter-key', 3600)
      expect(result).toBe(1)
    })

    it('should handle errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

      const result = await cacheManager.get('test-key')
      
      expect(result).toBeNull()
    })
  })

  describe('Cache Keys', () => {
    it('should generate correct cache keys', () => {
      expect(cacheKeys.article('123')).toBe('article:123')
      expect(cacheKeys.articleBySlug('test-slug')).toBe('article:slug:test-slug')
      expect(cacheKeys.articlesList(1, 20)).toBe('articles:list:1:20')
      expect(cacheKeys.articlesList(1, 20, 'published')).toBe('articles:list:1:20:published')
      expect(cacheKeys.searchResults('test query', 1, 10)).toBe('search:test%20query:1:10')
    })
  })

  describe('Cache TTL', () => {
    it('should have reasonable TTL values', () => {
      expect(cacheTTL.article).toBe(3600) // 1 hour
      expect(cacheTTL.articlesList).toBe(300) // 5 minutes
      expect(cacheTTL.searchResults).toBe(600) // 10 minutes
      expect(cacheTTL.userSession).toBe(86400) // 24 hours
    })
  })

  describe('CacheMetrics', () => {
    it('should track hits and misses', () => {
      cacheMetrics.recordHit()
      cacheMetrics.recordHit()
      cacheMetrics.recordMiss()

      const metrics = cacheMetrics.getMetrics()
      
      expect(metrics.hits).toBe(2)
      expect(metrics.misses).toBe(1)
      expect(metrics.total).toBe(3)
      expect(metrics.hitRatio).toBe(2/3)
    })

    it('should track errors', () => {
      cacheMetrics.recordError()
      cacheMetrics.recordError()

      const metrics = cacheMetrics.getMetrics()
      
      expect(metrics.errors).toBe(2)
    })

    it('should calculate hit ratio correctly', () => {
      expect(cacheMetrics.getHitRatio()).toBe(0) // No requests yet

      cacheMetrics.recordHit()
      expect(cacheMetrics.getHitRatio()).toBe(1) // 100% hit rate

      cacheMetrics.recordMiss()
      expect(cacheMetrics.getHitRatio()).toBe(0.5) // 50% hit rate
    })

    it('should reset metrics', () => {
      cacheMetrics.recordHit()
      cacheMetrics.recordMiss()
      cacheMetrics.recordError()

      cacheMetrics.reset()

      const metrics = cacheMetrics.getMetrics()
      expect(metrics.hits).toBe(0)
      expect(metrics.misses).toBe(0)
      expect(metrics.errors).toBe(0)
    })
  })

  describe('CacheHealthMonitor', () => {
    it('should check cache health', async () => {
      mockRedis.info.mockResolvedValue('used_memory_human:1.5M')
      mockRedis.dbsize.mockResolvedValue(100)

      const health = await cacheHealthMonitor.checkHealth()
      
      expect(health.status).toBeDefined()
      expect(health.redis).toBeDefined()
      expect(health.metrics).toBeDefined()
      expect(health.issues).toBeDefined()
    })

    it('should detect unhealthy cache', async () => {
      mockRedis.status = 'disconnected'
      mockRedis.info.mockResolvedValue('used_memory_human:1.5M')
      mockRedis.dbsize.mockResolvedValue(100)

      const health = await cacheHealthMonitor.checkHealth()
      
      expect(health.status).toBe('unhealthy')
      expect(health.issues).toContain('Redis not connected')
    })
  })

  describe('Cache Integration', () => {
    it('should handle cache-aside pattern', async () => {
      const testData = { id: '1', title: 'Test Article' }
      
      // First call - cache miss
      mockRedis.get.mockResolvedValueOnce(null)
      mockRedis.setex.mockResolvedValueOnce('OK')
      
      const fetcher = vi.fn().mockResolvedValue(testData)
      
      const { withCache } = await import('@/lib/cache/redis')
      const result1 = await withCache('test-key', fetcher, 3600)
      
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(testData))
      expect(result1).toEqual(testData)
      
      // Second call - cache hit
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData))
      
      const result2 = await withCache('test-key', fetcher, 3600)
      
      expect(fetcher).toHaveBeenCalledTimes(1) // Should not be called again
      expect(result2).toEqual(testData)
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Connection failed'))
      
      const result = await cacheManager.get('test-key')
      
      expect(result).toBeNull()
    })

    it('should handle JSON parsing errors', async () => {
      mockRedis.get.mockResolvedValue('invalid-json')
      
      const result = await cacheManager.get('test-key')
      
      expect(result).toBeNull()
    })

    it('should handle set operation errors', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Set failed'))
      
      const result = await cacheManager.set('test-key', { data: 'test' }, 3600)
      
      expect(result).toBe(false)
    })
  })
})

describe('Cache Performance', () => {
  it('should complete operations within reasonable time', async () => {
    const cacheManager = new CacheManager()
    mockRedis.get.mockResolvedValue(JSON.stringify({ test: 'data' }))
    
    const start = Date.now()
    await cacheManager.get('test-key')
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(100) // Should complete within 100ms
  })

  it('should handle concurrent operations', async () => {
    const cacheManager = new CacheManager()
    mockRedis.get.mockResolvedValue(JSON.stringify({ test: 'data' }))
    
    const promises = Array.from({ length: 10 }, (_, i) => 
      cacheManager.get(`test-key-${i}`)
    )
    
    const results = await Promise.all(promises)
    
    expect(results).toHaveLength(10)
    expect(mockRedis.get).toHaveBeenCalledTimes(10)
  })
})