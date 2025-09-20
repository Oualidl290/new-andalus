import { performance } from 'perf_hooks'

export interface QueryMetrics {
  query: string
  duration: number
  timestamp: number
  params?: any[]
  error?: string
  rowCount?: number
}

// In-memory storage for query metrics
const queryMetrics: QueryMetrics[] = []

export class DatabaseMonitor {
  private static instance: DatabaseMonitor
  private slowQueryThreshold: number = 100 // ms
  private enabled: boolean = true

  private constructor() {}

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor()
    }
    return DatabaseMonitor.instance
  }

  setSlowQueryThreshold(threshold: number) {
    this.slowQueryThreshold = threshold
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  async measureQuery<T>(
    queryFn: () => Promise<T>,
    queryInfo: { query: string; params?: any[] }
  ): Promise<T> {
    if (!this.enabled) {
      return queryFn()
    }

    const startTime = performance.now()
    let result: T
    let error: string | undefined
    let rowCount: number | undefined

    try {
      result = await queryFn()
      
      // Try to get row count if result is an array
      if (Array.isArray(result)) {
        rowCount = result.length
      }
      
      return result
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      const duration = performance.now() - startTime
      
      const metrics: QueryMetrics = {
        query: queryInfo.query,
        duration,
        timestamp: Date.now(),
        params: queryInfo.params,
        error,
        rowCount,
      }

      queryMetrics.push(metrics)

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected (${duration.toFixed(2)}ms):`, {
          query: queryInfo.query,
          params: queryInfo.params,
          duration,
          error,
        })
      }

      // Keep only recent metrics (last 1000 queries)
      if (queryMetrics.length > 1000) {
        queryMetrics.splice(0, queryMetrics.length - 1000)
      }
    }
  }

  getMetrics(options?: {
    limit?: number
    slowOnly?: boolean
    errorOnly?: boolean
  }): QueryMetrics[] {
    let filtered = [...queryMetrics]

    if (options?.slowOnly) {
      filtered = filtered.filter(m => m.duration > this.slowQueryThreshold)
    }

    if (options?.errorOnly) {
      filtered = filtered.filter(m => m.error)
    }

    // Sort by timestamp (most recent first)
    filtered.sort((a, b) => b.timestamp - a.timestamp)

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  getStats(): {
    totalQueries: number
    slowQueries: number
    errorQueries: number
    avgDuration: number
    maxDuration: number
    minDuration: number
  } {
    if (queryMetrics.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        errorQueries: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      }
    }

    const durations = queryMetrics.map(m => m.duration)
    const slowQueries = queryMetrics.filter(m => m.duration > this.slowQueryThreshold)
    const errorQueries = queryMetrics.filter(m => m.error)

    return {
      totalQueries: queryMetrics.length,
      slowQueries: slowQueries.length,
      errorQueries: errorQueries.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
    }
  }

  clearMetrics() {
    queryMetrics.length = 0
  }
}

// Singleton instance
export const dbMonitor = DatabaseMonitor.getInstance()

// Decorator for monitoring database queries
export function monitorQuery(queryName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return dbMonitor.measureQuery(
        () => originalMethod.apply(this, args),
        {
          query: queryName,
          params: args,
        }
      )
    }

    return descriptor
  }
}

// Helper function to create database indexes
export const suggestedIndexes = {
  articles: [
    'CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)',
    'CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id)',
    'CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)',
    'CREATE INDEX IF NOT EXISTS idx_articles_status_published_at ON articles(status, published_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING gin(to_tsvector(\'english\', title || \' \' || excerpt))',
  ],
  users: [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
  ],
}

// Function to apply suggested indexes
export async function applySuggestedIndexes(db: any) {
  console.log('Applying suggested database indexes...')
  
  try {
    for (const [table, indexes] of Object.entries(suggestedIndexes)) {
      console.log(`Creating indexes for ${table} table...`)
      
      for (const indexQuery of indexes) {
        try {
          await db.execute(indexQuery)
          console.log(`✓ Applied index: ${indexQuery}`)
        } catch (error) {
          console.warn(`⚠ Failed to apply index: ${indexQuery}`, error)
        }
      }
    }
    
    console.log('✓ Database indexes applied successfully')
  } catch (error) {
    console.error('Error applying database indexes:', error)
  }
}