import { NextRequest, NextResponse } from 'next/server'
import { getArticleById, updateArticle } from '@/lib/db'
import { generateSEOMetadata, revalidateArticleCache, validateStatusTransition } from '@/lib/utils/article'
import { generateSitemap } from '@/lib/utils/sitemap'
import type { ImageMetadata } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Get the current article
    const article = await getArticleById(id)
    
    if (!article) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}/publish`,
      }, { status: 404 })
    }

    // Validate status transition
    const transition = validateStatusTransition(article.status, 'published')
    if (!transition.valid) {
      return NextResponse.json({
        error: {
          code: 'INVALID_TRANSITION',
          message: transition.message || 'Cannot publish article',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}/publish`,
      }, { status: 400 })
    }

    // Check if article has required fields for publishing
    if (!article.title || !article.content) {
      return NextResponse.json({
        error: {
          code: 'INCOMPLETE_ARTICLE',
          message: 'Article must have title and content to be published',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}/publish`,
      }, { status: 400 })
    }

    // Generate SEO metadata if not present or outdated
    const seoMeta = generateSEOMetadata({
      title: article.title,
      excerpt: article.excerpt,
      featuredImage: article.featuredImage as ImageMetadata | null,
    })

    // Update article to published status
    const publishedArticle = await updateArticle(id, {
      status: 'published',
      publishedAt: new Date(),
      seoMeta,
    })

    if (!publishedArticle) {
      return NextResponse.json({
        error: {
          code: 'PUBLISH_FAILED',
          message: 'Failed to publish article',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}/publish`,
      }, { status: 500 })
    }

    // Post-publish tasks
    try {
      // Revalidate cache
      await revalidateArticleCache(publishedArticle.slug)
      
      // Update sitemap
      await generateSitemap()
    } catch (error) {
      console.error('Post-publish tasks failed:', error)
      // Don't fail the request if post-publish tasks fail
    }

    return NextResponse.json({
      success: true,
      message: 'Article published successfully',
      article: publishedArticle,
    })

  } catch (error) {
    console.error('Error publishing article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to publish article',
      },
      timestamp: new Date().toISOString(),
      path: `/api/articles/${await params.then(p => p.id)}/publish`,
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Unpublish article (set to draft)
    const article = await getArticleById(id)
    
    if (!article) {
      return NextResponse.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Article not found',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}/publish`,
      }, { status: 404 })
    }

    if (article.status !== 'published') {
      return NextResponse.json({
        error: {
          code: 'NOT_PUBLISHED',
          message: 'Article is not currently published',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}/publish`,
      }, { status: 400 })
    }

    // Update article to draft status
    const unpublishedArticle = await updateArticle(id, {
      status: 'draft',
      publishedAt: null,
    })

    if (!unpublishedArticle) {
      return NextResponse.json({
        error: {
          code: 'UNPUBLISH_FAILED',
          message: 'Failed to unpublish article',
        },
        timestamp: new Date().toISOString(),
        path: `/api/articles/${id}/publish`,
      }, { status: 500 })
    }

    // Post-unpublish tasks
    try {
      // Revalidate cache
      await revalidateArticleCache(unpublishedArticle.slug)
      
      // Update sitemap
      await generateSitemap()
    } catch (error) {
      console.error('Post-unpublish tasks failed:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Article unpublished successfully',
      article: unpublishedArticle,
    })

  } catch (error) {
    console.error('Error unpublishing article:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to unpublish article',
      },
      timestamp: new Date().toISOString(),
      path: `/api/articles/${await params.then(p => p.id)}/publish`,
    }, { status: 500 })
  }
}