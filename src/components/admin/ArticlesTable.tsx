'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ArticleStatusBadge } from '@/components/article/ArticleStatusBadge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Edit, Eye, Trash2, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ArticlesTableProps {
  page: number
  status: string
  author: string
  search: string
  initialData?: {
    articles: any[]
    pagination: any
  }
}

export function ArticlesTable({ page, status, author, search, initialData }: ArticlesTableProps) {
  const [articles, setArticles] = useState<any[]>(initialData?.articles || [])
  const [pagination, setPagination] = useState<any>(initialData?.pagination || { page: 1, limit: 20, total: 0, hasNext: false })
  const [loading, setLoading] = useState(!initialData)

  useEffect(() => {
    if (!initialData) {
      fetchArticles()
    }
  }, [page, status, author, search, initialData])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(status !== 'all' && { status }),
        ...(author !== 'all' && { author }),
        ...(search && { search }),
      })

      const response = await fetch(`/api/admin/articles?${params}`)
      if (response.ok) {
        const data = await response.json()
        setArticles(data.data.articles)
        setPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/articles/${articleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove the article from the local state
        setArticles(prev => prev.filter(article => article.id !== articleId))
        alert('Article deleted successfully')
      } else {
        const errorData = await response.json()
        alert(errorData.error?.message || 'Failed to delete article')
      }
    } catch (error) {
      console.error('Error deleting article:', error)
      alert('Failed to delete article')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div>Loading articles...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Published
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {articles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No articles found. Try adjusting your filters or create a new article.
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <Link 
                        href={`/admin/articles/${article.id}/edit`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate max-w-xs"
                      >
                        {article.title}
                      </Link>
                      {article.excerpt && (
                        <p className="text-xs text-gray-600 truncate max-w-xs mt-1">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ArticleStatusBadge status={article.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {(article as { author?: { name?: string } })?.author?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDistanceToNow(new Date(article.updatedAt))} ago
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {article.publishedAt 
                      ? formatDistanceToNow(new Date(article.publishedAt)) + ' ago'
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Link href={`/admin/articles/${article.id}/edit`} className="flex items-center w-full">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {article.status === 'published' && (
                            <DropdownMenuItem>
                              <Link href={`/articles/${article.slug}`} className="flex items-center w-full">
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {pagination.total > pagination.limit && (
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.ceil(pagination.total / pagination.limit)}
            hasNext={pagination.hasNext}
          />
        </div>
      )}
    </div>
  )
}