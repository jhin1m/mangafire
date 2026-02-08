# Project Roadmap

## Phase 1 - Foundation (COMPLETED)

### Monorepo Setup
- [x] pnpm workspaces configuration
- [x] Shared tsconfig.base.json
- [x] Root ESLint, Prettier, Husky, Commitlint
- [x] Path alias (@/) configuration
- [x] Docker PostgreSQL setup

### Frontend Scaffold
- [x] React + TypeScript + Vite setup
- [x] Redux Toolkit with redux-persist
- [x] React Router DOM layout system
- [x] MainLayout and ReadLayout shells
- [x] Component directory structure
- [x] Basic UI components (Card, Modal, Pagination, Spinner, Toast)

### Status
- **Completed**: 6 Feb 2026
- **Commits**: `f559ae2`, `669a494`

## Phase 2 - Manga CRUD API (COMPLETED)

### Backend Infrastructure
- [x] Hono REST API setup
- [x] Drizzle ORM with postgres-js driver
- [x] Database schema (manga, genres, manga_genres tables)
- [x] 3 enums (status, type, language)
- [x] Relations and cascade deletes
- [x] Indexes for performance (slug, status, type)

### API Endpoints
- [x] GET /api/health - Health check
- [x] GET /api/manga - List with pagination, filtering, sorting
- [x] GET /api/manga/:slug - Get single manga with genres
- [x] POST /api/manga - Create manga with genre associations
- [x] PATCH /api/manga/:slug - Update manga fields and genres
- [x] DELETE /api/manga/:slug - Delete manga (cascade)
- [x] GET /api/genres - List all genres

### Shared Package
- [x] TypeScript types (Manga, DTOs, enums)
- [x] Zod validators (create, update, query params)
- [x] API response types
- [x] Pagination types

### Quality
- [x] Zod request validation
- [x] Centralized error handler
- [x] ApiResponse wrapper for all responses
- [x] Genre seed script (20 genres)
- [x] CORS configuration

### Status
- **Completed**: 6 Feb 2026
- **Commits**: `669a494`

## Phase 3 - Authentication (COMPLETED)

### Backend
- [x] JWT token generation and validation
- [x] Password hashing (bcrypt)
- [x] User table schema (email, password hash, profile)
- [x] Protected route middleware

### Frontend
- [x] Login form component
- [x] Register form component
- [x] Token storage (Redux + localStorage)
- [x] API interceptor for auth headers
- [x] Logout functionality

### API Endpoints
- [x] POST /api/auth/register - Create user account
- [x] POST /api/auth/login - Generate JWT token
- [x] POST /api/auth/logout - Invalidate session
- [x] GET /api/auth/profile - Get current user
- [x] PATCH /api/auth/profile - Update user profile

### Access Control
- [x] Protect write endpoints (POST, PATCH, DELETE)
- [x] Enforce JWT validation
- [x] Rate limiting on auth endpoints

### Status
- **Completed**: 6 Feb 2026
- **Commits**: `bb67db6`, `89f6d50`

## Phase 4 - Chapters & Volumes (IN PROGRESS)

### Schema ✅
- [x] chapters table (mangaId, number, title, slug, pages)
- [x] volumes table (mangaId, number, title)
- [x] chapter_pages table (chapterId, number, imageUrl)

### API Endpoints ✅
- [x] GET /api/manga/:slug/chapters - List chapters
- [x] POST /api/manga/:slug/chapters - Create chapter
- [x] GET /api/manga/:slug/chapters/:number - Get chapter details
- [x] PATCH /api/manga/:slug/chapters/:number - Update chapter
- [x] DELETE /api/manga/:slug/chapters/:number - Delete chapter
- [x] GET /api/manga/:slug/volumes - List volumes
- [x] POST /api/manga/:slug/volumes - Create volume
- [x] PATCH /api/manga/:slug/volumes/:number - Update volume
- [x] DELETE /api/manga/:slug/volumes/:number - Delete volume

### Frontend — Chapter List ⚠️
- [x] Basic chapter list with numbers, titles, dates (manga detail + reader sidebar)
- [x] Volume tabs with API data
- [x] Loading and empty states
- [ ] Chapter list pagination (currently fetches all — breaks with 500+ chapters)
- [ ] Chapter search functionality (input exists but non-functional)
- [ ] Remove hardcoded 200-chapter limit in reader sidebar

### Frontend — Page Navigation ✅
- [x] Prev/next chapter buttons from API navigation data
- [x] Progress bar with correct page count from API
- [x] Header navigation (prev/next page, prev/next chapter)
- [x] Disabled states at navigation edges

### Frontend — Image Loading ⚠️
- [x] Display chapter page images from API URLs
- [x] Preload 4 pages ahead (double page mode)
- [x] Viewport-based page tracking (long strip mode)
- [ ] Lazy loading (all images load at once — poor on slow connections)
- [ ] Image placeholder/skeleton while loading
- [ ] Error handling for broken images (no fallback, no retry)
- [ ] Consistent referrerPolicy across all page modes

### Status
- **Backend**: Completed 6 Feb 2026
- **Frontend**: In progress — basic functionality works, needs pagination + image optimization
- **Commits**: `b65e0c2`, `2681832`

## Phase 5 - Frontend API Integration (COMPLETED)

### Data Fetching
- [x] Replace mock manga data with API calls (TanStack Query v5)
- [x] Implement loading and error states (per-view Spinner + error messages)
- [x] Add request/response interceptors (api-client with JWT auto-inject)
- [x] Implement caching strategy (TanStack Query: 5min staleTime, 1 retry)

### Views Integration
- [x] Home page: fetch from GET /api/manga (TopTrending, MostViewed, RecentlyUpdated, NewRelease)
- [x] Filter page: implement query params (URL params → API params mapping)
- [x] Manga detail: fetch from GET /api/manga/:slug (chapters, volumes, recommendations)
- [ ] Admin panel: create/update forms (deferred to future phase)

### Reader Integration
- [x] ReaderContext provider for shared reader state
- [x] Chapter pages from API (replaces hardcoded 56-page mock)
- [x] Chapter navigation (prev/next) from API navigation data
- [x] Reader header/controls wired to real manga/chapter data

### Search and Filtering
- [x] Genre multi-select filtering (via filter page URL params)
- [x] Genre include/exclude filtering (tri-state checkboxes, NOT IN subquery) — 8 Feb 2026
- [x] Status and type dropdowns (via filter page)
- [x] Sort options aligned with backend enum (rating, views, createdAt, updatedAt, releaseYear, title)
- [x] Route-specific default sorting (/newest, /updated, /added)
- [x] Dynamic filter page title and count from API
- [x] Genre slug auto-filter on /genre/:slug route
- [ ] Full search with autocomplete (deferred to Phase 7)

### Status
- **Completed**: 6 Feb 2026
- **Filter fix**: 7 Feb 2026 — sort value mismatch, route defaults, dynamic Head, genre slug
- **Genre exclude feature**: 8 Feb 2026 — tri-state checkboxes, backend NOT IN filtering, URL params
- **Commits**: `f40ed7a`, `31477eb`, `2681832`, and feature branch merge

## Phase 6 - File Uploads (NEXT)

### Infrastructure
- [ ] Local file storage setup
- [ ] Image validation (format, size)
- [ ] Image resize/optimization
- [ ] CDN integration (future)

### Features
- [ ] Cover image upload for manga
- [ ] Chapter page image uploads
- [ ] Image preview before upload
- [ ] Batch upload for chapter pages

### API Endpoints
- [ ] POST /api/manga/:slug/cover - Upload cover image
- [ ] POST /api/manga/:slug/chapters/:number/pages - Upload page images

## Phase 7 - Advanced Search (COMPLETED)

### Database ✅
- [x] PostgreSQL tsvector setup with pg_trgm extension
- [x] Full-text search indexes (GIN) with weighted ranking
- [x] Search vector generated column (auto-updated on INSERT/UPDATE)
- [x] Trigram indexes for typo-tolerant autocomplete

### API ✅
- [x] GET /api/search - Two-tier search endpoint
  - Autocomplete mode: trigram-based fuzzy matching (q param)
  - Full mode: FTS with weighted ranking (title A, description B, alt titles/author/artist C)
- [x] Autocomplete: /api/search?q=text&mode=autocomplete (top 10 results)
- [x] Full search: /api/search?q=text&mode=full&page=1&limit=20 (paginated FTS results)

### Frontend ✅
- [x] SearchInput component with Downshift autocomplete (WAI-ARIA)
- [x] SearchAutocomplete dropdown with keyboard navigation
- [x] SearchFilters chip component
- [x] SearchHistory component (max 10 entries, localStorage-backed)
- [x] /search results page with FTS display
- [x] useSearch, useSearchHistory, useDebounce custom hooks
- [x] search-service API client layer
- [x] Integrated search in Header (MainLayout)
- [x] Downshift library dependency

### Status
- **Completed**: 8 Feb 2026
- **Code Review**: Passed with 1 critical security fix (RegEx injection)
- **Commits**: Feature branch ready for merge
- **Effort**: 9h (parallel execution across 5 phases)
- **Files**: 20 new/modified (5 backend, 2 shared, 13 frontend)

## Phase 8 - Production Deployment

### CI/CD
- [ ] GitHub Actions workflows
- [ ] Automated testing on PR
- [ ] Build and deploy to staging
- [ ] Production deployment pipeline

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Database backups
- [ ] Log aggregation

### Infrastructure
- [ ] Production database
- [ ] Container registry
- [ ] Load balancing
- [ ] SSL certificates
- [ ] Environment configuration

## Future Enhancements (Post-MVP)

- User reading history and bookmarks
- Social features (comments, ratings)
- Community forums
- Admin dashboard
- Analytics and insights
- Mobile app (React Native)
- Offline reading capability
