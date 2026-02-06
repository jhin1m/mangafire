import { eq, and, asc, desc, gt, lt, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, chapters, chapterPages } from '../db/schema'
import type { ChapterQueryParams } from '@mangafire/shared/types'

/**
 * Resolves manga slug to manga record. Returns null if not found.
 */
export async function findMangaBySlug(slug: string) {
  const result = await db
    .select({ id: manga.id, slug: manga.slug })
    .from(manga)
    .where(eq(manga.slug, slug))
  return result[0] ?? null
}

/**
 * Builds WHERE conditions for chapter list query.
 */
export function buildChapterConditions(
  mangaId: number,
  params: ChapterQueryParams
) {
  const conditions = [eq(chapters.mangaId, mangaId)]
  if (params.language) {
    conditions.push(eq(chapters.language, params.language))
  }
  return conditions
}

/**
 * Fetches paginated chapter list for a manga.
 * Uses ::numeric cast for correct numeric ordering of chapter numbers.
 */
export async function fetchChapterList(
  mangaId: number,
  params: ChapterQueryParams,
  offset: number,
  limit: number
) {
  const conditions = buildChapterConditions(mangaId, params)

  // ::numeric cast ensures "2" < "10" (not text comparison where "10" < "2")
  const numericOrder =
    params.sortOrder === 'desc'
      ? desc(sql`${chapters.number}::numeric`)
      : asc(sql`${chapters.number}::numeric`)

  const items = await db
    .select()
    .from(chapters)
    .where(and(...conditions))
    .orderBy(numericOrder)
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(chapters)
    .where(and(...conditions))

  const total = Number(countResult[0]?.count || 0)
  return { items, total }
}

/**
 * Fetches pages for a chapter, ordered by page number.
 */
export async function fetchChapterPages(chapterId: number) {
  return db
    .select()
    .from(chapterPages)
    .where(eq(chapterPages.chapterId, chapterId))
    .orderBy(asc(chapterPages.pageNumber))
}

/**
 * Computes prev/next chapter navigation using ::numeric cast.
 */
export async function getChapterNavigation(
  mangaId: number,
  currentNumber: string,
  language: string
) {
  // Previous: largest number less than current
  const prev = await db
    .select({ number: chapters.number, slug: chapters.slug })
    .from(chapters)
    .where(
      and(
        eq(chapters.mangaId, mangaId),
        eq(chapters.language, language as never),
        lt(sql`${chapters.number}::numeric`, sql`${currentNumber}::numeric`)
      )
    )
    .orderBy(desc(sql`${chapters.number}::numeric`))
    .limit(1)

  // Next: smallest number greater than current
  const next = await db
    .select({ number: chapters.number, slug: chapters.slug })
    .from(chapters)
    .where(
      and(
        eq(chapters.mangaId, mangaId),
        eq(chapters.language, language as never),
        gt(sql`${chapters.number}::numeric`, sql`${currentNumber}::numeric`)
      )
    )
    .orderBy(asc(sql`${chapters.number}::numeric`))
    .limit(1)

  return {
    prev: prev[0] ?? null,
    next: next[0] ?? null,
  }
}

/**
 * Extracts manga slug from the URL path.
 * Path pattern: /api/manga/{slug}/chapters/...
 */
export function extractMangaSlug(pathname: string): string | null {
  const match = pathname.match(/\/api\/manga\/([^/]+)\//)
  return match?.[1] ?? null
}
