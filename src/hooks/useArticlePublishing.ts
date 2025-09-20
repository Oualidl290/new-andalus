import { useState } from 'react'
import type { Article } from '@/lib/db'

interface UseArticlePublishingProps {
  article: Article
  onStatusChange?: (article: Article) => void
}

interface PublishingState {
  isPublishing: boolean
  isUnpublishing: boolean
  error: string | null
}

export function useArticlePublishing({ article, onStatusChange }: UseArticlePublishingProps) {
  const [state, setState] = useState<PublishingState>({
    isPublishing: false,
    isUnpublishing: false,
    error: null,
  })

  const publishArticle = async () => {
    if (state.isPublishing) return

    setState(prev => ({ ...prev, isPublishing: true, error: null }))

    try {
      const response = await fetch(`/api/articles/${article.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to publish article')
      }

      onStatusChange?.(data.article)
      setState(prev => ({ ...prev, isPublishing: false }))
      
      return data.article
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish article'
      setState(prev => ({ ...prev, isPublishing: false, error: errorMessage }))
      throw error
    }
  }

  const unpublishArticle = async () => {
    if (state.isUnpublishing) return

    setState(prev => ({ ...prev, isUnpublishing: true, error: null }))

    try {
      const response = await fetch(`/api/articles/${article.id}/publish`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to unpublish article')
      }

      onStatusChange?.(data.article)
      setState(prev => ({ ...prev, isUnpublishing: false }))
      
      return data.article
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unpublish article'
      setState(prev => ({ ...prev, isUnpublishing: false, error: errorMessage }))
      throw error
    }
  }

  const updateArticleStatus = async (status: 'draft' | 'published' | 'archived') => {
    setState(prev => ({ ...prev, error: null }))

    try {
      const response = await fetch(`/api/articles/${article.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update article status')
      }

      onStatusChange?.(data.article)
      return data.article
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update article status'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }

  const canPublish = (): boolean => {
    return article.status === 'draft' && !!article.title && !!article.content
  }

  const canUnpublish = (): boolean => {
    return article.status === 'published'
  }

  const canArchive = (): boolean => {
    return article.status === 'draft' || article.status === 'published'
  }

  const canRestore = (): boolean => {
    return article.status === 'archived'
  }

  return {
    ...state,
    publishArticle,
    unpublishArticle,
    updateArticleStatus,
    canPublish: canPublish(),
    canUnpublish: canUnpublish(),
    canArchive: canArchive(),
    canRestore: canRestore(),
  }
}