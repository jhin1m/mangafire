import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import { chapters, chapterPages } from '../db/schema'
import {
  createChapterDtoSchema,
  updateChapterDtoSchema,
  chapterQueryParamsSchema,
  replaceChapterPagesDtoSchema,
} from '@mangafire/shared'
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
} from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'
import {
  findMangaBySlug,
  fetchChapterList,
  fetchChapterPages,
  getChapterNavigation,
  extractMangaSlug,
} from './chapter-helpers'
import { z } from 'zod'
import { Language } from '@mangafire/shared/types'

// Mounted at /api/manga/:slug/chapters
export const chapterRoutes = new Hono<{ Variables: { mangaId: number } }>()

// Middleware: resolve manga slug to mangaId for all chapter routes
chapterRoutes.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  const slug = extractMangaSlug(url.pathname)

  if (!slug) {
    return errorResponse(c, 'Manga slug required', 'BAD_REQUEST', 400)
  }

  const mangaRecord = await findMangaBySlug(slug)
  if (!mangaRecord) {
    return errorResponse(c, 'Manga not found', 'NOT_FOUND', 404)
  }

  c.set('mangaId', mangaRecord.id)
  await next()
})

// GET / — list chapters (paginated, filterable by language)
chapterRoutes.get(
  '/',
  zValidator('query', chapterQueryParamsSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const params = c.req.valid('query')
    const { offset, limit } = getOffsetLimit(params)

    const { items, total } = await fetchChapterList(
      mangaId,
      params,
      offset,
      limit
    )
    const meta = calculatePagination(total, params)
    return successResponse(c, items, meta)
  }
)

// POST / — create chapter with pages (auth required via index.ts middleware)
chapterRoutes.post(
  '/',
  zValidator('json', createChapterDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const body = c.req.valid('json')
    const { pages, ...chapterData } = body

    try {
      // Insert chapter
      const insertResult = await db
        .insert(chapters)
        .values({
          ...chapterData,
          mangaId,
          pageCount: pages.length,
        })
        .returning()
      const newChapter = insertResult[0]

      // Insert pages
      if (pages.length > 0) {
        await db.insert(chapterPages).values(
          pages.map((page) => ({
            chapterId: newChapter.id,
            ...page,
          }))
        )
      }

      return createdResponse(c, newChapter)
    } catch (err: unknown) {
      // Handle unique constraint violation (duplicate chapter number+language)
      if (
        err instanceof Error &&
        err.message.includes('chapters_manga_number_lang_unique')
      ) {
        return errorResponse(
          c,
          'Chapter with this number and language already exists',
          'CONFLICT',
          409
        )
      }
      throw err
    }
  }
)

// Query schema for optional language filter on single chapter
const singleChapterQuerySchema = z.object({
  language: z.nativeEnum(Language).optional(),
})

// GET /:number — get chapter with pages + navigation
chapterRoutes.get(
  '/:number',
  zValidator('query', singleChapterQuerySchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const number = c.req.param('number')
    const { language } = c.req.valid('query')

    // Build conditions: mangaId + number + optional language
    const conditions = [
      eq(chapters.mangaId, mangaId),
      eq(chapters.number, number),
    ]
    if (language) {
      conditions.push(eq(chapters.language, language))
    }

    const result = await db
      .select()
      .from(chapters)
      .where(and(...conditions))

    // Default to first result (or 'en' if multiple languages)
    if (result.length === 0) {
      return errorResponse(c, 'Chapter not found', 'NOT_FOUND', 404)
    }

    const chapter = result[0]
    const pages = await fetchChapterPages(chapter.id)
    const navigation = await getChapterNavigation(
      mangaId,
      chapter.number,
      chapter.language
    )

    return successResponse(c, {
      ...chapter,
      pages,
      navigation,
    })
  }
)

// PATCH /:number — update chapter metadata (auth required)
chapterRoutes.patch(
  '/:number',
  zValidator('json', updateChapterDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const number = c.req.param('number')
    const body = c.req.valid('json')

    const updateResult = await db
      .update(chapters)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.number, number)))
      .returning()

    if (updateResult.length === 0) {
      return errorResponse(c, 'Chapter not found', 'NOT_FOUND', 404)
    }

    return successResponse(c, updateResult[0])
  }
)

// DELETE /:number — delete chapter (pages cascade via FK)
chapterRoutes.delete('/:number', async (c) => {
  const mangaId = c.get('mangaId')
  const number = c.req.param('number')

  const deleteResult = await db
    .delete(chapters)
    .where(and(eq(chapters.mangaId, mangaId), eq(chapters.number, number)))
    .returning()

  if (deleteResult.length === 0) {
    return errorResponse(c, 'Chapter not found', 'NOT_FOUND', 404)
  }

  return noContentResponse(c)
})

// PUT /:number/pages — replace all pages for a chapter (auth required)
chapterRoutes.put(
  '/:number/pages',
  zValidator('json', replaceChapterPagesDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const number = c.req.param('number')
    const { pages } = c.req.valid('json')

    // Find the chapter first
    const chapterResult = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(and(eq(chapters.mangaId, mangaId), eq(chapters.number, number)))

    if (chapterResult.length === 0) {
      return errorResponse(c, 'Chapter not found', 'NOT_FOUND', 404)
    }

    const chapterId = chapterResult[0].id

    // Atomic: delete old pages, insert new, update count
    await db.transaction(async (tx) => {
      await tx
        .delete(chapterPages)
        .where(eq(chapterPages.chapterId, chapterId))

      await tx.insert(chapterPages).values(
        pages.map((page) => ({
          chapterId,
          ...page,
        }))
      )

      await tx
        .update(chapters)
        .set({ pageCount: pages.length, updatedAt: new Date() })
        .where(eq(chapters.id, chapterId))
    })

    return successResponse(c, { chapterId, pageCount: pages.length })
  }
)
