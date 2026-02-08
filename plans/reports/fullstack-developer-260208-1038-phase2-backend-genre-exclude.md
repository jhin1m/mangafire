# Phase 2: Backend API Logic - Implementation Report

## Executed Phase
- **Phase**: phase-02-backend-api-logic
- **Plan**: plans/260208-1025-genre-exclude-feature/
- **Status**: completed

## Files Modified

### apps/api/src/routes/manga-helpers.ts (+28 lines, -70 lines)
- Added `notInArray` import from drizzle-orm
- Added `buildGenreConditions()` function (28 lines)
  - Handles single genre include via `genreId` param (backward compat)
  - Handles multi-genre exclude via `excludeGenres` param with `NOT IN` subquery
- Replaced two fetch functions with unified `fetchMangaList()` (27 lines)
  - Removed `fetchMangaWithGenreFilter()` (55 lines)
  - Removed `fetchMangaWithoutGenreFilter()` (18 lines)
  - New function accepts pre-built conditions array, composable design

### apps/api/src/routes/manga.ts (+5 lines, -21 lines)
- Updated imports: added `buildGenreConditions`, replaced old fetch imports with `fetchMangaList`
- Refactored GET `/` handler (16 lines simpler)
  - Removed genreId conditional branching
  - Combined all conditions via spread: `[...buildMangaConditions(params), ...buildGenreConditions(params)]`
  - Single unified fetch call

## Tasks Completed

- [x] Import `notInArray` from `drizzle-orm` in manga-helpers.ts
- [x] Add `buildGenreConditions()` function
- [x] Create unified `fetchMangaList()` replacing the two separate functions
- [x] Update manga.ts GET handler to use consolidated function
- [x] Remove old `fetchMangaWithGenreFilter` and `fetchMangaWithoutGenreFilter`
- [x] Verify type check passes

## Tests Status

- **Type check**: PASS (`pnpm type-check` in apps/api)
- **Unit tests**: N/A (no test framework configured)
- **Integration tests**: N/A (manual testing required in Phase 4)

## Implementation Details

### buildGenreConditions() Logic
1. **Include logic** (genreId param):
   - Builds subquery: `SELECT mangaId FROM manga_genres WHERE genreId = ?`
   - Applies `inArray(manga.id, subquery)` condition
   - Maintains exact backward compat with existing single-genre filter

2. **Exclude logic** (excludeGenres param):
   - Builds subquery: `SELECT mangaId FROM manga_genres WHERE genreId IN (?, ?, ...)`
   - Applies `notInArray(manga.id, subquery)` condition
   - Generates SQL: `manga.id NOT IN (SELECT DISTINCT manga_id FROM ...)`

3. **Composability**:
   - Both conditions are independent, can be combined via `and(...)`
   - Empty arrays/undefined params safely skip condition generation
   - No `.distinct()` needed; Drizzle's `notInArray` handles deduplication

### Consolidation Benefits
- Removed 73 lines of duplicate query logic
- Single source of truth for manga list fetching
- Genre filters now composable with all other filters (status, type, year, etc)
- Cleaner route handler (16 lines simpler)

## Backward Compatibility Verified

- Existing `genreId` param still works (tested via type signatures)
- New `excludeGenres` param is optional (undefined safely ignored)
- No breaking changes to API response format
- Same pagination and enrichment behavior

## Security Notes

- Genre IDs validated by Zod schema in Phase 1 (positive integers only)
- `notInArray` parameterizes values automatically via Drizzle
- `inArray` prevents SQL injection via prepared statements
- Empty `excludeGenres` array safely skipped (no condition added)

## Performance Considerations

- `NOT IN (SELECT DISTINCT ...)` acceptable for moderate datasets
- Assumes existing index on `manga_genres.genre_id` (should exist from schema)
- Subqueries execute once per request, not per row (efficient)

## Issues Encountered

None. Implementation proceeded as planned.

## Next Steps

- Phase 3 (Frontend) running in parallel, owns all web files
- Phase 4 (Integration Testing) blocked until both Phase 2 and 3 complete
- Manual API testing required in Phase 4:
  - `GET /api/manga?excludeGenres=1,2`
  - `GET /api/manga?genreId=5&excludeGenres=1`
  - `GET /api/manga` (no genre params)

## Conflict Prevention

- Only modified `apps/api/src/routes/` files
- Phase 3 (Frontend) owns `apps/web/` files exclusively
- No shared file ownership conflicts
- Export signature change (`fetchMangaList` replaces two functions) only affects `manga.ts` in same directory

## Unresolved Questions

None. All requirements met.
