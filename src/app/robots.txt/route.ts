import { NextResponse } from 'next/server'
import { generateRobotsTxt } from '@/lib/utils/sitemap'

export async function GET() {
  const robotsTxt = generateRobotsTxt()
  
  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
    },
  })
}