import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://mangafire:mangafire@localhost:5432/mangafire'

if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production')
}

const client = postgres(connectionString)
export const db = drizzle(client, { schema })
