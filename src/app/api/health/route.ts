import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { redis } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  environment: string
  checks: {
    database: {
      status: 'healthy' | 'unhealthy'
      responseTime: number
      error?: string
    }
    redis: {
      status: 'healthy' | 'unhealthy'
      responseTime: number
      error?: string
    }
    memory: {
      status: 'healthy' | 'unhealthy'
      usage: number
      limit: number
    }
    disk: {
      status: 'healthy' | 'unhealthy'
      usage: number
    }
  }
  uptime: number
}

async function checkDatabase(): Promise<HealthCheck['checks']['database']> {
  const start = Date.now()
  
  try {
    // Simple query to check database connectivity
    await db.execute('SELECT 1')
    const responseTime = Date.now() - start
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'unhealthy',
      responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}

async function checkRedis(): Promise<HealthCheck['checks']['redis']> {
  const start = Date.now()
  
  try {
    await redis.ping()
    const responseTime = Date.now() - start
    
    return {
      status: responseTime < 500 ? 'healthy' : 'unhealthy',
      responseTime
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown Redis error'
    }
  }
}

function checkMemory(): HealthCheck['checks']['memory'] {
  const usage = process.memoryUsage()
  const totalMemory = usage.heapUsed + usage.external
  const memoryLimit = 1024 * 1024 * 1024 // 1GB default limit
  
  return {
    status: totalMemory < memoryLimit * 0.9 ? 'healthy' : 'unhealthy',
    usage: totalMemory,
    limit: memoryLimit
  }
}

function checkDisk(): HealthCheck['checks']['disk'] {
  // In a real implementation, you'd check actual disk usage
  // This is a simplified version
  return {
    status: 'healthy',
    usage: 0.5 // 50% usage example
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    // Run all health checks in parallel
    const [databaseCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis()
    ])
    
    const memoryCheck = checkMemory()
    const diskCheck = checkDisk()
    
    // Determine overall status
    const allChecks = [databaseCheck, redisCheck, memoryCheck, diskCheck]
    const hasUnhealthy = allChecks.some(check => check.status === 'unhealthy')
    const hasDegraded = allChecks.some(check => check.status === 'degraded')
    
    let overallStatus: HealthCheck['status'] = 'healthy'
    if (hasUnhealthy) {
      overallStatus = 'unhealthy'
    } else if (hasDegraded) {
      overallStatus = 'degraded'
    }
    
    const healthCheck: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: databaseCheck,
        redis: redisCheck,
        memory: memoryCheck,
        disk: diskCheck
      },
      uptime: process.uptime()
    }
    
    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthCheck, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    const errorResponse: HealthCheck = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: { status: 'unhealthy', responseTime: 0, error: 'Health check failed' },
        redis: { status: 'unhealthy', responseTime: 0, error: 'Health check failed' },
        memory: { status: 'unhealthy', usage: 0, limit: 0 },
        disk: { status: 'unhealthy', usage: 0 }
      },
      uptime: process.uptime()
    }
    
    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}