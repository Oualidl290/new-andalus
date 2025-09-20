'use client'

import { useState, useCallback, useEffect } from 'react'
import { RichTextEditor } from './rich-text-editor'
import { useAutoSaveOnChange } from '@/hooks/use-auto-save'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Eye, Globe, Clock, AlertCircle } from 'lucide-react'
import { generateExcerpt, estimateReadingTime, sanitizeContent } from '@/lib/utils/content'
import { generateSlug } from '@/lib/utils/slug'
import type { JSONContent, Article } from '@/types'

interface ArticleEditorProps {
  article?: Partial<Article>
  onSave?: (article: Partial<Article>) => Promise<void>
  onPublish?: (article: Partial<Article>) => Promise<void>
  onPreview?: (article: Partial<Article>) => void
  isLoading?: boolean
  className?: string
}

export function ArticleEditor({
  article,
  onSave,
  onPublish,
  onPreview,
  isLoading = false,
  className = '',
}: ArticleEditorProps) {
  const [title, setTitle] = useState(article?.title || '')
  const [content, setContent] = useState<JSONContent>(
    article?.content || {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    }
  )
  const [excerpt, setExcerpt] = useState(article?.excerpt || '')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    article?.status || 'draft'
  )
  const [slug, setSlug] = useState(article?.slug || '')
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(!article?.slug)
  const [seoTitle, setSeoTitle] = useState(article?.seoMeta?.title || '')
  const [seoDescription, setSeoDescription] = useState(article?.seoMeta?.description || '')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Auto-generate slug from title
  useEffect(() => {
    if (autoGenerateSlug && title) {
      setSlug(generateSlug(title))
    }
  }, [title, autoGenerateSlug])

  // Auto-generate excerpt from content
  useEffect(() => {
    if (!excerpt && content) {
      const autoExcerpt = generateExcerpt(content, 160)
      if (autoExcerpt) {
        setExcerpt(autoExcerpt)
      }
    }
  }, [content, excerpt])

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = 
      title !== (article?.title || '') ||
      JSON.stringify(content) !== JSON.stringify(article?.content || {}) ||
      excerpt !== (article?.excerpt || '') ||
      status !== (article?.status || 'draft') ||
      slug !== (article?.slug || '')

    setHasUnsavedChanges(hasChanges)
  }, [title, content, excerpt, status, slug, article])

  const handleSave = useCallback(async () => {
    if (!onSave) return

    try {
      const sanitizedContent = sanitizeContent(content)
      const articleData: Partial<Article> = {
        ...article,
        title,
        content: sanitizedContent,
        excerpt: excerpt || generateExcerpt(sanitizedContent, 160),
        status,
        slug,
        seoMeta: {
          title: seoTitle || title,
          description: seoDescription || excerpt,
          keywords: [], // TODO: Extract keywords from content
        },
      }

      await onSave(articleData)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save article:', error)
      throw error
    }
  }, [article, title, content, excerpt, status, slug, seoTitle, seoDescription, onSave])

  const handlePublish = useCallback(async () => {
    if (!onPublish) return

    try {
      const sanitizedContent = sanitizeContent(content)
      const articleData: Partial<Article> = {
        ...article,
        title,
        content: sanitizedContent,
        excerpt: excerpt || generateExcerpt(sanitizedContent, 160),
        status: 'published',
        slug,
        publishedAt: new Date(),
        seoMeta: {
          title: seoTitle || title,
          description: seoDescription || excerpt,
          keywords: [],
        },
      }

      await onPublish(articleData)
      setStatus('published')
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to publish article:', error)
      throw error
    }
  }, [article, title, content, excerpt, slug, seoTitle, seoDescription, onPublish])

  const handlePreview = useCallback(() => {
    if (!onPreview) return

    const articleData: Partial<Article> = {
      ...article,
      title,
      content,
      excerpt: excerpt || generateExcerpt(content, 160),
      status,
      slug,
    }

    onPreview(articleData)
  }, [article, title, content, excerpt, status, slug, onPreview])

  // Auto-save functionality
  const autoSave = useAutoSaveOnChange(
    { title, content, excerpt, status, slug },
    {
      delay: 3000, // 3 second delay
      onSave: handleSave,
      enabled: !!onSave && hasUnsavedChanges,
    }
  )

  const readingTime = estimateReadingTime(content)
  const wordCount = content ? content.content?.length || 0 : 0

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">
            {article?.id ? 'Edit Article' : 'New Article'}
          </h1>
          
          {autoSave.saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          
          {autoSave.saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Save className="h-4 w-4" />
              Saved
            </div>
          )}
          
          {autoSave.saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              Save failed
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onPreview && (
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          )}
          
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={isLoading || !hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          )}
          
          {onPublish && (
            <Button
              onClick={handlePublish}
              disabled={isLoading || !title.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              <Globe className="h-4 w-4 mr-2" />
              {status === 'published' ? 'Update' : 'Publish'}
            </Button>
          )}
        </div>
      </div>

      {/* Article metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title..."
              className="text-lg font-medium"
            />
          </div>

          {/* Content Editor */}
          <div>
            <Label>Content</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              onSave={handleSave}
              autoSave={true}
              autoSaveDelay={3000}
              className="mt-2"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value: 'draft' | 'published' | 'archived') => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="slug">URL Slug</Label>
            <div className="space-y-2">
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setAutoGenerateSlug(false)
                }}
                placeholder="article-url-slug"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoGenerateSlug}
                  onChange={(e) => setAutoGenerateSlug(e.target.checked)}
                />
                Auto-generate from title
              </label>
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief description of the article..."
              rows={3}
            />
          </div>

          {/* SEO */}
          <div className="space-y-4">
            <h3 className="font-medium">SEO Settings</h3>
            
            <div>
              <Label htmlFor="seo-title">SEO Title</Label>
              <Input
                id="seo-title"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="SEO optimized title..."
              />
            </div>
            
            <div>
              <Label htmlFor="seo-description">SEO Description</Label>
              <Textarea
                id="seo-description"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="SEO meta description..."
                rows={2}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium">Article Stats</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <div>Reading time: ~{readingTime} min</div>
              <div>Word count: {wordCount}</div>
              {autoSave.lastSaved && (
                <div>Last saved: {autoSave.lastSaved.toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}