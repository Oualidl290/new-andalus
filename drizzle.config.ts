import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/new_andalus',
  },
  verbose: true,
  strict: true,
})