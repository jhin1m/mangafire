import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL || 'postgresql://mangafire:mangafire@localhost:5432/mangafire'

const client = postgres(connectionString)
export const db = drizzle(client, { schema })
