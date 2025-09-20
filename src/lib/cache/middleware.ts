import { NextRequest, NextResponse } from 'next/server'
import { cacheMetrics, cacheHealthMonitor } from './monitoring'
import { cacheWarmer } from './invalidation'

// Cache middleware for automatic monitoring and warming
export async function cacheMiddleware(request: NextRequest) {
  const start = Date.now()
  
  try {
    // Check if this is a cache-warming request
    if (request.nextUrl.pathname.startsWith('/api/cache/warm')) {
      return handleCacheWarming(request)
    }

    // Monitor cache health periodically
    if (shouldCheckCacheHealth()) {
      // Run health check in background
      cacheHealthMonitor.checkHealth().catch(error => {
        console.error('Background cache health check failed:', error)
      })
    }

    // Continue with the request
    return NextResponse.next()
  } catch (error) {
    console.error('Cache middleware error:', error)
    return NextResponse.next()
  } finally {
    // Record request timing
    const duration = Date.now() - start
    if (duration > 100) {
      console.warn(`Slow cache middleware: ${duration}ms for ${request.nextUrl.pathname}`)
    }
  }
}

// Handle cache warming requests
async function handleCacheWarming(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get('target')

  try {
    switch (target) {
      case 'homepage':
        await cacheWarmer.warmHomepage()
        return NextResponse.json({ success: true, message: 'Homepage cache warmed' })
      
      case 'popular':
        await cacheWarmer.warmPopularArticles()
        return NextResponse.json({ success: true, message: 'Popular articles cache warmed' })
      
      case 'recent':
        await cacheWarmer.warmRecentArticles()
        return NextResponse.json({ success: true, message: 'Recent articles cache warmed' })
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid warming target' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Cache warming error:', error)
    return NextResponse.json(
      { success: false, error: 'Cache warming failed' },
      { status: 500 }
    )
  }
}

// Determine if we should check cache health (every 5 minutes)
let lastHealthCheck = 0
function shouldCheckCacheHealth(): boolean {
  const now = Date.now()
  if (now - lastHealthCheck > 5 * 60 * 1000) { // 5 minutes
    lastHealthCheck = now
    return true
  }
  return false
}

// Cache warming scheduler
export class CacheWarmingScheduler {
  private intervals: NodeJS.Timeout[] = []

  // Start automatic cache warming
  start() {
    // Warm homepage cache every 10 minutes
    const homepageInterval = setInterval(async () => {
      try {
        await cacheWarmer.warmHomepage()
        console.log('Automatic homepage cache warming completed')
      } catch (error) {
        console.error('Automatic homepage cache warming failed:', error)
      }
    }, 10 * 60 * 1000) // 10 minutes

    // Warm popular articles every 30 minutes
    const popularInterval = setInterval(async () => {
      try {
        await cacheWarmer.warmPopularArticles()
        console.log('Automatic popular articles cache warming completed')
      } catch (error) {
        console.error('Automatic popular articles cache warming failed:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes

    this.intervals.push(homepageInterval, popularInterval)
    console.log('Cache warming scheduler started')
  }

  // Stop automatic cache warming
  stop() {
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
    console.log('Cache warming scheduler stopped')
  }
}

// Global scheduler instance
export const cacheWarmingScheduler = new CacheWarmingScheduler()

// Cache performance monitoring middleware
export function withCachePerformanceMonitoring<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - start
      
      // Log slow operations
      if (duration > 1000) {
        console.warn(`Slow cache operation: ${operation} took ${duration}ms`)
      }
      
      resolve(result)
    } catch (error) {
      const duration = Date.now() - start
      console.error(`Cache operation failed: ${operation} after ${duration}ms`, error)
      reject(error)
    }
  })
}

// Request-level cache context
export class RequestCacheContext {
  private cacheHits = 0
  private cacheMisses = 0
  private startTime = Date.now()

  recordHit() {
    this.cacheHits++
  }

  recordMiss() {
    this.cacheMisses++
  }

  getStats() {
    const duration = Date.now() - this.startTime
    const total = this.cacheHits + this.cacheMisses
    
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total,
      hitRatio: total > 0 ? this.cacheHits / total : 0,
      duration,
    }
  }
}

// Cache debugging utilities
export class CacheDebugger {
  private static debugMode = process.env.NODE_ENV === 'development'

  static log(message: string, data?: any) {
    if (this.debugMode) {
      console.log(`[Cache Debug] ${message}`, data || '')
    }
  }

  static warn(message: string, data?: any) {
    if (this.debugMode) {
      console.warn(`[Cache Warning] ${message}`, data || '')
    }
  }

  static error(message: string, error?: any) {
    console.error(`[Cache Error] ${message}`, error || '')
  }

  static time(label: string) {
    if (this.debugMode) {
      console.time(`[Cache] ${label}`)
    }
  }

  static timeEnd(label: string) {
    if (this.debugMode) {
      console.timeEnd(`[Cache] ${label}`)
    }
  }
}

// Export debugging utilities
export const cacheDebugger = CacheDebugger