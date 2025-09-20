import { getRedisClient } from './redis'
import { cacheWarmingScheduler } from './middleware'
import { cacheWarmer } from './invalidation'

// Initialize cache system
export async function initializeCache(): Promise<void> {
  try {
    console.log('Initializing cache system...')
    
    // Test Redis connection
    const redis = getRedisClient()
    await redis.ping()
    console.log('✓ Redis connection established')
    
    // Start cache warming scheduler in production
    if (process.env.NODE_ENV === 'production') {
      cacheWarmingScheduler.start()
      console.log('✓ Cache warming scheduler started')
      
      // Initial cache warming
      await warmInitialCaches()
      console.log('✓ Initial cache warming completed')
    }
    
    console.log('Cache system initialized successfully')
  } catch (error) {
    console.error('Failed to initialize cache system:', error)
    
    // Don't throw error to prevent app from crashing
    // The app should work without cache, just with degraded performance
    console.warn('App will continue without cache - performance may be degraded')
  }
}

// Warm up critical caches on startup
async function warmInitialCaches(): Promise<void> {
  try {
    await Promise.all([
      cacheWarmer.warmHomepage(),
      cacheWarmer.warmRecentArticles(),
    ])
  } catch (error) {
    console.error('Initial cache warming failed:', error)
  }
}

// Graceful shutdown
export async function shutdownCache(): Promise<void> {
  try {
    console.log('Shutting down cache system...')
    
    // Stop cache warming scheduler
    cacheWarmingScheduler.stop()
    console.log('✓ Cache warming scheduler stopped')
    
    // Close Redis connection
    const { closeRedisConnection } = await import('./redis')
    await closeRedisConnection()
    console.log('✓ Redis connection closed')
    
    console.log('Cache system shutdown completed')
  } catch (error) {
    console.error('Error during cache shutdown:', error)
  }
}

// Health check for cache system
export async function checkCacheHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
}> {
  try {
    const redis = getRedisClient()
    
    // Test basic operations
    const testKey = 'health-check-' + Date.now()
    await redis.set(testKey, 'test', 'EX', 1)
    const result = await redis.get(testKey)
    await redis.del(testKey)
    
    if (result === 'test') {
      return {
        status: 'healthy',
        message: 'Cache system is operating normally'
      }
    } else {
      return {
        status: 'degraded',
        message: 'Cache operations are not working correctly'
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Cache system error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Cache system configuration
export const cacheConfig = {
  // Enable/disable caching
  enabled: process.env.REDIS_URL !== undefined,
  
  // Cache warming settings
  warming: {
    enabled: process.env.NODE_ENV === 'production',
    intervals: {
      homepage: 10 * 60 * 1000, // 10 minutes
      popular: 30 * 60 * 1000,  // 30 minutes
      recent: 15 * 60 * 1000,   // 15 minutes
    }
  },
  
  // Monitoring settings
  monitoring: {
    enabled: true,
    healthCheckInterval: 5 * 60 * 1000, // 5 minutes
    metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Performance thresholds
  thresholds: {
    hitRatio: 0.8, // 80% minimum hit ratio
    latency: 50,   // 50ms maximum latency
    errorRate: 0.01, // 1% maximum error rate
  }
} as const

// Export initialization status
let isInitialized = false

export function isCacheInitialized(): boolean {
  return isInitialized
}

export function setCacheInitialized(status: boolean): void {
  isInitialized = status
}