# Phase 1: Shared Types & Validators

## Context

- [Plan](./plan.md)
- Research: [frontend](./research/researcher-01-frontend-filters.md), [backend](./research/researcher-02-backend-filters.md)

## Parallelization

- **Blocks**: Phase 2 (Backend), Phase 3 (Frontend)
- **Blocked by**: None
- Run first. Both Phase 2 and Phase 3 depend on these shared types.

## Overview

Add `year` and `minChapters` fields to `MangaQueryParams` interface and `mangaQueryParamsSchema` Zod validator. Both frontend and backend import from `@mangafire/shared`.

## Key Insights

- `MangaQueryParams` is the single source of truth for filter params across FE and BE
- Zod schema validates API query params server-side; FE uses the type for `useMangaList()`
- Year filter is multi-select (checkbox) in FE — send as comma-separated string, parse to array in validator
- Length filter is single-select (radio) — single integer value

## Requirements

1. Add `year` param: comma-separated string of year values (e.g., `"2023,2022,2000s"`)
2. Add `minChapters` param: positive integer (minimum chapter count threshold)
3. Maintain backward compat — both fields optional with no defaults

## Architecture

```
packages/shared/src/types/manga.ts    → MangaQueryParams interface
packages/shared/src/validators/manga.ts → mangaQueryParamsSchema
```

## File Ownership (Exclusive to Phase 1)

- `packages/shared/src/types/manga.ts`
- `packages/shared/src/validators/manga.ts`

## Implementation Steps

### Step 1: Update `MangaQueryParams` interface

**File**: `packages/shared/src/types/manga.ts` (lines 110-119)

Add `year` and `minChapters` to the interface:

```typescript
export interface MangaQueryParams {
  page?: number
  limit?: number
  status?: MangaStatus
  type?: MangaType
  genreId?: number
  search?: string
  sortBy?: 'rating' | 'views' | 'createdAt' | 'updatedAt' | 'releaseYear' | 'title'
  sortOrder?: 'asc' | 'desc'
  year?: string       // Comma-separated: "2023,2022,2000s"
  minChapters?: number // Minimum chapter count (>= value)
}
```

### Step 2: Update `mangaQueryParamsSchema` validator

**File**: `packages/shared/src/validators/manga.ts` (lines 67-76)

Add validation for both new fields:

```typescript
export const mangaQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: mangaStatusSchema.optional(),
  type: mangaTypeSchema.optional(),
  genreId: z.coerce.number().int().positive().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['rating', 'views', 'createdAt', 'updatedAt', 'releaseYear', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  year: z.string().max(200).optional(),
  minChapters: z.coerce.number().int().positive().max(500).optional(),
})
```

- `year` as string — backend parses comma-separated values. Max 200 chars prevents abuse.
- `minChapters` coerced from query string to number. Max 500 is a reasonable upper bound.

## Todo

- [ ] Add `year?: string` to `MangaQueryParams`
- [ ] Add `minChapters?: number` to `MangaQueryParams`
- [ ] Add `year` to `mangaQueryParamsSchema` as `z.string().max(200).optional()`
- [ ] Add `minChapters` to `mangaQueryParamsSchema` as `z.coerce.number().int().positive().max(500).optional()`
- [ ] Run `pnpm type-check` from root to verify no breakage

## Success Criteria

- `pnpm type-check` passes across all packages
- Both FE and BE can import updated types without errors
- Existing API calls with no `year`/`minChapters` params continue working (optional fields)

## Conflict Prevention

- Only Phase 1 touches files in `packages/shared/src/`
- Phase 2 and 3 import from shared but do not modify it

## Risk Assessment

- **Low risk**: Adding optional fields is backward compatible
- No migration needed — these are query parameter types only
