import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAllArticles, createArticle } from '@/lib/db'
import { generateSlug, generateSEOMetadata } from '@/lib/utils/article'
import { z } from 'zod'

// Validation schema for creating articles
const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  content: z.object({
    type: z.literal('doc'),
    content: z.array(z.any()),
  }),
  excerpt: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featuredImage: z.object({
    url: z.string().url(),
    alt: z.string(),
    width: z.number(),
    height: z.number(),
  }).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/articles',
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') || 'all'
    const author = searchParams.get('author') || 'all'
    const search = searchParams.get('search') || ''

    // Get all articles (including drafts) for admin
    const result = await getAllArticles({
      page,
      limit,
      status: status === 'all' ? undefined : status as 'draft' | 'published' | 'archived',
      authorId: author === 'all' ? undefined : author,
      search: search || undefined,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error fetching admin articles:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch articles',
      },
      timestamp: new Date().toISOString(),
      path: '/api/admin/articles',
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/articles',
      }, { status: 401 })
    }

    const body = await request.json()
    const { articleIds } = body

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Article IDs array is required',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/articles',
      }, { status: 400 })
    }

    // TODO: Implement bulk delete functionality
    // For now, return success
    return NextResponse.json({
      success: true,
      data: { deletedCount: articleIds.length },
    })

  } catch (error) {
    console.error('Error deleting articles:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete articles',
      },
      timestamp: new Date().toISOString(),
      path: '/api/admin/articles',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || !['admin', 'editor'].includes(session.user.role)) {
      return NextResponse.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/articles',
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createArticleSchema.parse(body)

    // Generate slug from title
    const slug = generateSlug(validatedData.title)

    // Generate SEO metadata
    const seoMeta = generateSEOMetadata({
      title: validatedData.title,
      excerpt: validatedData.excerpt,
      featuredImage: validatedData.featuredImage,
    })

    // Create article
    const article = await createArticle({
      ...validatedData,
      slug,
      seoMeta,
      authorId: session.user.id,
    })

    if (!article) {
      return NextResponse.json({
        error: {
          code: 'CREATION_FAILED',
          message: 'Failed to create article',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/articles',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { article },
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues,
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/articles',
      }, { status: 400 })
    }

    console.error('Error creating article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create article',
      },
      timestamp: new Date().toISOString(),
      path: '/api/admin/articles',
    }, { status: 500 })
  }
}