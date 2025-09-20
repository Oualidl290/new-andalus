'use client'

import { useState, useEffect, useCallback } from 'react'

interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt: string | null
  publishedAt: Date | null
  searchHighlight: string
}

interface SearchResponse {
  success: boolean
  articles: SearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
  }
  query: string
  suggestions: string[]
}

interface UseSearchOptions {
  query: string
  page?: number
  limit?: number
  enabled?: boolean
}

interface UseSearchReturn {
  data: SearchResponse | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useSearch({ 
  query, 
  page = 1, 
  limit = 10, 
  enabled = true 
}: UseSearchOptions): UseSearchReturn {
  const [data, setData] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSearch = useCallback(async () => {
    if (!enabled || !query.trim()) {
      setData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const searchParams = new URLSearchParams({
        q: query.trim(),
        page: page.toString(),
        limit: limit.toString(),
      })

      const response = await fetch(`/api/search?${searchParams}`)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }

      const result: SearchResponse = await response.json()
      
      if (!result.success) {
        throw new Error('Search API returned error')
      }

      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [query, page, limit, enabled])

  useEffect(() => {
    fetchSearch()
  }, [fetchSearch])

  return {
    data,
    isLoading,
    error,
    refetch: fetchSearch,
  }
}