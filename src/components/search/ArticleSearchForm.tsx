'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ArticleSearchFormProps {
  initialQuery?: string
}

export function ArticleSearchForm({ initialQuery = '' }: ArticleSearchFormProps) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    } else {
      router.push('/articles')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <Button type="submit" className="flex items-center gap-2">
        <Search className="w-4 h-4" />
        Search
      </Button>
      <Button variant="outline" className="flex items-center gap-2">
        <Filter className="w-4 h-4" />
        Filter
      </Button>
    </form>
  )
}