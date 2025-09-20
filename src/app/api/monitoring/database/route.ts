import { NextRequest, NextResponse } from 'next/server'
import { dbMonitor } from '@/lib/monitoring/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const slowOnly = searchParams.get('slowOnly') === 'true'
    const errorOnly = searchParams.get('errorOnly') === 'true'

    const metrics = dbMonitor.getMetrics({
      limit,
      slowOnly,
      errorOnly,
    })

    const stats = dbMonitor.getStats()

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        stats,
        total: metrics.length,
      },
    })
  } catch (error) {
    console.error('Error fetching database metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database metrics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'clear') {
      dbMonitor.clearMetrics()
      return NextResponse.json({ success: true, message: 'Metrics cleared' })
    }

    if (action === 'configure') {
      const { slowQueryThreshold, enabled } = body
      if (typeof slowQueryThreshold === 'number') {
        dbMonitor.setSlowQueryThreshold(slowQueryThreshold)
      }
      if (typeof enabled === 'boolean') {
        dbMonitor.setEnabled(enabled)
      }
      return NextResponse.json({ success: true, message: 'Configuration updated' })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing database monitoring request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}