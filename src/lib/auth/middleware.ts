import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function authMiddleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const { pathname } = request.nextUrl

  // Allow access to auth pages and API routes
  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    if (token.role !== 'admin' && token.role !== 'editor') {
      return NextResponse.redirect(new URL('/auth/unauthorized', request.url))
    }
  }

  // Protect API routes that require authentication
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export function requireAuth(allowedRoles?: string[]) {
  return async (request: NextRequest) => {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (allowedRoles && !allowedRoles.includes(token.role as string)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return NextResponse.next()
  }
}