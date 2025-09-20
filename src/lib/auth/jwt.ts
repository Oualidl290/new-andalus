import jwt from 'jsonwebtoken'
import type { User } from '@/lib/db'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development'
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  type: 'access' | 'refresh'
}

export function generateAccessToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'new-andalus',
    audience: 'new-andalus-users',
  })
}

export function generateRefreshToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'new-andalus',
    audience: 'new-andalus-users',
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'new-andalus',
      audience: 'new-andalus-users',
    }) as JWTPayload

    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Token decoding failed:', error)
    return null
  }
}