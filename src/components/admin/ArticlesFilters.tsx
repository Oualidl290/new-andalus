'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SimpleSelect as Select } from '@/components/ui/select'
import { Search, Filter, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

// Author Select Component
function AuthorSelect({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  const [authors, setAuthors] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    // Fetch authors for the dropdown
    const fetchAuthors = async () => {
      try {
        const response = await fetch('/api/admin/users?role=all&limit=100')
        if (response.ok) {
          const data = await response.json()
          setAuthors(data.data.users.filter((user: any) => ['admin', 'editor'].includes(user.role)))
        }
      } catch (error) {
        console.error('Failed to fetch authors:', error)
      }
    }

    fetchAuthors()
  }, [])

  return (
    <Select value={value} onValueChange={onValueChange}>
      <option value="all">All Authors</option>
      {authors.map((author) => (
        <option key={author.id} value={author.id}>
          {author.name}
        </option>
      ))}
    </Select>
  )
}

interface ArticlesFiltersProps {
  currentStatus: string
  currentAuthor: string
  currentSearch: string
}

export function ArticlesFilters({ 
  currentStatus, 
  currentAuthor, 
  currentSearch 
}: ArticlesFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(currentSearch)
  const [status, setStatus] = useState(currentStatus)
  const [author, setAuthor] = useState(currentAuthor)
  
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (debouncedSearch) {
      params.set('search', debouncedSearch)
    } else {
      params.delete('search')
    }
    
    if (status !== 'all') {
      params.set('status', status)
    } else {
      params.delete('status')
    }
    
    if (author !== 'all') {
      params.set('author', author)
    } else {
      params.delete('author')
    }
    
    // Reset to page 1 when filters change
    params.delete('page')
    
    router.push(`/admin/articles?${params.toString()}`)
  }, [debouncedSearch, status, author, router, searchParams])

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setAuthor('all')
  }

  const hasActiveFilters = search || status !== 'all' || author !== 'all'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select
            value={status}
            onValueChange={setStatus}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
          
          <AuthorSelect
            value={author}
            onValueChange={setAuthor}
          />
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {hasActiveFilters && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <Filter className="w-4 h-4" />
          <span>Active filters:</span>
          {search && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Search: &quot;{search}&quot;
            </span>
          )}
          {status !== 'all' && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
              Status: {status}
            </span>
          )}
          {author !== 'all' && (
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Author: {author}
            </span>
          )}
        </div>
      )}
    </div>
  )
}