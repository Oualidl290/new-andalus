import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { 
  getCacheHealth, 
  getCacheStats, 
  getOptimizationRecommendations,
  cacheInvalidator,
  cacheWarmer
} from '@/lib/cache'

// GET /api/admin/cache - Get cache statistics and health
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'health':
        const health = await getCacheHealth()
        return NextResponse.json({ success: true, data: health })

      case 'stats':
        const stats = await getCacheStats()
        return NextResponse.json({ success: true, data: stats })

      case 'recommendations':
        const recommendations = await getOptimizationRecommendations()
        return NextResponse.json({ success: true, data: recommendations })

      default:
        // Return comprehensive cache information
        const [healthData, statsData, recommendationsData] = await Promise.all([
          getCacheHealth(),
          getCacheStats(),
          getOptimizationRecommendations()
        ])

        return NextResponse.json({
          success: true,
          data: {
            health: healthData,
            stats: statsData,
            recommendations: recommendationsData,
          }
        })
    }
  } catch (error) {
    console.error('Cache API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/cache - Cache management operations
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, target, articleId, slug, query } = body

    switch (action) {
      case 'invalidate':
        switch (target) {
          case 'article':
            if (!articleId) {
              return NextResponse.json(
                { success: false, error: 'Article ID required' },
                { status: 400 }
              )
            }
            await cacheInvalidator.invalidateArticle(articleId, slug)
            return NextResponse.json({
              success: true,
              message: `Invalidated cache for article ${articleId}`
            })

          case 'articles':
            await cacheInvalidator.invalidateArticleLists()
            return NextResponse.json({
              success: true,
              message: 'Invalidated all article list caches'
            })

          case 'search':
            await cacheInvalidator.invalidateSearch(query)
            return NextResponse.json({
              success: true,
              message: query 
                ? `Invalidated search cache for query: ${query}`
                : 'Invalidated all search caches'
            })

          case 'stats':
            await cacheInvalidator.invalidateSiteStats()
            return NextResponse.json({
              success: true,
              message: 'Invalidated site statistics cache'
            })

          case 'all':
            await cacheInvalidator.flushAllCaches()
            return NextResponse.json({
              success: true,
              message: 'Flushed all caches'
            })

          default:
            return NextResponse.json(
              { success: false, error: 'Invalid invalidation target' },
              { status: 400 }
            )
        }

      case 'warm':
        switch (target) {
          case 'homepage':
            await cacheWarmer.warmHomepage()
            return NextResponse.json({
              success: true,
              message: 'Warmed homepage caches'
            })

          case 'popular':
            await cacheWarmer.warmPopularArticles()
            return NextResponse.json({
              success: true,
              message: 'Warmed popular articles cache'
            })

          case 'recent':
            await cacheWarmer.warmRecentArticles()
            return NextResponse.json({
              success: true,
              message: 'Warmed recent articles cache'
            })

          default:
            return NextResponse.json(
              { success: false, error: 'Invalid warming target' },
              { status: 400 }
            )
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Cache management error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}