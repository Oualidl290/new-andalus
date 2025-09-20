import { writeFile } from 'fs/promises'
import { join } from 'path'
import { getPublishedArticles } from '@/lib/db'

interface SitemapEntry {
  url: string
  lastModified: Date
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

/**
 * Generate XML sitemap for the website
 */
export async function generateSitemap(): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const entries: SitemapEntry[] = []

    // Add static pages
    entries.push({
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    })

    entries.push({
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    })

    // Add published articles
    let page = 1
    let hasMore = true

    while (hasMore) {
      const result = await getPublishedArticles(page, 50) // Get 50 articles per batch
      
      for (const article of result.articles) {
        entries.push({
          url: `${baseUrl}/articles/${article.slug}`,
          lastModified: article.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }

      hasMore = result.hasNext
      page++
    }

    // Generate XML
    const xml = generateSitemapXML(entries)

    // Write to public directory
    const sitemapPath = join(process.cwd(), 'public', 'sitemap.xml')
    await writeFile(sitemapPath, xml, 'utf-8')

    console.log(`✅ Sitemap generated with ${entries.length} entries`)
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error)
  }
}

/**
 * Generate XML content for sitemap
 */
function generateSitemapXML(entries: SitemapEntry[]): string {
  const xmlEntries = entries
    .map(entry => `
  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin areas (when implemented)
Disallow: /admin/
Disallow: /api/`
}

/**
 * Update sitemap automatically when articles are published
 */
export async function updateSitemapOnPublish(): Promise<void> {
  // This function can be called from API routes when articles are published
  await generateSitemap()
}