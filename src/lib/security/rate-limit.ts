import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (use Redis in production)
const store: RateLimitStore = {}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    }
  }

  async check(identifier: string): Promise<{
    success: boolean
    limit: number
    remaining: number
    resetTime: number
    message?: string
  }> {
    const now = Date.now()
    const windowStart = now - this.config.windowMs
    
    // Initialize or get existing record
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 0,
        resetTime: now + this.config.windowMs,
      }
    }

    const record = store[identifier]
    
    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      return {
        success: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: record.resetTime,
        message: this.config.message,
      }
    }

    // Increment counter
    record.count++

    return {
      success: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime,
    }
  }

  async increment(identifier: string): Promise<void> {
    const now = Date.now()
    
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 1,
        resetTime: now + this.config.windowMs,
      }
    } else {
      store[identifier].count++
    }
  }

  async reset(identifier: string): Promise<void> {
    delete store[identifier]
  }
}

// Pre-configured rate limiters for different endpoints
export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again in 15 minutes.',
})

export const apiRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: 'API rate limit exceeded, please slow down.',
})

export const uploadRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
  message: 'Upload rate limit exceeded, please wait before uploading again.',
})

export const searchRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 searches per minute
  message: 'Search rate limit exceeded, please slow down.',
})

// Helper function to get client identifier
export function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  
  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return `${ip}:${userAgent.substring(0, 50)}`
}

// Middleware wrapper for rate limiting
export function withRateLimit(rateLimiter: RateLimiter) {
  return async (request: NextRequest) => {
    const identifier = getClientIdentifier(request)
    const result = await rateLimiter.check(identifier)
    
    return {
      ...result,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      },
    }
  }
}

// Rate limit response helper
export function createRateLimitResponse(result: Awaited<ReturnType<RateLimiter['check']>>) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: result.message,
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
      },
    }
  )
}

// Advanced rate limiting with different tiers
export class TieredRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map()

  constructor(private configs: Record<string, RateLimitConfig>) {
    Object.entries(configs).forEach(([tier, config]) => {
      this.limiters.set(tier, new RateLimiter(config))
    })
  }

  async check(tier: string, identifier: string) {
    const limiter = this.limiters.get(tier)
    if (!limiter) {
      throw new Error(`Rate limiter tier '${tier}' not found`)
    }
    return limiter.check(identifier)
  }
}

// User-based rate limiting (requires authentication)
export class UserRateLimiter extends RateLimiter {
  async checkUser(userId: string): Promise<ReturnType<RateLimiter['check']>> {
    return this.check(`user:${userId}`)
  }
}

// Endpoint-specific rate limiters
export const endpointRateLimiters = {
  '/api/auth/register': authRateLimit,
  '/api/auth/signin': authRateLimit,
  '/api/upload': uploadRateLimit,
  '/api/search': searchRateLimit,
  '/api/articles': apiRateLimit,
  '/api/admin': new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 200, // Higher limit for admin users
  }),
}

// Rate limiting statistics
export function getRateLimitStats() {
  const stats = {
    totalKeys: Object.keys(store).length,
    activeWindows: 0,
    expiredWindows: 0,
  }

  const now = Date.now()
  Object.values(store).forEach(record => {
    if (record.resetTime > now) {
      stats.activeWindows++
    } else {
      stats.expiredWindows++
    }
  })

  return stats
}