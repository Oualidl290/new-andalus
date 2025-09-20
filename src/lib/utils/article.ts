import { revalidatePath } from 'next/cache'
import type { ImageMetadata, SEOMetadata } from '@/types'

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generate SEO metadata for an article
 */
export function generateSEOMetadata({
  title,
  excerpt,
  featuredImage,
}: {
  title: string
  excerpt?: string | null
  featuredImage?: ImageMetadata | null
}): SEOMetadata {
  // Generate description from excerpt or title
  const description = excerpt 
    ? excerpt.slice(0, 160) // Meta description should be ~160 chars
    : `Read "${title}" on New Andalus - Modern Editorial Platform`

  // Extract keywords from title (simple approach)
  const keywords = title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3) // Only words longer than 3 chars
    .slice(0, 5) // Max 5 keywords

  return {
    title: `${title} | New Andalus`,
    description,
    keywords,
    ogImage: featuredImage?.url,
  }
}

/**
 * Generate excerpt from content if not provided
 */
export function generateExcerpt(content: unknown, maxLength = 200): string {
  // Extract text from JSON content structure
  function extractText(node: any): string {
    if (typeof node === 'string') return node
    if (node?.text) return node.text
    if (node?.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join(' ')
    }
    return ''
  }

  const text = extractText(content)
  if (text.length <= maxLength) return text
  
  // Find the last complete word within the limit
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  return lastSpace > 0 
    ? truncated.slice(0, lastSpace) + '...'
    : truncated + '...'
}

/**
 * Get default featured image placeholder
 */
export function getDefaultFeaturedImage(): ImageMetadata {
  return {
    url: '/images/default-article-image.svg',
    alt: 'New Andalus Article',
    width: 1200,
    height: 630,
  }
}

/**
 * Revalidate article-related cache paths
 */
export async function revalidateArticleCache(slug: string) {
  try {
    // Revalidate the specific article page
    revalidatePath(`/articles/${slug}`)
    
    // Revalidate the homepage (article listings)
    revalidatePath('/')
    
    // Revalidate the articles listing page
    revalidatePath('/articles')
    
    console.log(`✅ Cache revalidated for article: ${slug}`)
  } catch (error) {
    console.error('❌ Failed to revalidate cache:', error)
  }
}

/**
 * Validate article status transitions
 */
export function validateStatusTransition(
  currentStatus: 'draft' | 'published' | 'archived',
  newStatus: 'draft' | 'published' | 'archived'
): { valid: boolean; message?: string } {
  // Define valid transitions
  const validTransitions: Record<string, string[]> = {
    draft: ['published', 'archived'],
    published: ['draft', 'archived'],
    archived: ['draft'], // Can only restore to draft
  }

  if (currentStatus === newStatus) {
    return { valid: true } // No change
  }

  if (validTransitions[currentStatus]?.includes(newStatus)) {
    return { valid: true }
  }

  return {
    valid: false,
    message: `Cannot transition from ${currentStatus} to ${newStatus}`,
  }
}

/**
 * Calculate estimated reading time
 */
export function calculateReadingTime(content: unknown): number {
  const text = extractTextFromContent(content)
  const wordsPerMinute = 200 // Average reading speed
  const wordCount = text.split(/\s+/).length
  
  return Math.ceil(wordCount / wordsPerMinute)
}

function extractTextFromContent(node: any): string {
  if (typeof node === 'string') return node
  if (node?.text) return node.text
  if (node?.content && Array.isArray(node.content)) {
    return node.content.map(extractTextFromContent).join(' ')
  }
  return ''
}