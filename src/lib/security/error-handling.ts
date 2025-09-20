import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logSecurityEvent } from './monitoring'

export interface ErrorContext {
  requestId: string
  timestamp: Date
  url: string
  method: string
  userAgent?: string
  ip?: string
  userId?: string
  sessionId?: string
}

export interface SecurityError extends Error {
  code: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: Record<string, any>
  shouldLog?: boolean
  shouldAlert?: boolean
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
  requestId: string
}

export class SecurityErrorHandler {
  private static instance: SecurityErrorHandler
  private errorCounts = new Map<string, number>()
  private lastCleanup = Date.now()

  private constructor() {}

  static getInstance(): SecurityErrorHandler {
    if (!SecurityErrorHandler.instance) {
      SecurityErrorHandler.instance = new SecurityErrorHandler()
    }
    return SecurityErrorHandler.instance
  }

  /**
   * Extract context from request
   */
  extractContext(request: NextRequest): ErrorContext {
    return {
      requestId: this.generateRequestId(),
      timestamp: new Date(),
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.extractIP(request),
      // userId and sessionId would be extracted from auth context
    }
  }

  /**
   * Extract IP address from request
   */
  private extractIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')
    
    return forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Handle validation errors (Zod)
   */
  handleValidationError(error: ZodError, context?: ErrorContext): NextResponse {
    const formattedErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }))

    if (context) {
      logSecurityEvent.suspiciousActivity(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        'Validation error',
        { errors: formattedErrors, url: context.url }
      )
    }

    return this.createErrorResponse(
      {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: formattedErrors,
      },
      400,
      context
    )
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: Error, context?: ErrorContext): NextResponse {
    if (context) {
      logSecurityEvent.loginAttempt(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        false
      )
    }

    // Don't expose sensitive auth details
    return this.createErrorResponse(
      {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
      401,
      context
    )
  }

  /**
   * Handle authorization errors
   */
  handleAuthorizationError(error: Error, context?: ErrorContext): NextResponse {
    if (context) {
      logSecurityEvent.suspiciousActivity(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        'Authorization violation',
        { url: context.url, error: error.message }
      )
    }

    return this.createErrorResponse(
      {
        code: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions',
      },
      403,
      context
    )
  }

  /**
   * Handle rate limiting errors
   */
  handleRateLimitError(context?: ErrorContext, retryAfter?: number): NextResponse {
    if (context) {
      logSecurityEvent.suspiciousActivity(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        'Rate limit exceeded',
        { url: context.url }
      )
    }

    const response = this.createErrorResponse(
      {
        code: 'RATE_LIMIT_ERROR',
        message: 'Too many requests',
        details: retryAfter ? { retryAfter } : undefined,
      },
      429,
      context
    )

    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString())
    }

    return response
  }

  /**
   * Handle CSRF errors
   */
  handleCSRFError(context?: ErrorContext): NextResponse {
    if (context) {
      logSecurityEvent.suspiciousActivity(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        'CSRF violation',
        { url: context.url }
      )
    }

    return this.createErrorResponse(
      {
        code: 'CSRF_ERROR',
        message: 'CSRF token validation failed',
      },
      403,
      context
    )
  }

  /**
   * Handle file upload errors
   */
  handleUploadError(error: Error, context?: ErrorContext): NextResponse {
    if (context) {
      logSecurityEvent.suspiciousActivity(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        'File upload error',
        { url: context.url, error: error.message }
      )
    }

    return this.createErrorResponse(
      {
        code: 'UPLOAD_ERROR',
        message: 'File upload failed',
        details: this.sanitizeErrorMessage(error.message),
      },
      400,
      context
    )
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(error: Error, context?: ErrorContext): NextResponse {
    // Log database errors but don't expose details
    console.error('Database error:', error)

    if (context) {
      logSecurityEvent.suspiciousActivity(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        'Database error',
        { url: context.url }
      )
    }

    return this.createErrorResponse(
      {
        code: 'DATABASE_ERROR',
        message: 'Internal server error',
      },
      500,
      context
    )
  }

  /**
   * Handle generic security errors
   */
  handleSecurityError(error: SecurityError, context?: ErrorContext): NextResponse {
    if (error.shouldLog !== false) {
      console.error('Security error:', error)
    }

    if (context && error.shouldAlert !== false) {
      logSecurityEvent.suspiciousActivity(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        error.code,
        { url: context.url, error: error.message, context: error.context }
      )
    }

    const statusCode = this.getStatusCodeForSeverity(error.severity)

    return this.createErrorResponse(
      {
        code: error.code,
        message: this.sanitizeErrorMessage(error.message),
        details: error.context,
      },
      statusCode,
      context
    )
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(
    error: { code: string; message: string; details?: any },
    status: number,
    context?: ErrorContext
  ): NextResponse {
    const response: ErrorResponse = {
      error,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId || this.generateRequestId(),
    }

    // Track error frequency for monitoring
    this.trackError(error.code)

    return NextResponse.json(response, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': response.requestId,
      },
    })
  }

  /**
   * Get appropriate status code based on error severity
   */
  private getStatusCodeForSeverity(severity: SecurityError['severity']): number {
    switch (severity) {
      case 'low':
        return 400
      case 'medium':
        return 403
      case 'high':
        return 403
      case 'critical':
        return 403
      default:
        return 500
    }
  }

  /**
   * Sanitize error messages to prevent information disclosure
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    return message
      .replace(/password/gi, '[REDACTED]')
      .replace(/token/gi, '[REDACTED]')
      .replace(/secret/gi, '[REDACTED]')
      .replace(/key/gi, '[REDACTED]')
      .replace(/\b\d{4,}\b/g, '[REDACTED]') // Remove numbers that might be IDs
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]') // Remove emails
  }

  /**
   * Track error frequency for monitoring
   */
  private trackError(errorCode: string): void {
    const count = this.errorCounts.get(errorCode) || 0
    this.errorCounts.set(errorCode, count + 1)

    // Cleanup old counts periodically
    const now = Date.now()
    if (now - this.lastCleanup > 60 * 60 * 1000) { // 1 hour
      this.cleanupErrorCounts()
      this.lastCleanup = now
    }
  }

  /**
   * Clean up error counts to prevent memory leaks
   */
  private cleanupErrorCounts(): void {
    // Keep only the most frequent errors
    const entries = Array.from(this.errorCounts.entries())
    entries.sort(([, a], [, b]) => b - a)
    
    this.errorCounts.clear()
    entries.slice(0, 100).forEach(([code, count]) => {
      this.errorCounts.set(code, count)
    })
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts)
  }

  /**
   * Handle unexpected errors
   */
  handleUnexpectedError(error: Error, context?: ErrorContext): NextResponse {
    console.error('Unexpected error:', error)

    if (context) {
      logSecurityEvent.suspiciousActivity(
        context.ip || 'unknown',
        context.userAgent || 'unknown',
        'Unexpected error',
        { url: context.url, error: error.message, stack: error.stack }
      )
    }

    return this.createErrorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      500,
      context
    )
  }
}

// Global error handler instance
export const errorHandler = SecurityErrorHandler.getInstance()

// Error handling middleware
export function withErrorHandling() {
  return async (request: NextRequest, handler: () => Promise<NextResponse>) => {
    try {
      return await handler()
    } catch (error) {
      const context = errorHandler.extractContext(request)

      if (error instanceof ZodError) {
        return errorHandler.handleValidationError(error, context)
      }

      if (error instanceof Error) {
        // Check if it's a known security error
        const securityError = error as SecurityError
        if (securityError.code && securityError.severity) {
          return errorHandler.handleSecurityError(securityError, context)
        }

        // Handle specific error types
        if (error.name === 'AuthenticationError') {
          return errorHandler.handleAuthError(error, context)
        }

        if (error.name === 'AuthorizationError') {
          return errorHandler.handleAuthorizationError(error, context)
        }

        if (error.name === 'DatabaseError') {
          return errorHandler.handleDatabaseError(error, context)
        }

        // Handle unexpected errors
        return errorHandler.handleUnexpectedError(error, context)
      }

      // Fallback for non-Error objects
      return errorHandler.handleUnexpectedError(new Error('Unknown error'), context)
    }
  }
}

// Custom error classes
export class AuthenticationError extends Error {
  name = 'AuthenticationError'
  constructor(message = 'Authentication failed') {
    super(message)
  }
}

export class AuthorizationError extends Error {
  name = 'AuthorizationError'
  constructor(message = 'Insufficient permissions') {
    super(message)
  }
}

export class ValidationError extends Error {
  name = 'ValidationError'
  constructor(message = 'Validation failed') {
    super(message)
  }
}

export class RateLimitError extends Error {
  name = 'RateLimitError'
  retryAfter?: number
  
  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message)
    this.retryAfter = retryAfter
  }
}

export class CSRFError extends Error {
  name = 'CSRFError'
  constructor(message = 'CSRF token validation failed') {
    super(message)
  }
}

export class UploadError extends Error {
  name = 'UploadError'
  constructor(message = 'File upload failed') {
    super(message)
  }
}

export class DatabaseError extends Error {
  name = 'DatabaseError'
  constructor(message = 'Database operation failed') {
    super(message)
  }
}

// Error boundary for React components (to be used in frontend)
export function createErrorBoundary() {
  return {
    componentDidCatch(error: Error, errorInfo: any) {
      console.error('React error boundary caught error:', error, errorInfo)
      
      // Log to monitoring service
      logSecurityEvent.suspiciousActivity(
        'unknown',
        navigator.userAgent,
        'React error boundary',
        { error: error.message, stack: error.stack, errorInfo }
      )
    }
  }
}

// Async error handler for promises
export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: ErrorContext
): Promise<T | NextResponse> {
  return promise.catch(error => {
    if (error instanceof ZodError) {
      return errorHandler.handleValidationError(error, context)
    }
    
    if (error instanceof Error) {
      return errorHandler.handleUnexpectedError(error, context)
    }
    
    return errorHandler.handleUnexpectedError(new Error('Unknown async error'), context)
  })
}