# Filter Dropdowns Architecture Report

**Date:** 2026-02-08 19:25  
**Scope:** Complete filter dropdown implementation in mangafire project  
**Status:** Complete

---

## Summary

Tất cả filter dropdown components trong mangafire sử dụng kiến trúc tập trung vào URL params. Mỗi filter dropdown:
- Quản lý state thông qua `useSearchParams`
- Gửi dữ liệu qua form submission với tên field chuẩn (`type[]`, `genre[]`, `status[]`, etc.)
- Hỗ trợ tri-state checkbox cho genre filter (include/exclude/unchecked)
- Lưu vào URL params thay vì Redux state

---

## Các File Liên Quan

### 1. Shared Types & Validators (Source of Truth)

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/packages/shared/src/types/filter.ts`

```typescript
export enum EnumFilter {
  'type' = 'type',
  'genre' = 'genre',
  'status' = 'status',
  'language' = 'language',
  'year' = 'year',
  'length' = 'length',
  'sort' = 'sort',
}

// Tri-state for genre filter: null (unchecked), 'include', 'exclude'
export type GenreFilterState = 'include' | 'exclude' | null

export type FilterDropdown = {
  id: string | undefined
  value: string
  label: string
  checked?: boolean // Keep for backward compat (non-genre filters)
  state?: GenreFilterState // Tri-state for genre filter
}

export type TableQueries = {
  total?: number
  pageIndex?: number
  pageSize?: number
  query?: string
  sort?: {
    order: 'asc' | 'desc' | ''
    key: string | number
  }
}
```

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/packages/shared/src/validators/filter.ts`

```typescript
export const filterDropdownSchema = z.object({
  id: z.string().optional(),
  value: z.string(),
  label: z.string(),
  checked: z.boolean().optional(),
})
```

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/packages/shared/src/types/manga.ts`

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
  year?: string // Comma-separated: "2023,2022,2000s"
  minChapters?: number // Minimum chapter count (>= value)
  excludeGenres?: number[] // Genre IDs to exclude (NOT IN)
}
```

---

### 2. Frontend Types

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/@types/common.ts`

```typescript
export type CommonFilterProps = {
  data: import('@mangafire/shared').FilterDropdown[]
  value: import('@mangafire/shared').EnumFilter
  onToggle: () => void
  open: boolean
  dropdownClassName?: string
  type?: 'checkbox' | 'radio'
  triState?: boolean // Enable tri-state cycling (Genre filter)
}
```

---

### 3. Filter Page (Main View)

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/Filter.tsx`

Mục đích: Render trang filter với lịch sử, danh sách manga, pagination

```typescript
const FilterPage = () => {
  const location = useLocation()
  const { slug: genreSlug } = useParams<{ slug: string }>()
  const { data: genres = [] } = useGenres()
  const [searchParams, setSearchParams] = useSearchParams({ page: '1' })

  // Xây dựng params từ URL cho API call
  const apiParams = buildApiParams(searchParams, routeConfig, genreFromSlug?.id)
  const { data, isLoading } = useMangaList(apiParams)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const type = formData.getAll('type[]')
    const genre = formData.getAll('genre[]')
    const genreExclude = formData.getAll('genre_exclude[]')
    const status = formData.getAll('status[]')
    const year = formData.getAll('year[]')
    const language = formData.getAll('language[]')
    const length = formData.get('length')
    const sort = formData.get('sort')
    
    // Ghi vào URL params
    setSearchParams((prev) => {
      prev.set('page', '1')
      type && prev.set('type', type.join(','))
      genre && prev.set('genre', genre.join(','))
      genreExclude.length > 0 ? 
        prev.set('genre_exclude', genreExclude.join(',')) : 
        prev.delete('genre_exclude')
      // ... other params
      return prev
    })
  }
}
```

**URL Parameter Mapping:**
- `type=manga,manhwa` → multiple type selection
- `genre=1,2` → include genres 1,2
- `genre_exclude=3,4` → exclude genres 3,4
- `status=ongoing,completed`
- `year=2023,2022,2000s`
- `language=en,ja`
- `length=10` → minimum 10 chapters (radio, single value)
- `sort=updatedAt` → sort field (radio, single value)

---

### 4. Filter Dropdown Components

#### **Type Filter**

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/components/Filters/components/Type.tsx`

```typescript
const Type = () => {
  const [searchParams] = useSearchParams()
  const defaults = searchParams.get('type')?.split(',') || []
  
  // Checkbox mode: multiple selection
  const data = useMemo(
    () => baseData.map((item) => ({
      ...item,
      checked: defaults.includes(item.value),
    })),
    [defaults.join(',')]
  )

  const [open, setOpen] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))

  return (
    <ButtonFilter
      key={defaults.join(',')}
      data={data}
      open={open}
      ref={dropdownRef}
      onToggle={() => setOpen(prev => !prev)}
      value={EnumFilter.type}
      dropdownClassName="c1"
    />
  )
}
```

baseData: `[ { id: 'type-manga', value: 'manga', label: 'Manga' }, ... ]`

---

#### **Genre Filter (Tri-State Reference)**

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/components/Filters/components/Genre.tsx`

```typescript
const Genre = () => {
  const [searchParams] = useSearchParams()
  const includes = searchParams.get('genre')?.split(',') || []
  const excludes = searchParams.get('genre_exclude')?.split(',') || []

  const { data: genres = [] } = useGenres()
  const data = useMemo(() => genres.map((g) => {
    const val = String(g.id)
    let state: GenreFilterState = null
    if (includes.includes(val)) state = 'include'
    else if (excludes.includes(val)) state = 'exclude'
    return {
      id: `genre-${g.slug}`,
      value: val,
      label: g.name,
      checked: state !== null,
      state,
    }
  }), [genres, includes.join(','), excludes.join(',')])

  return (
    <ButtonFilter
      key={`${includes.join(',')}-${excludes.join(',')}`}
      data={data}
      open={open}
      ref={dropdownRef}
      onToggle={onToggle}
      value={EnumFilter.genre}
      triState  // Enable tri-state cycling
      dropdownClassName="lg c4 dropdown-menu-right dropdown-menu-md-left"
    />
  )
}
```

Tri-state cycle: `null → include → exclude → null`

---

#### **Status Filter**

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/components/Filters/components/Status.tsx`

```typescript
baseData = [
  { id: 'status-completed', value: 'completed', label: 'Completed' },
  { id: 'status-releasing', value: 'ongoing', label: 'Releasing' },
  { id: 'status-on_hiatus', value: 'hiatus', label: 'On Hiatus' },
  { id: 'status-discontinued', value: 'cancelled', label: 'Discontinued' },
]

// Checkbox mode - same as Type
```

---

#### **Language Filter**

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/components/Filters/components/Language.tsx`

```typescript
baseData = [
  { id: 'lang-en', value: 'en', label: 'English' },
  { id: 'lang-ja', value: 'ja', label: 'Japanese' },
  { id: 'lang-fr', value: 'fr', label: 'French' },
  // ... more languages
]

// Checkbox mode
```

---

#### **Year Filter**

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/components/Filters/components/Year.tsx`

```typescript
baseData = [
  { id: 'year-2023', value: '2023', label: '2023' },
  // ... specific years
  { id: 'year-2000s', value: '2000s', label: '2000s' },
  { id: 'year-1990s', value: '1990s', label: '1990s' },
]

// Checkbox mode - supports both exact years and decades
```

**API handling:** Backend phân tích "2000s" thành range: `between(releaseYear, 2000, 2009)`

---

#### **Length Filter**

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/components/Filters/components/Length.tsx`

```typescript
baseData = [
  { id: 'minchap-1', value: '1', label: '>= 1 chapters' },
  { id: 'minchap-10', value: '10', label: '>= 10 chapters' },
  { id: 'minchap-50', value: '50', label: '>= 50 chapters' },
]

const Length = () => {
  const [searchParams] = useSearchParams()
  const defaultValue = searchParams.get('length') || ''

  // RADIO mode: single selection
  return (
    <ButtonFilter
      key={defaultValue}
      data={data}
      open={open}
      type="radio"  // <-- Radio instead of checkbox
      ref={dropdownRef}
      onToggle={onToggle}
      value={EnumFilter.length}
      dropdownClassName="c1"
    />
  )
}
```

---

#### **Sort Filter**

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/components/Filters/components/Sort.tsx`

```typescript
baseData = [
  { id: 'sort-updatedAt', value: 'updatedAt', label: 'Recently updated' },
  { id: 'sort-createdAt', value: 'createdAt', label: 'Recently added' },
  { id: 'sort-releaseYear', value: 'releaseYear', label: 'Release date' },
  { id: 'sort-views', value: 'views', label: 'Trending' },
  { id: 'sort-title', value: 'title', label: 'Name A-Z' },
  { id: 'sort-rating', value: 'rating', label: 'Scores' },
]

const Sort = ({ defaultSort }: SortProps) => {
  // RADIO mode with route-aware defaults
  return (
    <ButtonFilter
      data={data}
      open={open}
      type="radio"
      ref={dropdownRef}
      onToggle={onToggle}
      value={EnumFilter.sort}
      dropdownClassName="c1 dropdown-menu-right dropdown-menu-xs-left"
    />
  )
}
```

---

### 5. Core Dropdown Component (ButtonFilter)

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/filter/components/Filters/components/ButtonFilter.tsx`

Đây là component lõi xử lý tất cả dropdown logic.

**Key Features:**

1. **Checkbox State Management:**
```typescript
const [selectedItems, setSelectedItems] = useState<Set<string>>(
  () => new Set(checkedLabels)
)

const handleChange = (label: string, checked: boolean) => {
  setSelectedItems((prev) => {
    const next = new Set(prev)
    if (type === 'radio') {
      next.clear()
      next.add(label)
    } else {
      if (checked) next.add(label)
      else next.delete(label)
    }
    return next
  })
}
```

2. **Tri-State Genre Filter:**
```typescript
const [genreStates, setGenreStates] = useState<Map<string, GenreFilterState>>(() => {
  if (!triState) return new Map()
  return new Map(data.map((item) => [item.value, item.state ?? null]))
})

const handleTriStateClick = (itemValue: string, label: string, e: React.MouseEvent) => {
  e.preventDefault()
  const currentState = genreStates.get(itemValue) ?? null
  let nextState: GenreFilterState = null
  
  if (currentState === null) nextState = 'include'
  else if (currentState === 'include') nextState = 'exclude'
  else nextState = null
  
  setGenreStates((prev) => {
    const next = new Map(prev)
    next.set(itemValue, nextState)
    return next
  })
}
```

3. **Form Field Generation (cho Tri-State):**
```typescript
{triState && (
  <>
    {/* Hidden inputs for include genres */}
    {Array.from(genreStates.entries())
      .filter(([_, state]) => state === 'include')
      .map(([itemValue]) => (
        <input key={`inc-${itemValue}`} type="hidden" name="genre[]" value={itemValue} />
      ))
    }
    {/* Hidden inputs for exclude genres */}
    {Array.from(genreStates.entries())
      .filter(([_, state]) => state === 'exclude')
      .map(([itemValue]) => (
        <input key={`exc-${itemValue}`} type="hidden" name="genre_exclude[]" value={itemValue} />
      ))
    }
  </>
)}
```

4. **Display Label Logic:**
```typescript
const getDisplayLabel = (): string | undefined => {
  const count = selectedItems.size
  if (count === 0) return undefined
  if (count === 1) return [...selectedItems][0]
  return `${count} selected`
}
```

5. **Responsive Overlay (for Genre & Year):**
```typescript
const isResponsive = [EnumFilter.genre, EnumFilter.year].includes(value)

<CSSTransition
  mountOnEnter
  unmountOnExit
  timeout={300}
  nodeRef={overlayRef}
  in={isResponsive && open}
  classNames="overlay"
>
  <div ref={overlayRef} className="overlay" onClick={onToggle}></div>
</CSSTransition>
```

---

### 6. CSS Styling

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/assets/styles/dropdown.css`

```css
/* Dropdown animations */
.dropdown-enter {
  opacity: 0;
  transform: translateY(30px);
}
.dropdown-enter-active {
  opacity: 1;
  transition: opacity 0.4s, transform 0.4s;
  transform: translateY(0px);
}

.dropdown-exit {
  opacity: 1;
  transform: translateY(0px);
}
.dropdown-exit-active {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.4s, transform 0.4s;
}

/* Menu expand/collapse animations */
.menu-enter {
  opacity: 0;
  height: 0px;
}
.menu-enter-active {
  height: var(--height);
  opacity: 1;
  transition: all 0.3s;
}

.menu-enter-done {
  height: auto;
  opacity: 1;
}

.menu-exit-active {
  opacity: 0;
  height: 0px;
  padding: 0 !important;
  transition: all 0.3s;
}
```

---

### 7. Backend Query Processing

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/api/src/routes/manga-helpers.ts`

```typescript
// Year filter parsing: "2023,2022,2000s" → range queries
function parseYearFilter(yearParam: string): { exactYears: number[]; decades: number[] } {
  const exactYears: number[] = []
  const decades: number[] = []
  for (const val of yearParam.split(',')) {
    const trimmed = val.trim()
    if (trimmed.endsWith('s')) {
      const decade = parseInt(trimmed.slice(0, -1), 10)
      if (!isNaN(decade)) decades.push(decade)
    } else {
      const year = parseInt(trimmed, 10)
      if (!isNaN(year)) exactYears.push(year)
    }
  }
  return { exactYears, decades }
}

// Build WHERE conditions
export function buildMangaConditions(params: MangaQueryParams) {
  const conditions = []
  
  if (params.status) {
    conditions.push(eq(manga.status, params.status))
  }
  if (params.type) {
    conditions.push(eq(manga.type, params.type))
  }
  if (params.year) {
    const { exactYears, decades } = parseYearFilter(params.year)
    const yearConditions = []
    if (exactYears.length > 0) {
      yearConditions.push(inArray(manga.releaseYear, exactYears))
    }
    for (const decade of decades) {
      yearConditions.push(between(manga.releaseYear, decade, decade + 9))
    }
    if (yearConditions.length > 0) {
      conditions.push(or(...yearConditions)!)
    }
  }
  if (params.minChapters) {
    conditions.push(
      gte(
        sql<number>`(SELECT COUNT(*) FROM chapters WHERE chapters.manga_id = ${manga.id})`,
        params.minChapters
      )
    )
  }
  return conditions
}

// Genre filtering: include & exclude
export function buildGenreConditions(params: MangaQueryParams) {
  const conditions = []

  // Single genre include
  if (params.genreId) {
    const includeSubquery = db
      .select({ mangaId: mangaGenres.mangaId })
      .from(mangaGenres)
      .where(eq(mangaGenres.genreId, params.genreId))
    conditions.push(inArray(manga.id, includeSubquery))
  }

  // Multi-genre exclude
  if (params.excludeGenres?.length) {
    const excludeSubquery = db
      .selectDistinct({ mangaId: mangaGenres.mangaId })
      .from(mangaGenres)
      .where(inArray(mangaGenres.genreId, params.excludeGenres))
    conditions.push(notInArray(manga.id, excludeSubquery))
  }

  return conditions
}
```

---

### 8. Search Functionality (Related)

**File:** `/Users/jhin1m/Desktop/ducanh-project/mangafire/apps/web/src/views/search/Search.tsx`

Search view tương tự filter nhưng đơn giản hơn:

```typescript
const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const params: SearchParams = {
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || undefined,
    type: searchParams.get('type') || undefined,
    genreId: searchParams.get('genreId') ? Number(searchParams.get('genreId')) : undefined,
    page: Number(searchParams.get('page')) || 1,
    limit: 20,
  }

  // Hiển thị active filters
  const activeFilters = []
  if (params.status) activeFilters.push({ id: 'status', label: `Status: ${params.status}` })
  if (params.type) activeFilters.push({ id: 'type', label: `Type: ${params.type}` })

  const handleRemoveFilter = (id: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete(id)
    newParams.set('page', '1')
    setSearchParams(newParams)
  }
}
```

---

## Workflow Diagram

```
User Action (Click checkbox)
        ↓
ButtonFilter.handleChange() / handleTriStateClick()
        ↓
Update local state (selectedItems / genreStates)
        ↓
Update button display label
        ↓
Form submit (User clicks "Filter" button)
        ↓
FormData extraction from form fields
        ↓
buildApiParams() - Convert form data to URL params
        ↓
setSearchParams() - Update URL (triggers re-render)
        ↓
useMangaList() - Call API with new params
        ↓
Display results
```

---

## Checkbox State Management Pattern

### Standard Checkboxes (Type, Status, Language, Year)

1. **URL → Initial State:**
   ```typescript
   const defaults = searchParams.get('type')?.split(',') || []
   // URL: ?type=manga,manhwa → defaults = ['manga', 'manhwa']
   ```

2. **State → Display:**
   ```typescript
   const data = baseData.map(item => ({
     ...item,
     checked: defaults.includes(item.value)
   }))
   // Mark selected items as checked
   ```

3. **Form → URL:**
   ```typescript
   const type = formData.getAll('type[]')
   // Form inputs with name="type[]" → ['manga', 'manhwa']
   setSearchParams(prev => {
     prev.set('type', type.join(','))
     return prev
   })
   // URL: ?type=manga,manhwa
   ```

### Radio Buttons (Length, Sort)

```typescript
// Only one value at a time
const defaultValue = searchParams.get('length') || ''
// If set: ?length=10

const data = baseData.map(item => ({
  ...item,
  checked: item.value === defaultValue  // Single match
}))

// Form submission - single value
const length = formData.get('length')
prev.set('length', length)
// URL: ?length=10
```

### Tri-State Checkboxes (Genre ONLY)

```typescript
const includes = searchParams.get('genre')?.split(',') || []
const excludes = searchParams.get('genre_exclude')?.split(',') || []

// Map to tri-state values
let state: GenreFilterState = null
if (includes.includes(val)) state = 'include'
else if (excludes.includes(val)) state = 'exclude'

// On form submit:
// - 'include' genres → hidden inputs with name="genre[]"
// - 'exclude' genres → hidden inputs with name="genre_exclude[]"
// URL: ?genre=1,2&genre_exclude=3,4
```

---

## API Parameter Mapping

| Frontend | URL Param | API Param | Type | Notes |
|----------|-----------|-----------|------|-------|
| Type dropdown | type=manga,manhwa | type | string | First value only sent to API |
| Genre dropdown | genre=1,2 | genreId | number | Only first genre used (backward compat) |
| Genre exclude | genre_exclude=3,4 | excludeGenres | number[] | Array of IDs to exclude |
| Status dropdown | status=ongoing,completed | status | string | First value only |
| Year dropdown | year=2023,2022,2000s | year | string | Comma-separated, supports decades |
| Language dropdown | language=en,ja | language | string | NOT currently used in API |
| Length dropdown | length=10 | minChapters | number | Minimum chapter count |
| Sort dropdown | sort=updatedAt | sortBy, sortOrder | string | sortOrder auto-determined |
| Page | page=1 | page | number | |

---

## URL Example

```
/filter?type=manga&genre=1&genre_exclude=5,6&status=ongoing&year=2023,2022,2000s&length=10&sort=updatedAt&page=1
```

Breaks down to:
- Types: manga
- Genres include: 1
- Genres exclude: 5, 6
- Status: ongoing
- Years: 2023, 2022, 2000-2009
- Min chapters: 10
- Sort: by updated date
- Page: 1

---

## Key Implementation Notes

1. **URL is source of truth** - Not Redux store. Reload page preserves filters.

2. **Form-based submission** - Filter button gathers all form inputs, not individual onChange handlers.

3. **Comma-separated values** - Multi-select values joined by comma in URL.

4. **Tri-state genre** - Component generates hidden form fields for include/exclude based on internal state.

5. **Radio vs Checkbox** - Controlled by ButtonFilter `type` prop. Length & Sort use radio, others use checkbox.

6. **Backend parsing** - Year filter supports "2000s" syntax, parsed to decade ranges.

7. **Responsive dropdowns** - Genre & Year have overlay for mobile (CSS transition-based).

8. **Button label logic** - Shows placeholder if nothing selected, first item if 1 selected, "N selected" if multiple.

9. **Local state sync** - Each dropdown component syncs with URL params via `useEffect` when data changes.

10. **Click outside** - Custom hook `useClickOutside` closes dropdown when clicking outside.

---

## File Structure Summary

```
filter/
├── Filter.tsx (Main page + form submission)
├── components/
│   ├── Head/
│   │   └── Head.tsx (Title + count display)
│   ├── Filters/
│   │   ├── Filter.tsx (Form wrapper)
│   │   └── components/
│   │       ├── Type.tsx (Checkbox)
│   │       ├── Genre.tsx (Tri-state checkbox)
│   │       ├── Status.tsx (Checkbox)
│   │       ├── Language.tsx (Checkbox)
│   │       ├── Year.tsx (Checkbox with decades)
│   │       ├── Length.tsx (Radio)
│   │       ├── Sort.tsx (Radio)
│   │       └── ButtonFilter.tsx (Core component)
│   └── index.ts
└── index.ts

search/
├── Search.tsx (Main page)
└── index.ts

shared/
├── SearchFilters/
│   ├── SearchFilters.tsx (Filter chips display)
│   └── index.ts

styles/
└── dropdown.css (Animation styles)

shared types/
├── filter.ts (EnumFilter, FilterDropdown, GenreFilterState)
├── manga.ts (MangaQueryParams)
└── search.ts (SearchParams)

api/
└── routes/
    ├── manga.ts (GET /api/manga endpoint)
    ├── manga-helpers.ts (Query building logic)
    └── search.ts (Search endpoints)
```

---

## Unresolved Questions

None - architecture fully documented and understood.

---

## Quick Reference - All Files Located

### Core Component Stack
1. **ButtonFilter.tsx** - Universal dropdown wrapper (checkbox/radio/tri-state)
2. **Type.tsx, Genre.tsx, Status.tsx, Language.tsx, Year.tsx, Length.tsx, Sort.tsx** - Individual filter dropdowns
3. **Filter.tsx** (in components/) - Form container that wraps all dropdowns
4. **Filter.tsx** (in views/) - Main page with list, pagination, form submission

### State & Data Flow
- **URL params** = single source of truth (via useSearchParams)
- **FormData** = extraction point from form elements
- **Local state** = button label display + dropdown open/close
- **API call** = MangaQueryParams built from URL

### Key Pattern
```
URL params → Individual filter components read defaults
                          ↓
         Each component builds dropdown UI with checkmarks
                          ↓
         User clicks checkboxes (updates local visual state only)
                          ↓
         User submits form (collects FormData from inputs)
                          ↓
         handleSubmit extracts checked values and joins with commas
                          ↓
         setSearchParams updates URL with new filter values
                          ↓
         useMangaList hook fires with new URL params
                          ↓
         API returns filtered manga list
```

### For Implementing New Filter
1. Add enum value to `EnumFilter` in shared/types/filter.ts
2. Create new component in views/filter/components/Filters/components/
3. Read URL param with `useSearchParams().get('your-filter')`
4. Map to FilterDropdown[] with checked/state properties
5. Pass to `<ButtonFilter type="checkbox|radio" triState={false} />`
6. Extract in Filter.tsx handleSubmit with formData.getAll/get
7. Add to setSearchParams with name="your-filter[]" (checkbox) or "your-filter" (radio)
8. Backend: add to MangaQueryParams and buildMangaConditions

### Tri-State Genre Implementation
- Uses Map<value, 'include'|'exclude'|null> for state
- Generates hidden form inputs for each state
- Click cycles: null → include → exclude → null
- Form submission: two hidden input arrays (genre[], genre_exclude[])
- URL: ?genre=1,2&genre_exclude=3,4

