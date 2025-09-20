import { describe, it, expect } from 'vitest'
import { 
  generateSlug, 
  generateSEOMetadata, 
  generateExcerpt, 
  validateStatusTransition,
  calculateReadingTime,
  getDefaultFeaturedImage 
} from '../article'

describe('Article Utilities', () => {
  describe('generateSlug', () => {
    it('should generate URL-friendly slugs', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
      expect(generateSlug('This is a Test Article!')).toBe('this-is-a-test-article')
      expect(generateSlug('  Spaces   and   Tabs  ')).toBe('spaces-and-tabs')
      expect(generateSlug('Special@#$%Characters')).toBe('specialcharacters')
    })

    it('should handle edge cases', () => {
      expect(generateSlug('')).toBe('')
      expect(generateSlug('   ')).toBe('')
      expect(generateSlug('---')).toBe('')
      expect(generateSlug('a')).toBe('a')
    })
  })

  describe('generateSEOMetadata', () => {
    it('should generate proper SEO metadata', () => {
      const seo = generateSEOMetadata({
        title: 'Test Article',
        excerpt: 'This is a test article about testing',
        featuredImage: {
          url: 'https://example.com/image.jpg',
          alt: 'Test image',
          width: 1200,
          height: 630,
        },
      })

      expect(seo.title).toBe('Test Article | New Andalus')
      expect(seo.description).toBe('This is a test article about testing')
      expect(seo.keywords).toContain('test')
      expect(seo.keywords).toContain('article')
      expect(seo.ogImage).toBe('https://example.com/image.jpg')
    })

    it('should generate fallback description when no excerpt', () => {
      const seo = generateSEOMetadata({
        title: 'Test Article',
      })

      expect(seo.description).toContain('Test Article')
      expect(seo.description).toContain('New Andalus')
    })

    it('should truncate long descriptions', () => {
      const longExcerpt = 'a'.repeat(200)
      const seo = generateSEOMetadata({
        title: 'Test',
        excerpt: longExcerpt,
      })

      expect(seo.description.length).toBeLessThanOrEqual(160)
    })
  })

  describe('generateExcerpt', () => {
    it('should extract text from JSON content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This is the first paragraph. ' },
              { type: 'text', text: 'It has multiple sentences.' },
            ],
          },
        ],
      }

      const excerpt = generateExcerpt(content, 50)
      expect(excerpt).toContain('This is the first paragraph')
    })

    it('should truncate long content', () => {
      const longText = 'word '.repeat(100)
      const content = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: longText }] }],
      }

      const excerpt = generateExcerpt(content, 50)
      expect(excerpt.length).toBeLessThanOrEqual(53) // 50 + '...'
      expect(excerpt).toMatch(/\.\.\.$/) // Should end with ...
    })
  })

  describe('validateStatusTransition', () => {
    it('should allow valid transitions', () => {
      expect(validateStatusTransition('draft', 'published')).toEqual({ valid: true })
      expect(validateStatusTransition('published', 'draft')).toEqual({ valid: true })
      expect(validateStatusTransition('published', 'archived')).toEqual({ valid: true })
      expect(validateStatusTransition('archived', 'draft')).toEqual({ valid: true })
    })

    it('should reject invalid transitions', () => {
      const result = validateStatusTransition('archived', 'published')
      expect(result.valid).toBe(false)
      expect(result.message).toContain('Cannot transition')
    })

    it('should allow same status (no change)', () => {
      expect(validateStatusTransition('draft', 'draft')).toEqual({ valid: true })
      expect(validateStatusTransition('published', 'published')).toEqual({ valid: true })
    })
  })

  describe('calculateReadingTime', () => {
    it('should calculate reading time correctly', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'word '.repeat(200) }], // 200 words
          },
        ],
      }

      const readingTime = calculateReadingTime(content)
      expect(readingTime).toBe(2) // 200 words / 200 wpm = 1 minute, but rounds up
    })

    it('should round up reading time', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'word '.repeat(250) }], // 250 words
          },
        ],
      }

      const readingTime = calculateReadingTime(content)
      expect(readingTime).toBe(2) // 250 words / 200 wpm = 1.25, rounded up to 2
    })
  })

  describe('getDefaultFeaturedImage', () => {
    it('should return default image metadata', () => {
      const defaultImage = getDefaultFeaturedImage()
      
      expect(defaultImage.url).toBe('/images/default-article-image.svg')
      expect(defaultImage.alt).toBe('New Andalus Article')
      expect(defaultImage.width).toBe(1200)
      expect(defaultImage.height).toBe(630)
    })
  })
})