/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 100 characters
    .substring(0, 100)
    .replace(/-+$/, '') // Remove trailing hyphen if substring cut in middle of word
}

/**
 * Validate if a slug is properly formatted
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugRegex.test(slug) && slug.length <= 100
}

/**
 * Sanitize a slug to ensure it meets requirements
 */
export function sanitizeSlug(slug: string): string {
  return generateSlug(slug)
}