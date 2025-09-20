import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateImageFile, generateImageMetadata, compressImage } from '../upload'

// Mock fetch for upload tests
global.fetch = vi.fn()

describe('Upload Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateImageFile', () => {
    it('should validate correct image files', () => {
      const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }) // 1MB

      const result = validateImageFile(validFile)
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject files that are too large', () => {
      const largeFile = new File([''], 'large.jpg', { type: 'image/jpeg' })
      Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 }) // 10MB

      const result = validateImageFile(largeFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('File size too large')
    })

    it('should reject invalid file types', () => {
      const invalidFile = new File([''], 'document.pdf', { type: 'application/pdf' })
      Object.defineProperty(invalidFile, 'size', { value: 1024 }) // 1KB

      const result = validateImageFile(invalidFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Invalid file type')
    })

    it('should accept all allowed image types', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      
      allowedTypes.forEach(type => {
        const file = new File([''], `test.${type.split('/')[1]}`, { type })
        Object.defineProperty(file, 'size', { value: 1024 })

        const result = validateImageFile(file)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('generateImageMetadata', () => {
    // Mock Image constructor
    const mockImage = {
      onload: null as any,
      onerror: null as any,
      naturalWidth: 800,
      naturalHeight: 600,
      src: '',
    }

    beforeEach(() => {
      global.Image = vi.fn(() => mockImage) as any
    })

    it('should generate metadata for valid image', async () => {
      const file = new File([''], 'test-image.jpg', { type: 'image/jpeg' })
      const url = 'http://example.com/image.jpg'

      const metadataPromise = generateImageMetadata(file, url)
      
      // Simulate image load
      setTimeout(() => {
        mockImage.onload()
      }, 0)

      const metadata = await metadataPromise

      expect(metadata).toEqual({
        url,
        alt: 'test-image',
        width: 800,
        height: 600,
      })
    })

    it('should handle image load errors gracefully', async () => {
      const file = new File([''], 'broken-image.jpg', { type: 'image/jpeg' })
      const url = 'http://example.com/broken.jpg'

      const metadataPromise = generateImageMetadata(file, url)
      
      // Simulate image error
      setTimeout(() => {
        mockImage.onerror()
      }, 0)

      const metadata = await metadataPromise

      expect(metadata).toEqual({
        url,
        alt: 'broken-image',
        width: 0,
        height: 0,
      })
    })
  })

  describe('compressImage', () => {
    // Mock canvas and context
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn(),
    }

    const mockImage = {
      onload: null as any,
      onerror: null as any,
      width: 1920,
      height: 1080,
      src: '',
    }

    beforeEach(() => {
      global.Image = vi.fn(() => mockImage) as any
      document.createElement = vi.fn((tagName) => {
        if (tagName === 'canvas') return mockCanvas as any
        return {} as any
      })
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    })

    it('should compress large images', async () => {
      const file = new File([''], 'large-image.jpg', { type: 'image/jpeg' })
      
      // Mock successful compression
      mockCanvas.toBlob.mockImplementation((callback) => {
        const blob = new Blob(['compressed'], { type: 'image/jpeg' })
        callback(blob)
      })

      const compressionPromise = compressImage(file, 1200, 800, 0.8)
      
      // Simulate image load
      setTimeout(() => {
        mockImage.onload()
      }, 0)

      const compressedFile = await compressionPromise

      expect(compressedFile).toBeInstanceOf(File)
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        0.8
      )
    })

    it('should return original file on compression failure', async () => {
      const file = new File([''], 'image.jpg', { type: 'image/jpeg' })
      
      const compressionPromise = compressImage(file)
      
      // Simulate image error
      setTimeout(() => {
        mockImage.onerror()
      }, 0)

      const result = await compressionPromise
      expect(result).toBe(file)
    })
  })
})