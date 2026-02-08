import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const connectionString =
  process.env.DATABASE_URL || 'postgresql://mangafire:mangafire@localhost:5432/mangafire'

async function runMigration() {
  const sql = postgres(connectionString)

  try {
    console.log('Running search FTS migration...')

    const migrationSQL = readFileSync(join(__dirname, 'add-search-fts.sql'), 'utf-8')

    await sql.unsafe(migrationSQL)

    console.log('✓ Migration completed successfully')
    console.log('  - pg_trgm extension enabled')
    console.log('  - search_vector column added to manga table')
    console.log('  - GIN indexes created for full-text search and autocomplete')
  } catch (error) {
    console.error('✗ Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration()
