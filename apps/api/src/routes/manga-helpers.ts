import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, mangaGenres, genres } from '../db/schema'
import type { MangaQueryParams } from '@mangafire/shared/types'

/** Escape special ILIKE characters to prevent wildcard injection */
function escapeIlike(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_')
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
    title: manga.title,
  } as const

  const sortColumn = sortColumns[sortBy as keyof typeof sortColumns] || manga.createdAt

  const sortDirection = sortOrder === 'asc' ? asc : desc

  return { sortColumn, sortDirection }
}

/**
 * Fetches manga list with genreId filter (requires join).
 */
export async function fetchMangaWithGenreFilter(
  params: MangaQueryParams,
  conditions: ReturnType<typeof buildMangaConditions>,
  sortColumn: ReturnType<typeof getSortConfig>['sortColumn'],
  sortDirection: ReturnType<typeof getSortConfig>['sortDirection'],
  offset: number,
  limit: number
) {
  const items = await db
    .select({
      id: manga.id,
      title: manga.title,
      slug: manga.slug,
      alternativeTitles: manga.alternativeTitles,
      description: manga.description,
      author: manga.author,
      artist: manga.artist,
      coverImage: manga.coverImage,
      status: manga.status,
      type: manga.type,
      language: manga.language,
      releaseYear: manga.releaseYear,
      rating: manga.rating,
      views: manga.views,
      createdAt: manga.createdAt,
      updatedAt: manga.updatedAt,
    })
    .from(manga)
    .innerJoin(mangaGenres, eq(manga.id, mangaGenres.mangaId))
    .where(
      and(
        eq(mangaGenres.genreId, params.genreId!),
        conditions.length > 0 ? and(...conditions) : undefined
      )
    )
    .orderBy(sortDirection(sortColumn))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(manga)
    .innerJoin(mangaGenres, eq(manga.id, mangaGenres.mangaId))
    .where(
      and(
        eq(mangaGenres.genreId, params.genreId!),
        conditions.length > 0 ? and(...conditions) : undefined
      )
    )

  const total = Number(countResult[0]?.count || 0)

  return { items, total }
}

/**
 * Fetches manga list without genreId filter.
 */
export async function fetchMangaWithoutGenreFilter(
  conditions: ReturnType<typeof buildMangaConditions>,
  sortColumn: ReturnType<typeof getSortConfig>['sortColumn'],
  sortDirection: ReturnType<typeof getSortConfig>['sortDirection'],
  offset: number,
  limit: number
) {
  const items = await db
    .select()
    .from(manga)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sortDirection(sortColumn))
    .limit(limit)
    .offset(offset)

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(manga)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

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
