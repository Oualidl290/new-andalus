import { NextRequest, NextResponse } from 'next/server'

export interface ImageOptimizationConfig {
  quality: number
  format: 'webp' | 'avif' | 'jpeg' | 'png'
  sizes: number[]
  enableLazyLoading: boolean
  enableBlurPlaceholder: boolean
}

export const defaultImageConfig: ImageOptimizationConfig = {
  quality: 80,
  format: 'webp',
  sizes: [640, 768, 1024, 1280, 1920],
  enableLazyLoading: true,
  enableBlurPlaceholder: true,
}

// Generate responsive image srcset
export function generateSrcSet(
  baseUrl: string,
  sizes: number[],
  format: string = 'webp'
): string {
  return sizes
    .map(size => `${baseUrl}?w=${size}&f=${format} ${size}w`)
    .join(', ')
}

// Generate blur placeholder data URL
export function generateBlurPlaceholder(
  width: number = 10,
  height: number = 10
): string {
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null
  if (!canvas) {
    // Fallback for server-side
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjRjNGNEY2Ii8+Cjwvc3ZnPgo='
  }

  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Create a simple gradient placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#e5e7eb')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

// Optimize image component props
export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  sizes?: string
  fill?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

export function getOptimizedImageProps(
  src: string,
  alt: string,
  options: Partial<OptimizedImageProps> = {}
): OptimizedImageProps {
  const config = { ...defaultImageConfig, ...options }
  
  return {
    src,
    alt,
    width: options.width,
    height: options.height,
    className: options.className,
    priority: options.priority || false,
    quality: config.quality,
    sizes: options.sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    fill: options.fill,
    placeholder: config.enableBlurPlaceholder ? 'blur' : 'empty',
    blurDataURL: config.enableBlurPlaceholder 
      ? options.blurDataURL || generateBlurPlaceholder()
      : undefined,
  }
}

// Image performance monitoring
export interface ImageLoadMetrics {
  src: string
  loadTime: number
  size: number
  format: string
  dimensions: { width: number; height: number }
  timestamp: number
}

export class ImagePerformanceMonitor {
  private static metrics: ImageLoadMetrics[] = []

  static trackImageLoad(
    src: string,
    loadTime: number,
    size: number,
    format: string,
    dimensions: { width: number; height: number }
  ) {
    const metric: ImageLoadMetrics = {
      src,
      loadTime,
      size,
      format,
      dimensions,
      timestamp: Date.now(),
    }

    this.metrics.push(metric)

    // Log slow image loads
    if (loadTime > 2000) {
      console.warn(`Slow image load detected: ${src} (${loadTime}ms)`)
    }

    // Log large images
    if (size > 1024 * 1024) { // > 1MB
      console.warn(`Large image detected: ${src} (${(size / 1024 / 1024).toFixed(2)}MB)`)
    }

    // Keep only recent metrics
    if (this.metrics.length > 100) {
      this.metrics.splice(0, this.metrics.length - 100)
    }

    // Send to monitoring endpoint
    if (typeof window !== 'undefined') {
      fetch('/api/monitoring/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
        keepalive: true,
      }).catch(console.error)
    }
  }

  static getMetrics(): ImageLoadMetrics[] {
    return [...this.metrics]
  }

  static getStats() {
    if (this.metrics.length === 0) {
      return {
        totalImages: 0,
        avgLoadTime: 0,
        avgSize: 0,
        slowImages: 0,
        largeImages: 0,
      }
    }

    const loadTimes = this.metrics.map(m => m.loadTime)
    const sizes = this.metrics.map(m => m.size)
    const slowImages = this.metrics.filter(m => m.loadTime > 2000)
    const largeImages = this.metrics.filter(m => m.size > 1024 * 1024)

    return {
      totalImages: this.metrics.length,
      avgLoadTime: loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length,
      avgSize: sizes.reduce((sum, s) => sum + s, 0) / sizes.length,
      slowImages: slowImages.length,
      largeImages: largeImages.length,
    }
  }

  static clearMetrics() {
    this.metrics.length = 0
  }
}

// Hook for monitoring image performance
export function useImagePerformanceMonitor() {
  const trackImageLoad = (img: HTMLImageElement) => {
    const startTime = performance.now()
    
    const handleLoad = () => {
      const loadTime = performance.now() - startTime
      
      // Get image size (approximate)
      const size = img.naturalWidth * img.naturalHeight * 3 // Rough estimate
      
      ImagePerformanceMonitor.trackImageLoad(
        img.src,
        loadTime,
        size,
        img.src.split('.').pop() || 'unknown',
        { width: img.naturalWidth, height: img.naturalHeight }
      )
    }

    if (img.complete) {
      handleLoad()
    } else {
      img.addEventListener('load', handleLoad, { once: true })
    }
  }

  return { trackImageLoad }
}

// Static asset optimization headers
export function getStaticAssetHeaders(request: NextRequest): Headers {
  const headers = new Headers()
  
  // Cache control for static assets
  const url = new URL(request.url)
  const pathname = url.pathname
  
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
    // Images - cache for 1 year
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
    // JS/CSS/Fonts - cache for 1 year
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (pathname.match(/\.(pdf|doc|docx|zip)$/)) {
    // Documents - cache for 1 week
    headers.set('Cache-Control', 'public, max-age=604800')
  }
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff')
  
  // Compression
  if (pathname.match(/\.(js|css|html|json|xml|txt)$/)) {
    headers.set('Content-Encoding', 'gzip')
  }
  
  return headers
}