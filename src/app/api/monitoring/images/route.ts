import { NextRequest, NextResponse } from 'next/server'
import { ImagePerformanceMonitor } from '@/lib/optimization/images'

export async function GET(request: NextRequest) {
  try {
    const metrics = ImagePerformanceMonitor.getMetrics()
    const stats = ImagePerformanceMonitor.getStats()

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        stats,
        total: metrics.length,
      },
    })
  } catch (error) {
    console.error('Error fetching image metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image metrics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle image performance tracking
    if (body.src && body.loadTime && body.size && body.format && body.dimensions) {
      ImagePerformanceMonitor.trackImageLoad(
        body.src,
        body.loadTime,
        body.size,
        body.format,
        body.dimensions
      )
      
      return NextResponse.json({ success: true })
    }

    // Handle clear action
    if (body.action === 'clear') {
      ImagePerformanceMonitor.clearMetrics()
      return NextResponse.json({ success: true, message: 'Image metrics cleared' })
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing image metrics:', error)
    return NextResponse.json(
      { error: 'Failed to process image metrics' },
      { status: 500 }
    )
  }
}