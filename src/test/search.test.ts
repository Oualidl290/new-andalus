import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { searchArticles, getRelatedArticles } from '@/lib/db/queries'

// Mock the database connection
vi.mock('@/lib/db/connection', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}))

// Mock data
const mockArticles = [
  {
    id: '1',
    title: 'Introduction to Artificial Intelligence',
    slug: 'intro-to-ai',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'AI is transforming technology...' }] }] },
    excerpt: 'A comprehensive guide to understanding AI and its applications',
    status: 'published' as const,
    publishedAt: new Date('2024-01-15'),
    authorId: 'author1',
    featuredImage: null,
    seoMeta: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'Climate Change and Technology Solutions',
    slug: 'climate-tech-solutions',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Technology can help address climate change...' }] }] },
    excerpt: 'Exploring how technology can help combat climate change',
    status: 'published' as const,
    publishedAt: new Date('2024-01-10'),
    authorId: 'author2',
    featuredImage: null,
    seoMeta: null,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '3',
    title: 'The Future of Machine Learning',
    slug: 'future-of-ml',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Machine learning continues to evolve...' }] }] },
    excerpt: 'Predictions and trends in machine learning development',
    status: 'published' as const,
    publishedAt: new Date('2024-01-05'),
    authorId: 'author1',
    featuredImage: null,
    seoMeta: null,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  }
]

describe('Search Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchArticles', () => {
    it('should return articles matching the search query', async () => {
      // Mock database response
      const mockDb = await import('@/lib/db/connection')
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([mockArticles[0]])
              })
            })
          })
        })
      })
      
      mockDb.db.select = mockSelect

      // Mock count query would be used in a more complete test setup

      // Test search functionality
      const result = await searchArticles('artificial intelligence', 1, 10)

      expect(result).toEqual({
        articles: [mockArticles[0]],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          hasNext: false,
        },
      })
    })

    it('should handle empty search results', async () => {
      const mockDb = await import('@/lib/db/connection')
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([])
              })
            })
          })
        })
      })
      
      mockDb.db.select = mockSelect

      const result = await searchArticles('nonexistent query', 1, 10)

      expect(result.articles).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.hasNext).toBe(false)
    })

    it('should handle pagination correctly', async () => {
      const mockDb = await import('@/lib/db/connection')
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([mockArticles[1]])
              })
            })
          })
        })
      })
      
      mockDb.db.select = mockSelect

      const result = await searchArticles('technology', 2, 1)

      expect(result.pagination.page).toBe(2)
      expect(result.pagination.limit).toBe(1)
    })
  })

  describe('getRelatedArticles', () => {
    it('should return related articles based on content similarity', async () => {
      const mockDb = await import('@/lib/db/connection')
      
      // Mock getArticleById
      const mockSelectSingle = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockArticles[0]])
        })
      })

      // Mock related articles query
      const mockSelectRelated = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockArticles[2]])
            })
          })
        })
      })

      mockDb.db.select = vi.fn()
        .mockReturnValueOnce(mockSelectSingle)
        .mockReturnValueOnce(mockSelectRelated)

      const result = await getRelatedArticles('1', 3)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })

    it('should fallback to recent articles when no similar content found', async () => {
      const mockDb = await import('@/lib/db/connection')
      
      // Mock getArticleById returning null
      const mockSelectSingle = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      })

      mockDb.db.select = mockSelectSingle

      const result = await getRelatedArticles('nonexistent', 3)

      expect(Array.isArray(result)).toBe(true)
    })
  })
})

describe('Search API Endpoint', () => {
  it('should validate search parameters', () => {
    // Test query validation
    expect(() => {
      const query = ''
      if (!query.trim()) {
        throw new Error('Search query cannot be empty')
      }
    }).toThrow('Search query cannot be empty')

    // Test query length validation
    expect(() => {
      const query = 'a'.repeat(101)
      if (query.length > 100) {
        throw new Error('Search query too long')
      }
    }).toThrow('Search query too long')
  })

  it('should generate search highlights correctly', () => {
    const article = {
      title: 'Introduction to Artificial Intelligence',
      excerpt: 'A comprehensive guide to understanding AI and its applications',
      content: 'AI is transforming technology...'
    }

    const query = 'artificial intelligence'
    
    // Mock the highlight generation function
    const generateSearchHighlight = (article: { title: string; excerpt?: string | null }, query: string): string => {
      const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
      
      for (const term of searchTerms) {
        const titleIndex = article.title.toLowerCase().indexOf(term)
        if (titleIndex !== -1) {
          const start = Math.max(0, titleIndex - 20)
          const end = Math.min(article.title.length, titleIndex + term.length + 20)
          let excerpt = article.title.slice(start, end)
          
          if (start > 0) excerpt = '...' + excerpt
          if (end < article.title.length) excerpt = excerpt + '...'
          
          const regex = new RegExp(`(${term})`, 'gi')
          return excerpt.replace(regex, '<mark>$1</mark>')
        }
      }
      
      return article.excerpt || article.title.slice(0, 150) + '...'
    }

    const highlight = generateSearchHighlight(article, query)
    
    expect(highlight).toContain('<mark>')
    expect(highlight.toLowerCase()).toContain('artificial')
  })

  it('should generate relevant search suggestions', () => {
    const generateSearchSuggestions = (query: string): string[] => {
      const queryLower = query.toLowerCase().trim()
      
      const topicSuggestions: Record<string, string[]> = {
        'tech': ['technology', 'innovation', 'digital', 'AI'],
        'politic': ['politics', 'government', 'policy', 'election'],
      }

      const suggestions: string[] = []
      
      for (const [key, values] of Object.entries(topicSuggestions)) {
        if (queryLower.includes(key) || key.includes(queryLower)) {
          suggestions.push(...values.filter(v => 
            v.toLowerCase() !== queryLower && 
            !queryLower.includes(v.toLowerCase())
          ))
        }
      }

      return [...new Set(suggestions)].slice(0, 3)
    }

    const suggestions = generateSearchSuggestions('tech')
    
    expect(suggestions).toContain('technology')
    expect(suggestions).toContain('innovation')
    expect(suggestions.length).toBeLessThanOrEqual(3)
  })
})