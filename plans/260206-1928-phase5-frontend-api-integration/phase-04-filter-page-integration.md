# Phase 04 - Filter Page Integration

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: Phase 01, Phase 02
- Blocks: nothing

## Parallelization Info
- **Can run in parallel with**: Phase 03, Phase 05
- **Exclusive files**: `views/filter/Filter.tsx`, `views/filter/components/Filters/components/Genre.tsx`
- **No shared files with any other phase**

## Overview
Replace hardcoded 30-item mock data in Filter page with API-driven search results. Sync URL search params with `useMangaList` hook params. Optionally fetch genre list from API for Genre filter dropdown.

## Key Insights
- Filter page already reads URL search params: `keyword`, `type`, `genre`, `status`, `year`, `language`, `length`, `sort`, `page`
- Already has `handleSubmit` that sets search params from form
- Already has `handleChangePage` for pagination
- Missing link: URL params -> API call -> render results
- `MangaQueryParams` supports: `page`, `limit`, `status`, `type`, `genreId`, `search`, `sortBy`, `sortOrder`
- URL param mapping needed:
  - `keyword` -> `search`
  - `type` -> `type` (direct if single value)
  - `genre` -> `genreId` (comma-separated IDs; API supports single genreId only)
  - `status` -> `status`
  - `sort` -> `sortBy` + `sortOrder`
  - `page` -> `page`
- Genre filter component (`Genre.tsx`) has hardcoded genre list -- should fetch from API via `useGenres`
- Pagination component exists and accepts `total`, `currentPage`, `onChange`, `pageSize`

## Requirements
1. Replace hardcoded `data` array in Filter.tsx with `useMangaList` hook
2. Map URL search params to `MangaQueryParams`
3. Connect Pagination component to API's `PaginationMeta`
4. Replace hardcoded genre list in Genre.tsx with `useGenres` hook
5. Show loading state during fetch
6. Show "no results" state when empty

## Architecture

```
Filter.tsx
  ├── useSearchParams() -- existing, reads URL state
  ├── useMangaList(mappedParams) -- NEW
  │     └── params derived from URL search params
  ├── <Filter handleSubmit={...} /> -- existing form (unchanged)
  ├── <Card /> grid -- now from API data
  └── <Pagination total={meta.total} currentPage={meta.page} pageSize={meta.limit} />

Genre.tsx (filter dropdown)
  └── useGenres() -- replaces hardcoded data array
      └── maps genre entities to FilterDropdown shape
```

## Related Code Files (Exclusive to Phase 04)

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/src/views/filter/Filter.tsx` | MODIFY | Replace mock data, add useMangaList, wire pagination |
| `apps/web/src/views/filter/components/Filters/components/Genre.tsx` | MODIFY | Replace hardcoded genre list with useGenres |

## Implementation Steps

### Step 1: URL params to MangaQueryParams mapper
In `Filter.tsx`, create helper:

```ts
function buildApiParams(searchParams: URLSearchParams): MangaQueryParams {
  const params: MangaQueryParams = {}
  const page = searchParams.get('page')
  const keyword = searchParams.get('keyword')
  const type = searchParams.get('type')
  const genre = searchParams.get('genre')
  const status = searchParams.get('status')
  const sort = searchParams.get('sort')

  if (page) params.page = Number(page)
  if (keyword) params.search = keyword
  if (type) params.type = type.split(',')[0] as MangaType  // API supports single
  if (genre) params.genreId = Number(genre.split(',')[0])   // API supports single
  if (status) params.status = status.split(',')[0] as MangaStatus
  if (sort) {
    params.sortBy = sort as MangaQueryParams['sortBy']
    params.sortOrder = 'desc'
  }
  params.limit = 30 // match current display count

  return params
}
```

### Step 2: Update Filter.tsx
- Remove hardcoded `data` array (lines 9-691)
- Add `useMangaList` call with params derived from URL
- Map `Manga[]` to Card-compatible shape
- Wire Pagination with API meta

```tsx
const FilterPage = () => {
  const [searchParams, setSearchParams] = useSearchParams({ page: '1' })
  const apiParams = buildApiParams(searchParams)
  const { data, isLoading } = useMangaList(apiParams)
  const items = data?.items ?? []
  const meta = data?.meta

  // ...existing handleChangePage and handleSubmit...

  return (
    <div className="container">
      <section className="mt-5">
        <Head />
        <Filter handleSubmit={handleSubmit} />
        <Loading loading={isLoading} type="gif">
          {items.length > 0 ? (
            <div className="original card-lg">
              {items.map((item, index) => (
                <Card key={item.slug} item={mapMangaToCard(item)} index={index + 1} />
              ))}
            </div>
          ) : (
            <div className="text-center p-4">No manga found</div>
          )}
        </Loading>
        {meta && (
          <Pagination
            total={meta.total}
            currentPage={meta.page}
            pageSize={meta.limit}
            onChange={handleChangePage}
          />
        )}
      </section>
    </div>
  )
}
```

### Step 3: Manga-to-Card mapper
```ts
function mapMangaToCard(m: Manga) {
  return {
    image: m.coverImage || '/placeholder.jpg',
    type: m.type.charAt(0).toUpperCase() + m.type.slice(1),
    title: m.title,
    chapters: [], // no chapter data from list endpoint
  }
}
```

### Step 4: Update Genre.tsx
- Remove hardcoded `data` array (lines 7-213)
- Use `useGenres()` hook
- Map genre entity to `FilterDropdown` shape: `{ id: genre.slug, value: String(genre.id), label: genre.name }`

```tsx
const Genre = () => {
  const { data: genres = [] } = useGenres()
  const data = genres.map((g) => ({
    id: `genre-${g.slug}`,
    value: String(g.id),
    label: g.name,
  }))

  const [open, setOpen] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))
  const onToggle = () => setOpen((prev) => !prev)

  return (
    <ButtonFilter
      data={data}
      open={open}
      ref={dropdownRef}
      onToggle={onToggle}
      value={EnumFilter.genre}
      dropdownClassName="lg c4 dropdown-menu-right dropdown-menu-md-left"
    />
  )
}
```

## Todo
- [ ] Create `buildApiParams` mapper in Filter.tsx
- [ ] Create `mapMangaToCard` mapper in Filter.tsx
- [ ] Replace hardcoded data in Filter.tsx with useMangaList
- [ ] Wire Pagination with API meta
- [ ] Add loading state with existing Loading component
- [ ] Add empty results state
- [ ] Replace hardcoded genre list in Genre.tsx with useGenres
- [ ] Verify filter form submission triggers new API call
- [ ] Test pagination navigation

## Success Criteria
- Filter page loads manga from API
- Changing page in URL triggers new API call
- Form submission updates URL params which triggers new fetch
- Genre dropdown populated from API
- Loading spinner shown during fetch
- "No manga found" shown for empty results
- `pnpm type-check` passes

## Conflict Prevention
- Only Filter.tsx and Genre.tsx modified -- no overlap with home (Phase 03) or manga detail (Phase 05)
- Other filter components (Type.tsx, Status.tsx, Language.tsx, Year.tsx, Sort.tsx) remain hardcoded for now since the API doesn't have dynamic endpoints for those dropdown values

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API `MangaQueryParams` doesn't support all filter types | Medium | Medium | Map what's available; unsupported filters (year, length) no-op for now |
| Multi-select genre/type not supported by API (single genreId) | High | Medium | Use first selected value; document as future API enhancement |
| Pagination component expects different prop shape | Low | Low | Already checked -- `total`, `currentPage`, `pageSize`, `onChange` match |

## Security
- Public endpoints, no auth needed for search/filter
- User input (keyword) sent as URL param -- API validates via Zod schema

## Next Steps
Future enhancements: multi-genre filter support (requires API change), year/length filter API support, debounced keyword search.

## Unresolved Questions
1. API supports single `genreId` but filter UI allows multi-select genres -- first value used for now. Need backend `genreIds` array param?
2. Filter UI has `year`, `length` dropdowns but API `MangaQueryParams` has no `year` or `length` fields -- leave as non-functional UI? Or hide them?
3. Card component expects `chapters[]` array from list data -- should show empty or fetch separately? Recommendation: empty for now.
