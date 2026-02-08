# Codebase Summary

## Monorepo Structure

### Root Level
- **Configuration**: `pnpm-workspace.yaml`, `tsconfig.base.json`, `.eslintrc.cjs`, `prettier`, `commitlint`, `husky`
- **Scripts**: `pnpm dev` (parallel servers), `pnpm build`, `pnpm lint`, `pnpm format`, `pnpm type-check`
- **Docker**: `docker-compose.yml` with PostgreSQL service

### apps/web (React + TypeScript + Vite)

**Components**
- `src/components/layouts/` - MainLayout, ReadLayout shells
- `src/components/template/` - Layout pieces (Header, Footer, NavMobile)
- `src/components/shared/` - Reusable (Card, Loading, Poster, ShareSocial, SearchInput, SearchAutocomplete, SearchFilters, SearchHistory)
- `src/components/ui/` - Primitives (Modal, Pagination, Spinner, Toast)
- `src/components/route/` - Route guards (AuthorityGuard, ProtectedRoute, PublicRoute)

**Views**
- `src/views/welcome/` - Welcome page
- `src/views/home/` - Manga list
- `src/views/filter/` - Filtering interface
- `src/views/manga/` - Manga detail
- `src/views/read/` - Reading view with configurable modes
- `src/views/search/` - FTS results page with pagination

**State Management**
- `src/store/rootReducer.ts` - Combines auth, theme slices
- `src/store/storeSetup.ts` - ConfigureStore with redux-persist
- `src/store/slices/` - auth, theme slices with localStorage persistence
- `src/store/hook.ts` - useAppDispatch, useAppSelector

**Configuration & Utilities**
- `src/configs/routes.config/appsRoute.tsx` - Protected routes (lazy-loaded), includes /search route
- `src/configs/routes.config/authRoute.tsx` - Public routes
- `src/configs/app.config.ts` - App settings
- `src/configs/theme.config.ts` - Theme defaults
- `src/constants/` - Enums (fit, page, panel, progress, readDirection)
- `src/services/search-service.ts` - API calls for autocomplete and full search
- `src/hooks/use-search.ts` - TanStack Query hooks for search with debouncing
- `src/hooks/use-search-history.ts` - localStorage-backed recent searches (max 10)
- `src/hooks/use-debounce.ts` - Generic debounce hook for search input

**Styling**
- `src/assets/styles/search.css` - SearchInput, SearchAutocomplete, SearchFilters, SearchHistory styles

**Path Alias**: `@/` maps to `src/`

### apps/api (Hono + Drizzle ORM)

**Core**
- `src/index.ts` - Hono app, CORS, error handler, route mounting, auth middleware
- `src/db/client.ts` - Drizzle client (postgres-js)
- `src/db/schema.ts` - 8 tables (manga, genres, manga_genres, users, refresh_tokens, volumes, chapters, chapter_pages), 3 enums, relations

**Routes**
- `src/routes/manga.ts` - CRUD (list, getBySlug, create, update, delete)
- `src/routes/manga-helpers.ts` - Query builders, sort config, genre fetching
- `src/routes/genres.ts` - GET /api/genres
- `src/routes/health.ts` - GET /api/health
- `src/routes/auth.ts` - JWT authentication (register, login, refresh, logout, me)
- `src/routes/chapters.ts` - Chapter CRUD with pages + navigation
- `src/routes/volumes.ts` - Volume CRUD
- `src/routes/chapter-helpers.ts` - Chapter query helpers, navigation builder
- `src/routes/search.ts` - GET /api/search (autocomplete + full FTS modes)
- `src/routes/search-helpers.ts` - Query builders for FTS and trigram autocomplete

**Middleware & Utils**
- `src/middleware/error-handler.ts` - Handles HTTPException, ZodError, DB errors
- `src/lib/api-response.ts` - successResponse, errorResponse, createdResponse, noContentResponse
- `src/lib/pagination.ts` - calculatePagination, getOffsetLimit

**Database**
- `src/db/seed.ts` - Genre seeder (20 genres)
- `src/db/migrations/add-search-fts.sql` - PostgreSQL FTS setup (pg_trgm, search_vector, GIN indexes)
- `src/db/migrations/run-migration.ts` - Migration runner script

### packages/shared (Types & Validators)

**Types**
- `src/types/api.ts` - ApiResponse<T>, PaginationMeta, PaginationParams
- `src/types/manga.ts` - Manga entity, CreateMangaDto, UpdateMangaDto, MangaQueryParams, enums (MangaStatus, MangaType, Language)
- `src/types/auth.ts` - User entity, auth DTOs, JWT payload, auth response
- `src/types/chapter.ts` - Volume, Chapter, ChapterPage, ChapterNavigation, ChapterWithPages, DTOs
- `src/types/filter.ts` - Frontend filter state types
- `src/types/reading.ts` - Reading configuration types
- `src/types/search.ts` - SearchMode, SearchParams, SearchAutocompleteItem, SearchFullItem

**Validators**
- `src/validators/manga.ts` - Zod schemas for DTOs and query params
- `src/validators/api.ts` - Zod schemas for pagination and sorting
- `src/validators/auth.ts` - Zod schemas for register, login
- `src/validators/chapter.ts` - Zod schemas for chapter/volume/page DTOs, query params
- `src/validators/search.ts` - Zod schema for search query parameters (mode, q, page, limit)

**Configuration**: `package.json` exports point to `src/` (no build step, source exports)

## Key Patterns

- **Error Handling**: Zod validation errors → formatted ApiResponse with details
- **Pagination**: Page/limit params → offset/limit calculation → meta in response
- **Genre Filtering**: Manga-genres junction table with cascade deletes; tri-state genre filter (include/exclude/null) via `genreId` and `excludeGenres` query params; backend uses `NOT IN` subquery for exclusions
- **Sorting**: Dynamic sort column/direction based on sortBy/sortOrder params
- **Type Safety**: Shared types across monorepo, moduleResolution: "bundler" for exports resolution
- **Authentication**: JWT with access (15m) + refresh (7d) tokens, bcrypt password hashing, middleware for protected routes
- **Chapter Navigation**: Prev/next links computed from same manga + language context
- **Page Replacement**: Atomic transaction for delete + insert + update pageCount
- **Cascade Deletes**: manga → volumes/chapters, chapters → pages, volumes.delete → chapters.volumeId → null
