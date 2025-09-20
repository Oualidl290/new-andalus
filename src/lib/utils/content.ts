import type { JSONContent, ContentNode } from '@/types'

/**
 * Extract plain text from JSON content structure
 */
export function extractTextFromContent(content: JSONContent): string {
  if (!content || !content.content) {
    return ''
  }

  let text = ''

  function traverse(nodes: any[]): void {
    for (const node of nodes) {
      if (node?.type === 'text') {
        text += node.text || ''
      } else if (node?.content && Array.isArray(node.content)) {
        traverse(node.content)
      }
      
      // Add space after block elements
      if (node?.type && ['paragraph', 'heading', 'listItem'].includes(node.type)) {
        text += ' '
      }
    }
  }

  traverse(content.content)
  return text.trim()
}

/**
 * Generate an excerpt from article content
 */
export function generateExcerpt(content: JSONContent, maxLength = 160): string {
  const text = extractTextFromContent(content)
  
  if (text.length <= maxLength) {
    return text
  }

  // Find the last complete word within the limit
  const truncated = text.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > maxLength * 0.8) {
    // If we can find a space reasonably close to the limit, use it
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  // Otherwise, just truncate at the limit
  return truncated + '...'
}

/**
 * Count words in content
 */
export function countWords(content: JSONContent): number {
  const text = extractTextFromContent(content)
  if (!text.trim()) return 0
  
  return text.trim().split(/\s+/).length
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(content: JSONContent, wordsPerMinute = 200): number {
  const wordCount = countWords(content)
  return Math.ceil(wordCount / wordsPerMinute)
}

/**
 * Validate JSON content structure
 */
export function isValidJSONContent(content: unknown): content is JSONContent {
  return !!(
    content &&
    typeof content === 'object' &&
    (content as any).type === 'doc' &&
    Array.isArray((content as any).content)
  )
}

/**
 * Clean and sanitize content for safe storage
 */
export function sanitizeContent(content: JSONContent): JSONContent {
  if (!isValidJSONContent(content)) {
    throw new Error('Invalid content structure')
  }

  // Basic sanitization - remove any potentially dangerous attributes
  function sanitizeNode(node: ContentNode): ContentNode {
    if (node.type === 'text') {
      return {
        type: 'text',
        text: node.text || '',
      }
    }

    const sanitized: ContentNode = {
      type: node.type,
    }

    // Allow specific safe attributes
    const allowedAttrs = ['level', 'src', 'alt', 'title', 'href']
    if (node.attrs) {
      sanitized.attrs = {}
      for (const attr of allowedAttrs) {
        if (node.attrs[attr] !== undefined) {
          sanitized.attrs[attr] = node.attrs[attr]
        }
      }
      if (Object.keys(sanitized.attrs).length === 0) {
        delete sanitized.attrs
      }
    }

    if (node.content && Array.isArray(node.content)) {
      sanitized.content = node.content.map(sanitizeNode)
    }

    return sanitized
  }

  return {
    type: 'doc',
    content: content.content.map(sanitizeNode),
  }
}