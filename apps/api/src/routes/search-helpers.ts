import { sql, eq, inArray, type SQL } from 'drizzle-orm'
import { manga, mangaGenres } from '../db/schema'
import { db } from '../db/client'

/** Escape special ILIKE characters */
function escapeIlike(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/** Sanitize search query — escape dangerous chars for ILIKE/SQL */
export function sanitizeSearchQuery(q: string): string {
  return escapeIlike(q.trim())
}

/**
 * Autocomplete query using trigram similarity + prefix match + FTS fallback.
 * - Trigram: matches title typos (similarity > 0.3)
 * - ILIKE prefix: matches title starts
 * - FTS: matches alternative_titles, author, artist, description via search_vector
 * Returns top 8 results with status + latest chapter info.
 */
export async function searchAutocomplete(q: string) {
  const sanitized = sanitizeSearchQuery(q)
  if (!sanitized) return []

  const results = await db.execute(sql`
    SELECT
      m.id, m.title, m.slug,
      m.cover_image AS "coverImage",
      m.status,
      similarity(m.title, ${sanitized}) AS similarity,
      (
        SELECT c.number FROM chapters c
        WHERE c.manga_id = m.id
        ORDER BY c.created_at DESC
        LIMIT 1
      ) AS "latestChapter"
    FROM manga m
    WHERE similarity(m.title, ${sanitized}) > 0.3
       OR m.title ILIKE ${sanitized + '%'}
       OR m.search_vector @@ plainto_tsquery('simple', ${sanitized})
    ORDER BY
      CASE WHEN m.title ILIKE ${sanitized + '%'} THEN 0 ELSE 1 END,
      similarity(m.title, ${sanitized}) DESC
    LIMIT 8
  `)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return results as any[]
}

/**
 * Full-text search condition using tsvector @@ plainto_tsquery.
 * Returns SQL condition to use in WHERE clause.
 */
export function buildFtsCondition(q: string): SQL | undefined {
  const trimmed = q.trim()
  if (!trimmed) return undefined
  return sql`search_vector @@ plainto_tsquery('simple', ${trimmed})`
}

/**
 * Full-text search rank ordering.
 * Normalization flag 8 = divides rank by (1 + log of doc length) — prevents long descriptions dominating.
 */
export function getFtsRankOrder(q: string) {
  return sql`ts_rank(search_vector, plainto_tsquery('simple', ${q.trim()}), 8) DESC`
}

/**
 * Build facet conditions for status, type, genreId filters.
 */
export function buildSearchFacetConditions(params: {
  status?: string
  type?: string
  genreId?: number
}) {
  const conditions: SQL[] = []

  if (params.status) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(eq(manga.status, params.status as any))
  }
  if (params.type) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(eq(manga.type, params.type as any))
  }
  if (params.genreId) {
    const subquery = db
      .select({ mangaId: mangaGenres.mangaId })
      .from(mangaGenres)
      .where(eq(mangaGenres.genreId, params.genreId))
    conditions.push(inArray(manga.id, subquery))
  }

  return conditions
}
