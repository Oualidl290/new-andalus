import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getUserById, updateUser } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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

    const user = await getUserById(token.id as string)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return user without password
    const { password: _password, ...userWithoutPassword } = user
    
    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { name, avatarUrl } = body

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const updatedUser = await updateUser(token.id as string, {
      name: name.trim(),
      avatarUrl: avatarUrl || null,
    })

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    // Return user without password
    const { password: _password, ...userWithoutPassword } = updatedUser
    
    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}