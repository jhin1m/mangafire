# Phase 3: Frontend Tri-State UI

## Context

- [Plan](./plan.md) | [Frontend Research](./research/researcher-frontend-tristate-checkbox.md)

## Parallelization Info

- **Parallel** with Phase 2 (Backend)
- **Blocks**: Phase 4
- **Blocked by**: Phase 1

## Overview

Implement tri-state genre checkboxes (unchecked -> include -> exclude) in the filter UI. Leverage existing CSS `.exclude` class for visual states. Track genre states in component, emit `genre_exclude[]` hidden inputs for form submission, and reflect in URL params.

## File Ownership

| File | Action |
|------|--------|
| `apps/web/src/views/filter/components/Filters/components/Genre.tsx` | Tri-state data mapping, read `genre_exclude` URL param |
| `apps/web/src/views/filter/components/Filters/components/ButtonFilter.tsx` | Tri-state click handler, `.exclude` class toggle, hidden inputs for excludes |
| `apps/web/src/@types/common.ts` | Add `triState?: boolean` to `CommonFilterProps` |
| `apps/web/src/views/filter/Filter.tsx` | Collect `genre_exclude[]` from FormData, set `genre_exclude` URL param |

## Key Insights

- CSS already defines 3 visual states: unchecked icon (`\f0c8`), include icon (`\f0fe`), exclude icon (`\f146` via `input.exclude`)
- `ButtonFilter` uses native `<input type="checkbox">` with `defaultChecked`. For tri-state, override `onClick` to cycle states manually
- FormData collects `genre[]` values from checked inputs. Excluded genres need separate hidden `<input name="genre_exclude[]">` elements
- `selectedItems` Set in ButtonFilter tracks count display -- must be updated to count both include and exclude items

## Requirements

1. Genre checkbox click cycle: unchecked -> include (checked) -> exclude (checked + `.exclude`) -> unchecked
2. Existing CSS handles visuals -- only need to toggle `checked` attribute and `.exclude` class via JS
3. URL params: `genre=1,2` (included) + `genre_exclude=3,4` (excluded)
4. On page load, restore tri-state from URL params (both `genre` and `genre_exclude`)
5. ButtonFilter display text: show count including both include + exclude selections
6. Other filter types (Type, Status, etc.) unaffected -- `triState` opt-in flag

## Architecture

```
Genre.tsx
  - Reads `genre` + `genre_exclude` URL params
  - Maps genres to FilterDropdown[] with `state` field
  - Passes `triState={true}` to ButtonFilter

ButtonFilter.tsx (when triState=true)
  - Replaces onChange with onClick cycle handler
  - Maintains Map<string, GenreFilterState> internally
  - Toggles `.exclude` class on <input> via ref or className
  - Renders hidden <input name="genre_exclude[]"> for excluded items
  - Updates selectedItems count for display text
```

## Implementation Steps

### Step 1: Add `triState` prop to `CommonFilterProps` in `@types/common.ts`

```typescript
export type CommonFilterProps = {
  // ... existing fields
  triState?: boolean  // Enable tri-state cycling (Genre filter)
}
```

### Step 2: Update `Genre.tsx` -- read both URL params, set initial state

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
      triState
      // ... rest unchanged
    />
  )
}
```

### Step 3: Update `ButtonFilter.tsx` -- tri-state click cycle

When `triState` is enabled:
- Track `Map<string, GenreFilterState>` state from initial `data[].state`
- On click: cycle null -> include -> exclude -> null
- Set `input.checked` and toggle `.exclude` class via ref
- Render hidden inputs for excluded items:

```tsx
// For each excluded genre, render hidden input for form collection
{triState && Array.from(genreStates.entries())
  .filter(([_, s]) => s === 'exclude')
  .map(([value]) => (
    <input key={`ex-${value}`} type="hidden" name="genre_exclude[]" value={value} />
  ))
}
```

- For included genres, the existing checked `<input name="genre[]">` handles form submission
- For excluded genres, must ensure `<input>` is checked (so it submits as `genre[]`) -- NO, excluded items should NOT appear in `genre[]`. Override: use `onClick` + `preventDefault` to control `checked` state manually, OR separate the include/exclude into different hidden inputs.

**Approach**: Use controlled component pattern:
1. Prevent default checkbox behavior via `onClick` handler with `e.preventDefault()`
2. Manage `checked` and `.exclude` class via React state + refs
3. Render hidden `<input name="genre[]">` only for includes
4. Render hidden `<input name="genre_exclude[]">` only for excludes
5. Visible checkbox is purely visual (no `name` attribute when triState)

### Step 4: Update `Filter.tsx` (FilterPage) -- collect `genre_exclude` from FormData

```typescript
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const formData = new FormData(e.target as HTMLFormElement)
  // ... existing fields
  const genreExclude = formData.getAll('genre_exclude[]') || ''

  setSearchParams((prev) => {
    // ... existing param setting
    if (genreExclude.length > 0) {
      prev.set('genre_exclude', genreExclude.join(','))
    } else {
      prev.delete('genre_exclude')
    }
    return prev
  })
}
```

Also update `buildApiParams` to pass `excludeGenres`:

```typescript
const genreExclude = searchParams.get('genre_exclude')
if (genreExclude) {
  params.excludeGenres = genreExclude.split(',').map(Number).filter(Boolean)
}
```

## Todo

- [x] Add `triState?: boolean` to `CommonFilterProps` in `@types/common.ts`
- [x] Update `Genre.tsx` to read both `genre` and `genre_exclude` URL params
- [x] Map genre data with `state` field from URL params
- [x] Pass `triState` prop to `ButtonFilter`
- [x] Implement tri-state click cycle in `ButtonFilter.tsx` (null -> include -> exclude -> null)
- [x] Toggle `.exclude` class on checkbox input elements
- [x] Render hidden `<input name="genre_exclude[]">` for excluded genres
- [x] Remove `name` from visible checkboxes when triState; use hidden inputs for both include and exclude
- [x] Update `selectedItems` count to reflect both includes and excludes
- [x] Update `Filter.tsx` handleSubmit to collect `genre_exclude[]` from FormData
- [x] Update `buildApiParams` to parse `genre_exclude` URL param into `excludeGenres`
- [x] Verify CSS `.exclude` styling renders correctly (minus icon, muted text)

## Implementation Status

✅ **COMPLETED** (2026-02-08)
- All tasks completed successfully
- Type check passes
- Report: `plans/reports/fullstack-developer-260208-1038-phase3-frontend-tristate-ui.md`

## Success Criteria

- Clicking genre cycles: unchecked -> green check -> red minus -> unchecked
- URL reflects `genre=1,2&genre_exclude=3,4` after form submit
- Page reload restores tri-state from URL params
- Non-genre filters (Type, Status, etc.) unaffected
- `pnpm type-check` passes in `apps/web`
- Display text shows total count of active selections (include + exclude)

## Conflict Prevention

- Only modifies files in `apps/web/` -- Phase 2 never touches web files
- `@types/common.ts` change is additive (optional prop)
- `ButtonFilter.tsx` changes are gated behind `triState` flag -- existing non-tristate filters untouched

## Risk Assessment

- **Medium risk**: Overriding native checkbox behavior with controlled component pattern. Must ensure form submission still collects correct values.
- **Mitigation**: Use hidden inputs for form data, visible checkbox purely visual
- **Medium risk**: State restoration from URL on page load. Must handle edge case where same genre appears in both include and exclude params.
- **Mitigation**: Exclude takes priority if conflict exists

## Security Considerations

- Genre IDs from URL params are validated as numbers before API call
- No XSS risk -- values are numeric IDs, not user-generated strings
- Hidden inputs with `name="genre_exclude[]"` submit only pre-validated genre IDs

## Next Steps

After completion (along with Phase 2), proceed to Phase 4 integration testing.
