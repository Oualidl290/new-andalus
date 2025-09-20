import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAllUsers, createUser, getUserByEmail } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { z } from 'zod'

// Validation schema for creating users
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'editor', 'reader']).default('editor'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    // Only admins can access user management
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/users',
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const role = searchParams.get('role') || 'all'
    const search = searchParams.get('search') || ''

    const result = await getAllUsers({
      page,
      limit,
      role: role === 'all' ? undefined : role as 'admin' | 'editor' | 'reader',
      search: search || undefined,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch users',
      },
      timestamp: new Date().toISOString(),
      path: '/api/admin/users',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    // Only admins can create users
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/users',
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Check if user already exists
    const existingUser = await getUserByEmail(validatedData.email)
    if (existingUser) {
      return NextResponse.json({
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/users',
      }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create user
    const user = await createUser({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: validatedData.role,
    })

    if (!user) {
      return NextResponse.json({
        error: {
          code: 'CREATION_FAILED',
          message: 'Failed to create user',
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/users',
      }, { status: 500 })
    }

    // Remove password from response
    const { password: _, ...userResponse } = user

    return NextResponse.json({
      success: true,
      data: { user: userResponse },
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues,
        },
        timestamp: new Date().toISOString(),
        path: '/api/admin/users',
      }, { status: 400 })
    }

    console.error('Error creating user:', error)
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create user',
      },
      timestamp: new Date().toISOString(),
      path: '/api/admin/users',
    }, { status: 500 })
  }
}