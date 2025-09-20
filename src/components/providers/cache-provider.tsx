'use client'

import { useEffect } from 'react'

// Cache initialization component
export function CacheProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize cache system on client side if needed
    // Most cache operations happen on the server side
    console.log('Cache provider initialized')
  }, [])

  return <>{children}</>
}

// Server-side cache initialization
export async function initializeServerCache() {
  if (typeof window !== 'undefined') {
    // Skip on client side
    return
  }

  try {
    const { initializeCache } = await import('@/lib/cache/init')
    await initializeCache()
  } catch (error) {
    console.error('Failed to initialize server cache:', error)
  }
}