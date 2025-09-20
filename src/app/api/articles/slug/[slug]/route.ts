import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getArticleBySlug } from '@/lib/db'

// GET /api/articles/slug/[slug] - Get article by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const article = await getArticleBySlug(slug)

    if (!article) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Article not found' } },
        { status: 404 }
      )
    }

    // Check if article is published or user has permission to view drafts
    if (article.status !== 'published') {
      const session = await auth()
      if (!session?.user) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        )
      }

      // Only allow viewing unpublished articles if user is author, admin, or editor
      if (
        article.authorId !== session.user.id &&
        session.user.role !== 'admin' &&
        session.user.role !== 'editor'
      ) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Access denied' } },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error fetching article by slug:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch article',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    )
  }
}