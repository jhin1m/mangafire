# Phase 01: Shared Types & Validators

## Context

- **Parent plan**: [plan.md](./plan.md)
- **Dependencies**: None (independent)
- **Docs**: [project-roadmap.md](../../docs/project-roadmap.md), [system-architecture.md](../../docs/system-architecture.md)

## Parallelization

- **Runs parallel with**: Phase 02 (Database Schema)
- **Blocks**: Phase 03 (Chapter API)
- **No shared files** with any other phase

## Overview

- **Date**: 2026-02-06
- **Description**: Create TypeScript types and Zod validators for chapters, volumes, and chapter pages in `@mangafire/shared`
- **Priority**: P1
- **Status**: done (2026-02-06)
- **Effort**: 1.5h

## Key Insights

- Follow exact patterns from `types/manga.ts` and `validators/manga.ts`
- Chapter numbers are strings ("10.5") to support decimals — stored as `text` in DB, validated via regex
- Reuse existing `Language` enum from manga types
- Shared package uses source exports (no build step)

## Requirements

1. Types for: Volume, Chapter, ChapterPage, DTOs, query params
2. Zod validators matching each type
3. Barrel exports updated

## Architecture

```
packages/shared/src/
  types/
    chapter.ts      <-- NEW: all chapter/volume/page types
    index.ts        <-- MODIFY: add export
  validators/
    chapter.ts      <-- NEW: all chapter/volume/page validators
    index.ts        <-- MODIFY: add export
```

## Related Code Files

Reference (read-only, not modified by this phase):
- `packages/shared/src/types/manga.ts` — pattern for types + enums
- `packages/shared/src/validators/manga.ts` — pattern for Zod schemas
- `packages/shared/src/types/api.ts` — PaginationParams, PaginationMeta

## File Ownership

| File | Action |
|------|--------|
| `packages/shared/src/types/chapter.ts` | CREATE |
| `packages/shared/src/validators/chapter.ts` | CREATE |
| `packages/shared/src/types/index.ts` | MODIFY (append `export * from './chapter'`) |
| `packages/shared/src/validators/index.ts` | MODIFY (append `export * from './chapter'`) |

## Implementation Steps

### Step 1: Create types/chapter.ts

```typescript
import { Language } from './manga'

// Volume entity
export interface Volume {
  id: number
  mangaId: number
  number: number
  title: string | null
  coverImage: string | null
  createdAt: Date
  updatedAt: Date
}

// Chapter entity
export interface Chapter {
  id: number
  mangaId: number
  volumeId: number | null
  number: string          // "10.5" — string to support decimals
  title: string | null
  slug: string
  language: Language
  pageCount: number       // denormalized from chapter_pages count
  createdAt: Date
  updatedAt: Date
}

// Chapter page entity
export interface ChapterPage {
  id: number
  chapterId: number
  pageNumber: number
  imageUrl: string
  width: number | null
  height: number | null
}

// Navigation links returned with single chapter
export interface ChapterNavigation {
  prev: { number: string; slug: string } | null
  next: { number: string; slug: string } | null
}

// Chapter with pages (for reader endpoint)
export interface ChapterWithPages extends Chapter {
  pages: ChapterPage[]
  navigation: ChapterNavigation
}

// DTOs
export interface CreateChapterDto {
  number: string
  title?: string
  slug: string
  volumeId?: number
  language?: Language
  pages: CreateChapterPageDto[]
}

export interface UpdateChapterDto {
  title?: string
  slug?: string
  volumeId?: number | null
  language?: Language
}

export interface CreateChapterPageDto {
  pageNumber: number
  imageUrl: string
  width?: number
  height?: number
}

// Volume DTOs
export interface CreateVolumeDto {
  number: number
  title?: string
  coverImage?: string
}

export interface UpdateVolumeDto {
  number?: number
  title?: string
  coverImage?: string
}

// Query params for chapter list
export interface ChapterQueryParams {
  page?: number
  limit?: number
  language?: Language
  sortOrder?: 'asc' | 'desc'
}
```

### Step 2: Create validators/chapter.ts

```typescript
import { z } from 'zod'
import { Language } from '../types/manga'

// Chapter number: string matching "10" or "10.5" pattern
const chapterNumberSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Must be a number or decimal (e.g., "10" or "10.5")')

const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')

export const languageSchema = z.nativeEnum(Language)

// Page DTO validator
export const createChapterPageDtoSchema = z.object({
  pageNumber: z.number().int().nonnegative(),
  imageUrl: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

// Chapter create
export const createChapterDtoSchema = z.object({
  number: chapterNumberSchema,
  title: z.string().max(500).optional(),
  slug: slugSchema,
  volumeId: z.number().int().positive().optional(),
  language: languageSchema.default(Language.EN),
  pages: z
    .array(createChapterPageDtoSchema)
    .min(1, 'At least one page required')
    .refine(
      (pages) => {
        const numbers = pages.map((p) => p.pageNumber)
        const sorted = [...numbers].sort((a, b) => a - b)
        return sorted.every((n, i) => n === i)
      },
      'Page numbers must be sequential starting from 0'
    ),
})

// Chapter update (no pages — pages managed separately or via chapter recreation)
export const updateChapterDtoSchema = z.object({
  title: z.string().max(500).optional(),
  slug: slugSchema.optional(),
  volumeId: z.number().int().positive().nullable().optional(),
  language: languageSchema.optional(),
})

// Chapter list query params
export const chapterQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  language: languageSchema.optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Volume create
export const createVolumeDtoSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
})

// Volume update
export const updateVolumeDtoSchema = z.object({
  number: z.number().int().positive().optional(),
  title: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
})
```

### Step 3: Update barrel exports

**types/index.ts** — append:
```typescript
export * from './chapter'
```

**validators/index.ts** — append:
```typescript
export * from './chapter'
```

## Todo

- [x] Create `packages/shared/src/types/chapter.ts` with all interfaces
- [x] Create `packages/shared/src/validators/chapter.ts` with all Zod schemas
- [x] Add `export * from './chapter'` to `types/index.ts`
- [x] Add `export * from './chapter'` to `validators/index.ts`
- [x] Run `pnpm type-check` in shared package to verify

## Success Criteria

- `pnpm type-check` passes in `packages/shared`
- All types importable via `@mangafire/shared/types`
- All validators importable via `@mangafire/shared/validators`
- No naming conflicts with existing exports

## Conflict Prevention

- This phase creates NEW files only (`chapter.ts`). No overlap with existing manga/auth/api/filter/reading files.
- Barrel export additions are append-only (add line at end of file).

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Naming collision with existing exports | Medium | Grep existing exports before finalizing names |
| Chapter number as string vs number confusion | Low | Document clearly: always string in TS types, text in DB |

## Security Considerations

- Zod validators enforce max lengths, URL format, regex patterns
- Chapter number regex prevents injection via number field
- Page count limited implicitly by array validation

## Next Steps

After completion, Phase 03 (Chapter API) can begin consuming these types and validators.
