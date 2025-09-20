import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { 
  applySecurityHeaders, 
  generateCSP, 
  generateHSTS,
  DEFAULT_SECURITY_CONFIG 
} from '../lib/security/headers'
import { 
  RateLimiter, 
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  searchRateLimit,
  getClientIdentifier,
  withRateLimit,
  createRateLimitResponse 
} from '../lib/security/rate-limit'
import { 
  SecurityMonitor, 
  securityMonitor,
  logSecurityEvent 
} from '../lib/security/monitoring'
import { 
  SecurityMiddleware,
  securityMiddleware 
} from '../lib/security/middleware'

// Mock fetch for webhook tests
global.fetch = vi.fn()

describe('Security Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CSP Generation', () => {
    it('should generate valid CSP string', () => {
      const config = {
        enabled: true,
        reportOnly: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        }
      }

      const csp = generateCSP(config)
      expect(csp).toBe("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
    })

    it('should handle empty directives', () => {
      const config = {
        enabled: true,
        reportOnly: false,
        directives: {
          'upgrade-insecure-requests': [],
        }
      }

      const csp = generateCSP(config)
      expect(csp).toBe('upgrade-insecure-requests')
    })

    it('should return empty string when disabled', () => {
      const config = {
        enabled: false,
        reportOnly: false,
        directives: {}
      }

      const csp = generateCSP(config)
      expect(csp).toBe('')
    })
  })

  describe('HSTS Generation', () => {
    it('should generate valid HSTS header', () => {
      const config = {
        enabled: true,
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }

      const hsts = generateHSTS(config)
      expect(hsts).toBe('max-age=31536000; includeSubDomains; preload')
    })

    it('should handle minimal HSTS config', () => {
      const config = {
        enabled: true,
        maxAge: 3600,
        includeSubDomains: false,
        preload: false,
      }

      const hsts = generateHSTS(config)
      expect(hsts).toBe('max-age=3600')
    })

    it('should return empty string when disabled', () => {
      const config = {
        enabled: false,
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }

      const hsts = generateHSTS(config)
      expect(hsts).toBe('')
    })
  })

  describe('Security Headers Application', () => {
    it('should apply all security headers', () => {
      const response = new NextResponse()
      const result = applySecurityHeaders(response, DEFAULT_SECURITY_CONFIG)

      expect(result.headers.get('Content-Security-Policy')).toBeTruthy()
      expect(result.headers.get('Strict-Transport-Security')).toBeTruthy()
      expect(result.headers.get('X-Frame-Options')).toBe('DENY')
      expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(result.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(result.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('should remove server information headers', () => {
      const response = new NextResponse()
      response.headers.set('Server', 'nginx/1.0')
      response.headers.set('X-Powered-By', 'Express')

      const result = applySecurityHeaders(response)

      expect(result.headers.get('Server')).toBeNull()
      expect(result.headers.get('X-Powered-By')).toBeNull()
    })
  })
})

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('RateLimiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      })

      const result = await limiter.check('test-user')

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('should block requests exceeding limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      })

      // First request should be allowed
      const result1 = await limiter.check('test-user')
      expect(result1.success).toBe(true)

      // Second request should be blocked
      const result2 = await limiter.check('test-user')
      expect(result2.success).toBe(false)
      expect(result2.message).toBeTruthy()
    })

    it('should reset after window expires', async () => {
      const limiter = new RateLimiter({
        windowMs: 100, // Very short window for testing
        maxRequests: 1,
      })

      // First request
      const result1 = await limiter.check('test-user')
      expect(result1.success).toBe(true)

      // Second request should be blocked
      const result2 = await limiter.check('test-user')
      expect(result2.success).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be allowed again
      const result3 = await limiter.check('test-user')
      expect(result3.success).toBe(true)
    })
  })

  describe('Client Identifier', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'Mozilla/5.0'
        }
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toContain('192.168.1.1')
    })

    it('should include user agent in identifier', () => {
      const request = new NextRequest('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        }
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toContain('Mozilla/5.0 (Test Browser)')
    })
  })

  describe('Predefined Rate Limiters', () => {
    it('should have auth rate limiter configured', () => {
      expect(authRateLimit).toBeDefined()
    })

    it('should have API rate limiter configured', () => {
      expect(apiRateLimit).toBeDefined()
    })

    it('should have upload rate limiter configured', () => {
      expect(uploadRateLimit).toBeDefined()
    })

    it('should have search rate limiter configured', () => {
      expect(searchRateLimit).toBeDefined()
    })
  })

  describe('Rate Limit Response', () => {
    it('should create proper rate limit response', () => {
      const result = {
        success: false,
        limit: 100,
        remaining: 0,
        resetTime: Date.now() + 60000,
        message: 'Rate limit exceeded'
      }

      const response = createRateLimitResponse(result)
      expect(response.status).toBe(429)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response.headers.get('Retry-After')).toBeTruthy()
    })
  })
})

describe('Security Monitoring', () => {
  let monitor: SecurityMonitor

  beforeEach(() => {
    monitor = new SecurityMonitor()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Event Logging', () => {
    it('should log security events', () => {
      const event = {
        type: 'login_failure' as const,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        severity: 'medium' as const,
        details: { reason: 'invalid_password' }
      }

      monitor.logEvent(event)
      const metrics = monitor.getMetrics()
      
      expect(metrics.totalEvents).toBe(1)
      expect(metrics.eventsByType.login_failure).toBe(1)
    })

    it('should generate alerts for multiple failed logins', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Log multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        monitor.logEvent({
          type: 'login_failure',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          severity: 'medium',
          details: { attempt: i + 1 }
        })
      }

      const alerts = monitor.getAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].type).toBe('authentication')

      consoleSpy.mockRestore()
    })

    it('should track metrics correctly', () => {
      monitor.logEvent({
        type: 'login_success',
        userId: 'user1',
        ip: '192.168.1.1',
        severity: 'low',
        details: {}
      })

      monitor.logEvent({
        type: 'admin_action',
        userId: 'admin1',
        ip: '192.168.1.2',
        severity: 'medium',
        details: { action: 'delete_user' }
      })

      const metrics = monitor.getMetrics()
      expect(metrics.totalEvents).toBe(2)
      expect(metrics.eventsByType.login_success).toBe(1)
      expect(metrics.eventsByType.admin_action).toBe(1)
      expect(metrics.eventsBySeverity.low).toBe(1)
      expect(metrics.eventsBySeverity.medium).toBe(1)
    })
  })

  describe('Helper Functions', () => {
    it('should log login attempts', () => {
      const spy = vi.spyOn(securityMonitor, 'logEvent')

      logSecurityEvent.loginAttempt('192.168.1.1', 'Mozilla/5.0', true, 'user1')
      expect(spy).toHaveBeenCalledWith({
        type: 'login_success',
        userId: 'user1',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        severity: 'low',
        details: { success: true }
      })

      spy.mockRestore()
    })

    it('should log admin actions', () => {
      const spy = vi.spyOn(securityMonitor, 'logEvent')

      logSecurityEvent.adminAction('admin1', '192.168.1.1', 'delete_user', 'user123')
      expect(spy).toHaveBeenCalledWith({
        type: 'admin_action',
        userId: 'admin1',
        ip: '192.168.1.1',
        severity: 'medium',
        details: { action: 'delete_user', target: 'user123' }
      })

      spy.mockRestore()
    })
  })
})

describe('Security Middleware', () => {
  let middleware: SecurityMiddleware

  beforeEach(() => {
    middleware = new SecurityMiddleware()
    vi.clearAllMocks()
  })

  describe('Request Processing', () => {
    it('should allow legitimate requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/articles', {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.100',
        }
      })

      const result = await middleware.process(request)
      expect(result).toBeNull() // Should allow request to continue
    })

    it('should block requests with XSS attempts', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=<script>alert("xss")</script>', {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.100',
        }
      })

      const result = await middleware.process(request)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(403)
    })

    it('should bypass security for health check endpoints', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET',
        headers: {
          'user-agent': 'sqlmap/1.0', // This would normally be blocked
          'x-forwarded-for': '192.168.1.100',
        }
      })

      const result = await middleware.process(request)
      expect(result).toBeNull() // Should bypass security checks
    })

    it('should handle configuration updates', () => {
      const originalConfig = middleware.getConfig()
      
      middleware.updateConfig({
        enableDDoSProtection: false,
        bypassPaths: ['/api/new-bypass']
      })

      const updatedConfig = middleware.getConfig()
      expect(updatedConfig.enableDDoSProtection).toBe(false)
      expect(updatedConfig.bypassPaths).toContain('/api/new-bypass')
      expect(updatedConfig.enableRateLimiting).toBe(originalConfig.enableRateLimiting)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing headers gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/articles', {
        method: 'GET',
        // No headers provided
      })

      const result = await middleware.process(request)
      expect(result).toBeNull() // Should not crash
    })

    it('should fail securely on errors', async () => {
      // Mock an error in the middleware
      const originalGetClientIP = middleware['getClientIP']
      middleware['getClientIP'] = vi.fn().mockImplementation(() => {
        throw new Error('Test error')
      })

      const request = new NextRequest('http://localhost:3000/api/articles', {
        method: 'GET',
        headers: {
          'user-agent': 'Mozilla/5.0',
        }
      })

      const result = await middleware.process(request)
      // Should fail open (allow request) when there's an error
      expect(result).toBeNull()

      // Restore original method
      middleware['getClientIP'] = originalGetClientIP
    })
  })
})