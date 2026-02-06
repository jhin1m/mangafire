# Phase 04: Volume API Routes

## Context

- **Parent plan**: [plan.md](./plan.md)
- **Dependencies**: Phase 02 (Database Schema)
- **Docs**: [system-architecture.md](../../docs/system-architecture.md)

## Parallelization

- **Runs parallel with**: Phase 03 (Chapter API) — both start after Phase 02
- **Blocked by**: Phase 02 only
- **index.ts conflict**: Phase 03 adds chapter mounts, this phase adds volume mounts. Append-only, no overlap.

## Overview

- **Date**: 2026-02-06
- **Description**: CRUD endpoints for volumes nested under `/api/manga/:slug/volumes`
- **Priority**: P2
- **Status**: done (2026-02-06)
- **Effort**: 1h

## Key Insights

- Volumes are simpler than chapters — no pages, no navigation
- Follow same pattern as chapters: resolve manga slug first, then operate
- Reuse `findMangaBySlug` from `chapter-helpers.ts` if available, or inline the same logic
- Validators from Phase 01 (`createVolumeDtoSchema`, `updateVolumeDtoSchema`) used here
- Volume list does not need complex pagination — typically < 50 volumes per manga

## Requirements

1. `GET /api/manga/:slug/volumes` — list all volumes for a manga (paginated)
2. `POST /api/manga/:slug/volumes` — create volume (auth required)
3. `PATCH /api/manga/:slug/volumes/:number` — update volume (auth required)
4. `DELETE /api/manga/:slug/volumes/:number` — delete volume (auth required, sets chapters.volumeId to null)

## Architecture

```
Client → GET /api/manga/one-piece/volumes
       → Resolve slug → mangaId
       → Query volumes WHERE mangaId ORDER BY number ASC
       → Return volume list with pagination
```

## Related Code Files

Reference (read-only, patterns to follow):
- `apps/api/src/routes/manga.ts` — CRUD route pattern
- `apps/api/src/routes/chapter-helpers.ts` — `findMangaBySlug` (if Phase 03 completed)
- `apps/api/src/lib/api-response.ts` — response helpers
- `apps/api/src/lib/pagination.ts` — pagination utils

## File Ownership

| File | Action |
|------|--------|
| `apps/api/src/routes/volumes.ts` | CREATE |
| `apps/api/src/index.ts` | MODIFY (append volume route mount after chapter mount) |

## Implementation Steps

### Step 1: Create volumes.ts

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, asc, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { manga, volumes } from '../db/schema'
import {
  createVolumeDtoSchema,
  updateVolumeDtoSchema,
} from '@mangafire/shared'
import {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
} from '../lib/api-response'
import { calculatePagination, getOffsetLimit } from '../lib/pagination'
import { paginationParamsSchema } from '@mangafire/shared/validators'

export const volumeRoutes = new Hono<{ Variables: { mangaId: number } }>()

// Middleware: resolve manga slug to mangaId
volumeRoutes.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  const pathParts = url.pathname.split('/')
  const slugIndex = pathParts.indexOf('manga') + 1
  const slug = pathParts[slugIndex]

  if (!slug) {
    return errorResponse(c, 'Manga slug required', 'BAD_REQUEST', 400)
  }

  const result = await db
    .select({ id: manga.id })
    .from(manga)
    .where(eq(manga.slug, slug))

  if (result.length === 0) {
    return errorResponse(c, 'Manga not found', 'NOT_FOUND', 404)
  }

  c.set('mangaId', result[0].id)
  await next()
})

// GET / — list volumes
volumeRoutes.get(
  '/',
  zValidator('query', paginationParamsSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const params = c.req.valid('query')
    const { offset, limit } = getOffsetLimit(params)

    const items = await db
      .select()
      .from(volumes)
      .where(eq(volumes.mangaId, mangaId))
      .orderBy(asc(volumes.number))
      .limit(limit)
      .offset(offset)

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(volumes)
      .where(eq(volumes.mangaId, mangaId))

    const total = Number(countResult[0]?.count || 0)
    const meta = calculatePagination(total, params)

    return successResponse(c, items, meta)
  }
)

// POST / — create volume
volumeRoutes.post(
  '/',
  zValidator('json', createVolumeDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const body = c.req.valid('json')

    const insertResult = await db
      .insert(volumes)
      .values({ ...body, mangaId })
      .returning()

    return createdResponse(c, insertResult[0])
  }
)

// PATCH /:number — update volume
volumeRoutes.patch(
  '/:number',
  zValidator('json', updateVolumeDtoSchema),
  async (c) => {
    const mangaId = c.get('mangaId')
    const number = Number(c.req.param('number'))

    if (isNaN(number)) {
      return errorResponse(c, 'Invalid volume number', 'BAD_REQUEST', 400)
    }

    const body = c.req.valid('json')

    const updateResult = await db
      .update(volumes)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(volumes.mangaId, mangaId), eq(volumes.number, number)))
      .returning()

    if (updateResult.length === 0) {
      return errorResponse(c, 'Volume not found', 'NOT_FOUND', 404)
    }

    return successResponse(c, updateResult[0])
  }
)

// DELETE /:number — delete volume (chapters.volumeId set to null via FK)
volumeRoutes.delete('/:number', async (c) => {
  const mangaId = c.get('mangaId')
  const number = Number(c.req.param('number'))

  if (isNaN(number)) {
    return errorResponse(c, 'Invalid volume number', 'BAD_REQUEST', 400)
  }

  const deleteResult = await db
    .delete(volumes)
    .where(and(eq(volumes.mangaId, mangaId), eq(volumes.number, number)))
    .returning()

  if (deleteResult.length === 0) {
    return errorResponse(c, 'Volume not found', 'NOT_FOUND', 404)
  }

  return noContentResponse(c)
})
```

### Step 2: Mount in index.ts

Add to `apps/api/src/index.ts` (after chapter route block added by Phase 03):

```typescript
import { volumeRoutes } from './routes/volumes'

// Volume routes: nested under manga, write ops require auth
app.use('/api/manga/*/volumes/*', async (c, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(c.req.method)) {
    return authMiddleware(c, next)
  }
  await next()
})
app.use('/api/manga/*/volumes', async (c, next) => {
  if (['POST'].includes(c.req.method)) {
    return authMiddleware(c, next)
  }
  await next()
})
app.route('/api/manga/:slug/volumes', volumeRoutes)
```

## Todo

- [x] Create `apps/api/src/routes/volumes.ts`
- [x] Add volume route import and mounting to `apps/api/src/index.ts`
- [x] Add auth middleware for volume write operations
- [x] Run `pnpm type-check` in api package
- [x] Test all 4 CRUD endpoints manually

## Success Criteria

- `GET /api/manga/:slug/volumes` returns paginated list ordered by number
- `POST /api/manga/:slug/volumes` creates volume (auth required)
- `PATCH /api/manga/:slug/volumes/:number` updates volume (auth required)
- `DELETE /api/manga/:slug/volumes/:number` deletes volume, chapters.volumeId set to null (auth required)
- 404 for nonexistent manga or volume
- 409 on duplicate volume number (unique constraint)

## Conflict Prevention

- **volumes.ts** is a NEW file — no conflicts
- **index.ts**: append volume mount AFTER chapter mount block. If Phase 03 hasn't completed yet, append after the manga route block instead. Both additions are independent blocks of code.

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| index.ts merge conflict with Phase 03 | Low | Both append-only; resolve by keeping both blocks |
| Volume number integer parse from URL | Low | Explicit `Number()` + `isNaN` check |

## Security Considerations

- Auth middleware on write operations (same pattern as manga/chapters)
- zValidator for input sanitization
- Volume deletion uses `set null` FK — chapters are preserved, only volumeId cleared

## Next Steps

- Frontend: add volume selector UI in manga detail page
- Link chapters to volumes via chapter update endpoint (set volumeId)
