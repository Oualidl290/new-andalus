const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

/**
 * Bundle analyzer configuration for Next.js
 * Usage: ANALYZE=true npm run build
 */
function withBundleAnalyzer(nextConfig = {}) {
  return {
    ...nextConfig,
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
      // Add bundle analyzer in production builds when ANALYZE=true
      if (process.env.ANALYZE === 'true' && !dev && !isServer) {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: '../analyze/client.html',
            openAnalyzer: false,
            generateStatsFile: true,
            statsFilename: '../analyze/client-stats.json',
          })
        )
      }

      // Server bundle analysis
      if (process.env.ANALYZE === 'true' && !dev && isServer) {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: '../analyze/server.html',
            openAnalyzer: false,
            generateStatsFile: true,
            statsFilename: '../analyze/server-stats.json',
          })
        )
      }

      // Optimize chunks
      if (!dev) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            ...config.optimization.splitChunks,
            cacheGroups: {
              ...config.optimization.splitChunks.cacheGroups,
              // Vendor chunk for third-party libraries
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
              },
              // Common chunk for shared code
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 5,
                reuseExistingChunk: true,
              },
              // Admin chunk for admin-specific code
              admin: {
                test: /[\\/]src[\\/](app[\\/]admin|components[\\/]admin)[\\/]/,
                name: 'admin',
                chunks: 'all',
                priority: 15,
                reuseExistingChunk: true,
              },
              // Editor chunk for rich text editor
              editor: {
                test: /[\\/]node_modules[\\/]@tiptap[\\/]/,
                name: 'editor',
                chunks: 'all',
                priority: 20,
                reuseExistingChunk: true,
              },
            },
          },
        }
      }

      // Call the original webpack function if it exists
      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, { buildId, dev, isServer, defaultLoaders, webpack })
      }

      return config
    },
  }
}

/**
 * Performance optimization recommendations based on bundle analysis
 */
function generateOptimizationRecommendations(stats) {
  const recommendations = []
  
  if (!stats || !stats.chunks) {
    return recommendations
  }

  // Check for large chunks
  const largeChunks = stats.chunks.filter(chunk => chunk.size > 500 * 1024) // > 500KB
  if (largeChunks.length > 0) {
    recommendations.push({
      type: 'large-chunks',
      message: `Found ${largeChunks.length} large chunks. Consider code splitting.`,
      chunks: largeChunks.map(chunk => ({ name: chunk.names[0], size: chunk.size })),
    })
  }

  // Check for duplicate modules
  const moduleMap = new Map()
  stats.modules?.forEach(module => {
    if (moduleMap.has(module.name)) {
      moduleMap.get(module.name).count++
    } else {
      moduleMap.set(module.name, { count: 1, size: module.size })
    }
  })

  const duplicates = Array.from(moduleMap.entries())
    .filter(([_, info]) => info.count > 1)
    .map(([name, info]) => ({ name, count: info.count, size: info.size }))

  if (duplicates.length > 0) {
    recommendations.push({
      type: 'duplicate-modules',
      message: `Found ${duplicates.length} duplicate modules. Consider optimizing imports.`,
      modules: duplicates,
    })
  }

  // Check for unused exports (requires additional tooling)
  recommendations.push({
    type: 'tree-shaking',
    message: 'Consider using tree-shaking to remove unused code.',
    suggestion: 'Use ES6 imports and ensure sideEffects: false in package.json',
  })

  return recommendations
}

/**
 * Bundle size limits for performance budgets
 */
const BUNDLE_SIZE_LIMITS = {
  // Main bundle should be under 250KB gzipped
  main: 250 * 1024,
  // Vendor bundle should be under 500KB gzipped
  vendor: 500 * 1024,
  // Admin bundle should be under 300KB gzipped
  admin: 300 * 1024,
  // Individual chunks should be under 100KB gzipped
  chunk: 100 * 1024,
}

/**
 * Check if bundle sizes are within performance budgets
 */
function checkBundleBudget(stats) {
  const violations = []
  
  if (!stats || !stats.chunks) {
    return { passed: true, violations: [] }
  }

  stats.chunks.forEach(chunk => {
    const chunkName = chunk.names[0] || 'unknown'
    let limit = BUNDLE_SIZE_LIMITS.chunk

    // Apply specific limits for known chunks
    if (chunkName.includes('main')) {
      limit = BUNDLE_SIZE_LIMITS.main
    } else if (chunkName.includes('vendor')) {
      limit = BUNDLE_SIZE_LIMITS.vendor
    } else if (chunkName.includes('admin')) {
      limit = BUNDLE_SIZE_LIMITS.admin
    }

    if (chunk.size > limit) {
      violations.push({
        chunk: chunkName,
        size: chunk.size,
        limit,
        overage: chunk.size - limit,
      })
    }
  })

  return {
    passed: violations.length === 0,
    violations,
  }
}

module.exports = {
  withBundleAnalyzer,
  generateOptimizationRecommendations,
  checkBundleBudget,
  BUNDLE_SIZE_LIMITS,
}