import { NextRequest, NextResponse } from 'next/server'
import { performanceOptimizer, checkPerformanceBudget } from '@/lib/optimization/performance'
import { dbMonitor } from '@/lib/monitoring/database'
import { ImagePerformanceMonitor } from '@/lib/optimization/images'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'budget-check') {
      // Check performance budget
      const metrics = {
        database: dbMonitor.getStats(),
        images: ImagePerformanceMonitor.getStats(),
      }

      const budgetCheck = checkPerformanceBudget(metrics)
      
      return NextResponse.json({
        success: true,
        data: {
          metrics,
          budgetCheck,
        },
      })
    }

    if (action === 'recommendations') {
      // Get optimization recommendations
      const dbStats = dbMonitor.getStats()
      const imageStats = ImagePerformanceMonitor.getStats()
      
      const recommendations = []

      // Database recommendations
      if (dbStats.slowQueries > 0) {
        recommendations.push({
          type: 'database',
          priority: 'high',
          message: `${dbStats.slowQueries} slow queries detected. Consider adding indexes or optimizing queries.`,
        })
      }

      if (dbStats.avgDuration > 50) {
        recommendations.push({
          type: 'database',
          priority: 'medium',
          message: `Average query time is ${dbStats.avgDuration.toFixed(2)}ms. Consider query optimization.`,
        })
      }

      // Image recommendations
      if (imageStats.largeImages > 0) {
        recommendations.push({
          type: 'images',
          priority: 'medium',
          message: `${imageStats.largeImages} large images detected. Consider compression or WebP format.`,
        })
      }

      if (imageStats.slowImages > 0) {
        recommendations.push({
          type: 'images',
          priority: 'high',
          message: `${imageStats.slowImages} slow-loading images detected. Consider optimization.`,
        })
      }

      // Bundle recommendations
      recommendations.push({
        type: 'bundle',
        priority: 'low',
        message: 'Run bundle analysis with ANALYZE=true npm run build to identify optimization opportunities.',
      })

      return NextResponse.json({
        success: true,
        data: {
          recommendations,
          stats: {
            database: dbStats,
            images: imageStats,
          },
        },
      })
    }

    // Default: return all performance data
    const [dbStats, imageStats] = await Promise.all([
      dbMonitor.getStats(),
      ImagePerformanceMonitor.getStats(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        database: dbStats,
        images: imageStats,
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'optimize') {
      const { type } = body // 'database', 'cache', 'images', or 'all'
      
      let result
      
      switch (type) {
        case 'database':
          result = await performanceOptimizer.optimizeDatabase()
          break
        case 'cache':
          result = await performanceOptimizer.optimizeCache()
          break
        case 'images':
          result = await performanceOptimizer.optimizeImages()
          break
        case 'all':
        default:
          result = await performanceOptimizer.runFullOptimization()
          break
      }

      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    if (action === 'clear-metrics') {
      const { type } = body
      
      if (type === 'database' || type === 'all') {
        dbMonitor.clearMetrics()
      }
      
      if (type === 'images' || type === 'all') {
        ImagePerformanceMonitor.clearMetrics()
      }

      return NextResponse.json({
        success: true,
        message: `${type} metrics cleared`,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing performance optimization:', error)
    return NextResponse.json(
      { error: 'Failed to process optimization request' },
      { status: 500 }
    )
  }
}