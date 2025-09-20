'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, ExternalLink } from 'lucide-react'
import { ArticleContent } from '@/components/article/ArticleContent'
import { JSONContent } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface ArticlePreviewProps {
  title: string
  content: JSONContent
  excerpt: string
  featuredImage?: {
    url: string
    alt: string
    width: number
    height: number
  } | null
  status: 'draft' | 'published' | 'archived'
  publishedAt?: Date | null
  authorName?: string
}

export function ArticlePreview({
  title,
  content,
  excerpt,
  featuredImage,
  status,
  publishedAt,
  authorName = 'Author'
}: ArticlePreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  if (!isPreviewOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsPreviewOpen(true)}
        className="w-full"
      >
        <Eye className="w-4 h-4 mr-2" />
        Show Preview
      </Button>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Live Preview</span>
          {status === 'published' && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              Published
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/articles/preview', '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreviewOpen(false)}
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-6 max-h-96 overflow-y-auto">
        {/* Article Header */}
        <div className="mb-6">
          {featuredImage && (
            <div className="mb-6">
              <img
                src={featuredImage.url}
                alt={featuredImage.alt}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {title || 'Untitled Article'}
          </h1>
          
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <span>By {authorName}</span>
            {publishedAt && (
              <>
                <span className="mx-2">•</span>
                <span>{formatDistanceToNow(publishedAt)} ago</span>
              </>
            )}
          </div>
          
          {excerpt && (
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              {excerpt}
            </p>
          )}
        </div>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none">
          <ArticleContent content={content} />
        </div>
      </div>
    </div>
  )
}