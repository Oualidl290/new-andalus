import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { dbMonitor } from '@/lib/monitoring/database'

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(process.env.DATABASE_URL!, { 
  max: 1,
  prepare: false,
})

export const db = drizzle(client, { schema })

// Connection health check
export async function checkDatabaseConnection() {
  try {
    await client`SELECT 1`
    return { success: true, message: 'Database connection successful' }
  } catch (error) {
    return { 
      success: false, 
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  try {
    await client.end()
    return { success: true, message: 'Database connection closed' }
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to close database connection: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}