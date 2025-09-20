import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { SecurityHeaders } from './src/lib/security/headers'
import { authRateLimit, apiRateLimit, uploadRateLimit, getClientIdentifier } from './src/lib/security/rate-limit'
import { csrfProtection, needsCSRFProtection } from './src/lib/security/csrf'
import { errorHandler } from './src/lib/security/error-handling'
import { logSecurityEvent } from './src/lib/security/monitoring'

// Initialize security components
const securityHeaders = new SecurityHeaders()

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  try {
    // Create response with security headers
    let response = NextResponse.next()
    response = securityHeaders.applyHeaders(response)

    // Skip security checks for static assets and public routes
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon') ||
      pathname.includes('.') ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml'
    ) {
      return response
    }

    // Apply rate limiting based on route
    const clientId = getClientIdentifier(request)
    let rateLimitResult

    if (pathname.startsWith('/api/auth/')) {
      rateLimitResult = await authRateLimit.check(clientId)
    } else if (pathname.startsWith('/api/upload')) {
      rateLimitResult = await uploadRateLimit.check(clientId)
    } else if (pathname.startsWith('/api/')) {
      rateLimitResult = await apiRateLimit.check(clientId)
    }

    if (rateLimitResult && !rateLimitResult.success) {
      logSecurityEvent.suspiciousActivity(ip, userAgent, 'Rate limit exceeded', {
        path: pathname,
        limit: rateLimitResult.limit,
      })

      return errorHandler.handleRateLimitError(
        errorHandler.extractContext(request),
        Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      )
    }

    // Add rate limit headers if applicable
    if (rateLimitResult) {
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
    }

    // CSRF Protection for state-changing requests
    if (needsCSRFProtection(request)) {
      const csrfResult = await csrfProtection.verifyRequest(request)
      if (!csrfResult.valid) {
        logSecurityEvent.suspiciousActivity(ip, userAgent, 'CSRF violation', {
          path: pathname,
          error: csrfResult.error,
        })

        return errorHandler.handleCSRFError(errorHandler.extractContext(request))
      }
    }

    // Allow access to public routes
    if (
      pathname === '/' ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/articles/') ||
      pathname.startsWith('/search')
    ) {
      return response
    }

    // Get authentication token
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // Log authentication attempts
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      logSecurityEvent.loginAttempt(ip, userAgent, !!token, token?.sub)
    }

    // Protect admin routes
    if (pathname.startsWith('/admin')) {
      if (!token) {
        logSecurityEvent.suspiciousActivity(ip, userAgent, 'Unauthorized admin access attempt', {
          path: pathname,
        })
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }

      if (token.role !== 'admin' && token.role !== 'editor') {
        logSecurityEvent.suspiciousActivity(ip, userAgent, 'Insufficient permissions for admin area', {
          path: pathname,
          userId: token.sub,
          role: token.role,
        })
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url))
      }

      // Log admin access
      logSecurityEvent.adminAction(token.sub!, ip, 'Admin area access', pathname)
    }

    // Protect API routes
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
      if (!token) {
        return errorHandler.handleAuthError(
          new Error('Authentication required'),
          errorHandler.extractContext(request)
        )
      }

      // Check for admin-only API routes
      if (pathname.startsWith('/api/admin/') && token.role !== 'admin') {
        return errorHandler.handleAuthorizationError(
          new Error('Admin access required'),
          errorHandler.extractContext(request)
        )
      }

      // Add user context to response headers for logging
      response.headers.set('X-User-ID', token.sub!)
      response.headers.set('X-User-Role', token.role as string)
    }

    // Security monitoring for suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /javascript:/i,  // JavaScript protocol
      /data:.*base64/i,  // Data URLs
    ]

    const fullUrl = request.url
    if (suspiciousPatterns.some(pattern => pattern.test(fullUrl))) {
      logSecurityEvent.suspiciousActivity(ip, userAgent, 'Suspicious URL pattern detected', {
        url: fullUrl,
        path: pathname,
      })

      return errorHandler.handleSecurityError(
        {
          name: 'SecurityError',
          message: 'Suspicious request pattern detected',
          code: 'SUSPICIOUS_PATTERN',
          severity: 'high',
        },
        errorHandler.extractContext(request)
      )
    }

    return response

  } catch (error) {
    console.error('Middleware error:', error)
    
    // Log the error
    logSecurityEvent.suspiciousActivity(ip, userAgent, 'Middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: pathname,
    })

    // Return error response
    return errorHandler.handleUnexpectedError(
      error instanceof Error ? error : new Error('Middleware error'),
      errorHandler.extractContext(request)
    )
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}