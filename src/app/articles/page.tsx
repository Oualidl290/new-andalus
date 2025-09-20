import { Suspense } from 'react'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'
import { getPublishedArticles } from '@/lib/db'
import { ArticleCard } from '@/components/article/ArticleCard'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'

interface ArticlesPageProps {
    searchParams: Promise<{
        page?: string
        search?: string
    }>
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
    const { page: pageParam, search } = await searchParams
    const currentPage = Number(pageParam) || 1
    const limit = 12

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link href="/" className="text-2xl font-bold text-gray-900">
                        New Andalus
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/articles" className="text-blue-600 font-medium">
                            Articles
                        </Link>
                        <Link href="/about" className="text-gray-600 hover:text-gray-900">
                            About
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <section className="bg-gray-50 py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            All Articles
                        </h1>
                        <p className="text-xl text-gray-600 mb-8">
                            Explore our collection of insightful articles, analysis, and commentary.
                        </p>

                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search articles..."
                                    defaultValue={search}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <Button variant="outline" className="flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                Filter
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Articles Grid */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <Suspense fallback={<ArticlesGridSkeleton />}>
                        <ArticlesGrid page={currentPage} limit={limit} search={search} />
                    </Suspense>
                </div>
            </section>
        </div>
    )
}

interface ArticlesGridProps {
    page: number
    limit: number
    search?: string
}

async function ArticlesGrid({ page, limit, search }: ArticlesGridProps) {
    try {
        // For now, we'll use the basic getPublishedArticles
        // In the future, this could be enhanced with search functionality
        const result = await getPublishedArticles(page, limit)

        if (result.articles.length === 0) {
            return (
                <div className="text-center py-16">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Articles Found</h3>
                    <p className="text-gray-600 mb-8">
                        {search
                            ? `No articles found matching &quot;${search}&quot;. Try a different search term.`
                            : "No articles have been published yet."
                        }
                    </p>
                    <Link href="/">
                        <Button>Back to Homepage</Button>
                    </Link>
                </div>
            )
        }

        return (
            <div className="space-y-12">
                {/* Results Info */}
                <div className="flex items-center justify-between">
                    <p className="text-gray-600">
                        Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, result.total)} of {result.total} articles
                    </p>
                    {search && (
                        <p className="text-sm text-gray-500">
                            Search results for &quot;{search}&quot;
                        </p>
                    )}
                </div>

                {/* Articles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {result.articles.map((article) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            variant="default"
                        />
                    ))}
                </div>

                {/* Pagination */}
                {result.total > limit && (
                    <div className="flex justify-center">
                        <Pagination
                            currentPage={page}
                            totalPages={Math.ceil(result.total / limit)}
                            hasNext={result.hasNext}
                        />
                    </div>
                )}
            </div>
        )
    } catch (error) {
        console.error('Error fetching articles:', error)
        return (
            <div className="text-center py-16">
                <h3 className="text-2xl font-semibold text-red-600 mb-4">Error Loading Articles</h3>
                <p className="text-gray-600 mb-8">
                    There was an error loading the articles. Please try again later.
                </p>
                <Link href="/">
                    <Button>Back to Homepage</Button>
                </Link>
            </div>
        )
    }
}

function ArticlesGridSkeleton() {
    return (
        <div className="space-y-12">
            <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 12 }).map((_, i) => (
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
        </div>
    )
}