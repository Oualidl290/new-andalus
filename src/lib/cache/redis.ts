import Redis from 'ioredis'

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
}

// Create Redis instance
let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(redisConfig)
    
    redis.on('connect', () => {
      console.log('Redis connected successfully')
    })
    
    redis.on('error', (error) => {
      console.error('Redis connection error:', error)
    })
    
    redis.on('close', () => {
      console.log('Redis connection closed')
    })
  }
  
  return redis
}

// Cache key generators
export const cacheKeys = {
  article: (id: string) => `article:${id}`,
  articleBySlug: (slug: string) => `article:slug:${slug}`,
  articlesList: (page: number, limit: number, status?: string) => 
    `articles:list:${page}:${limit}${status ? `:${status}` : ''}`,
  articlesCount: (status?: string) => `articles:count${status ? `:${status}` : ''}`,
  searchResults: (query: string, page: number, limit: number) => 
    `search:${encodeURIComponent(query)}:${page}:${limit}`,
  userSession: (userId: string) => `session:${userId}`,
  popularArticles: () => 'articles:popular',
  recentArticles: (limit: number) => `articles:recent:${limit}`,
  siteStats: () => 'stats:site',
} as const

// Cache TTL values (in seconds)
export const cacheTTL = {
  article: 60 * 60, // 1 hour
  articlesList: 60 * 5, // 5 minutes
  searchResults: 60 * 10, // 10 minutes
  userSession: 60 * 60 * 24, // 24 hours
  popularArticles: 60 * 60, // 1 hour
  recentArticles: 60 * 5, // 5 minutes
  siteStats: 60 * 30, // 30 minutes
  short: 60 * 5, // 5 minutes
  medium: 60 * 30, // 30 minutes
  long: 60 * 60 * 2, // 2 hours
} as const

// Cache utility functions
export class CacheManager {
  private redis: Redis

  constructor() {
    this.redis = getRedisClient()
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await this.redis.setex(key, ttl, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
      return true
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      return false
    }
  }

  async del(key: string | string[]): Promise<boolean> {
    try {
      await this.redis.del(Array.isArray(key) ? key : [key])
      return true
    } catch (error) {
      console.error(`Cache delete error for key(s) ${key}:`, error)
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error)
      return false
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
      return true
    } catch (error) {
      console.error(`Cache pattern invalidation error for pattern ${pattern}:`, error)
      return false
    }
  }

  async increment(key: string, ttl?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key)
      if (ttl && result === 1) {
        await this.redis.expire(key, ttl)
      }
      return result
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error)
      return 0
    }
  }

  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys)
      return values.map(value => value ? JSON.parse(value) : null)
    } catch (error) {
      console.error(`Cache mget error for keys ${keys.join(', ')}:`, error)
      return keys.map(() => null)
    }
  }

  async setMultiple<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline()
      
      for (const entry of entries) {
        const serialized = JSON.stringify(entry.value)
        if (entry.ttl) {
          pipeline.setex(entry.key, entry.ttl, serialized)
        } else {
          pipeline.set(entry.key, serialized)
        }
      }
      
      await pipeline.exec()
      return true
    } catch (error) {
      console.error('Cache mset error:', error)
      return false
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushall()
      return true
    } catch (error) {
      console.error('Cache flush error:', error)
      return false
    }
  }

  async getStats(): Promise<{
    connected: boolean
    memory: string | null
    keyCount: number
  }> {
    try {
      const info = await this.redis.info('memory')
      const dbSize = await this.redis.dbsize()
      
      const memoryMatch = info.match(/used_memory_human:(.+)/)
      const memory = memoryMatch ? memoryMatch[1].trim() : null
      
      return {
        connected: this.redis.status === 'ready',
        memory,
        keyCount: dbSize,
      }
    } catch (error) {
      console.error('Cache stats error:', error)
      return {
        connected: false,
        memory: null,
        keyCount: 0,
      }
    }
  }
}

// Global cache manager instance
export const cache = new CacheManager()

// Helper function for cache-aside pattern
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = await cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // If not in cache, fetch the data
  const data = await fetcher()
  
  // Store in cache for next time
  await cache.set(key, data, ttl)
  
  return data
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}