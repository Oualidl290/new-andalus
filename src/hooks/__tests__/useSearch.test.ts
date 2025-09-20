import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSearch } from '../useSearch'

// Mock fetch
global.fetch = vi.fn()

const mockSearchResponse = {
  success: true,
  articles: [
    {
      id: '1',
      title: 'Test Article',
      slug: 'test-article',
      excerpt: 'This is a test article',
      publishedAt: new Date('2024-01-15'),
      searchHighlight: 'This is a <mark>test</mark> article'
    }
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    hasNext: false
  },
  query: 'test',
  suggestions: []
}

describe('useSearch Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return initial state', () => {
    const { result } = renderHook(() => 
      useSearch({ query: '', enabled: false })
    )

    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.refetch).toBe('function')
  })

  it('should fetch search results when query is provided', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    } as Response)

    const { result } = renderHook(() => 
      useSearch({ query: 'test', enabled: true })
    )

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for the fetch to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockSearchResponse)
    expect(result.current.error).toBeNull()
    expect(mockFetch).toHaveBeenCalledWith('/api/search?q=test&page=1&limit=10')
  })

  it('should handle search errors', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { result } = renderHook(() => 
      useSearch({ query: 'test', enabled: true })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Search failed: 500')
  })

  it('should not fetch when query is empty', () => {
    const mockFetch = vi.mocked(fetch)
    
    const { result } = renderHook(() => 
      useSearch({ query: '', enabled: true })
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should not fetch when disabled', () => {
    const mockFetch = vi.mocked(fetch)
    
    const { result } = renderHook(() => 
      useSearch({ query: 'test', enabled: false })
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should handle pagination parameters', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    } as Response)

    const { result } = renderHook(() => 
      useSearch({ 
        query: 'test', 
        page: 2, 
        limit: 5, 
        enabled: true 
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/search?q=test&page=2&limit=5')
  })

  it('should refetch when refetch is called', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSearchResponse,
    } as Response)

    const { result } = renderHook(() => 
      useSearch({ query: 'test', enabled: true })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Clear the mock to track new calls
    mockFetch.mockClear()

    // Call refetch
    result.current.refetch()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle API response with no success flag', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    } as Response)

    const { result } = renderHook(() => 
      useSearch({ query: 'test', enabled: true })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('Search API returned error')
  })
})