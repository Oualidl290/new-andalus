import { NextRequest, NextResponse } from 'next/server'
import { applySecurityHeaders } from './headers'
import { authRateLimit, apiRateLimit, uploadRateLimit, searchRateLimit, withRateLimit } from './rate-limit'
import { validateCSRFToken } from './csrf'
import { logSecurityEvent, securityMonitor } from './monitoring'
import { userRegistrationSchema, articleCreateSchema } from '../validation/schemas'

export interface SecurityMiddlewareConfig {
  enableDDoSProtection: boolean
  enableRateLimiting: boolean
  enableCSRFProtection: boolean
  enableSecurityHeaders: boolean
  enableSecurityLogging: boolean
  trustedProxies: string[]
  bypassPaths: string[]
}

export const DEFAULT_SECURITY_MIDDLEWARE_CONFIG: SecurityMiddlewareConfig = {
  enableDDoSProtection: true,
  enableRateLimiting: true,
  enableCSRFProtection: true,
  enableSecurityHeaders: true,
  enableSecurityLogging: true,
  trustedProxies: ['127.0.0.1', '::1'],
  bypassPaths: ['/api/health', '/api/metrics'],
}

export class SecurityMiddleware {
  private config: SecurityMiddlewareConfig

  constructor(config: Partial<SecurityMiddlewareConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_MIDDLEWARE_CONFIG, ...config }
  }

  async process(request: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now()
    const path = request.nextUrl.pathname
    const method = request.method
    const ip = this.getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Skip security checks for bypass paths
    if (this.config.bypassPaths.includes(path)) {
      return null
    }

    try {
      // Log request if security logging is enabled
      if (this.config.enableSecurityLogging) {
        this.logRequest(request, ip, userAgent)
      }

      // Apply DDoS protection
      if (this.config.enableDDoSProtection) {
        const ddosResult = ddosProtection.checkRequest(request)
        if (!ddosResult.allowed) {
          this.logSecurityEvent('ddos_blocked', ip, userAgent, {
            reason: ddosResult.reason,
            path,
            method
          })
          
          return NextResponse.json(
            { error: 'Request blocked due to suspicious activity' },
            { status: 429, headers: { 'Retry-After': '300' } }
          )
        }
      }

      // Apply rate limiting based on path
      if (this.config.enableRateLimiting) {
        const rateLimitResult = await this.applyRateLimiting(request, path)
        if (rateLimitResult) {
          this.logSecurityEvent('rate_limit_exceeded', ip, userAgent, {
            path,
            method,
            rateLimitType: this.getRateLimitType(path)
          })
          return rateLimitResult
        }
      }

      // CSRF protection for state-changing operations
      if (this.config.enableCSRFProtection && this.requiresCSRFProtection(method, path)) {
        const csrfValid = await validateCSRFToken(request)
        if (!csrfValid) {
          this.logSecurityEvent('csrf_validation_failed', ip, userAgent, {
            path,
            method
          })
          
          return NextResponse.json(
            { error: 'Invalid or missing CSRF token' },
            { status: 403 }
          )
        }
      }

      // Input validation for API endpoints
      if (path.startsWith('/api/') && ['POST', 'PUT', 'PATCH'].includes(method)) {
        const validationResult = await this.validateRequestInput(request)
        if (!validationResult.valid) {
          this.logSecurityEvent('input_validation_failed', ip, userAgent, {
            path,
            method,
            errors: validationResult.errors
          })
          
          return NextResponse.json(
            { error: 'Invalid input data', details: validationResult.errors },
            { status: 400 }
          )
        }
      }

      // Check for suspicious patterns
      const suspiciousResult = this.checkSuspiciousPatterns(request, ip, userAgent)
      if (suspiciousResult.isSuspicious) {
        this.logSecurityEvent('suspicious_activity', ip, userAgent, {
          path,
          method,
          patterns: suspiciousResult.patterns,
          severity: suspiciousResult.severity
        })

        if (suspiciousResult.severity === 'high') {
          return NextResponse.json(
            { error: 'Request blocked due to suspicious activity' },
            { status: 403 }
          )
        }
      }

      // Log successful security check
      if (this.config.enableSecurityLogging) {
        const processingTime = Date.now() - startTime
        if (processingTime > 1000) { // Log slow security checks
          console.warn(`Slow security middleware processing: ${processingTime}ms for ${path}`)
        }
      }

      return null // Allow request to continue

    } catch (error) {
      console.error('Security middleware error:', error)
      
      this.logSecurityEvent('middleware_error', ip, userAgent, {
        path,
        method,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      // Fail securely - allow request but log the error
      return null
    }
  }

  private getClientIP(request: NextRequest): string {
    // Check for forwarded IP headers (from load balancers/proxies)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip') // Cloudflare
    
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ips = forwarded.split(',').map(ip => ip.trim())
      return ips[0]
    }
    
    if (cfConnectingIp) return cfConnectingIp
    if (realIp) return realIp
    
    // Fallback to request IP
    return request.ip || 'unknown'
  }

  private logRequest(request: NextRequest, ip: string, userAgent: string): void {
    const path = request.nextUrl.pathname
    const method = request.method
    
    // Log high-value endpoints
    const sensitiveEndpoints = [
      '/api/auth/',
      '/api/admin/',
      '/api/users/',
      '/api/upload/',
    ]

    if (sensitiveEndpoints.some(endpoint => path.startsWith(endpoint))) {
      console.log(`Security: ${method} ${path} from ${ip}`)
    }
  }

  private async applyRateLimiting(request: NextRequest, path: string): Promise<NextResponse | null> {
    let rateLimitResult = null

    if (path.startsWith('/api/auth/')) {
      rateLimitResult = await rateLimiters.auth.middleware()(request)
    } else if (path.startsWith('/api/upload/')) {
      rateLimitResult = await rateLimiters.upload.middleware()(request)
    } else if (path.startsWith('/api/search/')) {
      rateLimitResult = await rateLimiters.search.middleware()(request)
    } else if (path.startsWith('/api/admin/')) {
      rateLimitResult = await rateLimiters.admin.middleware()(request)
    } else if (path.startsWith('/api/')) {
      rateLimitResult = await rateLimiters.general.middleware()(request)
    }

    return rateLimitResult
  }

  private getRateLimitType(path: string): string {
    if (path.startsWith('/api/auth/')) return 'auth'
    if (path.startsWith('/api/upload/')) return 'upload'
    if (path.startsWith('/api/search/')) return 'search'
    if (path.startsWith('/api/admin/')) return 'admin'
    if (path.startsWith('/api/')) return 'general'
    return 'unknown'
  }

  private requiresCSRFProtection(method: string, path: string): boolean {
    // CSRF protection for state-changing operations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return false
    }

    // Skip CSRF for certain endpoints (like webhooks)
    const skipCSRFPaths = [
      '/api/webhooks/',
      '/api/auth/callback',
    ]

    return !skipCSRFPaths.some(skipPath => path.startsWith(skipPath))
  }

  private async validateRequestInput(request: NextRequest): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const contentType = request.headers.get('content-type')
      
      if (!contentType?.includes('application/json')) {
        return { valid: true } // Skip validation for non-JSON requests
      }

      const body = await request.clone().json()
      
      // Basic input validation
      const errors: string[] = []

      // Check for common injection patterns
      const dangerousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
        /(union|select|insert|update|delete|drop|create|alter)\s+/gi,
      ]

      const checkValue = (value: any, path: string = ''): void => {
        if (typeof value === 'string') {
          dangerousPatterns.forEach(pattern => {
            if (pattern.test(value)) {
              errors.push(`Potentially dangerous content detected in ${path || 'request body'}`)
            }
          })
          
          // Check for excessively long strings
          if (value.length > 10000) {
            errors.push(`Excessively long string in ${path || 'request body'}`)
          }
        } else if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([key, val]) => {
            checkValue(val, path ? `${path}.${key}` : key)
          })
        }
      }

      checkValue(body)

      return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined }

    } catch (error) {
      // If we can't parse the body, let it through (other middleware will handle it)
      return { valid: true }
    }
  }

  private checkSuspiciousPatterns(
    request: NextRequest, 
    ip: string, 
    userAgent: string
  ): { isSuspicious: boolean; patterns: string[]; severity: 'low' | 'medium' | 'high' } {
    const patterns: string[] = []
    const path = request.nextUrl.pathname
    const query = request.nextUrl.search

    // Check for suspicious user agents
    const suspiciousUserAgents = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /curl/i,
      /wget/i,
      /python/i,
    ]

    if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
      patterns.push('suspicious_user_agent')
    }

    // Check for path traversal attempts
    if (path.includes('../') || path.includes('..\\') || path.includes('%2e%2e')) {
      patterns.push('path_traversal')
    }

    // Check for SQL injection patterns in query
    const sqlPatterns = [
      /union\s+select/i,
      /or\s+1\s*=\s*1/i,
      /and\s+1\s*=\s*1/i,
      /'\s*or\s*'/i,
      /'\s*and\s*'/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /update\s+set/i,
      /delete\s+from/i,
    ]

    if (sqlPatterns.some(pattern => pattern.test(query))) {
      patterns.push('sql_injection')
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ]

    if (xssPatterns.some(pattern => pattern.test(query) || pattern.test(path))) {
      patterns.push('xss_attempt')
    }

    // Check for common attack paths
    const attackPaths = [
      '/wp-admin',
      '/phpmyadmin',
      '/.env',
      '/config.php',
      '/admin.php',
      '/wp-config.php',
      '/.git/',
      '/etc/passwd',
      '/proc/version',
    ]

    if (attackPaths.some(attackPath => path.includes(attackPath))) {
      patterns.push('attack_path')
    }

    // Determine severity
    let severity: 'low' | 'medium' | 'high' = 'low'
    
    if (patterns.includes('sql_injection') || patterns.includes('xss_attempt')) {
      severity = 'high'
    } else if (patterns.includes('path_traversal') || patterns.includes('attack_path')) {
      severity = 'medium'
    }

    return {
      isSuspicious: patterns.length > 0,
      patterns,
      severity
    }
  }

  private logSecurityEvent(
    type: string, 
    ip: string, 
    userAgent: string, 
    details: Record<string, any>
  ): void {
    if (!this.config.enableSecurityLogging) return

    const eventType = type as any // Type assertion for flexibility
    const severity = this.getSeverityForEventType(type)

    securityMonitor.logEvent({
      type: eventType,
      ip,
      userAgent,
      severity,
      details
    })
  }

  private getSeverityForEventType(type: string): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'ddos_blocked': 'high',
      'rate_limit_exceeded': 'medium',
      'csrf_validation_failed': 'high',
      'input_validation_failed': 'medium',
      'suspicious_activity': 'high',
      'middleware_error': 'medium',
    }

    return severityMap[type] || 'medium'
  }

  updateConfig(newConfig: Partial<SecurityMiddlewareConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): SecurityMiddlewareConfig {
    return { ...this.config }
  }
}

// Global security middleware instance
export const securityMiddleware = new SecurityMiddleware()

// Convenience function for applying security middleware
export async function applySecurityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  return securityMiddleware.process(request)
}

// Function to apply security headers to responses
export function withSecurityHeaders(response: NextResponse): NextResponse {
  return applySecurityHeaders(response)
}

// Middleware wrapper for API routes
export function withSecurity(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  config?: Partial<SecurityMiddlewareConfig>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const middleware = config ? new SecurityMiddleware(config) : securityMiddleware
    
    // Apply security checks
    const securityResult = await middleware.process(req)
    if (securityResult) {
      return withSecurityHeaders(securityResult)
    }

    // Execute the handler
    const response = await handler(req)
    
    // Apply security headers to the response
    return withSecurityHeaders(response)
  }
}