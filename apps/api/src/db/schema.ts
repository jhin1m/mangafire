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
    // search_vector is a GENERATED ALWAYS column created by SQL migration
    // Not managed by Drizzle push — included here for query type support only
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
  volumes: many(volumes),
  chapters: many(chapters),
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

// ─── Authentication Tables ───────────────────────────────────────────

// Users table for authentication
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    username: text('username').notNull(),
    avatar: text('avatar'),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  })
)

// Refresh tokens stored as SHA-256 hashes for security
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  })
)

export const userRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
}))

export const refreshTokenRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}))

// ─── Volumes & Chapters ─────────────────────────────────────────────

// Volumes table — groups chapters into numbered volumes
export const volumes = pgTable(
  'volumes',
  {
    id: serial('id').primaryKey(),
    mangaId: integer('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    title: text('title'),
    coverImage: text('cover_image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    mangaIdIdx: index('volumes_manga_id_idx').on(table.mangaId),
    uniqueMangaVolume: unique('volumes_manga_number_unique').on(
      table.mangaId,
      table.number
    ),
  })
)

// Chapters table — number stored as text to support decimals ("10.5")
export const chapters = pgTable(
  'chapters',
  {
    id: serial('id').primaryKey(),
    mangaId: integer('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    volumeId: integer('volume_id').references(() => volumes.id, {
      onDelete: 'set null',
    }),
    number: text('number').notNull(),
    title: text('title'),
    slug: text('slug').notNull(),
    language: languageEnum('language').notNull().default('en'),
    pageCount: integer('page_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    mangaIdIdx: index('chapters_manga_id_idx').on(table.mangaId),
    slugIdx: index('chapters_slug_idx').on(table.slug),
    uniqueChapter: unique('chapters_manga_number_lang_unique').on(
      table.mangaId,
      table.number,
      table.language
    ),
  })
)

// Chapter pages — individual images within a chapter
export const chapterPages = pgTable(
  'chapter_pages',
  {
    id: serial('id').primaryKey(),
    chapterId: integer('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    imageUrl: text('image_url').notNull(),
    width: integer('width'),
    height: integer('height'),
  },
  (table) => ({
    chapterIdIdx: index('chapter_pages_chapter_id_idx').on(table.chapterId),
    uniquePage: unique('chapter_pages_chapter_page_unique').on(
      table.chapterId,
      table.pageNumber
    ),
  })
)

// ─── Volume & Chapter Relations ─────────────────────────────────────

export const volumeRelations = relations(volumes, ({ one, many }) => ({
  manga: one(manga, {
    fields: [volumes.mangaId],
    references: [manga.id],
  }),
  chapters: many(chapters),
}))

export const chapterRelations = relations(chapters, ({ one, many }) => ({
  manga: one(manga, {
    fields: [chapters.mangaId],
    references: [manga.id],
  }),
  volume: one(volumes, {
    fields: [chapters.volumeId],
    references: [volumes.id],
  }),
  pages: many(chapterPages),
}))

export const chapterPageRelations = relations(chapterPages, ({ one }) => ({
  chapter: one(chapters, {
    fields: [chapterPages.chapterId],
    references: [chapters.id],
  }),
}))
