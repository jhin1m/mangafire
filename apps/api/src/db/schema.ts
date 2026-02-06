import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  index,
  unique,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums for manga properties
export const mangaStatusEnum = pgEnum('manga_status', [
  'ongoing',
  'completed',
  'hiatus',
  'cancelled',
])

export const mangaTypeEnum = pgEnum('manga_type', [
  'manga',
  'manhwa',
  'manhua',
  'one_shot',
  'doujinshi',
])

export const languageEnum = pgEnum('language', ['en', 'jp', 'ko', 'zh'])

// Genres table
export const genres = pgTable('genres', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Main manga table
export const manga = pgTable(
  'manga',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    alternativeTitles: text('alternative_titles').array(),
    description: text('description'),
    author: text('author'),
    artist: text('artist'),
    coverImage: text('cover_image'),
    status: mangaStatusEnum('status').notNull().default('ongoing'),
    type: mangaTypeEnum('type').notNull().default('manga'),
    language: languageEnum('language').notNull().default('en'),
    releaseYear: integer('release_year'),
    rating: real('rating').default(0),
    views: integer('views').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('manga_slug_idx').on(table.slug),
    statusIdx: index('manga_status_idx').on(table.status),
    typeIdx: index('manga_type_idx').on(table.type),
  })
)

// Junction table for many-to-many relationship between manga and genres
export const mangaGenres = pgTable(
  'manga_genres',
  {
    id: serial('id').primaryKey(),
    mangaId: integer('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    genreId: integer('genre_id')
      .notNull()
      .references(() => genres.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    mangaIdIdx: index('manga_genres_manga_id_idx').on(table.mangaId),
    genreIdIdx: index('manga_genres_genre_id_idx').on(table.genreId),
    // Ensure each manga-genre pair is unique
    uniquePair: unique('manga_genres_unique').on(table.mangaId, table.genreId),
  })
)

// Relations for Drizzle ORM query API
export const mangaRelations = relations(manga, ({ many }) => ({
  mangaGenres: many(mangaGenres),
}))

export const genreRelations = relations(genres, ({ many }) => ({
  mangaGenres: many(mangaGenres),
}))

export const mangaGenreRelations = relations(mangaGenres, ({ one }) => ({
  manga: one(manga, {
    fields: [mangaGenres.mangaId],
    references: [manga.id],
  }),
  genre: one(genres, {
    fields: [mangaGenres.genreId],
    references: [genres.id],
  }),
}))
