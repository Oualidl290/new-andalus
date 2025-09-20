import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getArticleById, updateArticle } from '@/lib/db'
import { z } from 'zod'

// Validation schema for status updates
const statusUpdateSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
})

// PUT /api/articles/[id]/status - Update article status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { id } = await params
    const existingArticle = await getArticleById(id)

    if (!existingArticle) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Article not found' } },
        { status: 404 }
      )
    }

    // Check permissions - only author, admin, or editor can update status
    if (
      existingArticle.authorId !== session.user.id &&
      session.user.role !== 'admin' &&
      session.user.role !== 'editor'
    ) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { status } = statusUpdateSchema.parse(body)

    const updateData: Record<string, unknown> = { status }

    // Handle publication date based on status change
    if (status === 'published' && existingArticle.status !== 'published') {
      // Publishing for the first time or republishing
      updateData.publishedAt = new Date()
    } else if (status !== 'published' && existingArticle.status === 'published') {
      // Unpublishing - keep the original publication date for history
      // Don't set publishedAt to null to maintain publication history
    }

    const updatedArticle = await updateArticle(id, updateData)

    if (!updatedArticle) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Failed to update article status' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: updatedArticle.id,
      status: updatedArticle.status,
      publishedAt: updatedArticle.publishedAt,
      message: `Article ${status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'saved as draft'} successfully`
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid status value',
            details: error.issues
          } 
        },
        { status: 400 }
      )
    }

    console.error('Error updating article status:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update article status',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    )
  }
}