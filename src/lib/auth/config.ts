import { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authenticateUser } from './queries'
import { validatePassword } from './password'

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'your@email.com'
        },
        password: { 
          label: 'Password', 
          type: 'password',
          placeholder: 'Your password'
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // Validate password format
        const passwordValidation = validatePassword(password)
        if (!passwordValidation.isValid) {
          return null
        }

        try {
          const user = await authenticateUser({ email, password })
          
          if (!user) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.avatarUrl,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}