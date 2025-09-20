import { z } from 'zod'

// User validation schemas
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
  role: z.enum(['admin', 'editor', 'reader']).optional().default('editor'),
})

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['admin', 'editor', 'reader']).optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().nullable(),
})

// Article validation schemas
export const articleCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  content: z.object({
    type: z.literal('doc'),
    content: z.array(z.any()),
  }),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  featuredImage: z.object({
    url: z.string().url('Invalid image URL'),
    alt: z.string().max(255, 'Alt text must be less than 255 characters'),
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
  }).optional().nullable(),
  seoMeta: z.object({
    title: z.string().max(60, 'SEO title must be less than 60 characters').optional(),
    description: z.string().max(160, 'SEO description must be less than 160 characters').optional(),
    keywords: z.array(z.string()).max(10, 'Maximum 10 keywords allowed').optional(),
  }).optional().nullable(),
})

export const articleUpdateSchema = articleCreateSchema.partial()

export const articleStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
})

// Search validation schemas
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
})

// File upload validation schemas
export const imageUploadSchema = z.object({
  file: z.instanceof(File, { message: 'File is required' }),
  alt: z.string().max(255, 'Alt text must be less than 255 characters').optional(),
})

// Admin validation schemas
export const adminArticleQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['all', 'draft', 'published', 'archived']).optional().default('all'),
  author: z.string().uuid('Invalid author ID').optional(),
  search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
})

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  role: z.enum(['all', 'admin', 'editor', 'reader']).optional().default('all'),
  search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
})

// Media validation schemas
export const mediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(['all', 'image', 'video', 'document']).optional().default('all'),
  search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
})

// Monitoring validation schemas
export const webVitalsSchema = z.object({
  type: z.enum(['web-vital', 'web-vitals-report']),
  metric: z.object({
    id: z.string(),
    name: z.string(),
    value: z.number(),
    rating: z.enum(['good', 'needs-improvement', 'poor']),
    delta: z.number(),
    navigationType: z.string(),
  }).optional(),
  report: z.object({
    url: z.string().url(),
    timestamp: z.number(),
    metrics: z.array(z.object({
      id: z.string(),
      name: z.string(),
      value: z.number(),
      rating: z.enum(['good', 'needs-improvement', 'poor']),
      delta: z.number(),
      navigationType: z.string(),
    })),
    userAgent: z.string(),
    connectionType: z.string().optional(),
  }).optional(),
  url: z.string().url().optional(),
  timestamp: z.number().optional(),
})

// Security validation schemas
export const csrfTokenSchema = z.object({
  token: z.string().min(1, 'CSRF token is required'),
})

export const rateLimitSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  limit: z.number().int().positive(),
  window: z.number().int().positive(),
})

// Common validation helpers
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
export const emailSchema = z.string().email('Invalid email address')
export const urlSchema = z.string().url('Invalid URL format')

// Validation error formatter
export function formatValidationErrors(error: z.ZodError) {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }))
}

// Validation middleware helper
export function validateSchema<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): { success: true; data: T } | { success: false; errors: any[] } => {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: formatValidationErrors(error) }
      }
      return { success: false, errors: [{ field: 'unknown', message: 'Validation failed', code: 'unknown' }] }
    }
  }
}

// Sanitization helpers
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

// SQL injection prevention helpers
export function isValidSortField(field: string, allowedFields: string[]): boolean {
  return allowedFields.includes(field)
}

export function isValidSortOrder(order: string): order is 'asc' | 'desc' {
  return order === 'asc' || order === 'desc'
}