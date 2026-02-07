# Phase B: Frontend (Sort mapping, route awareness, dynamic Head)

**Effort**: 2h | **Depends on**: Phase A (shared types must include `updatedAt`)

## Context
All filter-style pages (`/filter`, `/newest`, `/updated`, `/added`, `/genre/:slug`) render the same `Filter.tsx`. Issues:
1. Sort dropdown values (`recently_updated`, `scores`, etc.) don't match backend enum (`createdAt`, `rating`, etc.)
2. No route-specific default sorting (all pages behave identically)
3. Head always says "Filter" with hardcoded "39,080 mangas"
4. `/genre/:slug` doesn't extract slug from URL to auto-apply genre filter
5. Duplicate `/newest` route in appsRoute.tsx

## Changes

### 1. Remove duplicate /newest route — `appsRoute.tsx`

**File**: `apps/web/src/configs/routes.config/appsRoute.tsx` (lines 30-34)

Delete the duplicate entry (lines 35-39):
```ts
// REMOVE this block (second occurrence):
{
  key: 'app.newest',
  path: '/newest',
  component: lazy(() => import('@/views/filter/Filter')),
  authority: [],
},
```

Keep only one `/newest` entry (lines 30-34).

### 2. Remap Sort dropdown values — `Sort.tsx`

**File**: `apps/web/src/views/filter/components/Filters/components/Sort.tsx`

Keep all 9 sort options but map their `value` to backend-compatible enum values:

```ts
const data = [
  { id: 'sort-updatedAt', value: 'updatedAt', label: 'Recently updated' },
  { id: 'sort-createdAt', value: 'createdAt', label: 'Recently added' },
  { id: 'sort-releaseYear', value: 'releaseYear', label: 'Release date' },
  { id: 'sort-views-trending', value: 'views', label: 'Trending' },
  { id: 'sort-title', value: 'title', label: 'Name A-Z' },
  { id: 'sort-rating', value: 'rating', label: 'Scores' },
  { id: 'sort-rating-mal', value: 'rating', label: 'MAL scores' },
  { id: 'sort-views', value: 'views', label: 'Most viewed' },
  { id: 'sort-views-fav', value: 'views', label: 'Most favourited' },
]
```

**Mapping rationale** (validated by user):
- `trending` → `views` (closest available metric)
- `scores` / `mal_scores` → `rating` (both map to the same rating column)
- `most_viewed` / `most_favourited` → `views` (favourites column doesn't exist yet)
- `release_date` → `releaseYear` (column exists in DB)

### 3. Route-aware defaults + genre slug — `Filter.tsx`

**File**: `apps/web/src/views/filter/Filter.tsx`

#### 3a. Add route config map

Above `FilterPage` component, define route-specific defaults:

```ts
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useGenres } from '@/hooks/use-genres'

const ROUTE_CONFIG: Record<string, { title: string; sortBy: MangaQueryParams['sortBy']; sortOrder: 'asc' | 'desc' }> = {
  '/newest': { title: 'Newest', sortBy: 'releaseYear', sortOrder: 'desc' },
  '/updated': { title: 'Updated', sortBy: 'updatedAt', sortOrder: 'desc' },
  '/added': { title: 'Recently Added', sortBy: 'createdAt', sortOrder: 'desc' },
  '/filter': { title: 'Filter', sortBy: 'createdAt', sortOrder: 'desc' },
}
```

#### 3b. Modify `buildApiParams` to accept route defaults + genreId

```ts
function buildApiParams(
  searchParams: URLSearchParams,
  routeDefaults?: { sortBy?: MangaQueryParams['sortBy']; sortOrder?: 'asc' | 'desc' },
  genreIdFromSlug?: number
): MangaQueryParams {
  const params: MangaQueryParams = { limit: 30 }
  const page = searchParams.get('page')
  const keyword = searchParams.get('keyword')
  const type = searchParams.get('type')
  const genre = searchParams.get('genre')
  const status = searchParams.get('status')
  const sort = searchParams.get('sort')

  if (page) params.page = Number(page)
  if (keyword) params.search = keyword
  if (type) params.type = type.split(',')[0] as MangaType
  if (status) params.status = status.split(',')[0] as MangaStatus

  // Genre: URL param takes priority, then slug-derived genreId
  if (genre) {
    params.genreId = Number(genre.split(',')[0])
  } else if (genreIdFromSlug) {
    params.genreId = genreIdFromSlug
  }

  // Sort: URL param takes priority, then route defaults
  if (sort) {
    params.sortBy = sort as MangaQueryParams['sortBy']
    params.sortOrder = 'desc'
  } else if (routeDefaults) {
    params.sortBy = routeDefaults.sortBy
    params.sortOrder = routeDefaults.sortOrder
  }

  return params
}
```

#### 3c. Inside `FilterPage`, derive route config and genre slug

```ts
const FilterPage = () => {
  const location = useLocation()
  const { slug: genreSlug } = useParams<{ slug: string }>()
  const { data: genres = [] } = useGenres()
  const [searchParams, setSearchParams] = useSearchParams({ page: '1' })

  // Derive route config
  const pathname = location.pathname
  const isGenreRoute = pathname.startsWith('/genre/')
  const routeConfig = isGenreRoute
    ? { title: '', sortBy: 'createdAt' as const, sortOrder: 'desc' as const }
    : ROUTE_CONFIG[pathname] || ROUTE_CONFIG['/filter']

  // Resolve genre slug to genreId
  const genreFromSlug = genreSlug
    ? genres.find((g) => g.slug === genreSlug)
    : undefined
  const genreTitle = isGenreRoute && genreFromSlug ? genreFromSlug.name : routeConfig.title

  const apiParams = buildApiParams(searchParams, routeConfig, genreFromSlug?.id)
  const { data, isLoading } = useMangaList(apiParams)
  const items = data?.items ?? []
  const meta = data?.meta

  useEffect(() => {
    document.title = `${genreTitle} - MangaFire`
  }, [genreTitle])

  // ... rest unchanged, except Head:
  // <Head title={genreTitle} count={meta?.total} />
```

**Note**: `useParams` works here because `Filter.tsx` IS rendered inside `<Routes>` (it's the route component, not a layout). The route is `/genre/:slug`, so `useParams` correctly provides `slug`.

#### 3d. Pass props to Head

Change the Head rendering:
```tsx
<Head title={genreTitle} count={meta?.total} />
```

### 4. Dynamic Head — `Head.tsx`

**File**: `apps/web/src/views/filter/components/Head/Head.tsx`

```tsx
type HeadProps = {
  title?: string
  count?: number
}

const Head = ({ title = 'Filter', count }: HeadProps) => {
  const formatted = count !== undefined ? count.toLocaleString() : ''
  return (
    <div className="head">
      <h2>{title}</h2>
      {formatted && <span>{formatted} mangas</span>}
    </div>
  )
}

export default Head
```

### 5. Update Head export — `components/Head/index.ts`

If `Head/index.ts` re-exports default, no change needed. Verify:
```ts
export { default } from './Head'
// or
export { default as Head } from './Head'
```

### 6. Update Filter (form component) to pass handleSubmit — no change needed
The inner `Filter.tsx` (form) already receives `handleSubmit` as prop. No modification required.

## File Summary
| File | Action |
|------|--------|
| `appsRoute.tsx` | Remove duplicate /newest (lines 35-39) |
| `Sort.tsx` | Replace data array with backend-compatible values |
| `Filter.tsx` (page) | Add ROUTE_CONFIG, modify buildApiParams, extract genre slug |
| `Head.tsx` | Accept title+count props |

## Verification
```bash
pnpm type-check
pnpm dev:web
# Manual test:
# 1. /newest — title "Newest", sorted by releaseYear desc
# 2. /updated — title "Updated", sorted by updatedAt desc
# 3. /added — title "Recently Added", sorted by createdAt desc
# 4. /genre/action — title "Action", auto-filters by action genre
# 5. /filter — title "Filter", sort dropdown works with correct values
# 6. Sort dropdown shows 9 options all mapped to valid backend values
```

## Edge Cases
- `/genre/:slug` with invalid slug: `genreFromSlug` is undefined, no genreId passed, shows all manga. Title falls back to empty string (shows "Filter"). Consider adding a "Genre not found" state in future.
- `useGenres()` loading: while genres are loading, genreFromSlug is undefined. First render shows unfiltered data, then re-renders with correct filter once genres load. TanStack Query's `staleTime: 30min` means this only happens on first visit.
