import { NextRequest } from 'next/server'
import crypto from 'crypto'

export interface CSRFConfig {
  secret: string
  tokenLength: number
  cookieName: string
  headerName: string
  formFieldName: string
  maxAge: number // in milliseconds
  sameSite: 'strict' | 'lax' | 'none'
  secure: boolean
}

const defaultConfig: CSRFConfig = {
  secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  tokenLength: 32,
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  formFieldName: '_csrf',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
}

export class CSRFProtection {
  private config: CSRFConfig

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Generate a CSRF token
   */
  generateToken(): string {
    const randomToken = crypto.randomBytes(this.config.tokenLength).toString('hex')
    const timestamp = Date.now().toString()
    const signature = this.createSignature(randomToken, timestamp)
    
    return `${randomToken}:${timestamp}:${signature}`
  }

  /**
   * Validate a CSRF token
   */
  validateToken(token: string): boolean {
    try {
      const parts = token.split(':')
      if (parts.length !== 3) {
        return false
      }

      const [randomToken, timestamp, signature] = parts
      
      // Check if token is expired
      const tokenAge = Date.now() - parseInt(timestamp)
      if (tokenAge > this.config.maxAge) {
        return false
      }

      // Verify signature
      const expectedSignature = this.createSignature(randomToken, timestamp)
      return this.constantTimeCompare(signature, expectedSignature)
    } catch {
      return false
    }
  }

  /**
   * Create HMAC signature for token
   */
  private createSignature(randomToken: string, timestamp: string): string {
    const hmac = crypto.createHmac('sha256', this.config.secret)
    hmac.update(`${randomToken}:${timestamp}`)
    return hmac.digest('hex')
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }

  /**
   * Extract CSRF token from request
   */
  extractToken(request: NextRequest): string | null {
    // Try header first
    const headerToken = request.headers.get(this.config.headerName)
    if (headerToken) {
      return headerToken
    }

    // Try cookie
    const cookieToken = request.cookies.get(this.config.cookieName)?.value
    if (cookieToken) {
      return cookieToken
    }

    // For form submissions, token would be in body (handled by caller)
    return null
  }

  /**
   * Verify CSRF token in request
   */
  async verifyRequest(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
    // Skip CSRF check for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS']
    if (safeMethods.includes(request.method)) {
      return { valid: true }
    }

    const token = this.extractToken(request)
    if (!token) {
      return { valid: false, error: 'CSRF token missing' }
    }

    if (!this.validateToken(token)) {
      return { valid: false, error: 'CSRF token invalid or expired' }
    }

    return { valid: true }
  }

  /**
   * Create middleware for CSRF protection
   */
  middleware() {
    return async (request: NextRequest) => {
      const result = await this.verifyRequest(request)
      
      if (!result.valid) {
        return new Response(
          JSON.stringify({
            error: 'CSRF Protection',
            message: result.error || 'CSRF token validation failed',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }

      return null // Continue to next middleware
    }
  }

  /**
   * Generate token and set cookie
   */
  setTokenCookie(response: Response): string {
    const token = this.generateToken()
    
    const cookieValue = `${this.config.cookieName}=${token}; Max-Age=${Math.floor(this.config.maxAge / 1000)}; Path=/; SameSite=${this.config.sameSite}${this.config.secure ? '; Secure' : ''}; HttpOnly`
    
    response.headers.append('Set-Cookie', cookieValue)
    
    return token
  }

  /**
   * Get token for client-side use (without HttpOnly)
   */
  getClientToken(): string {
    return this.generateToken()
  }
}

// Default CSRF protection instance
export const csrfProtection = new CSRFProtection()

// CSRF middleware for API routes
export function withCSRFProtection() {
  return csrfProtection.middleware()
}

// Helper to check if request needs CSRF protection
export function needsCSRFProtection(request: NextRequest): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  const pathname = request.nextUrl.pathname

  // Skip CSRF for safe methods
  if (safeMethods.includes(request.method)) {
    return false
  }

  // Skip CSRF for auth endpoints (they have their own protection)
  if (pathname.startsWith('/api/auth/')) {
    return false
  }

  // Skip CSRF for webhooks or external APIs
  if (pathname.includes('/webhook') || pathname.includes('/external')) {
    return false
  }

  return true
}

// Double Submit Cookie pattern implementation
export class DoubleSubmitCSRF extends CSRFProtection {
  /**
   * Verify using double submit cookie pattern
   */
  async verifyDoubleSubmit(request: NextRequest, bodyToken?: string): Promise<{ valid: boolean; error?: string }> {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS']
    if (safeMethods.includes(request.method)) {
      return { valid: true }
    }

    const cookieToken = request.cookies.get(this.config.cookieName)?.value
    const headerToken = request.headers.get(this.config.headerName)
    const submittedToken = bodyToken || headerToken

    if (!cookieToken || !submittedToken) {
      return { valid: false, error: 'CSRF tokens missing' }
    }

    // Both tokens must be valid and match
    if (!this.validateToken(cookieToken) || !this.validateToken(submittedToken)) {
      return { valid: false, error: 'CSRF tokens invalid' }
    }

    if (!this.constantTimeCompare(cookieToken, submittedToken)) {
      return { valid: false, error: 'CSRF tokens do not match' }
    }

    return { valid: true }
  }
}

// Synchronizer Token Pattern implementation
export class SynchronizerTokenCSRF extends CSRFProtection {
  private sessionTokens = new Map<string, string>()

  /**
   * Generate token for specific session
   */
  generateSessionToken(sessionId: string): string {
    const token = this.generateToken()
    this.sessionTokens.set(sessionId, token)
    return token
  }

  /**
   * Verify token against session
   */
  verifySessionToken(sessionId: string, submittedToken: string): boolean {
    const sessionToken = this.sessionTokens.get(sessionId)
    if (!sessionToken) {
      return false
    }

    return this.constantTimeCompare(sessionToken, submittedToken)
  }

  /**
   * Clean up expired session tokens
   */
  cleanupExpiredTokens(): void {
    // In a real implementation, you'd track token timestamps
    // and remove expired ones
    const maxTokens = 10000
    if (this.sessionTokens.size > maxTokens) {
      // Remove oldest tokens (simple cleanup)
      const entries = Array.from(this.sessionTokens.entries())
      const toRemove = entries.slice(0, entries.length - maxTokens)
      toRemove.forEach(([sessionId]) => {
        this.sessionTokens.delete(sessionId)
      })
    }
  }
}

// CSRF protection for different scenarios
export const csrfProtections = {
  // Standard CSRF protection
  standard: new CSRFProtection(),
  
  // Double submit cookie pattern
  doubleSubmit: new DoubleSubmitCSRF(),
  
  // Synchronizer token pattern
  synchronizer: new SynchronizerTokenCSRF(),
  
  // API-specific CSRF (more lenient)
  api: new CSRFProtection({
    maxAge: 60 * 60 * 1000, // 1 hour
    sameSite: 'lax',
  }),
}

// CSRF token validation for forms
export async function validateFormCSRF(
  request: NextRequest,
  formData: FormData
): Promise<{ valid: boolean; error?: string }> {
  const token = formData.get('_csrf') as string
  
  if (!token) {
    return { valid: false, error: 'CSRF token missing from form' }
  }

  if (!csrfProtection.validateToken(token)) {
    return { valid: false, error: 'Invalid CSRF token' }
  }

  return { valid: true }
}

// React hook for CSRF token (to be used in components)
export function useCSRFToken() {
  // This would be implemented in a React component
  // Returns token for forms and AJAX requests
  return {
    token: csrfProtection.getClientToken(),
    headerName: defaultConfig.headerName,
    formFieldName: defaultConfig.formFieldName,
  }
}