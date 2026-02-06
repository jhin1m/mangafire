# Phase 04: Manga Route Handlers - Implementation Report

## Executed Phase
- Phase: phase-04-route-handlers
- Plan: plans/260206-1614-manga-crud-api/
- Status: completed

## Files Modified
- **NEW** `apps/api/src/routes/manga.ts` (174 lines)
- **NEW** `apps/api/src/routes/manga-helpers.ts` (159 lines)
- **NEW** `apps/api/src/routes/genres.ts` (14 lines)
- **MODIFIED** `apps/api/src/index.ts` (+8 lines)

Total additions: ~355 lines

## Tasks Completed
- [x] Installed @hono/zod-validator dependency
- [x] Created manga route handlers with 5 endpoints:
  - GET / — List manga (paginated, filtered, sorted)
  - GET /:slug — Get single manga with genres
  - POST / — Create manga with genre associations
  - PATCH /:slug — Update manga and genres
  - DELETE /:slug — Delete manga
- [x] Created genres route handler:
  - GET / — List all genres ordered by name
- [x] Refactored manga.ts to keep under 200 lines (extracted helpers)
- [x] Updated index.ts with error handler and route mounts
- [x] Added PATCH to CORS allowMethods
- [x] Type-check passed

## Implementation Details

### Manga Routes (`apps/api/src/routes/manga.ts`)
- Uses `zValidator` for query/body validation via Zod schemas
- Dynamic WHERE condition building for status, type, search filters
- Special handling for genreId filter (requires innerJoin)
- Explicit column selection when joining to avoid Drizzle shape issues
- Sorting with dynamic column mapping (rating, views, createdAt, title)
- Genre associations handled via junction table operations
- Proper 404 responses for non-existent manga
- 201 for creation, 204 for deletion

### Helper Functions (`apps/api/src/routes/manga-helpers.ts`)
Extracted 6 helpers to keep main file under 200 lines:
- `buildMangaConditions` — Builds WHERE clauses
- `getSortConfig` — Maps sortBy string to Drizzle column + direction
- `fetchMangaWithGenreFilter` — Query with genreId join
- `fetchMangaWithoutGenreFilter` — Standard query
- `fetchMangaGenres` — Fetch associated genres for manga
- `updateMangaGenreAssociations` — Delete old + insert new genre links

### Genres Routes (`apps/api/src/routes/genres.ts`)
- Single GET endpoint listing all genres
- Ordered alphabetically by name

### Index Updates
- Imported error handler + new routes
- Error handler registered via `app.onError()` before routes
- Routes mounted at `/api/manga` and `/api/genres`
- Added PATCH to CORS config

## Tests Status
- Type check: **PASS**
- Build: not run (awaiting DB setup)
- Runtime tests: pending (requires DB + seed data)

## Issues Encountered
1. Initial TypeScript error: sortColumn inferred as potentially undefined
   - Fixed with fallback: `sortColumn || manga.createdAt`
   - Used `as const` assertion for type safety
2. manga.ts exceeded 200 lines (252 initially)
   - Refactored into manga-helpers.ts
   - Final: manga.ts 174 lines, helpers 159 lines

## Next Steps
Phase 04 complete. Full CRUD API ready pending:
- Database schema migration execution
- Seed data population
- Manual API testing via curl/Postman
- Integration testing if needed

## Unresolved Questions
None. All phase requirements met.
