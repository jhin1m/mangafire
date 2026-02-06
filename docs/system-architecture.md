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

**Relations**
- `manga → mangaGenres` (one-to-many, cascade delete)
- `genres → mangaGenres` (one-to-many, cascade delete)

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check | None |
| GET | `/api/manga` | List manga (paginated, filtered) | None |
| GET | `/api/manga/:slug` | Get manga by slug with genres | None |
| POST | `/api/manga` | Create manga with genres | None |
| PATCH | `/api/manga/:slug` | Update manga and genre associations | None |
| DELETE | `/api/manga/:slug` | Delete manga (cascades genres) | None |
| GET | `/api/genres` | List all genres | None |

**Query Parameters** (GET /api/manga)
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `status` (optional: ongoing, completed, hiatus, cancelled)
- `type` (optional: manga, manhwa, manhua, one_shot, doujinshi)
- `genreId` (optional: numeric genre ID)
- `search` (optional: ILIKE search on title)
- `sortBy` (default: createdAt, options: rating, views, createdAt, title)
- `sortOrder` (default: desc, options: asc, desc)

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
