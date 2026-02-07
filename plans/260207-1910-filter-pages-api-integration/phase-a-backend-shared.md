# Phase A: Backend + Shared (sortBy enum expansion)

**Effort**: 20min | **Parallel**: Can run independently from Phase B

## Context
Backend `sortBy` only accepts `['rating', 'views', 'createdAt', 'title']`. The `manga` table has `updatedAt` and `releaseYear` columns but they're not exposed as sort options. `/updated` needs `updatedAt` sorting, `/newest` needs `releaseYear` sorting.

## Changes

### 1. `packages/shared/src/validators/manga.ts` (line 74)

**Current**:
```ts
sortBy: z.enum(['rating', 'views', 'createdAt', 'title']).default('createdAt'),
```

**Target**:
```ts
sortBy: z.enum(['rating', 'views', 'createdAt', 'updatedAt', 'releaseYear', 'title']).default('createdAt'),
```

### 2. `packages/shared/src/types/manga.ts` (line 117)

**Current**:
```ts
sortBy?: 'rating' | 'views' | 'createdAt' | 'title'
```

**Target**:
```ts
sortBy?: 'rating' | 'views' | 'createdAt' | 'updatedAt' | 'releaseYear' | 'title'
```

### 3. `apps/api/src/routes/manga-helpers.ts` (lines 33-38)

**Current**:
```ts
const sortColumns = {
  rating: manga.rating,
  views: manga.views,
  createdAt: manga.createdAt,
  title: manga.title,
} as const
```

**Target**:
```ts
const sortColumns = {
  rating: manga.rating,
  views: manga.views,
  createdAt: manga.createdAt,
  updatedAt: manga.updatedAt,
  releaseYear: manga.releaseYear,
  title: manga.title,
} as const
```

## Verification
```bash
cd /Users/jhin1m/Desktop/ducanh-project/mangafire
pnpm type-check
# Test: curl "http://localhost:3000/api/manga?sortBy=updatedAt&sortOrder=desc"
```

## Risk
None. Additive change only. Existing sort values unaffected.
