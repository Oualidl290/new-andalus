import { NextRequest, NextResponse } from 'next/server'
import { getArticleById, updateArticle, deleteArticle } from '@/lib/db'
import { generateSEOMetadata, revalidateArticleCache } from '@/lib/utils/article'
import { generateSitemap } from '@/lib/utils/sitemap'
import type { ImageMetadata } from '@/types'
import { z } from 'zod'

// Validation schema for updating articles
const updateArticleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.object({
    type: z.literal('doc'),
    content: z.array(z.any()),
  }).optional(),
  excerpt: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featuredImage: z.object({
    url: z.string().url(),
    alt: z.string(),
    width: z.number(),
    height: z.number(),
  }).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const article = await getArticleById(id)

    if (!article) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}`,
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      article,
    })

  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch article',
      },
      timestamp: new Date().toISOString(),
      path: `/api/articles/${await params.then(p => p.id)}`,
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updateArticleSchema.parse(body)

    // Get current article to check status change
    const currentArticle = await getArticleById(id)
    if (!currentArticle) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}`,
      }, { status: 404 })
    }

    // Handle publishing workflow
    const updateData: Record<string, unknown> = { ...validatedData }

    // If status is changing to published
    if (validatedData.status === 'published' && currentArticle.status !== 'published') {
      updateData.publishedAt = new Date()
      
      // Generate/update SEO metadata for published articles
      updateData.seoMeta = generateSEOMetadata({
        title: validatedData.title || currentArticle.title,
        excerpt: validatedData.excerpt || currentArticle.excerpt,
        featuredImage: validatedData.featuredImage || (currentArticle.featuredImage as ImageMetadata | null),
      })
    }

    // If status is changing from published to draft/archived
    if (validatedData.status !== 'published' && currentArticle.status === 'published') {
      updateData.publishedAt = null
    }

    const updatedArticle = await updateArticle(id, updateData)

    if (!updatedArticle) {
      return NextResponse.json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update article',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}`,
      }, { status: 500 })
    }

    // Handle post-update tasks
    if (validatedData.status === 'published') {
      // Revalidate cache for published articles
      await revalidateArticleCache(updatedArticle.slug)
      
      // Update sitemap when article is published
      await generateSitemap()
    }

    return NextResponse.json({
      success: true,
      article: updatedArticle,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues,
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${await params.then(p => p.id)}`,
      }, { status: 400 })
    }

    console.error('Error updating article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update article',
      },
      timestamp: new Date().toISOString(),
      path: `/api/articles/${await params.then(p => p.id)}`,
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = await deleteArticle(id)

    if (!success) {
      return NextResponse.json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete article',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}`,
      }, { status: 500 })
    }

    // Update sitemap after deletion
    await generateSitemap()

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete article',
      },
      timestamp: new Date().toISOString(),
      path: `/api/articles/${await params.then(p => p.id)}`,
    }, { status: 500 })
  }
}