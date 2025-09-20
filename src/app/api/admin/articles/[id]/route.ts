import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getArticleById, updateArticle, deleteArticle } from '@/lib/db'
import { generateSlug, generateSEOMetadata } from '@/lib/utils/article'
import { z } from 'zod'

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
    const session = await auth()

    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
        },
        timestamp: new Date().toISOString(),
        path: `/api/admin/articles/${id}`,
      }, { status: 401 })
    }

    const article = await getArticleById(id)

    if (!article) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
        timestamp: new Date().toISOString(),
        path: `/api/admin/articles/${id}`,
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { article },
    })

  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch article',
      },
      timestamp: new Date().toISOString(),
      path: '/api/admin/articles/[id]',
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
        },
        timestamp: new Date().toISOString(),
        path: `/api/admin/articles/${id}`,
      }, { status: 401 })
    }

    // Check if article exists and user has permission
    const existingArticle = await getArticleById(id)
    if (!existingArticle) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
        timestamp: new Date().toISOString(),
        path: `/api/admin/articles/${id}`,
      }, { status: 404 })
    }

    // Check permissions - admin can edit any, editor can edit own
    const canEdit = session.user.role === 'admin' || 
                    existingArticle.authorId === session.user.id

    if (!canEdit) {
      return NextResponse.json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to edit this article',
        },
        timestamp: new Date().toISOString(),
        path: `/api/admin/articles/${id}`,
      }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateArticleSchema.parse(body)

    const updateData: Record<string, unknown> = { ...validatedData }

    // Regenerate slug if title changed
    if (validatedData.title && validatedData.title !== existingArticle.title) {
      updateData.slug = generateSlug(validatedData.title)
    }

    // Regenerate SEO metadata if relevant fields changed
    if (validatedData.title || validatedData.excerpt || validatedData.featuredImage) {
      updateData.seoMeta = generateSEOMetadata({
        title: validatedData.title || existingArticle.title,
        excerpt: validatedData.excerpt || existingArticle.excerpt,
        featuredImage: validatedData.featuredImage || (existingArticle.featuredImage as any),
      })
    }

    // Set publishedAt when publishing
    if (validatedData.status === 'published' && existingArticle.status !== 'published') {
      updateData.publishedAt = new Date()
    }

    const updatedArticle = await updateArticle(id, updateData)

    if (!updatedArticle) {
      return NextResponse.json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update article',
        },
        timestamp: new Date().toISOString(),
        path: `/api/admin/articles/${id}`,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { article: updatedArticle },
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
        path: '/api/admin/articles/[id]',
      }, { status: 400 })
    }

    console.error('Error updating article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update article',
      },
      timestamp: new Date().toISOString(),
      path: '/api/admin/articles/[id]',
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required for deletion',
        },
        timestamp: new Date().toISOString(),
        path: `/api/admin/articles/${id}`,
      }, { status: 401 })
    }

    const success = await deleteArticle(id)

    if (!success) {
      return NextResponse.json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete article',
        },
        timestamp: new Date().toISOString(),
        path: `/api/admin/articles/${id}`,
      }, { status: 500 })
    }

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
      path: '/api/admin/articles/[id]',
    }, { status: 500 })
  }
}