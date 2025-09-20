import type { NextConfig } from 'next'
import { withBundleAnalyzer } from './src/lib/optimization/bundle-analyzer.js'

const nextConfig: NextConfig = {
  // Security configurations
  poweredByHeader: false,
  generateEtags: false,
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 768, 1024, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
  },

  // Compression
  compress: true,

  // Headers for performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Tree shaking
      config.optimization.usedExports = true
      config.optimization.sideEffects = false

      // Bundle splitting
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
          admin: {
            test: /[\\/]src[\\/](app[\\/]admin|components[\\/]admin)[\\/]/,
            name: 'admin',
            chunks: 'all',
            priority: 15,
            reuseExistingChunk: true,
          },
          editor: {
            test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
            name: 'editor',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      }
    }

    return config
  },
}

// Apply bundle analyzer if ANALYZE=true
export default process.env.ANALYZE === 'true' 
  ? withBundleAnalyzer(nextConfig) 
  : nextConfig
