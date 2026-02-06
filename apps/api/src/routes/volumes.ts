import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, asc, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, volumes } from '../db/schema'
import {
  createVolumeDtoSchema,
  updateVolumeDtoSchema,
} from '@mangafire/shared'
import { paginationParamsSchema } from '@mangafire/shared/validators'
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
} from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'
import { extractMangaSlug } from './chapter-helpers'

// Mounted at /api/manga/:slug/volumes
export const volumeRoutes = new Hono<{ Variables: { mangaId: number } }>()

// Middleware: resolve manga slug to mangaId
volumeRoutes.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  const slug = extractMangaSlug(url.pathname)

  if (!slug) {
    return errorResponse(c, 'Manga slug required', 'BAD_REQUEST', 400)
  }

  const result = await db
    .select({ id: manga.id })
    .from(manga)
    .where(eq(manga.slug, slug))

  if (result.length === 0) {
    return errorResponse(c, 'Manga not found', 'NOT_FOUND', 404)
  }

  c.set('mangaId', result[0].id)
  await next()
})

// GET / — list all volumes for a manga (paginated)
volumeRoutes.get(
  '/',
  zValidator('query', paginationParamsSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const params = c.req.valid('query')
    const { offset, limit } = getOffsetLimit(params)

    const items = await db
      .select()
      .from(volumes)
      .where(eq(volumes.mangaId, mangaId))
      .orderBy(asc(volumes.number))
      .limit(limit)
      .offset(offset)

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(volumes)
      .where(eq(volumes.mangaId, mangaId))

    const total = Number(countResult[0]?.count || 0)
    const meta = calculatePagination(total, params)

    return successResponse(c, items, meta)
  }
)

// POST / — create volume (auth required via index.ts middleware)
volumeRoutes.post(
  '/',
  zValidator('json', createVolumeDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const body = c.req.valid('json')

    try {
      const insertResult = await db
        .insert(volumes)
        .values({ ...body, mangaId })
        .returning()

      return createdResponse(c, insertResult[0])
    } catch (err: unknown) {
      // Handle unique constraint violation (duplicate volume number)
      if (
        err instanceof Error &&
        err.message.includes('volumes_manga_number_unique')
      ) {
        return errorResponse(
          c,
          'Volume with this number already exists',
          'CONFLICT',
          409
        )
      }
      throw err
    }
  }
)

// PATCH /:number — update volume (auth required)
volumeRoutes.patch(
  '/:number',
  zValidator('json', updateVolumeDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const number = Number(c.req.param('number'))

    if (isNaN(number)) {
      return errorResponse(c, 'Invalid volume number', 'BAD_REQUEST', 400)
    }

    const body = c.req.valid('json')

    const updateResult = await db
      .update(volumes)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(volumes.mangaId, mangaId), eq(volumes.number, number)))
      .returning()

    if (updateResult.length === 0) {
      return errorResponse(c, 'Volume not found', 'NOT_FOUND', 404)
    }

    return successResponse(c, updateResult[0])
  }
)

// DELETE /:number — delete volume (chapters.volumeId set to null via FK)
volumeRoutes.delete('/:number', async (c) => {
  const mangaId = c.get('mangaId')
  const number = Number(c.req.param('number'))

  if (isNaN(number)) {
    return errorResponse(c, 'Invalid volume number', 'BAD_REQUEST', 400)
  }

  const deleteResult = await db
    .delete(volumes)
    .where(and(eq(volumes.mangaId, mangaId), eq(volumes.number, number)))
    .returning()

  if (deleteResult.length === 0) {
    return errorResponse(c, 'Volume not found', 'NOT_FOUND', 404)
  }

  return noContentResponse(c)
})
