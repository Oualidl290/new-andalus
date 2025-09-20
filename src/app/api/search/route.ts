import { NextRequest, NextResponse } from 'next/server'
import { searchArticles } from '@/lib/db'
import { z } from 'zod'

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      q: searchParams.get('q') || '',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
    }

    const validatedParams = searchSchema.parse(params)

    if (!validatedParams.q.trim()) {
      return NextResponse.json({
        error: {
          code: 'EMPTY_QUERY',
          message: 'Search query cannot be empty',
        },
        timestamp: new Date().toISOString(),
        path: '/api/search',
      }, { status: 400 })
    }

    const result = await searchArticles(
      validatedParams.q.trim(),
      validatedParams.page,
      validatedParams.limit
    )

    // Add search highlighting and suggestions
    const enhancedResult = {
      ...result,
      query: validatedParams.q,
      suggestions: result.articles.length === 0 ? generateSearchSuggestions(validatedParams.q) : [],
      articles: result.articles.map(article => ({
        ...article,
        searchHighlight: generateSearchHighlight(article, validatedParams.q),
      })),
    }

    return NextResponse.json({
      success: true,
      ...enhancedResult,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: error.issues,
        },
        timestamp: new Date().toISOString(),
        path: '/api/search',
      }, { status: 400 })
    }

    console.error('Search error:', error)
    return NextResponse.json({
      error: {
        code: 'SEARCH_ERROR',
        message: 'Failed to perform search',
      },
      timestamp: new Date().toISOString(),
      path: '/api/search',
    }, { status: 500 })
  }
}

function generateSearchHighlight(article: { title: string; excerpt?: string | null }, query: string): string {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
  
  // Try to find the query in the title first
  const titleMatch = findMatchInText(article.title, searchTerms)
  if (titleMatch) {
    return titleMatch
  }

  // Then try the excerpt
  if (article.excerpt) {
    const excerptMatch = findMatchInText(article.excerpt, searchTerms)
    if (excerptMatch) {
      return excerptMatch
    }
  }

  // Fallback to excerpt or truncated title
  return article.excerpt || article.title.slice(0, 150) + '...'
}

function findMatchInText(text: string, searchTerms: string[]): string | null {
  const lowerText = text.toLowerCase()
  
  for (const term of searchTerms) {
    const index = lowerText.indexOf(term)
    if (index !== -1) {
      // Extract context around the match
      const start = Math.max(0, index - 50)
      const end = Math.min(text.length, index + term.length + 50)
      let excerpt = text.slice(start, end)
      
      if (start > 0) excerpt = '...' + excerpt
      if (end < text.length) excerpt = excerpt + '...'
      
      // Highlight the search term
      const regex = new RegExp(`(${term})`, 'gi')
      excerpt = excerpt.replace(regex, '<mark>$1</mark>')
      
      return excerpt
    }
  }
  
  return null
}

function generateSearchSuggestions(query: string): string[] {
  const queryLower = query.toLowerCase().trim()
  
  // Common editorial topics and related terms
  const topicSuggestions: Record<string, string[]> = {
    'politic': ['politics', 'government', 'policy', 'election'],
    'tech': ['technology', 'innovation', 'digital', 'AI'],
    'cultur': ['culture', 'society', 'arts', 'tradition'],
    'econom': ['economy', 'business', 'finance', 'market'],
    'climat': ['climate change', 'environment', 'sustainability'],
    'health': ['healthcare', 'medicine', 'wellness', 'public health'],
    'educ': ['education', 'learning', 'university', 'school'],
    'social': ['social media', 'society', 'community', 'culture'],
    'news': ['current events', 'breaking news', 'updates'],
    'opinion': ['editorial', 'commentary', 'analysis', 'perspective'],
    'review': ['critique', 'analysis', 'evaluation', 'assessment'],
    'interview': ['conversation', 'discussion', 'profile', 'Q&A']
  }

  // Find matching topic suggestions
  const suggestions: string[] = []
  
  for (const [key, values] of Object.entries(topicSuggestions)) {
    if (queryLower.includes(key) || key.includes(queryLower)) {
      suggestions.push(...values.filter(v => 
        v.toLowerCase() !== queryLower && 
        !queryLower.includes(v.toLowerCase())
      ))
    }
  }

  // If no topic matches, provide general suggestions
  if (suggestions.length === 0) {
    const generalSuggestions = [
      'politics',
      'technology',
      'culture',
      'analysis',
      'opinion',
      'current events',
      'commentary',
      'review',
      'interview',
      'society'
    ]
    
    suggestions.push(...generalSuggestions.filter(s => 
      s.toLowerCase() !== queryLower &&
      !queryLower.includes(s.toLowerCase()) &&
      !s.toLowerCase().includes(queryLower)
    ))
  }

  // Remove duplicates and return top 3
  return [...new Set(suggestions)].slice(0, 3)
}