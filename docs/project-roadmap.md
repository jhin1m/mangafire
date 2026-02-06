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

## Phase 4 - Chapters & Volumes (COMPLETED)

### Schema
- [x] chapters table (mangaId, number, title, slug, pages)
- [x] volumes table (mangaId, number, title)
- [x] chapter_pages table (chapterId, number, imageUrl)

### API Endpoints
- [x] GET /api/manga/:slug/chapters - List chapters
- [x] POST /api/manga/:slug/chapters - Create chapter
- [x] GET /api/manga/:slug/chapters/:number - Get chapter details
- [x] PATCH /api/manga/:slug/chapters/:number - Update chapter
- [x] DELETE /api/manga/:slug/chapters/:number - Delete chapter
- [x] GET /api/manga/:slug/volumes - List volumes
- [x] POST /api/manga/:slug/volumes - Create volume
- [x] PATCH /api/manga/:slug/volumes/:number - Update volume
- [x] DELETE /api/manga/:slug/volumes/:number - Delete volume

### Frontend
- [ ] Chapter list view
- [ ] Page navigation component
- [ ] Image loading and caching

### Status
- **Completed**: 6 Feb 2026
- **Commits**: TBD (implementation completed)

## Phase 5 - Frontend API Integration (NEXT)

### Data Fetching
- [ ] Replace mock manga data with API calls
- [ ] Implement loading and error states
- [ ] Add request/response interceptors
- [ ] Implement caching strategy

### Views Integration
- [ ] Home page: fetch from GET /api/manga
- [ ] Filter page: implement query params
- [ ] Manga detail: fetch from GET /api/manga/:slug
- [ ] Admin panel: create/update forms

### Search and Filtering
- [ ] Full search experience with title matching
- [ ] Genre multi-select filtering
- [ ] Status and type dropdowns
- [ ] Sort options (rating, views, newest)

## Phase 6 - File Uploads

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

## Phase 7 - Advanced Search

### Database
- [ ] PostgreSQL tsvector setup
- [ ] Full-text search indexes
- [ ] Search weight optimization

### API
- [ ] GET /api/search - Full-text search endpoint
- [ ] Fuzzy matching for titles
- [ ] Search facets (genre, status, type)

### Frontend
- [ ] Search input with autocomplete
- [ ] Faceted search results
- [ ] Search history (localStorage)

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
