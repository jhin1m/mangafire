import { eq, and, ilike, sql, desc, asc, inArray, or, between, gte, notInArray, type SQL } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, mangaGenres, genres, chapters } from '../db/schema'
import type { MangaQueryParams } from '@mangafire/shared/types'

/** Escape special ILIKE characters to prevent wildcard injection */
function escapeIlike(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/** Parse year filter string into exact years and decades */
function parseYearFilter(yearParam: string): { exactYears: number[]; decades: number[] } {
  const exactYears: number[] = []
  const decades: number[] = []
  for (const val of yearParam.split(',')) {
    const trimmed = val.trim()
    if (!trimmed) continue
    if (trimmed.endsWith('s')) {
      const decade = parseInt(trimmed.slice(0, -1), 10)
      if (!isNaN(decade)) decades.push(decade)
    } else {
      const year = parseInt(trimmed, 10)
      if (!isNaN(year)) exactYears.push(year)
    }
  }
  return { exactYears, decades }
}

/**
 * Builds WHERE conditions for manga list query.
 */
export function buildMangaConditions(params: MangaQueryParams) {
  const conditions = []
  if (params.status) {
    conditions.push(eq(manga.status, params.status))
  }
  if (params.type) {
    conditions.push(eq(manga.type, params.type))
  }
  if (params.search) {
    const safeSearch = escapeIlike(params.search)
    conditions.push(ilike(manga.title, `%${safeSearch}%`))
  }
  if (params.year) {
    const { exactYears, decades } = parseYearFilter(params.year)
    const yearConditions = []
    if (exactYears.length > 0) {
      yearConditions.push(inArray(manga.releaseYear, exactYears))
    }
    for (const decade of decades) {
      yearConditions.push(between(manga.releaseYear, decade, decade + 9))
    }
    if (yearConditions.length > 0) {
      conditions.push(or(...yearConditions)!)
    }
  }
  if (params.minChapters) {
    conditions.push(
      gte(
        sql<number>`(SELECT COUNT(*) FROM chapters WHERE chapters.manga_id = ${manga.id})`,
        params.minChapters
      )
    )
  }
  return conditions
}

/**
 * Builds genre-based conditions (include and exclude subqueries).
 */
export function buildGenreConditions(params: MangaQueryParams) {
  const conditions = []

  // Single genre include (backward compat)
  if (params.genreId) {
    const includeSubquery = db
      .select({ mangaId: mangaGenres.mangaId })
      .from(mangaGenres)
      .where(eq(mangaGenres.genreId, params.genreId))
    conditions.push(inArray(manga.id, includeSubquery))
  }

  // Multi-genre exclude
  if (params.excludeGenres?.length) {
    const excludeSubquery = db
      .selectDistinct({ mangaId: mangaGenres.mangaId })
      .from(mangaGenres)
      .where(inArray(mangaGenres.genreId, params.excludeGenres))
    conditions.push(notInArray(manga.id, excludeSubquery))
  }

  return conditions
}

/**
 * Returns the Drizzle column and direction function for sorting.
 */
export function getSortConfig(sortBy: string, sortOrder: string) {
  const sortColumns = {
    rating: manga.rating,
    views: manga.views,
    createdAt: manga.createdAt,
    updatedAt: manga.updatedAt,
    releaseYear: manga.releaseYear,
    title: manga.title,
  } as const

  const sortColumn = sortColumns[sortBy as keyof typeof sortColumns] || manga.createdAt

  const sortDirection = sortOrder === 'asc' ? asc : desc

  return { sortColumn, sortDirection }
}

/**
 * Fetches manga list with all conditions applied.
 * Replaces fetchMangaWithGenreFilter and fetchMangaWithoutGenreFilter.
 */
export async function fetchMangaList(
  conditions: SQL[],
  sortColumn: ReturnType<typeof getSortConfig>['sortColumn'],
  sortDirection: ReturnType<typeof getSortConfig>['sortDirection'],
  offset: number,
  limit: number
) {
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const items = await db
    .select()
    .from(manga)
    .where(whereClause)
    .orderBy(sortDirection(sortColumn))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(manga)
    .where(whereClause)

  const total = Number(countResult[0]?.count || 0)

  return { items, total }
}

/**
 * Fetches genres associated with a manga.
 */
export async function fetchMangaGenres(mangaId: number) {
  return await db
    .select({
      id: genres.id,
      name: genres.name,
      slug: genres.slug,
    })
    .from(mangaGenres)
    .innerJoin(genres, eq(mangaGenres.genreId, genres.id))
    .where(eq(mangaGenres.mangaId, mangaId))
}

/**
 * Updates manga genre associations.
 */
export async function updateMangaGenreAssociations(
  mangaId: number,
  genreIds: number[]
) {
  // Delete old associations
  await db.delete(mangaGenres).where(eq(mangaGenres.mangaId, mangaId))

  // Insert new associations
  if (genreIds.length > 0) {
    await db.insert(mangaGenres).values(
      genreIds.map((genreId) => ({
        mangaId,
        genreId,
      }))
    )
  }
}

/**
 * Batch-fetches genres and latest 3 chapters for a list of manga IDs.
 * Returns enriched manga array with `genres` and `latestChapters` attached.
 */
export async function enrichMangaList<T extends { id: number }>(items: T[]) {
  if (items.length === 0) return []

  const mangaIds = items.map((m) => m.id)

  // Batch fetch genres for all manga
  const genreRows = await db
    .select({
      mangaId: mangaGenres.mangaId,
      id: genres.id,
      name: genres.name,
      slug: genres.slug,
    })
    .from(mangaGenres)
    .innerJoin(genres, eq(mangaGenres.genreId, genres.id))
    .where(inArray(mangaGenres.mangaId, mangaIds))

  // Group genres by mangaId
  const genresByMangaId: Record<
    number,
    { id: number; name: string; slug: string }[]
  > = {}
  for (const row of genreRows) {
    if (!genresByMangaId[row.mangaId]) genresByMangaId[row.mangaId] = []
    genresByMangaId[row.mangaId].push({
      id: row.id,
      name: row.name,
      slug: row.slug,
    })
  }

  // Batch fetch latest 3 chapters per manga, ordered by createdAt desc
  const chapterRows = await db
    .select({
      mangaId: chapters.mangaId,
      number: chapters.number,
      title: chapters.title,
      language: chapters.language,
      createdAt: chapters.createdAt,
    })
    .from(chapters)
    .where(inArray(chapters.mangaId, mangaIds))
    .orderBy(desc(chapters.createdAt))

  // Group chapters by mangaId, keep only first 3 per manga
  const chaptersByMangaId: Record<
    number,
    { number: string; title: string | null; language: string; createdAt: Date }[]
  > = {}
  for (const row of chapterRows) {
    if (!chaptersByMangaId[row.mangaId]) chaptersByMangaId[row.mangaId] = []
    if (chaptersByMangaId[row.mangaId].length < 3) {
      chaptersByMangaId[row.mangaId].push({
        number: row.number,
        title: row.title,
        language: row.language,
        createdAt: row.createdAt,
      })
    }
  }

  // Merge enrichment data into each manga item
  return items.map((item) => ({
    ...item,
    genres: genresByMangaId[item.id] || [],
    latestChapters: chaptersByMangaId[item.id] || [],
  }))
}
