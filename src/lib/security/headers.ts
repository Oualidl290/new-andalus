import { NextRequest, NextResponse } from 'next/server'

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string | CSPDirectives
  strictTransportSecurity?: string | boolean
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | string
  xContentTypeOptions?: boolean
  referrerPolicy?: string
  permissionsPolicy?: string
  crossOriginEmbedderPolicy?: string
  crossOriginOpenerPolicy?: string
  crossOriginResourcePolicy?: string
}

export interface CSPDirectives {
  'default-src'?: string[]
  'script-src'?: string[]
  'style-src'?: string[]
  'img-src'?: string[]
  'font-src'?: string[]
  'connect-src'?: string[]
  'media-src'?: string[]
  'object-src'?: string[]
  'child-src'?: string[]
  'worker-src'?: string[]
  'frame-src'?: string[]
  'form-action'?: string[]
  'base-uri'?: string[]
  'manifest-src'?: string[]
  'upgrade-insecure-requests'?: boolean
  'block-all-mixed-content'?: boolean
}

const defaultCSPDirectives: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js in development
    "'unsafe-eval'", // Required for Next.js in development
    'https://vercel.live',
    'https://va.vercel-scripts.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and CSS-in-JS
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://vercel.live',
    'https://vitals.vercel-insights.com',
  ],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'child-src': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'frame-src': ["'self'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': true,
}

const defaultSecurityHeaders: SecurityHeadersConfig = {
  contentSecurityPolicy: defaultCSPDirectives,
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  referrerPolicy: 'origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
}

export class SecurityHeaders {
  private config: SecurityHeadersConfig

  constructor(config: SecurityHeadersConfig = {}) {
    this.config = { ...defaultSecurityHeaders, ...config }
  }

  // Convert CSP directives object to string
  private buildCSPString(directives: CSPDirectives): string {
    const cspParts: string[] = []

    Object.entries(directives).forEach(([directive, value]) => {
      if (value === true) {
        cspParts.push(directive)
      } else if (Array.isArray(value) && value.length > 0) {
        cspParts.push(`${directive} ${value.join(' ')}`)
      }
    })

    return cspParts.join('; ')
  }

  // Get all security headers
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}

    // Content Security Policy
    if (this.config.contentSecurityPolicy) {
      const csp = typeof this.config.contentSecurityPolicy === 'string'
        ? this.config.contentSecurityPolicy
        : this.buildCSPString(this.config.contentSecurityPolicy)
      
      headers['Content-Security-Policy'] = csp
    }

    // Strict Transport Security
    if (this.config.strictTransportSecurity) {
      const hsts = this.config.strictTransportSecurity === true
        ? 'max-age=31536000; includeSubDomains'
        : this.config.strictTransportSecurity
      
      headers['Strict-Transport-Security'] = hsts
    }

    // X-Frame-Options
    if (this.config.xFrameOptions) {
      headers['X-Frame-Options'] = this.config.xFrameOptions
    }

    // X-Content-Type-Options
    if (this.config.xContentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff'
    }

    // Referrer Policy
    if (this.config.referrerPolicy) {
      headers['Referrer-Policy'] = this.config.referrerPolicy
    }

    // Permissions Policy
    if (this.config.permissionsPolicy) {
      headers['Permissions-Policy'] = this.config.permissionsPolicy
    }

    // Cross-Origin Embedder Policy
    if (this.config.crossOriginEmbedderPolicy) {
      headers['Cross-Origin-Embedder-Policy'] = this.config.crossOriginEmbedderPolicy
    }

    // Cross-Origin Opener Policy
    if (this.config.crossOriginOpenerPolicy) {
      headers['Cross-Origin-Opener-Policy'] = this.config.crossOriginOpenerPolicy
    }

    // Cross-Origin Resource Policy
    if (this.config.crossOriginResourcePolicy) {
      headers['Cross-Origin-Resource-Policy'] = this.config.crossOriginResourcePolicy
    }

    return headers
  }

  // Apply headers to a NextResponse
  applyHeaders(response: NextResponse): NextResponse {
    const headers = this.getHeaders()
    
    Object.entries(headers).forEach(([name, value]) => {
      response.headers.set(name, value)
    })

    return response
  }

  // Create middleware function
  middleware() {
    return (request: NextRequest) => {
      const response = NextResponse.next()
      return this.applyHeaders(response)
    }
  }
}

// Production-ready CSP configuration
export const productionCSPDirectives: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'nonce-{NONCE}'", // Use nonce for inline scripts
    'https://vercel.live',
    'https://va.vercel-scripts.com',
  ],
  'style-src': [
    "'self'",
    "'nonce-{NONCE}'", // Use nonce for inline styles
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    'https://vercel.live',
    'https://vitals.vercel-insights.com',
  ],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'child-src': ["'none'"],
  'worker-src': ["'self'"],
  'frame-src': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true,
}

// Development CSP configuration (more permissive)
export const developmentCSPDirectives: CSPDirectives = {
  ...defaultCSPDirectives,
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://vercel.live',
    'https://va.vercel-scripts.com',
  ],
}

// Default security headers instance
export const securityHeaders = new SecurityHeaders()

// Environment-specific configurations
export const getSecurityConfig = (): SecurityHeadersConfig => {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    contentSecurityPolicy: isProduction ? productionCSPDirectives : developmentCSPDirectives,
    strictTransportSecurity: isProduction ? 'max-age=31536000; includeSubDomains; preload' : false,
    xFrameOptions: 'DENY',
    xContentTypeOptions: true,
    referrerPolicy: 'origin-when-cross-origin',
    permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=()',
    crossOriginEmbedderPolicy: isProduction ? 'require-corp' : undefined,
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
  }
}

// Nonce generation for CSP
export function generateNonce(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(16).toString('base64')
}

// CSP nonce middleware
export function withCSPNonce() {
  return (request: NextRequest) => {
    const nonce = generateNonce()
    const response = NextResponse.next()
    
    // Store nonce in headers for use in components
    response.headers.set('x-nonce', nonce)
    
    // Update CSP header with nonce
    const config = getSecurityConfig()
    if (typeof config.contentSecurityPolicy === 'object') {
      const cspWithNonce = { ...config.contentSecurityPolicy }
      
      // Replace nonce placeholders
      if (cspWithNonce['script-src']) {
        cspWithNonce['script-src'] = cspWithNonce['script-src'].map(src =>
          src.replace('{NONCE}', nonce)
        )
      }
      
      if (cspWithNonce['style-src']) {
        cspWithNonce['style-src'] = cspWithNonce['style-src'].map(src =>
          src.replace('{NONCE}', nonce)
        )
      }
      
      const securityHeadersWithNonce = new SecurityHeaders({
        ...config,
        contentSecurityPolicy: cspWithNonce,
      })
      
      return securityHeadersWithNonce.applyHeaders(response)
    }
    
    return response
  }
}

// Security headers for API routes
export const apiSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
}

// Apply security headers to API response
export function secureApiResponse(response: NextResponse): NextResponse {
  Object.entries(apiSecurityHeaders).forEach(([name, value]) => {
    response.headers.set(name, value)
  })
  
  return response
}

// Security header validation
export function validateSecurityHeaders(headers: Headers): {
  score: number
  missing: string[]
  recommendations: string[]
} {
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
  ]
  
  const recommendedHeaders = [
    'Strict-Transport-Security',
    'Permissions-Policy',
    'Cross-Origin-Opener-Policy',
  ]
  
  const missing: string[] = []
  const recommendations: string[] = []
  
  requiredHeaders.forEach(header => {
    if (!headers.get(header)) {
      missing.push(header)
    }
  })
  
  recommendedHeaders.forEach(header => {
    if (!headers.get(header)) {
      recommendations.push(header)
    }
  })
  
  const score = Math.max(0, 100 - (missing.length * 20) - (recommendations.length * 5))
  
  return { score, missing, recommendations }
}