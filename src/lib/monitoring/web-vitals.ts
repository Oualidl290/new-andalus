import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

export interface WebVitalsMetric {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  navigationType: string
}

export interface WebVitalsReport {
  url: string
  timestamp: number
  metrics: WebVitalsMetric[]
  userAgent: string
  connectionType?: string
}

// Thresholds based on Google's Core Web Vitals recommendations
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 }, // INP replaces FID
  FID: { good: 100, poor: 300 }, // Keep for backward compatibility
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS]
  if (!threshold) return 'good'
  
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

export function initWebVitals(onReport?: (report: WebVitalsReport) => void) {
  if (typeof window === 'undefined') return

  const metrics: WebVitalsMetric[] = []
  
  const handleMetric = (metric: any) => {
    const webVitalsMetric: WebVitalsMetric = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: getRating(metric.name, metric.value),
      delta: metric.delta,
      navigationType: metric.navigationType || 'navigate',
    }
    
    metrics.push(webVitalsMetric)
    
    // Send individual metric for real-time monitoring
    sendMetric(webVitalsMetric)
  }

  // Collect all Core Web Vitals
  onCLS(handleMetric)
  onINP(handleMetric) // INP replaces FID in newer versions
  onFCP(handleMetric)
  onLCP(handleMetric)
  onTTFB(handleMetric)

  // Send complete report when page is about to unload
  window.addEventListener('beforeunload', () => {
    if (metrics.length > 0) {
      const report: WebVitalsReport = {
        url: window.location.href,
        timestamp: Date.now(),
        metrics,
        userAgent: navigator.userAgent,
        connectionType: (navigator as any).connection?.effectiveType,
      }
      
      if (onReport) {
        onReport(report)
      } else {
        sendReport(report)
      }
    }
  })
}

function sendMetric(metric: WebVitalsMetric) {
  if (typeof window === 'undefined') return

  // Use sendBeacon for reliable delivery
  if (navigator.sendBeacon) {
    const data = JSON.stringify({
      type: 'web-vital',
      metric,
      url: window.location.href,
      timestamp: Date.now(),
    })
    
    navigator.sendBeacon('/api/monitoring/web-vitals', data)
  } else {
    // Fallback to fetch with keepalive
    fetch('/api/monitoring/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web-vital',
        metric,
        url: window.location.href,
        timestamp: Date.now(),
      }),
      keepalive: true,
    }).catch(console.error)
  }
}

function sendReport(report: WebVitalsReport) {
  if (typeof window === 'undefined') return

  if (navigator.sendBeacon) {
    const data = JSON.stringify({
      type: 'web-vitals-report',
      report,
    })
    
    navigator.sendBeacon('/api/monitoring/web-vitals', data)
  } else {
    fetch('/api/monitoring/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web-vitals-report',
        report,
      }),
      keepalive: true,
    }).catch(console.error)
  }
}

// Helper function to get current page performance metrics
export function getCurrentPageMetrics(): Promise<WebVitalsMetric[]> {
  return new Promise((resolve) => {
    const metrics: WebVitalsMetric[] = []
    let collected = 0
    const total = 5 // LCP, FID, CLS, FCP, TTFB

    const handleMetric = (metric: any) => {
      metrics.push({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        rating: getRating(metric.name, metric.value),
        delta: metric.delta,
        navigationType: metric.navigationType || 'navigate',
      })
      
      collected++
      if (collected >= total) {
        resolve(metrics)
      }
    }

    onCLS(handleMetric)
    onINP(handleMetric)
    onFCP(handleMetric)
    onLCP(handleMetric)
    onTTFB(handleMetric)

    // Timeout after 5 seconds
    setTimeout(() => resolve(metrics), 5000)
  })
}

// Performance budget checker
export function checkPerformanceBudget(metrics: WebVitalsMetric[]): {
  passed: boolean
  violations: string[]
} {
  const violations: string[] = []
  
  metrics.forEach(metric => {
    if (metric.rating === 'poor') {
      violations.push(`${metric.name}: ${metric.value}ms (threshold: ${THRESHOLDS[metric.name as keyof typeof THRESHOLDS]?.poor}ms)`)
    }
  })
  
  return {
    passed: violations.length === 0,
    violations,
  }
}