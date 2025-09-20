import { describe, it, expect } from 'vitest'
import { ContentSanitizer, validateRequest, securityValidationSchemas } from '../validation'
import { RateLimiter } from '../rate-limit'
import { SecurityHeaders } from '../headers'

describe('Security Components', () => {
  describe('ContentSanitizer', () => {
    it('should sanitize HTML correctly', () => {
      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>'
      const sanitized = ContentSanitizer.sanitizeHTML(maliciousHTML)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('<p>Safe content</p>')
    })

    it('should sanitize text by removing HTML tags', () => {
      const text = 'Hello <script>alert("xss")</script> World'
      const sanitized = ContentSanitizer.sanitizeText(text)
      
      expect(sanitized).toBe('Hello  World')
    })

    it('should sanitize filenames correctly', () => {
      const filename = '../../../etc/passwd'
      const sanitized = ContentSanitizer.sanitizeFilename(filename)
      
      expect(sanitized).not.toContain('..')
      expect(sanitized).not.toContain('/')
    })

    it('should validate and sanitize URLs', () => {
      expect(ContentSanitizer.sanitizeURL('https://example.com')).toBe('https://example.com/')
      expect(ContentSanitizer.sanitizeURL('javascript:alert(1)')).toBeNull()
      expect(ContentSanitizer.sanitizeURL('data:text/html,<script>alert(1)</script>')).toBeNull()
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
      const weakData = {
        email: 'test@example.com',
        password: '123', // Too weak
        name: 'Test User',
      }
      
      const validator = validateRequest(securityValidationSchemas.userRegistration)
      const result = validator(weakData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
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
      const dangerousData = {
        filename: 'virus.exe',
        size: 1024,
        mimeType: 'application/octet-stream',
      }
      
      const validator = validateRequest(securityValidationSchemas.fileUpload)
      const result = validator(dangerousData)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 5,
      })
      
      const identifier = 'test-user-1'
      
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.check(identifier)
        expect(result.success).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('should block requests exceeding limit', async () => {
      const rateLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      })
      
      const identifier = 'test-user-2'
      
      // Make 3 allowed requests
      for (let i = 0; i < 3; i++) {
        await rateLimiter.check(identifier)
      }
      
      // 4th request should be blocked
      const result = await rateLimiter.check(identifier)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe('Security Headers', () => {
    it('should generate correct security headers', () => {
      const securityHeaders = new SecurityHeaders()
      const headers = securityHeaders.getHeaders()
      
      expect(headers['X-Frame-Options']).toBe('DENY')
      expect(headers['X-Content-Type-Options']).toBe('nosniff')
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    })

    it('should generate CSP with correct directives', () => {
      const securityHeaders = new SecurityHeaders()
      const headers = securityHeaders.getHeaders()
      const csp = headers['Content-Security-Policy']
      
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("object-src 'none'")
      expect(csp).toContain("script-src 'self'")
    })
  })
})

describe('Security Integration', () => {
  it('should work together to provide comprehensive protection', async () => {
    // Test that multiple security components can work together
    const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 3 })
    const securityHeaders = new SecurityHeaders()
    
    const ip = '192.168.1.100'
    
    // Check rate limit
    const rateLimitResult = await rateLimiter.check(ip)
    expect(rateLimitResult.success).toBe(true)
    
    // Get security headers
    const headers = securityHeaders.getHeaders()
    expect(Object.keys(headers).length).toBeGreaterThan(0)
    
    // Validate input
    const validator = validateRequest(securityValidationSchemas.userRegistration)
    const validationResult = validator({
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User'
    })
    expect(validationResult.success).toBe(true)
  })
})