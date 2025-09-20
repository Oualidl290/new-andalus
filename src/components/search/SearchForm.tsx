'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchFormProps {
  initialQuery?: string
  placeholder?: string
  autoFocus?: boolean
}

export function SearchForm({ 
  initialQuery = '', 
  placeholder = 'Search articles...',
  autoFocus = false 
}: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Update query when URL changes
  useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    if (urlQuery !== query) {
      setQuery(urlQuery)
    }
  }, [searchParams, query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      return
    }

    // Navigate to search results
    const params = new URLSearchParams()
    params.set('q', query.trim())
    router.push(`/search?${params.toString()}`)
  }

  const handleClear = () => {
    setQuery('')
    router.push('/search')
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
  )
}