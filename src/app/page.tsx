import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { nextCachedQueries } from '@/lib/cache'
import { ArticleCard } from '@/components/article/ArticleCard'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/auth/user-menu'
import { RealTimeSearchForm } from '@/components/search/RealTimeSearchForm'

// Enable ISR for the homepage
export const revalidate = 300 // 5 minutes

export default async function HomePage() {
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
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              New Andalus
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Modern editorial platform delivering insightful analysis, cultural commentary, 
              and thought-provoking journalism for the digital age.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/articles">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Explore Articles
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="outline" size="lg" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                  <Search className="mr-2 w-4 h-4" />
                  Search Content
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Find What You&apos;re Looking For
            </h2>
            <p className="text-gray-600 mb-6">
              Search through our collection of articles, analysis, and commentary
            </p>
            <RealTimeSearchForm 
              placeholder="Search articles, topics, or authors..."
              showSuggestions={true}
            />
          </div>
        </div>
      </section>

      {/* Featured Articles Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Suspense fallback={<ArticlesSkeleton />}>
            <FeaturedArticles />
          </Suspense>
        </div>
      </section>

      {/* Latest Articles Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Latest Articles</h2>
            <Link href="/articles">
              <Button variant="outline">
                View All Articles
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <Suspense fallback={<ArticlesSkeleton />}>
            <LatestArticles />
          </Suspense>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Informed</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Get the latest articles and insights delivered directly to your inbox.
          </p>
          <div className="max-w-md mx-auto flex gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500"
            />
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">New Andalus</h3>
              <p className="text-gray-400 mb-4">
                A modern editorial platform delivering insightful analysis and cultural commentary.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Navigation</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/articles" className="hover:text-white">Articles</Link></li>
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 New Andalus. Built with ❤️ using modern web technologies.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

async function FeaturedArticles() {
  try {
    const { articles } = await nextCachedQueries.getPublishedArticles(1, 1) // Get the latest article as featured
    
    if (articles.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No articles published yet.</p>
          <Link href="/admin">
            <Button className="mt-4">Create Your First Article</Button>
          </Link>
        </div>
      )
    }

    const featuredArticle = articles[0]

    return (
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Story</h2>
        <ArticleCard
          article={featuredArticle}
          variant="featured"
          className="max-w-4xl mx-auto"
        />
      </div>
    )
  } catch (error) {
    console.error('Error fetching featured articles:', error)
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading featured articles.</p>
      </div>
    )
  }
}

async function LatestArticles() {
  try {
    const { articles } = await nextCachedQueries.getPublishedArticles(1, 6) // Get 6 latest articles
    
    if (articles.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No articles available.</p>
        </div>
      )
    }

    // Skip the first article if it was used as featured
    const latestArticles = articles.slice(1)

    if (latestArticles.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">More articles coming soon!</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {latestArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            variant="default"
          />
        ))}
      </div>
    )
  } catch (error) {
    console.error('Error fetching latest articles:', error)
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading articles.</p>
      </div>
    )
  }
}

function ArticlesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 aspect-[16/9] rounded-lg mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  )
}