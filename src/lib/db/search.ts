import { eq, desc, and, or, ilike, count, sql } from 'drizzle-orm'
import { db } from './connection'
import { articles } from './schema'

export interface SearchOptions {
  query: string
  page?: number
  limit?: number
  sortBy?: 'relevance' | 'date' | 'title'
}

export interface SearchResult {
  id: string
  title: string
  slug: string
  excerpt: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  relevanceScore?: number
}

/**
 * Enhanced search function with full-text search capabilities
 */
export async function searchArticlesEnhanced({
  query,
  page = 1,
  limit = 10,
  sortBy = 'relevance'
}: SearchOptions) {
  const offset = (page - 1) * limit
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0)

  if (searchTerms.length === 0) {
    return {
      articles: [],
      pagination: { page, limit, total: 0, hasNext: false },
      query,
    }
  }

  try {
    // Build search conditions
    const searchConditions = and(
      eq(articles.status, 'published'),
      or(
        // Search in title (highest priority)
        ...searchTerms.map(term => ilike(articles.title, `%${term}%`)),
        // Search in excerpt
        ...searchTerms.map(term => ilike(articles.excerpt, `%${term}%`)),
        // Search in JSON content (converted to text)
        ...searchTerms.map(term => 
          sql`${articles.content}::text ILIKE ${`%${term}%`}`
        )
      )
    )

    // Get articles with search ranking
    const searchQuery = db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        // Calculate relevance score based on where the match occurs
        relevanceScore: sql<number>`
          CASE 
            WHEN ${articles.title} ILIKE ${`%${query}%`} THEN 100
            WHEN ${articles.excerpt} ILIKE ${`%${query}%`} THEN 50
            ELSE 10
          END
        `.as('relevance_score'),
      })
      .from(articles)
      .where(searchConditions)

    // Apply sorting and execute query
    let searchResults
    switch (sortBy) {
      case 'relevance':
        searchResults = await searchQuery
          .orderBy(desc(sql`relevance_score`), desc(articles.publishedAt))
          .limit(limit)
          .offset(offset)
        break
      case 'date':
        searchResults = await searchQuery
          .orderBy(desc(articles.publishedAt))
          .limit(limit)
          .offset(offset)
        break
      case 'title':
        searchResults = await searchQuery
          .orderBy(articles.title)
          .limit(limit)
          .offset(offset)
        break
      default:
        searchResults = await searchQuery
          .orderBy(desc(articles.publishedAt))
          .limit(limit)
          .offset(offset)
    }

    const [, totalCount] = await Promise.all([
      Promise.resolve(searchResults),
      db
        .select({ count: count() })
        .from(articles)
        .where(searchConditions)
    ])

    const total = totalCount[0]?.count || 0
    const hasNext = offset + limit < total

    return {
      articles: searchResults,
      pagination: {
        page,
        limit,
        total,
        hasNext,
      },
      query,
    }
  } catch (error) {
    console.error('Enhanced search error:', error)
    throw error
  }
}

/**
 * Get search suggestions based on query
 */
export async function getSearchSuggestions(query: string, limit = 5) {
  try {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
    
    if (searchTerms.length === 0) {
      return []
    }

    // Find articles with similar titles for suggestions
    const suggestions = await db
      .select({
        title: articles.title,
        slug: articles.slug,
      })
      .from(articles)
      .where(
        and(
          eq(articles.status, 'published'),
          or(
            ...searchTerms.map(term => ilike(articles.title, `%${term}%`))
          )
        )
      )
      .limit(limit)

    return suggestions.map(article => article.title)
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    return []
  }
}

/**
 * Get popular search terms (placeholder implementation)
 */
export function getPopularSearchTerms(): string[] {
  // In a real implementation, this would come from search analytics
  return [
    'politics',
    'technology',
    'culture',
    'analysis',
    'opinion',
    'news',
    'commentary',
    'review',
    'interview',
    'editorial',
  ]
}

/**
 * Generate search excerpt with highlighting
 */
export function generateSearchExcerpt(text: string, query: string, maxLength = 200): string {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
  const lowerText = text.toLowerCase()
  
  // Find the first occurrence of any search term
  let bestMatch = { index: -1, term: '' }
  
  for (const term of searchTerms) {
    const index = lowerText.indexOf(term)
    if (index !== -1 && (bestMatch.index === -1 || index < bestMatch.index)) {
      bestMatch = { index, term }
    }
  }

  if (bestMatch.index === -1) {
    // No match found, return truncated text
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }

  // Extract context around the match
  const start = Math.max(0, bestMatch.index - 50)
  const end = Math.min(text.length, bestMatch.index + bestMatch.term.length + 50)
  let excerpt = text.slice(start, end)
  
  if (start > 0) excerpt = '...' + excerpt
  if (end < text.length) excerpt = excerpt + '...'
  
  // Highlight all search terms
  for (const term of searchTerms) {
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi')
    excerpt = excerpt.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  }
  
  return excerpt
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}