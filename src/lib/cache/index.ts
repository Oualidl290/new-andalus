import { cacheOptimizer, cacheHealthMonitor } from './monitoring'
import { NextCacheWarmer } from './next-cache'
import { cacheWarmer } from './invalidation'

// Main cache exports
export {
  getRedisClient,
  cache,
  cacheKeys,
  cacheTTL,
  withCache,
  CacheManager,
  closeRedisConnection,
} from './redis'

export {
  CacheInvalidator,
  cacheInvalidator,
  invalidateArticleCache,
  invalidateOnPublish,
  invalidateOnUnpublish,
  invalidateSearchCache,
  invalidateUserCache,
  CacheWarmer,
  cacheWarmer,
} from './invalidation'

export {
  CachedArticleQueries,
  CachedSiteQueries,
  cachedArticleQueries,
  cachedSiteQueries,
  getCachedArticleById,
  getCachedArticleBySlug,
  getCachedPublishedArticles,
  getCachedRecentArticles,
  getCachedSearchResults,
  getCachedSiteStats,
} from './queries'

export {
  nextCachedQueries,
  NextCacheInvalidator,
  NextCacheWarmer,
  generateStaticParams,
} from './next-cache'

export {
  CacheMetrics,
  cacheMetrics,
  withCacheMetrics,
  CacheHealthMonitor,
  cacheHealthMonitor,
  CachePerformanceAnalyzer,
  cachePerformanceAnalyzer,
  CacheOptimizer,
  cacheOptimizer,
  instrumentedCacheGet,
  instrumentedCacheSet,
} from './monitoring'

// Cache initialization
export {
  initializeCache,
  shutdownCache,
  checkCacheHealth,
  cacheConfig,
  isCacheInitialized,
  setCacheInitialized,
} from './init'

// Cache middleware
export {
  cacheMiddleware,
  cacheWarmingScheduler,
  withCachePerformanceMonitoring,
  RequestCacheContext,
  cacheDebugger,
} from './middleware'

// Convenience functions for common operations
export async function warmAllCaches(): Promise<void> {
  await Promise.all([
    cacheWarmer.warmHomepage(),
    NextCacheWarmer.warmCriticalPages(),
  ])
}

export async function getCacheHealth() {
  return cacheHealthMonitor.checkHealth()
}

export async function getCacheStats() {
  return cacheHealthMonitor.getDetailedStats()
}

export async function getOptimizationRecommendations() {
  return cacheOptimizer.getOptimizationRecommendations()
}