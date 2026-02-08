# Phase 3: Frontend Filter Fixes

## Context

- [Plan](./plan.md)
- Research: [frontend](./research/researcher-01-frontend-filters.md)

## Parallelization

- **Blocks**: None
- **Blocked by**: Phase 1 (Shared types)
- Runs in parallel with Phase 2

## Overview

Five fixes in the frontend:
1. Route-specific default sort selection in Sort dropdown
2. Fix Name A-Z sort direction (DESC -> ASC)
3. Wire year filter to API params
4. Wire length filter to API params
5. Fix Status enum mismatch (FE values → BE enum)

## Key Insights

- `ButtonFilter.tsx` already supports `checked` on `FilterDropdown` items (line 70) — just need to pass `checked: true` on the correct item
- Sort is a `radio` type, so only one item should be `checked` at a time
- `buildApiParams()` hardcodes `sortOrder: 'desc'` (line 55) when `?sort=` exists — must special-case `title` to use `asc`
- Year/length params are already collected in `handleSubmit` and placed in URL — just need `buildApiParams()` to forward them to `MangaQueryParams`
- Sort/Filter components need access to current route's default sort to show correct checked state

## Requirements

1. Sort dropdown pre-selects correct option based on route or URL `?sort=` param
2. `title` sortBy always uses `sortOrder: 'asc'`
3. `buildApiParams()` reads `year` and `length` from URL, maps to `year` and `minChapters` in API params
4. No Redux changes needed — all state flows through URL params

## Architecture

Data flow for default sort:
```
FilterPage (routeConfig.sortBy + searchParams.sort)
  -> Filter (defaultSort prop)
    -> Sort (defaultSort prop)
      -> ButtonFilter (data items with checked flag)
```

## File Ownership (Exclusive to Phase 3)

- `apps/web/src/views/filter/Filter.tsx`
- `apps/web/src/views/filter/components/Filters/Filter.tsx`
- `apps/web/src/views/filter/components/Filters/components/Sort.tsx`
- `apps/web/src/views/filter/components/Filters/components/ButtonFilter.tsx`
- `apps/web/src/views/filter/components/Filters/components/Year.tsx`
- `apps/web/src/views/filter/components/Filters/components/Length.tsx`
- `apps/web/src/views/filter/components/Filters/components/Status.tsx`
- `apps/web/src/@types/common.ts`

## Related Code (Read-Only Reference)

- `packages/shared/src/types/manga.ts` — updated in Phase 1
- `packages/shared/src/types/filter.ts` — `FilterDropdown` type has `checked?: boolean`
- `apps/web/src/hooks/use-manga-list.ts` — no changes needed
- `apps/web/src/services/manga-service.ts` — no changes needed

## Implementation Steps

### Step 1: Fix `buildApiParams()` — Name A-Z order + year/length forwarding

**File**: `apps/web/src/views/filter/Filter.tsx`

Replace lines 52-59 in `buildApiParams()`:

```typescript
  // Sort: URL query param takes priority, then route defaults
  if (sort) {
    params.sortBy = sort as MangaQueryParams['sortBy']
    // "Name A-Z" (title) should sort ascending; everything else descending
    params.sortOrder = sort === 'title' ? 'asc' : 'desc'
  } else if (routeDefaults) {
    params.sortBy = routeDefaults.sortBy
    params.sortOrder = routeDefaults.sortOrder
  }

  // Year filter: forward comma-separated string to API
  const year = searchParams.get('year')
  if (year) params.year = year

  // Length filter: forward as minChapters integer
  const length = searchParams.get('length')
  if (length) params.minChapters = Number(length)
```

Also, pass the resolved `defaultSort` value down. Compute it after `routeConfig`:

Add after `const apiParams = ...` line (line 94), compute the active sort value to pass to Filter:

```typescript
  // Determine the active sort for dropdown default selection
  const activeSort = searchParams.get('sort') || routeConfig.sortBy || 'createdAt'
```

Update `<Filter>` JSX to pass `defaultSort`:

```tsx
<Filter handleSubmit={handleSubmit} defaultSort={activeSort} />
```

### Step 2: Update Filter form component to accept and forward `defaultSort`

**File**: `apps/web/src/views/filter/components/Filters/Filter.tsx`

```typescript
import { Genre, Language, Length, Sort, Status, Type, Year } from './components'

type FilterProps = {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  defaultSort?: string
}

const Filter = (props: FilterProps) => {
  const { handleSubmit, defaultSort } = props

  return (
    <form id="filters" autoComplete="off" onSubmit={handleSubmit}>
      <div>
        <div className="search">
          <input
            type="text"
            className="form-control"
            placeholder="Search..."
            name="keyword"
          />
        </div>
        <Type />
        <Genre />
        <Status />
        <Language />
        <Year />
        <Length />
        <Sort defaultSort={defaultSort} />
        <div>
          <button type="submit" className="btn btn-primary">
            <i className="fa-regular fa-circles-overlap fa-xs"></i>
            <span>Filter</span> <i className="ml-2 bi bi-intersect"></i>
          </button>
        </div>
      </div>
    </form>
  )
}

export default Filter
```

### Step 3: Update Sort component to show default selection

**File**: `apps/web/src/views/filter/components/Filters/components/Sort.tsx`

Accept `defaultSort` prop and map it to `checked` on the matching data item:

```typescript
import { memo, useMemo, useState } from 'react'

import { EnumFilter } from '@/@types/common'
import { useClickOutside } from '@/utils/hooks'
import ButtonFilter from './ButtonFilter'

// Sort values map directly to backend sortBy enum values
const baseData = [
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

type SortProps = {
  defaultSort?: string
}

const Sort = ({ defaultSort }: SortProps) => {
  const [open, setOpen] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))
  const onToggle = () => setOpen((prev) => !prev)

  // Mark the first matching item as checked based on defaultSort value
  const data = useMemo(() => {
    if (!defaultSort) return baseData
    let matched = false
    return baseData.map((item) => {
      if (!matched && item.value === defaultSort) {
        matched = true
        return { ...item, checked: true }
      }
      return item
    })
  }, [defaultSort])

  return (
    <ButtonFilter
      data={data}
      open={open}
      ref={dropdownRef}
      dropdownClassName="c1 dropdown-menu-right dropdown-menu-xs-left"
      onToggle={onToggle}
      value={EnumFilter.sort}
      type="radio"
    />
  )
}

export default memo(Sort)
```

**Note on duplicate values**: `views` maps to 3 options and `rating` to 2. Using `matched` flag ensures only the FIRST matching option gets checked. For `views`, that's "Trending"; for `rating`, that's "Scores". This is acceptable — the backend treats them identically anyway.

### Step 4: Fix ButtonFilter `checked` behavior for radio inputs

**File**: `apps/web/src/views/filter/components/Filters/components/ButtonFilter.tsx`

The `<input>` at line 65-71 has `checked={item.checked}` but this is a **controlled input without onChange** — React will warn and the input becomes unclickable. For radio buttons, we need `defaultChecked` instead:

Replace line 70:
```typescript
// Before:
checked={item.checked}
// After:
defaultChecked={item.checked}
```

Full input element:
```tsx
<input
  type={type}
  id={item.id}
  name={type === 'checkbox' ? `${value}[]` : value}
  value={item.value}
  defaultChecked={item.checked}
/>
```

This uses uncontrolled inputs (matching the form submission pattern via `FormData`).

### Step 5: Verify Year and Length already work end-to-end

**No code changes needed** in `Year.tsx` and `Length.tsx`. They already:
1. Render checkboxes/radio inputs with correct `name` attributes (`year[]` and `length`)
2. Get collected by `handleSubmit()` in `Filter.tsx`
3. Get placed in URL as `?year=2023,2022` and `?length=10`

Step 1 ensures `buildApiParams()` now reads these from URL and forwards to the API.

However, verify that `Year.tsx` items should also reflect URL state on page load. For the initial implementation, this is not critical — users won't see stale UI on first load since URL params drive the API call. This can be a follow-up enhancement.

### Step 6: Fix Status enum mismatch

**File**: `apps/web/src/views/filter/components/Filters/components/Status.tsx`

FE status values don't match BE enum. Update the `value` fields:

| FE current value | BE expected value |
|-----------------|-------------------|
| `releasing` | `ongoing` |
| `on_hiatus` | `hiatus` |
| `info` | `cancelled` |

Update the `data` array items to use correct backend enum values while keeping the user-facing labels unchanged.

## Todo

- [ ] Fix `buildApiParams()`: special-case `title` sort to use `asc` order
- [ ] Add year/length param forwarding in `buildApiParams()`
- [ ] Compute `activeSort` in FilterPage, pass to `<Filter>`
- [ ] Update `Filter.tsx` component to accept and forward `defaultSort` prop
- [ ] Update `Sort.tsx` to accept `defaultSort`, mark matching item as `checked`
- [ ] Change `ButtonFilter.tsx` from `checked` to `defaultChecked`
- [ ] Verify Sort dropdown shows correct pre-selection on `/newest`, `/updated`, `/added`
- [ ] Verify "Name A-Z" sends `sortOrder=asc` to API
- [ ] Verify `?year=2023` appears in API request
- [ ] Verify `?length=10` appears as `minChapters=10` in API request
- [ ] Fix Status.tsx enum values: `releasing` → `ongoing`, `on_hiatus` → `hiatus`, `info` → `cancelled`
- [ ] Run `pnpm type-check` and `pnpm lint` for `apps/web`

## Success Criteria

- Visiting `/newest` shows "Release date" ticked in Sort dropdown
- Visiting `/updated` shows "Recently updated" ticked
- Visiting `/added` shows "Recently added" ticked
- Clicking "Name A-Z" and filtering sends `sortBy=title&sortOrder=asc` to API
- Selecting year(s) and filtering includes `year=...` in API request
- Selecting length and filtering includes `minChapters=...` in API request
- No React console warnings about controlled inputs

## Conflict Prevention

- Only Phase 3 touches files in `apps/web/`
- Phase 2 handles `apps/api/` exclusively
- Shared package was updated in Phase 1 (read-only reference here)

## Risk Assessment

- **Low risk**: `defaultChecked` is standard React for uncontrolled form inputs. The form already uses `FormData` for submission.
- **Low risk (duplicate sort values)**: The "first match" strategy for `checked` is pragmatic. Backend produces identical results for all three `views` options anyway.
- **Medium risk (stale defaults)**: If user navigates between `/newest` and `/updated`, the `defaultSort` prop changes but `defaultChecked` is uncontrolled — it won't update. Mitigation: add a `key` prop to `<Sort>` that includes `defaultSort` to force remount.

### Remount mitigation (important)

In `Filter.tsx`, force remount of Sort on `defaultSort` change:

```tsx
<Sort key={defaultSort} defaultSort={defaultSort} />
```

This ensures navigating from `/newest` to `/updated` correctly updates the checked radio button.
