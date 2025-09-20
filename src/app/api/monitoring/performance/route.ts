import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const performanceEventSchema = z.object({
  type: z.enum(['long-task', 'layout-shift', 'slow-resource', 'custom-timer']),
  name: z.string().optional(),
  duration: z.number().optional(),
  value: z.number().optional(),
  startTime: z.number().optional(),
  transferSize: z.number().optional(),
  initiatorType: z.string().optional(),
  sources: z.array(z.any()).optional(),
  url: z.string(),
  timestamp: z.number(),
})

// In-memory storage for demo purposes
const performanceEvents: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = performanceEventSchema.parse(body)

    // Store the event
    performanceEvents.push({
      ...validatedData,
      receivedAt: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent'),
    })

    // Log performance issues
    if (validatedData.type === 'long-task' && validatedData.duration && validatedData.duration > 100) {
      console.warn(`Long task detected: ${validatedData.duration}ms on ${validatedData.url}`)
    }

    if (validatedData.type === 'layout-shift' && validatedData.value && validatedData.value > 0.25) {
      console.warn(`Significant layout shift: ${validatedData.value} on ${validatedData.url}`)
    }

    if (validatedData.type === 'slow-resource' && validatedData.duration && validatedData.duration > 5000) {
      console.warn(`Very slow resource: ${validatedData.name} (${validatedData.duration}ms) on ${validatedData.url}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing performance event:', error)
    return NextResponse.json(
      { error: 'Invalid data format' },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const type = searchParams.get('type')
    const url = searchParams.get('url')

    let filteredEvents = performanceEvents

    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type)
    }

    if (url) {
      filteredEvents = filteredEvents.filter(event => event.url === url)
    }

    // Get recent events
    const recentEvents = filteredEvents
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, limit)

    // Calculate performance statistics
    const stats = calculatePerformanceStats(filteredEvents)

    return NextResponse.json({
      success: true,
      data: {
        events: recentEvents,
        stats,
        total: filteredEvents.length,
      },
    })
  } catch (error) {
    console.error('Error fetching performance events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

function calculatePerformanceStats(events: any[]) {
  const stats: any = {
    longTasks: {
      count: 0,
      avgDuration: 0,
      maxDuration: 0,
    },
    layoutShifts: {
      count: 0,
      avgValue: 0,
      maxValue: 0,
    },
    slowResources: {
      count: 0,
      avgDuration: 0,
      maxDuration: 0,
    },
    customTimers: {
      count: 0,
      avgDuration: 0,
      maxDuration: 0,
    },
  }

  const longTasks = events.filter(e => e.type === 'long-task')
  const layoutShifts = events.filter(e => e.type === 'layout-shift')
  const slowResources = events.filter(e => e.type === 'slow-resource')
  const customTimers = events.filter(e => e.type === 'custom-timer')

  // Long tasks stats
  if (longTasks.length > 0) {
    const durations = longTasks.map(t => t.duration).filter(Boolean)
    stats.longTasks.count = longTasks.length
    stats.longTasks.avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
    stats.longTasks.maxDuration = Math.max(...durations)
  }

  // Layout shifts stats
  if (layoutShifts.length > 0) {
    const values = layoutShifts.map(s => s.value).filter(Boolean)
    stats.layoutShifts.count = layoutShifts.length
    stats.layoutShifts.avgValue = values.reduce((sum, v) => sum + v, 0) / values.length
    stats.layoutShifts.maxValue = Math.max(...values)
  }

  // Slow resources stats
  if (slowResources.length > 0) {
    const durations = slowResources.map(r => r.duration).filter(Boolean)
    stats.slowResources.count = slowResources.length
    stats.slowResources.avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
    stats.slowResources.maxDuration = Math.max(...durations)
  }

  // Custom timers stats
  if (customTimers.length > 0) {
    const durations = customTimers.map(t => t.duration).filter(Boolean)
    stats.customTimers.count = customTimers.length
    stats.customTimers.avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
    stats.customTimers.maxDuration = Math.max(...durations)
  }

  return stats
}