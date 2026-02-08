import { z } from 'zod'
import { MangaStatus, MangaType, Language } from '../types/manga'

export const chapterInfoSchema = z.object({
  info: z.string(),
  date: z.string(),
  lang: z.null(),
})

export const genreSchema = z.object({
  image: z.string(),
  type: z.string(),
  title: z.string(),
  chapters: z.array(chapterInfoSchema),
})

export const genreTrendingSchema = z.object({
  image: z.string(),
  title: z.string(),
  desc: z.string(),
  releasing: z.string(),
  chapterAndVolume: z.string(),
  genres: z.array(z.string()),
})

export const posterSchema = z.object({
  image: z.string(),
  title: z.string(),
  link: z.string().optional(),
})

// Manga CRUD validators
export const mangaStatusSchema = z.nativeEnum(MangaStatus)
export const mangaTypeSchema = z.nativeEnum(MangaType)
export const languageSchema = z.nativeEnum(Language)

export const createMangaDtoSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  alternativeTitles: z.array(z.string()).optional(),
  description: z.string().max(5000).optional(),
  author: z.string().max(200).optional(),
  artist: z.string().max(200).optional(),
  coverImage: z.string().url().optional(),
  status: mangaStatusSchema.default(MangaStatus.ONGOING),
  type: mangaTypeSchema.default(MangaType.MANGA),
  language: languageSchema.default(Language.EN),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  genreIds: z.array(z.number().int().positive()).optional(),
})

export const updateMangaDtoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  alternativeTitles: z.array(z.string()).optional(),
  description: z.string().max(5000).optional(),
  author: z.string().max(200).optional(),
  artist: z.string().max(200).optional(),
  coverImage: z.string().url().optional(),
  status: mangaStatusSchema.optional(),
  type: mangaTypeSchema.optional(),
  language: languageSchema.optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  genreIds: z.array(z.number().int().positive()).optional(),
})

export const mangaQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: mangaStatusSchema.optional(),
  type: mangaTypeSchema.optional(),
  genreId: z.coerce.number().int().positive().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['rating', 'views', 'createdAt', 'updatedAt', 'releaseYear', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  year: z.string().max(200).optional(),
  minChapters: z.coerce.number().int().positive().max(2000).optional(),
  // Comma-separated string → number array (filter out invalid values, limit size)
  excludeGenres: z.string().optional().transform((val) => {
    if (!val) return undefined
    const ids = val.split(',').map(Number).filter((n) => !isNaN(n) && n > 0)
    // Limit to 50 genres, deduplicate
    return Array.from(new Set(ids)).slice(0, 50)
  }),
})
