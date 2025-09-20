import { NextRequest, NextResponse } from 'next/server'
import { createArticle, getPublishedArticles } from '@/lib/db'
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
  featuredImage: z.object({
    url: z.string().url(),
    alt: z.string(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  authorId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
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

    // Create article with default draft status
    const article = await createArticle({
      ...validatedData,
      slug,
      seoMeta,
      status: 'draft', // Always start as draft
    })

    return NextResponse.json({
      success: true,
      article,
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
        path: '/api/articles',
      }, { status: 400 })
    }

    console.error('Error creating article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create article',
      },
      timestamp: new Date().toISOString(),
      path: '/api/articles',
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10)

    // Only return published articles for public API
    const result = await getPublishedArticles(page, limit)

    return NextResponse.json({
      success: true,
      ...result,
    })

  } catch (error) {
    console.error('Error fetching articles:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch articles',
      },
      timestamp: new Date().toISOString(),
      path: '/api/articles',
    }, { status: 500 })
  }
}