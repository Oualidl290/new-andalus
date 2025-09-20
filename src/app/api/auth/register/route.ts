import { NextRequest, NextResponse } from 'next/server'
import { createUserWithPassword } from '@/lib/auth/queries'
import { validatePassword } from '@/lib/auth/password'
import { getUserByEmail } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, password, role = 'editor' } = body

    // Validate required fields
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password validation failed', details: passwordValidation.errors },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create user
    const user = await createUserWithPassword({
      email,
      name,
      password,
      role: role as 'admin' | 'editor' | 'reader',
    })

    // Return user without password
    const { password: _password, ...userWithoutPassword } = user
    
    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: userWithoutPassword,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}