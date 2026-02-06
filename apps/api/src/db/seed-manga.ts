import { db } from './client'
import { manga, mangaGenres, genres, volumes, chapters, chapterPages } from './schema'

// Sample manga data for development testing
const mangaData = [
  {
    title: 'One Piece',
    slug: 'one-piece',
    alternativeTitles: ['ワンピース'],
    description: 'A boy named Monkey D. Luffy sets out on an adventure to find the legendary One Piece treasure and become the Pirate King.',
    author: 'Eiichiro Oda',
    artist: 'Eiichiro Oda',
    coverImage: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400',
    status: 'ongoing' as const,
    type: 'manga' as const,
    language: 'en' as const,
    releaseYear: 1997,
    rating: 4.8,
    views: 150000,
    genreSlugs: ['action', 'adventure', 'comedy', 'fantasy', 'shounen'],
  },
  {
    title: 'Naruto',
    slug: 'naruto',
    alternativeTitles: ['ナルト'],
    description: 'A young ninja named Naruto Uzumaki seeks recognition from his peers and dreams of becoming the Hokage.',
    author: 'Masashi Kishimoto',
    artist: 'Masashi Kishimoto',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
    status: 'completed' as const,
    type: 'manga' as const,
    language: 'en' as const,
    releaseYear: 1999,
    rating: 4.7,
    views: 200000,
    genreSlugs: ['action', 'adventure', 'comedy', 'fantasy', 'shounen'],
  },
  {
    title: 'Attack on Titan',
    slug: 'attack-on-titan',
    alternativeTitles: ['進撃の巨人', 'Shingeki no Kyojin'],
    description: 'Humanity lives inside cities surrounded by enormous walls due to the Titans, gigantic humanoid creatures.',
    author: 'Hajime Isayama',
    artist: 'Hajime Isayama',
    coverImage: 'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=400',
    status: 'completed' as const,
    type: 'manga' as const,
    language: 'en' as const,
    releaseYear: 2009,
    rating: 4.9,
    views: 180000,
    genreSlugs: ['action', 'drama', 'fantasy', 'horror', 'shounen'],
  },
  {
    title: 'Death Note',
    slug: 'death-note',
    alternativeTitles: ['デスノート'],
    description: 'A high school student discovers a supernatural notebook that allows him to kill anyone by writing their name.',
    author: 'Tsugumi Ohba',
    artist: 'Takeshi Obata',
    coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
    status: 'completed' as const,
    type: 'manga' as const,
    language: 'en' as const,
    releaseYear: 2003,
    rating: 4.8,
    views: 190000,
    genreSlugs: ['mystery', 'psychological', 'supernatural', 'thriller', 'shounen'],
  },
  {
    title: 'My Hero Academia',
    slug: 'my-hero-academia',
    alternativeTitles: ['僕のヒーローアカデミア', 'Boku no Hero Academia'],
    description: 'In a world where people with superpowers are the norm, a boy born without them dreams of becoming a hero.',
    author: 'Kohei Horikoshi',
    artist: 'Kohei Horikoshi',
    coverImage: 'https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?w=400',
    status: 'ongoing' as const,
    type: 'manga' as const,
    language: 'en' as const,
    releaseYear: 2014,
    rating: 4.7,
    views: 160000,
    genreSlugs: ['action', 'adventure', 'comedy', 'fantasy', 'shounen'],
  },
  {
    title: 'Solo Leveling',
    slug: 'solo-leveling',
    alternativeTitles: ['나 혼자만 레벨업', 'Only I Level Up'],
    description: 'In a world where hunters fight monsters from gates, the weakest hunter gains a unique power to level up.',
    author: 'Chugong',
    artist: 'DUBU (REDICE Studio)',
    coverImage: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400',
    status: 'completed' as const,
    type: 'manhwa' as const,
    language: 'en' as const,
    releaseYear: 2018,
    rating: 4.9,
    views: 220000,
    genreSlugs: ['action', 'adventure', 'fantasy', 'supernatural'],
  },
  {
    title: 'Tower of God',
    slug: 'tower-of-god',
    alternativeTitles: ['신의 탑', 'Kami no Tou'],
    description: 'A boy enters a mysterious tower to find his friend, facing challenges on each floor.',
    author: 'SIU',
    artist: 'SIU',
    coverImage: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=400',
    status: 'ongoing' as const,
    type: 'manhwa' as const,
    language: 'en' as const,
    releaseYear: 2010,
    rating: 4.6,
    views: 140000,
    genreSlugs: ['action', 'adventure', 'drama', 'fantasy', 'mystery'],
  },
  {
    title: 'The Beginning After The End',
    slug: 'the-beginning-after-the-end',
    alternativeTitles: ['TBATE'],
    description: 'A king is reborn in a world filled with magic and monsters, seeking to correct the mistakes of his past life.',
    author: 'TurtleMe',
    artist: 'Fuyuki23',
    coverImage: 'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=400',
    status: 'ongoing' as const,
    type: 'manhwa' as const,
    language: 'en' as const,
    releaseYear: 2018,
    rating: 4.8,
    views: 130000,
    genreSlugs: ['action', 'adventure', 'drama', 'fantasy', 'isekai'],
  },
  {
    title: 'Omniscient Reader',
    slug: 'omniscient-reader',
    alternativeTitles: ['전지적 독자 시점', "Omniscient Reader's Viewpoint"],
    description: 'The only person who read a web novel to the end finds himself living in its story when it becomes reality.',
    author: 'Sing Shong',
    artist: 'Sleepy-C',
    coverImage: 'https://images.unsplash.com/photo-1621293954908-907159247fc8?w=400',
    status: 'ongoing' as const,
    type: 'manhwa' as const,
    language: 'en' as const,
    releaseYear: 2020,
    rating: 4.9,
    views: 170000,
    genreSlugs: ['action', 'adventure', 'fantasy', 'supernatural'],
  },
  {
    title: 'Demon Slayer',
    slug: 'demon-slayer',
    alternativeTitles: ['鬼滅の刃', 'Kimetsu no Yaiba'],
    description: 'A young boy becomes a demon slayer after his family is slaughtered and his sister turned into a demon.',
    author: 'Koyoharu Gotouge',
    artist: 'Koyoharu Gotouge',
    coverImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
    status: 'completed' as const,
    type: 'manga' as const,
    language: 'en' as const,
    releaseYear: 2016,
    rating: 4.8,
    views: 210000,
    genreSlugs: ['action', 'adventure', 'fantasy', 'supernatural', 'shounen'],
  },
]

async function seedManga() {
  console.log('Seeding manga...')

  // First, fetch all genres to get IDs
  const allGenres = await db.select().from(genres)
  const genreMap = new Map(allGenres.map((g) => [g.slug, g.id]))

  let mangaInserted = 0
  let chaptersInserted = 0

  for (const mangaItem of mangaData) {
    const { genreSlugs, ...mangaFields } = mangaItem

    // Insert manga
    const [insertedManga] = await db
      .insert(manga)
      .values(mangaFields)
      .onConflictDoNothing({ target: manga.slug })
      .returning()

    if (!insertedManga) {
      console.log(`Skipped existing manga: ${mangaItem.title}`)
      continue
    }

    mangaInserted++
    console.log(`Inserted manga: ${insertedManga.title}`)

    // Link genres
    const genreIds = genreSlugs
      .map((slug) => genreMap.get(slug))
      .filter((id): id is number => id !== undefined)

    if (genreIds.length > 0) {
      await db
        .insert(mangaGenres)
        .values(genreIds.map((genreId) => ({ mangaId: insertedManga.id, genreId })))
        .onConflictDoNothing()
    }

    // Create volume 1
    const [volume1] = await db
      .insert(volumes)
      .values({ mangaId: insertedManga.id, number: 1, title: 'Volume 1' })
      .returning()

    // Create 5 chapters
    for (let i = 1; i <= 5; i++) {
      const chapterNumber = String(i)
      const [chapter] = await db
        .insert(chapters)
        .values({
          mangaId: insertedManga.id,
          volumeId: volume1.id,
          number: chapterNumber,
          title: `Chapter ${i}`,
          slug: `${mangaItem.slug}-chapter-${i}`,
          language: 'en',
          pageCount: 20,
        })
        .returning()

      chaptersInserted++

      // Create 20 pages for each chapter
      const pages = Array.from({ length: 20 }, (_, pageIdx) => ({
        chapterId: chapter.id,
        pageNumber: pageIdx + 1,
        imageUrl: `https://images.unsplash.com/photo-${1600000000000 + Math.random() * 100000000 | 0}?w=800&h=1200`,
        width: 800,
        height: 1200,
      }))

      await db.insert(chapterPages).values(pages)
    }
  }

  console.log(`✅ Seeded ${mangaInserted} manga with ${chaptersInserted} chapters`)
  process.exit(0)
}

seedManga().catch((err) => {
  console.error('Manga seed failed:', err)
  process.exit(1)
})
