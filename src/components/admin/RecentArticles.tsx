import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { getRecentArticles } from '@/lib/db/queries'
import { ArticleStatusBadge } from '@/components/article/ArticleStatusBadge'
import { Button } from '@/components/ui/button'
import { Edit, Eye } from 'lucide-react'

export async function RecentArticles() {
  const articles = await getRecentArticles(5)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Articles</h3>
          <Link href="/admin/articles">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {articles.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No articles yet. Create your first article to get started.
          </div>
        ) : (
          articles.map((article) => (
            <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {article.title}
                    </h4>
                    <ArticleStatusBadge status={article.status} />
                  </div>
                  
                  {article.excerpt && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {article.excerpt}
                    </p>
                  )}
                  
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span>
                      Updated {formatDistanceToNow(new Date(article.updatedAt))} ago
                    </span>
                    {article.publishedAt && (
                      <span>
                        Published {formatDistanceToNow(new Date(article.publishedAt))} ago
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {article.status === 'published' && (
                    <Link href={`/articles/${article.slug}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                  <Link href={`/admin/articles/${article.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}