# Phase 02 Implementation Report - Service Layer & Custom Hooks

## Executed Phase
- **Phase**: phase-02-services-and-hooks
- **Plan**: `/Users/jhin1m/Desktop/ducanh-project/mangafire/plans/260206-1928-phase5-frontend-api-integration/`
- **Status**: ✅ completed

## Files Created

### Service Layer (56 lines total)
- `apps/web/src/services/manga-service.ts` (17 lines) — manga list + detail API calls
- `apps/web/src/services/genre-service.ts` (18 lines) — genre list API calls
- `apps/web/src/services/chapter-service.ts` (13 lines) — chapter list + detail API calls
- `apps/web/src/services/volume-service.ts` (8 lines) — volume list API calls

### Custom Hooks (118 lines total)
- `apps/web/src/hooks/query-keys.ts` (19 lines) — structured query key factory
- `apps/web/src/hooks/use-manga-list.ts` (20 lines) — paginated manga list hook
- `apps/web/src/hooks/use-manga-detail.ts` (12 lines) — single manga detail hook
- `apps/web/src/hooks/use-genres.ts` (14 lines) — genre list hook (30min stale time)
- `apps/web/src/hooks/use-chapters.ts` (32 lines) — chapter list + detail hooks
- `apps/web/src/hooks/use-volumes.ts` (21 lines) — volume list hook

## Tasks Completed
- [x] Create `hooks/query-keys.ts` with structured factory
- [x] Create `services/manga-service.ts`
- [x] Create `services/genre-service.ts`
- [x] Create `services/chapter-service.ts`
- [x] Create `services/volume-service.ts`
- [x] Create `hooks/use-manga-list.ts`
- [x] Create `hooks/use-manga-detail.ts`
- [x] Create `hooks/use-genres.ts`
- [x] Create `hooks/use-chapters.ts` (2 hooks: list + detail)
- [x] Create `hooks/use-volumes.ts`
- [x] Verify `pnpm type-check` passes

## Tests Status
- **Type check**: ✅ pass (`pnpm type-check`)
- **Unit tests**: n/a (no test framework configured)
- **Integration tests**: n/a

## Key Implementation Details

### Query Key Structure
Hierarchical query key factory enables granular cache invalidation:
```ts
queryKeys.manga.list(params)     // ['manga', 'list', params]
queryKeys.manga.detail(slug)     // ['manga', 'detail', slug]
queryKeys.chapters.detail(slug, num) // ['chapters', slug, 'detail', num]
```

### Service Design
- Thin wrappers around `apiClient` calls
- All typed with `@mangafire/shared/types`
- Use `apiClient.get(url, params)` signature to avoid manual query string building
- Type casting for params: `params as Record<string, unknown>`

### Hook Design
- All hooks use `useQuery` from React Query
- `select` function unwraps `ApiResponse<T>` envelope: `(res) => res.data`
- Paginated hooks return `{ items, meta }` shape
- Genre hook has 30min `staleTime` (genres rarely change)
- All hooks with dynamic params use `enabled` flag

### Type Additions
- `MangaWithGenres` in manga-service — backend returns genres array
- `GenreEntity` in genre-service — full backend genre entity (id, name, slug, description, timestamps)
- Export helper types from hooks: `UseMangaListReturn`, `UseChapterListReturn`, etc.

## Issues Encountered
**Initial type errors**: `buildQueryString` expects `Record<string, unknown>` but `MangaQueryParams`, `ChapterQueryParams`, `PaginationParams` lack index signatures.

**Resolution**: Use `apiClient.get(url, params)` signature instead of manual query string concatenation + cast params with `as Record<string, unknown>`.

## File Ownership Compliance
✅ All files created are NEW — no existing file modifications
✅ No overlap with other phases
✅ `api-client.ts` imported only (created by Phase 01)

## Next Steps
- Phase 03 (View Components) can now import these hooks
- Phase 04 (Auth Integration) can add mutations
- Phase 05 (Testing) can mock these services

## Unresolved Questions
None. All success criteria met.
