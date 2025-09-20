import { Suspense } from 'react'
import Link from 'next/link'
import { Search, ArrowLeft, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchResults } from '@/components/search/SearchResults'
import { RealTimeSearchForm } from '@/components/search/RealTimeSearchForm'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: query, page: pageParam } = await searchParams
  const currentPage = Number(pageParam) || 1

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            New Andalus
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/articles" className="text-gray-600 hover:text-gray-900">
              Articles
            </Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
          </div>
        </div>
      </nav>

      {/* Search Header */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Search Articles</h1>
            </div>
            
            <RealTimeSearchForm initialQuery={query} showSuggestions={true} />
            
            {query && (
              <div className="mt-6">
                <p className="text-gray-600">
                  Search results for <span className="font-semibold">&quot;{query}&quot;</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Search Results */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {query ? (
              <Suspense fallback={<SearchResultsSkeleton />}>
                <SearchResults query={query} page={currentPage} />
              </Suspense>
            ) : (
              <EmptySearchState />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function EmptySearchState() {
  return (
    <div className="text-center py-16">
      <Search className="w-16 h-16 text-gray-400 mx-auto mb-6" />
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Search Our Articles
      </h2>
      <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
        Enter keywords, topics, or phrases to find relevant articles. 
        Our search covers article titles, content, and excerpts.
      </p>
      
      <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Search Tips:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use specific keywords for better results</li>
              <li>• Try different word combinations</li>
              <li>• Search for author names or topics</li>
              <li>• Use quotes for exact phrases</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function SearchResultsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
      
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-gray-200 pb-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      ))}
    </div>
  )
}