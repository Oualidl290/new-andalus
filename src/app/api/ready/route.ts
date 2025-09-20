import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ReadinessCheck {
  ready: boolean
  timestamp: string
  checks: {
    server: boolean
    dependencies: boolean
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Basic readiness checks
    const serverReady = true // Server is running if we reach this point
    const dependenciesReady = true // In a real app, check if all dependencies are loaded
    
    const readinessCheck: ReadinessCheck = {
      ready: serverReady && dependenciesReady,
      timestamp: new Date().toISOString(),
      checks: {
        server: serverReady,
        dependencies: dependenciesReady
      }
    }
    
    const statusCode = readinessCheck.ready ? 200 : 503
    
    return NextResponse.json(readinessCheck, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      { 
        ready: false, 
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed'
      }, 
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  }
}