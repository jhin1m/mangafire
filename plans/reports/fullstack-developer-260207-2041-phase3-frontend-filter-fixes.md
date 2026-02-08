# Phase 3 Implementation Report — Frontend Filter Fixes

## Executed Phase
- **Phase**: Phase 3 — Frontend Filter Fixes
- **Plan**: Filter dropdown fixes (multi-phase plan)
- **Status**: ✅ Completed

## Files Modified

### 1. `/apps/web/src/views/filter/Filter.tsx` (21 lines modified)
- Modified `buildApiParams()` to compute `sortOrder` based on sort type ('title' → 'asc', others → 'desc')
- Added year/length param forwarding: `params.year` and `params.minChapters`
- Computed `activeSort` from query params or route defaults
- Passed `defaultSort={activeSort}` to Filter component

### 2. `/apps/web/src/views/filter/components/Filters/Filter.tsx` (4 lines modified)
- Added `defaultSort?: string` to FilterProps type
- Destructured and passed to Sort component with `key={defaultSort}` for remount on route change

### 3. `/apps/web/src/views/filter/components/Filters/components/Sort.tsx` (21 lines modified)
- Renamed `data` → `baseData` (moved outside component)
- Added `SortProps` type with `defaultSort?: string`
- Implemented `useMemo` to compute data with `checked: true` on first match
- Used `matched` flag to handle duplicate values (e.g., 'views' appears 3 times)

### 4. `/apps/web/src/views/filter/components/Filters/components/ButtonFilter.tsx` (1 line modified)
- Changed `checked={item.checked}` → `defaultChecked={item.checked}` to prevent React controlled-input warnings

### 5. `/apps/web/src/views/filter/components/Filters/components/Status.tsx` (3 lines modified)
- Fixed enum value mismatches:
  - `releasing` → `ongoing`
  - `on_hiatus` → `hiatus`
  - `info` → `cancelled`
- Labels remain unchanged (user-facing)

## Tasks Completed

✅ Fix 1: `Filter.tsx` — buildApiParams + defaultSort computation
✅ Fix 2: `components/Filters/Filter.tsx` — Accept and pass defaultSort prop
✅ Fix 3: `Sort.tsx` — Show default selection with useMemo + matched flag
✅ Fix 4: `ButtonFilter.tsx` — Use defaultChecked to fix React warnings
✅ Fix 5: `Status.tsx` — Correct enum value mismatches

## Tests Status

- **Type check**: ✅ PASS (pnpm type-check — both apps/api and apps/web clean)
- **Unit tests**: N/A (no test framework configured)
- **Integration tests**: N/A
- **Lint**: ⚠️ Pre-existing lint errors unrelated to changes (784 errors in codebase, none from this phase)

## Issues Encountered

None. All fixes applied cleanly. Type checks pass without errors.

## Next Steps

- Phase 4: End-to-end validation (test all routes + filters in browser)
- Verify sort dropdowns show correct defaults on /newest, /updated, /added
- Test year/length filters persist and query API correctly
- Confirm status filter values map to backend enum

## Technical Notes

**Sort logic**:
- Title sort uses `asc` order (A-Z)
- All other sorts use `desc` order (newest/highest first)

**Duplicate handling in Sort.tsx**:
- `views` appears 3 times in baseData (Trending, Most viewed, Most favourited)
- `matched` flag ensures only FIRST occurrence gets checked when defaultSort='views'

**Key prop on Sort**:
- Forces component remount when route changes (e.g., /newest → /updated)
- Prevents stale sort selection from previous route

**Year/Length forwarding**:
- `MangaQueryParams` already has `year` and `minChapters` fields (added in Phase 1)
- Phase 2 backend already handles these params
- Phase 3 just connects frontend query params → API params
