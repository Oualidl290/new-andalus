import { getRelatedArticles } from '@/lib/db'
import { ArticleCard } from './ArticleCard'

interface RelatedArticlesProps {
  currentArticleId: string
  limit?: number
}

export async function RelatedArticles({ currentArticleId, limit = 3 }: RelatedArticlesProps) {
  try {
    const relatedArticles = await getRelatedArticles(currentArticleId, limit)

    if (relatedArticles.length === 0) {
      return null
    }

    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="default"
            />
          ))}
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error fetching related articles:', error)
    return null
  }
}