import { NextResponse } from 'next/server'
import { generateSitemap } from '@/lib/utils/sitemap'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    // Try to read existing sitemap
    const sitemapPath = join(process.cwd(), 'public', 'sitemap.xml')
    
    try {
      const sitemap = await readFile(sitemapPath, 'utf-8')
      return new NextResponse(sitemap, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
        },
      })
    } catch {
      // If sitemap doesn't exist, generate it
      await generateSitemap()
      const sitemap = await readFile(sitemapPath, 'utf-8')
      
      return new NextResponse(sitemap, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      })
    }
  } catch (error) {
    console.error('Error serving sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}