import { initWebVitals } from './web-vitals'
import { errorTracker, monitorPerformance } from './error-tracking'
import { dbMonitor, applySuggestedIndexes } from './database'
import { db } from '@/lib/db/connection'

export interface MonitoringConfig {
  webVitals: boolean
  errorTracking: boolean
  performanceMonitoring: boolean
  databaseMonitoring: boolean
  debug: boolean
}

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  webVitals: true,
  errorTracking: true,
  performanceMonitoring: true,
  databaseMonitoring: true,
  debug: process.env.NODE_ENV === 'development',
}

export class MonitoringManager {
  private static instance: MonitoringManager
  private config: MonitoringConfig
  private initialized = false

  private constructor(config: MonitoringConfig = DEFAULT_MONITORING_CONFIG) {
    this.config = config
  }

  static getInstance(config?: MonitoringConfig): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager(config)
    }
    return MonitoringManager.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('Monitoring already initialized')
      return
    }

    try {
      console.log('Initializing performance monitoring...')

      // Initialize Web Vitals monitoring
      if (this.config.webVitals && typeof window !== 'undefined') {
        initWebVitals()
        if (this.config.debug) {
          console.log('✓ Web Vitals monitoring initialized')
        }
      }

      // Initialize error tracking
      if (this.config.errorTracking) {
        errorTracker.setEnabled(true)
        if (this.config.debug) {
          console.log('✓ Error tracking initialized')
        }
      }

      // Initialize performance monitoring
      if (this.config.performanceMonitoring && typeof window !== 'undefined') {
        monitorPerformance()
        if (this.config.debug) {
          console.log('✓ Performance monitoring initialized')
        }
      }

      // Initialize database monitoring
      if (this.config.databaseMonitoring) {
        dbMonitor.setEnabled(true)
        
        // Apply database optimizations in production
        if (process.env.NODE_ENV === 'production') {
          try {
            await applySuggestedIndexes(db)
            if (this.config.debug) {
              console.log('✓ Database indexes applied')
            }
          } catch (error) {
            console.warn('Failed to apply database indexes:', error)
          }
        }
        
        if (this.config.debug) {
          console.log('✓ Database monitoring initialized')
        }
      }

      this.initialized = true
      console.log('✓ Performance monitoring fully initialized')

    } catch (error) {
      console.error('Failed to initialize monitoring:', error)
      throw error
    }
  }

  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Apply config changes
    if (this.initialized) {
      errorTracker.setEnabled(this.config.errorTracking)
      dbMonitor.setEnabled(this.config.databaseMonitoring)
    }
  }

  getConfig(): MonitoringConfig {
    return { ...this.config }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Array<{
      name: string
      status: 'pass' | 'fail' | 'warn'
      message: string
      duration?: number
    }>
  }> {
    const checks = []
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Check database performance
    try {
      const dbStats = dbMonitor.getStats()
      if (dbStats.errorQueries > 0) {
        checks.push({
          name: 'database_errors',
          status: 'fail' as const,
          message: `${dbStats.errorQueries} database errors detected`,
        })
        overallStatus = 'unhealthy'
      } else if (dbStats.slowQueries > 5) {
        checks.push({
          name: 'database_performance',
          status: 'warn' as const,
          message: `${dbStats.slowQueries} slow queries detected`,
        })
        if (overallStatus === 'healthy') overallStatus = 'degraded'
      } else {
        checks.push({
          name: 'database_performance',
          status: 'pass' as const,
          message: 'Database performance is good',
          duration: dbStats.avgDuration,
        })
      }
    } catch (error) {
      checks.push({
        name: 'database_check',
        status: 'fail' as const,
        message: 'Failed to check database status',
      })
      overallStatus = 'unhealthy'
    }

    // Check error rates
    try {
      const errorStats = errorTracker.getErrorStats()
      if (errorStats.recentErrors > 10) {
        checks.push({
          name: 'error_rate',
          status: 'fail' as const,
          message: `High error rate: ${errorStats.recentErrors} errors in the last hour`,
        })
        overallStatus = 'unhealthy'
      } else if (errorStats.recentErrors > 5) {
        checks.push({
          name: 'error_rate',
          status: 'warn' as const,
          message: `Elevated error rate: ${errorStats.recentErrors} errors in the last hour`,
        })
        if (overallStatus === 'healthy') overallStatus = 'degraded'
      } else {
        checks.push({
          name: 'error_rate',
          status: 'pass' as const,
          message: 'Error rate is normal',
        })
      }
    } catch (error) {
      checks.push({
        name: 'error_tracking',
        status: 'fail' as const,
        message: 'Failed to check error tracking status',
      })
      overallStatus = 'unhealthy'
    }

    // Check memory usage (if available)
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      
      if (usagePercentage > 90) {
        checks.push({
          name: 'memory_usage',
          status: 'fail' as const,
          message: `High memory usage: ${usagePercentage.toFixed(1)}%`,
        })
        overallStatus = 'unhealthy'
      } else if (usagePercentage > 75) {
        checks.push({
          name: 'memory_usage',
          status: 'warn' as const,
          message: `Elevated memory usage: ${usagePercentage.toFixed(1)}%`,
        })
        if (overallStatus === 'healthy') overallStatus = 'degraded'
      } else {
        checks.push({
          name: 'memory_usage',
          status: 'pass' as const,
          message: `Memory usage is normal: ${usagePercentage.toFixed(1)}%`,
        })
      }
    }

    return {
      status: overallStatus,
      checks,
    }
  }
}

// Initialize monitoring on import (client-side only)
if (typeof window !== 'undefined') {
  const monitoring = MonitoringManager.getInstance()
  monitoring.initialize().catch(console.error)
}

export const monitoring = MonitoringManager.getInstance()