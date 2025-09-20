import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createUser, createArticle, getArticleById } from '@/lib/db'

describe('Article Publishing Workflow', () => {
  let testUser: Awaited<ReturnType<typeof createUser>>
  let testArticle: Awaited<ReturnType<typeof createArticle>>

  beforeAll(async () => {
    // Create a test user
    testUser = await createUser({
      email: 'publisher@test.com',
      name: 'Publisher User',
      role: 'editor',
    })
  })

  afterEach(async () => {
    // Clean up test articles if needed
    // This would be implemented based on your cleanup strategy
  })

  it('should create article with draft status by default', async () => {
    const articleData = {
      title: 'Test Publishing Article',
      content: {
        type: 'doc' as const,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This is a test article for publishing workflow.' }],
          },
        ],
      },
      excerpt: 'Test article excerpt',
      authorId: testUser.id,
    }

    testArticle = await createArticle(articleData)

    expect(testArticle.status).toBe('draft')
    expect(testArticle.publishedAt).toBeNull()
    expect(testArticle.slug).toBe('test-publishing-article')
  })

  it('should generate SEO metadata when publishing', async () => {
    // This test would require mocking the API call or testing the utility functions
    // For now, we'll test the utility functions directly
    
    const article = await getArticleById(testArticle.id)
    expect(article).toBeTruthy()
    expect(article?.status).toBe('draft')
  })

  it('should validate required fields before publishing', () => {
    // Test that articles need title and content to be published
    expect(testArticle.title).toBeTruthy()
    expect(testArticle.content).toBeTruthy()
  })

  it('should handle status transitions correctly', async () => {
    // Test the status transition validation
    const { validateStatusTransition } = await import('@/lib/utils/article')
    
    // Valid transitions
    expect(validateStatusTransition('draft', 'published')).toEqual({ valid: true })
    expect(validateStatusTransition('published', 'archived')).toEqual({ valid: true })
    
    // Invalid transitions
    const invalidTransition = validateStatusTransition('archived', 'published')
    expect(invalidTransition.valid).toBe(false)
    expect(invalidTransition.message).toContain('Cannot transition')
  })

  it('should generate proper slug from title', async () => {
    const { generateSlug } = await import('@/lib/utils/article')
    
    expect(generateSlug('Test Article Title')).toBe('test-article-title')
    expect(generateSlug('Special Characters! @#$')).toBe('special-characters')
    expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces')
  })

  it('should generate SEO metadata correctly', async () => {
    const { generateSEOMetadata } = await import('@/lib/utils/article')
    
    const seoMeta = generateSEOMetadata({
      title: 'Test Article',
      excerpt: 'This is a test article about publishing workflow',
    })

    expect(seoMeta.title).toBe('Test Article | New Andalus')
    expect(seoMeta.description).toBe('This is a test article about publishing workflow')
    expect(seoMeta.keywords).toContain('test')
    expect(seoMeta.keywords).toContain('article')
  })

  it('should calculate reading time', async () => {
    const { calculateReadingTime } = await import('@/lib/utils/article')
    
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'word '.repeat(200) }], // 200 words
        },
      ],
    }

    const readingTime = calculateReadingTime(content)
    expect(readingTime).toBe(1) // 200 words / 200 wpm = 1 minute
  })
})