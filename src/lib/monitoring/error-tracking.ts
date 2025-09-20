export interface ErrorReport {
  id: string
  message: string
  stack?: string
  url: string
  userAgent: string
  timestamp: number
  userId?: string
  level: 'error' | 'warning' | 'info'
  context?: Record<string, any>
  fingerprint?: string
}

export interface PerformanceIssue {
  type: 'slow-query' | 'memory-leak' | 'high-cpu' | 'large-bundle'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metrics: Record<string, number>
  timestamp: number
  url?: string
}

class ErrorTracker {
  private static instance: ErrorTracker
  private errors: ErrorReport[] = []
  private performanceIssues: PerformanceIssue[] = []
  private enabled: boolean = true

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers()
    }
  }

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker()
    }
    return ErrorTracker.instance
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  private setupGlobalErrorHandlers() {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        line: event.lineno,
        column: event.colno,
      })
    })

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
      })
    })

    // Handle React error boundaries (if using React)
    if (typeof window !== 'undefined' && (window as any).React) {
      const originalConsoleError = console.error
      console.error = (...args) => {
        // Check if this is a React error
        if (args[0]?.includes?.('React') || args[0]?.includes?.('component')) {
          this.captureError({
            message: args.join(' '),
            url: window.location.href,
            level: 'error',
            context: { type: 'react-error' },
          })
        }
        originalConsoleError.apply(console, args)
      }
    }
  }

  captureError(errorInfo: {
    message: string
    stack?: string
    url?: string
    line?: number
    column?: number
    level?: 'error' | 'warning' | 'info'
    context?: Record<string, any>
    userId?: string
  }) {
    if (!this.enabled) return

    const error: ErrorReport = {
      id: this.generateId(),
      message: errorInfo.message,
      stack: errorInfo.stack,
      url: errorInfo.url || (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: Date.now(),
      level: errorInfo.level || 'error',
      context: {
        ...errorInfo.context,
        line: errorInfo.line,
        column: errorInfo.column,
      },
      userId: errorInfo.userId,
      fingerprint: this.generateFingerprint(errorInfo.message, errorInfo.stack),
    }

    this.errors.push(error)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', error)
    }

    // Send to monitoring endpoint
    this.sendErrorReport(error)

    // Keep only recent errors (last 100)
    if (this.errors.length > 100) {
      this.errors.splice(0, this.errors.length - 100)
    }
  }

  capturePerformanceIssue(issue: Omit<PerformanceIssue, 'timestamp'>) {
    if (!this.enabled) return

    const performanceIssue: PerformanceIssue = {
      ...issue,
      timestamp: Date.now(),
    }

    this.performanceIssues.push(performanceIssue)

    // Log critical issues
    if (issue.severity === 'critical') {
      console.error('Critical performance issue:', performanceIssue)
    }

    // Send to monitoring endpoint
    this.sendPerformanceIssue(performanceIssue)

    // Keep only recent issues (last 50)
    if (this.performanceIssues.length > 50) {
      this.performanceIssues.splice(0, this.performanceIssues.length - 50)
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateFingerprint(message: string, stack?: string): string {
    // Create a fingerprint for grouping similar errors
    const key = stack ? stack.split('\n')[0] : message
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16)
  }

  private async sendErrorReport(error: ErrorReport) {
    if (typeof window === 'undefined') return

    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'error', error }),
        keepalive: true,
      })
    } catch (err) {
      console.warn('Failed to send error report:', err)
    }
  }

  private async sendPerformanceIssue(issue: PerformanceIssue) {
    if (typeof window === 'undefined') return

    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'performance-issue', issue }),
        keepalive: true,
      })
    } catch (err) {
      console.warn('Failed to send performance issue:', err)
    }
  }

  getErrors(options?: {
    level?: 'error' | 'warning' | 'info'
    limit?: number
    fingerprint?: string
  }): ErrorReport[] {
    let filtered = [...this.errors]

    if (options?.level) {
      filtered = filtered.filter(error => error.level === options.level)
    }

    if (options?.fingerprint) {
      filtered = filtered.filter(error => error.fingerprint === options.fingerprint)
    }

    // Sort by timestamp (most recent first)
    filtered.sort((a, b) => b.timestamp - a.timestamp)

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  getPerformanceIssues(options?: {
    type?: string
    severity?: string
    limit?: number
  }): PerformanceIssue[] {
    let filtered = [...this.performanceIssues]

    if (options?.type) {
      filtered = filtered.filter(issue => issue.type === options.type)
    }

    if (options?.severity) {
      filtered = filtered.filter(issue => issue.severity === options.severity)
    }

    // Sort by timestamp (most recent first)
    filtered.sort((a, b) => b.timestamp - a.timestamp)

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  getErrorStats(): {
    totalErrors: number
    errorsByLevel: Record<string, number>
    errorsByFingerprint: Record<string, number>
    recentErrors: number
  } {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    const errorsByLevel: Record<string, number> = {}
    const errorsByFingerprint: Record<string, number> = {}
    let recentErrors = 0

    this.errors.forEach(error => {
      // Count by level
      errorsByLevel[error.level] = (errorsByLevel[error.level] || 0) + 1

      // Count by fingerprint
      if (error.fingerprint) {
        errorsByFingerprint[error.fingerprint] = (errorsByFingerprint[error.fingerprint] || 0) + 1
      }

      // Count recent errors
      if (error.timestamp > oneHourAgo) {
        recentErrors++
      }
    })

    return {
      totalErrors: this.errors.length,
      errorsByLevel,
      errorsByFingerprint,
      recentErrors,
    }
  }

  clearErrors() {
    this.errors.length = 0
    this.performanceIssues.length = 0
  }
}

// Singleton instance
export const errorTracker = ErrorTracker.getInstance()

// React Error Boundary component
export class ErrorBoundary extends Error {
  constructor(
    public componentStack: string,
    public errorBoundary: string
  ) {
    super('React Error Boundary')
    this.name = 'ErrorBoundary'
  }
}

// Hook for manual error reporting
export function useErrorReporting() {
  const reportError = (error: Error, context?: Record<string, any>) => {
    errorTracker.captureError({
      message: error.message,
      stack: error.stack,
      level: 'error',
      context,
    })
  }

  const reportWarning = (message: string, context?: Record<string, any>) => {
    errorTracker.captureError({
      message,
      level: 'warning',
      context,
    })
  }

  const reportInfo = (message: string, context?: Record<string, any>) => {
    errorTracker.captureError({
      message,
      level: 'info',
      context,
    })
  }

  return { reportError, reportWarning, reportInfo }
}

// Performance monitoring integration
export function monitorPerformance() {
  if (typeof window === 'undefined') return

  // Monitor memory usage
  if ('memory' in performance) {
    const checkMemory = () => {
      const memory = (performance as any).memory
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        errorTracker.capturePerformanceIssue({
          type: 'memory-leak',
          severity: 'high',
          description: 'High memory usage detected',
          metrics: {
            usedJSHeapSize: memory.usedJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
          },
        })
      }
    }

    setInterval(checkMemory, 30000) // Check every 30 seconds
  }

  // Monitor CPU usage (approximate)
  let lastTime = performance.now()
  let frameCount = 0

  const checkCPU = () => {
    frameCount++
    const currentTime = performance.now()
    
    if (currentTime - lastTime >= 1000) { // Every second
      const fps = frameCount
      frameCount = 0
      lastTime = currentTime

      if (fps < 30) { // Low FPS indicates high CPU usage
        errorTracker.capturePerformanceIssue({
          type: 'high-cpu',
          severity: fps < 15 ? 'high' : 'medium',
          description: 'Low frame rate detected, possible high CPU usage',
          metrics: {
            fps,
            timestamp: currentTime,
          },
        })
      }
    }

    requestAnimationFrame(checkCPU)
  }

  requestAnimationFrame(checkCPU)
}