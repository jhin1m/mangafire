# Documentation Update: Genre Exclude Feature

**Date**: 2026-02-08
**Scope**: Documentation synchronization for genre exclusion filtering feature

## Changes Made

### 1. docs/codebase-summary.md
**Section**: Key Patterns → Genre Filtering
**Change**: Expanded genre filtering pattern to document tri-state behavior
- Added: tri-state genre filter (include/exclude/null) support via `genreId` and `excludeGenres` query params
- Added: Backend uses `NOT IN` subquery for exclusions
- Maintains: Manga-genres junction table with cascade deletes

**Before**:
```
- **Genre Filtering**: Manga-genres junction table with cascade deletes
```

**After**:
```
- **Genre Filtering**: Manga-genres junction table with cascade deletes; tri-state genre filter (include/exclude/null) via `genreId` and `excludeGenres` query params; backend uses `NOT IN` subquery for exclusions
```

### 2. docs/system-architecture.md
**Section**: API Endpoints → Query Parameters (GET /api/manga)
**Change**: Updated query parameter documentation to include exclusion filters
- Added: `excludeGenres` (array, exclude genres via NOT IN subquery)
- Reorganized: Separated genre filtering into include/exclude variants
- Added: `year` and `minChapters` parameters for completeness

**Before**:
```
GET /api/manga:
- `page` (default: 1), `limit` (default: 20, max: 100)
- `status`, `type`, `genreId`, `search`
- `sortBy` (default: createdAt), `sortOrder` (default: desc)
```

**After**:
```
GET /api/manga:
- `page` (default: 1), `limit` (default: 20, max: 100)
- `status`, `type`, `search`
- `genreId` (include genres), `excludeGenres` (array, exclude genres via NOT IN)
- `sortBy` (default: createdAt), `sortOrder` (default: desc)
- `year` (comma-separated: "2023,2022"), `minChapters` (minimum chapter count)
```

## Source Files Verified

- `packages/shared/src/types/manga.ts` - Confirmed `MangaQueryParams` has `excludeGenres?: number[]`
- `packages/shared/src/types/filter.ts` - Confirmed `GenreFilterState` tri-state type and `FilterDropdown` state prop
- `apps/api/src/routes/manga-helpers.ts` - Filtering implementation uses exclusion logic

## Documentation Standards Met

- Consistent with existing Markdown format and tone
- Aligns with current API architecture documentation
- Concise, technical descriptions without excessive detail
- Cross-referenced between summary and detailed architecture docs

## Notes

- `project-roadmap.md` update deferred to project-manager per instructions
- No code examples required; filtering patterns documented at architecture level
- Frontend filter component changes (`ButtonFilter`, `Genre`, etc.) not documented in architecture docs (handled by component-level JSDoc/comments)
