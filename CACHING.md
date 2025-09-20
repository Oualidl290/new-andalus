# Caching Implementation

This document describes the comprehensive caching system implemented for the New Andalus editorial platform.

## Overview

The caching system is designed to achieve high performance and scalability by implementing multiple layers of caching:

1. **Redis Application Cache** - For database query results and computed data
2. **Next.js ISR (Incremental Static Regeneration)** - For static page generation
3. **Next.js Cache API** - For server-side function caching
4. **Database Query Caching** - For frequently accessed data

## Architecture

### Cache Layers

```
┌─────────────────┐
│   Browser       │ (Browser Cache)
└─────────┬───────┘
          │
┌─────────┴───────┐
│   Next.js ISR   │ (Static Generation + Revalidation)
└─────────┬───────┘
          │
┌─────────┴───────┐
│   Redis Cache   │ (Application Cache)
└─────────┬───────┘
          │
┌─────────┴───────┐
│   PostgreSQL    │ (Database)
└─────────────────┘
```

### Key Components

- **CacheManager** - Core Redis operations
- **CacheInvalidator** - Cache invalidation strategies
- **CacheMetrics** - Performance monitoring
- **CacheHealthMonitor** - Health checking and diagnostics
- **NextCacheInvalidator** - Next.js cache management

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
REDIS_DB="0"
```

### Cache TTL Values

```typescript
export const cacheTTL = {
  article: 60 * 60,        // 1 hour
  articlesList: 60 * 5,    // 5 minutes
  searchResults: 60 * 10,  // 10 minutes
  userSession: 60 * 60 * 24, // 24 hours
  popularArticles: 60 * 60,  // 1 hour
  recentArticles: 60 * 5,    // 5 minutes
  siteStats: 60 * 30,        // 30 minutes
}
```

## Usage

### Basic Cache Operations

```typescript
import { cache, withCache } from '@/lib/cache'

// Get from cache
const article = await cache.get<Article>('article:123')

// Set to cache
await cache.set('article:123', articleData, 3600)

// Cache-aside pattern
const article = await withCache(
  'article:123',
  () => fetchArticleFromDB('123'),
  3600
)
```

### Cached Database Queries

```typescript
import { getCachedArticleById, getCachedPublishedArticles } from '@/lib/cache'

// Get cached article
const article = await getCachedArticleById('123')

// Get cached article list
const { articles, total } = await getCachedPublishedArticles(1, 20)
```

### Cache Invalidation

```typescript
import { invalidateArticleCache, invalidateOnPublish } from '@/lib/cache'

// Invalidate article cache
await invalidateArticleCache('123', 'article-slug')

// Invalidate on publish (includes Next.js revalidation)
await invalidateOnPublish('123', 'article-slug')
```

### Next.js ISR

```typescript
// In page components
export const revalidate = 3600 // 1 hour ISR

// In API routes
import { revalidatePath, revalidateTag } from 'next/cache'

revalidatePath('/articles/[slug]')
revalidateTag('articles')
```

## Cache Keys

The system uses a structured cache key format:

```typescript
export const cacheKeys = {
  article: (id: string) => `article:${id}`,
  articleBySlug: (slug: string) => `article:slug:${slug}`,
  articlesList: (page: number, limit: number, status?: string) => 
    `articles:list:${page}:${limit}${status ? `:${status}` : ''}`,
  searchResults: (query: string, page: number, limit: number) => 
    `search:${encodeURIComponent(query)}:${page}:${limit}`,
  // ... more keys
}
```

## Monitoring

### Cache Metrics

The system tracks:
- Hit/miss ratios
- Operation latencies
- Error rates
- Memory usage
- Connection health

### Health Monitoring

```typescript
import { getCacheHealth } from '@/lib/cache'

const health = await getCacheHealth()
console.log(health.status) // 'healthy' | 'degraded' | 'unhealthy'
```

### Performance Monitoring

```typescript
import { cacheMetrics } from '@/lib/cache'

const metrics = cacheMetrics.getMetrics()
console.log(`Hit ratio: ${(metrics.hitRatio * 100).toFixed(1)}%`)
```

## Cache Warming

### Automatic Warming

The system automatically warms critical caches:

```typescript
// Warm homepage cache every 10 minutes
// Warm popular articles every 30 minutes
// Warm recent articles every 15 minutes
```

### Manual Warming

```typescript
import { cacheWarmer } from '@/lib/cache'

await cacheWarmer.warmHomepage()
await cacheWarmer.warmPopularArticles()
```

## Invalidation Strategies

### Article Updates

When an article is updated:
1. Invalidate specific article cache
2. Invalidate article lists
3. Invalidate search results
4. Revalidate Next.js pages

### Article Publishing

When an article is published:
1. All article update invalidations
2. Revalidate homepage
3. Revalidate article listing pages
4. Update site statistics

### Bulk Operations

For bulk operations:
1. Collect all affected keys
2. Batch invalidation operations
3. Minimize Redis round trips

## Performance Targets

- **Cache Hit Ratio**: > 90%
- **Cache Latency**: < 50ms (P95)
- **Error Rate**: < 1%
- **Memory Usage**: Monitor and alert

## Best Practices

### Do's

- Use structured cache keys
- Set appropriate TTL values
- Implement proper invalidation
- Monitor cache performance
- Use cache-aside pattern
- Batch operations when possible

### Don'ts

- Don't cache user-specific data in shared cache
- Don't use very long TTL for frequently changing data
- Don't ignore cache errors (implement fallbacks)
- Don't cache large objects (> 1MB)
- Don't forget to invalidate on updates

## Troubleshooting

### Common Issues

1. **Low Hit Ratio**
   - Check TTL values
   - Verify cache keys are consistent
   - Monitor invalidation patterns

2. **High Latency**
   - Check Redis connection
   - Monitor Redis memory usage
   - Consider Redis optimization

3. **Cache Misses**
   - Verify cache warming
   - Check invalidation logic
   - Monitor cache key patterns

### Debugging

```typescript
import { cacheDebugger } from '@/lib/cache'

// Enable debug mode in development
cacheDebugger.log('Cache operation', { key, operation })
```

### Health Checks

```bash
# API endpoint for cache health
GET /api/admin/cache?action=health

# Response
{
  "status": "healthy",
  "redis": {
    "connected": true,
    "memory": "1.5M",
    "keyCount": 1250,
    "latency": 15
  },
  "metrics": {
    "hitRatio": 0.92,
    "errors": 0
  }
}
```

## API Endpoints

### Cache Management

```bash
# Get cache statistics
GET /api/admin/cache

# Invalidate specific cache
POST /api/admin/cache
{
  "action": "invalidate",
  "target": "article",
  "articleId": "123"
}

# Warm cache
POST /api/admin/cache
{
  "action": "warm",
  "target": "homepage"
}
```

## Testing

The caching system includes comprehensive tests:

```bash
# Run cache tests
npm test cache.test.ts

# Test coverage includes:
# - Cache operations
# - Invalidation logic
# - Error handling
# - Performance metrics
# - Health monitoring
```

## Deployment

### Production Setup

1. Configure Redis instance
2. Set environment variables
3. Enable cache warming
4. Monitor performance
5. Set up alerts

### Scaling Considerations

- Redis clustering for high availability
- Cache warming coordination
- Monitoring and alerting
- Performance optimization

## Future Enhancements

- Cache compression for large objects
- Distributed cache invalidation
- Advanced cache warming strategies
- Machine learning for cache optimization
- Real-time cache analytics dashboard