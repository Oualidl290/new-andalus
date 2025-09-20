import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'images')

// POST /api/upload/image - Upload image file
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if user has permission to upload images
    if (session.user.role !== 'admin' && session.user.role !== 'editor') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No image file provided' } },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' 
          } 
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'File size too large. Maximum size is 5MB.' 
          } 
        },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`
    const filepath = join(UPLOAD_DIR, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return the public URL
    const publicUrl = `/uploads/images/${filename}`

    return NextResponse.json({
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Image upload failed:', error)
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to upload image',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    )
  }
}

// GET /api/upload/image - Get upload info (for testing)
export async function GET() {
  return NextResponse.json({
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
    uploadPath: '/api/upload/image',
  })
}