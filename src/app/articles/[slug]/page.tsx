import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { Clock, User, Calendar, Share2 } from 'lucide-react'
import { nextCachedQueries } from '@/lib/cache'
import { calculateReadingTime, getDefaultFeaturedImage } from '@/lib/utils/article'
import { ArticleContent } from '@/components/article/ArticleContent'
import { RelatedArticles } from '@/components/article/RelatedArticles'
import { Button } from '@/components/ui/button'

// Enable ISR for article pages
export const revalidate = 3600 // 1 hour
export const dynamicParams = true // Allow new articles to be generated on-demand

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await nextCachedQueries.getArticleBySlug(slug)

  if (!article || article.status !== 'published') {
    return {
      title: 'Article Not Found | New Andalus',
      description: 'The requested article could not be found.',
    }
  }

  const seoMeta = article.seoMeta as { title?: string; description?: string; keywords?: string[] } | null
  const featuredImage = (article.featuredImage as { url: string; alt: string; width: number; height: number } | null) || getDefaultFeaturedImage()

  return {
    title: seoMeta?.title || `${article.title} | New Andalus`,
    description: seoMeta?.description || article.excerpt || `Read "${article.title}" on New Andalus`,
    keywords: seoMeta?.keywords || [],
    openGraph: {
      title: article.title,
      description: article.excerpt || `Read "${article.title}" on New Andalus`,
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      images: [
        {
          url: featuredImage.url,
          width: featuredImage.width,
          height: featuredImage.height,
          alt: featuredImage.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt || `Read "${article.title}" on New Andalus`,
      images: [featuredImage.url],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await nextCachedQueries.getArticleBySlug(slug)

  // Return 404 if article doesn't exist or isn't published
  if (!article || article.status !== 'published') {
    notFound()
  }

  const featuredImage = (article.featuredImage as { url: string; alt: string; width: number; height: number } | null) || getDefaultFeaturedImage()
  const readingTime = calculateReadingTime(article.content)
  const publishedDate = article.publishedAt ? new Date(article.publishedAt) : new Date()

  return (
    <article className="min-h-screen bg-white">
      {/* Article Header */}
      <header className="relative">
        {/* Featured Image */}
        <div className="relative aspect-[21/9] w-full overflow-hidden">
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Article Meta Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              {article.title}
            </h1>
            
            {article.excerpt && (
              <p className="text-xl text-gray-200 mb-6 max-w-3xl">
                {article.excerpt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>By Editorial Team</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time dateTime={publishedDate.toISOString()}>
                  {publishedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{readingTime} min read</span>
              </div>

              <Button variant="outline" size="sm" className="ml-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <ArticleContent content={article.content} />
            
            {/* Article Footer */}
            <footer className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Published {formatDistanceToNow(publishedDate, { addSuffix: true })}
                  {article.updatedAt > article.createdAt && (
                    <span className="ml-2">
                      • Updated {formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Article
                </Button>
              </div>
            </footer>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8 space-y-8">
              {/* Table of Contents - Placeholder for now */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">In This Article</h3>
                <div className="text-sm text-gray-600">
                  Table of contents will be generated from article headings
                </div>
              </div>

              {/* Author Info - Placeholder */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">About the Author</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Editorial Team</div>
                    <div className="text-sm text-gray-600">New Andalus</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  The New Andalus editorial team brings you insightful analysis and commentary on current events and cultural topics.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Related Articles */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <RelatedArticles currentArticleId={article.id} />
        </div>
      </section>
    </article>
  )
}

// Generate static params for published articles (for static generation)
export async function generateStaticParams() {
  try {
    const { articles } = await nextCachedQueries.getPublishedArticles(1, 50) // Get first 50 articles
    
    return articles.map((article) => ({
      slug: article.slug,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}