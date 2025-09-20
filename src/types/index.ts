// Core data types for the New Andalus platform

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'reader'
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Article {
  id: string
  title: string
  slug: string
  content: JSONContent
  excerpt: string | null
  status: 'draft' | 'published' | 'archived'
  publishedAt: Date | null
  authorId: string
  featuredImage: ImageMetadata | null
  seoMeta: SEOMetadata | null
  createdAt: Date
  updatedAt: Date
}

export interface JSONContent {
  type: 'doc'
  content: ContentNode[]
}

export interface ContentNode {
  type: string
  attrs?: Record<string, unknown>
  content?: ContentNode[]
  text?: string
}

export interface ImageMetadata {
  url: string
  alt: string
  width: number
  height: number
}

export interface SEOMetadata {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
}

// API Response types
export interface ArticleListResponse {
  articles: Article[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
}

export interface APIError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: string
  path: string
}
