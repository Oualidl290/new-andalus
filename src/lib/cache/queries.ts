import { cache, cacheKeys, cacheTTL, withCache } from './redis'
import { db } from '@/lib/db/connection'
import { articles, users } from '@/lib/db/schema'
import { eq, desc, and, ilike, count, sql } from 'drizzle-orm'
import type { Article } from '@/types'

// Cached article queries
export class CachedArticleQueries {
  // Get article by ID with caching
  async getArticleById(id: string): Promise<Article | null> {
    return withCache(
      cacheKeys.article(id),
      async () => {
        const result = await db
          .select()
          .from(articles)
          .where(eq(articles.id, id))
          .limit(1)

        return (result[0] as Article) || null
      },
      cacheTTL.article
    )
  }

  // Get article by slug with caching
  async getArticleBySlug(slug: string): Promise<Article | null> {
    return withCache(
      cacheKeys.articleBySlug(slug),
      async () => {
        const result = await db
          .select()
          .from(articles)
          .where(eq(articles.slug, slug))
          .limit(1)

        return (result[0] as Article) || null
      },
      cacheTTL.article
    )
  }

  // Get published articles with caching
  async getPublishedArticles(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    articles: Article[]
    total: number
    hasNext: boolean
  }> {
    const offset = (page - 1) * limit

    // Cache the articles list
    const articlesList = await withCache(
      cacheKeys.articlesList(page, limit, 'published'),
      async () => {
        const result = await db
          .select()
          .from(articles)
          .where(eq(articles.status, 'published'))
          .orderBy(desc(articles.publishedAt))
          .limit(limit)
          .offset(offset)
        
        return result as Article[]
      },
      cacheTTL.articlesList
    )

    // Cache the total count
    const total = await withCache(
      cacheKeys.articlesCount('published'),
      async () => {
        const result = await db
          .select({ count: count() })
          .from(articles)
          .where(eq(articles.status, 'published'))
        
        return result[0]?.count || 0
      },
      cacheTTL.articlesList
    )

    return {
      articles: articlesList,
      total,
      hasNext: offset + limit < total,
    }
  }

  // Get all articles (for admin) with caching
  async getAllArticles(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{
    articles: Article[]
    total: number
    hasNext: boolean
  }> {
    const offset = (page - 1) * limit

    const searchResults = await withCache(
      cacheKeys.articlesList(page, limit, status),
      async () => {
        if (status) {
          const result = await db
            .select()
            .from(articles)
            .where(eq(articles.status, status as any))
            .orderBy(desc(articles.updatedAt))
            .limit(limit)
            .offset(offset)
          
          return result as Article[]
        } else {
          const result = await db
            .select()
            .from(articles)
            .orderBy(desc(articles.updatedAt))
            .limit(limit)
            .offset(offset)
          
          return result as Article[]
        }
      },
      cacheTTL.articlesList
    )

    const total = await withCache(
      cacheKeys.articlesCount(status),
      async () => {
        if (status) {
          const result = await db
            .select({ count: count() })
            .from(articles)
            .where(eq(articles.status, status as any))
          
          return result[0]?.count || 0
        } else {
          const result = await db
            .select({ count: count() })
            .from(articles)
          
          return result[0]?.count || 0
        }
      },
      cacheTTL.articlesList
    )

    return {
      articles: searchResults,
      total,
      hasNext: offset + limit < total,
    }
  }

  // Get recent articles with caching
  async getRecentArticles(limit: number = 10): Promise<Article[]> {
    return withCache(
      cacheKeys.recentArticles(limit),
      async () => {
        const result = await db
          .select()
          .from(articles)
          .where(eq(articles.status, 'published'))
          .orderBy(desc(articles.publishedAt))
          .limit(limit)
        
        return result as Article[]
      },
      cacheTTL.recentArticles
    )
  }

  // Search articles with caching
  async searchArticles(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    articles: Article[]
    total: number
    hasNext: boolean
  }> {
    const offset = (page - 1) * limit

    return withCache(
      cacheKeys.searchResults(query, page, limit),
      async () => {
        // Search in title and content
        const searchCondition = and(
          eq(articles.status, 'published'),
          sql`(
            ${articles.title} ILIKE ${`%${query}%`} OR 
            ${articles.excerpt} ILIKE ${`%${query}%`} OR
            ${articles.content}::text ILIKE ${`%${query}%`}
          )`
        )

        const [articlesResult, totalResult] = await Promise.all([
          db
            .select()
            .from(articles)
            .where(searchCondition)
            .orderBy(desc(articles.publishedAt))
            .limit(limit)
            .offset(offset),
          
          db
            .select({ count: count() })
            .from(articles)
            .where(searchCondition)
        ])

        const total = totalResult[0]?.count || 0

        return {
          articles: articlesResult as Article[],
          total,
          hasNext: offset + limit < total,
        }
      },
      cacheTTL.searchResults
    )
  }

  // Get articles by author with caching
  async getArticlesByAuthor(
    authorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    articles: Article[]
    total: number
    hasNext: boolean
  }> {
    const offset = (page - 1) * limit
    const cacheKey = `articles:author:${authorId}:${page}:${limit}`

    return withCache(
      cacheKey,
      async () => {
        const [articlesResult, totalResult] = await Promise.all([
          db
            .select()
            .from(articles)
            .where(and(
              eq(articles.authorId, authorId),
              eq(articles.status, 'published')
            ))
            .orderBy(desc(articles.publishedAt))
            .limit(limit)
            .offset(offset),
          
          db
            .select({ count: count() })
            .from(articles)
            .where(and(
              eq(articles.authorId, authorId),
              eq(articles.status, 'published')
            ))
        ])

        const total = totalResult[0]?.count || 0

        return {
          articles: articlesResult as Article[],
          total,
          hasNext: offset + limit < total,
        }
      },
      cacheTTL.articlesList
    )
  }
}

// Cached site statistics
export class CachedSiteQueries {
  // Get site statistics with caching
  async getSiteStats(): Promise<{
    totalArticles: number
    publishedArticles: number
    draftArticles: number
    totalUsers: number
  }> {
    return withCache(
      cacheKeys.siteStats(),
      async () => {
        const [articleStats, userStats] = await Promise.all([
          db
            .select({
              status: articles.status,
              count: count(),
            })
            .from(articles)
            .groupBy(articles.status),
          
          db
            .select({ count: count() })
            .from(users)
        ])

        const stats = {
          totalArticles: 0,
          publishedArticles: 0,
          draftArticles: 0,
          totalUsers: userStats[0]?.count || 0,
        }

        articleStats.forEach(stat => {
          stats.totalArticles += stat.count
          if (stat.status === 'published') {
            stats.publishedArticles = stat.count
          } else if (stat.status === 'draft') {
            stats.draftArticles = stat.count
          }
        })

        return stats
      },
      cacheTTL.siteStats
    )
  }
}

// Global instances
export const cachedArticleQueries = new CachedArticleQueries()
export const cachedSiteQueries = new CachedSiteQueries()

// Convenience functions
export async function getCachedArticleById(id: string): Promise<Article | null> {
  return cachedArticleQueries.getArticleById(id)
}

export async function getCachedArticleBySlug(slug: string): Promise<Article | null> {
  return cachedArticleQueries.getArticleBySlug(slug)
}

export async function getCachedPublishedArticles(page?: number, limit?: number) {
  return cachedArticleQueries.getPublishedArticles(page, limit)
}

export async function getCachedRecentArticles(limit?: number): Promise<Article[]> {
  return cachedArticleQueries.getRecentArticles(limit)
}

export async function getCachedSearchResults(query: string, page?: number, limit?: number) {
  return cachedArticleQueries.searchArticles(query, page, limit)
}

export async function getCachedSiteStats() {
  return cachedSiteQueries.getSiteStats()
}