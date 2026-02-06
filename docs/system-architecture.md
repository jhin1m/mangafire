# System Architecture

## Monorepo Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  MangaFire Monorepo                 │
├─────────────────────────────────────────────────────┤
│  Root: ESLint, Prettier, Husky, Commitlint, Docker │
├────────────────────┬────────────────────┬───────────┤
│                    │                    │           │
│   apps/web         │   apps/api         │ packages  │
│   (React + Vite)   │   (Hono + Drizzle) │ /shared   │
│                    │                    │ (Types)   │
└────────────────────┴────────────────────┴───────────┘
```

## Data Flow

```
Browser
  ↓
React App (Redux store + API client)
  ↓
Hono REST API (CORS, routes, validation)
  ↓
Drizzle ORM (Query builder, type-safe)
  ↓
PostgreSQL (3 tables, relations, indexes)
```

## Database Schema

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `manga` | Core manga metadata | id, title, slug (unique), status, type, language, rating, views, timestamps |
| `genres` | Available genres/categories | id, name (unique), slug (unique), description, timestamps |
| `manga_genres` | Many-to-many junction | id, mangaId (FK), genreId (FK), unique constraint |
| `users` | User accounts | id, email (unique), passwordHash, username, role, timestamps, deletedAt |
| `refresh_tokens` | JWT refresh tokens | id, userId (FK), tokenHash (SHA-256), expiresAt, createdAt |
| `volumes` | Volume groupings | id, mangaId (FK), number (unique per manga), title, coverImage, timestamps |
| `chapters` | Chapter metadata | id, mangaId (FK), volumeId (FK nullable), number (text, supports "10.5"), slug, language, pageCount, timestamps |
| `chapter_pages` | Individual chapter images | id, chapterId (FK), pageNumber (unique per chapter), imageUrl, width, height |

**Enums**
- `manga_status` - ongoing, completed, hiatus, cancelled
- `manga_type` - manga, manhwa, manhua, one_shot, doujinshi
- `language` - en, jp, ko, zh

**Indexes**
- `manga.slug` - fast lookups by slug
- `manga.status` - filtering by status
- `manga.type` - filtering by type
- `manga_genres.manga_id` - join lookups
- `manga_genres.genre_id` - genre lookups
- `users.email` - login lookups
- `refresh_tokens.user_id` - token validation
- `volumes.manga_id` - volume queries
- `chapters.manga_id` - chapter queries
- `chapters.slug` - reader URL lookups
- `chapter_pages.chapter_id` - page loading

**Unique Constraints**
- `volumes`: (mangaId, number)
- `chapters`: (mangaId, number, language)
- `chapter_pages`: (chapterId, pageNumber)

**Relations**
- `manga → mangaGenres` (one-to-many, cascade delete)
- `manga → volumes` (one-to-many, cascade delete)
- `manga → chapters` (one-to-many, cascade delete)
- `genres → mangaGenres` (one-to-many, cascade delete)
- `users → refreshTokens` (one-to-many, cascade delete)
- `volumes → chapters` (one-to-many, set null on delete)
- `chapters → chapterPages` (one-to-many, cascade delete)

## API Endpoints

### Core
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check | None |
| GET | `/api/genres` | List all genres | None |

### Manga
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/manga` | List manga (paginated, filtered) | None |
| GET | `/api/manga/:slug` | Get manga by slug with genres | None |
| POST | `/api/manga` | Create manga with genres | Required |
| PATCH | `/api/manga/:slug` | Update manga and genre associations | Required |
| DELETE | `/api/manga/:slug` | Delete manga (cascades genres) | Required |

### Authentication
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Create user account | None |
| POST | `/api/auth/login` | Login (returns access + refresh tokens) | None |
| POST | `/api/auth/refresh` | Refresh access token | None |
| GET | `/api/auth/me` | Get current user | Required |
| POST | `/api/auth/logout` | Logout (invalidate refresh token) | Required |

### Chapters
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/manga/:slug/chapters` | List chapters (paginated, ?language=, ?sortOrder=) | None |
| POST | `/api/manga/:slug/chapters` | Create chapter with pages | Required |
| GET | `/api/manga/:slug/chapters/:number` | Get chapter with pages + navigation (?language=) | None |
| PATCH | `/api/manga/:slug/chapters/:number` | Update chapter metadata | Required |
| DELETE | `/api/manga/:slug/chapters/:number` | Delete chapter | Required |
| PUT | `/api/manga/:slug/chapters/:number/pages` | Replace all pages | Required |

### Volumes
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/manga/:slug/volumes` | List volumes (paginated) | None |
| POST | `/api/manga/:slug/volumes` | Create volume | Required |
| PATCH | `/api/manga/:slug/volumes/:number` | Update volume | Required |
| DELETE | `/api/manga/:slug/volumes/:number` | Delete volume (chapters.volumeId → null) | Required |

**Query Parameters**

GET /api/manga:
- `page` (default: 1), `limit` (default: 20, max: 100)
- `status`, `type`, `genreId`, `search`
- `sortBy` (default: createdAt), `sortOrder` (default: desc)

GET /api/manga/:slug/chapters:
- `page`, `limit` (default: 20, max: 100)
- `language` (filter by Language enum)
- `sortOrder` (asc/desc for chapter number, default: asc)

GET /api/manga/:slug/chapters/:number:
- `language` (optional filter when multiple translations exist)

## Error Handling Flow

```
Route Handler
  ↓
Zod Validation (zValidator middleware)
  ├─ Success → Handler executes
  └─ Failure → errorResponse({ message, code: 'VALIDATION_ERROR' })
      ↓
    Error Handler Middleware (onError)
    ├─ HTTPException → { success: false, error: { message, code } }
    ├─ ZodError → { success: false, error: { message, details: [] } }
    └─ Unexpected → { success: false, error: { message: 'Internal Server Error' } }
      ↓
    Response (JSON ApiResponse)
```

## Response Format

**Success Response**
```json
{
  "success": true,
  "data": { /* payload */ },
  "meta": { "total": 100, "page": 1, "limit": 20, "pages": 5 }
}
```

**Error Response**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [ /* Zod errors */ ]
  }
}
```

## Shared Package Design

- **No build step**: Source exports via `package.json` `exports` field
- **moduleResolution**: "bundler" required in consuming apps for exports resolution
- **Type re-exports**: Use `export type` for types, `export {}` for enums
- **Isolated modules**: `isolatedModules: true` enforced in tsconfig

## Frontend Architecture

**Layout System**
- MainLayout: Header + Footer + NavMobile + Router outlet (default)
- ReadLayout: Minimal header + Reader + Navigation (for /read/* paths)

**Redux State**
- `auth` slice: user session, login status → persisted to localStorage
- `theme` slice: page type, read direction, fit type, progress position → persisted

**Code Splitting**: Routes use React `lazy()` for bundle optimization

## CORS Configuration

- Origin: `http://localhost:5173` (dev), configurable via `CORS_ORIGIN` env var
- Methods: GET, POST, PUT, PATCH, DELETE
- Scope: `/api/*`
