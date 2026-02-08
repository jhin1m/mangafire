# Backend Genre Filtering Research — MangaFire API

**Date**: 2026-02-08
**Scope**: Genre include/exclude filtering implementation using Drizzle ORM + PostgreSQL

---

## Current Genre Filtering Implementation

### Single-Genre Include (WORKING)

**Location**: `apps/api/src/routes/manga-helpers.ts` (lines 91–144)

```typescript
// fetchMangaWithGenreFilter()
.from(manga)
.innerJoin(mangaGenres, eq(manga.id, mangaGenres.mangaId))
.where(
  and(
    eq(mangaGenres.genreId, params.genreId!),
    conditions.length > 0 ? and(...conditions) : undefined
  )
)
```

**Pattern**:
- Uses `innerJoin` on `mangaGenres` table
- Filters by exact `genreId` match with `eq()`
- Returns only manga with specified genre
- SQL: `SELECT manga.* FROM manga INNER JOIN manga_genres ON manga.id = manga_genres.manga_id WHERE manga_genres.genre_id = $1`

**Limitation**: Only supports single `genreId` parameter. No multi-genre inclusion or exclusion logic.

### Route Handler

**Location**: `apps/api/src/routes/manga.ts` (lines 31–63)

```typescript
if (params.genreId) {
  const { items, total } = await fetchMangaWithGenreFilter(...)
} else {
  const { items, total } = await fetchMangaWithoutGenreFilter(...)
}
```

**Current behavior**: Conditional branching based on `genreId` presence. No exclusion handling.

---

## SQL NOT IN Subquery Pattern

### Standard SQL Approach

```sql
SELECT manga.* FROM manga
WHERE manga.id NOT IN (
  SELECT manga_id FROM manga_genres
  WHERE genre_id IN (id1, id2, id3)
)
```

**Use case**: Exclude manga with ANY of specified genres
**Semantic**: "Show manga that do NOT have any of these genres"

### SQL LEFT JOIN + NULL Pattern (Alternative)

```sql
SELECT manga.* FROM manga
LEFT JOIN manga_genres ON manga.id = manga_genres.manga_id
  AND manga_genres.genre_id IN (id1, id2, id3)
WHERE manga_genres.manga_id IS NULL
```

**Benefit**: Single pass; avoids subquery overhead in some DBs

---

## Drizzle ORM API for Multi-Genre Filtering

### 1. Include Multiple Genres (Any Genre Match)

```typescript
import { inArray, and } from 'drizzle-orm'

// Manga with ANY of these genres
const genreIds = [1, 2, 3]
const subquery = db
  .select({ mangaId: mangaGenres.mangaId })
  .from(mangaGenres)
  .where(inArray(mangaGenres.genreId, genreIds))
  .distinct()

const result = await db
  .select()
  .from(manga)
  .where(inArray(manga.id, subquery))
```

### 2. Exclude Multiple Genres (NOT IN Subquery)

```typescript
import { notInArray } from 'drizzle-orm'

// Manga WITHOUT any of these genres
const excludeGenreIds = [4, 5, 6]
const excludeSubquery = db
  .select({ mangaId: mangaGenres.mangaId })
  .from(mangaGenres)
  .where(inArray(mangaGenres.genreId, excludeGenreIds))
  .distinct()

const result = await db
  .select()
  .from(manga)
  .where(notInArray(manga.id, excludeSubquery))
```

**Generated SQL**:
```sql
SELECT manga.* FROM manga
WHERE manga.id NOT IN (
  SELECT DISTINCT manga_genres.manga_id FROM manga_genres
  WHERE manga_genres.genre_id IN ($1, $2, $3)
)
```

### 3. Combined Include + Exclude

```typescript
const includeGenreIds = [1, 2]
const excludeGenreIds = [4, 5]

const includeSubquery = db
  .select({ mangaId: mangaGenres.mangaId })
  .from(mangaGenres)
  .where(inArray(mangaGenres.genreId, includeGenreIds))
  .distinct()

const excludeSubquery = db
  .select({ mangaId: mangaGenres.mangaId })
  .from(mangaGenres)
  .where(inArray(mangaGenres.genreId, excludeGenreIds))
  .distinct()

const result = await db
  .select()
  .from(manga)
  .where(
    and(
      inArray(manga.id, includeSubquery),
      notInArray(manga.id, excludeSubquery)
    )
  )
```

---

## Recommended Backend Implementation

### Phase 1: Extend `MangaQueryParams` Type

**File**: `packages/shared/src/types/manga.ts`

```typescript
export interface MangaQueryParams {
  // ... existing fields
  genreId?: number              // Single genre (backward compatible)
  includeGenres?: number[]      // Multi-genre OR logic
  excludeGenres?: number[]      // Multi-genre NOT logic
}
```

### Phase 2: Refactor `buildMangaConditions()` to Return Conditions + Subqueries

**File**: `apps/api/src/routes/manga-helpers.ts`

Create helper function to build genre subqueries:

```typescript
async function buildGenreConditions(params: MangaQueryParams) {
  const conditions = []

  // Include logic: manga WITH any of these genres
  if (params.includeGenres?.length) {
    const includeSubquery = db
      .select({ mangaId: mangaGenres.mangaId })
      .from(mangaGenres)
      .where(inArray(mangaGenres.genreId, params.includeGenres))
      .distinct()
    conditions.push(inArray(manga.id, includeSubquery))
  }

  // Exclude logic: manga WITHOUT any of these genres
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

### Phase 3: Consolidate Fetch Functions

Merge `fetchMangaWithGenreFilter()` + `fetchMangaWithoutGenreFilter()` into single function that accepts genre conditions.

---

## Key Advantages of Drizzle Approach

1. **Type-safe**: Full TypeScript inference; no raw SQL strings
2. **Composable**: Build conditions independently, combine with `and()`/`or()`
3. **Efficient**: Subqueries use `DISTINCT` to avoid duplicate manga IDs
4. **Backward compatible**: Existing `genreId` logic unchanged
5. **Extensible**: Easy to add more filter types (e.g., language, status)

---

## Unresolved Questions

1. **UI Support**: Does frontend need new URL param names (`includeGenres[]`, `excludeGenres[]`)? Current API exposes single `genreId`.
2. **Semantic clarity**: Should "include multiple genres" use AND (ALL genres) or OR (ANY genre)? Current design assumes OR.
3. **Performance**: Test query performance with large manga_genres table (N-way joins with subqueries).
4. **Backward compatibility**: Timeline for deprecating single `genreId` param?

---

**Sources**:
- [Drizzle ORM - Filters](https://orm.drizzle.team/docs/operators)
- [Drizzle ORM - Query Data](https://orm.drizzle.team/docs/data-querying)
