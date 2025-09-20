import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const errorReportSchema = z.object({
  type: z.enum(['error', 'performance-issue']),
  error: z.object({
    id: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    url: z.string(),
    userAgent: z.string(),
    timestamp: z.number(),
    userId: z.string().optional(),
    level: z.enum(['error', 'warning', 'info']),
    context: z.record(z.string(), z.any()).optional(),
    fingerprint: z.string().optional(),
  }).optional(),
  issue: z.object({
    type: z.enum(['slow-query', 'memory-leak', 'high-cpu', 'large-bundle']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    metrics: z.record(z.string(), z.number()),
    timestamp: z.number(),
    url: z.string().optional(),
  }).optional(),
})

// In-memory storage for demo purposes
const errorReports: any[] = []
const performanceIssues: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = errorReportSchema.parse(body)

    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    if (validatedData.type === 'error' && validatedData.error) {
      const errorReport = {
        ...validatedData.error,
        receivedAt: new Date().toISOString(),
        clientIP,
        serverUserAgent: userAgent,
      }

      errorReports.push(errorReport)

      // Log critical errors
      if (errorReport.level === 'error') {
        console.error('Client error reported:', {
          message: errorReport.message,
          url: errorReport.url,
          fingerprint: errorReport.fingerprint,
          timestamp: new Date(errorReport.timestamp).toISOString(),
        })
      }

      // Alert on high error rates
      const recentErrors = errorReports.filter(
        report => Date.now() - report.timestamp < 5 * 60 * 1000 // Last 5 minutes
      )

      if (recentErrors.length > 10) {
        console.warn(`High error rate detected: ${recentErrors.length} errors in the last 5 minutes`)
      }
    }

    if (validatedData.type === 'performance-issue' && validatedData.issue) {
      const issue = {
        ...validatedData.issue,
        receivedAt: new Date().toISOString(),
        clientIP,
        userAgent,
      }

      performanceIssues.push(issue)

      // Log critical performance issues
      if (issue.severity === 'critical' || issue.severity === 'high') {
        console.warn('Performance issue reported:', {
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          metrics: issue.metrics,
        })
      }
    }

    // Keep only recent data (last 1000 items)
    if (errorReports.length > 1000) {
      errorReports.splice(0, errorReports.length - 1000)
    }
    if (performanceIssues.length > 1000) {
      performanceIssues.splice(0, performanceIssues.length - 1000)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing error report:', error)
    return NextResponse.json(
      { error: 'Invalid data format' },
      { status: 400 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'errors' or 'performance'
    const limit = parseInt(searchParams.get('limit') || '50')
    const level = searchParams.get('level')
    const severity = searchParams.get('severity')
    const fingerprint = searchParams.get('fingerprint')

    let data: any[] = []
    let stats: any = {}

    if (type === 'errors' || !type) {
      let filteredErrors = errorReports

      if (level) {
        filteredErrors = filteredErrors.filter(error => error.level === level)
      }

      if (fingerprint) {
        filteredErrors = filteredErrors.filter(error => error.fingerprint === fingerprint)
      }

      data = filteredErrors
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)

      stats.errors = calculateErrorStats(errorReports)
    }

    if (type === 'performance' || !type) {
      let filteredIssues = performanceIssues

      if (severity) {
        filteredIssues = filteredIssues.filter(issue => issue.severity === severity)
      }

      const performanceData = filteredIssues
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit)

      if (type === 'performance') {
        data = performanceData
      } else {
        stats.performance = calculatePerformanceStats(performanceIssues)
      }
    }

    return NextResponse.json({
      success: true,
      data: type ? data : { errors: data, performance: performanceIssues.slice(0, 10) },
      stats,
      total: type === 'errors' ? errorReports.length : 
             type === 'performance' ? performanceIssues.length :
             errorReports.length + performanceIssues.length,
    })
  } catch (error) {
    console.error('Error fetching error reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

function calculateErrorStats(errors: any[]) {
  if (errors.length === 0) {
    return {
      total: 0,
      byLevel: {},
      byFingerprint: {},
      recent: 0,
      topErrors: [],
    }
  }

  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  const byLevel: { [key: string]: number } = {}
  const byFingerprint: { [key: string]: number } = {}
  let recent = 0

  errors.forEach(error => {
    // Count by level
    byLevel[error.level] = (byLevel[error.level] || 0) + 1

    // Count by fingerprint
    if (error.fingerprint) {
      byFingerprint[error.fingerprint] = (byFingerprint[error.fingerprint] || 0) + 1
    }

    // Count recent errors
    if (error.timestamp > oneHourAgo) {
      recent++
    }
  })

  // Top errors by frequency
  const topErrors = Object.entries(byFingerprint)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([fingerprint, count]) => {
      const example = errors.find(e => e.fingerprint === fingerprint)
      return {
        fingerprint,
        count,
        message: example?.message || 'Unknown',
        lastSeen: Math.max(...errors.filter(e => e.fingerprint === fingerprint).map(e => e.timestamp)),
      }
    })

  return {
    total: errors.length,
    byLevel,
    byFingerprint,
    recent,
    topErrors,
  }
}

function calculatePerformanceStats(issues: any[]) {
  if (issues.length === 0) {
    return {
      total: 0,
      byType: {},
      bySeverity: {},
      recent: 0,
    }
  }

  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  const byType: { [key: string]: number } = {}
  const bySeverity: { [key: string]: number } = {}
  let recent = 0

  issues.forEach(issue => {
    // Count by type
    byType[issue.type] = (byType[issue.type] || 0) + 1

    // Count by severity
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1

    // Count recent issues
    if (issue.timestamp > oneHourAgo) {
      recent++
    }
  })

  return {
    total: issues.length,
    byType,
    bySeverity,
    recent,
  }
}