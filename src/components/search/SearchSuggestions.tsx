import Link from 'next/link'
import { TrendingUp, Hash, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SearchSuggestionsProps {
  className?: string
}

export function SearchSuggestions({ className }: SearchSuggestionsProps) {
  // In a real implementation, these would come from analytics or be dynamically generated
  const trendingTopics = [
    'politics',
    'technology',
    'culture',
    'analysis',
    'opinion',
  ]

  const popularSearches = [
    'editorial analysis',
    'current events',
    'cultural commentary',
    'political review',
    'tech innovation',
  ]

  const recentSearches = [
    'artificial intelligence',
    'climate change',
    'social media',
  ]

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Trending Topics */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Trending Topics</h3>
          </div>
          <div className="space-y-2">
            {trendingTopics.map((topic) => (
              <Link key={topic} href={`/search?q=${encodeURIComponent(topic)}`}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-left">
                  <Hash className="w-4 h-4 mr-2" />
                  {topic}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Searches */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Popular Searches</h3>
          </div>
          <div className="space-y-2">
            {popularSearches.map((search) => (
              <Link key={search} href={`/search?q=${encodeURIComponent(search)}`}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-left">
                  {search}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Recent Searches</h3>
          </div>
          <div className="space-y-2">
            {recentSearches.map((search) => (
              <Link key={search} href={`/search?q=${encodeURIComponent(search)}`}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-left">
                  <Clock className="w-4 h-4 mr-2" />
                  {search}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}