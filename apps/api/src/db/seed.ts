import { db } from './client'
import { genres } from './schema'

// Common manga genres for seeding the database
const genreData = [
  { name: 'Action', slug: 'action', description: 'Fast-paced stories with fighting and adventure' },
  { name: 'Adventure', slug: 'adventure', description: 'Stories of exploration and journeys' },
  { name: 'Comedy', slug: 'comedy', description: 'Humorous stories designed to make you laugh' },
  { name: 'Drama', slug: 'drama', description: 'Emotional stories with intense character development' },
  { name: 'Fantasy', slug: 'fantasy', description: 'Stories set in magical or supernatural worlds' },
  { name: 'Horror', slug: 'horror', description: 'Dark stories meant to frighten and unsettle' },
  { name: 'Mystery', slug: 'mystery', description: 'Stories involving puzzles and crime solving' },
  { name: 'Romance', slug: 'romance', description: 'Stories centered on love and relationships' },
  { name: 'Sci-Fi', slug: 'sci-fi', description: 'Stories exploring science and technology' },
  { name: 'Slice of Life', slug: 'slice-of-life', description: 'Everyday life stories' },
  { name: 'Sports', slug: 'sports', description: 'Stories centered on athletic competition' },
  { name: 'Supernatural', slug: 'supernatural', description: 'Stories involving ghosts, demons, or otherworldly beings' },
  { name: 'Thriller', slug: 'thriller', description: 'Suspenseful stories with tension and excitement' },
  { name: 'Psychological', slug: 'psychological', description: 'Stories exploring the mind and human behavior' },
  { name: 'Mecha', slug: 'mecha', description: 'Stories featuring giant robots and mechanical suits' },
  { name: 'Isekai', slug: 'isekai', description: 'Stories about being transported to another world' },
  { name: 'Shounen', slug: 'shounen', description: 'Manga targeted at young male readers' },
  { name: 'Shoujo', slug: 'shoujo', description: 'Manga targeted at young female readers' },
  { name: 'Seinen', slug: 'seinen', description: 'Manga targeted at adult male readers' },
  { name: 'Josei', slug: 'josei', description: 'Manga targeted at adult female readers' },
]

async function seed() {
  console.log('Seeding genres...')

  // Use onConflictDoNothing to skip duplicates safely
  const result = await db
    .insert(genres)
    .values(genreData)
    .onConflictDoNothing({ target: genres.slug })
    .returning()

  console.log(`Seeded ${result.length} genres (skipped existing)`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
