'use client'

import { useEffect } from 'react'
import { initWebVitals } from '@/lib/monitoring/web-vitals'

interface PerformanceMonitorProps {
  enabled?: boolean
  debug?: boolean
}

export function PerformanceMonitor({ enabled = true, debug = false }: PerformanceMonitorProps) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // Initialize Web Vitals monitoring
    initWebVitals((report) => {
      if (debug) {
        console.log('Web Vitals Report:', report)
      }
    })

    // Monitor long tasks (performance bottlenecks)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              if (debug) {
                console.warn('Long task detected:', {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name,
                })
              }

              // Send to monitoring endpoint
              fetch('/api/monitoring/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'long-task',
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name,
                  url: window.location.href,
                  timestamp: Date.now(),
                }),
                keepalive: true,
              }).catch(console.error)
            }
          })
        })

        longTaskObserver.observe({ entryTypes: ['longtask'] })

        // Monitor layout shifts
        const layoutShiftObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.value > 0.1) { // Significant layout shift
              if (debug) {
                console.warn('Layout shift detected:', {
                  value: entry.value,
                  startTime: entry.startTime,
                  sources: entry.sources,
                })
              }

              fetch('/api/monitoring/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'layout-shift',
                  value: entry.value,
                  startTime: entry.startTime,
                  sources: entry.sources?.map((source: any) => ({
                    node: source.node?.tagName,
                    previousRect: source.previousRect,
                    currentRect: source.currentRect,
                  })),
                  url: window.location.href,
                  timestamp: Date.now(),
                }),
                keepalive: true,
              }).catch(console.error)
            }
          })
        })

        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })

        // Cleanup observers on unmount
        return () => {
          longTaskObserver.disconnect()
          layoutShiftObserver.disconnect()
        }
      } catch (error) {
        console.error('Error setting up performance observers:', error)
      }
    }

    // Monitor resource loading performance
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            // Monitor slow resources (> 2 seconds)
            if (entry.duration > 2000) {
              if (debug) {
                console.warn('Slow resource detected:', {
                  name: entry.name,
                  duration: entry.duration,
                  transferSize: entry.transferSize,
                  initiatorType: entry.initiatorType,
                })
              }

              fetch('/api/monitoring/performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'slow-resource',
                  name: entry.name,
                  duration: entry.duration,
                  transferSize: entry.transferSize,
                  initiatorType: entry.initiatorType,
                  url: window.location.href,
                  timestamp: Date.now(),
                }),
                keepalive: true,
              }).catch(console.error)
            }
          })
        })

        resourceObserver.observe({ entryTypes: ['resource'] })

        return () => {
          resourceObserver.disconnect()
        }
      } catch (error) {
        console.error('Error setting up resource observer:', error)
      }
    }
  }, [enabled, debug])

  // This component doesn't render anything
  return null
}

// Hook for manual performance measurements
export function usePerformanceTimer() {
  const startTimer = (name: string) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${name}-start`)
    }
  }

  const endTimer = (name: string) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)
      
      const measure = performance.getEntriesByName(name, 'measure')[0]
      if (measure) {
        // Send measurement to monitoring
        fetch('/api/monitoring/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'custom-timer',
            name,
            duration: measure.duration,
            url: window.location.href,
            timestamp: Date.now(),
          }),
          keepalive: true,
        }).catch(console.error)

        return measure.duration
      }
    }
    return 0
  }

  return { startTimer, endTimer }
}