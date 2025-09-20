import { describe, it, expect } from 'vitest'
import { generateSlug, isValidSlug, sanitizeSlug } from '../slug'

describe('Slug Utilities', () => {
  describe('generateSlug', () => {
    it('should convert title to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
      expect(generateSlug('UPPERCASE TITLE')).toBe('uppercase-title')
    })

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces')
      expect(generateSlug('Tab\tSeparated')).toBe('tab-separated')
    })

    it('should remove special characters', () => {
      expect(generateSlug('Title with @#$% symbols!')).toBe('title-with-symbols')
      expect(generateSlug('Question? Answer!')).toBe('question-answer')
    })

    it('should handle underscores and existing hyphens', () => {
      expect(generateSlug('snake_case_title')).toBe('snake-case-title')
      expect(generateSlug('already-hyphenated')).toBe('already-hyphenated')
    })

    it('should trim leading and trailing spaces/hyphens', () => {
      expect(generateSlug('  trimmed title  ')).toBe('trimmed-title')
      expect(generateSlug('---title---')).toBe('title')
    })

    it('should handle empty or whitespace-only strings', () => {
      expect(generateSlug('')).toBe('')
      expect(generateSlug('   ')).toBe('')
      expect(generateSlug('---')).toBe('')
    })

    it('should limit length to 100 characters', () => {
      const longTitle = 'a'.repeat(150)
      const slug = generateSlug(longTitle)
      expect(slug.length).toBeLessThanOrEqual(100)
    })

    it('should handle unicode characters', () => {
      expect(generateSlug('Café & Restaurant')).toBe('caf-restaurant')
      expect(generateSlug('naïve résumé')).toBe('nave-rsum')
    })

    it('should handle numbers', () => {
      expect(generateSlug('Article 123')).toBe('article-123')
      expect(generateSlug('2023 Year Review')).toBe('2023-year-review')
    })
  })

  describe('isValidSlug', () => {
    it('should validate correct slugs', () => {
      expect(isValidSlug('hello-world')).toBe(true)
      expect(isValidSlug('article-123')).toBe(true)
      expect(isValidSlug('single')).toBe(true)
      expect(isValidSlug('multi-word-slug')).toBe(true)
    })

    it('should reject invalid slugs', () => {
      expect(isValidSlug('Hello World')).toBe(false) // uppercase and spaces
      expect(isValidSlug('hello_world')).toBe(false) // underscores
      expect(isValidSlug('hello--world')).toBe(false) // double hyphens
      expect(isValidSlug('-hello-world')).toBe(false) // leading hyphen
      expect(isValidSlug('hello-world-')).toBe(false) // trailing hyphen
      expect(isValidSlug('')).toBe(false) // empty string
      expect(isValidSlug('hello@world')).toBe(false) // special characters
    })

    it('should reject slugs that are too long', () => {
      const longSlug = 'a'.repeat(101)
      expect(isValidSlug(longSlug)).toBe(false)
    })
  })

  describe('sanitizeSlug', () => {
    it('should sanitize invalid slugs', () => {
      expect(sanitizeSlug('Hello World!')).toBe('hello-world')
      expect(sanitizeSlug('  Invalid_Slug  ')).toBe('invalid-slug')
      expect(sanitizeSlug('---bad---slug---')).toBe('bad-slug')
    })

    it('should return valid slugs unchanged', () => {
      expect(sanitizeSlug('valid-slug')).toBe('valid-slug')
      expect(sanitizeSlug('article-123')).toBe('article-123')
    })
  })
})