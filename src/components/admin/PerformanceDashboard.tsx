'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Database, 
  Image as ImageIcon, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw
} from 'lucide-react'

interface PerformanceMetrics {
  webVitals: {
    recent: any[]
    aggregated: any
    total: number
  }
  database: {
    metrics: any[]
    stats: any
  }
  images: {
    metrics: any[]
    stats: any
  }
  errors: {
    errors: any[]
    performance: any[]
    stats: any
  }
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const [webVitalsRes, databaseRes, imagesRes, errorsRes] = await Promise.all([
        fetch('/api/monitoring/web-vitals'),
        fetch('/api/monitoring/database'),
        fetch('/api/monitoring/images'),
        fetch('/api/monitoring/errors'),
      ])

      const [webVitals, database, images, errors] = await Promise.all([
        webVitalsRes.ok ? webVitalsRes.json() : { data: { recent: [], aggregated: {}, total: 0 } },
        databaseRes.ok ? databaseRes.json() : { data: { metrics: [], stats: {} } },
        imagesRes.ok ? imagesRes.json() : { data: { metrics: [], stats: {} } },
        errorsRes.ok ? errorsRes.json() : { data: { errors: [], performance: [], stats: {} } },
      ])

      setMetrics({
        webVitals: webVitals.data,
        database: database.data,
        images: images.data,
        errors: errors.data,
      })
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const runOptimization = async (type: 'database' | 'cache' | 'images' | 'all') => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize', type }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Optimization completed:', result)
        // Refresh metrics after optimization
        await fetchMetrics()
      }
    } catch (error) {
      console.error('Optimization failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const getHealthStatus = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.poor) return 'needs-improvement'
    return 'poor'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'needs-improvement':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'poor':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading && !metrics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          {lastUpdated && (
            <p className="text-sm text-gray-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => runOptimization('all')} disabled={loading} variant="default">
            Optimize All
          </Button>
          <Button onClick={fetchMetrics} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Activity className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Core Web Vitals</h3>
        </div>
        
        {metrics?.webVitals.aggregated && Object.keys(metrics.webVitals.aggregated).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(metrics.webVitals.aggregated).map(([metric, data]: [string, any]) => {
              const thresholds = {
                LCP: { good: 2500, poor: 4000 },
                FID: { good: 100, poor: 300 },
                CLS: { good: 0.1, poor: 0.25 },
                FCP: { good: 1800, poor: 3000 },
                TTFB: { good: 800, poor: 1800 },
              }[metric] || { good: 1000, poor: 2000 }

              const status = getHealthStatus(data.p75, thresholds)

              return (
                <div key={metric} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{metric}</span>
                    {getStatusIcon(status)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(data.p75)}{metric === 'CLS' ? '' : 'ms'}
                  </div>
                  <div className="text-xs text-gray-500">
                    P75: {Math.round(data.p75)} | P95: {Math.round(data.p95)}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No Web Vitals data available yet. Visit some pages to collect metrics.
          </div>
        )}
      </div>

      {/* Database Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Database className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Database Performance</h3>
          </div>
          <Button 
            onClick={() => runOptimization('database')} 
            disabled={loading} 
            variant="outline"
            size="sm"
          >
            Optimize DB
          </Button>
        </div>
        
        {metrics?.database.stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Total Queries</div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.database.stats.totalQueries || 0}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Avg Duration</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(metrics.database.stats.avgDuration || 0)}ms
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Slow Queries</span>
                {metrics.database.stats.slowQueries > 0 && (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.database.stats.slowQueries || 0}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Errors</span>
                {metrics.database.stats.errorQueries > 0 && (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.database.stats.errorQueries || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <ImageIcon className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Image Performance</h3>
          </div>
          <Button 
            onClick={() => runOptimization('images')} 
            disabled={loading} 
            variant="outline"
            size="sm"
          >
            Optimize Images
          </Button>
        </div>
        
        {metrics?.images.stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Total Images</div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.images.stats.totalImages || 0}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Avg Load Time</div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(metrics.images.stats.avgLoadTime || 0)}ms
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Slow Images</span>
                {metrics.images.stats.slowImages > 0 && (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.images.stats.slowImages || 0}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Large Images</span>
                {metrics.images.stats.largeImages > 0 && (
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.images.stats.largeImages || 0}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Tracking */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Error Tracking</h3>
        </div>
        
        {metrics?.errors.stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Total Errors</div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.errors.stats.errors?.total || 0}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Recent Errors</div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.errors.stats.errors?.recent || 0}
              </div>
              <div className="text-xs text-gray-500">Last hour</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Performance Issues</div>
              <div className="text-2xl font-bold text-gray-900">
                {metrics.errors.stats.performance?.total || 0}
              </div>
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {metrics?.errors.errors && metrics.errors.errors.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Errors</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {metrics.errors.errors.slice(0, 5).map((error: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded p-3 text-sm">
                  <div className="font-medium text-gray-900 truncate">{error.message}</div>
                  <div className="text-gray-600 text-xs mt-1">
                    {new Date(error.timestamp).toLocaleString()} • {error.url}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}