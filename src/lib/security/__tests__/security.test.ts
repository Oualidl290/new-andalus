import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContentSanitizer, validateRequest, securityValidationSchemas } from '../validation'
import { RateLimiter } from '../rate-limit'
import { SecurityHeaders } from '../headers'
import { CSRFProtection } from '../csrf'
import { SecurityMonitor } from '../monitoring'
import { SecurityErrorHandler } from '../error-handling'

// Mock Next.js request/response
const createMockRequest = (options: {
  url?: string
  method?: string
  headers?: Record<string, string>
  ip?: string
  body?: any
}) => {
  const headers = new Headers(options.headers || {})
  return {
    url: options.url || 'http://localhost:3000/api/test',
    method: options.method || 'GET',
    headers,
    ip: options.ip || '127.0.0.1',
    json: async () => options.body || {},
    clone: () => createMockRequest(options),
    nextUrl: {
      pathname: new URL(options.url || 'http://localhost:3000/api/test').pathname,
      search: new URL(options.url || 'http://localhost:3000/api/test').search,
    },
    cookies: {
      get: (name: string) => ({ value: 'mock-cookie-value' }),
    },
  } as any
}

const createMockResponse = () => {
  const headers = new Headers()
  return {
    headers,
    json: (data: any) => ({ json: data, status: 200 }),
  } as any
}

describe('Security Validation', () => {
  describe('ContentSanitizer', () => {
    it('should sanitize HTML correctly', () => {
      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p><iframe src="evil.com"></iframe>'
      const sanitized = ContentSanitizer.sanitizeHTML(maliciousHTML)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('<iframe>')
      expect(sanitized).toContain('<p>Safe content</p>')
    })

    it('should sanitize text by removing HTML tags', () => {
      const text = 'Hello <script>alert("xss")</script> <b>World</b>'
      const sanitized = ContentSanitizer.sanitizeText(text)
      
      expect(sanitized).toBe('Hello  World')
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('<b>')
    })

    it('should sanitize filenames correctly', () => {
      const dangerousFilename = '../../../etc/passwd'
      const sanitized = ContentSanitizer.sanitizeFilename(dangerousFilename)
      
      expect(sanitized).not.toContain('..')
      expect(sanitized).not.toContain('/')
      expect(sanitized).toBe('___etc_passwd')
    })

    it('should validate and sanitize URLs', () => {
      expect(ContentSanitizer.sanitizeURL('https://example.com')).toBe('https://example.com/')
      expect(ContentSanitizer.sanitizeURL('javascript:alert(1)')).toBeNull()
      expect(ContentSanitizer.sanitizeURL('data:text/html,<script>alert(1)</script>')).toBeNull()
      expect(ContentSanitizer.sanitizeURL('ftp://example.com')).toBeNull()
    })

    it('should sanitize database input', () => {
      const maliciousInput = "'; DROP TABLE users; --"
      const sanitized = ContentSanitizer.sanitizeForDatabase(maliciousInput)
      
      expect(sanitized).not.toContain(';')
      expect(sanitized).not.toContain('--')
      expect(sanitized).not.toContain('DROP')
    })
  })

  describe('Schema Validation', () => {
    it('should validate user registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      }
      
      const validator = validateRequest(securityValidationSchemas.userRegistration)
      const result = validator(validData)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.name).toBe('Test User')
      }
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        { email: 'test@example.com', password: '123', name: 'Test' }, // Too short
        { email: 'test@example.com', password: 'password', name: 'Test' }, // No numbers/special chars
        { email: 'test@example.com', password: 'PASSWORD123!', name: 'Test' }, // No lowercase
        { email: 'test@example.com', password: 'password123', name: 'Test' }, // No special chars
        { email: 'test@example.com', password: 'aaaaaaa1!', name: 'Test' }, // Repeated characters
      ]

      const validator = validateRequest(securityValidationSchemas.userRegistration)
      
      weakPasswords.forEach(data => {
        const result = validator(data)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })
    })

    it('should validate article creation data', () => {
      const validData = {
        title: 'Test Article',
        content: {
          type: 'doc' as const,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
        },
        excerpt: 'This is a test article',
        tags: ['test', 'article'],
        status: 'draft' as const,
      }
      
      const validator = validateRequest(securityValidationSchemas.articleCreate)
      const result = validator(validData)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Test Article')
        expect(result.data.status).toBe('draft')
      }
    })

    it('should reject invalid article data', () => {
      const invalidData = {
        title: '', // Empty title
        content: { type: 'invalid' }, // Invalid content type
        tags: Array(15).fill('tag'), // Too many tags
      }
      
      const validator = validateRequest(securityValidationSchemas.articleCreate)
      const result = validator(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })

    it('should validate file upload data', () => {
      const validData = {
        filename: 'test-image.jpg',
        size: 1024 * 1024, // 1MB
        mimeType: 'image/jpeg',
      }
      
      const validator = validateRequest(securityValidationSchemas.fileUpload)
      const result = validator(validData)
      
      expect(result.success).toBe(true)
    })

    it('should reject dangerous file uploads', () => {
      const dangerousFiles = [
        { filename: 'virus.exe', size: 1024, mimeType: 'application/octet-stream' },
        { filename: 'script.js', size: 1024, mimeType: 'text/javascript' },
        { filename: 'shell.php', size: 1024, mimeType: 'application/x-php' },
      ]
      
      const validator = validateRequest(securityValidationSchemas.fileUpload)
      
      dangerousFiles.forEach(data => {
        const result = validator(data)
        expect(result.success).toBe(false)
      })
    })

    it('should validate search queries', () => {
      const validQuery = {
        q: 'test search',
        page: 1,
        limit: 10,
      }
      
      const validator = validateRequest(securityValidationSchemas.searchQuery)
      const result = validator(validQuery)
      
      expect(result.success).toBe(true)
    })

    it('should reject malicious search queries', () => {
      const maliciousQueries = [
        { q: '<script>alert(1)</script>' },
        { q: "'; DROP TABLE articles; --" },
        { q: 'test OR 1=1' },
      ]
      
      const validator = validateRequest(securityValidationSchemas.searchQuery)
      
      maliciousQueries.forEach(data => {
        const result = validator(data)
        expect(result.success).toBe(false)
      })
    })
  })
})

describe('Rate Limiting', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 5,
    })
  })

  it('should allow requests within limit', async () => {
    const identifier = 'test-user-1'
    
    for (let i = 0; i < 5; i++) {
      const result = await rateLimiter.check(identifier)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4 - i)
    }
  })

  it('should block requests exceeding limit', async () => {
    const identifier = 'test-user-2'
    
    // Make 5 allowed requests
    for (let i = 0; i < 5; i++) {
      await rateLimiter.check(identifier)
    }
    
    // 6th request should be blocked
    const result = await rateLimiter.check(identifier)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should reset limit after time window', async () => {
    const identifier = 'test-user-3'
    
    // Exhaust the limit
    for (let i = 0; i < 6; i++) {
      await rateLimiter.check(identifier)
    }
    
    // Reset the user's limit manually (simulating time passage)
    await rateLimiter.reset(identifier)
    
    const result = await rateLimiter.check(identifier)
    expect(result.success).toBe(true)
  })
})

describe('Security Headers', () => {
  let securityHeaders: SecurityHeaders

  beforeEach(() => {
    securityHeaders = new SecurityHeaders()
  })

  it('should generate correct security headers', () => {
    const headers = securityHeaders.getHeaders()
    
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
  })

  it('should apply headers to response', () => {
    const response = createMockResponse()
    const updatedResponse = securityHeaders.applyHeaders(response)
    
    expect(updatedResponse.headers.get('X-Frame-Options')).toBe('DENY')
    expect(updatedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('should generate CSP with correct directives', () => {
    const headers = securityHeaders.getHeaders()
    const csp = headers['Content-Security-Policy']
    
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("script-src 'self'")
  })
})

describe('CSRF Protection', () => {
  let csrfProtection: CSRFProtection

  beforeEach(() => {
    csrfProtection = new CSRFProtection()
  })

  it('should generate valid CSRF tokens', () => {
    const token = csrfProtection.generateToken()
    
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
    expect(token.split(':').length).toBe(3) // randomToken:timestamp:signature
  })

  it('should validate correct CSRF tokens', () => {
    const token = csrfProtection.generateToken()
    const isValid = csrfProtection.validateToken(token)
    
    expect(isValid).toBe(true)
  })

  it('should reject invalid CSRF tokens', () => {
    const invalidTokens = [
      'invalid-token',
      'too:few:parts',
      'too:many:parts:here:invalid',
      '',
    ]
    
    invalidTokens.forEach(token => {
      const isValid = csrfProtection.validateToken(token)
      expect(isValid).toBe(false)
    })
  })

  it('should extract tokens from requests', () => {
    const token = 'test-csrf-token'
    const request = createMockRequest({
      headers: { 'x-csrf-token': token }
    })
    
    const extractedToken = csrfProtection.extractToken(request)
    expect(extractedToken).toBe(token)
  })

  it('should verify requests correctly', async () => {
    // GET request should pass without token
    const getRequest = createMockRequest({ method: 'GET' })
    const getResult = await csrfProtection.verifyRequest(getRequest)
    expect(getResult.valid).toBe(true)
    
    // POST request without token should fail
    const postRequest = createMockRequest({ method: 'POST' })
    const postResult = await csrfProtection.verifyRequest(postRequest)
    expect(postResult.valid).toBe(false)
  })
})

describe('Security Monitoring', () => {
  let monitor: SecurityMonitor

  beforeEach(() => {
    monitor = new SecurityMonitor()
  })

  it('should log security events', () => {
    const event = {
      type: 'login_failure' as const,
      ip: '192.168.1.1',
      userAgent: 'Test Browser',
      severity: 'medium' as const,
    }
    
    monitor.logEvent(event)
    const metrics = monitor.getMetrics()
    
    expect(metrics.totalEvents).toBe(1)
    expect(metrics.eventsByType['login_failure']).toBe(1)
  })

  it('should generate alerts for suspicious patterns', () => {
    const ip = '192.168.1.2'
    
    // Generate multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      monitor.logEvent({
        type: 'login_failure',
        ip,
        userAgent: 'Test Browser',
        severity: 'medium',
      })
    }
    
    const alerts = monitor.getAlerts()
    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts[0].type).toBe('authentication')
  })

  it('should track security metrics', () => {
    // Log various events
    monitor.logEvent({ type: 'login_success', ip: '192.168.1.3', severity: 'low' })
    monitor.logEvent({ type: 'suspicious_activity', ip: '192.168.1.4', severity: 'high' })
    monitor.logEvent({ type: 'file_upload', ip: '192.168.1.5', severity: 'low' })
    
    const metrics = monitor.getMetrics()
    expect(metrics.totalEvents).toBe(3)
    expect(metrics.eventsByType['login_success']).toBe(1)
    expect(metrics.suspiciousActivities).toBe(1)
  })

  it('should resolve alerts', () => {
    // Generate an alert
    for (let i = 0; i < 6; i++) {
      monitor.logEvent({
        type: 'login_failure',
        ip: '192.168.1.6',
        severity: 'medium',
      })
    }
    
    const alerts = monitor.getAlerts()
    expect(alerts.length).toBeGreaterThan(0)
    
    const alertId = alerts[0].id
    const resolved = monitor.resolveAlert(alertId, 'admin')
    
    expect(resolved).toBe(true)
    expect(alerts[0].resolved).toBe(true)
    expect(alerts[0].resolvedBy).toBe('admin')
  })
})

describe('Error Handling', () => {
  let errorHandler: SecurityErrorHandler

  beforeEach(() => {
    errorHandler = SecurityErrorHandler.getInstance()
  })

  it('should create standardized error responses', () => {
    const error = new Error('Test error')
    const response = errorHandler.createErrorResponse(error, 500)
    
    expect(response).toBeTruthy()
    // In a real test, you'd check the response structure
  })

  it('should handle validation errors', () => {
    const validationError = new Error('Validation failed')
    validationError.name = 'ZodError'
    
    // Mock ZodError structure
    const zodError = {
      errors: [
        { path: ['email'], message: 'Invalid email', code: 'invalid_string' }
      ]
    } as any
    
    const response = errorHandler.handleValidationError(zodError)
    expect(response).toBeTruthy()
  })

  it('should extract context from requests', () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/test',
      method: 'POST',
      headers: {
        'user-agent': 'Test Browser',
        'x-forwarded-for': '192.168.1.1',
      }
    })
    
    const context = errorHandler.extractContext(request)
    
    expect(context.url).toBe('http://localhost:3000/api/test')
    expect(context.method).toBe('POST')
    expect(context.userAgent).toBe('Test Browser')
    expect(context.ip).toBe('192.168.1.1')
  })
})

describe('Security Integration', () => {
  it('should work together to provide comprehensive protection', async () => {
    const monitor = new SecurityMonitor()
    const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 3 })
    const csrfProtection = new CSRFProtection()
    
    const ip = '192.168.1.100'
    const userAgent = 'Integration Test Browser'
    
    // Simulate attack scenario
    for (let i = 0; i < 5; i++) {
      const request = createMockRequest({ 
        ip, 
        headers: { 'user-agent': userAgent },
        method: 'POST'
      })
      
      // Check rate limit
      const rateLimitResult = await rateLimiter.check(ip)
      if (rateLimitResult.success) {
        // Check CSRF (will fail without token)
        const csrfResult = await csrfProtection.verifyRequest(request)
        if (!csrfResult.valid) {
          // Log security event
          monitor.logEvent({
            type: 'csrf_violation',
            ip,
            userAgent,
            severity: 'high',
          })
        }
      } else {
        // Log rate limit violation
        monitor.logEvent({
          type: 'rate_limit',
          ip,
          userAgent,
          severity: 'medium',
        })
      }
    }
    
    // Verify that security measures are working
    const metrics = monitor.getMetrics()
    expect(metrics.totalEvents).toBeGreaterThan(0)
    
    const alerts = monitor.getAlerts()
    expect(alerts.length).toBeGreaterThan(0)
  })
})