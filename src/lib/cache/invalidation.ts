import { cache, cacheKeys } from './redis'
import { revalidateTag, revalidatePath } from 'next/cache'

// Cache invalidation strategies
export class CacheInvalidator {
  // Invalidate article-related caches
  async invalidateArticle(articleId: string, slug?: string): Promise<void> {
    const keysToInvalidate = [
      cacheKeys.article(articleId),
      cacheKeys.articlesList(1, 20), // First page of articles
      cacheKeys.articlesCount(),
      cacheKeys.popularArticles(),
      cacheKeys.recentArticles(10),
      cacheKeys.siteStats(),
    ]

    if (slug) {
      keysToInvalidate.push(cacheKeys.articleBySlug(slug))
    }

    // Invalidate Redis cache
    await cache.del(keysToInvalidate)

    // Invalidate article list patterns
    await cache.invalidatePattern('articles:list:*')
    await cache.invalidatePattern('articles:count:*')
    await cache.invalidatePattern('search:*')

    // Invalidate Next.js cache tags
    revalidateTag('articles')
    revalidateTag('article-' + articleId)
    
    if (slug) {
      revalidateTag('article-slug-' + slug)
    }

    console.log(`Invalidated caches for article ${articleId}`)
  }

  // Invalidate when article is published
  async invalidateArticlePublish(articleId: string, slug: string): Promise<void> {
    await this.invalidateArticle(articleId, slug)
    
    // Also invalidate homepage and public article lists
    revalidatePath('/')
    revalidatePath('/articles')
    revalidatePath(`/articles/${slug}`)
    
    console.log(`Invalidated publish caches for article ${articleId}`)
  }

  // Invalidate when article is unpublished
  async invalidateArticleUnpublish(articleId: string, slug: string): Promise<void> {
    await this.invalidateArticle(articleId, slug)
    
    // Invalidate public pages
    revalidatePath('/')
    revalidatePath('/articles')
    revalidatePath(`/articles/${slug}`)
    
    console.log(`Invalidated unpublish caches for article ${articleId}`)
  }

  // Invalidate search-related caches
  async invalidateSearch(query?: string): Promise<void> {
    if (query) {
      await cache.invalidatePattern(`search:${encodeURIComponent(query)}:*`)
    } else {
      await cache.invalidatePattern('search:*')
    }
    
    revalidateTag('search')
    console.log(`Invalidated search caches${query ? ` for query: ${query}` : ''}`)
  }

  // Invalidate user session cache
  async invalidateUserSession(userId: string): Promise<void> {
    await cache.del(cacheKeys.userSession(userId))
    revalidateTag('user-' + userId)
    console.log(`Invalidated session cache for user ${userId}`)
  }

  // Invalidate all article lists
  async invalidateArticleLists(): Promise<void> {
    await cache.invalidatePattern('articles:list:*')
    await cache.invalidatePattern('articles:count:*')
    await cache.del([
      cacheKeys.popularArticles(),
      cacheKeys.recentArticles(10),
      cacheKeys.siteStats(),
    ])
    
    revalidateTag('articles')
    revalidatePath('/')
    revalidatePath('/articles')
    
    console.log('Invalidated all article list caches')
  }

  // Invalidate site-wide statistics
  async invalidateSiteStats(): Promise<void> {
    await cache.del(cacheKeys.siteStats())
    revalidateTag('stats')
    console.log('Invalidated site statistics cache')
  }

  // Bulk invalidation for multiple articles
  async invalidateMultipleArticles(articleIds: string[]): Promise<void> {
    const keysToInvalidate = articleIds.flatMap(id => [
      cacheKeys.article(id),
    ])

    await cache.del(keysToInvalidate)
    await this.invalidateArticleLists()
    
    // Invalidate Next.js cache tags
    articleIds.forEach(id => {
      revalidateTag('article-' + id)
    })
    
    console.log(`Invalidated caches for ${articleIds.length} articles`)
  }

  // Emergency cache flush
  async flushAllCaches(): Promise<void> {
    await cache.flushAll()
    console.log('Flushed all caches - emergency invalidation')
  }
}

// Global invalidator instance
export const cacheInvalidator = new CacheInvalidator()

// Convenience functions for common invalidation scenarios
export async function invalidateArticleCache(articleId: string, slug?: string): Promise<void> {
  await cacheInvalidator.invalidateArticle(articleId, slug)
}

export async function invalidateOnPublish(articleId: string, slug: string): Promise<void> {
  await cacheInvalidator.invalidateArticlePublish(articleId, slug)
}

export async function invalidateOnUnpublish(articleId: string, slug: string): Promise<void> {
  await cacheInvalidator.invalidateArticleUnpublish(articleId, slug)
}

export async function invalidateSearchCache(query?: string): Promise<void> {
  await cacheInvalidator.invalidateSearch(query)
}

export async function invalidateUserCache(userId: string): Promise<void> {
  await cacheInvalidator.invalidateUserSession(userId)
}

// Cache warming functions
export class CacheWarmer {
  // Warm up popular article caches
  async warmPopularArticles(): Promise<void> {
    // This would typically fetch and cache popular articles
    // Implementation depends on your analytics/popularity logic
    console.log('Warming popular articles cache')
  }

  // Warm up recent articles cache
  async warmRecentArticles(): Promise<void> {
    // This would fetch and cache recent published articles
    console.log('Warming recent articles cache')
  }

  // Warm up homepage data
  async warmHomepage(): Promise<void> {
    await Promise.all([
      this.warmPopularArticles(),
      this.warmRecentArticles(),
    ])
    console.log('Warmed homepage caches')
  }
}

export const cacheWarmer = new CacheWarmer()