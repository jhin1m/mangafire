import { z } from 'zod'
import { Language } from '../types/manga'

// Chapter number: string matching "10" or "10.5" pattern
const chapterNumberSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be a number or decimal (e.g., "10" or "10.5")')

const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(
    /^[a-z0-9-]+$/,
    'Slug must contain only lowercase letters, numbers, and hyphens'
  )

const chapterLanguageSchema = z.nativeEnum(Language)

// Page DTO validator
export const createChapterPageDtoSchema = z.object({
  pageNumber: z.number().int().nonnegative(),
  imageUrl: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

// Chapter create — pages required (min 1)
export const createChapterDtoSchema = z.object({
  number: chapterNumberSchema,
  title: z.string().max(500).optional(),
  slug: slugSchema,
  volumeId: z.number().int().positive().optional(),
  language: chapterLanguageSchema.default(Language.EN),
  pages: z
    .array(createChapterPageDtoSchema)
    .min(1, 'At least one page required')
    .refine(
      (pages) => {
        const numbers = pages.map((p) => p.pageNumber)
        const sorted = [...numbers].sort((a, b) => a - b)
        return sorted.every((n, i) => n === i)
      },
      'Page numbers must be sequential starting from 0'
    ),
})

// Chapter update — pages managed separately
export const updateChapterDtoSchema = z.object({
  title: z.string().max(500).optional(),
  slug: slugSchema.optional(),
  volumeId: z.number().int().positive().nullable().optional(),
  language: chapterLanguageSchema.optional(),
})

// Chapter list query params
export const chapterQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(20),
  language: chapterLanguageSchema.optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Volume create
export const createVolumeDtoSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
})

// Volume update
export const updateVolumeDtoSchema = z.object({
  number: z.number().int().positive().optional(),
  title: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
})

// Replace all pages for a chapter
export const replaceChapterPagesDtoSchema = z.object({
  pages: z
    .array(createChapterPageDtoSchema)
    .min(1, 'At least one page required')
    .refine(
      (pages) => {
        const numbers = pages.map((p) => p.pageNumber)
        const sorted = [...numbers].sort((a, b) => a - b)
        return sorted.every((n, i) => n === i)
      },
      'Page numbers must be sequential starting from 0'
    ),
})
