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

## Phase 3 - Authentication (NEXT)

### Backend
- [ ] JWT token generation and validation
- [ ] Password hashing (bcrypt)
- [ ] User table schema (email, password hash, profile)
- [ ] Protected route middleware

### Frontend
- [ ] Login form component
- [ ] Register form component
- [ ] Token storage (Redux + localStorage)
- [ ] API interceptor for auth headers
- [ ] Logout functionality

### API Endpoints
- [ ] POST /api/auth/register - Create user account
- [ ] POST /api/auth/login - Generate JWT token
- [ ] POST /api/auth/logout - Invalidate session
- [ ] GET /api/auth/profile - Get current user
- [ ] PATCH /api/auth/profile - Update user profile

### Access Control
- [ ] Protect write endpoints (POST, PATCH, DELETE)
- [ ] Enforce JWT validation
- [ ] Rate limiting on auth endpoints

## Phase 4 - Chapters & Volumes

### Schema
- [ ] chapters table (mangaId, number, title, slug, pages)
- [ ] volumes table (mangaId, number, title)
- [ ] chapter_pages table (chapterId, number, imageUrl)

### API Endpoints
- [ ] GET /api/manga/:slug/chapters - List chapters
- [ ] POST /api/manga/:slug/chapters - Create chapter
- [ ] GET /api/manga/:slug/chapters/:number - Get chapter details
- [ ] PATCH /api/manga/:slug/chapters/:number - Update chapter
- [ ] DELETE /api/manga/:slug/chapters/:number - Delete chapter

### Frontend
- [ ] Chapter list view
- [ ] Page navigation component
- [ ] Image loading and caching

## Phase 5 - Frontend API Integration

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
