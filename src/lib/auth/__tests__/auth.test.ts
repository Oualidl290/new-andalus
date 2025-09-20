import { describe, it, expect, beforeAll } from 'vitest'
import { hashPassword, verifyPassword, validatePassword } from '../password'
import { createUserWithPassword, authenticateUser } from '../queries'
import { checkDatabaseConnection } from '../../db'

describe('Authentication System', () => {
  beforeAll(async () => {
    // Ensure database connection is working
    const connection = await checkDatabaseConnection()
    if (!connection.success) {
      throw new Error(`Database connection failed: ${connection.message}`)
    }
  })

  describe('Password utilities', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'TestPassword123!'
      const hashedPassword = await hashPassword(password)
      
      expect(hashedPassword).toBeTruthy()
      expect(hashedPassword).not.toBe(password)
      
      const isValid = await verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)
      
      const isInvalid = await verifyPassword('wrongpassword', hashedPassword)
      expect(isInvalid).toBe(false)
    })

    it('should validate password requirements', () => {
      const validPassword = 'ValidPass123!'
      const validation = validatePassword(validPassword)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)

      const invalidPassword = 'weak'
      const invalidValidation = validatePassword(invalidPassword)
      expect(invalidValidation.isValid).toBe(false)
      expect(invalidValidation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('User authentication', () => {
    it('should create user with password and authenticate', async () => {
      const userData = {
        email: 'test-auth@example.com',
        name: 'Test Auth User',
        password: 'TestAuth123!',
        role: 'editor' as const,
      }

      // Create user
      const user = await createUserWithPassword(userData)
      expect(user.email).toBe(userData.email)
      expect(user.name).toBe(userData.name)
      expect(user.role).toBe(userData.role)
      expect(user.password).toBeTruthy()
      expect(user.password).not.toBe(userData.password) // Should be hashed

      // Authenticate with correct credentials
      const authenticatedUser = await authenticateUser({
        email: userData.email,
        password: userData.password,
      })
      expect(authenticatedUser).toBeTruthy()
      expect(authenticatedUser?.id).toBe(user.id)

      // Fail authentication with wrong password
      const failedAuth = await authenticateUser({
        email: userData.email,
        password: 'wrongpassword',
      })
      expect(failedAuth).toBeNull()

      // Fail authentication with wrong email
      const failedAuthEmail = await authenticateUser({
        email: 'wrong@email.com',
        password: userData.password,
      })
      expect(failedAuthEmail).toBeNull()
    })
  })
})