import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { checkDatabaseConnection, createUser, getUserByEmail, createArticle, getArticleBySlug } from '../index'

describe('Database Queries', () => {
  beforeAll(async () => {
    // Ensure database connection is working
    const connection = await checkDatabaseConnection()
    if (!connection.success) {
      throw new Error(`Database connection failed: ${connection.message}`)
    }
  })

  it('should connect to database', async () => {
    const result = await checkDatabaseConnection()
    expect(result.success).toBe(true)
  })

  it('should create and retrieve a user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      role: 'editor' as const,
    }

    const user = await createUser(userData)
    expect(user.email).toBe(userData.email)
    expect(user.name).toBe(userData.name)
    expect(user.role).toBe(userData.role)

    const foundUser = await getUserByEmail(userData.email)
    expect(foundUser).toBeTruthy()
    expect(foundUser?.id).toBe(user.id)
  })

  it('should create and retrieve an article', async () => {
    // First create a user
    const user = await createUser({
      email: 'author@example.com',
      name: 'Author User',
      role: 'editor',
    })

    const articleData = {
      title: 'Test Article',
      slug: 'test-article',
      content: { type: 'doc', content: [] },
      excerpt: 'This is a test article',
      status: 'draft' as const,
      authorId: user.id,
    }

    const article = await createArticle(articleData)
    expect(article.title).toBe(articleData.title)
    expect(article.slug).toBe(articleData.slug)
    expect(article.status).toBe(articleData.status)

    const foundArticle = await getArticleBySlug(articleData.slug)
    expect(foundArticle).toBeTruthy()
    expect(foundArticle?.id).toBe(article.id)
  })
})