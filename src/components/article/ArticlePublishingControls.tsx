import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArticleStatusBadge } from './ArticleStatusBadge'
import { useArticlePublishing } from '@/hooks/useArticlePublishing'
import type { Article } from '@/lib/db'

interface ArticlePublishingControlsProps {
  article: Article
  onStatusChange?: (article: Article) => void
  className?: string
}

export function ArticlePublishingControls({ 
  article, 
  onStatusChange,
  className 
}: ArticlePublishingControlsProps) {
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  
  const {
    isPublishing,
    isUnpublishing,
    error,
    publishArticle,
    unpublishArticle,
    updateArticleStatus,
    canPublish,
    canUnpublish,
    canArchive,
    canRestore,
  } = useArticlePublishing({ article, onStatusChange })

  const handlePublish = async () => {
    try {
      await publishArticle()
      setShowConfirm(null)
    } catch (error) {
      console.error('Failed to publish:', error)
    }
  }

  const handleUnpublish = async () => {
    try {
      await unpublishArticle()
      setShowConfirm(null)
    } catch (error) {
      console.error('Failed to unpublish:', error)
    }
  }

  const handleArchive = async () => {
    try {
      await updateArticleStatus('archived')
      setShowConfirm(null)
    } catch (error) {
      console.error('Failed to archive:', error)
    }
  }

  const handleRestore = async () => {
    try {
      await updateArticleStatus('draft')
      setShowConfirm(null)
    } catch (error) {
      console.error('Failed to restore:', error)
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <ArticleStatusBadge status={article.status} />
        
        {article.publishedAt && (
          <span className="text-sm text-gray-500">
            Published {new Date(article.publishedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {canPublish && (
          <Button
            onClick={() => setShowConfirm('publish')}
            disabled={isPublishing}
            size="sm"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        )}

        {canUnpublish && (
          <Button
            onClick={() => setShowConfirm('unpublish')}
            disabled={isUnpublishing}
            variant="outline"
            size="sm"
          >
            {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
          </Button>
        )}

        {canArchive && (
          <Button
            onClick={() => setShowConfirm('archive')}
            variant="outline"
            size="sm"
          >
            Archive
          </Button>
        )}

        {canRestore && (
          <Button
            onClick={() => setShowConfirm('restore')}
            variant="outline"
            size="sm"
          >
            Restore to Draft
          </Button>
        )}
      </div>

      {/* Confirmation dialogs */}
      {showConfirm === 'publish' && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800 mb-2">
            Are you sure you want to publish this article? It will be visible to all readers.
          </p>
          <div className="flex gap-2">
            <Button onClick={handlePublish} size="sm">
              Confirm Publish
            </Button>
            <Button onClick={() => setShowConfirm(null)} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showConfirm === 'unpublish' && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            Are you sure you want to unpublish this article? It will no longer be visible to readers.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleUnpublish} size="sm">
              Confirm Unpublish
            </Button>
            <Button onClick={() => setShowConfirm(null)} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showConfirm === 'archive' && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
          <p className="text-sm text-gray-800 mb-2">
            Are you sure you want to archive this article? It will be moved to the archive.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleArchive} size="sm">
              Confirm Archive
            </Button>
            <Button onClick={() => setShowConfirm(null)} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showConfirm === 'restore' && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800 mb-2">
            Are you sure you want to restore this article to draft status?
          </p>
          <div className="flex gap-2">
            <Button onClick={handleRestore} size="sm">
              Confirm Restore
            </Button>
            <Button onClick={() => setShowConfirm(null)} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}