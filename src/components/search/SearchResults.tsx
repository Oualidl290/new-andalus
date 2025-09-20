import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Clock, FileText, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'

interface SearchResultsProps {
  query: string
  page: number
}

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

export async function SearchResults({ query, page }: SearchResultsProps) {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: '10',
    })

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/search?${searchParams}`, {
      cache: 'no-store', // Don't cache search results
    })

    if (!response.ok) {
      throw new Error('Search failed')
    }

    const data: SearchResponse = await response.json()

    if (!data.success) {
      throw new Error('Search API returned error')
    }

    return (
      <div className="space-y-8">
        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            {data.pagination.total > 0 ? (
              <>
                Found {data.pagination.total} result{data.pagination.total !== 1 ? 's' : ''} 
                {data.pagination.total > data.pagination.limit && (
                  <span className="ml-1">
                    (showing {((page - 1) * data.pagination.limit) + 1}-{Math.min(page * data.pagination.limit, data.pagination.total)})
                  </span>
                )}
              </>
            ) : (
              'No results found'
            )}
          </p>
        </div>

        {/* Search Results */}
        {data.articles.length > 0 ? (
          <div className="space-y-6">
            {data.articles.map((article) => (
              <SearchResultItem key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <NoResultsState query={query} suggestions={data.suggestions} />
        )}

        {/* Pagination */}
        {data.pagination.total > data.pagination.limit && (
          <div className="flex justify-center pt-8">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(data.pagination.total / data.pagination.limit)}
              hasNext={data.pagination.hasNext}
              basePath={`/search?q=${encodeURIComponent(query)}`}
            />
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Search error:', error)
    return <SearchErrorState query={query} />
  }
}

function SearchResultItem({ article }: { article: SearchResult }) {
  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : new Date()

  return (
    <article className="border-b border-gray-200 pb-6 last:border-b-0">
      <Link href={`/articles/${article.slug}`} className="group block">
        <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
          {article.title}
        </h2>
        
        <div 
          className="text-gray-600 mb-3 leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: article.searchHighlight || article.excerpt || 'No preview available' 
          }}
        />
        
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDistanceToNow(publishedDate, { addSuffix: true })}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>Article</span>
          </div>
        </div>
      </Link>
    </article>
  )
}

function NoResultsState({ query, suggestions }: { query: string; suggestions: string[] }) {
  return (
    <div className="text-center py-12">
      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-6" />
      
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        No Results Found
      </h2>
      
      <p className="text-gray-600 mb-8">
        We couldn&apos;t find any articles matching &quot;{query}&quot;. 
        Try adjusting your search terms or browse our latest articles.
      </p>

      {suggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-blue-900 mb-3">Try searching for:</h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Link key={suggestion} href={`/search?q=${encodeURIComponent(suggestion)}`}>
                    <Button variant="outline" size="sm" className="text-blue-700 border-blue-200 hover:bg-blue-100">
                      {suggestion}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/articles">
          <Button>Browse All Articles</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Back to Homepage</Button>
        </Link>
      </div>
    </div>
  )
}

function SearchErrorState({ query }: { query: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-red-500 mb-6">
        <FileText className="w-16 h-16 mx-auto" />
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Search Error
      </h2>
      
      <p className="text-gray-600 mb-8">
        There was an error performing your search for &quot;{query}&quot;. 
        Please try again or browse our articles.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
        <Link href="/articles">
          <Button variant="outline">Browse Articles</Button>
        </Link>
      </div>
    </div>
  )
}