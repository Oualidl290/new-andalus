import { unstable_cache } from 'next/cache'
import { revalidateTag, revalidatePath } from 'next/cache'

// Next.js cache configuration
export const nextCacheConfig = {
  // ISR revalidation times (in seconds)
  revalidate: {
    homepage: 60 * 5, // 5 minutes
    articlePage: 60 * 60, // 1 hour
    articlesList: 60 * 10, // 10 minutes
    searchResults: 60 * 15, // 15 minutes
    siteStats: 60 * 30, // 30 minutes
  },
  
  // Cache tags for targeted invalidation
  tags: {
    articles: 'articles',
    article: (id: string) => `article-${id}`,
    articleSlug: (slug: string) => `article-slug-${slug}`,
    search: 'search',
    stats: 'stats',
    user: (id: string) => `user-${id}`,
  },
} as const

// Cached functions using Next.js unstable_cache
export const nextCachedQueries = {
  // Cache article by ID
  getArticleById: unstable_cache(
    async (id: string) => {
      const { getCachedArticleById } = await import('./queries')
      return getCachedArticleById(id)
    },
    ['article-by-id'],
    {
      revalidate: nextCacheConfig.revalidate.articlePage,
      tags: ['articles'],
    }
  ),

  // Cache article by slug
  getArticleBySlug: unstable_cache(
    async (slug: string) => {
      const { getCachedArticleBySlug } = await import('./queries')
      return getCachedArticleBySlug(slug)
    },
    ['article-by-slug'],
    {
      revalidate: nextCacheConfig.revalidate.articlePage,
      tags: ['articles'],
    }
  ),

  // Cache published articles list
  getPublishedArticles: unstable_cache(
    async (page: number = 1, limit: number = 20) => {
      const { getCachedPublishedArticles } = await import('./queries')
      return getCachedPublishedArticles(page, limit)
    },
    ['published-articles'],
    {
      revalidate: nextCacheConfig.revalidate.articlesList,
      tags: ['articles'],
    }
  ),

  // Cache recent articles
  getRecentArticles: unstable_cache(
    async (limit: number = 10) => {
      const { getCachedRecentArticles } = await import('./queries')
      return getCachedRecentArticles(limit)
    },
    ['recent-articles'],
    {
      revalidate: nextCacheConfig.revalidate.homepage,
      tags: ['articles'],
    }
  ),

  // Cache search results
  searchArticles: unstable_cache(
    async (query: string, page: number = 1, limit: number = 20) => {
      const { getCachedSearchResults } = await import('./queries')
      return getCachedSearchResults(query, page, limit)
    },
    ['search-articles'],
    {
      revalidate: nextCacheConfig.revalidate.searchResults,
      tags: ['search', 'articles'],
    }
  ),

  // Cache site statistics
  getSiteStats: unstable_cache(
    async () => {
      const { getCachedSiteStats } = await import('./queries')
      return getCachedSiteStats()
    },
    ['site-stats'],
    {
      revalidate: nextCacheConfig.revalidate.siteStats,
      tags: ['stats', 'articles'],
    }
  ),
}

// ISR page generation functions
export async function generateStaticParams() {
  // This would be used in article pages to pre-generate popular articles
  const { getCachedRecentArticles } = await import('./queries')
  const recentArticles = await getCachedRecentArticles(50) // Get top 50 for static generation
  
  return recentArticles.map((article) => ({
    slug: article.slug,
  }))
}

// Cache invalidation helpers for Next.js
export class NextCacheInvalidator {
  // Invalidate article-specific caches
  static invalidateArticle(articleId: string, slug?: string) {
    revalidateTag(nextCacheConfig.tags.articles)
    revalidateTag(nextCacheConfig.tags.article(articleId))
    
    if (slug) {
      revalidateTag(nextCacheConfig.tags.articleSlug(slug))
      revalidatePath(`/articles/${slug}`)
    }
  }

  // Invalidate when article is published
  static invalidateOnPublish(articleId: string, slug: string) {
    this.invalidateArticle(articleId, slug)
    
    // Also invalidate homepage and listings
    revalidatePath('/')
    revalidatePath('/articles')
    revalidateTag(nextCacheConfig.tags.stats)
  }

  // Invalidate search caches
  static invalidateSearch() {
    revalidateTag(nextCacheConfig.tags.search)
    revalidatePath('/search')
  }

  // Invalidate site statistics
  static invalidateStats() {
    revalidateTag(nextCacheConfig.tags.stats)
  }

  // Invalidate user-specific caches
  static invalidateUser(userId: string) {
    revalidateTag(nextCacheConfig.tags.user(userId))
  }

  // Invalidate all article-related caches
  static invalidateAllArticles() {
    revalidateTag(nextCacheConfig.tags.articles)
    revalidatePath('/')
    revalidatePath('/articles')
  }
}

// Cache warming for ISR
export class NextCacheWarmer {
  // Warm up critical pages
  static async warmCriticalPages() {
    try {
      // Warm homepage data
      await nextCachedQueries.getRecentArticles(10)
      await nextCachedQueries.getSiteStats()
      
      // Warm first page of articles
      await nextCachedQueries.getPublishedArticles(1, 20)
      
      console.log('Warmed critical Next.js caches')
    } catch (error) {
      console.error('Error warming Next.js caches:', error)
    }
  }

  // Warm popular article pages
  static async warmPopularArticles() {
    try {
      const recentArticles = await nextCachedQueries.getRecentArticles(20)
      
      // Pre-cache individual article pages
      await Promise.all(
        recentArticles.map(article => 
          nextCachedQueries.getArticleBySlug(article.slug)
        )
      )
      
      console.log(`Warmed ${recentArticles.length} article pages`)
    } catch (error) {
      console.error('Error warming article pages:', error)
    }
  }
}

// Export cache configuration for use in page components
export { nextCacheConfig as cacheConfig }