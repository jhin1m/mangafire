# Phase 2: Backend Filter Support

## Context

- [Plan](./plan.md)
- Research: [backend](./research/researcher-02-backend-filters.md)

## Parallelization

- **Blocks**: None
- **Blocked by**: Phase 1 (Shared types)
- Runs in parallel with Phase 3

## Overview

Add year filter and length (chapter count) filter to the manga list API endpoint. Both require changes only in `manga-helpers.ts` — the route handler (`manga.ts`) already passes `params` to `buildMangaConditions()` and everything flows through automatically.

## Key Insights

- `buildMangaConditions()` is the single place all WHERE conditions are built — adding year/length here affects BOTH `fetchMangaWithGenreFilter` and `fetchMangaWithoutGenreFilter`
- Year values can be exact years (`"2023"`) or decade ranges (`"2000s"`) — need parser
- No `chapterCount` column exists. Use a subquery: `SELECT COUNT(*) FROM chapters WHERE manga_id = manga.id`
- The `chapters` table is already imported in `manga-helpers.ts` (used in `enrichMangaList`)

## Requirements

1. Parse `year` param (comma-separated string) into SQL conditions on `manga.releaseYear`
2. Parse decade strings (e.g., `"2000s"` -> BETWEEN 2000 AND 2009)
3. Add `minChapters` subquery filter using `chapters` table
4. Both filters are optional; existing queries unaffected when params absent

## Architecture

Year filter approach:
- Split comma-separated string into array
- Separate exact years from decade ranges
- Build: `(releaseYear IN (2023, 2022) OR (releaseYear BETWEEN 2000 AND 2009))`

Length filter approach:
- Correlated subquery: `(SELECT COUNT(*) FROM chapters WHERE chapters.manga_id = manga.id) >= minChapters`

## File Ownership (Exclusive to Phase 2)

- `apps/api/src/routes/manga-helpers.ts`

## Related Code (Read-Only Reference)

- `apps/api/src/routes/manga.ts` — route handler (no changes needed)
- `apps/api/src/db/schema.ts` — schema reference (no changes needed)
- `packages/shared/src/validators/manga.ts` — updated in Phase 1

## Implementation Steps

### Step 1: Add year parsing helper function

**File**: `apps/api/src/routes/manga-helpers.ts`

Add after the `escapeIlike` function (around line 9):

```typescript
/**
 * Parses year filter values into exact years and decade ranges.
 * Supports: "2023", "2022", "2000s", "1990s", etc.
 */
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
```

### Step 2: Update `buildMangaConditions()` for year filter

**File**: `apps/api/src/routes/manga-helpers.ts`, inside `buildMangaConditions` (lines 14-27)

Add year filtering after the existing `search` condition. Need to import additional operators.

Update imports at top of file — add `or`, `inArray`, `between`, `gte`:

```typescript
import { eq, and, ilike, sql, desc, asc, inArray, or, between, gte } from 'drizzle-orm'
```

Note: `inArray` is already imported. Add `or`, `between`, `gte`.

Add to `buildMangaConditions()` before `return conditions`:

```typescript
  // Year filter: exact years + decade ranges
  if (params.year) {
    const { exactYears, decades } = parseYearFilter(params.year)
    const yearConditions = []

    if (exactYears.length > 0) {
      yearConditions.push(inArray(manga.releaseYear, exactYears))
    }

    for (const decade of decades) {
      yearConditions.push(
        between(manga.releaseYear, decade, decade + 9)
      )
    }

    if (yearConditions.length > 0) {
      conditions.push(or(...yearConditions)!)
    }
  }

  // Length filter: minimum chapter count via subquery
  if (params.minChapters) {
    conditions.push(
      gte(
        sql<number>`(SELECT COUNT(*) FROM chapters WHERE chapters.manga_id = ${manga.id})`,
        params.minChapters
      )
    )
  }
```

### Step 3: Verify existing query flow

No changes needed in `manga.ts`. The flow is:
1. `mangaQueryParamsSchema` (Phase 1) validates `year` and `minChapters` from query string
2. `buildMangaConditions(params)` now handles them
3. Conditions propagate to both `fetchMangaWithGenreFilter` and `fetchMangaWithoutGenreFilter`

### Complete `buildMangaConditions` after changes

```typescript
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
```

## Todo

- [ ] Add `or`, `between`, `gte` to drizzle-orm imports
- [ ] Add `parseYearFilter()` helper function
- [ ] Add year filter conditions to `buildMangaConditions()`
- [ ] Add minChapters subquery condition to `buildMangaConditions()`
- [ ] Test: `GET /api/manga?year=2023,2000s` returns only matching manga
- [ ] Test: `GET /api/manga?minChapters=10` returns manga with >= 10 chapters
- [ ] Test: Combined filters work (e.g., `?year=2023&minChapters=5&status=ongoing`)
- [ ] Test: Existing queries without new params still work

## Success Criteria

- `GET /api/manga?year=2023` returns manga with `releaseYear=2023`
- `GET /api/manga?year=2000s` returns manga with `releaseYear` between 2000-2009
- `GET /api/manga?year=2023,2022,2000s` returns manga matching ANY of those
- `GET /api/manga?minChapters=10` returns manga with 10+ chapters
- `GET /api/manga` (no new params) returns same results as before
- `pnpm type-check` passes for `apps/api`

## Conflict Prevention

- Only Phase 2 touches `apps/api/src/routes/manga-helpers.ts`
- No changes to `manga.ts`, `schema.ts`, or shared package

## Risk Assessment

- **Medium risk (performance)**: The `minChapters` correlated subquery runs per-row. For large datasets, this could be slow. Mitigation: if performance becomes an issue, add a `chapter_count` denormalized column later. At current scale, acceptable.
- **Low risk (correctness)**: `inArray` with empty array produces invalid SQL. Guarded by `exactYears.length > 0` check.
- **Low risk (null handling)**: `manga.releaseYear` is nullable. `inArray` and `between` naturally exclude NULL rows (correct behavior — unknown year should not match).
