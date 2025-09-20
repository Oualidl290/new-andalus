import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Security event types for monitoring
export interface SecurityEvent {
  id?: string
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'password_change' | 'account_locked' | 
        'suspicious_activity' | 'file_upload' | 'admin_action' | 'data_export' | 'permission_change' |
        'rate_limit' | 'csrf_violation' | 'input_validation_failed' | 'unauthorized_access'
  userId?: string
  ip?: string
  userAgent?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp?: Date
  details?: Record<string, any>
}

// Content sanitization utilities
export class ContentSanitizer {
  // Sanitize HTML content using DOMPurify
  static sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'code', 'pre'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
      ALLOW_DATA_ATTR: false,
      FORBID_SCRIPT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
    })
  }

  // Sanitize plain text by removing HTML tags
  static sanitizeText(text: string): string {
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
  }

  // Sanitize filename for safe storage
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe characters
      .replace(/\.{2,}/g, '.') // Remove multiple dots
      .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
      .substring(0, 255) // Limit length
  }

  // Validate and sanitize URLs
  static sanitizeURL(url: string): string | null {
    try {
      const parsed = new URL(url)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null
      }
      return parsed.toString()
    } catch {
      return null
    }
  }

  // Remove potentially dangerous SQL characters
  static sanitizeForDatabase(input: string): string {
    return input
      .replace(/[';-]/g, '') // Remove SQL comment and statement terminators
      .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '') // Remove SQL keywords
      .trim()
  }
}

// Enhanced validation schemas with security considerations
export const securityValidationSchemas = {
  // User input validation
  userRegistration: z.object({
    email: z.string()
      .email('Invalid email format')
      .min(5, 'Email too short')
      .max(254, 'Email too long')
      .refine(email => !email.includes('+'), 'Email aliases not allowed')
      .transform(email => email.toLowerCase().trim()),
    
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .refine(pwd => /[A-Z]/.test(pwd), 'Password must contain uppercase letter')
      .refine(pwd => /[a-z]/.test(pwd), 'Password must contain lowercase letter')
      .refine(pwd => /\d/.test(pwd), 'Password must contain number')
      .refine(pwd => /[!@#$%^&*(),.?":{}|<>]/.test(pwd), 'Password must contain special character')
      .refine(pwd => !/(.)\1{2,}/.test(pwd), 'Password cannot have repeated characters'),
    
    name: z.string()
      .min(2, 'Name too short')
      .max(50, 'Name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
      .transform(name => ContentSanitizer.sanitizeText(name.trim())),
  }),

  // Article validation with content security
  articleCreate: z.object({
    title: z.string()
      .min(1, 'Title required')
      .max(200, 'Title too long')
      .transform(title => ContentSanitizer.sanitizeText(title.trim())),
    
    content: z.object({
      type: z.literal('doc'),
      content: z.array(z.any())
    }).refine(content => {
      const serialized = JSON.stringify(content)
      return serialized.length <= 100000 // 100KB limit
    }, 'Content too large'),
    
    excerpt: z.string()
      .max(300, 'Excerpt too long')
      .optional()
      .transform(excerpt => excerpt ? ContentSanitizer.sanitizeText(excerpt.trim()) : undefined),
    
    tags: z.array(z.string().max(30).regex(/^[a-zA-Z0-9-]+$/))
      .max(10, 'Too many tags')
      .optional(),
    
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
  }),

  // File upload validation
  fileUpload: z.object({
    filename: z.string()
      .min(1, 'Filename required')
      .max(255, 'Filename too long')
      .refine(name => !/\.(exe|bat|cmd|scr|pif|com|dll|vbs|js|jar|php|asp|jsp)$/i.test(name), 
        'File type not allowed')
      .transform(name => ContentSanitizer.sanitizeFilename(name)),
    
    size: z.number()
      .positive('File size must be positive')
      .max(10 * 1024 * 1024, 'File too large (max 10MB)'),
    
    mimeType: z.string()
      .refine(type => [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv'
      ].includes(type), 'File type not allowed'),
  }),

  // Search query validation
  searchQuery: z.object({
    q: z.string()
      .min(1, 'Search query required')
      .max(100, 'Search query too long')
      .regex(/^[a-zA-Z0-9\s\-_'"]+$/, 'Search contains invalid characters')
      .transform(q => ContentSanitizer.sanitizeText(q.trim())),
    
    page: z.coerce.number()
      .int('Page must be integer')
      .positive('Page must be positive')
      .max(1000, 'Page number too high')
      .default(1),
    
    limit: z.coerce.number()
      .int('Limit must be integer')
      .positive('Limit must be positive')
      .max(50, 'Limit too high')
      .default(10),
  }),

  // Admin action validation
  adminAction: z.object({
    action: z.enum(['create', 'update', 'delete', 'publish', 'unpublish', 'archive']),
    targetId: z.string().uuid('Invalid target ID'),
    reason: z.string()
      .max(500, 'Reason too long')
      .optional()
      .transform(reason => reason ? ContentSanitizer.sanitizeText(reason.trim()) : undefined),
  }),

  // Comment validation (if implementing comments)
  comment: z.object({
    content: z.string()
      .min(1, 'Comment required')
      .max(1000, 'Comment too long')
      .transform(content => ContentSanitizer.sanitizeHTML(content.trim())),
    
    parentId: z.string().uuid().optional(),
  }),
}

// Request validation wrapper
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const result = schema.parse(data)
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors?.map(err => `${err.path.join('.')}: ${err.message}`) || ['Validation failed']
        return { success: false, errors }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }
}

// Input sanitization middleware
export class InputSanitizer {
  // Sanitize object recursively
  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return ContentSanitizer.sanitizeText(obj)
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item))
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = ContentSanitizer.sanitizeText(key)
        sanitized[sanitizedKey] = this.sanitizeObject(value)
      }
      return sanitized
    }
    
    return obj
  }

  // Check for suspicious patterns
  static containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /(union|select|insert|update|delete|drop|create|alter)\s+/gi,
      /\b(exec|execute|sp_|xp_)\b/gi,
      /(\||&|;|\$\(|\`)/g,
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(input))
  }

  // Validate file content
  static validateFileContent(buffer: Buffer, expectedMimeType: string): boolean {
    const magicNumbers: Record<string, Buffer[]> = {
      'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
      'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
      'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
    }
    
    const expectedMagic = magicNumbers[expectedMimeType]
    if (!expectedMagic) return false
    
    return expectedMagic.some(magic => buffer.subarray(0, magic.length).equals(magic))
  }
}

// Rate limiting validation
export const rateLimitSchemas = {
  general: z.object({
    windowMs: z.number().default(60000), // 1 minute
    max: z.number().default(100),
  }),
  
  auth: z.object({
    windowMs: z.number().default(900000), // 15 minutes
    max: z.number().default(5),
  }),
  
  upload: z.object({
    windowMs: z.number().default(60000), // 1 minute
    max: z.number().default(10),
  }),
  
  search: z.object({
    windowMs: z.number().default(60000), // 1 minute
    max: z.number().default(30),
  }),
}

// Security headers validation
export const securityHeadersSchema = z.object({
  'content-security-policy': z.string().optional(),
  'strict-transport-security': z.string().optional(),
  'x-frame-options': z.enum(['DENY', 'SAMEORIGIN']).optional(),
  'x-content-type-options': z.literal('nosniff').optional(),
  'referrer-policy': z.string().optional(),
})

// CSRF token validation
export const csrfTokenSchema = z.object({
  token: z.string()
    .min(32, 'CSRF token too short')
    .max(256, 'CSRF token too long')
    .regex(/^[a-zA-Z0-9+/=]+$/, 'Invalid CSRF token format'),
})

// Export commonly used schemas
export const articleSchemas = {
  create: securityValidationSchemas.articleCreate,
  update: securityValidationSchemas.articleCreate.partial(),
}

export const userSchemas = {
  register: securityValidationSchemas.userRegistration,
  login: z.object({
    email: z.string().email().transform(email => email.toLowerCase().trim()),
    password: z.string().min(1, 'Password required'),
  }),
}

export const uploadSchemas = {
  file: securityValidationSchemas.fileUpload,
}

export const searchSchemas = {
  query: securityValidationSchemas.searchQuery,
}

// Validation error formatter
export function formatValidationError(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : ''
    return `${path}${err.message}`
  })
}

// Security validation middleware
export function createSecurityValidator<T>(schema: z.ZodSchema<T>) {
  return async (data: unknown): Promise<{ valid: boolean; data?: T; errors?: string[] }> => {
    try {
      // First check for suspicious patterns in string data
      if (typeof data === 'object' && data !== null) {
        const jsonString = JSON.stringify(data)
        if (InputSanitizer.containsSuspiciousPatterns(jsonString)) {
          return {
            valid: false,
            errors: ['Input contains potentially malicious content']
          }
        }
      }
      
      // Validate with schema
      const result = schema.parse(data)
      return { valid: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: formatValidationError(error)
        }
      }
      return {
        valid: false,
        errors: ['Validation failed']
      }
    }
  }
}