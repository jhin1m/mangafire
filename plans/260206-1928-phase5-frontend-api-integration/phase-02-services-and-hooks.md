# Phase 02 - Service Layer & Custom Hooks

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: Phase 01 (imports `apiClient`)
- Blocks: Phase 03, 04, 05

## Parallelization Info
- **Can run in parallel with**: Phase 01 (agree on `apiClient` interface upfront)
- **Exclusive files**: All files in `services/manga-service.ts`, `services/genre-service.ts`, `services/chapter-service.ts`, `services/volume-service.ts`, `hooks/use-*.ts`
- **No shared files with any other phase**

## Overview
Create typed service functions for each API domain and React Query custom hooks that consume them. Services call `apiClient`; hooks wrap services in `useQuery`/`useMutation`.

## Key Insights
- Backend returns `ApiResponse<T>` with `{ success, data, error, meta }` envelope
- Manga list endpoint returns paginated data with `PaginationMeta`
- Single manga endpoint returns manga + genres array
- Chapter list is paginated, single chapter returns pages + navigation
- Genre list is unpaginated (returns all)
- Volume list is paginated
- Hook consumers need: `data`, `isLoading`, `error`, `refetch` at minimum
- Filter page needs query param -> API param mapping

## Requirements
1. 4 service files -- one per domain
2. 5+ hook files covering all data-fetching needs
3. All using shared types from `@mangafire/shared/types`
4. Query keys must be structured for cache invalidation

## Architecture

```
services/
  ├── api-client.ts       (Phase 01)
  ├── auth-service.ts     (existing, untouched)
  ├── manga-service.ts    NEW
  ├── genre-service.ts    NEW
  ├── chapter-service.ts  NEW
  └── volume-service.ts   NEW

hooks/
  ├── use-manga-list.ts   NEW (paginated manga list)
  ├── use-manga-detail.ts NEW (single manga by slug)
  ├── use-genres.ts       NEW (all genres)
  ├── use-chapters.ts     NEW (chapter list + single chapter)
  └── use-volumes.ts      NEW (volume list)
```

## Related Code Files (Exclusive to Phase 02)

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/src/services/manga-service.ts` | CREATE | Manga API calls |
| `apps/web/src/services/genre-service.ts` | CREATE | Genre API calls |
| `apps/web/src/services/chapter-service.ts` | CREATE | Chapter API calls |
| `apps/web/src/services/volume-service.ts` | CREATE | Volume API calls |
| `apps/web/src/hooks/use-manga-list.ts` | CREATE | Hook for paginated manga |
| `apps/web/src/hooks/use-manga-detail.ts` | CREATE | Hook for single manga |
| `apps/web/src/hooks/use-genres.ts` | CREATE | Hook for genre list |
| `apps/web/src/hooks/use-chapters.ts` | CREATE | Hook for chapters |
| `apps/web/src/hooks/use-volumes.ts` | CREATE | Hook for volumes |

## Implementation Steps

### Step 1: Query Key Factory
Define at top of each hook file or in a shared `hooks/query-keys.ts`:
```ts
export const queryKeys = {
  manga: {
    all: ['manga'] as const,
    list: (params: MangaQueryParams) => ['manga', 'list', params] as const,
    detail: (slug: string) => ['manga', 'detail', slug] as const,
  },
  genres: {
    all: ['genres'] as const,
  },
  chapters: {
    list: (slug: string, params?: ChapterQueryParams) => ['chapters', slug, params] as const,
    detail: (slug: string, number: string) => ['chapters', slug, number] as const,
  },
  volumes: {
    list: (slug: string) => ['volumes', slug] as const,
  },
}
```

### Step 2: manga-service.ts
```ts
import { apiClient } from './api-client'
import type { Manga, MangaQueryParams, ApiResponse, PaginationMeta } from '@mangafire/shared/types'

function buildQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) sp.set(k, String(v))
  })
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export const mangaService = {
  getList(params: MangaQueryParams = {}) {
    return apiClient.get<Manga[]>(`/api/manga${buildQueryString(params)}`)
  },
  getBySlug(slug: string) {
    return apiClient.get<Manga & { genres: { id: number; name: string; slug: string }[] }>(
      `/api/manga/${slug}`
    )
  },
}
```

### Step 3: genre-service.ts
```ts
export const genreService = {
  getAll() {
    return apiClient.get<{ id: number; name: string; slug: string }[]>('/api/genres')
  },
}
```

### Step 4: chapter-service.ts
```ts
export const chapterService = {
  getList(mangaSlug: string, params: ChapterQueryParams = {}) {
    return apiClient.get<Chapter[]>(`/api/manga/${mangaSlug}/chapters${buildQueryString(params)}`)
  },
  getByNumber(mangaSlug: string, number: string, language?: string) {
    const qs = language ? `?language=${language}` : ''
    return apiClient.get<ChapterWithPages>(`/api/manga/${mangaSlug}/chapters/${number}${qs}`)
  },
}
```

### Step 5: volume-service.ts
```ts
export const volumeService = {
  getList(mangaSlug: string, params: PaginationParams = {}) {
    return apiClient.get<Volume[]>(`/api/manga/${mangaSlug}/volumes${buildQueryString(params)}`)
  },
}
```

### Step 6: use-manga-list.ts
```ts
import { useQuery } from '@tanstack/react-query'
import { mangaService } from '@/services/manga-service'
import { queryKeys } from './query-keys'
import type { MangaQueryParams } from '@mangafire/shared/types'

export function useMangaList(params: MangaQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.manga.list(params),
    queryFn: () => mangaService.getList(params),
    select: (res) => ({ items: res.data ?? [], meta: res.meta }),
  })
}
```

### Step 7: use-manga-detail.ts
```ts
export function useMangaDetail(slug: string) {
  return useQuery({
    queryKey: queryKeys.manga.detail(slug),
    queryFn: () => mangaService.getBySlug(slug),
    enabled: !!slug,
    select: (res) => res.data,
  })
}
```

### Step 8: use-genres.ts
```ts
export function useGenres() {
  return useQuery({
    queryKey: queryKeys.genres.all,
    queryFn: () => genreService.getAll(),
    staleTime: 30 * 60 * 1000, // genres rarely change
    select: (res) => res.data ?? [],
  })
}
```

### Step 9: use-chapters.ts
```ts
export function useChapterList(mangaSlug: string, params: ChapterQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.chapters.list(mangaSlug, params),
    queryFn: () => chapterService.getList(mangaSlug, params),
    enabled: !!mangaSlug,
    select: (res) => ({ items: res.data ?? [], meta: res.meta }),
  })
}

export function useChapterDetail(mangaSlug: string, number: string, language?: string) {
  return useQuery({
    queryKey: queryKeys.chapters.detail(mangaSlug, number),
    queryFn: () => chapterService.getByNumber(mangaSlug, number, language),
    enabled: !!mangaSlug && !!number,
    select: (res) => res.data,
  })
}
```

### Step 10: use-volumes.ts
```ts
export function useVolumeList(mangaSlug: string) {
  return useQuery({
    queryKey: queryKeys.volumes.list(mangaSlug),
    queryFn: () => volumeService.getList(mangaSlug),
    enabled: !!mangaSlug,
    select: (res) => ({ items: res.data ?? [], meta: res.meta }),
  })
}
```

## Todo
- [x] Create `hooks/query-keys.ts`
- [x] Create `services/manga-service.ts`
- [x] Create `services/genre-service.ts`
- [x] Create `services/chapter-service.ts`
- [x] Create `services/volume-service.ts`
- [x] Create `hooks/use-manga-list.ts`
- [x] Create `hooks/use-manga-detail.ts`
- [x] Create `hooks/use-genres.ts`
- [x] Create `hooks/use-chapters.ts`
- [x] Create `hooks/use-volumes.ts`
- [x] Verify `pnpm type-check` passes

## Success Criteria
- All service/hook files compile with `pnpm type-check`
- Each hook returns typed data matching `@mangafire/shared/types`
- Query keys are structured for granular cache invalidation
- `buildQueryString` utility shared via internal helper (DRY)

## Conflict Prevention
- Creates only NEW files -- no existing file modifications
- `auth-service.ts` is untouched (different domain, existing pattern)
- Phase 01 creates `api-client.ts`; this phase only imports it

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Phase 01 not complete when Phase 02 starts | Medium | Medium | Agree on `apiClient` interface upfront; stub if needed |
| Type mismatch between API response and shared types | Medium | Low | Types come from same shared package used by backend |
| `buildQueryString` duplicated across services | Low | Low | Extract to shared util in api-client or separate file |

## Security
- No secrets handled in services or hooks
- Auth token injection is api-client's responsibility

## Next Steps
After completion, Phases 03-05 import these hooks in view components.

## Unresolved Questions
1. Should `buildQueryString` live in `api-client.ts` or a separate `utils/query-string.ts`? Recommendation: keep in `api-client.ts` as a named export for simplicity.
2. Backend genre entity has `{ id, name, slug, description, createdAt, updatedAt }` -- should we add this to shared types? Current Genre type in shared is the frontend display type. Recommendation: add a `GenreEntity` type to shared or inline in genre-service return type.
