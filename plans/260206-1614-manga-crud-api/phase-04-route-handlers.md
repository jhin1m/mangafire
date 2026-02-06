# Phase 04: Manga Route Handlers

**Status**: Pending | **Effort**: 2h | **Dependencies**: Phase 01, 02, 03 | **Parallel**: No

## Objective

Implement RESTful API endpoints for manga CRUD operations:
- 5 manga routes: list (paginated+filtered), getBySlug, create, update, delete
- 1 genre route: list all genres
- Mount routes in main app
- Install Zod validator middleware

## File Ownership

**Exclusive writes** (no conflicts):
- `apps/api/src/routes/manga.ts` — NEW FILE
- `apps/api/src/routes/genres.ts` — NEW FILE
- `apps/api/src/index.ts` — APPEND (mount routes + error handler)
- `apps/api/package.json` — APPEND (add @hono/zod-validator)

**Reads** (dependencies from Phase 01/02/03):
- `apps/api/src/db/schema.ts` (Phase 01) — Import manga, genres, mangaGenres tables
- `@mangafire/shared` types/validators (Phase 02) — Import DTOs and schemas
- `apps/api/src/lib/*` (Phase 03) — Import response/pagination helpers
- `apps/api/src/middleware/error-handler.ts` (Phase 03) — Import error handler

## Implementation Steps

### 1. Install Zod Validator Middleware

```bash
cd apps/api
pnpm add @hono/zod-validator
```

**Verify** `package.json` updated:
```json
{
  "dependencies": {
    "@hono/zod-validator": "^0.2.0"
  }
}
```

### 2. Create Manga Routes (routes/manga.ts)

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, ilike, sql, count, desc, asc } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, mangaGenres } from '../db/schema'
import {
  createMangaDtoSchema,
  updateMangaDtoSchema,
  mangaQueryParamsSchema,
  type Manga,
  type CreateMangaDto,
  type UpdateMangaDto,
} from '@mangafire/shared'
import { successResponse, createdResponse, noContentResponse } from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'
import { z } from 'zod'

export const mangaRoutes = new Hono()

// GET /api/manga - List manga (paginated + filtered)
mangaRoutes.get('/', zValidator('query', mangaQueryParamsSchema), async (c) => {
  const params = c.req.valid('query')
  const { offset, limit } = getOffsetLimit(params)

  // Build where conditions
  const conditions = []
  if (params.status) {
    conditions.push(eq(manga.status, params.status))
  }
  if (params.type) {
    conditions.push(eq(manga.type, params.type))
  }
  if (params.search) {
    conditions.push(ilike(manga.title, `%${params.search}%`))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Handle genreId filter (requires join)
  let query = db.select().from(manga)
  if (params.genreId) {
    query = query
      .innerJoin(mangaGenres, eq(manga.id, mangaGenres.mangaId))
      .where(and(whereClause, eq(mangaGenres.genreId, params.genreId)))
  } else if (whereClause) {
    query = query.where(whereClause)
  }

  // Apply sorting
  const sortColumn = manga[params.sortBy as keyof typeof manga] || manga.createdAt
  const sortFn = params.sortOrder === 'asc' ? asc : desc
  query = query.orderBy(sortFn(sortColumn))

  // Execute with pagination
  const items = await query.limit(limit).offset(offset)

  // Count total (with same filters)
  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(manga)
  if (params.genreId) {
    countQuery
      .innerJoin(mangaGenres, eq(manga.id, mangaGenres.mangaId))
      .where(and(whereClause, eq(mangaGenres.genreId, params.genreId)))
  } else if (whereClause) {
    countQuery.where(whereClause)
  }
  const [{ count: total }] = await countQuery

  const meta = calculatePagination(total, params)
  return successResponse(c, items, meta)
})

// GET /api/manga/:slug - Get single manga by slug
mangaRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug')

  const [result] = await db
    .select()
    .from(manga)
    .where(eq(manga.slug, slug))
    .limit(1)

  if (!result) {
    return c.json({ success: false, error: { message: 'Manga not found' } }, 404)
  }

  return successResponse(c, result)
})

// POST /api/manga - Create new manga
mangaRoutes.post('/', zValidator('json', createMangaDtoSchema), async (c) => {
  const data = c.req.valid('json')
  const { genreIds, ...mangaData } = data

  // Insert manga
  const [newManga] = await db
    .insert(manga)
    .values(mangaData)
    .returning()

  // Insert manga-genre associations if genreIds provided
  if (genreIds && genreIds.length > 0) {
    await db.insert(mangaGenres).values(
      genreIds.map((genreId) => ({
        mangaId: newManga.id,
        genreId,
      }))
    )
  }

  return createdResponse(c, newManga)
})

// PATCH /api/manga/:slug - Update manga
mangaRoutes.patch('/:slug', zValidator('json', updateMangaDtoSchema), async (c) => {
  const slug = c.req.param('slug')
  const data = c.req.valid('json')
  const { genreIds, ...mangaData } = data

  // Check if manga exists
  const [existing] = await db
    .select()
    .from(manga)
    .where(eq(manga.slug, slug))
    .limit(1)

  if (!existing) {
    return c.json({ success: false, error: { message: 'Manga not found' } }, 404)
  }

  // Update manga
  const [updated] = await db
    .update(manga)
    .set({ ...mangaData, updatedAt: new Date() })
    .where(eq(manga.slug, slug))
    .returning()

  // Update genre associations if genreIds provided
  if (genreIds !== undefined) {
    // Delete existing associations
    await db.delete(mangaGenres).where(eq(mangaGenres.mangaId, existing.id))

    // Insert new associations
    if (genreIds.length > 0) {
      await db.insert(mangaGenres).values(
        genreIds.map((genreId) => ({
          mangaId: existing.id,
          genreId,
        }))
      )
    }
  }

  return successResponse(c, updated)
})

// DELETE /api/manga/:slug - Delete manga
mangaRoutes.delete('/:slug', async (c) => {
  const slug = c.req.param('slug')

  const [deleted] = await db
    .delete(manga)
    .where(eq(manga.slug, slug))
    .returning()

  if (!deleted) {
    return c.json({ success: false, error: { message: 'Manga not found' } }, 404)
  }

  return noContentResponse(c)
})
```

**Key implementation details**:
- `zValidator('query', schema)` for GET params, `zValidator('json', schema)` for POST/PATCH body
- Drizzle query builder: `.select().from().where().limit().offset()`
- Genre filtering requires INNER JOIN on `mangaGenres` table
- Sorting uses dynamic column selection with fallback to `createdAt`
- Count query matches filter/join logic for accurate pagination
- Update endpoint handles genre associations separately (delete old, insert new)
- Delete returns 204 No Content on success

### 3. Create Genre Routes (routes/genres.ts)

```typescript
import { Hono } from 'hono'
import { db } from '../db/client'
import { genres } from '../db/schema'
import { successResponse } from '../lib/api-response'

export const genreRoutes = new Hono()

// GET /api/genres - List all genres
genreRoutes.get('/', async (c) => {
  const allGenres = await db.select().from(genres).orderBy(genres.name)
  return successResponse(c, allGenres)
})
```

**Key implementation details**:
- Simple list endpoint, no pagination (genres are reference data)
- Ordered alphabetically by name

### 4. Mount Routes in Main App (index.ts)

**Replace entire file**:

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRoutes } from './routes/health'
import { mangaRoutes } from './routes/manga'
import { genreRoutes } from './routes/genres'
import { errorHandler } from './middleware/error-handler'

const app = new Hono()

// CORS for frontend dev server
app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
)

// Error handler (must be registered before routes)
app.onError(errorHandler)

// Routes
app.route('/api/health', healthRoutes)
app.route('/api/manga', mangaRoutes)
app.route('/api/genres', genreRoutes)

// Start server
const port = Number(process.env.PORT) || 3000
console.log(`API server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

export type AppType = typeof app
```

**Key changes**:
- Import new routes and error handler
- Register `app.onError(errorHandler)` BEFORE routes
- Mount manga + genre routes
- Add `PATCH` to allowed CORS methods

### 5. Verify TypeScript Compilation

```bash
cd apps/api
pnpm type-check  # Should pass
```

### 6. Test Routes Manually

**Start dev server**:
```bash
pnpm dev
```

**Test endpoints** (use curl or Postman):

```bash
# List manga (empty initially)
curl http://localhost:3000/api/manga

# List genres (empty initially, need seed data)
curl http://localhost:3000/api/genres

# Create manga
curl -X POST http://localhost:3000/api/manga \
  -H "Content-Type: application/json" \
  -d '{
    "title": "One Piece",
    "slug": "one-piece",
    "description": "Epic pirate adventure",
    "author": "Eiichiro Oda",
    "status": "ongoing",
    "type": "manga"
  }'

# Get by slug
curl http://localhost:3000/api/manga/one-piece

# Update manga
curl -X PATCH http://localhost:3000/api/manga/one-piece \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}'

# Delete manga
curl -X DELETE http://localhost:3000/api/manga/one-piece
```

## Success Criteria

- [ ] `@hono/zod-validator` added to package.json dependencies
- [ ] `routes/manga.ts` created with 5 handlers (GET list, GET :slug, POST, PATCH, DELETE)
- [ ] `routes/genres.ts` created with 1 handler (GET list)
- [ ] `index.ts` updated to mount routes and error handler
- [ ] `pnpm type-check` passes
- [ ] Dev server starts without errors
- [ ] Manual tests pass for all 6 endpoints
- [ ] Validation errors return 400 with Zod error details
- [ ] DB errors (unique constraint) return 409 via error handler
- [ ] 404 responses for non-existent manga slugs

## Conflict Prevention

**Sequential execution required**:
- Phase 01 must complete (DB schema exists)
- Phase 02 must complete (types/validators available)
- Phase 03 must complete (utilities available)

**No parallel conflicts**: This is the final phase, no other phases run concurrently.

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Genre filter query inefficient | Use INNER JOIN with proper indexes (Phase 01) |
| Slug uniqueness not enforced | Rely on DB unique constraint + error handler |
| Genre associations fail silently | Wrap in transaction (future enhancement) |
| Sort column injection vulnerability | Whitelist via Zod enum in validator |
| Missing genreIds validation | FK constraint catches invalid IDs, returns 400 |

## Code Reference

**Import structure**:
```typescript
// routes/manga.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, mangaGenres } from '../db/schema'
import { createMangaDtoSchema, /* ... */ } from '@mangafire/shared'
import { successResponse, /* ... */ } from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'
```

**File structure after Phase 04**:
```
apps/api/src/
├── index.ts (updated)
├── db/
│   ├── client.ts
│   └── schema.ts (from Phase 01)
├── middleware/
│   └── error-handler.ts (from Phase 03)
├── lib/
│   ├── api-response.ts (from Phase 03)
│   └── pagination.ts (from Phase 03)
└── routes/
    ├── health.ts (existing)
    ├── manga.ts (new)
    └── genres.ts (new)
```

## Future Enhancements (Deferred)

- **Transactions**: Wrap manga + genre associations in DB transaction
- **Batch operations**: Bulk create/update endpoints
- **Soft deletes**: Add `deletedAt` column, filter in queries
- **Full-text search**: Use PostgreSQL `tsvector` for better search
- **Rate limiting**: Add per-IP/user rate limits
- **Authentication**: Protect POST/PATCH/DELETE with JWT middleware
- **Chapters CRUD**: Nested routes `/api/manga/:slug/chapters` (separate plan)

## Testing Checklist

**Validation tests**:
- [ ] POST with missing title → 400 with Zod error
- [ ] POST with invalid slug (uppercase) → 400
- [ ] PATCH with invalid URL (coverImage) → 400
- [ ] GET list with invalid page (0) → 400

**Business logic tests**:
- [ ] POST duplicate slug → 409 Conflict
- [ ] GET non-existent slug → 404
- [ ] PATCH non-existent slug → 404
- [ ] DELETE non-existent slug → 404
- [ ] POST with invalid genreId → 400 (FK violation)

**Pagination tests**:
- [ ] GET list page 1, limit 10 → correct offset/limit
- [ ] GET list page 2, limit 10 → offset 10
- [ ] Meta object has correct total/pages count

**Filter tests**:
- [ ] GET list with status=ongoing → only ongoing manga
- [ ] GET list with genreId=1 → only manga with that genre
- [ ] GET list with search=piece → matches "One Piece"

**Sort tests**:
- [ ] GET list sortBy=title, sortOrder=asc → alphabetical
- [ ] GET list sortBy=rating, sortOrder=desc → highest first

## Next Steps

After Phase 04 completion:
1. **Seed data**: Create script to populate genres table
2. **API documentation**: Generate OpenAPI/Swagger docs
3. **Frontend integration**: Update `apps/web` to call new API
4. **Deploy**: Add to Docker Compose, update deployment guide
