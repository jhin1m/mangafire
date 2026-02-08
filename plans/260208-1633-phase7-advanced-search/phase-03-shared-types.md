# Phase 03 - Shared Types & Validators

## Context

- Docs: [Codebase Summary](../../docs/codebase-summary.md), [Code Standards](../../docs/code-standards.md)
- Existing patterns: `packages/shared/src/types/manga.ts`, `packages/shared/src/validators/manga.ts`

## Parallelization

- **Runs with**: Phase 01, Phase 04 (no dependencies)
- **Blocks**: Phase 02 (needs validators for Zod), Phase 05 (needs types for TanStack Query)

## Overview

| Field | Value |
|---|---|
| Date | 2026-02-08 |
| Priority | P1 |
| Status | pending |
| Effort | 1h |
| Description | Define SearchParams, SearchResult, SearchResponse types and Zod validators for search queries |

## Key Insights

- Existing pattern: types in `src/types/*.ts`, validators in `src/validators/*.ts`, barrel re-exports in `index.ts`
- Shared package uses source exports (no build step) — `moduleResolution: "bundler"`
- Types must use `export type` for isolatedModules compatibility; enums use regular `export`
- Existing `MangaQueryParams` has `search?: string` — new search types complement (not replace) this

## Requirements

1. `SearchMode` type: `'autocomplete' | 'full'`
2. `SearchParams` interface: q, mode, status, type, genreId, page, limit
3. `SearchAutocompleteResult` interface: id, title, slug, coverImage, similarity
4. `SearchFullResult` — extends Manga with genres array
5. `SearchResponse` — wraps ApiResponse with appropriate data type per mode
6. `searchQueryParamsSchema` — Zod schema for GET /api/search validation
7. All types exported via barrel files

## Architecture

```
packages/shared/src/
├── types/
│   ├── search.ts          ← NEW: SearchParams, SearchResult types
│   └── index.ts           ← ADD: export * from './search'
├── validators/
│   ├── search.ts          ← NEW: searchQueryParamsSchema
│   └── index.ts           ← ADD: export * from './search'
```

## File Ownership (Exclusive)

| File | Action |
|---|---|
| `packages/shared/src/types/search.ts` | New file |
| `packages/shared/src/validators/search.ts` | New file |
| `packages/shared/src/types/index.ts` | Add re-export line |
| `packages/shared/src/validators/index.ts` | Add re-export line |

No other phase touches these files. Phase 03 owns ALL shared package changes.

## Implementation Steps

1. **Create `types/search.ts`**:
   ```typescript
   import type { Manga, MangaStatus, MangaType } from './manga'

   export type SearchMode = 'autocomplete' | 'full'

   export interface SearchParams {
     q: string
     mode?: SearchMode
     status?: MangaStatus
     type?: MangaType
     genreId?: number
     page?: number
     limit?: number
   }

   export interface SearchAutocompleteItem {
     id: number
     title: string
     slug: string
     coverImage: string | null
     similarity: number
   }

   export interface SearchFullItem extends Manga {
     genres: { id: number; name: string; slug: string }[]
     latestChapters: {
       number: string
       title: string | null
       language: string
       createdAt: Date
     }[]
   }
   ```

2. **Create `validators/search.ts`**:
   ```typescript
   import { z } from 'zod'
   // Reuse existing enum schemas — already exported from manga validator
   import { mangaStatusSchema, mangaTypeSchema } from './manga'

   export const searchQueryParamsSchema = z.object({
     q: z.string().max(200).trim().default(''),
     mode: z.enum(['autocomplete', 'full']).default('full'),
     status: mangaStatusSchema.optional(),
     type: mangaTypeSchema.optional(),
     genreId: z.coerce.number().int().positive().optional(),
     page: z.coerce.number().int().positive().default(1),
     limit: z.coerce.number().int().positive().max(100).default(20),
   })
   ```
   **Note**: `q` uses `.default('')` not `.min(1)` — empty query returns empty results (not 400 error). This matches Phase 02 edge case handling.

3. **Update `types/index.ts`**: Add `export * from './search'`
4. **Update `validators/index.ts`**: Add `export * from './search'`
5. **Type-check**: Run `pnpm type-check` in shared package to verify

## Todo

- [ ] Create `packages/shared/src/types/search.ts`
- [ ] Create `packages/shared/src/validators/search.ts`
- [ ] Add re-export to `types/index.ts`
- [ ] Add re-export to `validators/index.ts`
- [ ] Run `pnpm type-check` in packages/shared

## Success Criteria

- All search types importable via `@mangafire/shared/types`
- Zod schema importable via `@mangafire/shared/validators`
- `searchQueryParamsSchema.parse()` correctly validates and coerces search params
- No type-check errors in shared package
- Types compatible with both API (Phase 02) and frontend (Phase 05)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Circular import with manga types | Low | Medium | Use `import type` for Manga reference |
| isolatedModules violation | Low | Low | Use `export type` for interfaces, regular export for schema |
| Zod version mismatch | Low | Low | Shared package already has zod ^3.22.0 |

## Security Considerations

- Zod validation prevents oversized queries (max 200 chars)
- Coerce + positive() prevents negative page/limit abuse
- No sensitive data in search types

## Next Steps

Phase 02 imports `searchQueryParamsSchema` for API validation. Phase 05 imports types for TanStack Query generics.
