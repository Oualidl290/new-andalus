'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchSuggestion {
  type: 'recent' | 'trending' | 'suggestion'
  text: string
  count?: number
}

interface RealTimeSearchFormProps {
  initialQuery?: string
  placeholder?: string
  autoFocus?: boolean
  showSuggestions?: boolean
}

export function RealTimeSearchForm({ 
  initialQuery = '', 
  placeholder = 'Search articles...',
  autoFocus = false,
  showSuggestions = true
}: RealTimeSearchFormProps) {
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Debounce the search query to avoid too many API calls
  const debouncedQuery = useDebounce(query, 300)

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    setIsLoading(true)
    try {
      // In a real implementation, this would call a suggestions API
      // For now, we'll generate suggestions client-side
      const mockSuggestions = generateMockSuggestions(searchQuery)
      setSuggestions(mockSuggestions)
      setShowDropdown(mockSuggestions.length > 0)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim() && showSuggestions) {
      fetchSuggestions(debouncedQuery)
    } else {
      setSuggestions([])
      setShowDropdown(false)
    }
  }, [debouncedQuery, showSuggestions, fetchSuggestions])

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const generateMockSuggestions = (searchQuery: string): SearchSuggestion[] => {
    const query = searchQuery.toLowerCase()
    const suggestions: SearchSuggestion[] = []

    // Mock trending searches
    const trending = [
      'artificial intelligence',
      'climate change',
      'political analysis',
      'technology trends',
      'cultural commentary'
    ].filter(item => item.toLowerCase().includes(query))

    trending.forEach(item => {
      suggestions.push({
        type: 'trending',
        text: item,
        count: Math.floor(Math.random() * 100) + 10
      })
    })

    // Mock recent searches (would come from localStorage or user history)
    const recent = [
      'social media impact',
      'economic policy',
      'environmental issues'
    ].filter(item => item.toLowerCase().includes(query))

    recent.forEach(item => {
      suggestions.push({
        type: 'recent',
        text: item
      })
    })

    // Generate query suggestions
    const querySuggestions = [
      `${query} analysis`,
      `${query} opinion`,
      `${query} news`,
      `${query} review`
    ].filter(item => item !== query)

    querySuggestions.forEach(item => {
      suggestions.push({
        type: 'suggestion',
        text: item
      })
    })

    return suggestions.slice(0, 6) // Limit to 6 suggestions
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      performSearch(query.trim())
    }
  }

  const performSearch = (searchQuery: string) => {
    setShowDropdown(false)
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    performSearch(suggestion.text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else {
          handleSubmit(e)
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    setShowDropdown(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'recent':
        return <Clock className="w-4 h-4 text-gray-400" />
      default:
        return <Search className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowDropdown(true)
              }
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full pl-12 pr-20 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <Button
            type="submit"
            disabled={!query.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.text}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              {getSuggestionIcon(suggestion.type)}
              <span className="flex-1">{suggestion.text}</span>
              {suggestion.count && (
                <span className="text-sm text-gray-500">
                  {suggestion.count} results
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span>Loading suggestions...</span>
          </div>
        </div>
      )}
    </div>
  )
}