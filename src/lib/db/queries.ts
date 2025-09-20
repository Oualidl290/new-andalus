import { eq, desc, and, or, ilike, count, sql } from 'drizzle-orm'
import { db } from './connection'
import { articles, users, type Article, type NewArticle, type User, type NewUser } from './schema'
import { 
  invalidateArticleCache, 
  invalidateOnPublish, 
  invalidateOnUnpublish,
  invalidateUserCache,
  getCachedArticleById,
  getCachedArticleBySlug,
  getCachedPublishedArticles,
  getCachedSearchResults
} from '@/lib/cache'

// User queries
export async function createUser(userData: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(userData).returning()
  return user
}

export async function getUserById(id: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id))
  return user || null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email))
  return user || null
}

export async function updateUser(id: string, userData: Partial<NewUser>): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ ...userData, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  return user || null
}

// Article queries
export async function createArticle(articleData: NewArticle): Promise<Article> {
  const [article] = await db.insert(articles).values(articleData).returning()
  return article
}

export async function getArticleById(id: string): Promise<Article | null> {
  // Use cached version for better performance
  return getCachedArticleById(id)
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  // Use cached version for better performance
  return getCachedArticleBySlug(slug)
}

export async function updateArticle(id: string, articleData: Partial<NewArticle>): Promise<Article | null> {
  // Get the current article to check for status changes
  const currentArticle = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
  const current = currentArticle[0]
  
  const [article] = await db
    .update(articles)
    .set({ ...articleData, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning()
  
  if (article) {
    // Handle cache invalidation based on status changes
    if (current && articleData.status) {
      if (current.status !== 'published' && articleData.status === 'published') {
        // Article was published
        await invalidateOnPublish(article.id, article.slug)
      } else if (current.status === 'published' && articleData.status !== 'published') {
        // Article was unpublished
        await invalidateOnUnpublish(article.id, article.slug)
      } else {
        // Regular update
        await invalidateArticleCache(article.id, article.slug)
      }
    } else {
      // Regular update
      await invalidateArticleCache(article.id, article.slug)
    }
  }
  
  return article || null
}

export async function deleteArticle(id: string): Promise<boolean> {
  try {
    // Get article info before deletion for cache invalidation
    const article = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
    const articleData = article[0]
    
    await db.delete(articles).where(eq(articles.id, id))
    
    // Invalidate caches after successful deletion
    if (articleData) {
      await invalidateArticleCache(articleData.id, articleData.slug)
    }
    
    return true
  } catch (error) {
    console.error('Error deleting article:', error)
    return false
  }
}

// Article listing queries
export async function getPublishedArticles(page = 1, limit = 10) {
  // Use cached version for better performance
  return getCachedPublishedArticles(page, limit)
}

export async function getArticlesByAuthor(authorId: string, page = 1, limit = 10) {
  const offset = (page - 1) * limit
  
  const [articlesData, totalCount] = await Promise.all([
    db
      .select()
      .from(articles)
      .where(eq(articles.authorId, authorId))
      .orderBy(desc(articles.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(articles)
      .where(eq(articles.authorId, authorId))
  ])

  const total = totalCount[0]?.count || 0
  const hasNext = offset + limit < total

  return {
    articles: articlesData,
    pagination: {
      page,
      limit,
      total,
      hasNext,
    },
  }
}

export async function searchArticles(query: string, page = 1, limit = 10) {
  // Use cached version for better performance
  return getCachedSearchResults(query, page, limit)
}

// Non-cached version for internal use
export async function searchArticlesUncached(query: string, page = 1, limit = 10) {
  const offset = (page - 1) * limit
  
  // Note: searchTerms could be used for more advanced full-text search configurations
  // const searchTerms = query.trim().split(/\s+/).join(' & ')
  
  // Create search conditions using PostgreSQL's full-text search
  const searchConditions = and(
    eq(articles.status, 'published'),
    or(
      // Title search with higher weight
      sql`to_tsvector('english', ${articles.title}) @@ plainto_tsquery('english', ${query})`,
      // Excerpt search
      sql`to_tsvector('english', coalesce(${articles.excerpt}, '')) @@ plainto_tsquery('english', ${query})`,
      // Content search (JSONB to text conversion)
      sql`to_tsvector('english', ${articles.content}::text) @@ plainto_tsquery('english', ${query})`,
      // Fallback to ILIKE for partial matches
      ilike(articles.title, `%${query}%`),
      ilike(articles.excerpt, `%${query}%`)
    )
  )
  
  // Use ranking for better search results
  const [articlesData, totalCount] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        excerpt: articles.excerpt,
        status: articles.status,
        publishedAt: articles.publishedAt,
        authorId: articles.authorId,
        featuredImage: articles.featuredImage,
        seoMeta: articles.seoMeta,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        // Add search ranking
        rank: sql<number>`
          COALESCE(
            ts_rank(to_tsvector('english', ${articles.title}), plainto_tsquery('english', ${query})) * 2.0 +
            ts_rank(to_tsvector('english', coalesce(${articles.excerpt}, '')), plainto_tsquery('english', ${query})) * 1.5 +
            ts_rank(to_tsvector('english', ${articles.content}::text), plainto_tsquery('english', ${query})),
            0
          )
        `.as('rank')
      })
      .from(articles)
      .where(searchConditions)
      .orderBy(sql`rank DESC, ${articles.publishedAt} DESC`)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(articles)
      .where(searchConditions)
  ])

  const total = totalCount[0]?.count || 0
  const hasNext = offset + limit < total

  return {
    articles: articlesData,
    pagination: {
      page,
      limit,
      total,
      hasNext,
    },
  }
}

export async function getRelatedArticles(articleId: string, limit = 3) {
  try {
    // Get the current article to extract keywords for similarity
    const currentArticle = await getArticleById(articleId)
    if (!currentArticle) {
      return []
    }

    // Extract keywords from title and excerpt for similarity matching
    const searchText = `${currentArticle.title} ${currentArticle.excerpt || ''}`.toLowerCase()
    const keywords = searchText
      .split(/\s+/)
      .filter(word => word.length > 3) // Filter out short words
      .slice(0, 10) // Limit to first 10 keywords
      .join(' ')

    if (!keywords) {
      // Fallback to recent articles if no keywords found
      const { articles: recentArticles } = await getPublishedArticles(1, limit + 1)
      return recentArticles.filter(article => article.id !== articleId).slice(0, limit)
    }

    // Find similar articles using full-text search
    const relatedArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        excerpt: articles.excerpt,
        status: articles.status,
        publishedAt: articles.publishedAt,
        authorId: articles.authorId,
        featuredImage: articles.featuredImage,
        seoMeta: articles.seoMeta,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        // Calculate similarity score
        similarity: sql<number>`
          ts_rank(
            to_tsvector('english', ${articles.title} || ' ' || coalesce(${articles.excerpt}, '') || ' ' || ${articles.content}::text),
            plainto_tsquery('english', ${keywords})
          )
        `.as('similarity')
      })
      .from(articles)
      .where(
        and(
          eq(articles.status, 'published'),
          sql`${articles.id} != ${articleId}`, // Exclude current article
          or(
            sql`to_tsvector('english', ${articles.title}) @@ plainto_tsquery('english', ${keywords})`,
            sql`to_tsvector('english', coalesce(${articles.excerpt}, '')) @@ plainto_tsquery('english', ${keywords})`,
            sql`to_tsvector('english', ${articles.content}::text) @@ plainto_tsquery('english', ${keywords})`
          )
        )
      )
      .orderBy(sql`similarity DESC, ${articles.publishedAt} DESC`)
      .limit(limit)

    // If we don't have enough related articles, fill with recent ones
    if (relatedArticles.length < limit) {
      const { articles: recentArticles } = await getPublishedArticles(1, limit * 2)
      const additionalArticles = recentArticles
        .filter(article => 
          article.id !== articleId && 
          !relatedArticles.some(related => related.id === article.id)
        )
        .slice(0, limit - relatedArticles.length)
      
      return [...relatedArticles, ...additionalArticles]
    }

    return relatedArticles
  } catch (error) {
    console.error('Error fetching related articles:', error)
    // Fallback to recent articles
    const { articles: recentArticles } = await getPublishedArticles(1, limit + 1)
    return recentArticles.filter(article => article.id !== articleId).slice(0, limit)
  }
}

// Admin-specific queries
export async function getAllArticles(options: {
  page?: number
  limit?: number
  status?: 'draft' | 'published' | 'archived'
  authorId?: string
  search?: string
} = {}) {
  const { page = 1, limit = 20, status, authorId, search } = options
  const offset = (page - 1) * limit

  // Build where conditions
  const conditions = []
  
  if (status) {
    conditions.push(eq(articles.status, status))
  }
  
  if (authorId) {
    conditions.push(eq(articles.authorId, authorId))
  }
  
  if (search) {
    conditions.push(
      or(
        ilike(articles.title, `%${search}%`),
        ilike(articles.excerpt, `%${search}%`)
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get articles with author information
  const [articlesData, totalCount] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        excerpt: articles.excerpt,
        status: articles.status,
        publishedAt: articles.publishedAt,
        authorId: articles.authorId,
        featuredImage: articles.featuredImage,
        seoMeta: articles.seoMeta,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(whereClause)
      .orderBy(desc(articles.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(articles)
      .where(whereClause)
  ])

  const total = totalCount[0]?.count || 0
  const hasNext = offset + limit < total

  return {
    articles: articlesData,
    pagination: {
      page,
      limit,
      total,
      hasNext,
    },
  }
}

export async function getRecentArticles(limit = 5) {
  const articlesData = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      status: articles.status,
      publishedAt: articles.publishedAt,
      authorId: articles.authorId,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .orderBy(desc(articles.updatedAt))
    .limit(limit)

  return articlesData
}

export async function getDashboardStats() {
  const [
    totalArticlesResult,
    publishedArticlesResult,
    draftArticlesResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(articles),
    db.select({ count: count() }).from(articles).where(eq(articles.status, 'published')),
    db.select({ count: count() }).from(articles).where(eq(articles.status, 'draft')),
  ])

  return {
    totalArticles: totalArticlesResult[0]?.count || 0,
    publishedArticles: publishedArticlesResult[0]?.count || 0,
    draftArticles: draftArticlesResult[0]?.count || 0,
    totalViews: 0, // TODO: Implement analytics
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await db.delete(users).where(eq(users.id, id))
    await invalidateUserCache(id)
    return true
  } catch (error) {
    console.error('Error deleting user:', error)
    return false
  }
}

export async function getAllUsers(options: {
  page?: number
  limit?: number
  role?: 'admin' | 'editor' | 'reader'
  search?: string
} = {}) {
  const { page = 1, limit = 20, role, search } = options
  const offset = (page - 1) * limit

  // Build where conditions
  const conditions = []
  
  if (role) {
    conditions.push(eq(users.role, role))
  }
  
  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [usersData, totalCount] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(users)
      .where(whereClause)
  ])

  const total = totalCount[0]?.count || 0
  const hasNext = offset + limit < total

  return {
    users: usersData,
    pagination: {
      page,
      limit,
      total,
      hasNext,
    },
  }
}