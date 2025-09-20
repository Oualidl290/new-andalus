'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SimpleSelect as Select } from '@/components/ui/select'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { ImageUploadDialog } from '@/components/editor/image-upload-dialog'
import { ArticleStatusBadge } from '@/components/article/ArticleStatusBadge'
import { ArticlePreview } from '@/components/admin/ArticlePreview'
import { useAutoSave } from '@/hooks/use-auto-save'
import { Save, Eye, Upload, ArrowLeft } from 'lucide-react'
import { Article, JSONContent } from '@/types'
import Link from 'next/link'

interface ArticleEditorProps {
  mode: 'create' | 'edit'
  article?: Article
  authorId?: string
}

interface ArticleFormData {
  title: string
  content: JSONContent
  excerpt: string
  status: 'draft' | 'published' | 'archived'
  featuredImage?: {
    url: string
    alt: string
    width: number
    height: number
  } | null
}

export function ArticleEditor({ mode, article }: ArticleEditorProps) {
  const router = useRouter()
  const [isLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  const [formData, setFormData] = useState<ArticleFormData>({
    title: article?.title || '',
    content: article?.content || { type: 'doc', content: [] },
    excerpt: article?.excerpt || '',
    status: article?.status || 'draft',
    featuredImage: article?.featuredImage || null,
  })

  // Auto-save functionality
  useAutoSave({
    onSave: async () => {
      if (mode === 'edit' && article) {
        await saveArticle(formData, false)
      }
    },
    delay: 2000,
  })

  const updateFormData = (updates: Partial<ArticleFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const saveArticle = async (data: ArticleFormData, redirect = false) => {
    setIsSaving(true)
    
    try {
      const url = mode === 'create' 
        ? '/api/admin/articles'
        : `/api/admin/articles/${article!.id}`
      
      const method = mode === 'create' ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save article')
      }

      const result = await response.json()
      setLastSaved(new Date())
      
      if (redirect) {
        router.push('/admin/articles')
      } else if (mode === 'create') {
        // Redirect to edit mode after creation
        router.push(`/admin/articles/${result.data.article.id}/edit`)
      }
    } catch (error) {
      console.error('Error saving article:', error)
      // TODO: Show error toast
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = () => {
    saveArticle(formData, false)
  }

  const handlePublish = () => {
    const publishData = { ...formData, status: 'published' as const }
    updateFormData(publishData)
    saveArticle(publishData, true)
  }

  const handleSaveAndExit = () => {
    saveArticle(formData, true)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <Link href="/admin/articles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Articles
            </Button>
          </Link>
          {article && (
            <ArticleStatusBadge status={formData.status} />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          {formData.status === 'published' && article && (
            <Link href={`/articles/${article.slug}`}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </Link>
          )}
          
          <Button
            onClick={formData.status === 'published' ? handleSaveAndExit : handlePublish}
            disabled={isLoading || !formData.title.trim()}
          >
            {formData.status === 'published' ? 'Save & Exit' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <Input
              placeholder="Article title..."
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              className="text-2xl font-bold border-none px-0 focus:ring-0 placeholder:text-gray-400"
            />
          </div>

          <div>
            <Textarea
              placeholder="Write a brief excerpt..."
              value={formData.excerpt}
              onChange={(e) => updateFormData({ excerpt: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          <div>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => updateFormData({ content })}
              placeholder="Start writing your article..."
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Real-time Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
            <ArticlePreview
              title={formData.title}
              content={formData.content}
              excerpt={formData.excerpt}
              featuredImage={formData.featuredImage}
              status={formData.status}
              publishedAt={article?.publishedAt}
              authorName="You"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Publish Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => updateFormData({ status: value as 'draft' | 'published' | 'archived' })}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Featured Image</h3>
            
            {formData.featuredImage ? (
              <div className="space-y-3">
                <img
                  src={formData.featuredImage.url}
                  alt={formData.featuredImage.alt}
                  className="w-full h-32 object-cover rounded-md"
                />
                <div className="flex space-x-2">
                  <ImageUploadDialog
                    onUpload={(image) => updateFormData({ featuredImage: image })}
                  >
                    <Button variant="outline" size="sm" className="flex-1">
                      Replace
                    </Button>
                  </ImageUploadDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFormData({ featuredImage: null })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <ImageUploadDialog
                onUpload={(image) => updateFormData({ featuredImage: image })}
              >
                <Button variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </ImageUploadDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}