# Backend API Filter/Sort System — MangaFire

**Research date**: 2026-02-07
**Scope**: API endpoints, validators, database schema, filter/sort parameter flow

---

## 1. Query Parameter Flow

### Entry Point
**Route**: `apps/api/src/routes/manga.ts:31`
- Validates query params via `@hono/zod-validator` with `mangaQueryParamsSchema`
- Calls helper functions from `manga-helpers.ts`

### Validator
**File**: `packages/shared/src/validators/manga.ts:67-76`
```typescript
mangaQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: mangaStatusSchema.optional(),
  type: mangaTypeSchema.optional(),
  genreId: z.coerce.number().int().positive().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['rating', 'views', 'createdAt', 'updatedAt', 'releaseYear', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
```

**Accepted sortBy values**: `rating`, `views`, `createdAt`, `updatedAt`, `releaseYear`, `title`

---

## 2. Sort Parameter Handling

### Function
**File**: `apps/api/src/routes/manga-helpers.ts:32-47`
```typescript
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
```

**Behavior**:
- Maps `sortBy` string to actual Drizzle column reference
- Defaults to `manga.createdAt` if invalid `sortBy`
- Direction: `asc` or `desc` (defaults to `desc`)

---

## 3. Database Schema — Manga Table

**File**: `apps/api/src/db/schema.ts:43-68`

### Relevant Columns for Filters/Sorts

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | serial | No | Primary key |
| `title` | text | No | Manga title |
| `slug` | text | No | URL slug |
| `status` | enum | No | `ongoing`, `completed`, `hiatus`, `cancelled` |
| `type` | enum | No | `manga`, `manhwa`, `manhua`, `one_shot`, `doujinshi` |
| `releaseYear` | integer | Yes | Year of release |
| `rating` | real | No | Default 0 |
| `views` | integer | No | Default 0 |
| `createdAt` | timestamp | No | Auto-generated |
| `updatedAt` | timestamp | No | Auto-generated |

### Indexes
- `manga_slug_idx` on `slug`
- `manga_status_idx` on `status`
- `manga_type_idx` on `type`

**No index on `releaseYear`, `createdAt`, `updatedAt`, `views`, `rating`** — sorts on these may be slower on large datasets.

---

## 4. Filter/Sort Implementation Details

### Sort Options Supported by Backend

| Frontend Label | Backend `sortBy` Value | Maps to Column |
|----------------|------------------------|----------------|
| "Recently updated" | `updatedAt` | `manga.updatedAt` |
| "Recently added" | `createdAt` | `manga.createdAt` |
| "Release date" | `releaseYear` | `manga.releaseYear` |
| "Trending" / "Most viewed" / "Most favourited" | `views` | `manga.views` |
| "Name A-Z" | `title` | `manga.title` |
| "Scores" / "MAL scores" | `rating` | `manga.rating` |

**Note**: Frontend `Sort.tsx` has 9 options mapping to 6 backend values. Multiple labels map to same backend value (e.g., 3 options use `views`).

---

## 5. Missing Filter Support

### Year Filter
**Frontend**: `apps/web/src/views/Filter/components/Filters/components/Year.tsx`
- Collects `year[]` form field
- Values: `2023`, `2022`, ..., `2000s`, `1990s`, etc.

**Backend**: **NOT IMPLEMENTED**
- `mangaQueryParamsSchema` has no `year` or `releaseYear` filter param
- `buildMangaConditions()` does not handle year filtering
- Only supports sorting by `releaseYear`, not filtering

### Length Filter (Chapter Count)
**Frontend**: `apps/web/src/views/Filter/components/Filters/components/Length.tsx`
- Collects `length` form field (radio)
- Values: `1`, `3`, `5`, `10`, `20`, `30`, `50` (minimum chapter count)

**Backend**: **NOT IMPLEMENTED**
- No `chapterCount` or `minChapters` param in validator
- No aggregation/count of chapters per manga in query
- Manga table does not have a `chapterCount` column

**Implementation would require**:
- Add `chapterCount` column to `manga` table (updated on chapter insert/delete), OR
- Subquery/join to count `chapters.mangaId` in filter query

---

## 6. Current Filter Behavior

### Working Filters
- ✅ `status` — enum filter on `manga.status`
- ✅ `type` — enum filter on `manga.type`
- ✅ `genreId` — requires join with `manga_genres` table
- ✅ `search` — `ILIKE` on `manga.title` (escaped for wildcard safety)

### Non-Working (Collected but Ignored)
- ❌ `year` / `year[]` — sent by frontend, not processed by backend
- ❌ `length` — sent by frontend, not processed by backend
- ❌ `language` / `language[]` — sent by frontend, not in backend validator (though `manga.language` column exists)

---

## 7. Query Execution

### Without `genreId`
**File**: `apps/api/src/routes/manga-helpers.ts:110-133`
```typescript
const items = await db
  .select()
  .from(manga)
  .where(conditions.length > 0 ? and(...conditions) : undefined)
  .orderBy(sortDirection(sortColumn))
  .limit(limit)
  .offset(offset)
```

### With `genreId`
**File**: `apps/api/src/routes/manga-helpers.ts:52-105`
```typescript
const items = await db
  .select({ ... })
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
```

### Enrichment
**File**: `apps/api/src/routes/manga-helpers.ts:175-242`
- Batch-fetches `genres` and `latestChapters` (3 most recent) for all returned manga
- Uses `inArray()` for efficient batch queries
- Attaches `genres[]` and `latestChapters[]` to each manga item

---

## 8. Summary — Backend Capabilities vs. Frontend Expectations

| Filter/Sort Feature | Frontend UI | Backend Support |
|---------------------|-------------|-----------------|
| Sort by release date | ✅ "Release date" option | ✅ `sortBy=releaseYear` |
| Sort by recently updated | ✅ "Recently updated" option | ✅ `sortBy=updatedAt` |
| Sort by recently added | ✅ "Recently added" option | ✅ `sortBy=createdAt` |
| Sort by name A-Z | ✅ "Name A-Z" option | ✅ `sortBy=title` |
| Filter by year | ✅ Year dropdown (2023-1930s) | ❌ Not implemented |
| Filter by chapter count | ✅ Length dropdown (≥1–50) | ❌ Not implemented |
| Filter by language | ✅ Language dropdown | ❌ Not implemented |

---

## 9. Unresolved Questions

1. **Should year filter support decade ranges** (e.g., `2000s` → `releaseYear BETWEEN 2000 AND 2009`)?
2. **Should language filter be multi-select or single-select?** Frontend collects `language[]`.
3. **Chapter count**: prefer real-time subquery or denormalized `chapterCount` column?
4. **Frontend sends `year[]` as array** — should backend support multi-year selection, or single-year only?
