import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { 
  checkDatabaseConnection, 
  createUser, 
  createArticle, 
  getArticleById, 
  getArticleBySlug,
  updateArticle,
  deleteArticle,
  getPublishedArticles,
  getArticlesByAuthor
} from '../index'

describe('Article Database Queries', () => {
  let testUser: any
  let testArticle: any

  beforeAll(async () => {
    // Ensure database connection is working
    const connection = await checkDatabaseConnection()
    if (!connection.success) {
      throw new Error(`Database connection failed: ${connection.message}`)
    }

    // Create a test user
    testUser = await createUser({
      email: 'article-test@example.com',
      name: 'Article Test User',
      role: 'editor',
    })
  })

  afterEach(async () => {
    // Clean up test articles after each test
    if (testArticle) {
      try {
        await deleteArticle(testArticle.id)
      } catch (error) {
        // Ignore cleanup errors
      }
      testArticle = null
    }
  })

  it('should create an article with all fields', async () => {
    const articleData = {
      title: 'Test Article with All Fields',
      slug: 'test-article-all-fields',
      content: {
        type: 'doc' as const,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This is test content.' }]
          }
        ]
      },
      excerpt: 'This is a test excerpt',
      status: 'draft' as const,
      authorId: testUser.id,
      featuredImage: {
        url: 'https://example.com/image.jpg',
        alt: 'Test image',
        width: 800,
        height: 600,
      },
      seoMeta: {
        title: 'SEO Title',
        description: 'SEO Description',
        keywords: ['test', 'article'],
      },
    }

    testArticle = await createArticle(articleData)

    expect(testArticle.title).toBe(articleData.title)
    expect(testArticle.slug).toBe(articleData.slug)
    expect(testArticle.content).toEqual(articleData.content)
    expect(testArticle.excerpt).toBe(articleData.excerpt)
    expect(testArticle.status).toBe(articleData.status)
    expect(testArticle.authorId).toBe(articleData.authorId)
    expect(testArticle.featuredImage).toEqual(articleData.featuredImage)
    expect(testArticle.seoMeta).toEqual(articleData.seoMeta)
    expect(testArticle.id).toBeDefined()
    expect(testArticle.createdAt).toBeDefined()
    expect(testArticle.updatedAt).toBeDefined()
  })

  it('should retrieve article by ID', async () => {
    testArticle = await createArticle({
      title: 'Test Article by ID',
      slug: 'test-article-by-id',
      content: { type: 'doc', content: [] },
      authorId: testUser.id,
    })

    const foundArticle = await getArticleById(testArticle.id)
    expect(foundArticle).toBeTruthy()
    expect(foundArticle?.id).toBe(testArticle.id)
    expect(foundArticle?.title).toBe(testArticle.title)
  })

  it('should retrieve article by slug', async () => {
    const slug = 'test-article-by-slug'
    testArticle = await createArticle({
      title: 'Test Article by Slug',
      slug,
      content: { type: 'doc', content: [] },
      authorId: testUser.id,
    })

    const foundArticle = await getArticleBySlug(slug)
    expect(foundArticle).toBeTruthy()
    expect(foundArticle?.slug).toBe(slug)
    expect(foundArticle?.id).toBe(testArticle.id)
  })

  it('should update article fields', async () => {
    testArticle = await createArticle({
      title: 'Original Title',
      slug: 'original-slug',
      content: { type: 'doc', content: [] },
      status: 'draft',
      authorId: testUser.id,
    })

    const updateData = {
      title: 'Updated Title',
      status: 'published' as const,
      publishedAt: new Date(),
    }

    const updatedArticle = await updateArticle(testArticle.id, updateData)
    expect(updatedArticle).toBeTruthy()
    expect(updatedArticle?.title).toBe(updateData.title)
    expect(updatedArticle?.status).toBe(updateData.status)
    expect(updatedArticle?.publishedAt).toBeDefined()
  })

  it('should delete article', async () => {
    testArticle = await createArticle({
      title: 'Article to Delete',
      slug: 'article-to-delete',
      content: { type: 'doc', content: [] },
      authorId: testUser.id,
    })

    const articleId = testArticle.id
    const deleteResult = await deleteArticle(articleId)
    expect(deleteResult).toBe(true)

    // Verify article is deleted
    const deletedArticle = await getArticleById(articleId)
    expect(deletedArticle).toBeNull()

    testArticle = null // Prevent cleanup attempt
  })

  it('should get published articles with pagination', async () => {
    // Create multiple test articles
    const articles = []
    for (let i = 1; i <= 3; i++) {
      const article = await createArticle({
        title: `Published Article ${i}`,
        slug: `published-article-${i}`,
        content: { type: 'doc', content: [] },
        status: 'published',
        publishedAt: new Date(),
        authorId: testUser.id,
      })
      articles.push(article)
    }

    const result = await getPublishedArticles(1, 2)
    expect(result.articles).toBeDefined()
    expect(result.articles.length).toBeGreaterThanOrEqual(2)
    expect(result.pagination).toBeDefined()
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(2)

    // Cleanup
    for (const article of articles) {
      await deleteArticle(article.id)
    }
  })

  it('should get articles by author', async () => {
    // Create test articles for the user
    const articles = []
    for (let i = 1; i <= 2; i++) {
      const article = await createArticle({
        title: `Author Article ${i}`,
        slug: `author-article-${i}`,
        content: { type: 'doc', content: [] },
        status: i === 1 ? 'published' : 'draft',
        publishedAt: i === 1 ? new Date() : null,
        authorId: testUser.id,
      })
      articles.push(article)
    }

    const result = await getArticlesByAuthor(testUser.id, 1, 10)
    expect(result.articles).toBeDefined()
    expect(result.articles.length).toBeGreaterThanOrEqual(2)
    expect(result.articles.every(article => article.authorId === testUser.id)).toBe(true)

    // Cleanup
    for (const article of articles) {
      await deleteArticle(article.id)
    }
  })

  it('should handle non-existent article queries', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000'
    const article = await getArticleById(nonExistentId)
    expect(article).toBeNull()

    const articleBySlug = await getArticleBySlug('non-existent-slug')
    expect(articleBySlug).toBeNull()
  })
})