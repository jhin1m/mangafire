import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { manga } from '../db/schema'
import { searchQueryParamsSchema } from '@mangafire/shared'
import { successResponse } from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'
import { enrichMangaList } from './manga-helpers'
import {
  searchAutocomplete,
  buildFtsCondition,
  getFtsRankOrder,
  buildSearchFacetConditions,
} from './search-helpers'

export const searchRoutes = new Hono()

// GET / - Search manga (autocomplete or full-text)
searchRoutes.get('/', zValidator('query', searchQueryParamsSchema), async (c) => {
  const params = c.req.valid('query')

  // Empty query → empty results
  if (!params.q.trim()) {
    if (params.mode === 'autocomplete') {
      return successResponse(c, [])
    }
    return successResponse(c, [], { total: 0, page: params.page, limit: params.limit, pages: 0 })
  }

  // AUTOCOMPLETE mode — fast trigram search
  if (params.mode === 'autocomplete') {
    const results = await searchAutocomplete(params.q)
    return successResponse(c, results)
  }

  // FULL SEARCH mode — FTS + facets + pagination
  const { offset, limit } = getOffsetLimit(params)

  const ftsCondition = buildFtsCondition(params.q)
  const facetConditions = buildSearchFacetConditions(params)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allConditions = [ftsCondition, ...facetConditions].filter(Boolean) as any[]

  const whereClause = allConditions.length > 0 ? and(...allConditions) : undefined

  // Fetch matching manga with rank ordering
  const items = await db
    .select()
    .from(manga)
    .where(whereClause)
    .orderBy(getFtsRankOrder(params.q))
    .limit(limit)
    .offset(offset)

  // Count total for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(manga)
    .where(whereClause)

  const total = Number(countResult[0]?.count || 0)

  // Enrich with genres + latest chapters (reuse from manga-helpers)
  const enriched = await enrichMangaList(items)

  const meta = calculatePagination(total, params)
  return successResponse(c, enriched, meta)
})
