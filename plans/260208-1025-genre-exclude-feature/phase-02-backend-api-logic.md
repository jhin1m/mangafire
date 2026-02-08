# Phase 2: Backend API Logic

## Context

- [Plan](./plan.md) | [Backend Research](./research/researcher-backend-genre-filtering.md)

## Parallelization Info

- **Parallel** with Phase 3 (Frontend)
- **Blocks**: Phase 4
- **Blocked by**: Phase 1

## Overview

Add `excludeGenres` query param support to manga list endpoint. Implement `NOT IN` subquery filtering via Drizzle ORM `notInArray`. Refactor genre filter branching to handle include-only, exclude-only, and combined include+exclude scenarios.

## File Ownership

| File | Action |
|------|--------|
| `apps/api/src/routes/manga-helpers.ts` | Add exclude subquery builder, refactor `fetchMangaWithGenreFilter` |
| `apps/api/src/routes/manga.ts` | Update conditional branching to handle `excludeGenres` param |

## Key Insights

- Current code branches on `params.genreId` presence: with-genre vs without-genre fetch functions
- `fetchMangaWithGenreFilter` uses `innerJoin` for single genreId -- must be adapted for multi-genre include + exclude
- Drizzle `notInArray(manga.id, subquery)` generates `NOT IN (SELECT DISTINCT ...)` SQL
- Include and exclude subqueries are composable via `and()` in WHERE clause

## Requirements

1. Accept `excludeGenres` param (comma-separated string parsed by validator in Phase 1)
2. Build `NOT IN` subquery when `excludeGenres` present
3. Compose include + exclude conditions with existing `buildMangaConditions` output
4. Maintain backward compat: existing `genreId` single-param still works
5. Handle edge cases: exclude-only (no include), include+exclude overlap (exclude takes priority)

## Architecture

Refactor from two separate fetch functions to a unified approach:

```
buildMangaConditions(params)        // existing status/type/search/year/length
  + buildGenreConditions(params)    // NEW: include + exclude subqueries
  → combined WHERE via and(...)
  → single fetchManga() function
```

## Implementation Steps

### Step 1: Add `buildGenreConditions()` helper in `manga-helpers.ts`

```typescript
import { notInArray } from 'drizzle-orm'

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
      .select({ mangaId: mangaGenres.mangaId })
      .from(mangaGenres)
      .where(inArray(mangaGenres.genreId, params.excludeGenres))
      .distinct()
    conditions.push(notInArray(manga.id, excludeSubquery))
  }

  return conditions
}
```

### Step 2: Consolidate fetch functions

Replace `fetchMangaWithGenreFilter` + `fetchMangaWithoutGenreFilter` with single `fetchMangaList()`:

```typescript
export async function fetchMangaList(
  conditions: SQL[],   // all WHERE conditions combined
  sortColumn, sortDirection, offset, limit
) {
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const items = await db.select({ /* all manga columns */ })
    .from(manga)
    .where(whereClause)
    .orderBy(sortDirection(sortColumn))
    .limit(limit)
    .offset(offset)

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(manga)
    .where(whereClause)

  return { items, total: Number(countResult[0]?.count || 0) }
}
```

### Step 3: Update route handler in `manga.ts`

```typescript
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
```

## Todo

- [x] Import `notInArray` from `drizzle-orm` in manga-helpers.ts
- [x] Add `buildGenreConditions()` function
- [x] Create unified `fetchMangaList()` replacing the two separate functions
- [x] Update manga.ts GET handler to use consolidated function
- [x] Remove old `fetchMangaWithGenreFilter` and `fetchMangaWithoutGenreFilter`
- [ ] Test: `GET /api/manga?excludeGenres=1,2` returns manga without those genres (Phase 4)
- [ ] Test: `GET /api/manga?genreId=3&excludeGenres=1,2` returns manga with genre 3 but not 1 or 2 (Phase 4)
- [ ] Test: `GET /api/manga` still works with no genre params (backward compat) (Phase 4)

## Success Criteria

- `GET /api/manga?excludeGenres=1,2` excludes manga with genre 1 or 2
- `GET /api/manga?genreId=5&excludeGenres=1` includes genre 5, excludes genre 1
- Existing `genreId` param still works identically
- `pnpm type-check` passes in `apps/api`
- No raw SQL; all queries use Drizzle query builder

## Conflict Prevention

- Only modifies files in `apps/api/src/routes/` -- Phase 3 never touches these files
- Exports renamed function (`fetchMangaList` replaces two old functions); no cross-phase import conflicts since only `manga.ts` consumes these helpers

## Risk Assessment

- **Medium risk**: Consolidating two fetch functions into one -- must preserve exact behavior for non-genre queries
- **Mitigation**: Test all 3 scenarios (no genre, include only, exclude only, include+exclude) before merging
- **Performance**: `NOT IN (SELECT DISTINCT ...)` acceptable for moderate dataset; index on `manga_genres.genre_id` already exists

## Security Considerations

- Genre IDs validated by Zod schema (positive integers only) -- no SQL injection risk
- `notInArray` parameterizes values automatically via Drizzle
- Empty `excludeGenres` array is safely ignored (no condition added)

## Next Steps

After completion (along with Phase 3), proceed to Phase 4 integration testing.
