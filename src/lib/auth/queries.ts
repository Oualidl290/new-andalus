import { eq } from 'drizzle-orm'
import { db, users, type User, type NewUser } from '@/lib/db'
import { hashPassword, verifyPassword } from './password'

export interface CreateUserWithPasswordData {
  email: string
  name: string
  password: string
  role?: 'admin' | 'editor' | 'reader'
}

export interface LoginCredentials {
  email: string
  password: string
}

export async function createUserWithPassword(userData: CreateUserWithPasswordData): Promise<User> {
  const hashedPassword = await hashPassword(userData.password)
  
  const [user] = await db
    .insert(users)
    .values({
      email: userData.email,
      name: userData.name,
      password: hashedPassword,
      role: userData.role || 'editor',
    })
    .returning()

  return user
}

export async function authenticateUser(credentials: LoginCredentials): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, credentials.email))

  if (!user) {
    return null
  }

  const isValidPassword = await verifyPassword(credentials.password, user.password)
  if (!isValidPassword) {
    return null
  }

  return user
}

export async function getUserForAuth(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))

  return user || null
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(newPassword)
    
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    return true
  } catch (error) {
    console.error('Error updating user password:', error)
    return false
  }
}

export async function verifyUserEmail(userId: string): Promise<boolean> {
  try {
    await db
      .update(users)
      .set({ 
        emailVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    return true
  } catch (error) {
    console.error('Error verifying user email:', error)
    return false
  }
}