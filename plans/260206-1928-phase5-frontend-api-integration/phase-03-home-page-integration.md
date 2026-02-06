# Phase 03 - Home Page Integration

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: Phase 01, Phase 02
- Blocks: nothing

## Parallelization Info
- **Can run in parallel with**: Phase 04, Phase 05
- **Exclusive files**: `TopTrending.tsx`, `TrendingCard.tsx`, `MostViewed.tsx`, `RecentlyUpdated/Content.tsx`, `NewRelease.tsx`
- **No shared files with any other phase**

## Overview
Replace hardcoded mock data in all 4 home page sections (TopTrending, MostViewed, RecentlyUpdated, NewRelease) with real API calls via `useMangaList` hook. Add loading/error states.

## Key Insights
- All 4 sections fetch from same endpoint (`GET /api/manga`) with different sort/limit params
- Existing components use local `data` arrays with shape `{ image, title, desc?, releasing?, chapterAndVolume?, genres?, type?, chapters?, link? }` -- these DO NOT match `Manga` entity shape
- **Data mapping required**: API `Manga` -> component display shape
  - `coverImage` -> `image`
  - `description` -> `desc`
  - `status` -> `releasing` (e.g., "ongoing" -> "Releasing")
  - No `chapterAndVolume` field from API -- will need separate chapters query or leave as "N/A" initially
- `TopTrending` uses `GenreTrending` type: `{ image, title, desc, releasing, chapterAndVolume, genres }`
- `MostViewed` / `NewRelease` use `Poster` type: `{ image, title, link? }`
- `RecentlyUpdated/Content` uses `Genre` type: `{ image, type, title, chapters[] }`
- Existing `Loading` component handles loading state

## Requirements
1. Replace all 4 hardcoded data arrays with `useMangaList` calls
2. Map `Manga` API response to each component's display shape
3. Show existing `<Loading>` component during fetch
4. Show error state (toast or fallback UI) on failure
5. Keep existing Swiper/card layout unchanged

## Architecture

```
TopTrending.tsx
  └── useMangaList({ sortBy: 'views', limit: 10, sortOrder: 'desc' })
      └── map Manga[] -> GenreTrending[]

MostViewed.tsx
  └── useMangaList({ sortBy: 'views', limit: 10, sortOrder: 'desc' })
      └── map Manga[] -> Poster[]

RecentlyUpdated/Content.tsx
  └── useMangaList({ sortBy: 'createdAt', limit: 12, sortOrder: 'desc' })
      └── map Manga[] -> Genre[]

NewRelease.tsx
  └── useMangaList({ sortBy: 'createdAt', limit: 20, sortOrder: 'desc' })
      └── map Manga[] -> Poster[]
```

## Related Code Files (Exclusive to Phase 03)

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/src/views/home/components/TopTrending/TopTrending.tsx` | MODIFY | Replace 30-item hardcoded array |
| `apps/web/src/views/home/components/TopTrending/TrendingCard.tsx` | MODIFY | Adapt props if needed |
| `apps/web/src/views/home/components/MostViewed/MostViewed.tsx` | MODIFY | Replace 10-item hardcoded array |
| `apps/web/src/views/home/components/RecentlyUpdated/Content.tsx` | MODIFY | Replace 12-item fakeData array |
| `apps/web/src/views/home/components/NewRelease/NewRelease.tsx` | MODIFY | Replace 20-item hardcoded array |

## Implementation Steps

### Step 1: Create mapper utility
Create inline helper functions inside each component (or a shared `utils/manga-mappers.ts` if repetition warrants).

Manga -> GenreTrending mapping:
```ts
function toTrendingItem(m: Manga): GenreTrending {
  return {
    image: m.coverImage || '/placeholder.jpg',
    title: m.title,
    desc: m.description || '',
    releasing: m.status === 'ongoing' ? 'Releasing' : m.status.charAt(0).toUpperCase() + m.status.slice(1),
    chapterAndVolume: '', // populated later when chapter counts available
    genres: [], // populated from manga detail endpoint if needed
  }
}
```

### Step 2: Update TopTrending.tsx
- Remove hardcoded `data` array (lines 6-277)
- Add `useMangaList({ sortBy: 'views', limit: 10, sortOrder: 'desc' })`
- Map result to trending items
- Wrap Swiper in loading check
- Empty state: show nothing or "No trending manga"

```tsx
const TopTrending = () => {
  const { data, isLoading } = useMangaList({ sortBy: 'views', limit: 10, sortOrder: 'desc' })
  const items = (data?.items ?? []).map(toTrendingItem)

  if (isLoading || items.length === 0) return null

  return (
    <div id="top-trending">
      <div className="container">
        <Swiper ...>{items.map((item, i) => ...)}</Swiper>
        ...
      </div>
    </div>
  )
}
```

### Step 3: Update MostViewed.tsx
- Remove hardcoded `data` array and fake setTimeout loading
- Use `useMangaList({ sortBy: 'views', limit: 10, sortOrder: 'desc' })`
- Map to `Poster[]` shape: `{ image: m.coverImage, title: m.title }`
- Use hook's `isLoading` instead of manual `useState(true)` + setTimeout

### Step 4: Update RecentlyUpdated/Content.tsx
- Remove `fakeData` array (lines 5-272) and exported `Item` type
- Use `useMangaList({ sortBy: 'createdAt', limit: 12, sortOrder: 'desc' })`
- Map to `Genre` shape (the Card component's expected type)
- Note: `chapters` sub-array wont have real data from list endpoint -- set to empty `[]` initially

### Step 5: Update NewRelease.tsx
- Remove hardcoded `data` array (lines 8-132)
- Use `useMangaList({ sortBy: 'createdAt', limit: 20, sortOrder: 'desc' })`
- Map to `Poster[]`: `{ image: m.coverImage, title: m.title, link: '/manga/' + m.slug }`

## Todo
- [x] Update TopTrending.tsx -- remove mock, add hook + mapper
- [x] Update MostViewed.tsx -- remove mock, add hook
- [x] Update RecentlyUpdated/Content.tsx -- remove fakeData, add hook
- [x] Update NewRelease.tsx -- remove mock, add hook
- [x] Verify all Swiper components still render correctly
- [x] Test loading states with network throttling

## Success Criteria
- No hardcoded manga data remains in any home page component
- Loading spinner shows while fetching
- Components render API data correctly
- `pnpm type-check` passes
- Swiper navigation/pagination still functional

## Conflict Prevention
- Only home page view files modified -- no overlap with Filter (Phase 04) or Manga Detail (Phase 05)
- Hooks imported from `@/hooks/` but never modified
- Card/Poster shared components are NOT modified (used as-is)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API Manga shape missing fields Card/Poster expect | High | Medium | Map to display shape; use fallback values |
| Empty DB = blank home page | High | Medium | Seed DB with test data or show "no data" state |
| `chapters` field unavailable in list endpoint | High | Low | Set to empty array; RecentlyUpdated cards show no chapter info initially |

## Security
- No auth required for manga list endpoint -- public data
- No sensitive data displayed

## Next Steps
After completion, home page is fully dynamic. Consider adding error boundary for resilience.

## Unresolved Questions
1. `RecentlyUpdated` Card expects `chapters[]` with `{ info, date, lang }` -- manga list endpoint doesn't return chapters. Options: (a) leave empty, (b) add `?include=latestChapters` backend endpoint later. Recommendation: leave empty for now, add in a follow-up.
2. TopTrending expects `genres` string array -- manga list endpoint doesn't include genres. Same recommendation: leave empty, genres show on detail page.
3. Should we deduplicate the `useMangaList` calls (TopTrending and MostViewed both sort by views)? React Query caches by query key -- if params are identical, they share cache. But limits differ (10 vs 10 currently), so they're separate caches. Keep separate.
