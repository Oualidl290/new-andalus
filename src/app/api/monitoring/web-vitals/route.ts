import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const webVitalSchema = z.object({
  type: z.enum(['web-vital', 'web-vitals-report']),
  metric: z.object({
    id: z.string(),
    name: z.string(),
    value: z.number(),
    rating: z.enum(['good', 'needs-improvement', 'poor']),
    delta: z.number(),
    navigationType: z.string(),
  }).optional(),
  report: z.object({
    url: z.string(),
    timestamp: z.number(),
    metrics: z.array(z.object({
      id: z.string(),
      name: z.string(),
      value: z.number(),
      rating: z.enum(['good', 'needs-improvement', 'poor']),
      delta: z.number(),
      navigationType: z.string(),
    })),
    userAgent: z.string(),
    connectionType: z.string().optional(),
  }).optional(),
  url: z.string().optional(),
  timestamp: z.number().optional(),
})

// In-memory storage for demo purposes
// In production, you'd want to use a proper database or analytics service
const webVitalsData: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = webVitalSchema.parse(body)

    // Store the data
    webVitalsData.push({
      ...validatedData,
      receivedAt: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent'),
    })

    // Log performance issues
    if (validatedData.type === 'web-vital' && validatedData.metric) {
      const { metric } = validatedData
      if (metric.rating === 'poor') {
        console.warn(`Poor ${metric.name} performance:`, {
          value: metric.value,
          url: validatedData.url,
          timestamp: validatedData.timestamp,
        })
      }
    }

    // Log complete reports
    if (validatedData.type === 'web-vitals-report' && validatedData.report) {
      const poorMetrics = validatedData.report.metrics.filter(m => m.rating === 'poor')
      if (poorMetrics.length > 0) {
        console.warn(`Page performance issues detected:`, {
          url: validatedData.report.url,
          poorMetrics: poorMetrics.map(m => ({ name: m.name, value: m.value })),
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing web vitals data:', error)
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

    let filteredData = webVitalsData

    if (type) {
      filteredData = filteredData.filter(item => item.type === type)
    }

    if (url) {
      filteredData = filteredData.filter(item => 
        item.url === url || item.report?.url === url
      )
    }

    // Get recent data
    const recentData = filteredData
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
      .slice(0, limit)

    // Calculate aggregated metrics
    const reports = filteredData.filter(item => item.type === 'web-vitals-report')
    const aggregatedMetrics = calculateAggregatedMetrics(reports)

    return NextResponse.json({
      success: true,
      data: {
        recent: recentData,
        aggregated: aggregatedMetrics,
        total: filteredData.length,
      },
    })
  } catch (error) {
    console.error('Error fetching web vitals data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

function calculateAggregatedMetrics(reports: any[]) {
  if (reports.length === 0) return {}

  const metricsByName: { [key: string]: number[] } = {}
  
  reports.forEach(report => {
    if (report.report?.metrics) {
      report.report.metrics.forEach((metric: any) => {
        if (!metricsByName[metric.name]) {
          metricsByName[metric.name] = []
        }
        metricsByName[metric.name].push(metric.value)
      })
    }
  })

  const aggregated: { [key: string]: any } = {}
  
  Object.entries(metricsByName).forEach(([name, values]) => {
    values.sort((a, b) => a - b)
    
    aggregated[name] = {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p75: values[Math.floor(values.length * 0.75)],
      p90: values[Math.floor(values.length * 0.9)],
      p95: values[Math.floor(values.length * 0.95)],
    }
  })

  return aggregated
}