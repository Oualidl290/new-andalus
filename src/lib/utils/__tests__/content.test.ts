import { describe, it, expect } from 'vitest'
import {
  extractTextFromContent,
  generateExcerpt,
  countWords,
  estimateReadingTime,
  isValidJSONContent,
  sanitizeContent,
} from '../content'

describe('Content Utilities', () => {
  const sampleContent = {
    type: 'doc' as const,
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'This is the first paragraph. ' },
          { type: 'text', text: 'It has multiple sentences.' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'This is the second paragraph with more content.' },
        ],
      },
    ],
  }

  describe('extractTextFromContent', () => {
    it('should extract plain text from JSON content', () => {
      const text = extractTextFromContent(sampleContent)
      expect(text).toBe('This is the first paragraph. It has multiple sentences. This is the second paragraph with more content.')
    })

    it('should handle empty content', () => {
      const emptyContent = { type: 'doc' as const, content: [] }
      expect(extractTextFromContent(emptyContent)).toBe('')
    })

    it('should handle nested content structures', () => {
      const nestedContent = {
        type: 'doc' as const,
        content: [
          {
            type: 'heading',
            content: [{ type: 'text', text: 'Heading' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'List item' }],
                  },
                ],
              },
            ],
          },
        ],
      }

      const text = extractTextFromContent(nestedContent)
      expect(text).toContain('Heading')
      expect(text).toContain('List item')
    })
  })

  describe('generateExcerpt', () => {
    it('should generate excerpt within character limit', () => {
      const excerpt = generateExcerpt(sampleContent, 50)
      expect(excerpt.length).toBeLessThanOrEqual(53) // 50 + '...'
      expect(excerpt).toMatch(/\.\.\.$/)
    })

    it('should return full text if shorter than limit', () => {
      const shortContent = {
        type: 'doc' as const,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Short text.' }],
          },
        ],
      }

      const excerpt = generateExcerpt(shortContent, 100)
      expect(excerpt).toBe('Short text.')
      expect(excerpt).not.toMatch(/\.\.\.$/)
    })

    it('should break at word boundaries when possible', () => {
      const excerpt = generateExcerpt(sampleContent, 30)
      expect(excerpt).not.toMatch(/\w\.\.\.$/) // Should not end mid-word
    })
  })

  describe('countWords', () => {
    it('should count words correctly', () => {
      const wordCount = countWords(sampleContent)
      expect(wordCount).toBe(17) // Counting all words in the sample content
    })

    it('should handle empty content', () => {
      const emptyContent = { type: 'doc' as const, content: [] }
      expect(countWords(emptyContent)).toBe(0)
    })

    it('should handle multiple spaces', () => {
      const spacedContent = {
        type: 'doc' as const,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Word1   Word2    Word3' }],
          },
        ],
      }
      expect(countWords(spacedContent)).toBe(3)
    })
  })

  describe('estimateReadingTime', () => {
    it('should estimate reading time correctly', () => {
      const readingTime = estimateReadingTime(sampleContent, 200)
      expect(readingTime).toBe(1) // 15 words at 200 wpm = 0.075 minutes, rounded up to 1
    })

    it('should handle different reading speeds', () => {
      const fastReading = estimateReadingTime(sampleContent, 300)
      const slowReading = estimateReadingTime(sampleContent, 100)
      expect(fastReading).toBeLessThanOrEqual(slowReading)
    })

    it('should return 0 for empty content', () => {
      const emptyContent = { type: 'doc' as const, content: [] }
      expect(estimateReadingTime(emptyContent)).toBe(0)
    })
  })

  describe('isValidJSONContent', () => {
    it('should validate correct JSON content', () => {
      expect(isValidJSONContent(sampleContent)).toBe(true)
    })

    it('should reject invalid content structures', () => {
      expect(isValidJSONContent(null)).toBe(false)
      expect(isValidJSONContent({})).toBe(false)
      expect(isValidJSONContent({ type: 'doc' })).toBe(false)
      expect(isValidJSONContent({ type: 'paragraph', content: [] })).toBe(false)
      expect(isValidJSONContent({ content: [] })).toBe(false)
    })
  })

  describe('sanitizeContent', () => {
    it('should sanitize content while preserving structure', () => {
      const unsafeContent = {
        type: 'doc' as const,
        content: [
          {
            type: 'paragraph',
            attrs: { onclick: 'alert("xss")', class: 'safe-class' },
            content: [
              {
                type: 'text',
                text: 'Safe text',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      }

      const sanitized = sanitizeContent(unsafeContent)
      expect(sanitized.type).toBe('doc')
      expect(sanitized.content[0].type).toBe('paragraph')
      expect(sanitized.content[0].attrs).toBeUndefined() // Unsafe attrs removed
      expect(sanitized.content[0].content[0].text).toBe('Safe text')
      expect(sanitized.content[0].content[0].marks).toBeDefined() // Marks should be preserved
    })

    it('should preserve allowed attributes', () => {
      const contentWithAttrs = {
        type: 'doc' as const,
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Heading' }],
          },
          {
            type: 'image',
            attrs: { src: 'image.jpg', alt: 'Alt text', onclick: 'bad()' },
          },
        ],
      }

      const sanitized = sanitizeContent(contentWithAttrs)
      expect(sanitized.content[0].attrs?.level).toBe(2)
      expect(sanitized.content[1].attrs?.src).toBe('image.jpg')
      expect(sanitized.content[1].attrs?.alt).toBe('Alt text')
      expect(sanitized.content[1].attrs?.onclick).toBeUndefined()
    })

    it('should throw error for invalid content', () => {
      expect(() => sanitizeContent(null as any)).toThrow('Invalid content structure')
      expect(() => sanitizeContent({ type: 'paragraph' } as any)).toThrow('Invalid content structure')
    })
  })
})