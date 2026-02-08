import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, mangaGenres } from '../db/schema'
import {
  createMangaDtoSchema,
  updateMangaDtoSchema,
  mangaQueryParamsSchema,
} from '@mangafire/shared'
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
} from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'
import {
  buildMangaConditions,
  buildGenreConditions,
  getSortConfig,
  fetchMangaList,
  fetchMangaGenres,
  updateMangaGenreAssociations,
  enrichMangaList,
} from './manga-helpers'

export const mangaRoutes = new Hono()

// GET / - List manga (paginated + filtered)
mangaRoutes.get('/', zValidator('query', mangaQueryParamsSchema), async (c) => {
  const params = c.req.valid('query')
  const { offset, limit } = getOffsetLimit(params)
  const conditions = [
    ...buildMangaConditions(params),
    ...buildGenreConditions(params),
  ]
  const { sortColumn, sortDirection } = getSortConfig(params.sortBy, params.sortOrder)
  const { items, total } = await fetchMangaList(conditions, sortColumn, sortDirection, offset, limit)
  const enriched = await enrichMangaList(items)
  const meta = calculatePagination(total, params)
  return successResponse(c, enriched, meta)
})

// GET /:slug - Get single manga by slug
mangaRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug')

  const result = await db.select().from(manga).where(eq(manga.slug, slug))

  if (result.length === 0) {
    return errorResponse(c, 'Manga not found', 'NOT_FOUND', 404)
  }

  // Fetch associated genres
  const mangaGenreResults = await fetchMangaGenres(result[0].id)

  const mangaWithGenres = {
    ...result[0],
    genres: mangaGenreResults,
  }

  return successResponse(c, mangaWithGenres)
})

// POST / - Create manga
mangaRoutes.post('/', zValidator('json', createMangaDtoSchema), async (c) => {
  const body = c.req.valid('json')
  const { genreIds, ...mangaData } = body

  // Insert manga
  const insertResult = await db.insert(manga).values(mangaData).returning()
  const newManga = insertResult[0]

  // Insert manga_genres if genreIds provided
  if (genreIds && genreIds.length > 0) {
    await db.insert(mangaGenres).values(
      genreIds.map((genreId) => ({
        mangaId: newManga.id,
        genreId,
      }))
    )
  }

  return createdResponse(c, newManga)
})

// PATCH /:slug - Update manga
mangaRoutes.patch(
  '/:slug',
  zValidator('json', updateMangaDtoSchema),
  async (c) => {
    const slug = c.req.param('slug')
    const body = c.req.valid('json')
    const { genreIds, ...updateData } = body

    // Check if manga exists
    const existingManga = await db
      .select()
      .from(manga)
      .where(eq(manga.slug, slug))

    if (existingManga.length === 0) {
      return errorResponse(c, 'Manga not found', 'NOT_FOUND', 404)
    }

    // Update manga fields + updatedAt
    const updateResult = await db
      .update(manga)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(manga.slug, slug))
      .returning()

    // If genreIds provided, update associations
    if (genreIds !== undefined) {
      await updateMangaGenreAssociations(existingManga[0].id, genreIds)
    }

    return successResponse(c, updateResult[0])
  }
)

// DELETE /:slug - Delete manga
mangaRoutes.delete('/:slug', async (c) => {
  const slug = c.req.param('slug')

  const deleteResult = await db
    .delete(manga)
    .where(eq(manga.slug, slug))
    .returning()

  if (deleteResult.length === 0) {
    return errorResponse(c, 'Manga not found', 'NOT_FOUND', 404)
  }

  return noContentResponse(c)
})
