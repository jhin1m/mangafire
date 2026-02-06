# Phase 02: Shared Types & Validators

**Status**: Pending | **Effort**: 1.5h | **Dependencies**: None | **Parallel**: Yes

## Objective

Create shared types and Zod validators in `packages/shared` for:
- API response wrappers (ApiResponse, PaginatedResponse)
- Manga CRUD DTOs (CreateManga, UpdateManga, MangaQueryParams)
- Database entity types (Manga, Genre)
- Enums matching DB schema (MangaStatus, MangaType, Language)

## File Ownership

**Exclusive writes** (no conflicts):
- `packages/shared/src/types/api.ts` — NEW FILE
- `packages/shared/src/types/manga.ts` — APPEND/MODIFY (existing: Genre, Poster types)
- `packages/shared/src/types/index.ts` — APPEND export
- `packages/shared/src/validators/api.ts` — NEW FILE
- `packages/shared/src/validators/manga.ts` — APPEND/MODIFY (existing: chapterInfoSchema, posterSchema)
- `packages/shared/src/validators/index.ts` — APPEND export

**No changes needed**:
- `packages/shared/src/types/filter.ts`, `packages/shared/src/types/reading.ts` (unchanged)

## Implementation Steps

### 1. Create API Types (types/api.ts)

```typescript
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
  }
  meta?: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  pages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export interface PaginationParams {
  page?: number
  limit?: number
}
```

### 2. Add Manga Enums & Entity Types (types/manga.ts)

**Append to existing file**:

```typescript
// Enums (must match DB schema enums exactly)
export enum MangaStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  HIATUS = 'hiatus',
  CANCELLED = 'cancelled',
}

export enum MangaType {
  MANGA = 'manga',
  MANHWA = 'manhwa',
  MANHUA = 'manhua',
  ONE_SHOT = 'one_shot',
  DOUJINSHI = 'doujinshi',
}

export enum Language {
  EN = 'en',
  JP = 'jp',
  KO = 'ko',
  ZH = 'zh',
}

// Database entity type (matches Drizzle schema)
export interface Manga {
  id: number
  title: string
  slug: string
  alternativeTitles: string[] | null
  description: string | null
  author: string | null
  artist: string | null
  coverImage: string | null
  status: MangaStatus
  type: MangaType
  language: Language
  releaseYear: number | null
  rating: number
  views: number
  createdAt: Date
  updatedAt: Date
}

// DTO for creating manga (omits id, timestamps, computed fields)
export interface CreateMangaDto {
  title: string
  slug: string
  alternativeTitles?: string[]
  description?: string
  author?: string
  artist?: string
  coverImage?: string
  status?: MangaStatus
  type?: MangaType
  language?: Language
  releaseYear?: number
  genreIds?: number[] // For manga_genres junction table
}

// DTO for updating manga (all fields optional)
export interface UpdateMangaDto {
  title?: string
  slug?: string
  alternativeTitles?: string[]
  description?: string
  author?: string
  artist?: string
  coverImage?: string
  status?: MangaStatus
  type?: MangaType
  language?: Language
  releaseYear?: number
  genreIds?: number[]
}

// Query params for manga list endpoint
export interface MangaQueryParams {
  page?: number
  limit?: number
  status?: MangaStatus
  type?: MangaType
  genreId?: number
  search?: string // Search by title
  sortBy?: 'rating' | 'views' | 'createdAt' | 'title'
  sortOrder?: 'asc' | 'desc'
}

// Keep existing types: Genre, GenreTrending, Poster, ENUM_READ_BY
```

### 3. Create API Validators (validators/api.ts)

```typescript
import { z } from 'zod'

export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')
```

### 4. Add Manga Validators (validators/manga.ts)

**Append to existing file**:

```typescript
import { z } from 'zod'
import { MangaStatus, MangaType, Language } from '../types/manga'

// Enum validators
export const mangaStatusSchema = z.nativeEnum(MangaStatus)
export const mangaTypeSchema = z.nativeEnum(MangaType)
export const languageSchema = z.nativeEnum(Language)

// Create manga validator
export const createMangaDtoSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  alternativeTitles: z.array(z.string()).optional(),
  description: z.string().max(5000).optional(),
  author: z.string().max(200).optional(),
  artist: z.string().max(200).optional(),
  coverImage: z.string().url().optional(),
  status: mangaStatusSchema.default(MangaStatus.ONGOING),
  type: mangaTypeSchema.default(MangaType.MANGA),
  language: languageSchema.default(Language.EN),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  genreIds: z.array(z.number().int().positive()).optional(),
})

// Update manga validator (all fields optional)
export const updateMangaDtoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  alternativeTitles: z.array(z.string()).optional(),
  description: z.string().max(5000).optional(),
  author: z.string().max(200).optional(),
  artist: z.string().max(200).optional(),
  coverImage: z.string().url().optional(),
  status: mangaStatusSchema.optional(),
  type: mangaTypeSchema.optional(),
  language: languageSchema.optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  genreIds: z.array(z.number().int().positive()).optional(),
})

// Query params validator
export const mangaQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: mangaStatusSchema.optional(),
  type: mangaTypeSchema.optional(),
  genreId: z.coerce.number().int().positive().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['rating', 'views', 'createdAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Keep existing validators: chapterInfoSchema, genreSchema, posterSchema
```

### 5. Update Index Exports

**types/index.ts**:
```typescript
export * from './api'
export * from './manga'
export * from './filter'
export * from './reading'
```

**validators/index.ts**:
```typescript
export * from './api'
export * from './manga'
export * from './filter'
```

### 6. Verify TypeScript Compilation

```bash
cd packages/shared
pnpm type-check  # Should pass
```

## Success Criteria

- [ ] 3 new types files created/updated: `api.ts`, `manga.ts` (updated), `index.ts` (updated)
- [ ] 3 new validator files created/updated: `api.ts`, `manga.ts` (updated), `index.ts` (updated)
- [ ] Enums match Phase 01 DB schema exactly (ongoing, completed, hiatus, cancelled, etc.)
- [ ] `CreateMangaDto` excludes id/timestamps, includes genreIds
- [ ] `UpdateMangaDto` makes all fields optional
- [ ] `MangaQueryParams` supports filtering, sorting, pagination
- [ ] `pnpm type-check` passes in `packages/shared`
- [ ] Existing types/validators (Genre, Poster, chapterInfoSchema) preserved

## Conflict Prevention

**No overlaps with Phase 01/03/04**:
- Phase 01 only touches `apps/api/src/db/`
- Phase 03 only touches `apps/api/src/middleware/` and `apps/api/src/lib/`
- Phase 04 only touches `apps/api/src/routes/` and `apps/api/src/index.ts`

**Safe to run in parallel**: Yes

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Enum values mismatch with DB | Document: "Must match Phase 01 schema exactly" |
| Slug regex too strict | Use proven pattern: `/^[a-z0-9-]+$/` |
| Breaking existing exports | Append only, don't remove Genre/Poster types |
| Validator too permissive | Set max lengths (title 500, description 5000) |

## Code Reference

**Import structure**:
```typescript
// In types/manga.ts
export enum MangaStatus { ... }

// In validators/manga.ts
import { z } from 'zod'
import { MangaStatus } from '../types/manga'
export const mangaStatusSchema = z.nativeEnum(MangaStatus)
```

**Usage in Phase 04**:
```typescript
import { createMangaDtoSchema, type CreateMangaDto } from '@mangafire/shared'
```

## Next Phase

After completion, Phase 04 can import types/validators:
```typescript
import {
  type Manga,
  type CreateMangaDto,
  createMangaDtoSchema,
  mangaQueryParamsSchema,
} from '@mangafire/shared'
```
